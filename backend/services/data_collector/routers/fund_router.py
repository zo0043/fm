"""
基金管理路由
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_async_db
from shared.database.models import Fund
from shared.utils import get_logger, log_performance
from ..services.fund_collector import FundCollector

router = APIRouter()
logger = get_logger(__name__)


@router.get("/", summary="获取基金列表")
async def get_funds(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    fund_type: Optional[str] = Query(None, description="基金类型"),
    fund_company: Optional[str] = Query(None, description="基金公司"),
    status: str = Query("active", description="状态"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    获取基金列表，支持分页和筛选
    """
    try:
        from sqlalchemy import select, func
        from sqlalchemy.orm import selectinload

        # 构建查询
        query = select(Fund)
        count_query = select(func.count(Fund.id))

        # 添加筛选条件
        if fund_type:
            query = query.where(Fund.fund_type.like(f"%{fund_type}%"))
            count_query = count_query.where(Fund.fund_type.like(f"%{fund_type}%"))

        if fund_company:
            query = query.where(Fund.fund_company.like(f"%{fund_company}%"))
            count_query = count_query.where(Fund.fund_company.like(f"%{fund_company}%"))

        if status:
            query = query.where(Fund.status == status)
            count_query = count_query.where(Fund.status == status)

        # 获取总数
        total_count = await db.scalar(count_query)

        # 分页查询
        offset = (page - 1) * size
        query = query.offset(offset).limit(size).order_by(Fund.fund_code)

        result = await db.execute(query)
        funds = result.scalars().all()

        # 转换为字典
        fund_list = []
        for fund in funds:
            fund_dict = {
                "id": fund.id,
                "fund_code": fund.fund_code,
                "fund_name": fund.fund_name,
                "fund_type": fund.fund_type,
                "fund_company": fund.fund_company,
                "establish_date": fund.establish_date.isoformat() if fund.establish_date else None,
                "fund_manager": fund.fund_manager,
                "fund_size": float(fund.fund_size) if fund.fund_size else None,
                "management_fee_rate": float(fund.management_fee_rate) if fund.management_fee_rate else None,
                "custody_fee_rate": float(fund.custody_fee_rate) if fund.custody_fee_rate else None,
                "status": fund.status,
                "created_at": fund.created_at.isoformat(),
                "updated_at": fund.updated_at.isoformat(),
            }
            fund_list.append(fund_dict)

        return {
            "data": fund_list,
            "pagination": {
                "page": page,
                "size": size,
                "total": total_count,
                "pages": (total_count + size - 1) // size
            }
        }

    except Exception as e:
        logger.error(f"获取基金列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{fund_code}", summary="获取基金详情")
