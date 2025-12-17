"""
数据路由
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from .database import get_async_db, Fund, NavRecord
from .services.data_collector import DataCollector
from .utils import get_logger

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
        
        # 添加分页
        query = query.offset((page - 1) * size).limit(size)
        
        result = await db.execute(query)
        funds = result.scalars().all()
        
        # 获取总数
        total_query = select(func.count(Fund.id))
        total_result = await db.execute(total_query)
        total = total_result.scalar()
        
        # 返回结果
        return {
            "funds": [fund.model_dump() for fund in funds],
            "total": total,
            "page": page,
            "size": size,
            "total_pages": (total + size - 1) // size  # 向上取整
        }
    
    except Exception as e:
        logger.error(f"获取基金列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取基金列表失败: {str(e)}")
