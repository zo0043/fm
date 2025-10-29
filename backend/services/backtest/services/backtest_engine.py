"""
回测引擎核心
"""

import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, date, timedelta
from decimal import Decimal
import pandas as pd
import numpy as np
from dataclasses import dataclass

from shared.utils import get_logger, log_performance
from shared.database import get_async_db
from shared.database.models import NetAssetValue, BacktestStrategy, BacktestResult
from .strategies.base_strategy import BaseStrategy
from .strategies.regular_investment import RegularInvestmentStrategy
from .strategies.value_averaging import ValueAveragingStrategy
from .performance_calculator import PerformanceCalculator


@dataclass
class BacktestConfig:
    """回测配置"""
    strategy_id: int
    start_date: date
    end_date: date
    initial_amount: Decimal
    investment_frequency: str  # daily, weekly, monthly
    strategy_params: Dict[str, Any]
    fund_codes: List[str]


@dataclass
class BacktestResult:
    """回测结果"""
    strategy_id: int
    total_invested: Decimal
    total_value: Decimal
    total_return: Decimal
    annualized_return: Decimal
    max_drawdown: Decimal
    sharpe_ratio: Decimal
    volatility: Decimal
    win_rate: Decimal
    transactions: List[Dict[str, Any]]
    performance_series: pd.DataFrame
    benchmark_return: Optional[Decimal] = None
    alpha: Optional[Decimal] = None
    beta: Optional[Decimal] = None


