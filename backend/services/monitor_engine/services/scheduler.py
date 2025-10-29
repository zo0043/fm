"""
监控调度器
"""

import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, time
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from shared.utils import get_logger, log_performance
from shared.config import settings
from .monitor_engine import MonitorEngine


class MonitorScheduler:
    """监控调度器"""

    def __init__(self):
        self.logger = get_logger(self.__class__.__name__)
        self.scheduler = AsyncIOScheduler()
        self.monitor_engine = MonitorEngine()
        self.is_running = False

    async def start(self):
        """启动调度器"""
        try:
            # 启动监控引擎
            await self.monitor_engine.start()

            # 启动调度器
            self.scheduler.start()
            self.is_running = True

            # 添加定时任务
            await self._setup_scheduled_jobs()

            self.logger.info("监控调度器启动成功")

        except Exception as e:
            self.logger.error(f"监控调度器启动失败: {e}")
            raise

    async def stop(self):
        """停止调度器"""
        try:
            if self.scheduler.running:
                self.scheduler.shutdown(wait=True)

            await self.monitor_engine.stop()
            self.is_running = False

            self.logger.info("监控调度器已停止")

        except Exception as e:
            self.logger.error(f"监控调度器停止失败: {e}")

    async def _setup_scheduled_jobs(self):
        """设置定时监控任务"""
        # 交易时间内的高频监控 (每15分钟)
        # 假设交易时间 9:30-15:00
        self.scheduler.add_job(
            func=self._high_frequency_monitor,
            trigger=CronTrigger(
                day_of_week='mon-fri',  # 周一到周五
                hour='9-14',            # 9点到14点
                minute='*/15',          # 每15分钟
                second=0,
                timezone='Asia/Shanghai'
            ),
            id='high_frequency_monitor',
            name='交易时间高频监控',
            replace_existing=True,
            max_instances=1
        )

        # 收盘后的监控 (15:30)
        self.scheduler.add_job(
            func=self._closing_monitor,
            trigger=CronTrigger(
                day_of_week='mon-fri',
                hour=15,
                minute=30,
                second=0,
                timezone='Asia/Shanghai'
            ),
            id='closing_monitor',
            name='收盘后监控',
            replace_existing=True,
            max_instances=1
        )

        # 每日例行监控 (18:00)
        self.scheduler.add_job(
            func=self._daily_monitor,
            trigger=CronTrigger(
                hour=18,
                minute=0,
                second=0,
                timezone='Asia/Shanghai'
            ),
            id='daily_monitor',
            name='每日例行监控',
            replace_existing=True,
            max_instances=1
        )

        # 每周监控总结 (周日20:00)
        self.scheduler.add_job(
            func=self._weekly_summary,
            trigger=CronTrigger(
                day_of_week=6,  # Sunday
                hour=20,
                minute=0,
                second=0,
                timezone='Asia/Shanghai'
            ),
            id='weekly_summary',
            name='每周监控总结',
            replace_existing=True,
            max_instances=1
        )

        self.logger.info(f"监控任务设置完成，共 {len(self.scheduler.get_jobs())} 个任务")

    @log_performance
    async def _high_frequency_monitor(self):
        """高频监控任务"""
        try:
            self.logger.info("开始执行高频监控任务")

            # 只监控重要基金（高关注度、高交易量等）
            important_funds = await self._get_important_funds()

            if not important_funds:
                self.logger.info("没有找到重要基金，跳过高频监控")
                return

            # 执行监控
            result = await self.monitor_engine.run_monitor(
                fund_codes=important_funds
            )

            self.logger.info(f"高频监控完成: {result}")

            # 检查是否有异常情况需要立即通知
            if result.get('summary', {}).get('rules_triggered', 0) > 0:
                await self._handle_urgent_alerts(result)

        except Exception as e:
            self.logger.error(f"高频监控任务失败: {e}")

    @log_performance
    async def _closing_monitor(self):
        """收盘后监控任务"""
        try:
            self.logger.info("开始执行收盘后监控任务")

            # 获取当日最新净值数据进行监控
            result = await self.monitor_engine.run_monitor()

            self.logger.info(f"收盘后监控完成: {result}")

            # 生成收盘监控报告
            await self._generate_closing_report(result)

        except Exception as e:
            self.logger.error(f"收盘后监控任务失败: {e}")

    @log_performance
    async def _daily_monitor(self):
        """每日例行监控任务"""
        try:
            self.logger.info("开始执行每日例行监控任务")

            # 全面监控所有基金
            result = await self.monitor_engine.run_monitor()

            self.logger.info(f"每日监控完成: {result}")

            # 生成日报
            await self._generate_daily_report(result)

            # 清理过期数据
            await self._cleanup_expired_data()

        except Exception as e:
            self.logger.error(f"每日监控任务失败: {e}")

    @log_performance
    async def _weekly_summary(self):
        """每周监控总结任务"""
        try:
            self.logger.info("开始执行每周监控总结任务")

            # 获取一周的监控数据
            weekly_stats = await self._get_weekly_stats()

            # 生成周报
            await self._generate_weekly_report(weekly_stats)

            self.logger.info("每周监控总结完成")

        except Exception as e:
            self.logger.error(f"每周监控总结任务失败: {e}")

    async def _get_important_funds(self) -> List[str]:
        """获取重要基金列表"""
        try:
            # 这里可以根据基金规模、关注度、交易量等指标来确定重要基金
            # 为了演示，返回一些热门基金代码
            important_funds = [
                '000001',  # 华夏成长混合
                '110022',  # 易方达消费行业股票
                '161725',  # 招商中证白酒指数
                '005827',  # 易方达蓝筹精选混合
                '001102',  # 前海开源国家比较优势
            ]

            # 过滤掉已经监控过的基金（避免重复）
            from shared.database import get_async_db
            from sqlalchemy import select
            from datetime import datetime, timedelta

            async with get_async_db().__aenter__() as session:
                # 检查最近15分钟内是否已经监控过
                recent_time = datetime.now() - timedelta(minutes=15)
                from shared.database.models import MonitorResult

                recent_monitored = []
                for fund_code in important_funds:
                    recent_check = await session.scalar(
                        select(MonitorResult.id).where(
                            MonitorResult.fund_code == fund_code,
                            MonitorResult.trigger_time >= recent_time
                        ).limit(1)
                    )
                    if not recent_check:
                        recent_monitored.append(fund_code)

                return recent_monitored

        except Exception as e:
            self.logger.error(f"获取重要基金失败: {e}")
            return []

    async def _handle_urgent_alerts(self, monitor_result: Dict[str, Any]):
        """处理紧急告警"""
        try:
            rules_triggered = monitor_result.get('summary', {}).get('rules_triggered', 0)
            if rules_triggered > 0:
                # 发送紧急通知
                await self._send_urgent_notification(monitor_result)

        except Exception as e:
            self.logger.error(f"处理紧急告警失败: {e}")

    async def _send_urgent_notification(self, monitor_result: Dict[str, Any]):
        """发送紧急通知"""
        try:
            if settings.notification.wechat_webhook_url:
                from shared.utils import async_http_client

                webhook_url = f"{settings.notification.wechat_webhook_url}{settings.notification.wechat_webhook_key}"

                message = f"🚨 高频监控告警\n"
                message += f"时间: {datetime.now().strftime('%H:%M:%S')}\n"
                message += f"触发规则: {monitor_result.get('summary', {}).get('rules_triggered', 0)}个\n"
                message += f"通知发送: {monitor_result.get('summary', {}).get('notifications_sent', 0)}个\n"
                message += f"监控基金: {monitor_result.get('summary', {}).get('total_funds', 0)}个"

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

                self.logger.info("紧急通知已发送")

        except Exception as e:
            self.logger.error(f"发送紧急通知失败: {e}")

    async def _generate_closing_report(self, monitor_result: Dict[str, Any]):
        """生成收盘监控报告"""
        try:
            summary = monitor_result.get('summary', {})
            report = f"📊 收盘监控报告 ({datetime.now().strftime('%Y-%m-%d %H:%M')})\n\n"
            report += f"监控基金: {summary.get('total_funds', 0)}个\n"
            report += f"执行检查: {summary.get('total_checks', 0)}次\n"
            report += f"触发规则: {summary.get('rules_triggered', 0)}个\n"
            report += f"发送通知: {summary.get('notifications_sent', 0)}个\n"

            if summary.get('trigger_rate', 0) > 0:
                report += f"触发率: {summary.get('trigger_rate', 0):.2%}\n"

            # 发送报告
            await self._send_report_notification("收盘监控报告", report)

        except Exception as e:
            self.logger.error(f"生成收盘报告失败: {e}")

    async def _generate_daily_report(self, monitor_result: Dict[str, Any]):
        """生成每日监控报告"""
        try:
            summary = monitor_result.get('summary', {})
            report = f"📅 每日监控报告 ({datetime.now().strftime('%Y-%m-%d')})\n\n"
            report += f"监控基金: {summary.get('total_funds', 0)}个\n"
            report += f"执行检查: {summary.get('total_checks', 0)}次\n"
            report += f"触发规则: {summary.get('rules_triggered', 0)}个\n"
            report += f"发送通知: {summary.get('notifications_sent', 0)}个\n"
            report += f"触发率: {summary.get('trigger_rate', 0):.2%}\n"
            report += f"通知成功率: {summary.get('notification_rate', 0):.2%}\n"

            # 获取当日TOP触发规则
            top_rules = await self._get_top_triggered_rules(days=1)
            if top_rules:
                report += f"\n🔥 热门触发规则:\n"
                for i, rule in enumerate(top_rules[:3], 1):
                    report += f"{i}. {rule.get('rule_name', 'Unknown')}: {rule.get('count', 0)}次\n"

            # 发送报告
            await self._send_report_notification("每日监控报告", report)

        except Exception as e:
            self.logger.error(f"生成每日报告失败: {e}")

    async def _generate_weekly_report(self, weekly_stats: Dict[str, Any]):
        """生成每周监控报告"""
        try:
            report = f"📈 每周监控总结 ({datetime.now().strftime('%Y年第%W周')})\n\n"
            report += f"本周触发规则: {weekly_stats.get('total_triggered', 0)}个\n"
            report += f"本周发送通知: {weekly_stats.get('total_notifications', 0)}个\n"
            report += f"活跃监控规则: {weekly_stats.get('active_rules', 0)}个\n"

            # 获取本周TOP触发规则
            top_rules = await self._get_top_triggered_rules(days=7)
            if top_rules:
                report += f"\n🏆 本周热门规则:\n"
                for i, rule in enumerate(top_rules[:5], 1):
                    report += f"{i}. {rule.get('rule_name', 'Unknown')}: {rule.get('count', 0)}次\n"

            # 发送报告
            await self._send_report_notification("每周监控总结", report)

        except Exception as e:
            self.logger.error(f"生成每周报告失败: {e}")

    async def _get_top_triggered_rules(self, days: int = 1) -> List[Dict[str, Any]]:
        """获取TOP触发规则"""
        try:
            from sqlalchemy import select, func
            from shared.database.models import MonitorResult, MonitorRule
            from datetime import datetime, timedelta

            async with get_async_db().__aenter__() as session:
                start_date = datetime.now() - timedelta(days=days)

                # 按规则ID统计触发次数
                query = select(
                    MonitorResult.rule_id,
                    MonitorRule.rule_name,
                    func.count(MonitorResult.id).label('count')
                ).join(
                    MonitorRule, MonitorResult.rule_id == MonitorRule.id
                ).where(
                    MonitorResult.trigger_time >= start_date
                ).group_by(
                    MonitorResult.rule_id,
                    MonitorRule.rule_name
                ).order_by(
                    func.count(MonitorResult.id).desc()
                ).limit(10)

                result = await session.execute(query)
                top_rules = []

                for row in result:
                    top_rules.append({
                        'rule_id': row.rule_id,
                        'rule_name': row.rule_name,
                        'count': row.count
                    })

                return top_rules

        except Exception as e:
            self.logger.error(f"获取TOP触发规则失败: {e}")
            return []

    async def _get_weekly_stats(self) -> Dict[str, Any]:
        """获取本周统计信息"""
        try:
            from sqlalchemy import select, func
            from shared.database.models import MonitorResult, MonitorRule
            from datetime import datetime, timedelta

            async with get_async_db().__aenter__() as session:
                week_ago = datetime.now() - timedelta(days=7)

                # 本周触发总数
                total_triggered = await session.scalar(
                    select(func.count(MonitorResult.id)).where(
                        MonitorResult.trigger_time >= week_ago
                    )
                )

                # 本周通知总数
                total_notifications = await session.scalar(
                    select(func.count(MonitorResult.id)).where(
                        MonitorResult.trigger_time >= week_ago,
                        MonitorResult.notification_sent == True
                    )
                )

                # 活跃规则数
                active_rules = await session.scalar(
                    select(func.count(MonitorRule.id)).where(
                        MonitorRule.is_active == True
                    )
                )

                return {
                    'total_triggered': total_triggered or 0,
                    'total_notifications': total_notifications or 0,
                    'active_rules': active_rules or 0,
                }

        except Exception as e:
            self.logger.error(f"获取本周统计失败: {e}")
            return {}

    async def _cleanup_expired_data(self):
        """清理过期数据"""
        try:
            # 清理30天前的监控结果
            from sqlalchemy import delete
            from shared.database.models import MonitorResult
            from datetime import datetime, timedelta

            cutoff_date = datetime.now() - timedelta(days=30)

            async with get_async_db().__aenter__() as session:
                result = await session.execute(
                    delete(MonitorResult).where(MonitorResult.trigger_time < cutoff_date)
                )
                await session.commit()

                if result.rowcount > 0:
                    self.logger.info(f"清理了 {result.rowcount} 条过期监控数据")

        except Exception as e:
            self.logger.error(f"清理过期数据失败: {e}")

    async def _send_report_notification(self, title: str, content: str):
        """发送报告通知"""
        try:
            if settings.notification.wechat_webhook_url:
                from shared.utils import async_http_client

                webhook_url = f"{settings.notification.wechat_webhook_url}{settings.notification.wechat_webhook_key}"

                payload = {
                    "msgtype": "text",
                    "text": {
                        "content": f"{title}\n\n{content}"
                    }
                }

                await async_http_client.post(
                    path=webhook_url,
                    json=payload
                )

                self.logger.info(f"{title}已发送")

        except Exception as e:
            self.logger.error(f"发送报告通知失败: {e}")

    def get_jobs(self) -> List[Dict[str, Any]]:
        """获取所有监控任务"""
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                'id': job.id,
                'name': job.name,
                'next_run': job.next_run_time.isoformat() if job.next_run_time else None,
                'trigger': str(job.trigger)
            })
        return jobs