async def get_fund_detail(
    fund_code: str,
    db: AsyncSession = Depends(get_async_db)
):
    """获取指定基金的详细信息"""
    try:
        # 获取基金信息
        fund = await db.get(Fund, fund_code)
        if not fund:
            raise HTTPException(status_code=404, detail=f"基金 {fund_code} 不存在")

        # 获取最近的净值数据
        from shared.database.models import NetAssetValue
        from sqlalchemy import select
        from sqlalchemy.desc import desc

        nav_query = select(NetAssetValue).where(
            NetAssetValue.fund_code == fund_code
        ).order_by(desc(NetAssetValue.nav_date)).limit(10)

        nav_result = await db.execute(nav_query)
        recent_navs = nav_result.scalars().all()

        # 转换净值数据
        nav_list = []
        for nav in recent_navs:
            nav_dict = {
                "nav_date": nav.nav_date.isoformat(),
                "unit_nav": float(nav.unit_nav),
                "accumulated_nav": float(nav.accumulated_nav),
                "daily_change_rate": float(nav.daily_change_rate) if nav.daily_change_rate else None,
                "daily_change_amount": float(nav.daily_change_amount) if nav.daily_change_amount else None,
            }
            nav_list.append(nav_dict)

        # 构建响应
        fund_detail = {
            "id": fund.id,
            "fund_code": fund.fund_code,
            "fund_name": fund.fund_name,
            "fund_type": fund.fund_type,
            "fund_company": fund.fund_company,
            "establish_date": fund.establish_date.isoformat() if fund.establish_date else None,
            "fund_manager": fund.fund_manager,
            "fund_size": float(fund.fund_size) if fund.fund_size else None,
            "management_fee_rate": float(fund.management_fee_rate) if fund.management_fee_rate else None,
            "custody_fee_rate": float(fund.custody_fee_rate) if fund.custody_fee_rate else None,
            "status": fund.status,
            "created_at": fund.created_at.isoformat(),
            "updated_at": fund.updated_at.isoformat(),
            "recent_navs": nav_list,
        }

        return fund_detail

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取基金详情失败 {fund_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/collect", summary="收集基金数据")
async def collect_funds(
    background_tasks: BackgroundTasks,
    force_update: bool = Query(False, description="是否强制更新"),
    fund_codes: Optional[List[str]] = Query(None, description="指定基金代码列表")
):
    """
    手动触发基金数据收集任务
    """
    try:
        background_tasks.add_task(
            _collect_funds_background,
            force_update=force_update,
            fund_codes=fund_codes
        )

        return {
            "message": "基金数据收集任务已启动",
            "force_update": force_update,
            "fund_codes": fund_codes
        }

    except Exception as e:
        logger.error(f"启动基金数据收集任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/types", summary="获取基金类型列表")
async def get_fund_types(db: AsyncSession = Depends(get_async_db)):
    """获取所有基金类型"""
    try:
        from sqlalchemy import select, distinct

        result = await db.execute(
            select(distinct(Fund.fund_type)).where(Fund.fund_type.isnot(None))
        )
        fund_types = result.scalars().all()

        return {
            "data": list(fund_types)
        }

    except Exception as e:
        logger.error(f"获取基金类型失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/companies", summary="获取基金公司列表")
async def get_fund_companies(db: AsyncSession = Depends(get_async_db)):
    """获取所有基金公司"""
    try:
        from sqlalchemy import select, distinct

        result = await db.execute(
            select(distinct(Fund.fund_company)).where(Fund.fund_company.isnot(None))
        )
        companies = result.scalars().all()

        return {
            "data": list(companies)
        }

    except Exception as e:
        logger.error(f"获取基金公司失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{fund_code}", summary="更新基金信息")
async def update_fund(
    fund_code: str,
    fund_data: dict,
    db: AsyncSession = Depends(get_async_db)
):
    """更新基金信息"""
    try:
        fund = await db.get(Fund, fund_code)
        if not fund:
            raise HTTPException(status_code=404, detail=f"基金 {fund_code} 不存在")

        # 更新字段
        updateable_fields = [
            'fund_name', 'fund_type', 'fund_company', 'establish_date',
            'fund_manager', 'fund_size', 'management_fee_rate',
            'custody_fee_rate', 'status'
        ]

        for field in updateable_fields:
            if field in fund_data:
                setattr(fund, field, fund_data[field])

        fund.updated_at = func.now()
        await db.commit()

        return {"message": "基金信息更新成功"}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"更新基金信息失败 {fund_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{fund_code}", summary="删除基金")
async def delete_fund(
    fund_code: str,
    db: AsyncSession = Depends(get_async_db)
):
    """删除基金"""
    try:
        fund = await db.get(Fund, fund_code)
        if not fund:
            raise HTTPException(status_code=404, detail=f"基金 {fund_code} 不存在")

        await db.delete(fund)
        await db.commit()

        return {"message": "基金删除成功"}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"删除基金失败 {fund_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@log_performance
async def _collect_funds_background(force_update: bool = False, fund_codes: Optional[List[str]] = None):
    """后台基金数据收集任务"""
    try:
        collector = FundCollector()
        result = await collector.collect_funds(force_update=force_update, fund_codes=fund_codes)
        logger.info(f"基金数据收集完成: {result}")
    except Exception as e:
        logger.error(f"基金数据收集失败: {e}")