"""
净值管理路由
"""

from typing import List, Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_async_db
from shared.database.models import NetAssetValue, Fund
from shared.utils import get_logger, log_performance
from ..services.nav_collector import NavCollector

router = APIRouter()
logger = get_logger(__name__)


@router.get("/", summary="获取净值数据")
async def get_nav_data(
    fund_code: Optional[str] = Query(None, description="基金代码"),
    start_date: Optional[str] = Query(None, description="开始日期 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="结束日期 (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(50, ge=1, le=200, description="每页数量"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    获取净值数据，支持按基金代码和日期范围筛选
    """
    try:
        from sqlalchemy import select, func, and_
        from sqlalchemy.desc import desc

        # 构建查询
        query = select(NetAssetValue)
        count_query = select(func.count(NetAssetValue.id))

        # 添加筛选条件
        conditions = []

        if fund_code:
            conditions.append(NetAssetValue.fund_code == fund_code)

        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                conditions.append(NetAssetValue.nav_date >= start_date_obj)
            except ValueError:
                raise HTTPException(status_code=400, detail="开始日期格式错误")

        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                conditions.append(NetAssetValue.nav_date <= end_date_obj)
            except ValueError:
                raise HTTPException(status_code=400, detail="结束日期格式错误")

        if conditions:
            query = query.where(and_(*conditions))
            count_query = count_query.where(and_(*conditions))

        # 获取总数
        total_count = await db.scalar(count_query)

        # 分页查询
        offset = (page - 1) * size
        query = query.offset(offset).limit(size).order_by(
            desc(NetAssetValue.nav_date),
            NetAssetValue.fund_code
        )

        result = await db.execute(query)
        navs = result.scalars().all()

        # 转换为字典
        nav_list = []
        for nav in navs:
            nav_dict = {
                "id": nav.id,
                "fund_code": nav.fund_code,
                "nav_date": nav.nav_date.isoformat(),
                "unit_nav": float(nav.unit_nav),
                "accumulated_nav": float(nav.accumulated_nav),
                "daily_change_rate": float(nav.daily_change_rate) if nav.daily_change_rate else None,
                "daily_change_amount": float(nav.daily_change_amount) if nav.daily_change_amount else None,
                "created_at": nav.created_at.isoformat(),
            }
            nav_list.append(nav_dict)

        return {
            "data": nav_list,
            "pagination": {
                "page": page,
                "size": size,
                "total": total_count,
                "pages": (total_count + size - 1) // size
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取净值数据失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/latest/{fund_code}", summary="获取最新净值")
async def get_latest_nav(
    fund_code: str,
    db: AsyncSession = Depends(get_async_db)
):
    """获取指定基金的最新净值"""
    try:
        from sqlalchemy import select
        from sqlalchemy.desc import desc

        # 获取最新净值
        query = select(NetAssetValue).where(
            NetAssetValue.fund_code == fund_code
        ).order_by(desc(NetAssetValue.nav_date)).limit(1)

        result = await db.execute(query)
        latest_nav = result.scalar_one_or_none()

        if not latest_nav:
            raise HTTPException(status_code=404, detail=f"基金 {fund_code} 没有净值数据")

        return {
            "fund_code": latest_nav.fund_code,
            "nav_date": latest_nav.nav_date.isoformat(),
            "unit_nav": float(latest_nav.unit_nav),
            "accumulated_nav": float(latest_nav.accumulated_nav),
            "daily_change_rate": float(latest_nav.daily_change_rate) if latest_nav.daily_change_rate else None,
            "daily_change_amount": float(latest_nav.daily_change_amount) if latest_nav.daily_change_amount else None,
            "created_at": latest_nav.created_at.isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取最新净值失败 {fund_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{fund_code}", summary="获取历史净值")
async def get_nav_history(
    fund_code: str,
    days: int = Query(30, ge=1, le=365, description="天数"),
    db: AsyncSession = Depends(get_async_db)
):
    """获取指定基金的历史净值"""
    try:
        from sqlalchemy import select
        from sqlalchemy.desc import desc

        # 计算日期范围
        end_date = date.today()
        start_date = end_date - timedelta(days=days)

        # 获取历史净值
        query = select(NetAssetValue).where(
            and_(
                NetAssetValue.fund_code == fund_code,
                NetAssetValue.nav_date >= start_date,
                NetAssetValue.nav_date <= end_date
            )
        ).order_by(desc(NetAssetValue.nav_date))

        result = await db.execute(query)
        navs = result.scalars().all()

        if not navs:
            return {"data": [], "fund_code": fund_code, "days": days}

        # 转换为字典
        nav_list = []
        for nav in navs:
            nav_dict = {
                "nav_date": nav.nav_date.isoformat(),
                "unit_nav": float(nav.unit_nav),
                "accumulated_nav": float(nav.accumulated_nav),
                "daily_change_rate": float(nav.daily_change_rate) if nav.daily_change_rate else None,
                "daily_change_amount": float(nav.daily_change_amount) if nav.daily_change_amount else None,
            }
            nav_list.append(nav_dict)

        return {
            "data": nav_list,
            "fund_code": fund_code,
            "days": days,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "count": len(nav_list)
        }

    except Exception as e:
        logger.error(f"获取历史净值失败 {fund_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/collect", summary="收集净值数据")
async def collect_nav_data(
    background_tasks: BackgroundTasks,
    target_date: Optional[str] = Query(None, description="目标日期 (YYYY-MM-DD)"),
    fund_codes: Optional[List[str]] = Query(None, description="指定基金代码列表")
):
    """
    手动触发净值数据收集任务
    """
    try:
        background_tasks.add_task(
            _collect_nav_background,
            date=target_date,
            fund_codes=fund_codes
        )

        return {
            "message": "净值数据收集任务已启动",
            "target_date": target_date,
            "fund_codes": fund_codes
        }

    except Exception as e:
        logger.error(f"启动净值数据收集任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary", summary="获取净值汇总")
async def get_nav_summary(
    target_date: Optional[str] = Query(None, description="目标日期 (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_async_db)
):
    """获取指定日期的净值汇总信息"""
    try:
        from sqlalchemy import select, func, and_

        # 确定目标日期
        if target_date:
            try:
                nav_date = datetime.strptime(target_date, '%Y-%m-%d').date()
            except ValueError:
                raise HTTPException(status_code=400, detail="日期格式错误")
        else:
            # 获取最新净值日期
            latest_date_query = select(func.max(NetAssetValue.nav_date))
            nav_date = await db.scalar(latest_date_query)
            if not nav_date:
                return {"message": "没有净值数据"}

        # 汇总统计
        summary_query = select(
            func.count(NetAssetValue.id).label('total_count'),
            func.count(func.nullif(NetAssetValue.daily_change_rate, None)).label('change_rate_count'),
            func.avg(NetAssetValue.daily_change_rate).label('avg_change_rate'),
            func.min(NetAssetValue.daily_change_rate).label('min_change_rate'),
            func.max(NetAssetValue.daily_change_rate).label('max_change_rate'),
            func.count(func.nullif(NetAssetValue.daily_change_amount, None)).label('change_amount_count'),
            func.avg(NetAssetValue.daily_change_amount).label('avg_change_amount'),
        ).where(NetAssetValue.nav_date == nav_date)

        result = await db.execute(summary_query)
        summary = result.first()

        # 涨跌分布统计
        distribution_query = select(
            func.count(NetAssetValue.id).label('count'),
        ).where(
            and_(
                NetAssetValue.nav_date == nav_date,
                NetAssetValue.daily_change_rate.isnot(None)
            )
        )

        total_with_change = await db.scalar(distribution_query)

        # 计算涨跌分布
        up_count = 0
        down_count = 0
        flat_count = 0

        if total_with_change > 0:
            up_query = select(func.count(NetAssetValue.id)).where(
                and_(
                    NetAssetValue.nav_date == nav_date,
                    NetAssetValue.daily_change_rate > 0
                )
            )
            up_count = await db.scalar(up_query)

            down_query = select(func.count(NetAssetValue.id)).where(
                and_(
                    NetAssetValue.nav_date == nav_date,
                    NetAssetValue.daily_change_rate < 0
                )
            )
            down_count = await db.scalar(down_query)

            flat_count = total_with_change - up_count - down_count

        return {
            "date": nav_date.isoformat(),
            "summary": {
                "total_funds": summary.total_count or 0,
                "funds_with_change_rate": summary.change_rate_count or 0,
                "avg_change_rate": float(summary.avg_change_rate) if summary.avg_change_rate else 0,
                "min_change_rate": float(summary.min_change_rate) if summary.min_change_rate else 0,
                "max_change_rate": float(summary.max_change_rate) if summary.max_change_rate else 0,
                "avg_change_amount": float(summary.avg_change_amount) if summary.avg_change_amount else 0,
            },
            "distribution": {
                "up_count": up_count,
                "down_count": down_count,
                "flat_count": flat_count,
                "up_percentage": up_count / total_with_change * 100 if total_with_change > 0 else 0,
                "down_percentage": down_count / total_with_change * 100 if total_with_change > 0 else 0,
                "flat_percentage": flat_count / total_with_change * 100 if total_with_change > 0 else 0,
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取净值汇总失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/cleanup", summary="清理旧净值数据")
async def cleanup_old_nav_data(
    days: int = Query(365, ge=30, le=3650, description="保留天数"),
    db: AsyncSession = Depends(get_async_db)
):
    """清理指定天数之前的净值数据"""
    try:
        from sqlalchemy import delete

        cutoff_date = date.today() - timedelta(days=days)

        # 删除旧数据
        delete_query = delete(NetAssetValue).where(NetAssetValue.nav_date < cutoff_date)
        result = await db.execute(delete_query)
        await db.commit()

        return {
            "message": f"已清理 {result.rowcount} 条 {cutoff_date} 之前的净值数据",
            "cutoff_date": cutoff_date.isoformat(),
            "deleted_count": result.rowcount
        }

    except Exception as e:
        await db.rollback()
        logger.error(f"清理净值数据失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@log_performance
async def _collect_nav_background(date: Optional[str] = None, fund_codes: Optional[List[str]] = None):
    """后台净值数据收集任务"""
    try:
        collector = NavCollector()
        result = await collector.collect_nav_data(date=date, fund_codes=fund_codes)
        logger.info(f"净值数据收集完成: {result}")
    except Exception as e:
        logger.error(f"净值数据收集失败: {e}")