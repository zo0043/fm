"""
数据路由
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from database import get_async_db, Fund, NavRecord
from services.data_collector import DataCollector
from utils import get_logger

router = APIRouter()
logger = get_logger(__name__)

# 数据收集服务
data_collector = DataCollector()

@router.get("/funds", response_model=Dict[str, Any])
async def get_funds(
    search: Optional[str] = None,
    fund_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db)
):
    """获取基金列表"""
    try:
        query = select(Fund)
        
        # 应用筛选条件
        if search:
            query = query.where(
                (Fund.name.like(f"%{search}%")) | 
                (Fund.code.like(f"%{search}%"))
            )
        
        if fund_type:
            query = query.where(Fund.type == fund_type)
        
        # 只获取活跃基金
        query = query.where(Fund.is_active == True)
        
        # 计数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # 分页查询
        query = query.order_by(Fund.name).offset((page - 1) * size).limit(size)
        result = await db.execute(query)
        funds = result.scalars().all()
        
        # 获取基金的最新净值数据
        fund_data = []
        for fund in funds:
            # 获取最新净值
            nav_query = select(NavRecord).where(
                NavRecord.fund_id == fund.id
            ).order_by(NavRecord.nav_date.desc()).limit(1)
            
            nav_result = await db.execute(nav_query)
            latest_nav = nav_result.scalar_one_or_none()
            
            # 计算日涨跌
            daily_change = 0
            if latest_nav:
                # 获取前一日净值
                prev_date = latest_nav.nav_date - timedelta(days=1)
                prev_nav_query = select(NavRecord).where(
                    and_(
                        NavRecord.fund_id == fund.id,
                        NavRecord.nav_date <= prev_date
                    )
                ).order_by(NavRecord.nav_date.desc()).limit(1)
                
                prev_nav_result = await db.execute(prev_nav_query)
                prev_nav = prev_nav_result.scalar_one_or_none()
                
                if prev_nav:
                    daily_change = (latest_nav.nav - prev_nav.nav) / prev_nav.nav
            
            fund_data.append({
                "id": fund.id,
                "code": fund.code,
                "name": fund.name,
                "short_name": fund.short_name,
                "type": fund.type,
                "management_company": fund.management_company,
                "fund_manager": fund.fund_manager,
                "latest_nav": latest_nav.nav if latest_nav else None,
                "latest_nav_date": latest_nav.nav_date if latest_nav else None,
                "daily_change": daily_change
            })
        
        return {
            "total": total,
            "page": page,
            "size": size,
            "data": fund_data
        }
    except Exception as e:
        logger.error(f"获取基金列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取基金列表失败: {str(e)}")

@router.get("/funds/{fund_code}", response_model=Dict[str, Any])
async def get_fund_details(fund_code: str, db: AsyncSession = Depends(get_async_db)):
    """获取基金详情"""
    try:
        # 查询基金基本信息
        fund_query = select(Fund).where(Fund.code == fund_code)
        fund_result = await db.execute(fund_query)
        fund = fund_result.scalar_one_or_none()
        
        if not fund:
            raise HTTPException(status_code=404, detail=f"基金代码 {fund_code} 不存在")
        
        # 获取最新净值数据
        nav_query = select(NavRecord).where(
            NavRecord.fund_id == fund.id
        ).order_by(NavRecord.nav_date.desc()).limit(1)
        
        nav_result = await db.execute(nav_query)
        latest_nav = nav_result.scalar_one_or_none()
        
        # 计算日涨跌
        daily_change = 0
        if latest_nav:
            # 获取前一日净值
            prev_date = latest_nav.nav_date - timedelta(days=1)
            prev_nav_query = select(NavRecord).where(
                and_(
                    NavRecord.fund_id == fund.id,
                    NavRecord.nav_date <= prev_date
                )
            ).order_by(NavRecord.nav_date.desc()).limit(1)
            
            prev_nav_result = await db.execute(prev_nav_query)
            prev_nav = prev_nav_result.scalar_one_or_none()
            
            if prev_nav:
                daily_change = (latest_nav.nav - prev_nav.nav) / prev_nav.nav
        
        # 基金详情
        fund_data = {
            "id": fund.id,
            "code": fund.code,
            "name": fund.name,
            "short_name": fund.short_name,
            "type": fund.type,
            "management_company": fund.management_company,
            "fund_manager": fund.fund_manager,
            "establishment_date": fund.establishment_date,
            "scale": fund.scale,
            "fee_rate": fund.fee_rate,
            "is_index_fund": fund.is_index_fund,
            "is_etf": fund.is_etf,
            "is_active": fund.is_active,
            "latest_nav": latest_nav.nav if latest_nav else None,
            "latest_nav_date": latest_nav.nav_date if latest_nav else None,
            "daily_change": daily_change
        }
        
        return fund_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取基金 {fund_code} 详情失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取基金详情失败: {str(e)}")

@router.get("/funds/{fund_code}/nav")
async def get_fund_nav_history(
    fund_code: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """获取基金净值历史"""
    try:
        # 查询基金基本信息
        fund_query = select(Fund).where(Fund.code == fund_code)
        fund_result = await db.execute(fund_query)
        fund = fund_result.scalar_one_or_none()
        
        if not fund:
            raise HTTPException(status_code=404, detail=f"基金代码 {fund_code} 不存在")
        
        # 设置默认日期范围
        if not end_date:
            end_date = datetime.now()
        if not start_date:
            start_date = end_date - timedelta(days=365)  # 默认一年
        
        # 查询净值历史
        nav_query = select(NavRecord).where(
            and_(
                NavRecord.fund_id == fund.id,
                NavRecord.nav_date >= start_date,
                NavRecord.nav_date <= end_date
            )
        ).order_by(NavRecord.nav_date)
        
        nav_result = await db.execute(nav_query)
        nav_records = nav_result.scalars().all()
        
        # 转换为前端所需格式
        nav_data = []
        for record in nav_records:
            nav_data.append({
                "date": record.nav_date.isoformat(),
                "nav": record.nav,
                "acc_nav": record.acc_nav,
                "daily_change": record.daily_change
            })
        
        return {
            "fund_code": fund_code,
            "fund_name": fund.name,
            "data": nav_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取基金 {fund_code} 净值历史失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取基金净值历史失败: {str(e)}")

@router.post("/funds/{fund_code}/collect")
async def collect_fund_data(fund_code: str, db: AsyncSession = Depends(get_async_db)):
    """手动触发基金数据收集"""
    try:
        success = await data_collector.collect_fund_data(fund_code, db)
        if success:
            return {"message": f"基金 {fund_code} 数据收集成功"}
        else:
            raise HTTPException(status_code=500, detail=f"基金 {fund_code} 数据收集失败")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"手动收集基金 {fund_code} 数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"手动收集基金数据失败: {str(e)}")

@router.get("/market/stats")
async def get_market_stats(db: AsyncSession = Depends(get_async_db)):
    """获取市场统计数据"""
    try:
        # 统计基金总数
        total_funds_query = select(func.count()).where(Fund.is_active == True)
        total_result = await db.execute(total_funds_query)
        total_funds = total_result.scalar()
        
        # 获取所有活跃基金的最新净值数据
        latest_navs_query = select(NavRecord.fund_id, NavRecord.nav_date, NavRecord.nav) \
            .join(Fund, NavRecord.fund_id == Fund.id) \
            .where(Fund.is_active == True) \
            .order_by(NavRecord.fund_id, NavRecord.nav_date.desc())
        
        latest_navs_result = await db.execute(latest_navs_query)
        latest_navs = latest_navs_result.fetchall()
        
        # 计算涨跌基金数量
        fund_daily_changes = {}
        for fund_id, nav_date, nav in latest_navs:
            if fund_id not in fund_daily_changes:
                # 获取前一日净值
                prev_date = nav_date - timedelta(days=1)
                prev_nav_query = select(NavRecord.nav).where(
                    and_(
                        NavRecord.fund_id == fund_id,
                        NavRecord.nav_date <= prev_date
                    )
                ).order_by(NavRecord.nav_date.desc()).limit(1)
                
                prev_nav_result = await db.execute(prev_nav_query)
                prev_nav = prev_nav_result.scalar_one_or_none()
                
                if prev_nav:
                    daily_change = (nav - prev_nav) / prev_nav
                    fund_daily_changes[fund_id] = daily_change
        
        # 统计涨跌情况
        up_funds = sum(1 for change in fund_daily_changes.values() if change > 0)
        down_funds = sum(1 for change in fund_daily_changes.values() if change < 0)
        flat_funds = total_funds - up_funds - down_funds
        
        return {
            "total_funds": total_funds,
            "up_funds": up_funds,
            "down_funds": down_funds,
            "flat_funds": flat_funds
        }
    except Exception as e:
        logger.error(f"获取市场统计数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取市场统计数据失败: {str(e)}")