"""
性能计算器
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
from datetime import datetime
import scipy.stats as stats

from shared.utils import get_logger


class PerformanceCalculator:
    """性能指标计算器"""

    def __init__(self):
        self.logger = get_logger(self.__class__.__name__)

    def calculate_performance(self, portfolio_values: pd.Series,
                            benchmark_data: Optional[pd.Series] = None,
                            risk_free_rate: float = 0.03) -> Dict[str, Any]:
        """
        计算投资组合性能指标

        Args:
            portfolio_values: 投资组合价值序列
            benchmark_data: 基准数据 (可选)
            risk_free_rate: 无风险利率

        Returns:
            Dict[str, Any]: 性能指标
        """
        try:
            if len(portfolio_values) < 2:
                return self._empty_performance_metrics()

            # 计算收益率序列
            returns = portfolio_values.pct_change().dropna()

            # 基础指标
            total_return = (portfolio_values.iloc[-1] / portfolio_values.iloc[0]) - 1
            annualized_return = self._calculate_annualized_return(portfolio_values)

            # 风险指标
            volatility = returns.std() * np.sqrt(252)  # 年化波动率
            max_drawdown = self._calculate_max_drawdown(portfolio_values)
            downside_deviation = self._calculate_downside_deviation(returns)

            # 风险调整收益指标
            sharpe_ratio = self._calculate_sharpe_ratio(returns, risk_free_rate)
            sortino_ratio = self._calculate_sortino_ratio(returns, risk_free_rate, downside_deviation)
            calmar_ratio = annualized_return / abs(max_drawdown) if max_drawdown != 0 else 0

            # 相对指标
            win_rate = self._calculate_win_rate(returns)
            profit_loss_ratio = self._calculate_profit_loss_ratio(returns)

            # 基准相关指标
            benchmark_metrics = {}
            if benchmark_data is not None and len(benchmark_data) > 0:
                benchmark_metrics = self._calculate_benchmark_metrics(
                    portfolio_values, benchmark_data, risk_free_rate
                )

            # 统计指标
            statistical_metrics = self._calculate_statistical_metrics(returns)

            return {
                # 基础收益指标
                'total_return': total_return,
                'annualized_return': annualized_return,
                'cumulative_return': total_return,

                # 风险指标
                'volatility': volatility,
                'max_drawdown': max_drawdown,
                'downside_deviation': downside_deviation,
                'var_95': self._calculate_var(returns, 0.95),
                'cvar_95': self._calculate_cvar(returns, 0.95),

                # 风险调整收益指标
                'sharpe_ratio': sharpe_ratio,
                'sortino_ratio': sortino_ratio,
                'calmar_ratio': calmar_ratio,
                'information_ratio': benchmark_metrics.get('information_ratio', 0),

                # 相对指标
                'win_rate': win_rate,
                'profit_loss_ratio': profit_loss_ratio,
                'best_day': returns.max(),
                'worst_day': returns.min(),
                'positive_days': len(returns[returns > 0]),
                'negative_days': len(returns[returns < 0]),

                # 基准指标
                'benchmark_return': benchmark_metrics.get('benchmark_return', 0),
                'excess_return': benchmark_metrics.get('excess_return', 0),
                'alpha': benchmark_metrics.get('alpha', 0),
                'beta': benchmark_metrics.get('beta', 0),
                'tracking_error': benchmark_metrics.get('tracking_error', 0),

                # 统计指标
                'skewness': statistical_metrics.get('skewness', 0),
                'kurtosis': statistical_metrics.get('kurtosis', 0),
                'jarque_bera': statistical_metrics.get('jarque_bera', 0),

                # 附加信息
                'start_date': portfolio_values.index[0].isoformat(),
                'end_date': portfolio_values.index[-1].isoformat(),
                'total_days': len(portfolio_values),
                'trading_days': len(returns)
            }

        except Exception as e:
            self.logger.error(f"计算性能指标失败: {e}")
            return self._empty_performance_metrics()

    def _calculate_annualized_return(self, values: pd.Series) -> float:
        """计算年化收益率"""
        if len(values) < 2:
            return 0

        total_return = (values.iloc[-1] / values.iloc[0]) - 1
        years = (values.index[-1] - values.index[0]).days / 365.25

        if years <= 0:
            return 0

        return (1 + total_return) ** (1 / years) - 1

    def _calculate_max_drawdown(self, values: pd.Series) -> float:
        """计算最大回撤"""
        if len(values) < 2:
            return 0

        rolling_max = values.expanding().max()
        drawdown = (values - rolling_max) / rolling_max
        return drawdown.min()

    def _calculate_downside_deviation(self, returns: pd.Series, target_return: float = 0) -> float:
        """计算下行标准差"""
        downside_returns = returns[returns < target_return]
        if len(downside_returns) == 0:
            return 0

        return downside_returns.std() * np.sqrt(252)

    def _calculate_sharpe_ratio(self, returns: pd.Series, risk_free_rate: float) -> float:
        """计算夏普比率"""
        if len(returns) == 0:
            return 0

        excess_returns = returns - risk_free_rate / 252
        if excess_returns.std() == 0:
            return 0

        return excess_returns.mean() / excess_returns.std() * np.sqrt(252)

    def _calculate_sortino_ratio(self, returns: pd.Series, risk_free_rate: float,
                                 downside_deviation: float) -> float:
        """计算索提诺比率"""
        if len(returns) == 0 or downside_deviation == 0:
            return 0

        excess_returns = returns - risk_free_rate / 252
        return excess_returns.mean() / downside_deviation * np.sqrt(252)

    def _calculate_win_rate(self, returns: pd.Series) -> float:
        """计算胜率"""
        if len(returns) == 0:
            return 0

        positive_returns = returns[returns > 0]
        return len(positive_returns) / len(returns)

    def _calculate_profit_loss_ratio(self, returns: pd.Series) -> float:
        """计算盈亏比"""
        if len(returns) == 0:
            return 0

        positive_returns = returns[returns > 0]
        negative_returns = returns[returns < 0]

        if len(negative_returns) == 0:
            return float('inf')

        avg_profit = positive_returns.mean() if len(positive_returns) > 0 else 0
        avg_loss = abs(negative_returns.mean())

        return avg_profit / avg_loss if avg_loss > 0 else 0

    def _calculate_var(self, returns: pd.Series, confidence_level: float = 0.95) -> float:
        """计算风险价值"""
        if len(returns) == 0:
            return 0

        return np.percentile(returns, (1 - confidence_level) * 100)

    def _calculate_cvar(self, returns: pd.Series, confidence_level: float = 0.95) -> float:
        """计算条件风险价值"""
        if len(returns) == 0:
            return 0

        var = self._calculate_var(returns, confidence_level)
        tail_losses = returns[returns <= var]

        if len(tail_losses) == 0:
            return var

        return tail_losses.mean()

    def _calculate_benchmark_metrics(self, portfolio_values: pd.Series,
                                    benchmark_values: pd.Series,
                                    risk_free_rate: float) -> Dict[str, Any]:
        """计算基准相关指标"""
        try:
            # 对齐数据
            aligned_data = pd.concat([portfolio_values, benchmark_values], axis=1).dropna()
            if len(aligned_data) < 2:
                return {}

            portfolio_returns = aligned_data.iloc[:, 0].pct_change().dropna()
            benchmark_returns = aligned_data.iloc[:, 1].pct_change().dropna()

            # 基准收益率
            benchmark_return = (benchmark_values.iloc[-1] / benchmark_values.iloc[0]) - 1
            portfolio_return = (portfolio_values.iloc[-1] / portfolio_values.iloc[0]) - 1
            excess_return = portfolio_return - benchmark_return

            # Beta和Alpha
            covariance = np.cov(portfolio_returns, benchmark_returns)[0][1]
            benchmark_variance = np.var(benchmark_returns)
            beta = covariance / benchmark_variance if benchmark_variance != 0 else 0

            alpha = excess_return - beta * (benchmark_return - risk_free_rate)

            # 跟踪误差
            tracking_error = (portfolio_returns - benchmark_returns).std() * np.sqrt(252)

            # 信息比率
            information_ratio = excess_return / tracking_error if tracking_error != 0 else 0

            # 相关性
            correlation = np.corrcoef(portfolio_returns, benchmark_returns)[0][1]

            return {
                'benchmark_return': benchmark_return,
                'excess_return': excess_return,
                'alpha': alpha,
                'beta': beta,
                'tracking_error': tracking_error,
                'information_ratio': information_ratio,
                'correlation': correlation
            }

        except Exception as e:
            self.logger.error(f"计算基准指标失败: {e}")
            return {}

    def _calculate_statistical_metrics(self, returns: pd.Series) -> Dict[str, Any]:
        """计算统计指标"""
        try:
            if len(returns) == 0:
                return {}

            # 偏度和峰度
            skewness = stats.skew(returns)
            kurtosis = stats.kurtosis(returns)

            # Jarque-Bera检验
            jb_stat, jb_pvalue = stats.jarque_bera(returns)

            return {
                'skewness': skewness,
                'kurtosis': kurtosis,
                'jarque_bera': jb_stat,
                'jarque_bera_pvalue': jb_pvalue,
                'normality_test': jb_pvalue > 0.05
            }

        except Exception as e:
            self.logger.error(f"计算统计指标失败: {e}")
            return {}

    def _empty_performance_metrics(self) -> Dict[str, Any]:
        """返回空的性能指标"""
        return {
            'total_return': 0,
            'annualized_return': 0,
            'volatility': 0,
            'max_drawdown': 0,
            'sharpe_ratio': 0,
            'sortino_ratio': 0,
            'win_rate': 0,
            'alpha': 0,
            'beta': 0,
            'error': 'Insufficient data'
        }

    def calculate_rolling_metrics(self, portfolio_values: pd.Series,
                                window: int = 30) -> pd.DataFrame:
        """
        计算滚动指标

        Args:
            portfolio_values: 投资组合价值序列
            window: 滚动窗口大小

        Returns:
            pd.DataFrame: 滚动指标
        """
        try:
            returns = portfolio_values.pct_change().dropna()

            # 滚动收益率
            rolling_return = portfolio_values.pct_change(window)

            # 滚动夏普比率
            rolling_sharpe = returns.rolling(window).apply(
                lambda x: self._calculate_sharpe_ratio(x, 0.03)
            )

            # 滚动最大回撤
            rolling_max_drawdown = portfolio_values.rolling(window).apply(
                lambda x: self._calculate_max_drawdown(x)
            )

            return pd.DataFrame({
                'rolling_return': rolling_return,
                'rolling_sharpe': rolling_sharpe,
                'rolling_max_drawdown': rolling_max_drawdown
            })

        except Exception as e:
            self.logger.error(f"计算滚动指标失败: {e}")
            return pd.DataFrame()

    def calculate_sector_allocation_impact(self, portfolio_returns: pd.Series,
                                         sector_returns: Dict[str, pd.Series],
                                         portfolio_weights: Dict[str, float]) -> Dict[str, Any]:
        """
        计算板块配置影响

        Args:
            portfolio_returns: 投资组合收益率
            sector_returns: 板块收益率
            portfolio_weights: 板板权重

        Returns:
            Dict[str, Any]: 板块配置影响分析
        """
        try:
            # 计算板块贡献
            sector_contributions = {}
            for sector, weights in portfolio_weights.items():
                if sector in sector_returns:
                    sector_return = sector_returns[sector].mean()
                    contribution = weights * sector_return
                    sector_contributions[sector] = contribution

            # 计算配置效果
            total_weighted_return = sum(sector_contributions.values())
            actual_return = portfolio_returns.mean()
            allocation_effect = actual_return - total_weighted_return

            return {
                'sector_contributions': sector_contributions,
                'allocation_effect': allocation_effect,
                'total_weighted_return': total_weighted_return,
                'actual_return': actual_return
            }

        except Exception as e:
            self.logger.error(f"计算板块配置影响失败: {e}")
            return {}