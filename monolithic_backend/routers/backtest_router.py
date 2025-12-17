"""
回测路由
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from .database import get_async_db, Fund, NavRecord, BacktestStrategy, BacktestResult
from services.backtest_engine import BacktestEngine
from utils import get_logger

router = APIRouter()
logger = get_logger(__name__)

# 回测引擎
backtest_engine = BacktestEngine()

@router.get("/strategies", response_model=List[Dict[str, Any]])
async def get_strategies(
    db: AsyncSession = Depends(get_async_db)
):
    """获取所有回测策略"""
    try:
        query = select(BacktestStrategy).order_by(BacktestStrategy.created_at.desc())
        result = await db.execute(query)
        strategies = result.scalars().all()
        
        return [
            {
                "id": strategy.id,
                "name": strategy.name,
                "description": strategy.description,
                "parameters": strategy.parameters,
                "created_at": strategy.created_at.isoformat()
            }
            for strategy in strategies
        ]
    except Exception as e:
        logger.error(f"获取回测策略失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取回测策略失败: {str(e)}")

@router.post("/strategies", response_model=Dict[str, Any])
async def create_strategy(
    strategy_data: Dict[str, Any],
    db: AsyncSession = Depends(get_async_db)
):
    """创建新的回测策略"""
    try:
        # 创建新策略
        new_strategy = BacktestStrategy(
            name=strategy_data["name"],
            description=strategy_data.get("description", ""),
            parameters=strategy_data.get("parameters", {})
        )
        
        db.add(new_strategy)
        await db.commit()
        await db.refresh(new_strategy)
        
        logger.info(f"创建回测策略成功: {strategy_data['name']}")
        
        return {
            "id": new_strategy.id,
            "name": new_strategy.name,
            "description": new_strategy.description,
            "parameters": new_strategy.parameters,
            "created_at": new_strategy.created_at.isoformat()
        }
    except Exception as e:
        logger.error(f"创建回测策略失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"创建回测策略失败: {str(e)}")

@router.get("/strategies/{strategy_id}", response_model=Dict[str, Any])
async def get_strategy(
    strategy_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """获取策略详情"""
    try:
        query = select(BacktestStrategy).where(BacktestStrategy.id == strategy_id)
        result = await db.execute(query)
        strategy = result.scalar_one_or_none()
        
        if not strategy:
            raise HTTPException(status_code=404, detail=f"策略ID {strategy_id} 不存在")
        
        return {
            "id": strategy.id,
            "name": strategy.name,
            "description": strategy.description,
            "parameters": strategy.parameters,
            "created_at": strategy.created_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取策略 {strategy_id} 详情失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取策略详情失败: {str(e)}")

@router.post("/strategies/{strategy_id}/run")
async def run_backtest(
    strategy_id: int,
    backtest_params: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db)
):
    """运行回测"""
    try:
        # 检查策略是否存在
        query = select(BacktestStrategy).where(BacktestStrategy.id == strategy_id)
        result = await db.execute(query)
        strategy = result.scalar_one_or_none()
        
        if not strategy:
            raise HTTPException(status_code=404, detail=f"策略ID {strategy_id} 不存在")
        
        # 添加后台任务运行回测
        background_tasks.add_task(
            backtest_engine.run_backtest, 
            strategy, 
            backtest_params, 
            db
        )
        
        return {"message": "回测任务已启动，请稍后查看结果"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"启动回测任务失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"启动回测任务失败: {str(e)}")

@router.get("/strategies/{strategy_id}/results", response_model=List[Dict[str, Any]])
async def get_backtest_results(
    strategy_id: int,
    page: int = 1,
    size: int = 10,
    db: AsyncSession = Depends(get_async_db)
):
    """获取回测结果"""
    try:
        # 检查策略是否存在
        query = select(BacktestStrategy).where(BacktestStrategy.id == strategy_id)
        result = await db.execute(query)
        strategy = result.scalar_one_or_none()
        
        if not strategy:
            raise HTTPException(status_code=404, detail=f"策略ID {strategy_id} 不存在")
        
        # 查询回测结果
        result_query = select(BacktestResult).where(
            BacktestResult.strategy_id == strategy_id
        ).order_by(BacktestResult.created_at.desc()).offset((page - 1) * size).limit(size)
        
        result = await db.execute(result_query)
        results = result.scalars().all()
        
        # 转换为响应格式
        return [
            {
                "id": result.id,
                "start_date": result.start_date.isoformat(),
                "end_date": result.end_date.isoformat(),
                "initial_capital": result.initial_capital,
                "final_capital": result.final_capital,
                "total_return": result.total_return,
                "annual_return": result.annual_return,
                "max_drawdown": result.max_drawdown,
                "sharpe_ratio": result.sharpe_ratio,
                "win_rate": result.win_rate,
                "created_at": result.created_at.isoformat()
            }
            for result in results
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取策略 {strategy_id} 回测结果失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取回测结果失败: {str(e)}")

@router.get("/results/{result_id}", response_model=Dict[str, Any])
async def get_backtest_result_detail(
    result_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """获取回测结果详情"""
    try:
        query = select(BacktestResult).where(BacktestResult.id == result_id)
        result = await db.execute(query)
        backtest_result = result.scalar_one_or_none()
        
        if not backtest_result:
            raise HTTPException(status_code=404, detail=f"回测结果ID {result_id} 不存在")
        
        return {
            "id": backtest_result.id,
            "strategy_id": backtest_result.strategy_id,
            "start_date": backtest_result.start_date.isoformat(),
            "end_date": backtest_result.end_date.isoformat(),
            "initial_capital": backtest_result.initial_capital,
            "final_capital": backtest_result.final_capital,
            "total_return": backtest_result.total_return,
            "annual_return": backtest_result.annual_return,
            "max_drawdown": backtest_result.max_drawdown,
            "sharpe_ratio": backtest_result.sharpe_ratio,
            "win_rate": backtest_result.win_rate,
            "details": backtest_result.details,
            "created_at": backtest_result.created_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取回测结果 {result_id} 详情失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取回测结果详情失败: {str(e)}")