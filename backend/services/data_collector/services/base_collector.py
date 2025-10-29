"""
数据收集器基类
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, date
import asyncio
import logging

from shared.utils import get_logger, log_performance, retry_on_failure
from shared.database import get_async_db
from shared.database.models import Fund


class BaseCollector(ABC):
    """数据收集器基类"""

    def __init__(self):
        self.logger = get_logger(self.__class__.__name__)
        self.session = None

    async def __aenter__(self):
        """异步上下文管理器入口"""
        self.session = get_async_db().__anext__()
        await self.session.__aenter__()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        if self.session:
            await self.session.__aexit__(exc_type, exc_val, exc_tb)

    @abstractmethod
    async def collect_data(self, **kwargs) -> Dict[str, Any]:
        """
        收集数据的抽象方法

        Returns:
            Dict[str, Any]: 收集结果
        """
        pass

    @retry_on_failure(max_retries=3, delay=2.0)
    async def fetch_data(self, url: str, params: Optional[Dict] = None,
                        headers: Optional[Dict] = None) -> Optional[Dict[str, Any]]:
        """
        获取远程数据

        Args:
            url: 请求URL
            params: 请求参数
            headers: 请求头

        Returns:
            Optional[Dict[str, Any]]: 响应数据
        """
        try:
            from shared.utils import async_http_client

            response = await async_http_client.get(
                path=url,
                params=params,
                headers=headers
            )

            if response.is_success():
                return response.json()
            else:
                self.logger.error(f"请求失败: {url}, 状态码: {response.status_code}")
                return None

        except Exception as e:
            self.logger.error(f"获取数据失败: {url}, 错误: {e}")
            return None

    async def save_fund_to_db(self, fund_data: Dict[str, Any]) -> bool:
        """
        保存基金数据到数据库

        Args:
            fund_data: 基金数据

        Returns:
            bool: 是否保存成功
        """
        try:
            from shared.utils.data_validation import DataCleaner

            # 数据清洗和验证
            cleaned_data = DataCleaner.clean_fund_data(fund_data)
            if not cleaned_data:
                self.logger.warning(f"基金数据验证失败: {fund_data}")
                return False

            # 检查基金是否已存在
            existing_fund = await self.session.get(Fund, cleaned_data.fund_code)
            if existing_fund:
                # 更新现有基金
                for field, value in cleaned_data.dict(exclude_unset=True).items():
                    if hasattr(existing_fund, field):
                        setattr(existing_fund, field, value)

                await self.session.commit()
                self.logger.info(f"基金信息已更新: {cleaned_data.fund_code}")
            else:
                # 创建新基金
                new_fund = Fund(**cleaned_data.dict())
                self.session.add(new_fund)
                await self.session.commit()
                self.logger.info(f"新基金已创建: {cleaned_data.fund_code}")

            return True

        except Exception as e:
            await self.session.rollback()
            self.logger.error(f"保存基金数据失败: {e}")
            return False

    async def get_existing_funds(self, fund_codes: Optional[List[str]] = None) -> Dict[str, Fund]:
        """
        获取已存在的基金信息

        Args:
            fund_codes: 基金代码列表

        Returns:
            Dict[str, Fund]: 基金代码到基金对象的映射
        """
        try:
            from sqlalchemy import select

            query = select(Fund)
            if fund_codes:
                query = query.where(Fund.fund_code.in_(fund_codes))

            result = await self.session.execute(query)
            funds = result.scalars().all()

            return {fund.fund_code: fund for fund in funds}

        except Exception as e:
            self.logger.error(f"获取已存在基金失败: {e}")
            return {}

    async def batch_save_funds(self, funds_data: List[Dict[str, Any]]) -> Dict[str, bool]:
        """
        批量保存基金数据

        Args:
            funds_data: 基金数据列表

        Returns:
            Dict[str, bool]: 保存结果映射
        """
        results = {}

        # 获取已存在的基金
        fund_codes = [data.get('fund_code') for data in funds_data if data.get('fund_code')]
        existing_funds = await self.get_existing_funds(fund_codes)

        for fund_data in funds_data:
            fund_code = fund_data.get('fund_code')
            if not fund_code:
                results[fund_code] = False
                continue

            try:
                success = await self.save_fund_to_db(fund_data)
                results[fund_code] = success
            except Exception as e:
                self.logger.error(f"保存基金失败 {fund_code}: {e}")
                results[fund_code] = False

        return results

    def format_result(self, success_count: int, total_count: int,
                     errors: List[str], duration: float) -> Dict[str, Any]:
        """
        格式化收集结果

        Args:
            success_count: 成功数量
            total_count: 总数量
            errors: 错误列表
            duration: 耗时

        Returns:
            Dict[str, Any]: 格式化结果
        """
        return {
            "success": success_count > 0,
            "total_count": total_count,
            "success_count": success_count,
            "failure_count": total_count - success_count,
            "success_rate": success_count / total_count if total_count > 0 else 0,
            "errors": errors[:10],  # 只保留前10个错误
            "error_count": len(errors),
            "duration_seconds": duration,
            "timestamp": datetime.now().isoformat()
        }

    async def get_trading_date(self, target_date: Optional[str] = None) -> date:
        """
        获取交易日

        Args:
            target_date: 目标日期字符串

        Returns:
            date: 交易日
        """
        if target_date:
            from shared.utils.data_validation import DateValidator
            parsed_date = DateValidator.normalize_date(target_date)
            if parsed_date:
                return parsed_date

        # 获取最新交易日
        today = date.today()

        # 如果是周末，返回上一个周五
        if today.weekday() == 5:  # Saturday
            return today.replace(day=today.day - 1)
        elif today.weekday() == 6:  # Sunday
            return today.replace(day=today.day - 2)

        return today

    async def sleep_between_requests(self, delay: float = 1.0):
        """请求间隔"""
        await asyncio.sleep(delay)