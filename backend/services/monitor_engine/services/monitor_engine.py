"""
监控引擎核心服务
"""

import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, date, timedelta
from decimal import Decimal

from shared.utils import get_logger, log_performance
from shared.database import get_async_db, NetAssetValue
from .rule_engine import RuleEngine


class MonitorEngine:
    """监控引擎核心"""

    def __init__(self):
        self.logger = get_logger(self.__class__.__name__)
        self.rule_engine = RuleEngine()
        self.is_running = False
        self.monitor_stats = {
            "total_checks": 0,
            "successful_checks": 0,
            "failed_checks": 0,
            "rules_triggered": 0,
            "notifications_sent": 0,
            "last_check_time": None,
            "start_time": None
        }

    async def start(self):
        """启动监控引擎"""
        try:
            self.is_running = True
            self.monitor_stats["start_time"] = datetime.now().isoformat()
            self.logger.info("监控引擎已启动")
        except Exception as e:
            self.logger.error(f"监控引擎启动失败: {e}")
            raise

    async def stop(self):
        """停止监控引擎"""
        try:
            self.is_running = False
            self.logger.info("监控引擎已停止")
        except Exception as e:
            self.logger.error(f"监控引擎停止失败: {e}")

    @log_performance
    async def run_monitor(self, rule_ids: Optional[List[int]] = None,
                         fund_codes: Optional[List[str]] = None,
                         target_date: Optional[date] = None) -> Dict[str, Any]:
        """
        执行监控任务

        Args:
            rule_ids: 指定规则ID列表
            fund_codes: 指定基金代码列表
            target_date: 目标日期

        Returns:
            Dict[str, Any]: 监控结果
        """
        if not self.is_running:
            raise RuntimeError("监控引擎未启动")

        start_time = datetime.now()
        total_funds = 0
        total_checks = 0
        rules_triggered = 0
        notifications_sent = 0
        errors = []

        self.logger.info(f"开始执行监控任务 - 规则: {rule_ids}, 基金: {fund_codes}, 日期: {target_date}")

        try:
            # 获取需要监控的净值数据
            nav_data_list = await self._get_nav_data_for_monitoring(
                fund_codes=fund_codes,
                target_date=target_date
            )

            total_funds = len(nav_data_list)

            if not nav_data_list:
                errors.append("没有找到需要监控的净值数据")
                return self._format_monitor_result(
                    success=False, total_funds=total_funds, total_checks=total_checks,
                    rules_triggered=rules_triggered, notifications_sent=notifications_sent,
                    errors=errors, duration=(datetime.now() - start_time).total_seconds()
                )

            # 并行处理基金监控
            semaphore = asyncio.Semaphore(10)  # 限制并发数
            tasks = [
                self._monitor_single_fund(semaphore, nav_data, rule_ids)
                for nav_data in nav_data_list
            ]

            results = await asyncio.gather(*tasks, return_exceptions=True)

            # 统计结果
            for result in results:
                if isinstance(result, Exception):
                    self.logger.error(f"基金监控失败: {result}")
                    errors.append(str(result))
                    continue

                if result:
                    total_checks += result.get('checks_count', 0)
                    rules_triggered += result.get('rules_triggered', 0)
                    notifications_sent += result.get('notifications_sent', 0)

            # 更新统计信息
            self.monitor_stats.update({
                "total_checks": self.monitor_stats["total_checks"] + total_checks,
                "successful_checks": self.monitor_stats["successful_checks"] + total_checks,
                "rules_triggered": self.monitor_stats["rules_triggered"] + rules_triggered,
                "notifications_sent": self.monitor_stats["notifications_sent"] + notifications_sent,
                "last_check_time": datetime.now().isoformat()
            })

            duration = (datetime.now() - start_time).total_seconds()
            monitor_result = self._format_monitor_result(
                success=True, total_funds=total_funds, total_checks=total_checks,
                rules_triggered=rules_triggered, notifications_sent=notifications_sent,
                errors=errors, duration=duration
            )

            self.logger.info(f"监控任务完成: {monitor_result}")
            return monitor_result

        except Exception as e:
            error_msg = f"监控任务执行失败: {e}"
            self.logger.error(error_msg)
            errors.append(error_msg)
            self.monitor_stats["failed_checks"] += 1

            duration = (datetime.now() - start_time).total_seconds()
            return self._format_monitor_result(
                success=False, total_funds=total_funds, total_checks=total_checks,
                rules_triggered=rules_triggered, notifications_sent=notifications_sent,
                errors=errors, duration=duration
            )

    async def _monitor_single_fund(self, semaphore: asyncio.Semaphore,
                                 nav_data: Dict[str, Any],
                                 rule_ids: Optional[List[int]]) -> Optional[Dict[str, Any]]:
        """监控单个基金"""
        async with semaphore:
            try:
                fund_code = nav_data.get('fund_code')
                if not fund_code:
                    return None

                # 评估监控规则
                triggered_rules = await self.rule_engine.evaluate_rules(
                    fund_code=fund_code,
                    nav_data=nav_data,
                    rule_ids=rule_ids
                )

                checks_count = 1  # 至少执行了一次检查
                rules_triggered = 0
                notifications_sent = 0

                # 处理触发的规则
                for rule_result in triggered_rules:
                    if rule_result.get('triggered', False):
                        rules_triggered += 1

                        # 保存监控结果
                        await self.rule_engine.save_monitor_result(
                            rule_id=rule_result['rule_id'],
                            fund_code=fund_code,
                            trigger_value=Decimal(str(rule_result['trigger_value'])),
                            threshold_value=Decimal(str(rule_result['threshold_value']))
                        )

                        # 发送通知
                        if rule_result.get('notification_channels'):
                            notification_success = await self._send_notifications(
                                fund_code, rule_result
                            )
                            if notification_success:
                                notifications_sent += 1

                return {
                    'fund_code': fund_code,
                    'checks_count': checks_count,
                    'rules_triggered': rules_triggered,
                    'notifications_sent': notifications_sent
                }

            except Exception as e:
                self.logger.error(f"监控基金失败: {e}")
                return None

    async def _get_nav_data_for_monitoring(self, fund_codes: Optional[List[str]] = None,
                                         target_date: Optional[date] = None) -> List[Dict[str, Any]]:
        """获取需要监控的净值数据"""
        try:
            from sqlalchemy import select

            # 确定目标日期
            if target_date:
                nav_date = target_date
            else:
                # 获取最新净值日期
                async with get_async_db().__aenter__() as session:
                    latest_date_query = select(NetAssetValue.nav_date).order_by(
                        NetAssetValue.nav_date.desc()
                    ).limit(1)
                    nav_date = await session.scalar(latest_date_query)

                if not nav_date:
                    self.logger.warning("没有找到净值数据")
                    return []

            # 获取净值数据
            async with get_async_db().__aenter__() as session:
                query = select(NetAssetValue).where(NetAssetValue.nav_date == nav_date)

                if fund_codes:
                    query = query.where(NetAssetValue.fund_code.in_(fund_codes))

                result = await session.execute(query)
                navs = result.scalars().all()

                # 转换为字典列表
                nav_data_list = []
                for nav in navs:
                    nav_dict = {
                        'fund_code': nav.fund_code,
                        'nav_date': nav.nav_date.isoformat(),
                        'unit_nav': nav.unit_nav,
                        'accumulated_nav': nav.accumulated_nav,
                        'daily_change_rate': nav.daily_change_rate,
                        'daily_change_amount': nav.daily_change_amount,
                    }
                    nav_data_list.append(nav_dict)

                self.logger.info(f"获取到 {len(nav_data_list)} 条净值数据用于监控")
                return nav_data_list

        except Exception as e:
            self.logger.error(f"获取监控净值数据失败: {e}")
            return []

    async def _send_notifications(self, fund_code: str, rule_result: Dict[str, Any]) -> bool:
        """发送通知"""
        try:
            # 这里应该调用通知服务
            # 为了演示，我们只记录日志
            notification_channels = rule_result.get('notification_channels', [])

            self.logger.info(
                f"发送通知 - 基金: {fund_code}, 规则: {rule_result['rule_name']}, "
                f"渠道: {notification_channels}"
            )

            # 实际实现中应该调用通知服务API
            # async with httpx.AsyncClient() as client:
            #     response = await client.post(
            #         "http://notification:8002/api/v1/notify",
            #         json={
            #             "fund_code": fund_code,
            #             "rule_result": rule_result
            #         }
            #     )
            #     return response.status_code == 200

            return True  # 模拟发送成功

        except Exception as e:
            self.logger.error(f"发送通知失败: {e}")
            return False

    def _format_monitor_result(self, success: bool, total_funds: int, total_checks: int,
                              rules_triggered: int, notifications_sent: int,
                              errors: List[str], duration: float) -> Dict[str, Any]:
        """格式化监控结果"""
        return {
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_funds": total_funds,
                "total_checks": total_checks,
                "rules_triggered": rules_triggered,
                "notifications_sent": notifications_sent,
                "success_rate": total_checks / total_funds if total_funds > 0 else 0,
                "trigger_rate": rules_triggered / total_checks if total_checks > 0 else 0,
                "notification_rate": notifications_sent / rules_triggered if rules_triggered > 0 else 0,
            },
            "errors": errors,
            "error_count": len(errors),
            "duration_seconds": duration
        }

    async def get_stats(self) -> Dict[str, Any]:
        """获取监控引擎统计信息"""
        try:
            # 获取数据库统计信息
            from sqlalchemy import select, func
            from shared.database.models import MonitorResult, MonitorRule

            async with get_async_db().__aenter__() as session:
                # 活跃规则数量
                active_rules_count = await session.scalar(
                    select(func.count(MonitorRule.id)).where(MonitorRule.is_active == True)
                )

                # 今日监控结果数量
                today = date.today()
                today_results_count = await session.scalar(
                    select(func.count(MonitorResult.id)).where(
                        MonitorResult.trigger_time >= today
                    )
                )

                # 本周监控结果数量
                week_ago = datetime.now() - timedelta(days=7)
                week_results_count = await session.scalar(
                    select(func.count(MonitorResult.id)).where(
                        MonitorResult.trigger_time >= week_ago
                    )
                )

            # 合并统计信息
            stats = {
                "engine_stats": self.monitor_stats,
                "database_stats": {
                    "active_rules_count": active_rules_count,
                    "today_results_count": today_results_count,
                    "week_results_count": week_results_count,
                },
                "runtime_info": {
                    "is_running": self.is_running,
                    "uptime_seconds": (
                        (datetime.now() - datetime.fromisoformat(self.monitor_stats["start_time"]))
                        .total_seconds()
                        if self.monitor_stats.get("start_time") else 0
                    )
                }
            }

            return stats

        except Exception as e:
            self.logger.error(f"获取监控统计失败: {e}")
            return {"error": str(e)}

    async def get_recent_alerts(self, page: int = 1, size: int = 20,
                              status: Optional[str] = None) -> Dict[str, Any]:
        """获取最近的监控告警"""
        try:
            from sqlalchemy import select
            from sqlalchemy.orm import selectinload
            from shared.database.models import MonitorResult, MonitorRule

            async with get_async_db().__aenter__() as session:
                # 构建查询
                query = select(MonitorResult).options(
                    selectinload(MonitorResult.rule)
                ).order_by(MonitorResult.trigger_time.desc())

                # 添加筛选条件
                if status == 'notified':
                    query = query.where(MonitorResult.notification_sent == True)
                elif status == 'pending':
                    query = query.where(MonitorResult.notification_sent == False)

                # 分页
                offset = (page - 1) * size
                query = query.offset(offset).limit(size)

                result = await session.execute(query)
                alerts = result.scalars().all()

                # 转换为字典列表
                alert_list = []
                for alert in alerts:
                    alert_dict = {
                        "id": alert.id,
                        "rule_id": alert.rule_id,
                        "rule_name": alert.rule.rule_name if alert.rule else "Unknown",
                        "rule_type": alert.rule.rule_type if alert.rule else "Unknown",
                        "fund_code": alert.fund_code,
                        "trigger_time": alert.trigger_time.isoformat(),
                        "trigger_value": float(alert.trigger_value),
                        "threshold_value": float(alert.threshold_value),
                        "notification_sent": alert.notification_sent,
                        "notification_sent_at": alert.notification_sent_at.isoformat() if alert.notification_sent_at else None,
                    }
                    alert_list.append(alert_dict)

                # 获取总数
                count_query = select(func.count(MonitorResult.id))
                if status == 'notified':
                    count_query = count_query.where(MonitorResult.notification_sent == True)
                elif status == 'pending':
                    count_query = count_query.where(MonitorResult.notification_sent == False)

                total_count = await session.scalar(count_query)

                return {
                    "data": alert_list,
                    "pagination": {
                        "page": page,
                        "size": size,
                        "total": total_count,
                        "pages": (total_count + size - 1) // size
                    }
                }

        except Exception as e:
            self.logger.error(f"获取告警列表失败: {e}")
            return {"data": [], "pagination": {"page": page, "size": size, "total": 0, "pages": 0}}