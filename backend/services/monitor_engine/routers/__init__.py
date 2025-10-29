"""
监控引擎服务路由模块
"""

from .rule_router import router as rule_router
from .monitor_router import router as monitor_router

__all__ = [
    "rule_router",
    "monitor_router",
]