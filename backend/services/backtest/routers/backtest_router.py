"""
回测管理路由
处理回测策略管理、回测任务执行、回测报告等功能
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from pydantic import BaseModel, validator
from datetime import datetime, date, timedelta
import json

from shared.database import get_async_db
from shared.database.models import BacktestStrategy, BacktestResult, Fund, NetAssetValue
from shared.utils import get_logger
from ..services.backtest_engine import BacktestEngine

router = APIRouter()
logger = get_logger(__name__)


# 请求模型
class BacktestStrategyRequest(BaseModel):
    """回测策略请求"""
    strategy_name: str
    strategy_type: str
    fund_codes: str
    investment_amount: float
    investment_frequency: str
    start_date: date
    end_date: date
    strategy_params: Optional[Dict[str, Any]] = {}

    @validator('strategy_name')
    def validate_strategy_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('策略名称不能为空')
        if len(v) > 100:
            raise ValueError('策略名称不能超过100个字符')
        return v.strip()

    @validator('strategy_type')
    def validate_strategy_type(cls, v):
        valid_types = ['regular_investment', 'value_averaging', 'momentum', 'reversal']
        if v not in valid_types:
            raise ValueError(f'策略类型必须是: {", ".join(valid_types)}')
        return v

    @validator('fund_codes')
    def validate_fund_codes(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('基金代码列表不能为空')

        # 验证基金代码格式
        codes = [code.strip() for code in v.split(',') if code.strip()]
        if not codes:
            raise ValueError('至少需要一个有效的基金代码')

        for code in codes:
            if not code.isdigit() or len(code) != 6:
                raise ValueError(f'无效的基金代码格式: {code}')

        return ','.join(codes)

    @validator('investment_amount')
    def validate_investment_amount(cls, v):
        if v <= 0:
            raise ValueError('投资金额必须大于0')
        if v > 10000000:  # 1000万
            raise ValueError('投资金额不能超过1000万')
        return v

    @validator('investment_frequency')
    def validate_investment_frequency(cls, v):
        valid_frequencies = ['daily', 'weekly', 'monthly', 'quarterly']
        if v not in valid_frequencies:
            raise ValueError(f'投资频率必须是: {", ".join(valid_frequencies)}')
        return v

    @validator('end_date')
    def validate_date_range(cls, v, values):
        if 'start_date' in values:
            start_date = values['start_date']
            if v <= start_date:
                raise ValueError('结束日期必须大于开始日期')

            # 限制回测时间跨度不超过5年
            if (v - start_date).days > 365 * 5:
                raise ValueError('回测时间跨度不能超过5年')
        return v


class RunBacktestRequest(BaseModel):
    """运行回测请求"""
    strategy_id: int

    @validator('strategy_id')
    def validate_strategy_id(cls, v):
        if v <= 0:
            raise ValueError('策略ID必须大于0')
        return v


class CompareBacktestRequest(BaseModel):
    """比较回测结果请求"""
    result_ids: List[int]

    @validator('result_ids')
    def validate_result_ids(cls, v):
        if not v or len(v) < 2:
            raise ValueError('至少需要选择两个回测结果进行比较')
        if len(v) > 10:
            raise ValueError('最多只能比较10个回测结果')
        return v


# 响应模型
class BacktestStrategyResponse(BaseModel):
    """回测策略响应"""
    id: int
    strategy_name: str
    strategy_type: str
    fund_codes: str
    investment_amount: float
    investment_frequency: str
    start_date: str
    end_date: str
    strategy_params: Dict[str, Any]
    created_at: str

    class Config:
        from_attributes = True


class BacktestResultResponse(BaseModel):
    """回测结果响应"""
    id: int
    strategy_id: int
    total_invested: float
    total_value: float
    total_return: float
    annualized_return: float
    max_drawdown: float
    sharpe_ratio: float
    volatility: float
    win_rate: float
    created_at: str

    class Config:
        from_attributes = True


@router.get("/strategies", response_model=Dict[str, Any], summary="获取回测策略列表")
async def get_backtest_strategies(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    strategy_type: Optional[str] = Query(None, description="策略类型"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    获取回测策略列表，支持分页和筛选
    """
    try:
        # 构建查询
        query = select(BacktestStrategy)
        count_query = select(func.count(BacktestStrategy.id))

        # 添加筛选条件
        if strategy_type:
            query = query.where(BacktestStrategy.strategy_type == strategy_type)
            count_query = count_query.where(BacktestStrategy.strategy_type == strategy_type)

        # 获取总数
        total_count = await db.scalar(count_query)

        # 分页查询
        offset = (page - 1) * size
        query = query.offset(offset).limit(size).order_by(BacktestStrategy.created_at.desc())

        result = await db.execute(query)
        strategies = result.scalars().all()

        # 转换为字典
        strategy_list = []
        for strategy in strategies:
            strategy_dict = {
                "id": strategy.id,
                "strategy_name": strategy.strategy_name,
                "strategy_type": strategy.strategy_type,
                "fund_codes": strategy.fund_codes,
                "investment_amount": float(strategy.investment_amount),
                "investment_frequency": strategy.investment_frequency,
                "start_date": strategy.start_date.isoformat(),
                "end_date": strategy.end_date.isoformat(),
                "strategy_params": strategy.strategy_params or {},
                "created_at": strategy.created_at.isoformat(),
            }
            strategy_list.append(strategy_dict)

        return {
            "data": strategy_list,
            "pagination": {
                "page": page,
                "size": size,
                "total": total_count,
                "pages": (total_count + size - 1) // size
            }
        }

    except Exception as e:
        logger.error(f"获取回测策略列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/strategies", response_model=BacktestStrategyResponse, summary="创建回测策略")
