"""
净值数据收集服务
"""

import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, date, timedelta
from decimal import Decimal

from shared.utils import get_logger, log_performance, retry_on_failure
from shared.database import get_async_db, NetAssetValue
from shared.database.models import Fund
from .base_collector import BaseCollector


class NavCollector(BaseCollector):
    """净值数据收集器"""

    def __init__(self):
        super().__init__()
        self.data_sources = [
            TTFundNavDataSource(),
            SinaFinanceNavDataSource(),
        ]

    @log_performance
    async def collect_nav_data(self, date: Optional[str] = None,
                              fund_codes: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        收集净值数据

        Args:
            date: 指定日期 (YYYY-MM-DD)
            fund_codes: 指定基金代码列表

        Returns:
            Dict[str, Any]: 收集结果
        """
        start_time = datetime.now()
        total_count = 0
        success_count = 0
        errors = []

        # 获取目标日期
        target_date = await self.get_trading_date(date)
        self.logger.info(f"开始收集净值数据 - 日期: {target_date}, 指定基金: {fund_codes}")

        async with self:
            try:
                # 获取需要收集的基金
                if fund_codes:
                    # 指定基金代码
                    funds_to_collect = await self.get_funds_by_codes(fund_codes)
                else:
                    # 获取所有活跃基金
                    funds_to_collect = await self.get_all_active_funds()

                if not funds_to_collect:
                    errors.append("没有找到需要收集的基金")
                    duration = (datetime.now() - start_time).total_seconds()
                    return self.format_result(success_count, total_count, errors, duration)

                self.logger.info(f"需要收集净值的基金数量: {len(funds_to_collect)}")

                # 检查是否已有数据
                existing_navs = await self.get_existing_navs(target_date, list(funds_to_collect.keys()))
                self.logger.info(f"已存在净值数据: {len(existing_navs)}")

                # 过滤需要收集的基金
                funds_to_collect = {
                    code: fund for code, fund in funds_to_collect.items()
                    if code not in existing_navs
                }

                if not funds_to_collect:
                    self.logger.info("所有基金的净值数据已存在")
                    duration = (datetime.now() - start_time).total_seconds()
                    return self.format_result(0, 0, [], duration)

                # 按数据源收集净值数据
                for source in self.data_sources:
                    try:
                        self.logger.info(f"使用数据源: {source.__class__.__name__}")

                        # 分批处理，避免请求过于频繁
                        batch_size = 100
                        fund_codes_list = list(funds_to_collect.keys())

                        for i in range(0, len(fund_codes_list), batch_size):
                            batch_codes = fund_codes_list[i:i + batch_size]
                            self.logger.info(f"处理第 {i//batch_size + 1} 批基金，数量: {len(batch_codes)}")

                            # 获取净值数据
                            navs_data = await source.get_nav_data(target_date, batch_codes)

                            # 保存净值数据
                            if navs_data:
                                save_results = await self.batch_save_navs(navs_data)
                                batch_success = sum(1 for success in save_results.values() if success)
                                batch_failure = len(save_results) - batch_success

                                success_count += batch_success
                                total_count += len(navs_data)

                                if batch_failure > 0:
                                    failed_codes = [code for code, success in save_results.items() if not success]
                                    errors.append(f"{source.__class__.__name__} 第{i//batch_size + 1}批保存失败: {failed_codes}")

                            # 请求间隔
                            await self.sleep_between_requests(0.5)

                    except Exception as e:
                        error_msg = f"数据源 {source.__class__.__name__} 处理失败: {e}"
                        self.logger.error(error_msg)
                        errors.append(error_msg)

                duration = (datetime.now() - start_time).total_seconds()
                result = self.format_result(success_count, total_count, errors, duration)

                self.logger.info(f"净值数据收集完成: {result}")
                return result

            except Exception as e:
                error_msg = f"净值数据收集过程失败: {e}"
                self.logger.error(error_msg)
                errors.append(error_msg)

                duration = (datetime.now() - start_time).total_seconds()
                return self.format_result(success_count, total_count, errors, duration)

    async def get_all_active_funds(self) -> Dict[str, Fund]:
        """获取所有活跃基金"""
        try:
            from sqlalchemy import select

            query = select(Fund).where(Fund.status == 'active')
            result = await self.session.execute(query)
            funds = result.scalars().all()

            return {fund.fund_code: fund for fund in funds}

        except Exception as e:
            self.logger.error(f"获取活跃基金失败: {e}")
            return {}

    async def get_funds_by_codes(self, fund_codes: List[str]) -> Dict[str, Fund]:
        """根据基金代码获取基金"""
        try:
            from sqlalchemy import select

            query = select(Fund).where(Fund.fund_code.in_(fund_codes))
            result = await self.session.execute(query)
            funds = result.scalars().all()

            return {fund.fund_code: fund for fund in funds}

        except Exception as e:
            self.logger.error(f"获取指定基金失败: {e}")
            return {}

    async def get_existing_navs(self, nav_date: date, fund_codes: List[str]) -> Dict[str, NetAssetValue]:
        """获取已存在的净值数据"""
        try:
            from sqlalchemy import select

            query = select(NetAssetValue).where(
                NetAssetValue.nav_date == nav_date,
                NetAssetValue.fund_code.in_(fund_codes)
            )
            result = await self.session.execute(query)
            navs = result.scalars().all()

            return {nav.fund_code: nav for nav in navs}

        except Exception as e:
            self.logger.error(f"获取已存在净值数据失败: {e}")
            return {}

    async def save_nav_to_db(self, nav_data: Dict[str, Any]) -> bool:
        """保存净值数据到数据库"""
        try:
            from shared.utils.data_validation import DataCleaner

            # 数据清洗和验证
            cleaned_data = DataCleaner.clean_nav_data(nav_data)
            if not cleaned_data:
                self.logger.warning(f"净值数据验证失败: {nav_data}")
                return False

            # 创建净值记录
            new_nav = NetAssetValue(**cleaned_data.dict())
            self.session.add(new_nav)
            await self.session.commit()

            self.logger.info(f"净值数据已保存: {cleaned_data.fund_code} - {cleaned_data.nav_date}")
            return True

        except Exception as e:
            await self.session.rollback()
            self.logger.error(f"保存净值数据失败: {e}")
            return False

    async def batch_save_navs(self, navs_data: List[Dict[str, Any]]) -> Dict[str, bool]:
        """批量保存净值数据"""
        results = {}

        for nav_data in navs_data:
            fund_code = nav_data.get('fund_code')
            if not fund_code:
                results[fund_code] = False
                continue

            try:
                success = await self.save_nav_to_db(nav_data)
                results[fund_code] = success
            except Exception as e:
                self.logger.error(f"保存净值失败 {fund_code}: {e}")
                results[fund_code] = False

        return results


class TTFundNavDataSource(BaseCollector):
    """天天基金净值数据源"""

    @retry_on_failure(max_retries=3, delay=2.0)
    async def get_nav_data(self, nav_date: date, fund_codes: List[str]) -> List[Dict[str, Any]]:
        """获取净值数据"""
        try:
            navs_data = []

            # 天天基金API批量查询
            for i in range(0, len(fund_codes), 50):  # 每批50个基金
                batch_codes = fund_codes[i:i + 50]
                batch_navs = await self._get_batch_nav_data(nav_date, batch_codes)
                navs_data.extend(batch_navs)

                # 请求间隔
                await self.sleep_between_requests(0.2)

            self.logger.info(f"天天基金获取到 {len(navs_data)} 条净值数据")
            return navs_data

        except Exception as e:
            self.logger.error(f"获取天天基金净值数据失败: {e}")
            return []

    async def _get_batch_nav_data(self, nav_date: date, fund_codes: List[str]) -> List[Dict[str, Any]]:
        """获取批量净值数据"""
        try:
            # 构建请求URL
            codes_str = ','.join(fund_codes)
            date_str = nav_date.strftime('%Y-%m-%d')
            url = f"https://fund.eastmoney.com/js/fundgrouplist.js"

            params = {
                'rt': int(datetime.now().timestamp()),
                'date': date_str,
                'code': codes_str
            }

            response = await self.fetch_data(url, params=params)
            if not response:
                return []

            # 解析响应数据
            import re
            content = response.get('text', '')

            # 提取数据数组
            match = re.search(r'var Data = (\[.*?\]);', content)
            if not match:
                return []

            import json
            try:
                nav_data_list = json.loads(match.group(1))
            except json.JSONDecodeError:
                return []

            # 转换为标准格式
            processed_navs = []
            for item in nav_data_list:
                try:
                    if len(item) < 10:
                        continue

                    fund_code = item[0].strip()
                    if fund_code not in fund_codes:
                        continue

                    nav_info = {
                        'fund_code': fund_code,
                        'nav_date': nav_date,
                        'unit_nav': self._parse_decimal(item[1]),
                        'accumulated_nav': self._parse_decimal(item[2]),
                        'daily_change_rate': self._parse_decimal(item[3]),
                        'daily_change_amount': self._parse_decimal(item[4]),
                    }

                    # 验证净值数据
                    if nav_info['unit_nav'] and nav_info['accumulated_nav']:
                        processed_navs.append(nav_info)

                except Exception as e:
                    self.logger.warning(f"处理净值数据失败: {item}, 错误: {e}")
                    continue

            return processed_navs

        except Exception as e:
            self.logger.error(f"获取批量净值数据失败: {e}")
            return []

    def _parse_decimal(self, value) -> Optional[Decimal]:
        """解析十进制数"""
        try:
            if value in [None, '', '-', '--']:
                return None
            return Decimal(str(value))
        except (ValueError, TypeError):
            return None


class SinaFinanceNavDataSource(BaseCollector):
    """新浪财经净值数据源"""

    @retry_on_failure(max_retries=3, delay=2.0)
    async def get_nav_data(self, nav_date: date, fund_codes: List[str]) -> List[Dict[str, Any]]:
        """获取净值数据"""
        try:
            navs_data = []

            # 新浪财经API查询
            for fund_code in fund_codes:
                nav_info = await self._get_single_nav_data(nav_date, fund_code)
                if nav_info:
                    navs_data.append(nav_info)

                # 请求间隔
                await self.sleep_between_requests(0.1)

            self.logger.info(f"新浪财经获取到 {len(navs_data)} 条净值数据")
            return navs_data

        except Exception as e:
            self.logger.error(f"获取新浪财经净值数据失败: {e}")
            return []

    async def _get_single_nav_data(self, nav_date: date, fund_code: str) -> Optional[Dict[str, Any]]:
        """获取单个基金净值数据"""
        try:
            # 新浪财经基金API
            # 格式: https://hq.sinajs.cn/list=fu_fund_code
            url = f"https://hq.sinajs.cn/list=fu_{fund_code}"

            response = await self.fetch_data(url)
            if not response:
                return None

            # 解析响应数据
            content = response.get('text', '')

            # 提取数据行
            lines = content.strip().split('\n')
            for line in lines:
                if 'var hq_str_' in line:
                    # 解析数据行
                    data_part = line.split('="')[1].rstrip('";')
                    fields = data_part.split(',')

                    if len(fields) >= 8:
                        try:
                            nav_info = {
                                'fund_code': fund_code,
                                'nav_date': nav_date,
                                'unit_nav': self._parse_decimal(fields[1]),
                                'accumulated_nav': self._parse_decimal(fields[2]),
                                'daily_change_rate': self._parse_decimal(fields[3]),
                                'daily_change_amount': self._parse_decimal(fields[4]),
                            }

                            # 验证净值数据
                            if nav_info['unit_nav'] and nav_info['accumulated_nav']:
                                return nav_info

                        except Exception as e:
                            self.logger.warning(f"解析新浪财经净值数据失败: {line}, 错误: {e}")
                            continue

            return None

        except Exception as e:
            self.logger.error(f"获取单个基金净值失败 {fund_code}: {e}")
            return None

    def _parse_decimal(self, value) -> Optional[Decimal]:
        """解析十进制数"""
        try:
            if value in [None, '', '-', '--']:
                return None
            return Decimal(str(value))
        except (ValueError, TypeError):
            return None