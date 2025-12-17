"""
回测引擎模块
负责执行基金策略回测
"""

import logging
import json
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from database import BacktestStrategy, BacktestResult, NavRecord, Fund
from config import settings

logger = logging.getLogger(__name__)

class BacktestEngine:
    """回测引擎类"""
    
    def __init__(self):
        self.default_start_date = settings.BACKTEST_DEFAULT_START_DATE
        self.default_end_date = settings.BACKTEST_DEFAULT_END_DATE
        self.default_benchmark = settings.BACKTEST_DEFAULT_BENCHMARK
    
    async def run_backtest(
        self,
        strategy: BacktestStrategy,
        backtest_params: Dict[str, Any],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """运行回测"""
        try:
            # 解析策略参数
            strategy_params = json.loads(strategy.parameters) if strategy.parameters else {}
            
            # 获取回测参数
            start_date = datetime.strptime(
                backtest_params.get("start_date", self.default_start_date), 
                "%Y-%m-%d"
            )
            end_date = datetime.strptime(
                backtest_params.get("end_date", self.default_end_date), 
                "%Y-%m-%d"
            )
            initial_capital = backtest_params.get("initial_capital", 100000)
            
            # 获取策略配置的基金
            fund_codes = backtest_params.get("fund_codes", [])
            if not fund_codes:
                raise ValueError("未指定回测基金")
            
            # 获取基金净值数据
            nav_data = await self._get_nav_data(fund_codes, start_date, end_date, db)
            
            if not nav_data:
                raise ValueError("无法获取净值数据")
            
            # 执行回测
            backtest_result = await self._execute_backtest(
                strategy, 
                nav_data, 
                initial_capital, 
                strategy_params
            )
            
            # 保存回测结果
            await self._save_backtest_result(strategy.id, backtest_result, start_date, end_date, initial_capital, db)
            
            logger.info(f"回测完成，策略: {strategy.name}")
            return backtest_result
            
        except Exception as e:
            logger.error(f"回测执行失败: {str(e)}")
            raise
    
    async def _get_nav_data(
        self, 
        fund_codes: List[str], 
        start_date: datetime, 
        end_date: datetime,
        db: AsyncSession
    ) -> Dict[str, List[Dict[str, Any]]]:
        """获取基金的净值数据"""
        try:
            nav_data = {}
            
            for fund_code in fund_codes:
                # 查询基金
                fund_query = select(Fund).where(Fund.code == fund_code)
                result = await db.execute(fund_query)
                fund = result.scalar_one_or_none()
                
                if not fund:
                    logger.warning(f"基金 {fund_code} 不存在")
                    continue
                
                # 查询净值数据
                nav_query = select(NavRecord).where(
                    and_(
                        NavRecord.fund_id == fund.id,
                        NavRecord.nav_date >= start_date,
                        NavRecord.nav_date <= end_date
                    )
                ).order_by(NavRecord.nav_date)
                
                result = await db.execute(nav_query)
                records = result.scalars().all()
                
                fund_nav_data = []
                for record in records:
                    fund_nav_data.append({
                        "date": record.nav_date,
                        "nav": record.nav,
                        "acc_nav": record.acc_nav,
                        "daily_change": record.daily_change
                    })
                
                nav_data[fund_code] = fund_nav_data
                
            logger.info(f"获取 {len(nav_data)} 只基金的净值数据")
            return nav_data
            
        except Exception as e:
            logger.error(f"获取净值数据失败: {str(e)}")
            return {}
    
    async def _execute_backtest(
        self,
        strategy: BacktestStrategy,
        nav_data: Dict[str, List[Dict[str, Any]]],
        initial_capital: float,
        strategy_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """执行具体的回测逻辑"""
        try:
            # 获取策略类型
            strategy_type = strategy_params.get("type", "equal_weight")
            
            if strategy_type == "equal_weight":
                return await self._equal_weight_strategy(nav_data, initial_capital)
            elif strategy_type == "dca":
                return await self._dca_strategy(nav_data, initial_capital, strategy_params)
            elif strategy_type == "momentum":
                return await self._momentum_strategy(nav_data, initial_capital, strategy_params)
            else:
                raise ValueError(f"不支持的策略类型: {strategy_type}")
                
        except Exception as e:
            logger.error(f"回测策略执行失败: {str(e)}")
            raise
    
    async def _equal_weight_strategy(
        self, 
        nav_data: Dict[str, List[Dict[str, Any]]], 
        initial_capital: float
    ) -> Dict[str, Any]:
        """等权重策略"""
        try:
            if not nav_data:
                raise ValueError("没有净值数据")
            
            # 获取所有日期
            all_dates = set()
            for fund_nav in nav_data.values():
                all_dates.update([item["date"] for item in fund_nav])
            
            all_dates = sorted(list(all_dates))
            
            # 初始化
            num_funds = len(nav_data)
            capital_per_fund = initial_capital / num_funds
            portfolio_value = []
            positions = {}
            
            # 创建净值字典
            fund_nav_dict = {}
            for fund_code, nav_list in nav_data.items():
                fund_nav_dict[fund_code] = {item["date"]: item for item in nav_list}
            
            # 计算每天的组合价值
            for date in all_dates:
                total_value = 0
                
                for fund_code in nav_data.keys():
                    nav_record = fund_nav_dict[fund_code].get(date)
                    if nav_record:
                        # 初始化持仓（第一天）
                        if date == all_dates[0]:
                            shares = capital_per_fund / nav_record["nav"]
                            positions[fund_code] = shares
                        else:
                            shares = positions.get(fund_code, 0)
                        
                        total_value += shares * nav_record["nav"]
                
                portfolio_value.append({
                    "date": date,
                    "value": total_value,
                    "return": (total_value - initial_capital) / initial_capital if total_value > 0 else 0
                })
            
            # 计算回测指标
            return self._calculate_performance_metrics(portfolio_value, initial_capital)
            
        except Exception as e:
            logger.error(f"等权重策略执行失败: {str(e)}")
            raise
    
    async def _dca_strategy(
        self, 
        nav_data: Dict[str, List[Dict[str, Any]]], 
        initial_capital: float,
        strategy_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """定投策略"""
        try:
            # DCA 策略参数
            investment_amount = strategy_params.get("investment_amount", 1000)  # 每次投资金额
            investment_frequency = strategy_params.get("investment_frequency", "monthly")  # 投资频率
            
            if not nav_data:
                raise ValueError("没有净值数据")
            
            # 获取所有日期
            all_dates = set()
            for fund_nav in nav_data.values():
                all_dates.update([item["date"] for item in fund_nav])
            
            all_dates = sorted(list(all_dates))
            
            # 初始化
            num_funds = len(nav_data)
            capital_per_fund = investment_amount / num_funds
            portfolio_value = []
            positions = {}
            total_invested = 0
            
            # 创建净值字典
            fund_nav_dict = {}
            for fund_code, nav_list in nav_data.items():
                fund_nav_dict[fund_code] = {item["date"]: item for item in nav_list}
            
            # 计算投资日期
            investment_dates = self._generate_investment_dates(
                all_dates[0], 
                all_dates[-1], 
                investment_frequency
            )
            
            # 计算每天的组合价值
            for date in all_dates:
                total_value = 0
                
                # 检查是否是投资日
                if date in investment_dates and total_invested < initial_capital:
                    remaining_budget = initial_capital - total_invested
                    actual_investment = min(capital_per_fund * num_funds, remaining_budget)
                    
                    if actual_investment > 0:
                        per_fund_investment = actual_investment / num_funds
                        
                        for fund_code in nav_data.keys():
                            nav_record = fund_nav_dict[fund_code].get(date)
                            if nav_record:
                                shares = per_fund_investment / nav_record["nav"]
                                positions[fund_code] = positions.get(fund_code, 0) + shares
                        
                        total_invested += actual_investment
                
                # 计算当前价值
                for fund_code in nav_data.keys():
                    nav_record = fund_nav_dict[fund_code].get(date)
                    if nav_record:
                        shares = positions.get(fund_code, 0)
                        total_value += shares * nav_record["nav"]
                
                portfolio_value.append({
                    "date": date,
                    "value": total_value,
                    "return": (total_value - total_invested) / total_invested if total_invested > 0 else 0,
                    "total_invested": total_invested
                })
            
            # 计算回测指标
            return self._calculate_performance_metrics(portfolio_value, total_invested)
            
        except Exception as e:
            logger.error(f"DCA策略执行失败: {str(e)}")
            raise
    
    async def _momentum_strategy(
        self, 
        nav_data: Dict[str, List[Dict[str, Any]]], 
        initial_capital: float,
        strategy_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """动量策略"""
        try:
            # 动量策略参数
            lookback_period = strategy_params.get("lookback_period", 20)  # 回看期
            rebalance_frequency = strategy_params.get("rebalance_frequency", "monthly")  # 调仓频率
            
            if not nav_data:
                raise ValueError("没有净值数据")
            
            # 获取所有日期
            all_dates = set()
            for fund_nav in nav_data.values():
                all_dates.update([item["date"] for item in fund_nav])
            
            all_dates = sorted(list(all_dates))
            
            # 创建净值字典
            fund_nav_dict = {}
            for fund_code, nav_list in nav_data.items():
                fund_nav_dict[fund_code] = {item["date"]: item for item in nav_list}
            
            # 初始化
            positions = {}
            portfolio_value = []
            rebalance_dates = self._generate_investment_dates(
                all_dates[0], 
                all_dates[-1], 
                rebalance_frequency
            )
            
            # 计算动量指标和执行回测
            for i, date in enumerate(all_dates):
                total_value = 0
                
                # 检查是否需要调仓
                if date in rebalance_dates and i >= lookback_period:
                    # 计算动量指标
                    momentum_scores = {}
                    for fund_code in nav_data.keys():
                        current_nav = fund_nav_dict[fund_code].get(date)
                        past_nav = fund_nav_dict[fund_code].get(
                            all_dates[i - lookback_period]
                        )
                        
                        if current_nav and past_nav:
                            momentum = (current_nav["nav"] - past_nav["nav"]) / past_nav["nav"]
                            momentum_scores[fund_code] = momentum
                    
                    # 选择动量最高的基金
                    if momentum_scores:
                        sorted_funds = sorted(momentum_scores.items(), key=lambda x: x[1], reverse=True)
                        top_funds = [fund[0] for fund in sorted_funds[:min(3, len(sorted_funds))]]  # 选择前3只
                        
                        # 重新分配资金
                        capital_per_fund = initial_capital / len(top_funds)
                        for fund_code in top_funds:
                            nav_record = fund_nav_dict[fund_code].get(date)
                            if nav_record:
                                shares = capital_per_fund / nav_record["nav"]
                                positions[fund_code] = shares
                
                # 计算当前价值
                for fund_code in nav_data.keys():
                    nav_record = fund_nav_dict[fund_code].get(date)
                    if nav_record:
                        shares = positions.get(fund_code, 0)
                        total_value += shares * nav_record["nav"]
                
                portfolio_value.append({
                    "date": date,
                    "value": total_value,
                    "return": (total_value - initial_capital) / initial_capital if total_value > 0 else 0
                })
            
            # 计算回测指标
            return self._calculate_performance_metrics(portfolio_value, initial_capital)
            
        except Exception as e:
            logger.error(f"动量策略执行失败: {str(e)}")
            raise
    
    def _generate_investment_dates(self, start_date: datetime, end_date: datetime, frequency: str) -> List[datetime]:
        """生成投资日期"""
        dates = []
        current_date = start_date
        
        if frequency == "daily":
            while current_date <= end_date:
                dates.append(current_date)
                current_date += timedelta(days=1)
        elif frequency == "weekly":
            while current_date <= end_date:
                dates.append(current_date)
                current_date += timedelta(weeks=1)
        elif frequency == "monthly":
            while current_date <= end_date:
                dates.append(current_date)
                # 处理月份天数不同的情况
                try:
                    current_date = current_date.replace(
                        month=current_date.month + 1 if current_date.month < 12 else 1,
                        year=current_date.year + 1 if current_date.month == 12 else current_date.year
                    )
                except ValueError:
                    # 如果日期不存在（如2月30日），使用月底日期
                    if current_date.month == 12:
                        current_date = current_date.replace(year=current_date.year + 1, month=1, day=1)
                    else:
                        next_month = current_date.month + 1
                        next_year = current_date.year
                        if next_month > 12:
                            next_month = 1
                            next_year += 1
                        
                        # 获取下个月的最后一天
                        if next_month == 12:
                            last_day = 31
                        else:
                            import calendar
                            last_day = calendar.monthrange(next_year, next_month)[1]
                        
                        current_date = current_date.replace(year=next_year, month=next_month, day=min(current_date.day, last_day))
        else:
            raise ValueError(f"不支持的投资频率: {frequency}")
        
        return dates
    
    def _calculate_performance_metrics(self, portfolio_value: List[Dict[str, Any]], initial_capital: float) -> Dict[str, Any]:
        """计算回测绩效指标"""
        try:
            if not portfolio_value:
                raise ValueError("没有组合价值数据")
            
            # 提取收益率数据
            returns = [item["return"] for item in portfolio_value]
            final_value = portfolio_value[-1]["value"]
            
            # 总收益率
            total_return = (final_value - initial_capital) / initial_capital
            
            # 年化收益率
            start_date = portfolio_value[0]["date"]
            end_date = portfolio_value[-1]["date"]
            years = (end_date - start_date).days / 365.25
            annual_return = (1 + total_return) ** (1 / years) - 1 if years > 0 else 0
            
            # 最大回撤
            peak = initial_capital
            max_drawdown = 0
            for item in portfolio_value:
                if item["value"] > peak:
                    peak = item["value"]
                drawdown = (peak - item["value"]) / peak
                max_drawdown = max(max_drawdown, drawdown)
            
            # 夏普比率
            if len(returns) > 1:
                daily_returns = [returns[i] - returns[i-1] for i in range(1, len(returns))]
                if daily_returns:
                    avg_daily_return = np.mean(daily_returns)
                    std_daily_return = np.std(daily_returns)
                    sharpe_ratio = (avg_daily_return / std_daily_return) * np.sqrt(252) if std_daily_return > 0 else 0
                else:
                    sharpe_ratio = 0
            else:
                sharpe_ratio = 0
            
            # 胜率
            winning_days = sum(1 for i in range(1, len(returns)) if returns[i] > returns[i-1])
            win_rate = winning_days / (len(returns) - 1) if len(returns) > 1 else 0
            
            return {
                "total_return": total_return,
                "annual_return": annual_return,
                "max_drawdown": max_drawdown,
                "sharpe_ratio": sharpe_ratio,
                "win_rate": win_rate,
                "final_capital": final_value,
                "initial_capital": initial_capital,
                "details": json.dumps(portfolio_value)
            }
            
        except Exception as e:
            logger.error(f"计算绩效指标失败: {str(e)}")
            raise
    
    async def _save_backtest_result(
        self,
        strategy_id: int,
        backtest_result: Dict[str, Any],
        start_date: datetime,
        end_date: datetime,
        initial_capital: float,
        db: AsyncSession
    ):
        """保存回测结果到数据库"""
        try:
            result = BacktestResult(
                strategy_id=strategy_id,
                start_date=start_date,
                end_date=end_date,
                initial_capital=initial_capital,
                final_capital=backtest_result["final_capital"],
                total_return=backtest_result["total_return"],
                annual_return=backtest_result["annual_return"],
                max_drawdown=backtest_result["max_drawdown"],
                sharpe_ratio=backtest_result["sharpe_ratio"],
                win_rate=backtest_result["win_rate"],
                details=backtest_result["details"]
            )
            
            db.add(result)
            await db.commit()
            await db.refresh(result)
            
            logger.info(f"回测结果保存成功，结果ID: {result.id}")
            
        except Exception as e:
            logger.error(f"保存回测结果失败: {str(e)}")
            await db.rollback()
            raise

# 全局回测引擎实例
backtest_engine = BacktestEngine()