async def create_backtest_strategy(
    strategy_data: BacktestStrategyRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    创建新的回测策略

    - **strategy_name**: 策略名称
    - **strategy_type**: 策略类型
    - **fund_codes**: 基金代码列表，逗号分隔
    - **investment_amount**: 投资金额
    - **investment_frequency**: 投资频率
    - **start_date**: 回测开始日期
    - **end_date**: 回测结束日期
    - **strategy_params**: 策略参数 (可选)
    """
    try:
        # 验证基金代码是否存在
        fund_codes = [code.strip() for code in strategy_data.fund_codes.split(',')]
        fund_query = select(Fund).where(Fund.fund_code.in_(fund_codes))
        fund_result = await db.execute(fund_query)
        existing_funds = fund_result.scalars().all()

        if len(existing_funds) != len(fund_codes):
            found_codes = [fund.fund_code for fund in existing_funds]
            missing_codes = [code for code in fund_codes if code not in found_codes]
            raise HTTPException(
                status_code=400,
                detail=f"以下基金代码不存在: {', '.join(missing_codes)}"
            )

        # 创建策略
        new_strategy = BacktestStrategy(
            strategy_name=strategy_data.strategy_name,
            strategy_type=strategy_data.strategy_type,
            fund_codes=strategy_data.fund_codes,
            investment_amount=strategy_data.investment_amount,
            investment_frequency=strategy_data.investment_frequency,
            start_date=strategy_data.start_date,
            end_date=strategy_data.end_date,
            strategy_params=strategy_data.strategy_params or {}
        )

        db.add(new_strategy)
        await db.commit()
        await db.refresh(new_strategy)

        logger.info(f"回测策略创建成功: {new_strategy.strategy_name}")

        return BacktestStrategyResponse(
            id=new_strategy.id,
            strategy_name=new_strategy.strategy_name,
            strategy_type=new_strategy.strategy_type,
            fund_codes=new_strategy.fund_codes,
            investment_amount=float(new_strategy.investment_amount),
            investment_frequency=new_strategy.investment_frequency,
            start_date=new_strategy.start_date.isoformat(),
            end_date=new_strategy.end_date.isoformat(),
            strategy_params=new_strategy.strategy_params or {},
            created_at=new_strategy.created_at.isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"创建回测策略失败: {e}")
        raise HTTPException(status_code=500, detail="创建回测策略失败")


@router.get("/strategies/{strategy_id}", response_model=BacktestStrategyResponse, summary="获取回测策略详情")
async def get_backtest_strategy(
    strategy_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """获取指定回测策略的详细信息"""
    try:
        strategy = await db.get(BacktestStrategy, strategy_id)
        if not strategy:
            raise HTTPException(status_code=404, detail="回测策略不存在")

        return BacktestStrategyResponse(
            id=strategy.id,
            strategy_name=strategy.strategy_name,
            strategy_type=strategy.strategy_type,
            fund_codes=strategy.fund_codes,
            investment_amount=float(strategy.investment_amount),
            investment_frequency=strategy.investment_frequency,
            start_date=strategy.start_date.isoformat(),
            end_date=strategy.end_date.isoformat(),
            strategy_params=strategy.strategy_params or {},
            created_at=strategy.created_at.isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取回测策略详情失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/strategies/{strategy_id}", response_model=BacktestStrategyResponse, summary="更新回测策略")
async def update_backtest_strategy(
    strategy_id: int,
    strategy_data: BacktestStrategyRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    更新指定的回测策略

    参数与创建策略相同
    """
    try:
        strategy = await db.get(BacktestStrategy, strategy_id)
        if not strategy:
            raise HTTPException(status_code=404, detail="回测策略不存在")

        # 验证基金代码是否存在
        fund_codes = [code.strip() for code in strategy_data.fund_codes.split(',')]
        fund_query = select(Fund).where(Fund.fund_code.in_(fund_codes))
        fund_result = await db.execute(fund_query)
        existing_funds = fund_result.scalars().all()

        if len(existing_funds) != len(fund_codes):
            found_codes = [fund.fund_code for fund in existing_funds]
            missing_codes = [code for code in fund_codes if code not in found_codes]
            raise HTTPException(
                status_code=400,
                detail=f"以下基金代码不存在: {', '.join(missing_codes)}"
            )

        # 更新策略
        strategy.strategy_name = strategy_data.strategy_name
        strategy.strategy_type = strategy_data.strategy_type
        strategy.fund_codes = strategy_data.fund_codes
        strategy.investment_amount = strategy_data.investment_amount
        strategy.investment_frequency = strategy_data.investment_frequency
        strategy.start_date = strategy_data.start_date
        strategy.end_date = strategy_data.end_date
        strategy.strategy_params = strategy_data.strategy_params or {}

        await db.commit()
        await db.refresh(strategy)

        logger.info(f"回测策略更新成功: {strategy.strategy_name}")

        return BacktestStrategyResponse(
            id=strategy.id,
            strategy_name=strategy.strategy_name,
            strategy_type=strategy.strategy_type,
            fund_codes=strategy.fund_codes,
            investment_amount=float(strategy.investment_amount),
            investment_frequency=strategy.investment_frequency,
            start_date=strategy.start_date.isoformat(),
            end_date=strategy.end_date.isoformat(),
            strategy_params=strategy.strategy_params or {},
            created_at=strategy.created_at.isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"更新回测策略失败: {e}")
        raise HTTPException(status_code=500, detail="更新回测策略失败")


@router.delete("/strategies/{strategy_id}", summary="删除回测策略")
async def delete_backtest_strategy(
    strategy_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """删除指定的回测策略"""
    try:
        strategy = await db.get(BacktestStrategy, strategy_id)
        if not strategy:
            raise HTTPException(status_code=404, detail="回测策略不存在")

        # 检查是否有关联的回测结果
        results_query = select(func.count(BacktestResult.id)).where(
            BacktestResult.strategy_id == strategy_id
        )
        results_count = await db.scalar(results_query)

        if results_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"该策略有 {results_count} 个回测结果，无法删除"
            )

        await db.delete(strategy)
        await db.commit()

        logger.info(f"回测策略删除成功: {strategy.strategy_name}")
        return {"message": "回测策略删除成功"}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"删除回测策略失败: {e}")
        raise HTTPException(status_code=500, detail="删除回测策略失败")


