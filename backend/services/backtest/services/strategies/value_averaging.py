"""
价值平均策略
"""

from typing import Dict, List, Any, Tuple
from datetime import date
import pandas as pd
import numpy as np
from decimal import Decimal

from shared.utils import get_logger
from .base_strategy import BaseStrategy
from ..backtest_engine import BacktestConfig


class ValueAveragingStrategy(BaseStrategy):
    """价值平均策略 - 根据目标价值调整投资金额"""

    def __init__(self):
        super().__init__("价值平均策略")

    async def execute_backtest(self, config: BacktestConfig, historical_data: pd.DataFrame,
                             investment_dates: List[date]) -> Tuple[List[Dict[str, Any]], pd.Series]:
        """
        执行价值平均策略

        Args:
            config: 回测配置
            historical_data: 历史净值数据
            investment_dates: 投资日期列表

        Returns:
            Tuple[List[Dict[str, Any]], pd.Series]: (交易记录, 投资组合价值序列)
        """
        self.log_strategy_info(config)

        # 验证参数
        if not self.validate_params(config.strategy_params):
            raise ValueError("策略参数验证失败")

        # 获取策略参数
        base_investment = config.strategy_params.get('base_investment', float(config.investment_amount))
        target_value_growth_rate = config.strategy_params.get('target_value_growth_rate', 0.01)
        max_investment_multiplier = config.strategy_params.get('max_investment_multiplier', 3.0)
        min_investment_multiplier = config.strategy_params.get('min_investment_multiplier', 0.1)
        fund_allocation = config.strategy_params.get('fund_allocation', {})
        fee_rate = config.strategy_params.get('fee_rate', 0.001)

        # 初始化变量
        transactions = []
        holdings = {}
        cash = float(config.initial_amount)
        period = 0

        # 处理基金分配
        if not fund_allocation:
            # 平均分配
            fund_allocation = {fund_code: 1.0 / len(config.fund_codes) for fund_code in config.fund_codes}
        else:
            # 确保所有基金都有分配
            for fund_code in config.fund_codes:
                if fund_code not in fund_allocation:
                    fund_allocation[fund_code] = 0.0

        # 生成投资组合价值序列
        portfolio_values = []

        # 遍历每个交易日
        for trading_day in historical_data.index:
            # 计算当前投资组合价值
            current_portfolio_value = cash + self.calculate_portfolio_value(holdings, historical_data.loc[trading_day])
            portfolio_values.append(current_portfolio_value)

            # 检查是否为投资日
            if trading_day in investment_dates:
                period += 1

                # 计算目标价值 (考虑增长)
                target_portfolio_value = float(config.initial_amount) + (base_investment * period * (1 + target_value_growth_rate) ** (period - 1))

                # 计算需要投资的金额
                required_investment = target_portfolio_value - current_portfolio_value

                # 限制投资金额范围
                max_investment = base_investment * max_investment_multiplier
                min_investment = base_investment * min_investment_multiplier

                if required_investment > 0:
                    # 需要买入
                    investment_amount = min(max_investment, max(min_investment, required_investment))
                    if cash >= investment_amount:
                        # 按分配比例买入各基金
                        for fund_code, allocation in fund_allocation.items():
                            if allocation > 0 and fund_code in historical_data.columns:
                                nav_price = historical_data.loc[trading_day, fund_code]
                                if pd.notna(nav_price) and nav_price > 0:
                                    # 计算该基金的投资金额
                                    fund_investment = investment_amount * allocation

                                    # 应用手续费
                                    investment_after_fee = fund_investment * (1 - fee_rate)

                                    # 计算份额
                                    shares = investment_after_fee / nav_price

                                    # 更新持仓和现金
                                    holdings[fund_code] = holdings.get(fund_code, 0) + shares
                                    cash -= fund_investment

                                    # 记录交易
                                    transaction = self.create_transaction(
                                        date=trading_day,
                                        fund_code=fund_code,
                                        action='buy',
                                        amount=Decimal(str(investment_after_fee)),
                                        shares=Decimal(str(shares)),
                                        nav_price=nav_price
                                    )
                                    transactions.append(transaction)

                elif required_investment < 0 and abs(required_investment) > base_investment * 0.1:
                    # 需要卖出 (当价值过高时)
                    sell_amount = min(abs(required_investment), current_portfolio_value * 0.2)  # 最多卖出20%

                    # 按比例卖出各基金
                    total_value = self.calculate_portfolio_value(holdings, historical_data.loc[trading_day])
                    if total_value > 0:
                        for fund_code, allocation in fund_allocation.items():
                            if allocation > 0 and fund_code in holdings and holdings.get(fund_code, 0) > 0:
                                fund_sell_value = sell_amount * allocation
                                nav_price = historical_data.loc[trading_day, fund_code]

                                if pd.notna(nav_price) and nav_price > 0:
                                    shares_to_sell = fund_sell_value / nav_price
                                    available_shares = holdings.get(fund_code, 0)

                                    if shares_to_sell <= available_shares:
                                        # 更新持仓和现金
                                        holdings[fund_code] = available_shares - shares_to_sell
                                        cash += fund_sell_value * (1 - fee_rate)  # 卖出也有手续费

                                        # 记录交易
                                        transaction = self.create_transaction(
                                            date=trading_day,
                                            fund_code=fund_code,
                                            action='sell',
                                            amount=Decimal(str(fund_sell_value * (1 - fee_rate))),
                                            shares=Decimal(str(shares_to_sell)),
                                            nav_price=nav_price
                                        )
                                        transactions.append(transaction)

        # 创建投资组合价值序列
        portfolio_series = pd.Series(portfolio_values, index=historical_data.index)

        self.logger.info(f"价值平均策略执行完成 - 总交易次数: {len(transactions)}, 最终价值: ¥{portfolio_series.iloc[-1]:.2f}")

        return transactions, portfolio_series

    def get_required_params(self) -> List[str]:
        """获取策略必需参数"""
        return []

    def get_default_params(self) -> Dict[str, Any]:
        """获取默认参数"""
        return {
            'base_investment': 1000.0,           # 基础投资金额
            'target_value_growth_rate': 0.01,    # 目标价值增长率
            'max_investment_multiplier': 3.0,     # 最大投资倍数
            'min_investment_multiplier': 0.1,     # 最小投资倍数
            'fund_allocation': {},               # 基金分配比例 (可选)
            'fee_rate': 0.001,                   # 手续费率
            'rebalance_threshold': 0.1,          # 再平衡阈值
            'sell_threshold': 0.2                # 卖出阈值
        }

    def validate_params(self, params: Dict[str, Any]) -> bool:
        """验证参数"""
        if not super().validate_params(params):
            return False

        # 验证基础投资金额
        base_investment = params.get('base_investment', 0)
        if base_investment <= 0:
            self.logger.error("基础投资金额必须大于0")
            return False

        # 验证目标价值增长率
        target_value_growth_rate = params.get('target_value_growth_rate', 0)
        if target_value_growth_rate < -0.5 or target_value_growth_rate > 0.5:
            self.logger.error("目标价值增长率必须在-50%到50%之间")
            return False

        # 验证投资倍数
        max_multiplier = params.get('max_investment_multiplier', 1)
        min_multiplier = params.get('min_investment_multiplier', 1)

        if max_multiplier <= 0 or min_multiplier <= 0:
            self.logger.error("投资倍数必须大于0")
            return False

        if max_multiplier <= min_multiplier:
            self.logger.error("最大投资倍数必须大于最小投资倍数")
            return False

        return True

    def calculate_target_value_path(self, initial_value: float, base_investment: float,
                                  periods: int, growth_rate: float) -> List[float]:
        """
        计算目标价值路径

        Args:
            initial_value: 初始价值
            base_investment: 基础投资金额
            periods: 期数
            growth_rate: 增长率

        Returns:
            List[float]: 目标价值路径
        """
        target_values = [initial_value]

        for i in range(1, periods + 1):
            # 复利增长公式
            target_value = initial_value + base_investment * i * ((1 + growth_rate) ** (i - 1))
            target_values.append(target_value)

        return target_values

    def simulate_different_growth_rates(self, config: BacktestConfig, historical_data: pd.DataFrame,
                                        investment_dates: List[date],
                                        growth_rates: List[float]) -> Dict[str, Any]:
        """
        模拟不同目标价值增长率的效果

        Args:
            config: 回测配置
            historical_data: 历史净值数据
            investment_dates: 投资日期列表
            growth_rates: 增长率列表

        Returns:
            Dict[str, Any]: 模拟结果
        """
        results = {}

        for growth_rate in growth_rates:
            try:
                # 修改增长率
                modified_config = BacktestConfig(
                    strategy_id=config.strategy_id,
                    start_date=config.start_date,
                    end_date=config.end_date,
                    initial_amount=config.initial_amount,
                    investment_frequency=config.investment_frequency,
                    strategy_params={**config.strategy_params, 'target_value_growth_rate': growth_rate},
                    fund_codes=config.fund_codes
                )

                # 执行回测
                transactions, portfolio_values = await self.execute_backtest(
                    modified_config, historical_data, investment_dates
                )

                # 计算指标
                if len(portfolio_values) > 0:
                    final_value = portfolio_values.iloc[-1]
                    total_invested = float(config.initial_amount) + sum(
                        tx['amount'] for tx in transactions if tx['action'] == 'buy'
                    )
                    total_return = (final_value - total_invested) / total_invested if total_invested > 0 else 0

                    results[str(growth_rate)] = {
                        'final_value': final_value,
                        'total_invested': total_invested,
                        'total_return': total_return,
                        'total_transactions': len(transactions),
                        'buy_transactions': len([tx for tx in transactions if tx['action'] == 'buy']),
                        'sell_transactions': len([tx for tx in transactions if tx['action'] == 'sell'])
                    }

            except Exception as e:
                self.logger.error(f"模拟增长率 {growth_rate} 失败: {e}")
                results[str(growth_rate)] = {'error': str(e)}

        return results

    def get_strategy_info(self) -> Dict[str, Any]:
        """获取策略详细信息"""
        return {
            'strategy_name': self.strategy_name,
            'strategy_type': 'value_averaging',
            'description': """
            价值平均策略是一种动态投资策略，根据目标投资组合价值来调整投资金额。
            当当前价值低于目标价值时增加投资，当高于目标价值时减少投资。

            主要特点：
            - 动态调整投资金额，价值低于目标时多投，高于目标时少投
            - 通过反向操作实现"低买高卖"
            - 需要设定目标价值路径和增长率
            - 相比定投策略，可能获得更好的收益
            """,
            'advantages': [
                '实现低买高卖，可能获得超额收益',
                '自动调整投资节奏',
                '适合波动较大的市场',
                '能够更好地控制风险'
            ],
            'disadvantages': [
                '策略相对复杂，需要更多参数设置',
                '在单边市场中可能效果不佳',
                '需要较强的纪律性',
                '手续费成本可能较高'
            ],
            'required_params': self.get_required_params(),
            'default_params': self.get_default_params(),
            'suitable_for': [
                '有一定投资经验的投资者',
                '希望获得超额收益的投资者',
                '能够承受策略复杂性的投资者',
                '长期投资者'
            ],
            'parameter_explanations': {
                'base_investment': '基础投资金额，每期的基准投资额',
                'target_value_growth_rate': '目标价值增长率，决定投资组合价值增长目标',
                'max_investment_multiplier': '最大投资倍数，限制单期最大投资金额',
                'min_investment_multiplier': '最小投资倍数，限制单期最小投资金额',
                'fund_allocation': '基金分配比例，确定各基金的权重',
                'fee_rate': '手续费率，买卖交易的成本',
                'rebalance_threshold': '再平衡阈值',
                'sell_threshold': '卖出阈值，触发卖出的条件'
            }
        }