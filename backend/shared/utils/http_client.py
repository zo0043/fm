"""
HTTP客户端工具
提供统一的HTTP请求处理，支持重试、超时、日志等功能
"""

import asyncio
import logging
from typing import Optional, Dict, Any, Union
from functools import wraps
import time
import httpx
from httpx import AsyncClient, Client, Response

from ..config.settings import settings

logger = logging.getLogger(__name__)


class HTTPClientManager:
    """HTTP客户端管理器"""

    def __init__(self):
        self._client: Optional[Client] = None
        self._async_client: Optional[AsyncClient] = None

    @property
    def client(self) -> Client:
        """获取同步HTTP客户端"""
        if self._client is None:
            self._client = Client(
                timeout=httpx.Timeout(settings.external_api.request_timeout),
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=100),
                follow_redirects=True,
            )
        return self._client

    @property
    def async_client(self) -> AsyncClient:
        """获取异步HTTP客户端"""
        if self._async_client is None:
            self._async_client = AsyncClient(
                timeout=httpx.Timeout(settings.external_api.request_timeout),
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=100),
                follow_redirects=True,
            )
        return self._async_client

    def close(self):
        """关闭HTTP客户端"""
        if self._client:
            self._client.close()
        if self._async_client:
            asyncio.create_task(self._async_client.aclose())


# 全局HTTP客户端管理器
http_manager = HTTPClientManager()


def retry_on_failure(max_retries: int = None, delay: float = None, backoff: float = 2.0):
    """
    重试装饰器

    Args:
        max_retries: 最大重试次数
        delay: 初始延迟时间(秒)
        backoff: 退避倍数
    """
    if max_retries is None:
        max_retries = settings.external_api.max_retries
    if delay is None:
        delay = settings.external_api.retry_delay

    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            last_exception = None
            current_delay = delay

            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries:
                        logger.warning(
                            f"请求失败，{current_delay}秒后重试 (第{attempt + 1}次): {e}"
                        )
                        await asyncio.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        logger.error(f"请求失败，已达最大重试次数: {e}")

            raise last_exception

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            last_exception = None
            current_delay = delay

            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries:
                        logger.warning(
                            f"请求失败，{current_delay}秒后重试 (第{attempt + 1}次): {e}"
                        )
                        time.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        logger.error(f"请求失败，已达最大重试次数: {e}")

            raise last_exception

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

    return decorator


class HTTPResponse:
    """HTTP响应包装器"""

    def __init__(self, response: Response):
        self.response = response
        self.status_code = response.status_code
        self.headers = response.headers
        self.url = str(response.url)

    def is_success(self) -> bool:
        """判断请求是否成功"""
        return 200 <= self.status_code < 300

    def json(self) -> Dict[str, Any]:
        """获取JSON数据"""
        if not self.is_success():
            raise ValueError(f"请求失败: {self.status_code}")
        return self.response.json()

    def text(self) -> str:
        """获取文本数据"""
        return self.response.text

    def content(self) -> bytes:
        """获取二进制数据"""
        return self.response.content


class BaseHTTPClient:
    """基础HTTP客户端"""

    def __init__(self, base_url: str = "", default_headers: Optional[Dict[str, str]] = None):
        self.base_url = base_url.rstrip("/")
        self.default_headers = default_headers or {}

    def _build_url(self, path: str) -> str:
        """构建完整URL"""
        if path.startswith("http"):
            return path
        return f"{self.base_url}/{path.lstrip('/')}" if self.base_url else path

    def _merge_headers(self, headers: Optional[Dict[str, str]]) -> Dict[str, str]:
        """合并请求头"""
        merged = self.default_headers.copy()
        if headers:
            merged.update(headers)
        return merged


