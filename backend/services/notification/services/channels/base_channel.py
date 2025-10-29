"""
通知渠道基类
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import asyncio
import logging

from shared.utils import get_logger


class BaseNotificationChannel(ABC):
    """通知渠道基类"""

    def __init__(self, channel_name: str):
        self.channel_name = channel_name
        self.logger = get_logger(f"{self.__class__.__name__}")
        self.is_running = False
        self.config = {}

    async def start(self):
        """启动通知渠道"""
        try:
            await self._initialize()
            self.is_running = True
            self.logger.info(f"通知渠道 {self.channel_name} 启动成功")
        except Exception as e:
            self.logger.error(f"通知渠道 {self.channel_name} 启动失败: {e}")
            raise

    async def stop(self):
        """停止通知渠道"""
        try:
            await self._cleanup()
            self.is_running = False
            self.logger.info(f"通知渠道 {self.channel_name} 已停止")
        except Exception as e:
            self.logger.error(f"通知渠道 {self.channel_name} 停止失败: {e}")

    @abstractmethod
    async def _initialize(self):
        """初始化渠道"""
        pass

    @abstractmethod
    async def _cleanup(self):
        """清理资源"""
        pass

    @abstractmethod
    async def send_notification(self, recipient: str, subject: str,
                              content: Dict[str, str],
                              config: Dict[str, Any]) -> Dict[str, Any]:
        """
        发送通知

        Args:
            recipient: 接收者
            subject: 主题
            content: 内容 (包含 plain, html 等格式)
            config: 渠道配置

        Returns:
            Dict[str, Any]: 发送结果
        """
        pass

    async def validate_config(self, config: Dict[str, Any]) -> bool:
        """
        验证配置

        Args:
            config: 配置数据

        Returns:
            bool: 是否有效
        """
        try:
            required_fields = self.get_required_config_fields()
            for field in required_fields:
                if field not in config:
                    self.logger.error(f"配置缺少必需字段: {field}")
                    return False
            return True
        except Exception as e:
            self.logger.error(f"配置验证失败: {e}")
            return False

    @abstractmethod
    def get_required_config_fields(self) -> list:
        """获取必需的配置字段"""
        pass

    def format_content(self, content: Dict[str, str], format_type: str = "plain") -> str:
        """
        格式化内容

        Args:
            content: 内容字典
            format_type: 格式类型 (plain, html)

        Returns:
            str: 格式化后的内容
        """
        if format_type == "html" and "html" in content:
            return content["html"]
        elif format_type == "plain" and "plain" in content:
            return content["plain"]
        else:
            # 默认返回纯文本
            return content.get("plain", str(content))

    async def test_connection(self, config: Dict[str, Any]) -> bool:
        """
        测试连接

        Args:
            config: 配置数据

        Returns:
            bool: 连接是否成功
        """
        try:
            # 发送测试消息
            test_content = {
                "plain": "这是一条测试消息",
                "html": "<p>这是一条测试消息</p>"
            }

            result = await self.send_notification(
                recipient=self.get_test_recipient(config),
                subject="测试消息",
                content=test_content,
                config=config
            )

            return result.get("success", False)

        except Exception as e:
            self.logger.error(f"测试连接失败: {e}")
            return False

    def get_test_recipient(self, config: Dict[str, Any]) -> str:
        """获取测试接收者"""
        # 子类可以重写此方法
        return config.get("test_recipient", "")

    async def health_check(self) -> Dict[str, Any]:
        """
        健康检查

        Returns:
            Dict[str, Any]: 健康状态
        """
        return {
            "channel_name": self.channel_name,
            "is_running": self.is_running,
            "status": "healthy" if self.is_running else "unhealthy",
            "last_check": None
        }

    def get_rate_limit_info(self) -> Dict[str, Any]:
        """
        获取速率限制信息

        Returns:
            Dict[str, Any]: 速率限制配置
        """
        return {
            "max_requests_per_minute": 60,
            "max_requests_per_hour": 1000,
            "current_usage": 0
        }

    async def apply_rate_limit(self):
        """应用速率限制"""
        rate_limit_info = self.get_rate_limit_info()
        # 这里可以实现具体的速率限制逻辑
        await asyncio.sleep(0.1)  # 简单的延迟

    def format_error_message(self, error: Exception, context: str = "") -> str:
        """
        格式化错误消息

        Args:
            error: 异常对象
            context: 上下文信息

        Returns:
            str: 格式化的错误消息
        """
        error_msg = f"通知渠道 {self.channel_name}"
        if context:
            error_msg += f" [{context}]"
        error_msg += f" 发送失败: {str(error)}"
        return error_msg

    async def retry_send(self, recipient: str, subject: str,
                         content: Dict[str, str], config: Dict[str, Any],
                         max_retries: int = 3, retry_delay: float = 1.0) -> Dict[str, Any]:
        """
        重试发送

        Args:
            recipient: 接收者
            subject: 主题
            content: 内容
            config: 配置
            max_retries: 最大重试次数
            retry_delay: 重试延迟

        Returns:
            Dict[str, Any]: 发送结果
        """
        last_error = None

        for attempt in range(max_retries + 1):
            try:
                result = await self.send_notification(recipient, subject, content, config)
                if result.get("success", False):
                    if attempt > 0:
                        self.logger.info(f"重试发送成功，尝试次数: {attempt + 1}")
                    return result

                last_error = result.get("error", "Unknown error")

            except Exception as e:
                last_error = str(e)
                self.logger.error(f"发送失败，尝试 {attempt + 1}/{max_retries + 1}: {e}")

            if attempt < max_retries:
                await asyncio.sleep(retry_delay * (attempt + 1))  # 指数退避

        return {
            "success": False,
            "error": last_error,
            "attempts": max_retries + 1,
            "channel": self.channel_name
        }