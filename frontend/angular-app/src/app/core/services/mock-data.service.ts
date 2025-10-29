import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';

import { FundInfo, KLineDataPoint, TrendInfo } from '../../models/fund.model';
import {
  MOCK_FUNDS,
  generateMockKLineData,
  generateMockTrendInfo,
  MOCK_MARKET_INDICES,
  MOCK_FUND_TYPE_DISTRIBUTION,
  MOCK_PERFORMANCE_DATA
} from '../../mock-data/funds.mock';

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  constructor() {}

  // 获取基金列表
  getFunds(): Observable<FundInfo[]> {
    return of(MOCK_FUNDS).pipe(delay(300));
  }

  // 获取单个基金信息
  getFundInfo(id: string): Observable<FundInfo | null> {
    const fund = MOCK_FUNDS.find(f => f.id === id);
    return of(fund || null).pipe(delay(200));
  }

  // 获取K线图数据
  getKLineData(fundId: string, days: number = 90): Observable<KLineDataPoint[]> {
    const data = generateMockKLineData(days);
    return of(data).pipe(delay(400));
  }

  // 获取涨跌信息
  getTrendInfo(fundId: string): Observable<TrendInfo | null> {
    const fund = MOCK_FUNDS.find(f => f.id === fundId);
    if (!fund) return of(null).pipe(delay(200));

    const trendInfo = generateMockTrendInfo(fund);
    return of(trendInfo).pipe(delay(200));
  }

  // 获取市场指数
  getMarketIndices(): Observable<typeof MOCK_MARKET_INDICES> {
    return of(MOCK_MARKET_INDICES).pipe(delay(100));
  }

  // 获取基金类型分布
  getFundTypeDistribution(): Observable<typeof MOCK_FUND_TYPE_DISTRIBUTION> {
    return of(MOCK_FUND_TYPE_DISTRIBUTION).pipe(delay(150));
  }

  // 获取收益表现数据
  getPerformanceData(): Observable<typeof MOCK_PERFORMANCE_DATA> {
    return of(MOCK_PERFORMANCE_DATA).pipe(delay(200));
  }

  // 模拟实时数据更新
  simulateRealtimeUpdate(): Observable<{ fundId: string; newNav: number }> {
    const randomFund = MOCK_FUNDS[Math.floor(Math.random() * MOCK_FUNDS.length)];
    const changePercent = (Math.random() - 0.5) * 0.002; // ±0.1%变化
    const newNav = randomFund.currentNav * (1 + changePercent);

    return of({
      fundId: randomFund.id,
      newNav: parseFloat(newNav.toFixed(4))
    }).pipe(delay(1000));
  }

  // 生成随机基金代码
  generateRandomFundCode(): string {
    return Math.floor(Math.random() * 900000 + 100000).toString();
  }

  // 生成随机基金名称
  generateRandomFundName(): string {
    const prefixes = ['华夏', '易方达', '南方', '嘉实', '博时', '富国', '汇添富', '招商'];
    const suffixes = ['成长', '价值', '稳健', '积极', '优选', '精选', '领先', '先锋'];
    const types = ['股票', '混合', '债券', '指数', 'ETF'];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const type = types[Math.floor(Math.random() * types.length)];

    return `${prefix}${suffix}${type}`;
  }
}