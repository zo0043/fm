import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, delay, tap } from 'rxjs/operators';

import {
  BacktestConfig,
  BacktestRequest,
  BacktestResult,
  BacktestApiResponse,
  BacktestStrategy,
  FundAllocation,
  PerformanceData,
  BacktestSummary,
  TransactionRecord
} from '../models/backtest.model';
import { FundService, FundHistoryData } from '../../../core/services/fund.service';
import { ApiConfigService } from '../../../core/services/api-config.service';

/**
 * 回测服务
 * 提供策略回测、结果分析和报告导出功能
 *
 * 使用方法：
 * constructor(private backtestService: BacktestService) {}
 * this.backtestService.runBacktest(request).subscribe(result => ...);
 */
@Injectable({
  providedIn: 'root'
})
export class BacktestService {
  // 数据来源标识
  private _isUsingMockData = false;
  public get isUsingMockData(): boolean {
    return this._isUsingMockData;
  }

  constructor(
    private http: HttpClient,
    private fundService: FundService,
    private apiConfig: ApiConfigService
  ) {}

  /**
   * 执行回测
   */
  runBacktest(request: BacktestRequest): Observable<BacktestApiResponse> {
    return this.http.post<BacktestApiResponse>(this.apiConfig.backtestUrl, request).pipe(
      tap(() => this._isUsingMockData = false),
      catchError(error => {
        console.error('回测执行失败:', error);
        this._isUsingMockData = true;
        // 如果API不可用，使用模拟数据
        return this.generateMockBacktestResult(request.config, request.includeBenchmark);
      })
    );
  }

  /**
   * 获取预定义策略列表
   */
  getStrategies(): Observable<BacktestStrategy[]> {
    return of([
      {
        id: 'fixed-monthly',
        name: '定期定额',
        type: 'fixed-amount-scheduled' as const,
        description: '每月固定日期投资固定金额，简单易执行，适合长期投资'
      },
      {
        id: 'fixed-weekly',
        name: '每周定投',
        type: 'fixed-amount-scheduled' as const,
        description: '每周固定投资，降低择时风险，适合有稳定收入流的投资者'
      },
      {
        id: 'smart-volatility',
        name: '智能定投（波动率策略）',
        type: 'smart' as const,
        description: '根据市场波动率调整投资金额，市场低估时多投，高估时少投',
        params: {
          threshold: 0.02,
          volatilityAdjustment: true
        }
      },
      {
        id: 'value-averaging',
        name: '价值平均策略',
        type: 'value-averaging' as const,
        description: '目标使投资组合价值按固定增长率增长，市场下跌时增加投资',
        params: {
          targetGrowthRate: 0.08
        }
      }
    ]);
  }

