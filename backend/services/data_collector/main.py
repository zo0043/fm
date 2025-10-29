"""
数据收集服务主程序
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
from .routers import fund_router, nav_router, schedule_router
from .services.fund_collector import FundCollector
from .services.nav_collector import NavCollector
from .services.scheduler import DataCollectionScheduler

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("数据收集服务启动中...")

    # 初始化数据库
    try:
        await db_manager.create_tables_async()
        logger.info("数据库表创建完成")
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")
        raise

    # 启动数据收集调度器
    scheduler = DataCollectionScheduler()
    try:
        await scheduler.start()
        app.state.scheduler = scheduler
        logger.info("数据收集调度器启动成功")
    except Exception as e:
        logger.error(f"调度器启动失败: {e}")
        raise

    # 创建服务实例
    app.state.fund_collector = FundCollector()
    app.state.nav_collector = NavCollector()

    yield

    # 关闭调度器
    if hasattr(app.state, 'scheduler'):
        await app.state.scheduler.stop()
        logger.info("数据收集调度器已停止")

    # 关闭数据库连接
    db_manager.close()
    logger.info("数据收集服务已关闭")


# 创建FastAPI应用
app = FastAPI(
    title="基金监控 - 数据收集服务",
    description="负责基金信息和净值数据的收集、清洗和存储",
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
app.include_router(fund_router, prefix="/api/v1/funds", tags=["基金管理"])
app.include_router(nav_router, prefix="/api/v1/nav", tags=["净值管理"])
app.include_router(schedule_router, prefix="/api/v1/schedule", tags=["调度管理"])


@app.get("/")
async def root():
    """根路径"""
    return {
        "service": "数据收集服务",
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/api/v1/funds",
            "/api/v1/nav",
            "/api/v1/schedule",
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
        "scheduler": False
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

    # 判断整体健康状态
    all_healthy = all([
        health_status["database"],
        health_status["redis"],
        health_status["scheduler"]
    ])

    if all_healthy:
        health_status["status"] = "healthy"
        return health_status
    else:
        health_status["status"] = "unhealthy"
        raise HTTPException(status_code=503, detail=health_status)


@app.post("/api/v1/collect/funds")
async def collect_funds(
    background_tasks: BackgroundTasks,
    force_update: bool = False,
    fund_codes: Optional[List[str]] = None
):
    """
    手动触发基金数据收集

    Args:
        force_update: 是否强制更新
        fund_codes: 指定基金代码列表，为空则收集所有基金
    """
    try:
        background_tasks.add_task(
            collect_funds_background,
            force_update=force_update,
            fund_codes=fund_codes
        )

        return {
            "message": "基金数据收集任务已启动",
            "force_update": force_update,
            "fund_codes": fund_codes
        }
    except Exception as e:
        logger.error(f"启动基金数据收集任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/collect/nav")
async def collect_nav(
    background_tasks: BackgroundTasks,
    date: Optional[str] = None,
    fund_codes: Optional[List[str]] = None
):
    """
    手动触发净值数据收集

    Args:
        date: 指定日期 (YYYY-MM-DD)，为空则使用最新交易日
        fund_codes: 指定基金代码列表，为空则收集所有基金
    """
    try:
        background_tasks.add_task(
            collect_nav_background,
            date=date,
            fund_codes=fund_codes
        )

        return {
            "message": "净值数据收集任务已启动",
            "date": date,
            "fund_codes": fund_codes
        }
    except Exception as e:
        logger.error(f"启动净值数据收集任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/stats")
async def get_collection_stats():
    """获取数据收集统计信息"""
    try:
        from shared.database import get_database_stats
        stats = await get_database_stats()

        return {
            "database_stats": stats,
            "scheduler_status": {
                "running": app.state.scheduler.is_running if hasattr(app.state, 'scheduler') else False,
                "jobs": len(app.state.scheduler.get_jobs()) if hasattr(app.state, 'scheduler') else 0
            }
        }
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@log_performance
async def collect_funds_background(force_update: bool = False, fund_codes: Optional[List[str]] = None):
    """后台基金数据收集任务"""
    try:
        collector = FundCollector()
        result = await collector.collect_funds(force_update=force_update, fund_codes=fund_codes)
        logger.info(f"基金数据收集完成: {result}")
    except Exception as e:
        logger.error(f"基金数据收集失败: {e}")


@log_performance
async def collect_nav_background(date: Optional[str] = None, fund_codes: Optional[List[str]] = None):
    """后台净值数据收集任务"""
    try:
        collector = NavCollector()
        result = await collector.collect_nav_data(date=date, fund_codes=fund_codes)
        logger.info(f"净值数据收集完成: {result}")
    except Exception as e:
        logger.error(f"净值数据收集失败: {e}")


def main():
    """主函数"""
    import uvicorn

    logger.info(f"启动数据收集服务 - 端口: {settings.service_ports.data_collector}")

    uvicorn.run(
        "main:app",
        host=settings.api.host,
        port=settings.service_ports.data_collector,
        reload=settings.api.reload,
        workers=1 if settings.api.reload else settings.api.workers,
        log_level=settings.logging.level.lower(),
    )


if __name__ == "__main__":
    main()