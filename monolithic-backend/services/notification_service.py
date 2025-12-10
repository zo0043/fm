"""
通知服务模块
负责发送各种类型的通知（邮件、微信、短信等）
"""

import logging
import smtplib
import aiohttp
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime

from database import NotificationSettings, NotificationLog
from config import settings

logger = logging.getLogger(__name__)

class NotificationService:
    """通知服务类"""
    
    def __init__(self):
        self.smtp_config = {
            "host": settings.NOTIFICATION_EMAIL_HOST,
            "port": settings.NOTIFICATION_EMAIL_PORT,
            "username": settings.NOTIFICATION_EMAIL_USERNAME,
            "password": settings.NOTIFICATION_EMAIL_PASSWORD
        }
    
    async def send_notification(
        self,
        user_id: int,
        title: str,
        content: str,
        notification_type: str = "all",
        db: Optional[AsyncSession] = None
    ):
        """发送通知给指定用户"""
        try:
            # 获取用户通知设置
            if db:
                settings_query = select(NotificationSettings).where(
                    NotificationSettings.user_id == user_id
                )
                result = await db.execute(settings_query)
                user_settings = result.scalar_one_or_none()
            else:
                # 如果没有数据库会话，使用默认设置
                user_settings = None
            
            # 如果没有设置，使用默认配置
            if not user_settings:
                user_settings = NotificationSettings(
                    email_enabled=settings.NOTIFICATION_EMAIL_ENABLED,
                    email_address="",
                    wechat_enabled=settings.NOTIFICATION_WECHAT_ENABLED,
                    wechat_webhook=settings.NOTIFICATION_WECHAT_WEBHOOK,
                    sms_enabled=False,
                    push_enabled=True,
                    monitor_alerts_enabled=True,
                    price_change_alerts_enabled=True,
                    news_alerts_enabled=False
                )
            
            success_count = 0
            failed_count = 0
            
            # 发送邮件通知
            if (notification_type == "all" or notification_type == "email") and user_settings.email_enabled and user_settings.email_address:
                try:
                    await self._send_email(user_settings.email_address, title, content)
                    success_count += 1
                    
                    # 记录成功日志
                    if db:
                        await self._log_notification(user_id, "email", title, content, "success", db)
                        
                except Exception as e:
                    logger.error(f"发送邮件通知失败: {str(e)}")
                    failed_count += 1
                    
                    # 记录失败日志
                    if db:
                        await self._log_notification(user_id, "email", title, content, "failed", str(e), db)
            
            # 发送微信通知
            if (notification_type == "all" or notification_type == "wechat") and user_settings.wechat_enabled and user_settings.wechat_webhook:
                try:
                    await self._send_wechat(user_settings.wechat_webhook, title, content)
                    success_count += 1
                    
                    # 记录成功日志
                    if db:
                        await self._log_notification(user_id, "wechat", title, content, "success", db)
                        
                except Exception as e:
                    logger.error(f"发送微信通知失败: {str(e)}")
                    failed_count += 1
                    
                    # 记录失败日志
                    if db:
                        await self._log_notification(user_id, "wechat", title, content, "failed", str(e), db)
            
            # 发送短信通知（需要第三方服务）
            if (notification_type == "all" or notification_type == "sms") and user_settings.sms_enabled:
                try:
                    await self._send_sms(user_id, title, content)
                    success_count += 1
                    
                    # 记录成功日志
                    if db:
                        await self._log_notification(user_id, "sms", title, content, "success", db)
                        
                except Exception as e:
                    logger.error(f"发送短信通知失败: {str(e)}")
                    failed_count += 1
                    
                    # 记录失败日志
                    if db:
                        await self._log_notification(user_id, "sms", title, content, "failed", str(e), db)
            
            # 发送推送通知（移动端推送）
            if (notification_type == "all" or notification_type == "push") and user_settings.push_enabled:
                try:
                    await self._send_push(user_id, title, content)
                    success_count += 1
                    
                    # 记录成功日志
                    if db:
                        await self._log_notification(user_id, "push", title, content, "success", db)
                        
                except Exception as e:
                    logger.error(f"发送推送通知失败: {str(e)}")
                    failed_count += 1
                    
                    # 记录失败日志
                    if db:
                        await self._log_notification(user_id, "push", title, content, "failed", str(e), db)
            
            logger.info(f"通知发送完成: 成功 {success_count}, 失败 {failed_count}")
            return {
                "success_count": success_count,
                "failed_count": failed_count
            }
            
        except Exception as e:
            logger.error(f"发送通知失败: {str(e)}")
            raise
    
    async def _send_email(self, email_address: str, title: str, content: str):
        """发送邮件通知"""
        if not self.smtp_config["host"] or not self.smtp_config["username"]:
            logger.warning("邮件配置不完整，跳过邮件发送")
            return
        
        try:
            msg = MimeMultipart()
            msg['From'] = self.smtp_config["username"]
            msg['To'] = email_address
            msg['Subject'] = title
            
            # 添加邮件正文
            msg.attach(MimeText(content, 'plain', 'utf-8'))
            
            # 发送邮件
            server = smtplib.SMTP(self.smtp_config["host"], self.smtp_config["port"])
            server.starttls()
            server.login(self.smtp_config["username"], self.smtp_config["password"])
            server.send_message(msg)
            server.quit()
            
            logger.info(f"邮件发送成功: {email_address}")
            
        except Exception as e:
            logger.error(f"邮件发送失败: {str(e)}")
            raise
    
    async def _send_wechat(self, webhook_url: str, title: str, content: str):
        """发送微信通知（企业微信机器人）"""
        if not webhook_url:
            logger.warning("微信 webhook URL 不存在，跳过微信发送")
            return
        
        try:
            message = {
                "msgtype": "markdown",
                "markdown": {
                    "content": f"**{title}**\n\n{content}"
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=message) as response:
                    if response.status == 200:
                        logger.info(f"微信通知发送成功")
                    else:
                        error_text = await response.text()
                        raise Exception(f"微信 API 返回错误: {response.status} - {error_text}")
                        
        except Exception as e:
            logger.error(f"微信通知发送失败: {str(e)}")
            raise
    
    async def _send_sms(self, user_id: int, title: str, content: str):
        """发送短信通知"""
        # 这里需要集成第三方短信服务，如阿里云、腾讯云等
        logger.warning("短信服务未实现，跳过短信发送")
        # 可以集成如：
        # - 阿里云短信服务
        # - 腾讯云短信服务
        # - 华为云短信服务
    
    async def _send_push(self, user_id: int, title: str, content: str):
        """发送推送通知（移动端）"""
        # 这里需要集成推送服务，如：
        # - 极光推送
        # - 个推
        # - 友盟推送
        logger.warning("推送服务未实现，跳过推送发送")
    
    async def _log_notification(
        self,
        user_id: int,
        notification_type: str,
        title: str,
        content: str,
        status: str,
        error_message: Optional[str] = None,
        db: Optional[AsyncSession] = None
    ):
        """记录通知日志"""
        if not db:
            return
        
        try:
            log_entry = NotificationLog(
                user_id=user_id,
                notification_type=notification_type,
                title=title,
                content=content,
                status=status,
                error_message=error_message,
                sent_at=datetime.utcnow() if status == "success" else None
            )
            
            db.add(log_entry)
            await db.commit()
            
        except Exception as e:
            logger.error(f"记录通知日志失败: {str(e)}")