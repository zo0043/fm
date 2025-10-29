"""
邮件通知渠道
"""

from typing import Dict, Any
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

from shared.utils import get_logger, log_performance
from .base_channel import BaseNotificationChannel


class EmailChannel(BaseNotificationChannel):
    """邮件通知渠道"""

    def __init__(self):
        super().__init__("email")
        self.smtp_client = None

    async def _initialize(self):
        """初始化邮件渠道"""
        try:
            # 邮件渠道不需要特殊的初始化
            self.logger.info("邮件渠道初始化完成")
        except Exception as e:
            self.logger.error(f"邮件渠道初始化失败: {e}")
            raise

    async def _cleanup(self):
        """清理资源"""
        try:
            if self.smtp_client:
                self.smtp_client.close()
            self.logger.info("邮件渠道清理完成")
        except Exception as e:
            self.logger.error(f"邮件渠道清理失败: {e}")

    @log_performance
    async def send_notification(self, recipient: str, subject: str,
                              content: Dict[str, str],
                              config: Dict[str, Any]) -> Dict[str, Any]:
        """
        发送邮件通知

        Args:
            recipient: 收件人邮箱
            subject: 邮件主题
            content: 邮件内容
            config: SMTP配置

        Returns:
            Dict[str, Any]: 发送结果
        """
        try:
            if not recipient:
                return {
                    "success": False,
                    "error": "收件人邮箱不能为空",
                    "channel": self.channel_name
                }

            # 应用速率限制
            await self.apply_rate_limit()

            # 构建邮件
            message = self._build_email_message(recipient, subject, content, config)

            # 发送邮件
            result = await self._send_email(message, config)

            if result["success"]:
                self.logger.info(f"邮件发送成功: {recipient} - {subject}")
            else:
                self.logger.error(f"邮件发送失败: {recipient} - {result.get('error')}")

            return result

        except Exception as e:
            error_msg = self.format_error_message(e, "发送邮件")
            self.logger.error(error_msg)
            return {
                "success": False,
                "error": str(e),
                "channel": self.channel_name
            }

    def _build_email_message(self, recipient: str, subject: str,
                           content: Dict[str, str], config: Dict[str, Any]) -> MIMEMultipart:
        """构建邮件消息"""
        # 创建邮件对象
        message = MIMEMultipart("alternative")

        # 设置邮件头
        message["From"] = formataddr((config.get("sender_name", "基金监控系统"), config.get("smtp_user", "")))
        message["To"] = recipient
        message["Subject"] = self._format_subject(subject, config)

        # 添加纯文本内容
        plain_content = self.format_content(content, "plain")
        text_part = MIMEText(plain_content, "plain", "utf-8")
        message.attach(text_part)

        # 添加HTML内容（如果有）
        if "html" in content:
            html_content = self.format_content(content, "html")
            html_part = MIMEText(html_content, "html", "utf-8")
            message.attach(html_part)

        # 添加自定义头
        if config.get("add_headers"):
            for header_name, header_value in config.get("add_headers", {}).items():
                message[header_name] = header_value

        return message

    def _format_subject(self, subject: str, config: Dict[str, Any]) -> str:
        """格式化邮件主题"""
        # 添加前缀
        prefix = config.get("subject_prefix", "[基金监控]")
        if prefix and not subject.startswith(prefix):
            subject = f"{prefix} {subject}"

        # 添加后缀
        suffix = config.get("subject_suffix", "")
        if suffix and not subject.endswith(suffix):
            subject = f"{subject} {suffix}"

        return subject

    async def _send_email(self, message: MIMEMultipart, config: Dict[str, Any]) -> Dict[str, Any]:
        """发送邮件"""
        try:
            import aiosmtplib

            # 获取SMTP配置
            smtp_host = config.get("smtp_host")
            smtp_port = config.get("smtp_port", 587)
            smtp_user = config.get("smtp_user")
            smtp_password = config.get("smtp_password")
            use_tls = config.get("use_tls", True)
            use_ssl = config.get("use_ssl", False)

            if not all([smtp_host, smtp_user, smtp_password]):
                return {
                    "success": False,
                    "error": "SMTP配置不完整",
                    "channel": self.channel_name
                }

            # 创建SMTP连接
            if use_ssl:
                smtp = aiosmtplib.SMTP_SSL(hostname=smtp_host, port=smtp_port)
            else:
                smtp = aiosmtplib.SMTP(hostname=smtp_host, port=smtp_port)

            try:
                # 连接SMTP服务器
                await smtp.connect()

                # 启动TLS加密
                if use_tls and not use_ssl:
                    await smtp.starttls()

                # 登录
                await smtp.login(smtp_user, smtp_password)

                # 发送邮件
                response = await smtp.send_message(message)

                if response.startswith("250"):
                    return {
                        "success": True,
                        "message_id": response,
                        "channel": self.channel_name,
                        "smtp_response": response
                    }
                else:
                    return {
                        "success": False,
                        "error": f"SMTP发送失败: {response}",
                        "smtp_response": response,
                        "channel": self.channel_name
                    }

            finally:
                await smtp.quit()

        except aiosmtplib.SMTPException as e:
            return {
                "success": False,
                "error": f"SMTP错误: {str(e)}",
                "error_type": "smtp_error",
                "channel": self.channel_name
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"发送邮件失败: {str(e)}",
                "error_type": "general_error",
                "channel": self.channel_name
            }

    def get_required_config_fields(self) -> list:
        """获取必需的配置字段"""
        return [
            "smtp_host",
            "smtp_port",
            "smtp_user",
            "smtp_password",
            "sender_name"
        ]

    def get_test_recipient(self, config: Dict[str, Any]) -> str:
        """获取测试接收者"""
        return config.get("test_recipient", config.get("smtp_user", ""))

    async def health_check(self) -> Dict[str, Any]:
        """健康检查"""
        status = await super().health_check()

        # 这里可以添加SMTP连接测试
        status["smtp_status"] = "not_tested"

        return status

    def get_rate_limit_info(self) -> Dict[str, Any]:
        """获取速率限制信息"""
        # 邮件发送通常没有严格的API限制，但考虑服务器负载
        return {
            "max_requests_per_minute": 30,
            "max_requests_per_hour": 500,
            "current_usage": 0,
            "recommended_delay": 2.0  # 推荐延迟2秒
        }

    async def apply_rate_limit(self):
        """应用速率限制"""
        rate_limit_info = self.get_rate_limit_info()
        delay = rate_limit_info.get("recommended_delay", 1.0)
        await asyncio.sleep(delay)

    def validate_email_address(self, email: str) -> bool:
        """验证邮箱地址格式"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    async def send_batch_emails(self, recipients: list, subject: str,
                              content: Dict[str, str], config: Dict[str, Any]) -> Dict[str, Any]:
        """批量发送邮件"""
        results = {
            "success": True,
            "total": len(recipients),
            "sent": 0,
            "failed": 0,
            "errors": []
        }

        for recipient in recipients:
            if not self.validate_email_address(recipient):
                results["failed"] += 1
                results["errors"].append(f"无效的邮箱地址: {recipient}")
                continue

            try:
                result = await self.send_notification(recipient, subject, content, config)
                if result.get("success"):
                    results["sent"] += 1
                else:
                    results["failed"] += 1
                    results["errors"].append(f"{recipient}: {result.get('error')}")
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"{recipient}: {str(e)}")

            # 批量发送时添加延迟
            await asyncio.sleep(0.5)

        results["success"] = results["failed"] == 0
        return results