class SyncHTTPClient(BaseHTTPClient):
    """同步HTTP客户端"""

    @retry_on_failure()
    def get(self, path: str, params: Optional[Dict] = None,
            headers: Optional[Dict[str, str]] = None) -> HTTPResponse:
        """发送GET请求"""
        url = self._build_url(path)
        merged_headers = self._merge_headers(headers)

        logger.debug(f"GET请求: {url}, 参数: {params}")

        response = http_manager.client.get(
            url=url,
            params=params,
            headers=merged_headers
        )

        logger.debug(f"GET响应: {response.status_code}")
        return HTTPResponse(response)

    @retry_on_failure()
    def post(self, path: str, data: Optional[Union[Dict, str]] = None,
             json: Optional[Dict] = None, headers: Optional[Dict[str, str]] = None) -> HTTPResponse:
        """发送POST请求"""
        url = self._build_url(path)
        merged_headers = self._merge_headers(headers)

        logger.debug(f"POST请求: {url}")

        response = http_manager.client.post(
            url=url,
            data=data,
            json=json,
            headers=merged_headers
        )

        logger.debug(f"POST响应: {response.status_code}")
        return HTTPResponse(response)

    @retry_on_failure()
    def put(self, path: str, data: Optional[Union[Dict, str]] = None,
            json: Optional[Dict] = None, headers: Optional[Dict[str, str]] = None) -> HTTPResponse:
        """发送PUT请求"""
        url = self._build_url(path)
        merged_headers = self._merge_headers(headers)

        response = http_manager.client.put(
            url=url,
            data=data,
            json=json,
            headers=merged_headers
        )

        return HTTPResponse(response)

    @retry_on_failure()
    def delete(self, path: str, headers: Optional[Dict[str, str]] = None) -> HTTPResponse:
        """发送DELETE请求"""
        url = self._build_url(path)
        merged_headers = self._merge_headers(headers)

        response = http_manager.client.delete(url=url, headers=merged_headers)
        return HTTPResponse(response)


class AsyncHTTPClient(BaseHTTPClient):
    """异步HTTP客户端"""

    @retry_on_failure()
    async def get(self, path: str, params: Optional[Dict] = None,
                  headers: Optional[Dict[str, str]] = None) -> HTTPResponse:
        """发送GET请求"""
        url = self._build_url(path)
        merged_headers = self._merge_headers(headers)

        logger.debug(f"异步GET请求: {url}, 参数: {params}")

        response = await http_manager.async_client.get(
            url=url,
            params=params,
            headers=merged_headers
        )

        logger.debug(f"异步GET响应: {response.status_code}")
        return HTTPResponse(response)

    @retry_on_failure()
    async def post(self, path: str, data: Optional[Union[Dict, str]] = None,
                   json: Optional[Dict] = None, headers: Optional[Dict[str, str]] = None) -> HTTPResponse:
        """发送POST请求"""
        url = self._build_url(path)
        merged_headers = self._merge_headers(headers)

        logger.debug(f"异步POST请求: {url}")

        response = await http_manager.async_client.post(
            url=url,
            data=data,
            json=json,
            headers=merged_headers
        )

        logger.debug(f"异步POST响应: {response.status_code}")
        return HTTPResponse(response)

    @retry_on_failure()
    async def put(self, path: str, data: Optional[Union[Dict, str]] = None,
                  json: Optional[Dict] = None, headers: Optional[Dict[str, str]] = None) -> HTTPResponse:
        """发送PUT请求"""
        url = self._build_url(path)
        merged_headers = self._merge_headers(headers)

        response = await http_manager.async_client.put(
            url=url,
            data=data,
            json=json,
            headers=merged_headers
        )

        return HTTPResponse(response)

    @retry_on_failure()
    async def delete(self, path: str, headers: Optional[Dict[str, str]] = None) -> HTTPResponse:
        """发送DELETE请求"""
        url = self._build_url(path)
        merged_headers = self._merge_headers(headers)

        response = await http_manager.async_client.delete(url=url, headers=merged_headers)
        return HTTPResponse(response)


# 便捷实例
http_client = SyncHTTPClient()
async_http_client = AsyncHTTPClient()


# 特定API客户端
class TTFundClient(SyncHTTPClient):
    """天天基金客户端"""

    def __init__(self):
        super().__init__(
            base_url=settings.external_api.ttfund_base_url,
            default_headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            }
        )


class SinaFinanceClient(SyncHTTPClient):
    """新浪财经客户端"""

    def __init__(self):
        super().__init__(
            base_url=settings.external_api.sina_base_url,
            default_headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "*/*",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            }
        )


# 全局客户端实例
ttfund_client = TTFundClient()
sina_client = SinaFinanceClient()