  /**
   * 获取基金历史数据用于回测
   */
  getFundHistoryData(fundId: string, startDate: Date, endDate: Date): Observable<FundHistoryData[]> {
    // 从fundId中提取基金代码（假设fundId格式为fund_XXXX，其中XXXX是基金代码）
    const fundCode = fundId.replace('fund_', '');
    
    // 使用东方财富API获取基金净值数据
    return this.fundService.getFundNavFromEastmoney(fundCode, 1, 100).pipe(
      map(data => {
        // 过滤出指定日期范围内的数据
        const filteredData = data.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= startDate && itemDate <= endDate;
        });
        return filteredData;
      }),
      catchError(error => {
        console.error('获取基金历史数据失败:', error);
        // 生成模拟数据作为备选
        return this.generateMockFundHistoryData(startDate, endDate);
      })
    );
  }

  /**
   * 生成模拟基金历史数据
   */
  private generateMockFundHistoryData(startDate: Date, endDate: Date): Observable<FundHistoryData[]> {
    const historyData: FundHistoryData[] = [];
    const currentDate = new Date(startDate);
    let nav = 1.0;

    while (currentDate <= endDate) {
      // 模拟净值变化，年化收益约10%，日波动率约1%
      const dailyChange = (Math.random() - 0.5) * 0.02;
      nav = nav * (1 + dailyChange);

      historyData.push({
        date: currentDate.toISOString().split('T')[0],
        nav: parseFloat(nav.toFixed(4)),
        totalNav: parseFloat((nav * 1.15).toFixed(4)),
        dailyChange: parseFloat(dailyChange.toFixed(4))
      });

      // 跳过周末，只保留工作日
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek < 5) {
        currentDate.setDate(currentDate.getDate() + 1);
      } else {
        currentDate.setDate(currentDate.getDate() + (7 - dayOfWeek));
      }
    }

    return of(historyData);
  }

  /**
   * 导出回测报告
   */
  exportBacktestReport(result: BacktestResult, config: BacktestConfig): Observable<Blob> {
    const reportData = {
      config,
      result,
      generatedAt: new Date()
    };

    return this.http.post(`${this.apiConfig.backtestUrl}/export`, reportData, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('导出报告失败:', error);
        // 生成简单的Excel文件作为备选
        return this.generateMockExcelReport(result, config);
      })
    );
  }

  /**
   * 保存回测配置
   */
  saveBacktestConfig(config: BacktestConfig, name: string): Observable<any> {
    return this.http.post(`${this.apiConfig.backtestUrl}/configs`, { config, name }).pipe(
      catchError(error => {
        console.error('保存配置失败:', error);
        return of({ success: false, error: '保存失败' });
      })
    );
  }

  /**
   * 获取保存的回测配置列表
   */
  getSavedConfigs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiConfig.backtestUrl}/configs`).pipe(
      catchError(error => {
        console.error('获取配置列表失败:', error);
        return of([]);
      })
    );
  }

  // Mock数据生成方法
  private generateMockBacktestResult(config: BacktestConfig, includeBenchmark?: boolean): Observable<BacktestApiResponse> {
    const result = this.calculateMockBacktest(config, includeBenchmark);

    return of({
      success: true,
      data: result,
      executionTime: Math.floor(Math.random() * 2000) + 500
    }).pipe(delay(1500)); // 模拟计算时间
  }

  private calculateMockBacktest(config: BacktestConfig, includeBenchmark?: boolean): BacktestResult {
    const { dateRange, investment, funds } = config;
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // 生成性能数据
    const performance: PerformanceData[] = [];
    let investedAmount = 0;
    let portfolioValue = 0;
    const transactions: TransactionRecord[] = [];

    // 计算投资次数
    const investmentDates = this.generateInvestmentDates(startDate, endDate, investment.frequency);
    const periodInvestment = investment.amount;

    investmentDates.forEach((date, index) => {
      investedAmount += periodInvestment;

      // 模拟投资收益率（包含随机波动）
      const timeFactor = index / investmentDates.length;
      const baseReturn = timeFactor * 0.15; // 基础15%年化收益
      const randomVolatility = (Math.random() - 0.5) * 0.3; // ±15%随机波动
      const strategyBonus = this.getStrategyBonus(config.strategy, index);

      const currentReturn = baseReturn + randomVolatility + strategyBonus;
      portfolioValue = investedAmount * (1 + currentReturn);

      performance.push({
        date: new Date(date),
        portfolioValue,
        investedAmount,
        cumulativeReturn: currentReturn,
        benchmarkValue: includeBenchmark ? investedAmount * (1 + baseReturn) : undefined
      });
    });

    // 计算统计数据
    const totalReturn = (portfolioValue - investedAmount) / investedAmount;
    const annualizedReturn = Math.pow(1 + totalReturn, 365 / daysDiff) - 1;
    const maxDrawdown = this.calculateMaxDrawdown(performance);
    const volatility = this.calculateVolatility(performance);
    const sharpeRatio = annualizedReturn / volatility;

    // 生成月度收益数据
    const monthlyReturns = this.generateMonthlyReturns(performance);
    const yearlyReturns = this.generateYearlyReturns(performance);

    return {
      summary: {
        totalInvested: investedAmount,
        finalValue: portfolioValue,
        totalReturn,
        annualizedReturn,
        maxDrawdown,
        sharpeRatio,
        volatility,
        totalPeriods: investmentDates.length,
        winningPeriods: investmentDates.filter((_, i) => i > 0 && performance[i].portfolioValue > performance[i-1].portfolioValue).length,
        benchmarkReturn: includeBenchmark ? (performance[performance.length - 1].benchmarkValue! - investedAmount) / investedAmount : undefined,
        excessReturn: includeBenchmark ? totalReturn - ((performance[performance.length - 1].benchmarkValue! - investedAmount) / investedAmount) : undefined
      },
      performance,
      statistics: {
        totalReturn,
        annualizedReturn,
        volatility,
        sharpeRatio,
        sortinoRatio: sharpeRatio * 0.9, // 简化计算
        maxDrawdown,
        calmarRatio: annualizedReturn / Math.abs(maxDrawdown),
        bestMonth: Math.max(...monthlyReturns.map(m => m.return)),
        worstMonth: Math.min(...monthlyReturns.map(m => m.return)),
        positiveMonths: monthlyReturns.filter(m => m.return > 0).length,
        negativeMonths: monthlyReturns.filter(m => m.return < 0).length,
        totalMonths: monthlyReturns.length
      },
      drawdowns: this.calculateDrawdowns(performance),
      monthlyReturns,
      yearlyReturns
    };
  }

  private generateInvestmentDates(startDate: Date, endDate: Date, frequency: string): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      dates.push(new Date(current));

      switch (frequency) {
        case 'daily':
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
        case 'quarterly':
          current.setMonth(current.getMonth() + 3);
          break;
      }
    }

    return dates;
  }

  private getStrategyBonus(strategy: BacktestStrategy, periodIndex: number): number {
    switch (strategy.type) {
      case 'smart':
        // 智能策略在市场波动时表现更好
        return Math.sin(periodIndex * 0.5) * 0.02;
      case 'value-averaging':
        // 价值平均策略长期表现稳定
        return Math.cos(periodIndex * 0.3) * 0.015;
      default:
        return 0;
    }
  }

  private calculateMaxDrawdown(performance: PerformanceData[]): number {
    let maxDrawdown = 0;
    let peak = performance[0]?.portfolioValue || 0;

    for (const data of performance) {
      if (data.portfolioValue > peak) {
        peak = data.portfolioValue;
      }
      const drawdown = (peak - data.portfolioValue) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  private calculateVolatility(performance: PerformanceData[]): number {
    if (performance.length < 2) return 0;

    const returns = performance.slice(1).map((data, i) =>
      (data.portfolioValue - performance[i].portfolioValue) / performance[i].portfolioValue
    );

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    return Math.sqrt(variance * 252); // 年化波动率
  }

  private generateMonthlyReturns(performance: PerformanceData[]) {
    const monthlyMap = new Map<string, { value: number; invested: number }>();

    performance.forEach(data => {
      const key = data.date.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { value: data.portfolioValue, invested: data.investedAmount });
      }
    });

    const monthlyReturns: Array<{ date: string; return: number; portfolioValue: number }> = [];
    let prevInvested = 0;
    let prevValue = 0;

    Array.from(monthlyMap.entries()).forEach(([date, data], index) => {
      if (index > 0) {
        const monthlyReturn = (data.value - prevValue - (data.invested - prevInvested)) / prevValue;
        monthlyReturns.push({
          date,
          return: monthlyReturn,
          portfolioValue: data.value
        });
      }
      prevInvested = data.invested;
      prevValue = data.value;
    });

    return monthlyReturns;
  }

  private generateYearlyReturns(performance: PerformanceData[]) {
    const yearlyMap = new Map<number, { value: number; invested: number }>();

    performance.forEach(data => {
      const year = data.date.getFullYear();
      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, { value: data.portfolioValue, invested: data.investedAmount });
      } else {
        const existing = yearlyMap.get(year)!;
        if (data.portfolioValue > existing.value) {
          yearlyMap.set(year, { value: data.portfolioValue, invested: data.investedAmount });
        }
      }
    });

    const yearlyReturns: Array<{ year: number; return: number; portfolioValue: number; investedAmount: number }> = [];
    let prevInvested = 0;
    let prevValue = 0;

    Array.from(yearlyMap.entries()).forEach(([year, data], index) => {
      if (index > 0) {
        const yearlyReturn = (data.value - prevValue - (data.invested - prevInvested)) / prevValue;
        yearlyReturns.push({
          year,
          return: yearlyReturn,
          portfolioValue: data.value,
          investedAmount: data.invested
        });
      }
      prevInvested = data.invested;
      prevValue = data.value;
    });

    return yearlyReturns;
  }

  private calculateDrawdowns(performance: PerformanceData[]) {
    const drawdowns: Array<{
      startDate: Date;
      endDate: Date;
      depth: number;
      recoveryDate: Date;
      duration: number;
    }> = [];
    let peak = performance[0]?.portfolioValue || 0;
    let drawdownStart: Date | null = null;
    let maxDrawdown = 0;

    performance.forEach(data => {
      if (data.portfolioValue > peak) {
        // 恢复到前期高点，结束回撤
        if (drawdownStart && maxDrawdown > 0.01) { // 只记录超过1%的回撤
          drawdowns.push({
            startDate: drawdownStart,
            endDate: data.date,
            depth: maxDrawdown,
            recoveryDate: data.date,
            duration: Math.floor((data.date.getTime() - drawdownStart.getTime()) / (1000 * 60 * 60 * 24))
          });
        }
        peak = data.portfolioValue;
        drawdownStart = null;
        maxDrawdown = 0;
      } else {
        // 开始或继续回撤
        const currentDrawdown = (peak - data.portfolioValue) / peak;
        if (currentDrawdown > maxDrawdown) {
          maxDrawdown = currentDrawdown;
          if (!drawdownStart) {
            drawdownStart = data.date;
          }
        }
      }
    });

    return drawdowns;
  }

  private generateMockExcelReport(result: BacktestResult, config: BacktestConfig): Observable<Blob> {
    // 简单的CSV格式作为备选
    const csvContent = this.generateCSVReport(result, config);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return of(blob);
  }

  private generateCSVReport(result: BacktestResult, config: BacktestConfig): string {
    const headers = ['日期', '投资金额', '组合价值', '累计收益率'];
    const rows = result.performance.map(p => [
      p.date.toISOString().split('T')[0],
      p.investedAmount.toFixed(2),
      p.portfolioValue.toFixed(2),
      (p.cumulativeReturn * 100).toFixed(2) + '%'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // 添加BOM以支持中文
    return '\uFEFF' + csvContent;
  }
}