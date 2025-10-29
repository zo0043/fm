"""
数据收集服务路由模块
"""

from .fund_router import router as fund_router
from .nav_router import router as nav_router
from .schedule_router import router as schedule_router

__all__ = [
    "fund_router",
    "nav_router",
    "schedule_router",
]