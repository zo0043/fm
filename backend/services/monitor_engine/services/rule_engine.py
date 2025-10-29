"""
监控规则引擎
"""

from typing import Dict, List, Optional, Any, Union
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
import asyncio
import json
import re

from shared.utils import get_logger, log_performance
from shared.database import get_async_db
from shared.database.models import MonitorRule, MonitorResult, NetAssetValue


class RuleType(str, Enum):
    """规则类型枚举"""
    PRICE_CHANGE = "price_change"  # 涨跌幅监控
    THRESHOLD = "threshold"        # 阈值监控
    TREND = "trend"               # 趋势监控
    VOLUME = "volume"             # 成交量监控
    ABNORMAL = "abnormal"         # 异常监控


class ConditionOperator(str, Enum):
    """条件操作符枚举"""
    GREATER_THAN = ">"
    LESS_THAN = "<"
    GREATER_EQUAL = ">="
    LESS_EQUAL = "<="
    EQUAL = "=="
    NOT_EQUAL = "!="
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"


class RuleEngine:
    """监控规则引擎"""

    def __init__(self):
        self.logger = get_logger(self.__class__.__name__)
        self.rule_cache = {}
        self.cache_ttl = 300  # 缓存5分钟

    @log_performance
    async def evaluate_rules(self, fund_code: str, nav_data: Dict[str, Any],
                           rule_ids: Optional[List[int]] = None) -> List[Dict[str, Any]]:
        """
        评估监控规则

        Args:
            fund_code: 基金代码
            nav_data: 净值数据
            rule_ids: 指定规则ID列表

        Returns:
            List[Dict[str, Any]]: 触发的规则结果
        """
        try:
            # 获取适用的规则
            applicable_rules = await self._get_applicable_rules(fund_code, rule_ids)

            if not applicable_rules:
                self.logger.debug(f"基金 {fund_code} 没有适用的监控规则")
                return []

            triggered_results = []

            # 并行评估规则
            tasks = [
                self._evaluate_single_rule(rule, fund_code, nav_data)
                for rule in applicable_rules
            ]

            results = await asyncio.gather(*tasks, return_exceptions=True)

            # 处理结果
            for result in results:
                if isinstance(result, Exception):
                    self.logger.error(f"规则评估失败: {result}")
                    continue

                if result and result.get('triggered', False):
                    triggered_results.append(result)

            self.logger.info(f"基金 {fund_code} 规则评估完成，触发 {len(triggered_results)} 个规则")
            return triggered_results

        except Exception as e:
            self.logger.error(f"规则评估失败 {fund_code}: {e}")
            return []

    async def _get_applicable_rules(self, fund_code: str, rule_ids: Optional[List[int]] = None) -> List[MonitorRule]:
        """获取适用的监控规则"""
        try:
            from sqlalchemy import select

            async with get_async_db().__aenter__() as session:
                # 构建查询
                query = select(MonitorRule).where(MonitorRule.is_active == True)

                if rule_ids:
                    query = query.where(MonitorRule.id.in_(rule_ids))
                else:
                    # 如果没有指定规则，获取该基金相关的规则或全局规则
                    query = query.where(
                        (MonitorRule.fund_code == fund_code) |
                        (MonitorRule.fund_code.is_(None))
                    )

                result = await session.execute(query)
                rules = result.scalars().all()

                return list(rules)

        except Exception as e:
            self.logger.error(f"获取适用规则失败 {fund_code}: {e}")
            return []

    @log_performance
    async def _evaluate_single_rule(self, rule: MonitorRule, fund_code: str,
                                   nav_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """评估单个规则"""
        try:
            # 解析规则条件
            rule_config = self._parse_rule_config(rule.rule_type, rule.condition_operator,
                                                rule.threshold_value)

            if not rule_config:
                self.logger.warning(f"规则配置解析失败: {rule.id}")
                return None

            # 根据规则类型执行评估
            if rule.rule_type == RuleType.PRICE_CHANGE:
                triggered, trigger_value = await self._evaluate_price_change_rule(
                    nav_data, rule_config
                )
            elif rule.rule_type == RuleType.THRESHOLD:
                triggered, trigger_value = await self._evaluate_threshold_rule(
                    nav_data, rule_config
                )
            elif rule.rule_type == RuleType.TREND:
                triggered, trigger_value = await self._evaluate_trend_rule(
                    fund_code, nav_data, rule_config
                )
            elif rule.rule_type == RuleType.ABNORMAL:
                triggered, trigger_value = await self._evaluate_abnormal_rule(
                    fund_code, nav_data, rule_config
                )
            else:
                self.logger.warning(f"不支持的规则类型: {rule.rule_type}")
                return None

            if triggered:
                return {
                    "rule_id": rule.id,
                    "rule_name": rule.rule_name,
                    "rule_type": rule.rule_type,
                    "fund_code": fund_code,
                    "trigger_time": datetime.now().isoformat(),
                    "trigger_value": float(trigger_value) if trigger_value else None,
                    "threshold_value": float(rule.threshold_value) if rule.threshold_value else None,
                    "notification_channels": rule.notification_channels,
                    "triggered": True
                }

            return {"triggered": False}

        except Exception as e:
            self.logger.error(f"评估单个规则失败 {rule.id}: {e}")
            return None

    def _parse_rule_config(self, rule_type: str, operator: str, threshold_value: Union[str, Decimal]) -> Optional[Dict[str, Any]]:
        """解析规则配置"""
        try:
            config = {
                "rule_type": rule_type,
                "operator": operator,
                "threshold_value": threshold_value
            }

            # 解析阈值配置（可能包含JSON格式的复杂配置）
            if isinstance(threshold_value, str) and threshold_value.startswith('{'):
                try:
                    json_config = json.loads(threshold_value)
                    config.update(json_config)
                except json.JSONDecodeError:
                    # 不是JSON格式，保持原值
                    pass

            return config

        except Exception as e:
            self.logger.error(f"解析规则配置失败: {e}")
            return None

    async def _evaluate_price_change_rule(self, nav_data: Dict[str, Any],
                                        rule_config: Dict[str, Any]) -> tuple[bool, Optional[Decimal]]:
        """评估涨跌幅规则"""
        try:
            daily_change_rate = nav_data.get('daily_change_rate')
            if daily_change_rate is None:
                return False, None

            operator = rule_config.get('operator')
            threshold = Decimal(str(rule_config.get('threshold_value', 0)))

            # 执行比较
            triggered = self._compare_values(Decimal(str(daily_change_rate)), operator, threshold)

            return triggered, Decimal(str(daily_change_rate))

        except Exception as e:
            self.logger.error(f"评估涨跌幅规则失败: {e}")
            return False, None

    async def _evaluate_threshold_rule(self, nav_data: Dict[str, Any],
                                     rule_config: Dict[str, Any]) -> tuple[bool, Optional[Decimal]]:
        """评估阈值规则"""
        try:
            field_name = rule_config.get('field', 'unit_nav')  # 默认监控单位净值
            operator = rule_config.get('operator')
            threshold = Decimal(str(rule_config.get('threshold_value', 0)))

            # 获取监控字段的值
            field_value = nav_data.get(field_name)
            if field_value is None:
                return False, None

            value = Decimal(str(field_value))

            # 执行比较
            triggered = self._compare_values(value, operator, threshold)

            return triggered, value

        except Exception as e:
            self.logger.error(f"评估阈值规则失败: {e}")
            return False, None

    async def _evaluate_trend_rule(self, fund_code: str, nav_data: Dict[str, Any],
                                 rule_config: Dict[str, Any]) -> tuple[bool, Optional[Decimal]]:
        """评估趋势规则"""
        try:
            # 获取历史数据进行趋势分析
            days = rule_config.get('days', 7)  # 默认7天
            trend_type = rule_config.get('trend_type', 'continuous_change')  # 连续涨跌
            operator = rule_config.get('operator')
            threshold = Decimal(str(rule_config.get('threshold_value', 0)))

            # 获取历史净值数据
            historical_data = await self._get_historical_nav_data(fund_code, days)
            if len(historical_data) < days:
                return False, None

            # 计算趋势指标
            if trend_type == 'continuous_change':
                # 连续涨跌天数
                continuous_days = self._calculate_continuous_change_days(historical_data)
                triggered = self._compare_values(Decimal(continuous_days), operator, threshold)
                trigger_value = Decimal(continuous_days)

            elif trend_type == 'total_change':
                # 总涨跌幅
                total_change = self._calculate_total_change(historical_data)
                triggered = self._compare_values(total_change, operator, threshold)
                trigger_value = total_change

            else:
                self.logger.warning(f"不支持的趋势类型: {trend_type}")
                return False, None

            return triggered, trigger_value

        except Exception as e:
            self.logger.error(f"评估趋势规则失败: {e}")
            return False, None

    async def _evaluate_abnormal_rule(self, fund_code: str, nav_data: Dict[str, Any],
                                    rule_config: Dict[str, Any]) -> tuple[bool, Optional[Decimal]]:
        """评估异常规则"""
        try:
            abnormal_type = rule_config.get('abnormal_type', 'price_jump')
            operator = rule_config.get('operator')
            threshold = Decimal(str(rule_config.get('threshold_value', 0)))

            if abnormal_type == 'price_jump':
                # 价格异常跳动
                daily_change_rate = nav_data.get('daily_change_rate')
                if daily_change_rate is None:
                    return False, None

                # 检查是否超过阈值
                triggered = self._compare_values(
                    abs(Decimal(str(daily_change_rate))),
                    operator,
                    threshold
                )
                trigger_value = Decimal(str(daily_change_rate))

            elif abnormal_type == 'data_gap':
                # 数据缺失异常
                current_date = nav_data.get('nav_date')
                if not current_date:
                    return False, None

                # 检查数据连续性
                gap_days = await self._check_data_gap(fund_code, current_date)
                triggered = self._compare_values(Decimal(gap_days), operator, threshold)
                trigger_value = Decimal(gap_days)

            else:
                self.logger.warning(f"不支持的异常类型: {abnormal_type}")
                return False, None

            return triggered, trigger_value

        except Exception as e:
            self.logger.error(f"评估异常规则失败: {e}")
            return False, None

    def _compare_values(self, value: Decimal, operator: str, threshold: Decimal) -> bool:
        """比较两个值"""
        try:
            if operator == ConditionOperator.GREATER_THAN:
                return value > threshold
            elif operator == ConditionOperator.LESS_THAN:
                return value < threshold
            elif operator == ConditionOperator.GREATER_EQUAL:
                return value >= threshold
            elif operator == ConditionOperator.LESS_EQUAL:
                return value <= threshold
            elif operator == ConditionOperator.EQUAL:
                return value == threshold
            elif operator == ConditionOperator.NOT_EQUAL:
                return value != threshold
            else:
                self.logger.warning(f"不支持的操作符: {operator}")
                return False

        except Exception as e:
            self.logger.error(f"值比较失败: {e}")
            return False

    async def _get_historical_nav_data(self, fund_code: str, days: int) -> List[Dict[str, Any]]:
        """获取历史净值数据"""
        try:
            from sqlalchemy import select
            from datetime import date, timedelta

            async with get_async_db().__aenter__() as session:
                end_date = date.today()
                start_date = end_date - timedelta(days=days * 2)  # 获取更多数据以确保有足够的交易日

                query = select(NetAssetValue).where(
                    NetAssetValue.fund_code == fund_code,
                    NetAssetValue.nav_date >= start_date,
                    NetAssetValue.nav_date <= end_date
                ).order_by(NetAssetValue.nav_date.desc())

                result = await session.execute(query)
                navs = result.scalars().all()

                # 转换为字典列表
                historical_data = []
                for nav in navs[:days]:  # 只取最近N天
                    historical_data.append({
                        'nav_date': nav.nav_date,
                        'unit_nav': nav.unit_nav,
                        'daily_change_rate': nav.daily_change_rate,
                    })

                return historical_data

        except Exception as e:
            self.logger.error(f"获取历史净值数据失败 {fund_code}: {e}")
            return []

    def _calculate_continuous_change_days(self, historical_data: List[Dict[str, Any]]) -> int:
        """计算连续涨跌天数"""
        if not historical_data:
            return 0

        # 确定第一个变化方向
        first_change = historical_data[0].get('daily_change_rate', 0)
        if first_change == 0:
            return 0

        direction = 'up' if first_change > 0 else 'down'
        continuous_days = 1

        # 检查后续天数
        for data in historical_data[1:]:
            change_rate = data.get('daily_change_rate', 0)
            if direction == 'up' and change_rate > 0:
                continuous_days += 1
            elif direction == 'down' and change_rate < 0:
                continuous_days += 1
            else:
                break

        return continuous_days

    def _calculate_total_change(self, historical_data: List[Dict[str, Any]]) -> Decimal:
        """计算总涨跌幅"""
        if len(historical_data) < 2:
            return Decimal('0')

        first_nav = historical_data[-1]['unit_nav']  # 最早的净值
        latest_nav = historical_data[0]['unit_nav']  # 最新的净值

        total_change = (latest_nav - first_nav) / first_nav
        return total_change

    async def _check_data_gap(self, fund_code: str, current_date: date) -> int:
        """检查数据缺失天数"""
        try:
            from sqlalchemy import select
            from datetime import timedelta

            async with get_async_db().__aenter__() as session:
                # 获取上一个交易日的净值数据
                previous_date = current_date - timedelta(days=7)  # 往前查找一周
                query = select(NetAssetValue).where(
                    NetAssetValue.fund_code == fund_code,
                    NetAssetValue.nav_date < current_date,
                    NetAssetValue.nav_date >= previous_date
                ).order_by(NetAssetValue.nav_date.desc())

                result = await session.execute(query)
                latest_nav = result.scalar_one_or_none()

                if not latest_nav:
                    return 7  # 没有找到历史数据，假设缺失7天

                # 计算日期差
                gap_days = (current_date - latest_nav.nav_date).days
                return max(0, gap_days - 1)  # 减去1天（因为交易日通常不是连续的）

        except Exception as e:
            self.logger.error(f"检查数据缺失失败 {fund_code}: {e}")
            return 0

    async def save_monitor_result(self, rule_id: int, fund_code: str,
                                trigger_value: Decimal, threshold_value: Decimal) -> bool:
        """保存监控结果"""
        try:
            from shared.database.models import MonitorResult

            async with get_async_db().__aenter__() as session:
                monitor_result = MonitorResult(
                    rule_id=rule_id,
                    fund_code=fund_code,
                    trigger_time=datetime.now(),
                    trigger_value=trigger_value,
                    threshold_value=threshold_value,
                    notification_sent=False
                )

                session.add(monitor_result)
                await session.commit()

                self.logger.info(f"监控结果已保存: 规则{rule_id}, 基金{fund_code}")
                return True

        except Exception as e:
            self.logger.error(f"保存监控结果失败: {e}")
            return False

    async def get_rule_statistics(self, rule_id: int, days: int = 30) -> Dict[str, Any]:
        """获取规则统计信息"""
        try:
            from sqlalchemy import select, func
            from datetime import datetime, timedelta

            async with get_async_db().__aenter__() as session:
                start_date = datetime.now() - timedelta(days=days)

                # 触发次数统计
                trigger_count_query = select(func.count(MonitorResult.id)).where(
                    MonitorResult.rule_id == rule_id,
                    MonitorResult.trigger_time >= start_date
                )
                trigger_count = await session.scalar(trigger_count_query)

                # 通知发送统计
                notified_count_query = select(func.count(MonitorResult.id)).where(
                    MonitorResult.rule_id == rule_id,
                    MonitorResult.trigger_time >= start_date,
                    MonitorResult.notification_sent == True
                )
                notified_count = await session.scalar(notified_count_query)

                # 最近触发时间
                latest_trigger_query = select(MonitorResult.trigger_time).where(
                    MonitorResult.rule_id == rule_id
                ).order_by(MonitorResult.trigger_time.desc()).limit(1)

                latest_trigger = await session.scalar(latest_trigger_query)

                return {
                    "rule_id": rule_id,
                    "days": days,
                    "trigger_count": trigger_count,
                    "notified_count": notified_count,
                    "notification_success_rate": notified_count / trigger_count if trigger_count > 0 else 0,
                    "latest_trigger": latest_trigger.isoformat() if latest_trigger else None
                }

        except Exception as e:
            self.logger.error(f"获取规则统计失败 {rule_id}: {e}")
            return {}