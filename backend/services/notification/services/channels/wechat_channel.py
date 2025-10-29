"""
微信通知渠道
"""

from typing import Dict, Any
import json
import asyncio

from shared.utils import get_logger, log_performance
from .base_channel import BaseNotificationChannel


class WeChatChannel(BaseNotificationChannel):
    """微信企业Webhook通知渠道"""

    def __init__(self):
        super().__init__("wechat")

    async def _initialize(self):
        """初始化微信渠道"""
        try:
            # 微信渠道不需要特殊的初始化
            self.logger.info("微信渠道初始化完成")
        except Exception as e:
            self.logger.error(f"微信渠道初始化失败: {e}")
            raise

    async def _cleanup(self):
        """清理资源"""
        try:
            self.logger.info("微信渠道清理完成")
        except Exception as e:
            self.logger.error(f"微信渠道清理失败: {e}")

    @log_performance
    async def send_notification(self, recipient: str, subject: str,
                              content: Dict[str, str],
                              config: Dict[str, Any]) -> Dict[str, Any]:
        """
        发送微信通知

        Args:
            recipient: Webhook URL
            subject: 主题 (微信中可以作为标题)
            content: 消息内容
            config: 配置参数

        Returns:
            Dict[str, Any]: 发送结果
        """
        try:
            if not recipient:
                return {
                    "success": False,
                    "error": "微信Webhook URL不能为空",
                    "channel": self.channel_name
                }

            # 应用速率限制
            await self.apply_rate_limit()

            # 构建微信消息
            message_type = config.get("message_type", "text")  # text, markdown, news

            if message_type == "text":
                payload = self._build_text_message(subject, content, config)
            elif message_type == "markdown":
                payload = self._build_markdown_message(subject, content, config)
            elif message_type == "news":
                payload = self._build_news_message(subject, content, config)
            else:
                payload = self._build_text_message(subject, content, config)

            # 发送请求
            from shared.utils import async_http_client

            response = await async_http_client.post(
                path=recipient,
                json=payload,
                headers={
                    "Content-Type": "application/json"
                }
            )

            if response.is_success():
                response_data = response.json()
                if response_data.get("errcode") == 0:
                    self.logger.info(f"微信通知发送成功: {subject}")
                    return {
                        "success": True,
                        "message_id": response_data.get("msgid"),
                        "channel": self.channel_name,
                        "recipient": recipient
                    }
                else:
                    error_msg = f"微信API错误: {response_data.get('errmsg', 'Unknown error')}"
                    self.logger.error(f"微信通知发送失败: {error_msg}")
                    return {
                        "success": False,
                        "error": error_msg,
                        "errcode": response_data.get("errcode"),
                        "channel": self.channel_name
                    }
            else:
                error_msg = f"HTTP请求失败: {response.status_code}"
                self.logger.error(f"微信通知发送失败: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg,
                    "status_code": response.status_code,
                    "channel": self.channel_name
                }

        except Exception as e:
            error_msg = self.format_error_message(e, "发送微信通知")
            self.logger.error(error_msg)
            return {
                "success": False,
                "error": str(e),
                "channel": self.channel_name
            }

    def _build_text_message(self, subject: str, content: Dict[str, str],
                          config: Dict[str, Any]) -> Dict[str, Any]:
        """构建文本消息"""
        plain_content = self.format_content(content, "plain")

        # 添加主题前缀
        if subject:
            plain_content = f"📊 {subject}\n\n{plain_content}"

        # 添加时间戳
        from datetime import datetime
        plain_content += f"\n\n⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

        # 添加分割线
        if config.get("add_divider", True):
            plain_content = f"---\n{plain_content}"

        return {
            "msgtype": "text",
            "text": {
                "content": plain_content
            }
        }

    def _build_markdown_message(self, subject: str, content: Dict[str, str],
                              config: Dict[str, Any]) -> Dict[str, Any]:
        """构建Markdown消息"""
        html_content = self.format_content(content, "html")

        # 转换为Markdown格式
        markdown_content = self._html_to_markdown(html_content)

        # 添加标题
        if subject:
            markdown_content = f"## 📊 {subject}\n\n{markdown_content}"

        # 添加时间戳
        from datetime import datetime
        markdown_content += f"\n\n---\n⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

        return {
            "msgtype": "markdown",
            "markdown": {
                "content": markdown_content
            }
        }

    def _build_news_message(self, subject: str, content: Dict[str, str],
                          config: Dict[str, Any]) -> Dict[str, Any]:
        """构建图文消息"""
        plain_content = self.format_content(content, "plain")

        return {
            "msgtype": "news",
            "news": {
                "articles": [
                    {
                        "title": subject or "基金监控告警",
                        "description": plain_content[:200] + "..." if len(plain_content) > 200 else plain_content,
                        "url": config.get("detail_url", ""),
                        "picurl": config.get("pic_url", "")
                    }
                ]
            }
        }

    def _html_to_markdown(self, html_content: str) -> str:
        """简单的HTML到Markdown转换"""
        import re

        # 替换HTML标签为Markdown
        markdown = html_content

        # 标题转换
        markdown = re.sub(r'<h([1-6])>(.*?)</h[1-6]>', r'\2', markdown)
        markdown = re.sub(r'<strong>(.*?)</strong>', r'**\1**', markdown)
        markdown = re.sub(r'<b>(.*?)</b>', r'**\1**', markdown)
        markdown = re.sub(r'<em>(.*?)</em>', r'*\1*', markdown)
        markdown = re.sub(r'<i>(.*?)</i>', r'*\1*', markdown)

        # 列表转换
        markdown = re.sub(r'<li>(.*?)</li>', r'- \1', markdown)

        # 段落转换
        markdown = re.sub(r'<p>(.*?)</p>', r'\1\n\n', markdown)

        # 链接转换
        markdown = re.sub(r'<a href="(.*?)">(.*?)</a>', r'[\2](\1)', markdown)

        # 换行转换
        markdown = re.sub(r'<br\s*/?>', '\n', markdown)

        # 清除剩余的HTML标签
        markdown = re.sub(r'<[^>]+>', '', markdown)

        return markdown.strip()

    def get_required_config_fields(self) -> list:
        """获取必需的配置字段"""
        return ["webhook_url"]

    def get_test_recipient(self, config: Dict[str, Any]) -> str:
        """获取测试接收者"""
        return config.get("webhook_url", "")

    async def health_check(self) -> Dict[str, Any]:
        """健康检查"""
        status = await super().health_check()

        # 测试Webhook连接
        try:
            from shared.utils import async_http_client

            # 发送一个简单的测试请求
            test_payload = {
                "msgtype": "text",
                "text": {
                    "content": "🏥 健康检查测试"
                }
            }

            # 这里不实际发送，只检查URL格式
            webhook_url = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test"
            response = await async_http_client.post(
                path=webhook_url,
                json=test_payload,
                timeout=5.0
            )

            status["webhook_status"] = "accessible" if response.status_code != 0 else "inaccessible"

        except Exception as e:
            status["webhook_status"] = "error"
            status["webhook_error"] = str(e)

        return status

    def get_rate_limit_info(self) -> Dict[str, Any]:
        """获取速率限制信息"""
        # 微信企业Webhook限制：每分钟最多发送20条消息
        return {
            "max_requests_per_minute": 20,
            "max_requests_per_hour": 1000,
            "current_usage": 0,
            "retry_after": 60  # 超出限制后等待60秒
        }