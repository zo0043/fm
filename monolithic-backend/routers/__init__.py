"""
路由模块
导出所有路由器
"""

from .auth_router import router as auth_router
from .data_router import router as data_router
from .backtest_router import router as backtest_router
from .monitor_router import router as monitor_router
from .notification_router import router as notification_router

__all__ = [
    "auth_router",
    "data_router", 
    "backtest_router",
    "monitor_router",
    "notification_router"
]