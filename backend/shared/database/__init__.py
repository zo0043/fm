"""
共享数据库模块
"""

from .models import (
    Base,
    Fund,
    NetAssetValue,
    MonitorRule,
    MonitorResult,
    NotificationConfig,
    NotificationLog,
    BacktestStrategy,
    BacktestResult,
    User,
    SystemConfig,
    create_tables,
    drop_tables,
)

from .database import (
    DatabaseManager,
    db_manager,
    get_db,
    get_async_db,
    with_session,
    with_async_session,
    check_database_health,
    get_database_stats,
)

__all__ = [
    # 数据模型
    "Base",
    "Fund",
    "NetAssetValue",
    "MonitorRule",
    "MonitorResult",
    "NotificationConfig",
    "NotificationLog",
    "BacktestStrategy",
    "BacktestResult",
    "User",
    "SystemConfig",
    "create_tables",
    "drop_tables",

    # 数据库管理
    "DatabaseManager",
    "db_manager",
    "get_db",
    "get_async_db",
    "with_session",
    "with_async_session",
    "check_database_health",
    "get_database_stats",
]