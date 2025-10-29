"""
基金信息收集服务
"""

import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime

from shared.utils import get_logger, log_performance, retry_on_failure
from shared.database import get_async_db
from .base_collector import BaseCollector


class FundCollector(BaseCollector):
    """基金信息收集器"""

    def __init__(self):
        super().__init__()
        self.data_sources = [
            TTFundDataSource(),
            AkshareDataSource(),
        ]

    @log_performance
    async def collect_funds(self, force_update: bool = False,
                           fund_codes: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        收集基金信息

        Args:
            force_update: 是否强制更新
            fund_codes: 指定基金代码列表

        Returns:
            Dict[str, Any]: 收集结果
        """
        start_time = datetime.now()
        total_count = 0
        success_count = 0
        errors = []

        self.logger.info(f"开始收集基金信息 - 强制更新: {force_update}, 指定基金: {fund_codes}")

        async with self:
            try:
                # 获取已存在的基金
                existing_funds = await self.get_existing_funds(fund_codes)
                self.logger.info(f"已存在基金数量: {len(existing_funds)}")

                # 按数据源收集
                for source in self.data_sources:
                    try:
                        self.logger.info(f"使用数据源: {source.__class__.__name__}")

                        # 获取基金列表
                        if fund_codes:
                            funds_data = await source.get_funds_by_codes(fund_codes)
                        else:
                            funds_data = await source.get_all_funds()

                        self.logger.info(f"从 {source.__class__.__name__} 获取到 {len(funds_data)} 个基金")

                        # 过滤和处理基金数据
                        processed_funds = []
                        for fund_data in funds_data:
                            fund_code = fund_data.get('fund_code')
                            if not fund_code:
                                continue

                            # 检查是否需要更新
                            if not force_update and fund_code in existing_funds:
                                existing_fund = existing_funds[fund_code]
                                if not self._should_update_fund(existing_fund, fund_data):
                                    continue

                            processed_funds.append(fund_data)

                        # 批量保存
                        if processed_funds:
                            save_results = await self.batch_save_funds(processed_funds)
                            batch_success = sum(1 for success in save_results.values() if success)
                            batch_failure = len(save_results) - batch_success

                            success_count += batch_success
                            total_count += len(processed_funds)

                            if batch_failure > 0:
                                failed_codes = [code for code, success in save_results.items() if not success]
                                errors.append(f"{source.__class__.__name__} 保存失败: {failed_codes}")

                        # 请求间隔
                        await self.sleep_between_requests()

                    except Exception as e:
                        error_msg = f"数据源 {source.__class__.__name__} 处理失败: {e}"
                        self.logger.error(error_msg)
                        errors.append(error_msg)

                duration = (datetime.now() - start_time).total_seconds()
                result = self.format_result(success_count, total_count, errors, duration)

                self.logger.info(f"基金信息收集完成: {result}")
                return result

            except Exception as e:
                error_msg = f"基金信息收集过程失败: {e}"
                self.logger.error(error_msg)
                errors.append(error_msg)

                duration = (datetime.now() - start_time).total_seconds()
                return self.format_result(success_count, total_count, errors, duration)

    def _should_update_fund(self, existing_fund, new_data: Dict[str, Any]) -> bool:
        """
        判断是否需要更新基金信息

        Args:
            existing_fund: 已存在的基金对象
            new_data: 新的基金数据

        Returns:
            bool: 是否需要更新
        """
        # 检查关键字段是否有变化
        key_fields = ['fund_name', 'fund_company', 'fund_manager', 'fund_size']

        for field in key_fields:
            existing_value = getattr(existing_fund, field, None)
            new_value = new_data.get(field)

            if existing_value != new_value and new_value is not None:
                return True

        return False


class TTFundDataSource(BaseCollector):
    """天天基金数据源"""

    def __init__(self):
        super().__init__()
        self.base_url = "https://fund.eastmoney.com"
        self.api_url = "https://fund.eastmoney.com/js/fundcode_search.js"

    @retry_on_failure(max_retries=3, delay=2.0)
    async def get_all_funds(self) -> List[Dict[str, Any]]:
        """获取所有基金信息"""
        try:
            # 天天基金API返回JavaScript文件，需要解析
            response = await self.fetch_data(self.api_url)
            if not response:
                return []

            # 解析JavaScript数据
            import re
            content = response.get('text', '')

            # 提取数据数组
            match = re.search(r'var r = (\[.*?\]);', content)
            if not match:
                self.logger.error("无法解析天天基金数据格式")
                return []

            import json
            try:
                fund_data = json.loads(match.group(1))
            except json.JSONDecodeError:
                self.logger.error("天天基金数据JSON解析失败")
                return []

            # 转换为标准格式
            processed_funds = []
            for item in fund_data:
                if len(item) < 7:
                    continue

                try:
                    fund_info = {
                        'fund_code': item[0].strip(),
                        'fund_name': item[2].strip(),
                        'fund_type': self._normalize_fund_type(item[3]),
                        'fund_company': item[4].strip(),
                        'establish_date': self._parse_date(item[5]),
                    }

                    # 验证必要字段
                    if fund_info['fund_code'] and fund_info['fund_name']:
                        processed_funds.append(fund_info)

                except Exception as e:
                    self.logger.warning(f"处理基金数据失败: {item}, 错误: {e}")
                    continue

            self.logger.info(f"天天基金数据源获取到 {len(processed_funds)} 个基金")
            return processed_funds

        except Exception as e:
            self.logger.error(f"获取天天基金数据失败: {e}")
            return []

    @retry_on_failure(max_retries=3, delay=2.0)
    async def get_funds_by_codes(self, fund_codes: List[str]) -> List[Dict[str, Any]]:
        """根据基金代码获取基金信息"""
        all_funds = await self.get_all_funds()

        # 过滤指定基金代码
        filtered_funds = [
            fund for fund in all_funds
            if fund.get('fund_code') in fund_codes
        ]

        return filtered_funds

    def _normalize_fund_type(self, fund_type: str) -> str:
        """标准化基金类型"""
        type_mapping = {
            '股票': '股票型',
            '债券': '债券型',
            '混合': '混合型',
            '指数': '指数型',
            'QDII': 'QDII',
            'FOF': 'FOF',
            '货币': '货币型',
            '理财': '理财基金',
        }

        for key, value in type_mapping.items():
            if key in fund_type:
                return value

        return fund_type

    def _parse_date(self, date_str: str) -> Optional[str]:
        """解析日期"""
        if not date_str or date_str == '-':
            return None

        try:
            # 格式: 2023-01-01
            if len(date_str) == 10 and date_str[4] == '-' and date_str[7] == '-':
                return date_str

            # 其他格式转换
            from shared.utils.data_validation import DateValidator
            if DateValidator.is_valid_date(date_str):
                return date_str

            return None
        except Exception:
            return None


class AkshareDataSource(BaseCollector):
    """AkShare数据源"""

    def __init__(self):
        super().__init__()

    @retry_on_failure(max_retries=3, delay=2.0)
    async def get_all_funds(self) -> List[Dict[str, Any]]:
        """获取所有基金信息"""
        try:
            # 这里使用AkShare获取基金数据
            # 由于AkShare主要是同步库，我们需要在线程中运行
            import concurrent.futures
            import akshare as ak

            def fetch_fund_data():
                try:
                    # 获取基金基本信息
                    df = ak.fund_em_fund_name()
                    if df is None or df.empty:
                        return []

                    # 转换DataFrame为字典列表
                    funds_data = []
                    for _, row in df.iterrows():
                        try:
                            fund_info = {
                                'fund_code': str(row.get('基金代码', '')).strip(),
                                'fund_name': str(row.get('基金简称', '')).strip(),
                                'fund_type': str(row.get('基金类型', '')).strip(),
                                'fund_company': str(row.get('基金管理人', '')).strip(),
                                'establish_date': self._parse_date(str(row.get('成立日期', ''))),
                            }

                            if fund_info['fund_code'] and fund_info['fund_name']:
                                funds_data.append(fund_info)

                        except Exception as e:
                            continue

                    return funds_data

                except Exception as e:
                    self.logger.error(f"AkShare数据获取失败: {e}")
                    return []

            # 在线程池中执行同步代码
            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as executor:
                funds_data = await loop.run_in_executor(executor, fetch_fund_data)

            self.logger.info(f"AkShare数据源获取到 {len(funds_data)} 个基金")
            return funds_data

        except Exception as e:
            self.logger.error(f"获取AkShare数据失败: {e}")
            return []

    @retry_on_failure(max_retries=3, delay=2.0)
    async def get_funds_by_codes(self, fund_codes: List[str]) -> List[Dict[str, Any]]:
        """根据基金代码获取基金信息"""
        all_funds = await self.get_all_funds()

        # 过滤指定基金代码
        filtered_funds = [
            fund for fund in all_funds
            if fund.get('fund_code') in fund_codes
        ]

        return filtered_funds

    def _parse_date(self, date_str: str) -> Optional[str]:
        """解析日期"""
        if not date_str or date_str == '-' or date_str == 'nan':
            return None

        try:
            # 尝试多种日期格式
            from shared.utils.data_validation import DateValidator
            if DateValidator.is_valid_date(date_str):
                return date_str

            return None
        except Exception:
            return None