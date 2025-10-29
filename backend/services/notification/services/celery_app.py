"""
Celery异步任务应用
"""

from celery import Celery
from shared.config import settings

# 创建Celery应用
celery_app = Celery(
    "notification_service",
    broker=settings.celery.broker_url,
    backend=settings.celery.result_backend,
    include=[
        "services.tasks.notification_tasks"
    ]
)

# Celery配置
celery_app.conf.update(
    # 任务序列化
    task_serializer=settings.celery.task_serializer,
    result_serializer=settings.celery.result_serializer,
    accept_content=settings.celery.accept_content,

    # 时区设置
    timezone=settings.celery.timezone,
    enable_utc=settings.celery.enable_utc,

    # 任务路由
    task_routes={
        "services.tasks.notification_tasks.*": {"queue": "notifications"},
    },

    # 任务重试配置
    task_reject_on_worker_lost=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,

    # 结果过期时间
    result_expires=3600,

    # 任务默认超时时间
    task_soft_time_limit=300,
    task_time_limit=600,
)

# 定期任务配置
celery_app.conf.beat_schedule = {
    # 清理过期任务结果
    "cleanup-expired-results": {
        "task": "services.tasks.notification_tasks.cleanup_expired_results",
        "schedule": 3600.0,  # 每小时执行一次
    },

    # 重试失败的通知
    "retry-failed-notifications": {
        "task": "services.tasks.notification_tasks.retry_failed_notifications",
        "schedule": 300.0,  # 每5分钟执行一次
    },
}