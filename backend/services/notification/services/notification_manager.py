"""
通知管理器
"""

import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
import json

from shared.utils import get_logger, log_performance
from shared.database import get_async_db
from shared.database.models import NotificationConfig, NotificationLog, MonitorResult
from .channels.base_channel import BaseNotificationChannel
from .channels.wechat_channel import WeChatChannel
from .channels.email_channel import EmailChannel
from .template_engine import TemplateEngine


class NotificationStatus(str, Enum):
    """通知状态枚举"""
    PENDING = "pending"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"
    RETRYING = "retrying"


class NotificationManager:
    """通知管理器"""

    def __init__(self):
        self.logger = get_logger(self.__class__.__name__)
        self.channels: Dict[str, BaseNotificationChannel] = {}
        self.template_engine = TemplateEngine()
        self.is_running = False
        self.stats = {
            "total_sent": 0,
            "total_failed": 0,
            "total_pending": 0,
            "channel_stats": {},
            "last_notification_time": None,
            "start_time": None
        }

    async def start(self):
        """启动通知管理器"""
        try:
            # 初始化通知渠道
            await self._initialize_channels()

            # 启动各个渠道
            for channel_name, channel in self.channels.items():
                try:
                    await channel.start()
                    self.logger.info(f"通知渠道 {channel_name} 启动成功")
                except Exception as e:
                    self.logger.error(f"通知渠道 {channel_name} 启动失败: {e}")

            self.is_running = True
            self.stats["start_time"] = datetime.now().isoformat()
            self.logger.info("通知管理器启动成功")

        except Exception as e:
            self.logger.error(f"通知管理器启动失败: {e}")
            raise

    async def stop(self):
        """停止通知管理器"""
        try:
            # 停止各个渠道
            for channel_name, channel in self.channels.items():
                try:
                    await channel.stop()
                    self.logger.info(f"通知渠道 {channel_name} 已停止")
                except Exception as e:
                    self.logger.error(f"通知渠道 {channel_name} 停止失败: {e}")

            self.is_running = False
            self.logger.info("通知管理器已停止")

        except Exception as e:
            self.logger.error(f"通知管理器停止失败: {e}")

    async def _initialize_channels(self):
        """初始化通知渠道"""
        try:
            # 微信渠道
            self.channels["wechat"] = WeChatChannel()

            # 邮件渠道
            self.channels["email"] = EmailChannel()

            # 可以在这里添加更多渠道
            # self.channels["sms"] = SMSChannel()
            # self.channels["webhook"] = WebhookChannel()

            self.logger.info(f"已初始化 {len(self.channels)} 个通知渠道")

        except Exception as e:
            self.logger.error(f"初始化通知渠道失败: {e}")
            raise

    @log_performance
    async def send_notification(self, fund_code: str, rule_result: Dict[str, Any],
                              channels: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        发送通知

        Args:
            fund_code: 基金代码
            rule_result: 规则触发结果
            channels: 指定通知渠道，为空则使用规则配置的渠道

        Returns:
            Dict[str, Any]: 发送结果
        """
        if not self.is_running:
            raise RuntimeError("通知管理器未启动")

        start_time = datetime.now()
        total_channels = 0
        successful_channels = 0
        failed_channels = 0
        errors = []

        try:
            # 确定通知渠道
            if not channels:
                channels = rule_result.get('notification_channels', [])
            if not channels:
                # 如果没有指定渠道，使用默认配置
                channels = await self._get_default_channels()

            if not channels:
                errors.append("没有可用的通知渠道")
                return self._format_send_result(
                    success=False, total_channels=0, successful_channels=0,
                    failed_channels=0, errors=errors,
                    duration=(datetime.now() - start_time).total_seconds()
                )

            total_channels = len(channels)

            # 获取通知配置
            channel_configs = await self._get_channel_configs(channels)
            if not channel_configs:
                errors.append("没有找到有效的通知配置")
                return self._format_send_result(
                    success=False, total_channels=total_channels, successful_channels=0,
                    failed_channels=0, errors=errors,
                    duration=(datetime.now() - start_time).total_seconds()
                )

            # 生成消息内容
            message_content = await self._generate_message_content(fund_code, rule_result)

            # 并行发送通知
            tasks = []
            for channel in channels:
                if channel in self.channels and channel in channel_configs:
                    task = self._send_to_channel(
                        channel, channel_configs[channel], message_content, fund_code, rule_result
                    )
                    tasks.append(task)
                else:
                    self.logger.warning(f"渠道 {channel} 不可用或没有配置")
                    failed_channels += 1

            # 等待所有发送任务完成
            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)

                for result in results:
                    if isinstance(result, Exception):
                        self.logger.error(f"通知发送异常: {result}")
                        failed_channels += 1
                        errors.append(str(result))
                    elif result and result.get('success', False):
                        successful_channels += 1
                    else:
                        failed_channels += 1
                        if result and result.get('error'):
                            errors.append(result['error'])

            # 更新统计信息
            self.stats.update({
                "total_sent": self.stats["total_sent"] + successful_channels,
                "total_failed": self.stats["total_failed"] + failed_channels,
                "last_notification_time": datetime.now().isoformat()
            })

            # 更新渠道统计
            for channel in channels:
                if channel not in self.stats["channel_stats"]:
                    self.stats["channel_stats"][channel] = {"sent": 0, "failed": 0}

                if channel in [r for r in results if isinstance(r, dict) and r.get('success')]:
                    self.stats["channel_stats"][channel]["sent"] += 1
                else:
                    self.stats["channel_stats"][channel]["failed"] += 1

            duration = (datetime.now() - start_time).total_seconds()
            send_result = self._format_send_result(
                success=successful_channels > 0,
                total_channels=total_channels,
                successful_channels=successful_channels,
                failed_channels=failed_channels,
                errors=errors,
                duration=duration
            )

            self.logger.info(f"通知发送完成: {send_result}")
            return send_result

        except Exception as e:
            error_msg = f"通知发送过程失败: {e}"
            self.logger.error(error_msg)
            errors.append(error_msg)
            failed_channels += 1

            duration = (datetime.now() - start_time).total_seconds()
            return self._format_send_result(
                success=False, total_channels=total_channels, successful_channels=successful_channels,
                failed_channels=failed_channels, errors=errors, duration=duration
            )

    async def _send_to_channel(self, channel_name: str, config: Dict[str, Any],
                              message_content: Dict[str, str], fund_code: str,
                              rule_result: Dict[str, Any]) -> Dict[str, Any]:
        """发送通知到指定渠道"""
        try:
            channel = self.channels[channel_name]
            recipient = self._get_recipient(channel_name, config)

            # 记录发送日志
            log_id = await self._create_notification_log(
                channel_name=channel_name,
                recipient=recipient,
                message_content=message_content.get('plain', ''),
                fund_code=fund_code,
                rule_result=rule_result
            )

            try:
                # 发送通知
                send_result = await channel.send_notification(
                    recipient=recipient,
                    subject=message_content.get('subject', ''),
                    content=message_content,
                    config=config
                )

                if send_result.get('success', False):
                    # 更新发送成功状态
                    await self._update_notification_log(
                        log_id=log_id,
                        status=NotificationStatus.SENT,
                        sent_at=datetime.now()
                    )
                    self.logger.info(f"通知发送成功: {channel_name} -> {recipient}")
                    return {"success": True, "channel": channel_name, "recipient": recipient}
                else:
                    # 更新发送失败状态
                    await self._update_notification_log(
                        log_id=log_id,
                        status=NotificationStatus.FAILED,
                        error_message=send_result.get('error', 'Unknown error')
                    )
                    return {"success": False, "channel": channel_name, "error": send_result.get('error')}

            except Exception as e:
                # 发送失败
                await self._update_notification_log(
                    log_id=log_id,
                    status=NotificationStatus.FAILED,
                    error_message=str(e)
                )
                raise

        except Exception as e:
            self.logger.error(f"发送通知到渠道 {channel_name} 失败: {e}")
            return {"success": False, "channel": channel_name, "error": str(e)}

    async def _get_default_channels(self) -> List[str]:
        """获取默认通知渠道"""
        try:
            async with get_async_db().__aenter__() as session:
                from sqlalchemy import select

                # 获取激活的配置
                query = select(NotificationConfig).where(
                    NotificationConfig.is_active == True
                )
                result = await session.execute(query)
                configs = result.scalars().all()

                return [config.channel_type for config in configs]

        except Exception as e:
            self.logger.error(f"获取默认通知渠道失败: {e}")
            return []

    async def _get_channel_configs(self, channels: List[str]) -> Dict[str, Dict[str, Any]]:
        """获取渠道配置"""
        try:
            async with get_async_db().__aenter__() as session:
                from sqlalchemy import select

                query = select(NotificationConfig).where(
                    NotificationConfig.channel_type.in_(channels),
                    NotificationConfig.is_active == True
                )
                result = await session.execute(query)
                configs = result.scalars().all()

                channel_configs = {}
                for config in configs:
                    channel_configs[config.channel_type] = config.config_data

                return channel_configs

        except Exception as e:
            self.logger.error(f"获取渠道配置失败: {e}")
            return {}

    async def _generate_message_content(self, fund_code: str, rule_result: Dict[str, Any]) -> Dict[str, str]:
        """生成消息内容"""
        try:
            # 获取基金信息
            fund_info = await self._get_fund_info(fund_code)

            # 准备模板数据
            template_data = {
                'fund_code': fund_code,
                'fund_name': fund_info.get('fund_name', 'Unknown'),
                'fund_company': fund_info.get('fund_company', 'Unknown'),
                'fund_type': fund_info.get('fund_type', 'Unknown'),
                'rule_name': rule_result.get('rule_name', 'Unknown'),
                'rule_type': rule_result.get('rule_type', 'Unknown'),
                'trigger_time': rule_result.get('trigger_time', ''),
                'trigger_value': rule_result.get('trigger_value', 0),
                'threshold_value': rule_result.get('threshold_value', 0),
                'current_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            }

            # 使用模板引擎生成消息
            content = self.template_engine.render_template('alert', template_data)

            return content

        except Exception as e:
            self.logger.error(f"生成消息内容失败: {e}")
            # 返回默认消息
            return {
                'subject': f'基金监控告警 - {fund_code}',
                'plain': f'基金 {fund_code} 触发了监控规则: {rule_result.get("rule_name", "Unknown")}',
                'html': f'<p>基金 <strong>{fund_code}</strong> 触发了监控规则: <strong>{rule_result.get("rule_name", "Unknown")}</strong></p>'
            }

    async def _get_fund_info(self, fund_code: str) -> Dict[str, Any]:
        """获取基金信息"""
        try:
            async with get_async_db().__aenter__() as session:
                from shared.database.models import Fund

                fund = await session.get(Fund, fund_code)
                if fund:
                    return {
                        'fund_code': fund.fund_code,
                        'fund_name': fund.fund_name,
                        'fund_company': fund.fund_company,
                        'fund_type': fund.fund_type,
                    }
                else:
                    return {'fund_code': fund_code, 'fund_name': 'Unknown'}

        except Exception as e:
            self.logger.error(f"获取基金信息失败 {fund_code}: {e}")
            return {'fund_code': fund_code, 'fund_name': 'Unknown'}

    def _get_recipient(self, channel_name: str, config: Dict[str, Any]) -> str:
        """获取通知接收者"""
        if channel_name == 'wechat':
            return config.get('webhook_url', '')
        elif channel_name == 'email':
            return config.get('recipient', '')
        else:
            return ''

    async def _create_notification_log(self, channel_name: str, recipient: str,
                                     message_content: str, fund_code: str,
                                     rule_result: Dict[str, Any]) -> int:
        """创建通知日志"""
        try:
            async with get_async_db().__aenter__() as session:
                log = NotificationLog(
                    monitor_result_id=rule_result.get('monitor_result_id'),
                    channel_type=channel_name,
                    recipient=recipient,
                    message_content=message_content,
                    send_status=NotificationStatus.SENDING
                )

                session.add(log)
                await session.commit()
                await session.refresh(log)

                return log.id

        except Exception as e:
            self.logger.error(f"创建通知日志失败: {e}")
            return 0

    async def _update_notification_log(self, log_id: int, status: NotificationStatus,
                                      sent_at: Optional[datetime] = None,
                                      error_message: Optional[str] = None):
        """更新通知日志"""
        try:
            async with get_async_db().__aenter__() as session:
                from sqlalchemy import select

                log = await session.get(NotificationLog, log_id)
                if log:
                    log.send_status = status
                    if sent_at:
                        log.sent_at = sent_at
                    if error_message:
                        log.error_message = error_message

                    await session.commit()

        except Exception as e:
            self.logger.error(f"更新通知日志失败: {e}")

    def _format_send_result(self, success: bool, total_channels: int,
                           successful_channels: int, failed_channels: int,
                           errors: List[str], duration: float) -> Dict[str, Any]:
        """格式化发送结果"""
        return {
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_channels": total_channels,
                "successful_channels": successful_channels,
                "failed_channels": failed_channels,
                "success_rate": successful_channels / total_channels if total_channels > 0 else 0,
            },
            "errors": errors,
            "error_count": len(errors),
            "duration_seconds": duration
        }

    async def get_stats(self) -> Dict[str, Any]:
        """获取通知管理器统计信息"""
        try:
            # 获取数据库统计信息
            from sqlalchemy import select, func
            from shared.database.models import NotificationLog

            async with get_async_db().__aenter__() as session:
                # 今日通知统计
                from datetime import date
                today = date.today()

                today_total = await session.scalar(
                    select(func.count(NotificationLog.id)).where(
                        func.date(NotificationLog.created_at) == today
                    )
                )

                today_sent = await session.scalar(
                    select(func.count(NotificationLog.id)).where(
                        func.date(NotificationLog.created_at) == today,
                        NotificationLog.send_status == NotificationStatus.SENT
                    )
                )

                today_failed = await session.scalar(
                    select(func.count(NotificationLog.id)).where(
                        func.date(NotificationLog.created_at) == today,
                        NotificationLog.send_status == NotificationStatus.FAILED
                    )
                )

                # 按渠道统计
                channel_stats_query = select(
                    NotificationLog.channel_type,
                    NotificationLog.send_status,
                    func.count(NotificationLog.id).label('count')
                ).where(
                    func.date(NotificationLog.created_at) == today
                ).group_by(
                    NotificationLog.channel_type,
                    NotificationLog.send_status
                )

                channel_results = await session.execute(channel_stats_query)
                daily_channel_stats = {}

                for row in channel_results:
                    channel = row.channel_type
                    if channel not in daily_channel_stats:
                        daily_channel_stats[channel] = {"sent": 0, "failed": 0, "total": 0}

                    if row.send_status == NotificationStatus.SENT:
                        daily_channel_stats[channel]["sent"] = row.count
                    elif row.send_status == NotificationStatus.FAILED:
                        daily_channel_stats[channel]["failed"] = row.count

                    daily_channel_stats[channel]["total"] += row.count

            return {
                "manager_stats": self.stats,
                "daily_stats": {
                    "total": today_total or 0,
                    "sent": today_sent or 0,
                    "failed": today_failed or 0,
                    "success_rate": (today_sent / today_total) if today_total and today_sent else 0,
                },
                "daily_channel_stats": daily_channel_stats,
                "runtime_info": {
                    "is_running": self.is_running,
                    "active_channels": len(self.channels),
                    "uptime_seconds": (
                        (datetime.now() - datetime.fromisoformat(self.stats["start_time"]))
                        .total_seconds()
                        if self.stats.get("start_time") else 0
                    )
                }
            }

        except Exception as e:
            self.logger.error(f"获取通知统计失败: {e}")
            return {"error": str(e)}