class BacktestEngine:
    """回测引擎"""

    def __init__(self):
        self.logger = get_logger(self.__class__.__name__)
        self.strategies = {
            'regular_investment': RegularInvestmentStrategy(),
            'value_averaging': ValueAveragingStrategy(),
        }
        self.performance_calculator = PerformanceCalculator()
        self.is_running = False
        self.stats = {
            "total_backtests": 0,
            "successful_backtests": 0,
            "failed_backtests": 0,
            "average_processing_time": 0,
            "last_backtest_time": None,
            "start_time": None
        }

    async def start(self):
        """启动回测引擎"""
        try:
            self.is_running = True
            self.stats["start_time"] = datetime.now().isoformat()
            self.logger.info("回测引擎启动成功")
        except Exception as e:
            self.logger.error(f"回测引擎启动失败: {e}")
            raise

    async def stop(self):
        """停止回测引擎"""
        try:
            self.is_running = False
            self.logger.info("回测引擎已停止")
        except Exception as e:
            self.logger.error(f"回测引擎停止失败: {e}")

    @log_performance
    async def run_backtest(self, strategy_id: int, start_date: str, end_date: str,
                          initial_amount: float, investment_frequency: str) -> Dict[str, Any]:
        """
        执行回测

        Args:
            strategy_id: 策略ID
            start_date: 开始日期
            end_date: 结束日期
            initial_amount: 初始金额
            investment_frequency: 投资频率

        Returns:
            Dict[str, Any]: 回测结果
        """
        if not self.is_running:
            raise RuntimeError("回测引擎未启动")

        start_time = datetime.now()

        try:
            # 1. 加载策略配置
            strategy_config = await self._load_strategy_config(strategy_id)
            if not strategy_config:
                raise ValueError(f"策略 {strategy_id} 不存在或未激活")

            # 2. 构建回测配置
            backtest_config = BacktestConfig(
                strategy_id=strategy_id,
                start_date=datetime.strptime(start_date, '%Y-%m-%d').date(),
                end_date=datetime.strptime(end_date, '%Y-%m-%d').date(),
                initial_amount=Decimal(str(initial_amount)),
                investment_frequency=investment_frequency,
                strategy_params=strategy_config.get('strategy_params', {}),
                fund_codes=strategy_config.get('fund_codes', '').split(',')
            )

            # 3. 验证配置
            await self._validate_backtest_config(backtest_config)

            # 4. 获取历史数据
            historical_data = await self._get_historical_data(backtest_config)

            # 5. 执行回测
            backtest_result = await self._execute_backtest(backtest_config, historical_data)

            # 6. 保存结果
            result_id = await self._save_backtest_result(backtest_result)

            # 7. 生成报告
            await self._generate_backtest_report(result_id, backtest_result)

            duration = (datetime.now() - start_time).total_seconds()

            # 更新统计信息
            self.stats.update({
                "total_backtests": self.stats["total_backtests"] + 1,
                "successful_backtests": self.stats["successful_backtests"] + 1,
                "last_backtest_time": datetime.now().isoformat(),
                "average_processing_time": (
                    (self.stats["average_processing_time"] * (self.stats["total_backtests"] - 1) + duration)
                    / self.stats["total_backtests"]
                )
            })

            result_summary = {
                "success": True,
                "result_id": result_id,
                "strategy_id": strategy_id,
                "summary": {
                    "total_invested": float(backtest_result.total_invested),
                    "total_value": float(backtest_result.total_value),
                    "total_return": float(backtest_result.total_return),
                    "annualized_return": float(backtest_result.annualized_return),
                    "max_drawdown": float(backtest_result.max_drawdown),
                    "sharpe_ratio": float(backtest_result.sharpe_ratio),
                    "volatility": float(backtest_result.volatility),
                    "win_rate": float(backtest_result.win_rate),
                },
                "duration_seconds": duration
            }

            self.logger.info(f"回测完成: {result_summary}")
            return result_summary

        except Exception as e:
            error_msg = f"回测执行失败: {e}"
            self.logger.error(error_msg)
            self.stats["failed_backtests"] += 1

            duration = (datetime.now() - start_time).total_seconds()
            return {
                "success": False,
                "error": str(e),
                "strategy_id": strategy_id,
                "duration_seconds": duration
            }

    async def _load_strategy_config(self, strategy_id: int) -> Optional[Dict[str, Any]]:
        """加载策略配置"""
        try:
            async with get_async_db().__aenter__() as session:
                strategy = await session.get(BacktestStrategy, strategy_id)
                if strategy:
                    return {
                        "strategy_name": strategy.strategy_name,
                        "strategy_type": strategy.strategy_type,
                        "fund_codes": strategy.fund_codes,
                        "investment_amount": strategy.investment_amount,
                        "investment_frequency": strategy.investment_frequency,
                        "strategy_params": strategy.strategy_params or {}
                    }
                return None
        except Exception as e:
            self.logger.error(f"加载策略配置失败 {strategy_id}: {e}")
            return None

    async def _validate_backtest_config(self, config: BacktestConfig):
        """验证回测配置"""
        # 验证日期范围
        if config.start_date >= config.end_date:
            raise ValueError("开始日期必须早于结束日期")

        # 验证日期范围不超过5年
        if (config.end_date - config.start_date).days > 365 * 5:
            raise ValueError("回测时间范围不能超过5年")

        # 验证初始金额
        if config.initial_amount <= 0:
            raise ValueError("初始金额必须大于0")

        # 验证基金代码
        if not config.fund_codes:
            raise ValueError("必须指定至少一个基金代码")

        # 验证投资频率
        valid_frequencies = ['daily', 'weekly', 'monthly']
        if config.investment_frequency not in valid_frequencies:
            raise ValueError(f"投资频率必须是: {valid_frequencies}")

        # 验证策略类型
        if config.strategy_params.get('strategy_type') not in self.strategies:
            raise ValueError(f"不支持的策略类型: {config.strategy_params.get('strategy_type')}")

    async def _get_historical_data(self, config: BacktestConfig) -> pd.DataFrame:
        """获取历史净值数据"""
        try:
            async with get_async_db().__aenter__() as session:
                # 构建查询
                from sqlalchemy import select, and_

                query = select(NetAssetValue).where(
                    and_(
                        NetAssetValue.fund_code.in_(config.fund_codes),
                        NetAssetValue.nav_date >= config.start_date,
                        NetAssetValue.nav_date <= config.end_date
                    )
                ).order_by(NetAssetValue.nav_date)

                result = await session.execute(query)
                navs = result.scalars().all()

                if not navs:
                    raise ValueError("指定时间范围内没有找到净值数据")

                # 转换为DataFrame
                data = []
                for nav in navs:
                    data.append({
                        'fund_code': nav.fund_code,
                        'nav_date': nav.nav_date,
                        'unit_nav': float(nav.unit_nav),
                        'accumulated_nav': float(nav.accumulated_nav),
                        'daily_change_rate': float(nav.daily_change_rate) if nav.daily_change_rate else 0,
                    })

                df = pd.DataFrame(data)

                # 透视数据，使日期为索引，基金代码为列
                pivot_df = df.pivot(index='nav_date', columns='fund_code', values='unit_nav')

                # 填充缺失值
                pivot_df = pivot_df.fillna(method='ffill').fillna(method='bfill')

                self.logger.info(f"获取历史数据: {len(pivot_df)} 个交易日, {len(pivot_df.columns)} 个基金")
                return pivot_df

        except Exception as e:
            self.logger.error(f"获取历史数据失败: {e}")
            raise

    async def _execute_backtest(self, config: BacktestConfig, historical_data: pd.DataFrame) -> BacktestResult:
        """执行回测"""
        try:
            # 获取策略实例
            strategy_type = config.strategy_params.get('strategy_type', 'regular_investment')
            strategy = self.strategies.get(strategy_type)
            if not strategy:
                raise ValueError(f"未找到策略: {strategy_type}")

            # 生成投资日期
            investment_dates = self._generate_investment_dates(config)

            # 执行策略
            transactions, portfolio_values = await strategy.execute_backtest(
                config, historical_data, investment_dates
            )

            # 计算性能指标
            performance_metrics = self.performance_calculator.calculate_performance(
                portfolio_values, historical_data
            )

            # 构建回测结果
            total_invested = sum(tx['amount'] for tx in transactions)
            total_value = portfolio_values.iloc[-1] if len(portfolio_values) > 0 else 0

            backtest_result = BacktestResult(
                strategy_id=config.strategy_id,
                total_invested=Decimal(str(total_invested)),
                total_value=Decimal(str(total_value)),
                total_return=Decimal(str(performance_metrics['total_return'])),
                annualized_return=Decimal(str(performance_metrics['annualized_return'])),
                max_drawdown=Decimal(str(performance_metrics['max_drawdown'])),
                sharpe_ratio=Decimal(str(performance_metrics['sharpe_ratio'])),
                volatility=Decimal(str(performance_metrics['volatility'])),
                win_rate=Decimal(str(performance_metrics['win_rate'])),
                transactions=transactions,
                performance_series=portfolio_values,
                benchmark_return=Decimal(str(performance_metrics.get('benchmark_return', 0))),
                alpha=Decimal(str(performance_metrics.get('alpha', 0))),
                beta=Decimal(str(performance_metrics.get('beta', 0)))
            )

            return backtest_result

        except Exception as e:
            self.logger.error(f"执行回测失败: {e}")
            raise

    def _generate_investment_dates(self, config: BacktestConfig) -> List[date]:
        """生成投资日期列表"""
        dates = []
        current_date = config.start_date

        while current_date <= config.end_date:
            # 跳过周末
            if current_date.weekday() < 5:  # 0=Monday, 4=Friday
                dates.append(current_date)

            # 根据频率增加日期
            if config.investment_frequency == 'daily':
                current_date += timedelta(days=1)
            elif config.investment_frequency == 'weekly':
                current_date += timedelta(weeks=1)
            elif config.investment_frequency == 'monthly':
                # 移到下个月同一天
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)

        return dates

    async def _save_backtest_result(self, result: BacktestResult) -> int:
        """保存回测结果"""
        try:
            async with get_async_db().__aenter__() as session:
                backtest_result = BacktestResult(
                    strategy_id=result.strategy_id,
                    total_invested=result.total_invested,
                    total_value=result.total_value,
                    total_return=result.total_return,
                    annualized_return=result.annualized_return,
                    max_drawdown=result.max_drawdown,
                    sharpe_ratio=result.sharpe_ratio,
                    volatility=result.volatility,
                    win_rate=result.win_rate,
                )

                session.add(backtest_result)
                await session.commit()
                await session.refresh(backtest_result)

                self.logger.info(f"回测结果已保存: {backtest_result.id}")
                return backtest_result.id

        except Exception as e:
            self.logger.error(f"保存回测结果失败: {e}")
            raise

    async def _generate_backtest_report(self, result_id: int, backtest_result: BacktestResult):
        """生成回测报告"""
        try:
            # 这里可以生成更详细的报告，包括图表等
            # 为了演示，只生成基本的文本报告
            report = self._generate_text_report(backtest_result)

            # 保存报告到文件或数据库
            report_path = f"./reports/backtest_{result_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"

            import os
            os.makedirs('./reports', exist_ok=True)

            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(report)

            self.logger.info(f"回测报告已生成: {report_path}")

        except Exception as e:
            self.logger.error(f"生成回测报告失败: {e}")

    def _generate_text_report(self, result: BacktestResult) -> str:
        """生成文本报告"""
        report = f"""
基金回测报告
========================================

策略ID: {result.strategy_id}
回测时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

投资总结
----------------------------------------
总投资金额: ¥{result.total_invested:,.2f}
最终价值: ¥{result.total_value:,.2f}
总收益: ¥{result.total_value - result.total_invested:,.2f}
总收益率: {result.total_return * 100:.2f}%
年化收益率: {result.annualized_return * 100:.2f}%

风险评估
----------------------------------------
最大回撤: {result.max_drawdown * 100:.2f}%
夏普比率: {result.sharpe_ratio:.4f}
波动率: {result.volatility * 100:.2f}%
胜率: {result.win_rate * 100:.2f}%

交易统计
----------------------------------------
总交易次数: {len(result.transactions)}
"""

        return report.strip()

    async def get_stats(self) -> Dict[str, Any]:
        """获取回测引擎统计信息"""
        try:
            # 获取数据库统计信息
            from sqlalchemy import select, func
            from shared.database.models import BacktestResult

            async with get_async_db().__aenter__() as session:
                # 总回测次数
                total_backtests = await session.scalar(select(func.count(BacktestResult.id)))

                # 成功回测次数
                successful_backtests = await session.scalar(
                    select(func.count(BacktestResult.id)).where(
                        BacktestResult.total_return >= 0
                    )
                )

                # 平均收益率
                avg_return = await session.scalar(
                    select(func.avg(BacktestResult.total_return))
                )

                # 最大收益率
                max_return = await session.scalar(
                    select(func.max(BacktestResult.total_return))
                )

                # 最小收益率
                min_return = await session.scalar(
                    select(func.min(BacktestResult.total_return))
                )

            return {
                "engine_stats": self.stats,
                "database_stats": {
                    "total_backtests": total_backtests or 0,
                    "successful_backtests": successful_backtests or 0,
                    "success_rate": (successful_backtests / total_backtests) if total_backtests else 0,
                    "average_return": float(avg_return) if avg_return else 0,
                    "max_return": float(max_return) if max_return else 0,
                    "min_return": float(min_return) if min_return else 0,
                },
                "runtime_info": {
                    "is_running": self.is_running,
                    "available_strategies": list(self.strategies.keys()),
                    "uptime_seconds": (
                        (datetime.now() - datetime.fromisoformat(self.stats["start_time"]))
                        .total_seconds()
                        if self.stats.get("start_time") else 0
                    )
                }
            }

        except Exception as e:
            self.logger.error(f"获取回测统计失败: {e}")
            return {"error": str(e)}