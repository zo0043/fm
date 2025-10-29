"""
回测服务主程序
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
from .routers import strategy_router, backtest_router, report_router
from .services.backtest_engine import BacktestEngine
from .services.strategy_manager import StrategyManager

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("回测服务启动中...")

    # 初始化数据库
    try:
        await db_manager.create_tables_async()
        logger.info("数据库表创建完成")
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")
        raise

    # 启动回测引擎
    backtest_engine = BacktestEngine()
    try:
        await backtest_engine.start()
        app.state.backtest_engine = backtest_engine
        logger.info("回测引擎启动成功")
    except Exception as e:
        logger.error(f"回测引擎启动失败: {e}")
        raise

    # 启动策略管理器
    strategy_manager = StrategyManager()
    try:
        await strategy_manager.start()
        app.state.strategy_manager = strategy_manager
        logger.info("策略管理器启动成功")
    except Exception as e:
        logger.error(f"策略管理器启动失败: {e}")
        raise

    yield

    # 关闭服务
    if hasattr(app.state, 'backtest_engine'):
        await app.state.backtest_engine.stop()
        logger.info("回测引擎已停止")

    if hasattr(app.state, 'strategy_manager'):
        await app.state.strategy_manager.stop()
        logger.info("策略管理器已停止")

    # 关闭数据库连接
    db_manager.close()
    logger.info("回测服务已关闭")


# 创建FastAPI应用
app = FastAPI(
    title="基金监控 - 回测服务",
    description="负责基金定投策略回测、风险评估和报告生成",
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
app.include_router(strategy_router, prefix="/api/v1/strategies", tags=["策略管理"])
app.include_router(backtest_router, prefix="/api/v1/backtest", tags=["回测任务"])
app.include_router(report_router, prefix="/api/v1/reports", tags=["回测报告"])


@app.get("/")
async def root():
    """根路径"""
    return {
        "service": "回测服务",
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/api/v1/strategies",
            "/api/v1/backtest",
            "/api/v1/reports",
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
        "influxdb": False,
        "backtest_engine": False,
        "strategy_manager": False
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

    # 检查InfluxDB连接
    try:
        from influxdb_client import InfluxDBClient
        client = InfluxDBClient(
            url=settings.influxdb.url,
            token=settings.influxdb.token,
            org=settings.influxdb.org
        )
        health = client.health()
        health_status["influxdb"] = health.status == "pass"
        client.close()
    except Exception as e:
        logger.error(f"InfluxDB健康检查失败: {e}")

    # 检查回测引擎状态
    if hasattr(app.state, 'backtest_engine'):
        health_status["backtest_engine"] = app.state.backtest_engine.is_running

    # 检查策略管理器状态
    if hasattr(app.state, 'strategy_manager'):
        health_status["strategy_manager"] = app.state.strategy_manager.is_running

    # 判断整体健康状态
    all_healthy = all([
        health_status["database"],
        health_status["redis"],
        health_status["influxdb"],
        health_status["backtest_engine"],
        health_status["strategy_manager"]
    ])

    if all_healthy:
        health_status["status"] = "healthy"
        return health_status
    else:
        health_status["status"] = "unhealthy"
        raise HTTPException(status_code=503, detail=health_status)


@app.post("/api/v1/backtest/run", summary="执行回测")
async def run_backtest(
    background_tasks: BackgroundTasks,
    strategy_id: int,
    start_date: str,
    end_date: str,
    initial_amount: float = 10000.0,
    investment_frequency: str = "monthly"
):
    """
    执行回测任务

    Args:
        strategy_id: 策略ID
        start_date: 开始日期 (YYYY-MM-DD)
        end_date: 结束日期 (YYYY-MM-DD)
        initial_amount: 初始金额
        investment_frequency: 投资频率 (daily/weekly/monthly)
    """
    try:
        background_tasks.add_task(
            run_backtest_background,
            strategy_id=strategy_id,
            start_date=start_date,
            end_date=end_date,
            initial_amount=initial_amount,
            investment_frequency=investment_frequency
        )

        return {
            "message": "回测任务已启动",
            "strategy_id": strategy_id,
            "start_date": start_date,
            "end_date": end_date,
            "initial_amount": initial_amount,
            "investment_frequency": investment_frequency
        }

    except Exception as e:
        logger.error(f"启动回测任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/stats")
async def get_backtest_stats():
    """获取回测统计信息"""
    try:
        from shared.database import get_database_stats
        stats = await get_database_stats()

        # 获取回测引擎状态
        backtest_stats = {}
        if hasattr(app.state, 'backtest_engine'):
            backtest_stats = await app.state.backtest_engine.get_stats()

        # 获取策略管理器状态
        strategy_stats = {}
        if hasattr(app.state, 'strategy_manager'):
            strategy_stats = await app.state.strategy_manager.get_stats()

        return {
            "database_stats": stats,
            "backtest_stats": backtest_stats,
            "strategy_stats": strategy_stats
        }
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@log_performance
async def run_backtest_background(
    strategy_id: int,
    start_date: str,
    end_date: str,
    initial_amount: float,
    investment_frequency: str
):
    """后台回测任务"""
    try:
        if not hasattr(app.state, 'backtest_engine'):
            logger.error("回测引擎未启动")
            return

        backtest_engine = app.state.backtest_engine
        result = await backtest_engine.run_backtest(
            strategy_id=strategy_id,
            start_date=start_date,
            end_date=end_date,
            initial_amount=initial_amount,
            investment_frequency=investment_frequency
        )
        logger.info(f"回测任务完成: {result}")
    except Exception as e:
        logger.error(f"回测任务失败: {e}")


def main():
    """主函数"""
    import uvicorn

    logger.info(f"启动回测服务 - 端口: {settings.service_ports.backtest}")

    uvicorn.run(
        "main:app",
        host=settings.api.host,
        port=settings.service_ports.backtest,
        reload=settings.api.reload,
        workers=1 if settings.api.reload else settings.api.workers,
        log_level=settings.logging.level.lower(),
    )


if __name__ == "__main__":
    main()