@router.post("/run", summary="执行回测任务")
async def run_backtest(
    run_data: RunBacktestRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db)
):
    """
    执行回测任务

    - **strategy_id**: 策略ID
    """
    try:
        strategy = await db.get(BacktestStrategy, run_data.strategy_id)
        if not strategy:
            raise HTTPException(status_code=404, detail="回测策略不存在")

        # 异步执行回测
        background_tasks.add_task(
            _execute_backtest,
            strategy_id=strategy.id,
            db_session=db
        )

        return {"message": "回测任务已启动", "strategy_id": strategy.id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"启动回测任务失败: {e}")
        raise HTTPException(status_code=500, detail="启动回测任务失败")


@router.get("/reports", response_model=Dict[str, Any], summary="获取回测报告列表")
async def get_backtest_reports(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    strategy_id: Optional[int] = Query(None, description="策略ID"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    获取回测报告列表，支持分页和筛选
    """
    try:
        # 构建查询
        query = select(BacktestResult)
        count_query = select(func.count(BacktestResult.id))

        # 添加筛选条件
        if strategy_id:
            query = query.where(BacktestResult.strategy_id == strategy_id)
            count_query = count_query.where(BacktestResult.strategy_id == strategy_id)

        # 获取总数
        total_count = await db.scalar(count_query)

        # 分页查询
        offset = (page - 1) * size
        query = query.offset(offset).limit(size).order_by(BacktestResult.created_at.desc())

        result = await db.execute(query)
        reports = result.scalars().all()

        # 转换为字典
        report_list = []
        for report in reports:
            report_dict = {
                "id": report.id,
                "strategy_id": report.strategy_id,
                "total_invested": float(report.total_invested),
                "total_value": float(report.total_value),
                "total_return": float(report.total_return),
                "annualized_return": float(report.annualized_return),
                "max_drawdown": float(report.max_drawdown),
                "sharpe_ratio": float(report.sharpe_ratio),
                "volatility": float(report.volatility),
                "win_rate": float(report.win_rate),
                "created_at": report.created_at.isoformat(),
            }
            report_list.append(report_dict)

        return {
            "data": report_list,
            "pagination": {
                "page": page,
                "size": size,
                "total": total_count,
                "pages": (total_count + size - 1) // size
            }
        }

    except Exception as e:
        logger.error(f"获取回测报告列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/{result_id}", response_model=BacktestResultResponse, summary="获取回测报告详情")
async def get_backtest_report(
    result_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """获取指定回测报告的详细信息"""
    try:
        result = await db.get(BacktestResult, result_id)
        if not result:
            raise HTTPException(status_code=404, detail="回测报告不存在")

        return BacktestResultResponse(
            id=result.id,
            strategy_id=result.strategy_id,
            total_invested=float(result.total_invested),
            total_value=float(result.total_value),
            total_return=float(result.total_return),
            annualized_return=float(result.annualized_return),
            max_drawdown=float(result.max_drawdown),
            sharpe_ratio=float(result.sharpe_ratio),
            volatility=float(result.volatility),
            win_rate=float(result.win_rate),
            created_at=result.created_at.isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取回测报告详情失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/reports/{result_id}", summary="删除回测报告")
async def delete_backtest_report(
    result_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """删除指定的回测报告"""
    try:
        result = await db.get(BacktestResult, result_id)
        if not result:
            raise HTTPException(status_code=404, detail="回测报告不存在")

        await db.delete(result)
        await db.commit()

        logger.info(f"回测报告删除成功: {result.id}")
        return {"message": "回测报告删除成功"}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"删除回测报告失败: {e}")
        raise HTTPException(status_code=500, detail="删除回测报告失败")


async def _execute_backtest(strategy_id: int, db_session: AsyncSession):
    """执行回测的后台任务"""
    try:
        backtest_engine = BacktestEngine(db_session)
        result = await backtest_engine.run_backtest(strategy_id)

        if result:
            logger.info(f"回测执行成功: 策略ID={strategy_id}, 结果ID={result.id}")
        else:
            logger.error(f"回测执行失败: 策略ID={strategy_id}")

    except Exception as e:
        logger.error(f"执行回测任务失败: {e}")