"""
共享库模块
为所有微服务提供统一的配置、数据库模型和工具函数
"""

from .config import settings
from .database import db_manager
from .utils import get_logger

# 版本信息
__version__ = "1.0.0"
__author__ = "Fund Monitor Team"

# 初始化日志
logger = get_logger(__name__)
logger.info(f"共享库已加载 - 版本: {__version__}")

__all__ = [
    "settings",
    "db_manager",
    "get_logger",
    "__version__",
]