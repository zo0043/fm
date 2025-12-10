"""
数据收集模块
负责从各种数据源获取基金数据
"""

import logging
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import aiohttp
import json

from database import Fund, NavRecord
from config import settings

logger = logging.getLogger(__name__)

class DataCollector:
    """数据收集器类"""
    
    def __init__(self):
        self.data_source = settings.FUND_DATA_SOURCE
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def collect_fund_list(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """获取基金列表"""
        try:
            if self.data_source == "eastmoney":
                return await self._collect_from_eastmoney()
            else:
                logger.warning(f"不支持的数据源: {self.data_source}")
                return []
        except Exception as e:
            logger.error(f"获取基金列表失败: {str(e)}")
            return []
    
    async def _collect_from_eastmoney(self) -> List[Dict[str, Any]]:
        """从东方财富获取基金列表"""
        try:
            # 东方财富基金列表 API
            url = "http://fund.eastmoney.com/fund.html"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            
            async with self.session.get(url, headers=headers) as response:
                if response.status == 200:
                    content = await response.text()
                    # 这里需要解析 HTML 获取基金信息
                    # 实际实现中可能需要使用 BeautifulSoup 或其他 HTML 解析库
                    logger.info("从东方财富获取基金列表成功")
                    return []
                else:
                    logger.error(f"获取基金列表失败，状态码: {response.status}")
                    return []
                    
        except Exception as e:
            logger.error(f"从东方财富获取基金列表失败: {str(e)}")
            return []
    
    async def collect_fund_nav(self, fund_code: str, start_date: Optional[datetime] = None, 
                              end_date: Optional[datetime] = None, db: AsyncSession = None) -> List[Dict[str, Any]]:
        """获取基金净值数据"""
        try:
            if not end_date:
                end_date = datetime.now()
            if not start_date:
                start_date = end_date - timedelta(days=365)
            
            if self.data_source == "eastmoney":
                return await self._collect_nav_from_eastmoney(fund_code, start_date, end_date)
            else:
                logger.warning(f"不支持的数据源: {self.data_source}")
                return []
        except Exception as e:
            logger.error(f"获取基金 {fund_code} 净值数据失败: {str(e)}")
            return []
    
    async def _collect_nav_from_eastmoney(self, fund_code: str, start_date: datetime, 
                                        end_date: datetime) -> List[Dict[str, Any]]:
        """从东方财富获取基金净值数据"""
        try:
            # 东方财富净值数据 API
            # 这个 API 需要根据实际接口文档调整
            start_str = start_date.strftime("%Y%m%d")
            end_str = end_date.strftime("%Y%m%d")
            
            url = f"http://api.fund.eastmoney.com/f10/lsjz"
            params = {
                "fundCode": fund_code,
                "startDate": start_str,
                "endDate": end_str,
                "pageIndex": 1,
                "pageSize": 5000
            }
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "http://fund.eastmoney.com/"
            }
            
            async with self.session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    nav_data = []
                    
                    # 解析返回的数据
                    if "Data" in data and "LSJZList" in data["Data"]:
                        for item in data["Data"]["LSJZList"]:
                            nav_data.append({
                                "nav_date": datetime.strptime(item["FSRQ"], "%Y-%m-%d"),
                                "nav": float(item["DWJZ"]),
                                "acc_nav": float(item["LJJZ"]),
                                "daily_change": float(item["JZZZL"].replace("%", "")) / 100 if item["JZZZL"] else 0
                            })
                    
                    logger.info(f"获取基金 {fund_code} 净值数据成功，共 {len(nav_data)} 条记录")
                    return nav_data
                else:
                    logger.error(f"获取基金净值数据失败，状态码: {response.status}")
                    return []
                    
        except Exception as e:
            logger.error(f"从东方财富获取基金净值数据失败: {str(e)}")
            return []
    
    async def update_fund_nav_data(self, fund_codes: List[str], db: AsyncSession) -> Dict[str, int]:
        """更新基金净值数据"""
        try:
            updated_counts = {}
            
            for fund_code in fund_codes:
                try:
                    # 检查基金是否存在于数据库
                    fund_query = select(Fund).where(Fund.code == fund_code)
                    result = await db.execute(fund_query)
                    fund = result.scalar_one_or_none()
                    
                    if not fund:
                        logger.warning(f"基金 {fund_code} 不存在于数据库中")
                        updated_counts[fund_code] = 0
                        continue
                    
                    # 获取最新的净值日期
                    latest_nav_query = select(NavRecord).where(
                        NavRecord.fund_id == fund.id
                    ).order_by(NavRecord.nav_date.desc()).limit(1)
                    
                    result = await db.execute(latest_nav_query)
                    latest_nav = result.scalar_one_or_none()
                    
                    # 设置起始日期
                    start_date = latest_nav.nav_date if latest_nav else datetime.now() - timedelta(days=365)
                    
                    # 获取新的净值数据
                    nav_data = await self.collect_fund_nav(fund_code, start_date)
                    
                    if not nav_data:
                        updated_counts[fund_code] = 0
                        continue
                    
                    # 保存到数据库
                    saved_count = 0
                    for nav_item in nav_data:
                        # 检查是否已存在
                        existing_query = select(NavRecord).where(
                            and_(
                                NavRecord.fund_id == fund.id,
                                NavRecord.nav_date == nav_item["nav_date"]
                            )
                        )
                        
                        result = await db.execute(existing_query)
                        existing = result.scalar_one_or_none()
                        
                        if not existing:
                            nav_record = NavRecord(
                                fund_id=fund.id,
                                nav_date=nav_item["nav_date"],
                                nav=nav_item["nav"],
                                acc_nav=nav_item["acc_nav"],
                                daily_change=nav_item["daily_change"]
                            )
                            db.add(nav_record)
                            saved_count += 1
                    
                    await db.commit()
                    updated_counts[fund_code] = saved_count
                    
                    logger.info(f"基金 {fund_code} 更新 {saved_count} 条净值记录")
                    
                    # 避免请求过于频繁
                    await asyncio.sleep(0.1)
                    
                except Exception as e:
                    logger.error(f"更新基金 {fund_code} 数据失败: {str(e)}")
                    updated_counts[fund_code] = 0
            
            return updated_counts
            
        except Exception as e:
            logger.error(f"批量更新基金数据失败: {str(e)}")
            raise
    
    async def collect_fund_info(self, fund_code: str) -> Optional[Dict[str, Any]]:
        """获取基金基本信息"""
        try:
            if self.data_source == "eastmoney":
                return await self._collect_fund_info_from_eastmoney(fund_code)
            else:
                logger.warning(f"不支持的数据源: {self.data_source}")
                return None
        except Exception as e:
            logger.error(f"获取基金 {fund_code} 基本信息失败: {str(e)}")
            return None
    
    async def _collect_fund_info_from_eastmoney(self, fund_code: str) -> Optional[Dict[str, Any]]:
        """从东方财富获取基金基本信息"""
        try:
            # 基金基本信息 API
            url = f"http://api.fund.eastmoney.com/f10/manager"
            params = {
                "fundCode": fund_code
            }
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "http://fund.eastmoney.com/"
            }
            
            async with self.session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # 解析返回的数据
                    fund_info = {}
                    if "Data" in data and data["Data"]:
                        item = data["Data"][0]
                        fund_info = {
                            "code": fund_code,
                            "name": item.get("FUND_NAME", ""),
                            "short_name": item.get("SHORT_NAME", ""),
                            "type": item.get("FUND_TYPE", ""),
                            "management_company": item.get("MANAGEMENT", ""),
                            "fund_manager": item.get("MANAGER", ""),
                            "establishment_date": item.get("ESTABLISH_DATE"),
                            "scale": float(item.get("FUND_SCALE", 0)),
                            "fee_rate": float(item.get("FEE_RATE", 0)),
                            "is_index_fund": item.get("IS_INDEX_FUND", False),
                            "is_etf": item.get("IS_ETF", False)
                        }
                    
                    logger.info(f"获取基金 {fund_code} 基本信息成功")
                    return fund_info
                else:
                    logger.error(f"获取基金基本信息失败，状态码: {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"从东方财富获取基金基本信息失败: {str(e)}")
            return None

# 全局数据收集器实例
data_collector = DataCollector()