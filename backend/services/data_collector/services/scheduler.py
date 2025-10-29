"""
数据收集调度器
"""

import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, time, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger

from shared.utils import get_logger, log_performance
from shared.config import settings
from .fund_collector import FundCollector
from .nav_collector import NavCollector


class DataCollectionScheduler:
    """数据收集调度器"""

    def __init__(self):
        self.logger = get_logger(self.__class__.__name__)
        self.scheduler = AsyncIOScheduler()
        self.fund_collector = FundCollector()
        self.nav_collector = NavCollector()
        self.is_running = False

    async def start(self):
        """启动调度器"""
        try:
            self.scheduler.start()
            self.is_running = True

            # 添加定时任务
            await self._setup_scheduled_jobs()

            self.logger.info("数据收集调度器启动成功")

        except Exception as e:
            self.logger.error(f"调度器启动失败: {e}")
            raise

    async def stop(self):
        """停止调度器"""
        try:
            if self.scheduler.running:
                self.scheduler.shutdown(wait=True)
            self.is_running = False
            self.logger.info("数据收集调度器已停止")

        except Exception as e:
            self.logger.error(f"调度器停止失败: {e}")

    async def _setup_scheduled_jobs(self):
        """设置定时任务"""
        # 基金信息收集任务 (每天凌晨2点)
        self.scheduler.add_job(
            func=self._scheduled_fund_collection,
            trigger=CronTrigger(
                hour=2,
                minute=0,
                second=0,
                timezone='Asia/Shanghai'
            ),
            id='fund_collection_daily',
            name='每日基金信息收集',
            replace_existing=True,
            max_instances=1
        )

        # 净值数据收集任务 (每天晚上6点，交易时间后)
        collection_time = settings.system.data_collection_time
        hour, minute = map(int, collection_time.split(':'))
        self.scheduler.add_job(
            func=self._scheduled_nav_collection,
            trigger=CronTrigger(
                hour=hour,
                minute=minute,
                second=0,
                timezone='Asia/Shanghai'
            ),
            id='nav_collection_daily',
            name='每日净值数据收集',
            replace_existing=True,
            max_instances=1
        )

        # 数据完整性检查任务 (每天凌晨3点)
        self.scheduler.add_job(
            func=self._scheduled_data_integrity_check,
            trigger=CronTrigger(
                hour=3,
                minute=0,
                second=0,
                timezone='Asia/Shanghai'
            ),
            id='data_integrity_check',
            name='数据完整性检查',
            replace_existing=True,
            max_instances=1
        )

        # 数据清理任务 (每周日凌晨4点)
        self.scheduler.add_job(
            func=self._scheduled_data_cleanup,
            trigger=CronTrigger(
                day_of_week=0,  # Sunday
                hour=4,
                minute=0,
                second=0,
                timezone='Asia/Shanghai'
            ),
            id='data_cleanup_weekly',
            name='每周数据清理',
            replace_existing=True,
            max_instances=1
        )

        self.logger.info(f"定时任务设置完成，共 {len(self.scheduler.get_jobs())} 个任务")

    @log_performance
    async def _scheduled_fund_collection(self):
        """定时基金信息收集任务"""
        try:
            self.logger.info("开始执行定时基金信息收集任务")

            result = await self.fund_collector.collect_funds(force_update=False)

            self.logger.info(f"定时基金信息收集任务完成: {result}")

            # 发送通知 (如果需要)
            if not result.get('success', False):
                await self._send_collection_notification('fund_collection', result)

        except Exception as e:
            self.logger.error(f"定时基金信息收集任务失败: {e}")
            await self._send_collection_notification('fund_collection', {'error': str(e)})

    @log_performance
    async def _scheduled_nav_collection(self):
        """定时净值数据收集任务"""
        try:
            self.logger.info("开始执行定时净值数据收集任务")

            # 获取最新交易日
            yesterday = datetime.now() - timedelta(days=1)
            target_date = yesterday.strftime('%Y-%m-%d')

            result = await self.nav_collector.collect_nav_data(date=target_date)

            self.logger.info(f"定时净值数据收集任务完成: {result}")

            # 发送通知 (如果需要)
            if not result.get('success', False):
                await self._send_collection_notification('nav_collection', result)

        except Exception as e:
            self.logger.error(f"定时净值数据收集任务失败: {e}")
            await self._send_collection_notification('nav_collection', {'error': str(e)})

    @log_performance
    async def _scheduled_data_integrity_check(self):
        """定时数据完整性检查任务"""
        try:
            self.logger.info("开始执行数据完整性检查任务")

            # 检查最近7天的数据完整性
            issues = await self._check_data_integrity(days=7)

            if issues:
                self.logger.warning(f"数据完整性检查发现问题: {issues}")
                await self._send_integrity_notification(issues)
            else:
                self.logger.info("数据完整性检查通过")

        except Exception as e:
            self.logger.error(f"数据完整性检查失败: {e}")

    @log_performance
    async def _scheduled_data_cleanup(self):
        """定时数据清理任务"""
        try:
            self.logger.info("开始执行数据清理任务")

            # 清理30天前的日志数据
            cleanup_result = await self._cleanup_old_data(days=30)

            self.logger.info(f"数据清理任务完成: {cleanup_result}")

        except Exception as e:
            self.logger.error(f"数据清理任务失败: {e}")

    async def _check_data_integrity(self, days: int = 7) -> List[Dict[str, Any]]:
        """检查数据完整性"""
        issues = []

        try:
            from shared.database import get_async_db
            from sqlalchemy import select, func
            from shared.database.models import Fund, NetAssetValue

            async with get_async_db().__aenter__() as session:
                # 检查基金数量
                fund_count = await session.scalar(select(func.count(Fund.id)))
                if fund_count == 0:
                    issues.append({
                        'type': 'no_funds',
                        'message': '数据库中没有基金数据',
                        'severity': 'high'
                    })

                # 检查最近几天的净值数据
                end_date = datetime.now().date()
                start_date = end_date - timedelta(days=days)

                for i in range(days):
                    check_date = start_date + timedelta(days=i)

                    # 跳过周末
                    if check_date.weekday() >= 5:
                        continue

                    # 检查该日期的净值数据
                    nav_count = await session.scalar(
                        select(func.count(NetAssetValue.id))
                        .where(NetAssetValue.nav_date == check_date)
                    )

                    if nav_count == 0:
                        issues.append({
                            'type': 'missing_nav_data',
                            'date': check_date.isoformat(),
                            'message': f'日期 {check_date} 没有净值数据',
                            'severity': 'medium'
                        })

        except Exception as e:
            self.logger.error(f"数据完整性检查失败: {e}")
            issues.append({
                'type': 'check_error',
                'message': f'数据完整性检查过程中发生错误: {e}',
                'severity': 'high'
            })

        return issues

    async def _cleanup_old_data(self, days: int = 30) -> Dict[str, Any]:
        """清理旧数据"""
        cleanup_stats = {
            'notification_logs': 0,
            'monitor_results': 0,
            'success': False
        }

        try:
            from shared.database import get_async_db
            from sqlalchemy import delete
            from shared.database.models import NotificationLog, MonitorResult

            cutoff_date = datetime.now() - timedelta(days=days)

            async with get_async_db().__aenter__() as session:
                # 清理旧的通知日志
                result = await session.execute(
                    delete(NotificationLog).where(NotificationLog.created_at < cutoff_date)
                )
                cleanup_stats['notification_logs'] = result.rowcount

                # 清理旧的监控结果
                result = await session.execute(
                    delete(MonitorResult).where(MonitorResult.created_at < cutoff_date)
                )
                cleanup_stats['monitor_results'] = result.rowcount

                await session.commit()
                cleanup_stats['success'] = True

        except Exception as e:
            self.logger.error(f"数据清理失败: {e}")

        return cleanup_stats

    async def _send_collection_notification(self, task_type: str, result: Dict[str, Any]):
        """发送收集任务通知"""
        try:
            # 这里可以集成通知服务
            if settings.notification.wechat_webhook_url:
                await self._send_wechat_notification(task_type, result)

        except Exception as e:
            self.logger.error(f"发送通知失败: {e}")

    async def _send_wechat_notification(self, task_type: str, result: Dict[str, Any]):
        """发送微信通知"""
        try:
            from shared.utils import async_http_client

            webhook_url = f"{settings.notification.wechat_webhook_url}{settings.notification.wechat_webhook_key}"

            if task_type == 'fund_collection':
                if result.get('success', False):
                    message = f"✅ 基金信息收集完成\n成功: {result.get('success_count', 0)}\n失败: {result.get('failure_count', 0)}"
                else:
                    message = f"❌ 基金信息收集失败\n错误: {result.get('error', '未知错误')}"

            elif task_type == 'nav_collection':
                if result.get('success', False):
                    message = f"✅ 净值数据收集完成\n成功: {result.get('success_count', 0)}\n失败: {result.get('failure_count', 0)}"
                else:
                    message = f"❌ 净值数据收集失败\n错误: {result.get('error', '未知错误')}"

            else:
                message = f"📊 数据收集任务通知\n任务类型: {task_type}\n结果: {result}"

            payload = {
                "msgtype": "text",
                "text": {
                    "content": message
                }
            }

            await async_http_client.post(
                path=webhook_url,
                json=payload
            )

            self.logger.info(f"微信通知已发送: {task_type}")

        except Exception as e:
            self.logger.error(f"发送微信通知失败: {e}")

    async def _send_integrity_notification(self, issues: List[Dict[str, Any]]):
        """发送完整性检查通知"""
        try:
            if not settings.notification.wechat_webhook_url:
                return

            webhook_url = f"{settings.notification.wechat_webhook_url}{settings.notification.wechat_webhook_key}"

            high_issues = [issue for issue in issues if issue.get('severity') == 'high']
            medium_issues = [issue for issue in issues if issue.get('severity') == 'medium']

            message = f"⚠️ 数据完整性检查发现问题\n\n"

            if high_issues:
                message += f"🔴 严重问题 ({len(high_issues)}个):\n"
                for issue in high_issues:
                    message += f"• {issue['message']}\n"
                message += "\n"

            if medium_issues:
                message += f"🟡 中等问题 ({len(medium_issues)}个):\n"
                for issue in medium_issues:
                    message += f"• {issue['message']}\n"

            payload = {
                "msgtype": "text",
                "text": {
                    "content": message
                }
            }

            from shared.utils import async_http_client
            await async_http_client.post(
                path=webhook_url,
                json=payload
            )

            self.logger.info(f"数据完整性检查通知已发送")

        except Exception as e:
            self.logger.error(f"发送完整性检查通知失败: {e}")

    def get_jobs(self) -> List[Dict[str, Any]]:
        """获取所有任务"""
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                'id': job.id,
                'name': job.name,
                'next_run': job.next_run_time.isoformat() if job.next_run_time else None,
                'trigger': str(job.trigger)
            })
        return jobs

    async def add_job(self, func, trigger, job_id: str, **kwargs):
        """添加自定义任务"""
        try:
            self.scheduler.add_job(
                func=func,
                trigger=trigger,
                id=job_id,
                **kwargs
            )
            self.logger.info(f"自定义任务已添加: {job_id}")
        except Exception as e:
            self.logger.error(f"添加任务失败: {e}")
            raise

    async def remove_job(self, job_id: str):
        """移除任务"""
        try:
            self.scheduler.remove_job(job_id)
            self.logger.info(f"任务已移除: {job_id}")
        except Exception as e:
            self.logger.error(f"移除任务失败: {e}")
            raise

    async def pause_job(self, job_id: str):
        """暂停任务"""
        try:
            self.scheduler.pause_job(job_id)
            self.logger.info(f"任务已暂停: {job_id}")
        except Exception as e:
            self.logger.error(f"暂停任务失败: {e}")
            raise

    async def resume_job(self, job_id: str):
        """恢复任务"""
        try:
            self.scheduler.resume_job(job_id)
            self.logger.info(f"任务已恢复: {job_id}")
        except Exception as e:
            self.logger.error(f"恢复任务失败: {e}")
            raise