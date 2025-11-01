import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, delay } from 'rxjs/operators';

import {
  PortfolioResponse,
  PortfolioQuery,
  PortfolioOverview,
  AssetAllocation,
  PortfolioPerformance,
  PortfolioRiskAnalysis,
  CorrelationMatrix,
  AssetAllocationSummary,
  TimeSeriesData
} from '../models/portfolio.model';
import { FundService, Fund } from '../../../core/services/fund.service';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private apiUrl = '/api/portfolio';

  constructor(
    private http: HttpClient,
    private fundService: FundService
  ) {}

  /**
   * 获取投资组合概览
   */
  getPortfolioOverview(query: PortfolioQuery = {}): Observable<PortfolioResponse> {
    return this.http.get<PortfolioResponse>(`${this.apiUrl}/overview`, {
      params: this.buildQueryParams(query)
    }).pipe(
      catchError(error => {
        console.error('获取投资组合概览失败:', error);
        return this.generateMockPortfolioData();
      })
    );
  }

  /**
   * 获取资产配置详情
   */
  getAssetAllocation(query: PortfolioQuery = {}): Observable<AssetAllocation[]> {
    return this.http.get<AssetAllocation[]>(`${this.apiUrl}/allocation`, {
      params: this.buildQueryParams(query)
    }).pipe(
      catchError(error => {
        console.error('获取资产配置失败:', error);
        return this.generateMockAssetAllocation();
      })
    );
  }

  /**
   * 获取业绩表现数据
   */
  getPortfolioPerformance(query: PortfolioQuery = {}): Observable<PortfolioPerformance> {
    return this.http.get<PortfolioPerformance>(`${this.apiUrl}/performance`, {
      params: this.buildQueryParams(query)
    }).pipe(
      catchError(error => {
        console.error('获取业绩表现失败:', error);
        return this.generateMockPerformance();
      })
    );
  }

  /**
   * 获取风险分析数据
   */
  getRiskAnalysis(query: PortfolioQuery = {}): Observable<PortfolioRiskAnalysis> {
    return this.http.get<PortfolioRiskAnalysis>(`${this.apiUrl}/risk`, {
      params: this.buildQueryParams(query)
    }).pipe(
      catchError(error => {
        console.error('获取风险分析失败:', error);
        return this.generateMockRiskAnalysis();
      })
    );
  }

  /**
   * 获取相关性矩阵
   */
  getCorrelationMatrix(query: PortfolioQuery = {}): Observable<CorrelationMatrix> {
    return this.http.get<CorrelationMatrix>(`${this.apiUrl}/correlation`, {
      params: this.buildQueryParams(query)
    }).pipe(
      catchError(error => {
        console.error('获取相关性矩阵失败:', error);
        return this.generateMockCorrelationMatrix();
      })
    );
  }

  /**
   * 执行投资组合再平衡
   */
  rebalancePortfolio(targetAllocations: { fundId: string; weight: number }[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/rebalance`, { targetAllocations }).pipe(
      catchError(error => {
        console.error('投资组合再平衡失败:', error);
        return of({ success: false, error: '再平衡失败' });
      })
    );
  }

  /**
   * 获取投资建议
   */
  getRecommendations(query: PortfolioQuery = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/recommendations`, {
      params: this.buildQueryParams(query)
    }).pipe(
      catchError(error => {
        console.error('获取投资建议失败:', error);
        return this.generateMockRecommendations();
      })
    );
  }

  private buildQueryParams(query: PortfolioQuery): any {
    const params: any = {};
    if (query.userId) params.userId = query.userId;
    if (query.portfolioId) params.portfolioId = query.portfolioId;
    if (query.includeRisk !== undefined) params.includeRisk = query.includeRisk;
    if (query.includeRecommendations !== undefined) params.includeRecommendations = query.includeRecommendations;
    if (query.includeTransactions !== undefined) params.includeTransactions = query.includeTransactions;
    if (query.startDate) params.startDate = query.startDate.toISOString();
    if (query.endDate) params.endDate = query.endDate.toISOString();
    return params;
  }

  // Mock数据生成方法
  private generateMockPortfolioData(): Observable<PortfolioResponse> {
    const mockData = this.createMockPortfolioData();

    return of({
      success: true,
      data: mockData,
      timestamp: new Date()
    }).pipe(delay(800));
  }

  private createMockPortfolioData() {
    const overview = this.createMockOverview();
    const allocation = this.createMockAssetAllocation();
    const performance = this.createMockPerformance();
    const riskAnalysis = this.createMockRiskAnalysis();
    const correlation = this.createMockCorrelationMatrix();

    return {
      overview,
      allocation,
      performance,
      riskAnalysis,
      correlation
    };
  }

  private createMockOverview(): PortfolioOverview {
    const totalInvested = 100000;
    const totalReturn = totalInvested * (Math.random() * 0.3 + 0.05); // 5%-35%收益
    const totalValue = totalInvested + totalReturn;

    return {
      totalValue,
      totalInvested,
      totalReturn,
      totalReturnRate: totalReturn / totalInvested,
      dailyChange: (Math.random() - 0.5) * 2000,
      dailyChangeRate: (Math.random() - 0.5) * 0.02,
      lastUpdate: new Date(),
      fundCount: 5
    };
  }

  private createMockAssetAllocation(): AssetAllocation[] {
    const funds = [
      { code: '110022', name: '易方达消费行业', type: 'stock' },
      { code: '161725', name: '招商中证白酒', type: 'index' },
      { code: '000001', name: '华夏成长', type: 'hybrid' },
      { code: '510300', name: '沪深300ETF', type: 'etf' },
      { code: '110022', name: '易方达安心债券', type: 'bond' }
    ];

    return funds.map((fund, index) => {
      const investedAmount = 20000;
      const returnRate = (Math.random() - 0.3) * 0.5;
      const currentValue = investedAmount * (1 + returnRate);

      return {
        fundId: `fund_${index + 1}`,
        fundCode: fund.code,
        fundName: fund.name,
        fundType: fund.type,
        currentValue,
        investedAmount,
        weight: 20, // 均等配置
        return: currentValue - investedAmount,
        returnRate,
        shares: investedAmount / 2.0, // 假设成本为2元
        averageCost: 2.0,
        currentNav: currentValue / (investedAmount / 2.0),
        dailyChange: (Math.random() - 0.5) * 100,
        dailyChangeRate: (Math.random() - 0.5) * 0.03
      };
    });
  }

  private createMockPerformance(): PortfolioPerformance {
    return {
      timeSeriesPerformance: this.createMockTimeSeriesData(),
      returnStatistics: {
        oneDay: (Math.random() - 0.5) * 0.03,
        oneWeek: (Math.random() - 0.3) * 0.08,
        oneMonth: (Math.random() - 0.2) * 0.15,
        threeMonths: (Math.random() - 0.1) * 0.25,
        sixMonths: (Math.random() - 0.1) * 0.35,
        oneYear: Math.random() * 0.4 - 0.05,
        twoYears: Math.random() * 0.6,
        threeYears: Math.random() * 0.9,
        sinceInception: Math.random() * 1.2 + 0.2
      },
      periodComparison: this.createMockPeriodComparison(),
      benchmarkComparison: this.createMockBenchmarkComparison(),
      returnDecomposition: {
        assetAllocation: Math.random() * 0.05 - 0.02,
        securitySelection: Math.random() * 0.08 - 0.03,
        interaction: Math.random() * 0.02 - 0.01,
        total: Math.random() * 0.1 - 0.02
      }
    };
  }

  private createMockTimeSeriesData(): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    const today = new Date();
    let portfolioValue = 100000;

    for (let i = 252; i >= 0; i--) { // 一年的交易日
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // 模拟每日收益
      const dailyReturn = (Math.random() - 0.48) * 0.04; // 略微正向收益
      portfolioValue = portfolioValue * (1 + dailyReturn);

      const cumulativeReturn = (portfolioValue - 100000) / 100000;

      data.push({
        date,
        portfolioValue,
        cumulativeReturn,
        benchmarkValue: 100000 * (1 + cumulativeReturn * 0.8), // 基准表现稍差
        benchmarkReturn: cumulativeReturn * 0.8
      });
    }

    return data;
  }

  private createMockPeriodComparison() {
    const periods = ['近1月', '近3月', '近6月', '近1年'];
    return periods.map(period => ({
      period,
      portfolioReturn: (Math.random() - 0.2) * 0.3,
      benchmarkReturn: (Math.random() - 0.3) * 0.25,
      excessReturn: (Math.random() - 0.4) * 0.15,
      ranking: `${Math.floor(Math.random() * 300) + 1}/1000`,
      quartile: Math.floor(Math.random() * 4) + 1
    }));
  }

  private createMockBenchmarkComparison() {
    return {
      benchmarkName: '沪深300',
      correlation: Math.random() * 0.3 + 0.7,
      beta: Math.random() * 0.4 + 0.8,
      alpha: (Math.random() - 0.3) * 0.08,
      trackingError: Math.random() * 0.06 + 0.02,
      informationRatio: Math.random() * 1.5 + 0.3,
      upMarketCapture: Math.random() * 0.3 + 0.8,
      downMarketCapture: Math.random() * 0.2 + 0.9
    };
  }

  private createMockRiskAnalysis(): PortfolioRiskAnalysis {
    return {
      riskMetrics: {
        standardDeviation: Math.random() * 0.2 + 0.1,
        beta: Math.random() * 0.4 + 0.8,
        sharpeRatio: Math.random() * 2 + 0.5,
        sortinoRatio: Math.random() * 2.5 + 0.8,
        maxDrawdown: -(Math.random() * 0.25 + 0.1),
        currentDrawdown: -(Math.random() * 0.1),
        volatility: Math.random() * 0.2 + 0.15,
        var95: -(Math.random() * 0.04 + 0.02),
        cvar95: -(Math.random() * 0.06 + 0.03)
      },
      drawdownAnalysis: this.createMockDrawdownAnalysis(),
      riskContribution: this.createMockRiskContribution(),
      stressTest: this.createMockStressTest()
    };
  }

  private createMockDrawdownAnalysis() {
    const drawdowns = [];
    let peakValue = 100000;
    let currentValue = peakValue;

    for (let i = 0; i < 5; i++) {
      const drawdownDepth = Math.random() * 0.15 + 0.05;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (i + 1) * 60);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);

      drawdowns.push({
        startDate,
        endDate,
        depth: drawdownDepth,
        recoveryDate: new Date(endDate.getTime() + 15 * 24 * 60 * 60 * 1000),
        duration: 30,
        recoveryDuration: 15
      });
    }

    return drawdowns;
  }

  private createMockRiskContribution() {
    const funds = ['易方达消费行业', '招商中证白酒', '华夏成长', '沪深300ETF', '易方达安心债券'];
    return funds.map((name, index) => ({
      fundId: `fund_${index + 1}`,
      fundName: name,
      weight: 20,
      marginalRisk: Math.random() * 0.02 + 0.01,
      contribution: Math.random() * 0.15 + 0.1,
      percentage: Math.random() * 30 + 10
    }));
  }

  private createMockStressTest() {
    const scenarios = [
      { name: '金融危机', description: '全球金融危机情景', loss: 0.25 },
      { name: '熊市', description: '市场大幅下跌', loss: 0.35 },
      { name: '利率上升', description: '利率快速上升', loss: 0.15 },
      { name: '通胀高企', description: '高通胀环境', loss: 0.20 }
    ];

    return scenarios.map(scenario => ({
      scenario: scenario.name,
      description: scenario.description,
      portfolioLoss: scenario.loss * 100000,
      lossRate: scenario.loss,
      worstFund: '易方达消费行业',
      worstFundLoss: scenario.loss * 1.2 * 20000
    }));
  }

  private createMockCorrelationMatrix(): CorrelationMatrix {
    const funds = [
      { id: 'fund_1', name: '易方达消费行业', code: '110022' },
      { id: 'fund_2', name: '招商中证白酒', code: '161725' },
      { id: 'fund_3', name: '华夏成长', code: '000001' },
      { id: 'fund_4', name: '沪深300ETF', code: '510300' },
      { id: 'fund_5', name: '易方达安心债券', code: '110022' }
    ];

    const matrix: number[][] = [];
    for (let i = 0; i < funds.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < funds.length; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          matrix[i][j] = Math.random() * 0.8 + 0.2; // 0.2-1.0相关性
        }
      }
    }

    const fundCorrelations = funds.map((fund, index) => ({
      fundId: fund.id,
      fundName: fund.name,
      fundCode: fund.code,
      correlations: funds.reduce((acc, f, i) => {
        acc[f.id] = matrix[index][i];
        return acc;
      }, {} as { [key: string]: number })
    }));

    const flatMatrix = matrix.flat();
    const avgCorrelation = flatMatrix.reduce((sum, val) => sum + val, 0) / flatMatrix.length;

    return {
      funds: fundCorrelations,
      matrix,
      averageCorrelation: avgCorrelation,
      minCorrelation: Math.min(...flatMatrix.filter(v => v !== 1)),
      maxCorrelation: Math.max(...flatMatrix.filter(v => v !== 1))
    };
  }

  private generateMockAssetAllocation(): Observable<AssetAllocation[]> {
    return of(this.createMockAssetAllocation()).pipe(delay(500));
  }

  private generateMockPerformance(): Observable<PortfolioPerformance> {
    return of(this.createMockPerformance()).pipe(delay(600));
  }

  private generateMockRiskAnalysis(): Observable<PortfolioRiskAnalysis> {
    return of(this.createMockRiskAnalysis()).pipe(delay(700));
  }

  private generateMockCorrelationMatrix(): Observable<CorrelationMatrix> {
    return of(this.createMockCorrelationMatrix()).pipe(delay(400));
  }

  private generateMockRecommendations(): Observable<any> {
    return of({
      overallRating: 4,
      riskLevel: 'medium',
      expectedReturn: 0.12,
      recommendedActions: [
        {
          type: 'rebalance',
          priority: 'high',
          description: '建议进行投资组合再平衡',
          reasoning: '当前配置偏离目标配置超过5%'
        }
      ]
    }).pipe(delay(300));
  }
}