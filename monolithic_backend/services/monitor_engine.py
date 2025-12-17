"""
监控引擎模块
负责执行监控规则的检查和告警
"""

import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta
from typing import List, Dict, Any

from database import MonitorRule, MonitorRuleItem, NavRecord, Fund, NotificationSettings, NotificationLog
from services.notification_service import NotificationService

logger = logging.getLogger(__name__)

class MonitorEngine:
    """监控引擎类"""
    
    def __init__(self):
        self.notification_service = NotificationService()
    
    async def check_all_rules(self, user_id: int, db: AsyncSession):
        """检查用户的所有监控规则"""
        try:
            # 获取用户的所有活跃监控规则
            rules_query = select(MonitorRule).where(
                and_(
                    MonitorRule.user_id == user_id,
                    MonitorRule.is_active == True
                )
            )
            
            result = await db.execute(rules_query)
            rules = result.scalars().all()
            
            logger.info(f"找到 {len(rules)} 个活跃监控规则")
            
            for rule in rules:
                await self._check_single_rule(rule, db)
                
        except Exception as e:
            logger.error(f"检查监控规则失败: {str(e)}")
            raise
    
    async def _check_single_rule(self, rule: MonitorRule, db: AsyncSession):
        """检查单个监控规则"""
        try:
            # 获取规则监控的所有基金
            items_query = select(MonitorRuleItem).where(
                MonitorRuleItem.monitor_rule_id == rule.id
            )
            
            result = await db.execute(items_query)
            items = result.scalars().all()
            
            for item in items:
                await self._check_fund_rule(item, rule, db)
                
        except Exception as e:
            logger.error(f"检查监控规则 {rule.id} 失败: {str(e)}")
    
    async def _check_fund_rule(self, item: MonitorRuleItem, rule: MonitorRule, db: AsyncSession):
        """检查单个基金的监控规则"""
        try:
            # 获取基金的最新净值记录
            nav_query = select(NavRecord).where(
                NavRecord.fund_id == item.fund_id
            ).order_by(NavRecord.nav_date.desc()).limit(1)
            
            result = await db.execute(nav_query)
            latest_nav = result.scalar_one_or_none()
            
            if not latest_nav:
                logger.warning(f"基金 {item.fund_id} 没有净值记录")
                return
            
            # 获取前一天净值计算涨跌幅
            yesterday_nav_query = select(NavRecord).where(
                and_(
                    NavRecord.fund_id == item.fund_id,
                    NavRecord.nav_date < latest_nav.nav_date
                )
            ).order_by(NavRecord.nav_date.desc()).limit(1)
            
            result = await db.execute(yesterday_nav_query)
            yesterday_nav = result.scalar_one_or_none()
            
            if not yesterday_nav:
                logger.warning(f"基金 {item.fund_id} 没有前一天净值记录")
                return
            
            # 计算涨跌幅
            change_rate = (latest_nav.nav - yesterday_nav.nav) / yesterday_nav.nav
            
            # 检查是否触发监控条件
            if self._should_trigger_alert(change_rate, rule.alert_threshold):
                await self._send_alert_notification(item, rule, latest_nav, change_rate, db)
                
        except Exception as e:
            logger.error(f"检查基金 {item.fund_id} 监控规则失败: {str(e)}")
    
    def _should_trigger_alert(self, change_rate: float, threshold: float) -> bool:
        """判断是否应该触发告警"""
        # 当涨跌幅超过阈值时触发告警
        return abs(change_rate) > threshold
    
    async def _send_alert_notification(self, item: MonitorRuleItem, rule: MonitorRule, 
                                     nav_record: NavRecord, change_rate: float, db: AsyncSession):
        """发送告警通知"""
        try:
            # 获取基金信息
            fund_query = select(Fund).where(Fund.id == item.fund_id)
            result = await db.execute(fund_query)
            fund = result.scalar_one_or_none()
            
            if not fund:
                logger.error(f"基金 {item.fund_id} 不存在")
                return
            
            # 准备通知内容
            change_direction = "上涨" if change_rate > 0 else "下跌"
            change_percentage = f"{abs(change_rate)*100:.2f}%"
            
            title = f"基金监控告警 - {fund.name}"
            content = (
                f"基金代码: {fund.code}\n"
                f"基金名称: {fund.name}\n"
                f"当前净值: {nav_record.nav:.4f}\n"
                f"涨跌幅: {change_direction} {change_percentage}\n"
                f"监控规则: {rule.name}\n"
                f"告警时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            )
            
            # 发送通知
            await self.notification_service.send_notification(
                user_id=rule.user_id,
                title=title,
                content=content,
                db=db
            )
            
            logger.info(f"发送监控告警通知成功: {fund.code} {change_direction} {change_percentage}")
            
        except Exception as e:
            logger.error(f"发送监控告警通知失败: {str(e)}")

# 全局监控引擎实例
monitor_engine = MonitorEngine()