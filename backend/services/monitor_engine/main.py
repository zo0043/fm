"""
监控引擎服务主程序
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

from shared.config import settings
from shared.database import db_manager, get_async_db
from shared.utils import get_logger, log_performance
from .routers import monitor_router, rule_router
from .services.monitor_engine import MonitorEngine
from .services.rule_engine import RuleEngine
from .services.scheduler import MonitorScheduler

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("监控引擎服务启动中...")

    # 初始化数据库
    try:
        await db_manager.create_tables_async()
        logger.info("数据库表创建完成")
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")
        raise

    # 启动监控调度器
    scheduler = MonitorScheduler()
    try:
        await scheduler.start()
        app.state.scheduler = scheduler
        logger.info("监控调度器启动成功")
    except Exception as e:
        logger.error(f"监控调度器启动失败: {e}")
        raise

    # 创建服务实例
    app.state.monitor_engine = MonitorEngine()
    app.state.rule_engine = RuleEngine()

    yield

    # 关闭调度器
    if hasattr(app.state, 'scheduler'):
        await app.state.scheduler.stop()
        logger.info("监控调度器已停止")

    # 关闭数据库连接
    db_manager.close()
    logger.info("监控引擎服务已关闭")


# 创建FastAPI应用
app = FastAPI(
    title="基金监控 - 监控引擎服务",
    description="负责基金涨跌幅监控和规则引擎处理",
    version="1.0.0",
    lifespan=lifespan
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境需要限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(rule_router, prefix="/api/v1/rules", tags=["监控规则"])
app.include_router(monitor_router, prefix="/api/v1/monitor", tags=["监控任务"])


@app.get("/")
async def root():
    """根路径"""
    return {
        "service": "监控引擎服务",
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/api/v1/rules",
            "/api/v1/monitor",
            "/health"
        ]
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    health_status = {
        "status": "healthy",
        "timestamp": None,
        "database": False,
        "redis": False,
        "scheduler": False,
        "monitor_engine": False
    }

    from datetime import datetime
    health_status["timestamp"] = datetime.now().isoformat()

    # 检查数据库连接
    try:
        from shared.database import check_database_health
        health_status["database"] = await check_database_health()
    except Exception as e:
        logger.error(f"数据库健康检查失败: {e}")

    # 检查Redis连接
    try:
        import redis.asyncio as redis
        redis_client = redis.from_url(settings.redis.url)
        await redis_client.ping()
        await redis_client.close()
        health_status["redis"] = True
    except Exception as e:
        logger.error(f"Redis健康检查失败: {e}")

    # 检查调度器状态
    if hasattr(app.state, 'scheduler'):
        health_status["scheduler"] = app.state.scheduler.is_running

    # 检查监控引擎状态
    if hasattr(app.state, 'monitor_engine'):
        health_status["monitor_engine"] = app.state.monitor_engine.is_running

    # 判断整体健康状态
    all_healthy = all([
        health_status["database"],
        health_status["redis"],
        health_status["scheduler"],
        health_status["monitor_engine"]
    ])

    if all_healthy:
        health_status["status"] = "healthy"
        return health_status
    else:
        health_status["status"] = "unhealthy"
        raise HTTPException(status_code=503, detail=health_status)


@app.post("/api/v1/monitor/run")
async def run_monitor(
    background_tasks: BackgroundTasks,
    rule_ids: Optional[List[int]] = None,
    fund_codes: Optional[List[str]] = None
):
    """
    手动触发监控任务

    Args:
        rule_ids: 指定规则ID列表
        fund_codes: 指定基金代码列表
    """
    try:
        background_tasks.add_task(
            run_monitor_background,
            rule_ids=rule_ids,
            fund_codes=fund_codes
        )

        return {
            "message": "监控任务已启动",
            "rule_ids": rule_ids,
            "fund_codes": fund_codes
        }
    except Exception as e:
        logger.error(f"启动监控任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/stats")
async def get_monitor_stats():
    """获取监控统计信息"""
    try:
        from shared.database import get_database_stats
        stats = await get_database_stats()

        # 获取监控引擎状态
        monitor_stats = {}
        if hasattr(app.state, 'monitor_engine'):
            monitor_stats = await app.state.monitor_engine.get_stats()

        # 获取调度器状态
        scheduler_stats = {}
        if hasattr(app.state, 'scheduler'):
            scheduler_stats = {
                "running": app.state.scheduler.is_running,
                "jobs": len(app.state.scheduler.get_jobs())
            }

        return {
            "database_stats": stats,
            "monitor_stats": monitor_stats,
            "scheduler_stats": scheduler_stats
        }
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/alerts")
async def get_alerts(
    page: int = 1,
    size: int = 20,
    status: Optional[str] = None
):
    """获取监控告警列表"""
    try:
        if not hasattr(app.state, 'monitor_engine'):
            raise HTTPException(status_code=503, detail="监控引擎未启动")

        alerts = await app.state.monitor_engine.get_recent_alerts(
            page=page,
            size=size,
            status=status
        )

        return alerts

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取告警列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@log_performance
async def run_monitor_background(rule_ids: Optional[List[int]] = None, fund_codes: Optional[List[str]] = None):
    """后台监控任务"""
    try:
        if not hasattr(app.state, 'monitor_engine'):
            logger.error("监控引擎未启动")
            return

        monitor_engine = app.state.monitor_engine
        result = await monitor_engine.run_monitor(rule_ids=rule_ids, fund_codes=fund_codes)
        logger.info(f"监控任务完成: {result}")
    except Exception as e:
        logger.error(f"监控任务失败: {e}")


def main():
    """主函数"""
    import uvicorn

    logger.info(f"启动监控引擎服务 - 端口: {settings.service_ports.monitor_engine}")

    uvicorn.run(
        "main:app",
        host=settings.api.host,
        port=settings.service_ports.monitor_engine,
        reload=settings.api.reload,
        workers=1 if settings.api.reload else settings.api.workers,
        log_level=settings.logging.level.lower(),
    )


if __name__ == "__main__":
    main()