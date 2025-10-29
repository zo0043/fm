"""
日志工具
提供统一的日志配置和管理
"""

import logging
import logging.handlers
import sys
import os
from pathlib import Path
from typing import Optional

from ..config.settings import settings


class ColoredFormatter(logging.Formatter):
    """彩色日志格式化器"""

    # ANSI颜色代码
    COLORS = {
        'DEBUG': '\033[36m',    # 青色
        'INFO': '\033[32m',     # 绿色
        'WARNING': '\033[33m',  # 黄色
        'ERROR': '\033[31m',    # 红色
        'CRITICAL': '\033[35m', # 紫色
        'RESET': '\033[0m'      # 重置
    }

    def format(self, record):
        # 添加颜色
        if hasattr(record, 'levelname'):
            color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
            record.levelname = f"{color}{record.levelname}{self.COLORS['RESET']}"

        return super().format(record)


def setup_logging(
    level: Optional[str] = None,
    log_file: Optional[str] = None,
    format_string: Optional[str] = None,
    enable_colors: bool = True
) -> None:
    """
    设置日志配置

    Args:
        level: 日志级别
        log_file: 日志文件路径
        format_string: 日志格式字符串
        enable_colors: 是否启用颜色
    """
    if level is None:
        level = settings.logging.level
    if log_file is None:
        log_file = settings.logging.file_path
    if format_string is None:
        format_string = settings.logging.format

    # 转换日志级别
    numeric_level = getattr(logging, level.upper(), logging.INFO)

    # 确保日志目录存在
    log_path = Path(log_file)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    # 创建根日志器
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # 清除现有的处理器
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # 控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)

    if enable_colors and sys.stdout.isatty():
        console_formatter = ColoredFormatter(format_string)
    else:
        console_formatter = logging.Formatter(format_string)

    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    # 文件处理器 (轮转)
    file_handler = logging.handlers.RotatingFileHandler(
        filename=log_file,
        maxBytes=_parse_size(settings.logging.max_file_size),
        backupCount=settings.logging.backup_count,
        encoding='utf-8'
    )
    file_handler.setLevel(numeric_level)

    file_formatter = logging.Formatter(format_string)
    file_handler.setFormatter(file_formatter)
    root_logger.addHandler(file_handler)

    # 设置特定日志器的级别
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    logging.info(f"日志系统已初始化 - 级别: {level}, 文件: {log_file}")


def _parse_size(size_str: str) -> int:
    """解析文件大小字符串"""
    size_str = size_str.upper()
    if size_str.endswith('KB'):
        return int(size_str[:-2]) * 1024
    elif size_str.endswith('MB'):
        return int(size_str[:-2]) * 1024 * 1024
    elif size_str.endswith('GB'):
        return int(size_str[:-2]) * 1024 * 1024 * 1024
    else:
        return int(size_str)


def get_logger(name: str) -> logging.Logger:
    """
    获取指定名称的日志器

    Args:
        name: 日志器名称

    Returns:
        logging.Logger: 日志器实例
    """
    return logging.getLogger(name)


class LoggerMixin:
    """日志器混入类"""

    @property
    def logger(self) -> logging.Logger:
        """获取当前类的日志器"""
        return logging.getLogger(self.__class__.__module__ + '.' + self.__class__.__name__)


def log_function_call(func):
    """函数调用日志装饰器"""
    def wrapper(*args, **kwargs):
        logger = logging.getLogger(func.__module__)
        logger.debug(f"调用函数: {func.__name__}, 参数: args={args}, kwargs={kwargs}")

        try:
            result = func(*args, **kwargs)
            logger.debug(f"函数 {func.__name__} 执行成功")
            return result
        except Exception as e:
            logger.error(f"函数 {func.__name__} 执行失败: {e}")
            raise

    return wrapper


def log_async_function_call(func):
    """异步函数调用日志装饰器"""
    async def wrapper(*args, **kwargs):
        logger = logging.getLogger(func.__module__)
        logger.debug(f"调用异步函数: {func.__name__}, 参数: args={args}, kwargs={kwargs}")

        try:
            result = await func(*args, **kwargs)
            logger.debug(f"异步函数 {func.__name__} 执行成功")
            return result
        except Exception as e:
            logger.error(f"异步函数 {func.__name__} 执行失败: {e}")
            raise

    return wrapper


# 性能日志装饰器
def log_performance(func):
    """性能日志装饰器"""
    import time

    def wrapper(*args, **kwargs):
        logger = logging.getLogger(func.__module__)
        start_time = time.time()

        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            logger.info(f"函数 {func.__name__} 执行时间: {execution_time:.3f}秒")
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"函数 {func.__name__} 执行失败，耗时: {execution_time:.3f}秒, 错误: {e}")
            raise

    return wrapper


def log_async_performance(func):
    """异步性能日志装饰器"""
    import time

    async def wrapper(*args, **kwargs):
        logger = logging.getLogger(func.__module__)
        start_time = time.time()

        try:
            result = await func(*args, **kwargs)
            execution_time = time.time() - start_time
            logger.info(f"异步函数 {func.__name__} 执行时间: {execution_time:.3f}秒")
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"异步函数 {func.__name__} 执行失败，耗时: {execution_time:.3f}秒, 错误: {e}")
            raise

    return wrapper


# 请求/响应日志中间件 (用于FastAPI)
async def log_requests_middleware(request, call_next):
    """请求/响应日志中间件"""
    import time
    from fastapi import Request, Response

    start_time = time.time()
    logger = logging.getLogger("http")

    # 记录请求
    logger.info(f"请求开始: {request.method} {request.url}")

    try:
        response = await call_next(request)
        process_time = time.time() - start_time

        # 记录响应
        logger.info(
            f"请求完成: {request.method} {request.url} - "
            f"状态码: {response.status_code} - "
            f"耗时: {process_time:.3f}秒"
        )

        # 添加响应头
        response.headers["X-Process-Time"] = str(process_time)
        return response

    except Exception as e:
        process_time = time.time() - start_time
        logger.error(
            f"请求失败: {request.method} {request.url} - "
            f"耗时: {process_time:.3f}秒 - "
            f"错误: {e}"
        )
        raise


# 初始化日志系统
def init_logging():
    """初始化日志系统"""
    setup_logging(
        level=settings.logging.level,
        log_file=settings.logging.file_path,
        format_string=settings.logging.format,
        enable_colors=settings.system.environment == "development"
    )


# 模块初始化时自动设置日志
if not logging.getLogger().handlers:
    init_logging()