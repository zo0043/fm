"""
定投策略
"""

from typing import Dict, List, Any, Tuple
from datetime import date
import pandas as pd
import numpy as np
from decimal import Decimal

from shared.utils import get_logger
from .base_strategy import BaseStrategy
from ..backtest_engine import BacktestConfig


class RegularInvestmentStrategy(BaseStrategy):
    """定投策略 - 定期定额投资"""

    def __init__(self):
        super().__init__("定期定额定投策略")

    async def execute_backtest(self, config: BacktestConfig, historical_data: pd.DataFrame,
                             investment_dates: List[date]) -> Tuple[List[Dict[str, Any]], pd.Series]:
        """
        执行定投策略

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
        investment_amount = config.strategy_params.get('investment_amount', config.investment_amount)
        fund_allocation = config.strategy_params.get('fund_allocation', {})
        fee_rate = config.strategy_params.get('fee_rate', 0.001)

        # 初始化变量
        transactions = []
        holdings = {}
        cash = float(config.initial_amount)

        # 处理基金分配
        if not fund_allocation:
            # 平均分配
            fund_allocation = {fund_code: 1.0 / len(config.fund_codes) for fund_code in config.fund_codes}
        else:
            # 确保所有基金都有分配
            for fund_code in config.fund_codes:
                if fund_code not in fund_allocation:
                    fund_allocation[fund_code] = 0.0

        # 验证分配比例
        total_allocation = sum(fund_allocation.values())
        if abs(total_allocation - 1.0) > 0.01:  # 允许1%的误差
            self.logger.warning(f"基金分配比例总和不为1: {total_allocation}")

        # 生成投资组合价值序列
        portfolio_values = []

        # 遍历每个交易日
        for trading_day in historical_data.index:
            # 检查是否为投资日
            if trading_day in investment_dates:
                # 执行定投
                for fund_code, allocation in fund_allocation.items():
                    if allocation > 0 and fund_code in historical_data.columns:
                        nav_price = historical_data.loc[trading_day, fund_code]
                        if pd.notna(nav_price) and nav_price > 0:
                            # 计算投资金额
                            fund_investment = float(investment_amount) * allocation
                            if cash >= fund_investment:
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

            # 计算当日投资组合价值
            portfolio_value = cash + self.calculate_portfolio_value(holdings, historical_data.loc[trading_day])
            portfolio_values.append(portfolio_value)

        # 创建投资组合价值序列
        portfolio_series = pd.Series(portfolio_values, index=historical_data.index)

        self.logger.info(f"定投策略执行完成 - 总交易次数: {len(transactions)}, 最终价值: ¥{portfolio_series.iloc[-1]:.2f}")

        return transactions, portfolio_series

    def get_required_params(self) -> List[str]:
        """获取策略必需参数"""
        return []

    def get_default_params(self) -> Dict[str, Any]:
        """获取默认参数"""
        return {
            'investment_amount': 1000.0,  # 每期投资金额
            'fund_allocation': {},        # 基金分配比例 (可选)
            'fee_rate': 0.001,           # 手续费率
            'rebalance_frequency': 'monthly',  # 再平衡频率
            'rebalance_threshold': 0.05      # 再平衡阈值
        }

    def validate_params(self, params: Dict[str, Any]) -> bool:
        """验证参数"""
        if not super().validate_params(params):
            return False

        # 验证投资金额
        investment_amount = params.get('investment_amount', 0)
        if investment_amount <= 0:
            self.logger.error("投资金额必须大于0")
            return False

        # 验证手续费率
        fee_rate = params.get('fee_rate', 0)
        if fee_rate < 0 or fee_rate >= 1:
            self.logger.error("手续费率必须在0到1之间")
            return False

        # 验证基金分配比例
        fund_allocation = params.get('fund_allocation', {})
        if fund_allocation:
            total_allocation = sum(fund_allocation.values())
            if total_allocation <= 0 or abs(total_allocation - 1.0) > 0.01:
                self.logger.warning(f"基金分配比例异常: {total_allocation}")

        return True

    def calculate_optimal_allocation(self, historical_data: pd.DataFrame,
                                  risk_tolerance: str = 'medium') -> Dict[str, float]:
        """
        计算最优基金分配比例

        Args:
            historical_data: 历史净值数据
            risk_tolerance: 风险承受能力 (low/medium/high)

        Returns:
            Dict[str, float]: 基金分配比例
        """
        try:
            # 计算各基金的收益率和风险
            returns = historical_data.pct_change().dropna()

            # 根据风险承受能力调整分配
            if risk_tolerance == 'low':
                # 低风险倾向：倾向于波动率低的基金
                volatility = returns.std()
                weights = 1 / (volatility + 1e-8)  # 避免除零
                weights = weights / weights.sum()

            elif risk_tolerance == 'high':
                # 高风险倾向：倾向于收益率高的基金
                total_returns = (historical_data.iloc[-1] / historical_data.iloc[0]) - 1
                weights = total_returns
                weights = weights / weights.sum()

            else:  # medium
                # 中等风险：等权重
                weights = pd.Series([1.0] * len(historical_data.columns), index=historical_data.columns)
                weights = weights / weights.sum()

            return weights.to_dict()

        except Exception as e:
            self.logger.error(f"计算最优分配失败: {e}")
            # 返回等权重
            return {fund_code: 1.0 / len(historical_data.columns) for fund_code in historical_data.columns}

    def simulate_different_amounts(self, config: BacktestConfig, historical_data: pd.DataFrame,
                                  investment_dates: List[date],
                                  amounts: List[float]) -> Dict[str, Any]:
        """
        模拟不同投资金额的效果

        Args:
            config: 回测配置
            historical_data: 历史净值数据
            investment_dates: 投资日期列表
            amounts: 投资金额列表

        Returns:
            Dict[str, Any]: 模拟结果
        """
        results = {}

        for amount in amounts:
            try:
                # 修改投资金额
                modified_config = BacktestConfig(
                    strategy_id=config.strategy_id,
                    start_date=config.start_date,
                    end_date=config.end_date,
                    initial_amount=Decimal(str(amount)),
                    investment_frequency=config.investment_frequency,
                    strategy_params={**config.strategy_params, 'investment_amount': amount},
                    fund_codes=config.fund_codes
                )

                # 执行回测
                transactions, portfolio_values = await self.execute_backtest(
                    modified_config, historical_data, investment_dates
                )

                # 计算指标
                if len(portfolio_values) > 0:
                    final_value = portfolio_values.iloc[-1]
                    total_invested = amount * len(investment_dates)
                    total_return = (final_value - total_invested) / total_invested if total_invested > 0 else 0

                    results[str(amount)] = {
                        'final_value': final_value,
                        'total_invested': total_invested,
                        'total_return': total_return,
                        'total_transactions': len(transactions)
                    }

            except Exception as e:
                self.logger.error(f"模拟金额 {amount} 失败: {e}")
                results[str(amount)] = {'error': str(e)}

        return results

    def get_strategy_info(self) -> Dict[str, Any]:
        """获取策略详细信息"""
        return {
            'strategy_name': self.strategy_name,
            'strategy_type': 'regular_investment',
            'description': """
            定期定额定投策略是一种简单有效的投资方式，通过定期投入固定金额，
            利用价格波动摊平成本，降低市场择时风险。

            主要特点：
            - 定期定额投资，纪律性强
            - 摊平成本，降低市场波动影响
            - 适合长期投资，复利效应明显
            - 操作简单，适合新手投资者
            """,
            'advantages': [
                '操作简单，易于执行',
                '摊平成本，降低风险',
                '强制储蓄，培养投资习惯',
                '适合长期投资'
            ],
            'disadvantages': [
                '在牛市中可能收益不如一次性投入',
                '需要长期坚持才能体现效果',
                '手续费成本相对较高'
            ],
            'required_params': self.get_required_params(),
            'default_params': self.get_default_params(),
            'suitable_for': [
                '新手投资者',
                '有稳定现金流的投资者',
                '长期投资者',
                '风险厌恶型投资者'
            ]
        }