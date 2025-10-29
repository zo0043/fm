"""
通知服务主程序
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
from .routers import notification_router, config_router, template_router
from .services.notification_manager import NotificationManager
from .services.celery_app import celery_app

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("通知服务启动中...")

    # 初始化数据库
    try:
        await db_manager.create_tables_async()
        logger.info("数据库表创建完成")
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")
        raise

    # 启动通知管理器
    notification_manager = NotificationManager()
    try:
        await notification_manager.start()
        app.state.notification_manager = notification_manager
        logger.info("通知管理器启动成功")
    except Exception as e:
        logger.error(f"通知管理器启动失败: {e}")
        raise

    # 启动Celery Worker (可选)
    try:
        # 在生产环境中，Celery Worker通常是独立进程
        logger.info("Celery应用已配置")
    except Exception as e:
        logger.error(f"Celery配置失败: {e}")

    yield

    # 关闭通知管理器
    if hasattr(app.state, 'notification_manager'):
        await app.state.notification_manager.stop()
        logger.info("通知管理器已停止")

    # 关闭数据库连接
    db_manager.close()
    logger.info("通知服务已关闭")


# 创建FastAPI应用
app = FastAPI(
    title="基金监控 - 通知服务",
    description="负责告警通知的发送和管理，支持多种通知渠道",
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
app.include_router(notification_router, prefix="/api/v1/notifications", tags=["通知管理"])
app.include_router(config_router, prefix="/api/v1/configs", tags=["通知配置"])
app.include_router(template_router, prefix="/api/v1/templates", tags=["消息模板"])


@app.get("/")
async def root():
    """根路径"""
    return {
        "service": "通知服务",
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/api/v1/notifications",
            "/api/v1/configs",
            "/api/v1/templates",
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
        "notification_manager": False,
        "celery": False
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

    # 检查通知管理器状态
    if hasattr(app.state, 'notification_manager'):
        health_status["notification_manager"] = app.state.notification_manager.is_running

    # 检查Celery状态
    try:
        inspect = celery_app.control.inspect()
        stats = inspect.stats()
        health_status["celery"] = bool(stats)
    except Exception as e:
        logger.error(f"Celery健康检查失败: {e}")

    # 判断整体健康状态
    all_healthy = all([
        health_status["database"],
        health_status["redis"],
        health_status["notification_manager"]
    ])

    if all_healthy:
        health_status["status"] = "healthy"
        return health_status
    else:
        health_status["status"] = "unhealthy"
        raise HTTPException(status_code=503, detail=health_status)


@app.post("/api/v1/notify", summary="发送通知")
async def send_notification(
    background_tasks: BackgroundTasks,
    fund_code: str,
    rule_result: dict,
    channels: Optional[List[str]] = None
):
    """
    发送通知 (供其他服务调用)

    Args:
        fund_code: 基金代码
        rule_result: 规则触发结果
        channels: 指定通知渠道，为空则使用规则配置的渠道
    """
    try:
        background_tasks.add_task(
            send_notification_background,
            fund_code=fund_code,
            rule_result=rule_result,
            channels=channels
        )

        return {
            "message": "通知发送任务已启动",
            "fund_code": fund_code,
            "channels": channels,
            "task_id": f"notify_{fund_code}_{asyncio.get_event_loop().time()}"
        }

    except Exception as e:
        logger.error(f"启动通知发送任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/stats")
async def get_notification_stats():
    """获取通知统计信息"""
    try:
        from shared.database import get_database_stats
        stats = await get_database_stats()

        # 获取通知管理器状态
        notification_stats = {}
        if hasattr(app.state, 'notification_manager'):
            notification_stats = await app.state.notification_manager.get_stats()

        # 获取Celery状态
        celery_stats = {}
        try:
            inspect = celery_app.control.inspect()
            active_tasks = inspect.active()
            celery_stats = {
                "active_tasks": len(active_tasks.get('default', [])) if active_tasks else 0,
                "workers": len(inspect.stats() or {})
            }
        except Exception as e:
            logger.error(f"获取Celery统计失败: {e}")

        return {
            "database_stats": stats,
            "notification_stats": notification_stats,
            "celery_stats": celery_stats
        }
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/status")
async def get_service_status():
    """获取服务状态"""
    try:
        status = {
            "service": "notification",
            "status": "running",
            "timestamp": None,
            "components": {
                "notification_manager": False,
                "celery_broker": False,
                "celery_worker": False,
            }
        }

        from datetime import datetime
        status["timestamp"] = datetime.now().isoformat()

        # 检查通知管理器
        if hasattr(app.state, 'notification_manager'):
            status["components"]["notification_manager"] = app.state.notification_manager.is_running

        # 检查Celery
        try:
            inspect = celery_app.control.inspect()
            stats = inspect.stats()
            status["components"]["celery_worker"] = bool(stats)

            # 检查broker连接
            celery_app.broker_connection().ensure_connection(max_retries=3)
            status["components"]["celery_broker"] = True
        except Exception as e:
            logger.error(f"检查Celery状态失败: {e}")

        return status

    except Exception as e:
        logger.error(f"获取服务状态失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@log_performance
async def send_notification_background(
    fund_code: str,
    rule_result: dict,
    channels: Optional[List[str]] = None
):
    """后台通知发送任务"""
    try:
        if not hasattr(app.state, 'notification_manager'):
            logger.error("通知管理器未启动")
            return

        notification_manager = app.state.notification_manager
        result = await notification_manager.send_notification(
            fund_code=fund_code,
            rule_result=rule_result,
            channels=channels
        )
        logger.info(f"通知发送完成: {result}")

    except Exception as e:
        logger.error(f"通知发送失败: {e}")


def main():
    """主函数"""
    import uvicorn

    logger.info(f"启动通知服务 - 端口: {settings.service_ports.notification}")

    uvicorn.run(
        "main:app",
        host=settings.api.host,
        port=settings.service_ports.notification,
        reload=settings.api.reload,
        workers=1 if settings.api.reload else settings.api.workers,
        log_level=settings.logging.level.lower(),
    )


if __name__ == "__main__":
    main()