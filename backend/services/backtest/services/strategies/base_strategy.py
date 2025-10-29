"""
回测策略基类
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Tuple
from datetime import date, timedelta
import pandas as pd
import numpy as np
from decimal import Decimal

from shared.utils import get_logger
from ..backtest_engine import BacktestConfig


class BaseStrategy(ABC):
    """回测策略基类"""

    def __init__(self, strategy_name: str):
        self.strategy_name = strategy_name
        self.logger = get_logger(self.__class__.__name__)

    @abstractmethod
    async def execute_backtest(self, config: BacktestConfig, historical_data: pd.DataFrame,
                             investment_dates: List[date]) -> Tuple[List[Dict[str, Any]], pd.Series]:
        """
        执行回测策略

        Args:
            config: 回测配置
            historical_data: 历史净值数据
            investment_dates: 投资日期列表

        Returns:
            Tuple[List[Dict[str, Any]], pd.Series]: (交易记录, 投资组合价值序列)
        """
        pass

    @abstractmethod
    def get_required_params(self) -> List[str]:
        """获取策略必需参数"""
        pass

    def get_default_params(self) -> Dict[str, Any]:
        """获取默认参数"""
        return {}

    def validate_params(self, params: Dict[str, Any]) -> bool:
        """验证参数"""
        required_params = self.get_required_params()
        for param in required_params:
            if param not in params:
                self.logger.error(f"缺少必需参数: {param}")
                return False
        return True

    def calculate_position_size(self, available_cash: Decimal, nav_price: float,
                              strategy_params: Dict[str, Any]) -> Decimal:
        """
        计算头寸大小

        Args:
            available_cash: 可用现金
            nav_price: 净值价格
            strategy_params: 策略参数

        Returns:
            Decimal: 投入金额
        """
        # 默认实现：固定金额投资
        investment_amount = strategy_params.get('investment_amount', 1000.0)
        return Decimal(str(min(float(available_cash), investment_amount)))

    def create_transaction(self, date: date, fund_code: str, action: str,
                          amount: Decimal, shares: Decimal, nav_price: float) -> Dict[str, Any]:
        """
        创建交易记录

        Args:
            date: 交易日期
            fund_code: 基金代码
            action: 操作类型 (buy/sell)
            amount: 金额
            shares: 份额
            nav_price: 净值价格

        Returns:
            Dict[str, Any]: 交易记录
        """
        return {
            'date': date.isoformat(),
            'fund_code': fund_code,
            'action': action,
            'amount': float(amount),
            'shares': float(shares),
            'nav_price': nav_price,
            'value': float(shares * nav_price)
        }

    def calculate_portfolio_value(self, holdings: Dict[str, float], nav_prices: pd.Series) -> float:
        """
        计算投资组合价值

        Args:
            holdings: 持仓 (基金代码 -> 份额)
            nav_prices: 净值价格序列

        Returns:
            float: 投资组合总价值
        """
        total_value = 0.0
        for fund_code, shares in holdings.items():
            if fund_code in nav_prices and not pd.isna(nav_prices[fund_code]):
                total_value += shares * nav_prices[fund_code]
        return total_value

    def is_trading_day(self, date: date, historical_data: pd.DataFrame) -> bool:
        """检查是否为交易日"""
        return date in historical_data.index

    def get_nearest_trading_day(self, target_date: date, historical_data: pd.DataFrame) -> date:
        """获取最近的交易日"""
        if target_date in historical_data.index:
            return target_date

        # 查找最近的日期
        dates = historical_data.index.tolist()
        target = target_date

        # 向前查找
        for i in range(len(dates) - 1, -1, -1):
            if dates[i] < target:
                return dates[i]

        # 如果找不到，返回最早的日期
        return dates[0] if dates else target_date

    def rebalance_portfolio(self, holdings: Dict[str, float], target_weights: Dict[str, float],
                           nav_prices: pd.Series, available_cash: float) -> List[Dict[str, Any]]:
        """
        重新平衡投资组合

        Args:
            holdings: 当前持仓
            target_weights: 目标权重
            nav_prices: 净值价格
            available_cash: 可用现金

        Returns:
            List[Dict[str, Any]]: 交易记录列表
        """
        transactions = []
        total_value = self.calculate_portfolio_value(holdings, nav_prices) + available_cash

        for fund_code, target_weight in target_weights.items():
            current_value = holdings.get(fund_code, 0) * nav_prices.get(fund_code, 0)
            target_value = total_value * target_weight

            if current_value < target_value:
                # 需要买入
                buy_amount = min(target_value - current_value, available_cash)
                if buy_amount > nav_prices.get(fund_code, 0):
                    shares = buy_amount / nav_prices[fund_code]
                    transactions.append(self.create_transaction(
                        date=pd.Timestamp.now().date(),
                        fund_code=fund_code,
                        action='buy',
                        amount=Decimal(str(buy_amount)),
                        shares=Decimal(str(shares)),
                        nav_price=nav_prices[fund_code]
                    ))
                    holdings[fund_code] = holdings.get(fund_code, 0) + shares
                    available_cash -= buy_amount

        return transactions

    def calculate_shares(self, amount: Decimal, nav_price: float) -> Decimal:
        """计算购买份额"""
        if nav_price <= 0:
            return Decimal('0')
        return (amount / Decimal(str(nav_price))).quantize(Decimal('0.0001'))

    def apply_fees(self, amount: Decimal, fee_rate: float = 0.001) -> Decimal:
        """应用手续费"""
        return amount * (Decimal('1') - Decimal(str(fee_rate)))

    def apply_slippage(self, nav_price: float, slippage_rate: float = 0.001) -> float:
        """应用滑点"""
        return nav_price * (1 + slippage_rate)

    def get_strategy_summary(self) -> Dict[str, Any]:
        """获取策略摘要"""
        return {
            'strategy_name': self.strategy_name,
            'required_params': self.get_required_params(),
            'default_params': self.get_default_params(),
            'description': self.__doc__ or f"{self.strategy_name}策略"
        }

    def validate_investment_schedule(self, investment_dates: List[date],
                                    historical_data: pd.DataFrame) -> List[date]:
        """验证并调整投资日期"""
        valid_dates = []
        for investment_date in investment_dates:
            trading_day = self.get_nearest_trading_day(investment_date, historical_data)
            if trading_day and self.is_trading_day(trading_day, historical_data):
                valid_dates.append(trading_day)
        return valid_dates

    def calculate_dividend_impact(self, holdings: Dict[str, float], dividend_data: Dict[str, float],
                                 available_cash: float) -> Tuple[Dict[str, float], float]:
        """
        计算股息影响

        Args:
            holdings: 持仓
            dividend_data: 股息数据 (基金代码 -> 每份额股息)
            available_cash: 可用现金

        Returns:
            Tuple[Dict[str, float], float]: (更新后的持仓, 更新后的现金)
        """
        total_dividend = 0.0
        for fund_code, shares in holdings.items():
            if fund_code in dividend_data:
                dividend = shares * dividend_data[fund_code]
                total_dividend += dividend

        return holdings, available_cash + total_dividend

    def log_strategy_info(self, config: BacktestConfig):
        """记录策略信息"""
        self.logger.info(f"执行策略: {self.strategy_name}")
        self.logger.info(f"回测期间: {config.start_date} 到 {config.end_date}")
        self.logger.info(f"初始金额: ¥{config.initial_amount}")
        self.logger.info(f"投资频率: {config.investment_frequency}")
        self.logger.info(f"基金数量: {len(config.fund_codes)}")

    def get_strategy_performance_metrics(self, transactions: List[Dict[str, Any]],
                                        portfolio_values: pd.Series) -> Dict[str, Any]:
        """获取策略性能指标"""
        if len(portfolio_values) == 0:
            return {}

        total_return = (portfolio_values.iloc[-1] - portfolio_values.iloc[0]) / portfolio_values.iloc[0]

        # 计算每日收益率
        daily_returns = portfolio_values.pct_change().dropna()

        # 计算波动率
        volatility = daily_returns.std() * np.sqrt(252)  # 年化波动率

        # 计算夏普比率 (假设无风险利率为3%)
        risk_free_rate = 0.03
        excess_returns = daily_returns - risk_free_rate / 252
        sharpe_ratio = excess_returns.mean() / excess_returns.std() * np.sqrt(252) if excess_returns.std() > 0 else 0

        # 计算最大回撤
        rolling_max = portfolio_values.expanding().max()
        drawdown = (portfolio_values - rolling_max) / rolling_max
        max_drawdown = drawdown.min()

        return {
            'total_return': total_return,
            'volatility': volatility,
            'sharpe_ratio': sharpe_ratio,
            'max_drawdown': max_drawdown,
            'total_transactions': len(transactions),
            'portfolio_start_value': portfolio_values.iloc[0],
            'portfolio_end_value': portfolio_values.iloc[-1]
        }