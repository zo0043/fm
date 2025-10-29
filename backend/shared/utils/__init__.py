"""
共享工具模块
"""

from .http_client import (
    http_client,
    async_http_client,
    ttfund_client,
    sina_client,
    SyncHTTPClient,
    AsyncHTTPClient,
    HTTPResponse,
    retry_on_failure,
)

from .logger import (
    get_logger,
    LoggerMixin,
    log_function_call,
    log_async_function_call,
    log_performance,
    log_async_performance,
    log_requests_middleware,
    setup_logging,
)

from .data_validation import (
    FundCodeValidator,
    FundNameValidator,
    NavValidator,
    DateValidator,
    FundTypeValidator,
    FundDataModel,
    NavDataModel,
    DataCleaner,
)

__all__ = [
    # HTTP客户端
    "http_client",
    "async_http_client",
    "ttfund_client",
    "sina_client",
    "SyncHTTPClient",
    "AsyncHTTPClient",
    "HTTPResponse",
    "retry_on_failure",

    # 日志工具
    "get_logger",
    "LoggerMixin",
    "log_function_call",
    "log_async_function_call",
    "log_performance",
    "log_async_performance",
    "log_requests_middleware",
    "setup_logging",

    # 数据验证
    "FundCodeValidator",
    "FundNameValidator",
    "NavValidator",
    "DateValidator",
    "FundTypeValidator",
    "FundDataModel",
    "NavDataModel",
    "DataCleaner",
]