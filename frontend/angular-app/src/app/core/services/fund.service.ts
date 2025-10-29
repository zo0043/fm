import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, catchError, delay } from 'rxjs/operators';

import { FundInfo, KLineDataPoint, TrendInfo } from '../../models/fund.model';
import { MockDataService } from './mock-data.service';

export interface Fund {
  id: string;
  code: string;
  name: string;
  type: string;
  manager: string;
  establishDate: string;
  nav: number; // 净值
  totalNav: number; // 累计净值
  dailyChange: number; // 日涨跌幅
  dailyChangeAmount: number; // 日涨跌额
  weeklyChange: number; // 周涨跌幅
  monthlyChange: number; // 月涨跌幅
  yearlyChange: number; // 年涨跌幅
  minAmount: number; // 最小申购金额
  status: string; // 状态
  riskLevel: string; // 风险等级
  lastUpdated: string;
}

export interface FundHistoryData {
  date: string;
  nav: number;
  totalNav: number;
  dailyChange: number;
}

export interface FundListResponse {
  funds: Fund[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FundFilter {
  search?: string;
  type?: string;
  riskLevel?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class FundService {
  private apiUrl = '/api/funds';
  private fundsSubject = new BehaviorSubject<Fund[]>([]);
  public funds$ = this.fundsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private mockDataService: MockDataService
  ) {}

  /**
   * 获取基金列表
   */
  getFunds(filter: FundFilter = {}, page: number = 1, pageSize: number = 20): Observable<FundListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (filter.search) {
      params = params.set('search', filter.search);
    }
    if (filter.type) {
      params = params.set('type', filter.type);
    }
    if (filter.riskLevel) {
      params = params.set('riskLevel', filter.riskLevel);
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    if (filter.sortBy) {
      params = params.set('sortBy', filter.sortBy);
    }
    if (filter.sortOrder) {
      params = params.set('sortOrder', filter.sortOrder);
    }

    return this.http.get<FundListResponse>(this.apiUrl, { params }).pipe(
      tap(response => {
        if (page === 1) {
          this.fundsSubject.next(response.funds);
        }
      }),
      catchError(error => {
        console.error('获取基金列表失败:', error);
        return this.getMockFunds(filter, page, pageSize);
      })
    );
  }

  /**
   * 获取基金详情
   */
  getFundDetail(id: string): Observable<Fund> {
    return this.http.get<Fund>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => {
        console.error('获取基金详情失败:', error);
        return this.getMockFund(id);
      })
    );
  }

  /**
   * 获取基金历史数据
   */
  getFundHistory(id: string, startDate?: string, endDate?: string): Observable<FundHistoryData[]> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<FundHistoryData[]>(`${this.apiUrl}/${id}/history`, { params }).pipe(
      catchError(error => {
        console.error('获取基金历史数据失败:', error);
        return this.getMockFundHistory(id);
      })
    );
  }

  /**
   * 获取基金信息（适配新模型）
   */
  getFundInfo(id: string): Observable<FundInfo | null> {
    return this.mockDataService.getFundInfo(id);
  }

  /**
   * 获取基金K线图数据
   */
  getFundKLineData(id: string, days: number = 90): Observable<KLineDataPoint[]> {
    return this.mockDataService.getKLineData(id, days);
  }

  /**
   * 获取基金涨跌信息
   */
  getFundTrendInfo(id: string): Observable<TrendInfo | null> {
    return this.mockDataService.getTrendInfo(id);
  }

  /**
   * 转换历史数据为K线图数据格式
   */
  convertHistoryToKLineData(historyData: FundHistoryData[]): KLineDataPoint[] {
    return historyData.map(item => {
      const nav = item.nav;
      const totalNav = item.totalNav;
      const dailyChange = item.dailyChange;

      // 计算OHLC数据（简化处理，实际应用中需要真实数据）
      const open = nav * (1 - dailyChange * 0.5);
      const close = nav;
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);

      return {
        date: new Date(item.date),
        open: parseFloat(open.toFixed(4)),
        high: parseFloat(high.toFixed(4)),
        low: parseFloat(low.toFixed(4)),
        close: parseFloat(close.toFixed(4))
      };
    });
  }

  /**
   * 获取基金类型列表
   */
  getFundTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/types`).pipe(
      catchError(error => {
        console.error('获取基金类型失败:', error);
        return of(['股票型', '债券型', '混合型', '指数型', 'QDII', '货币型']);
      })
    );
  }

  /**
   * 获取风险等级列表
   */
  getRiskLevels(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/risk-levels`).pipe(
      catchError(error => {
        console.error('获取风险等级失败:', error);
        return of(['低风险', '中低风险', '中等风险', '中高风险', '高风险']);
      })
    );
  }

  /**
   * 添加基金到关注列表
   */
  addToWatchlist(fundId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${fundId}/watch`, {}).pipe(
      catchError(error => {
        console.error('添加关注失败:', error);
        return of({ success: false });
      })
    );
  }

  /**
   * 从关注列表移除基金
   */
  removeFromWatchlist(fundId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${fundId}/watch`).pipe(
      catchError(error => {
        console.error('取消关注失败:', error);
        return of({ success: false });
      })
    );
  }

  // Mock数据方法（用于开发测试）
  private getMockFunds(filter: FundFilter, page: number, pageSize: number): Observable<FundListResponse> {
    const mockFunds = this.generateMockFunds();
    return of({
      funds: mockFunds.slice((page - 1) * pageSize, page * pageSize),
      total: mockFunds.length,
      page,
      pageSize
    }).pipe(delay(500)); // 模拟网络延迟
  }

  private getMockFund(id: string): Observable<Fund> {
    const mockFunds = this.generateMockFunds();
    const fund = mockFunds.find(f => f.id === id);
    return of(fund || mockFunds[0]).pipe(delay(300));
  }

  private getMockFundHistory(id: string): Observable<FundHistoryData[]> {
    const history: FundHistoryData[] = [];
    const today = new Date();
    let nav = 1.0;

    for (let i = 252; i >= 0; i--) { // 一年的交易日
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // 模拟净值变化
      nav = nav * (1 + (Math.random() - 0.5) * 0.02); // 随机波动±2%
      const dailyChange = (Math.random() - 0.5) * 0.03; // 当日涨跌幅

      history.push({
        date: date.toISOString().split('T')[0],
        nav: parseFloat(nav.toFixed(4)),
        totalNav: parseFloat((nav * 1.15).toFixed(4)),
        dailyChange: parseFloat(dailyChange.toFixed(4))
      });
    }

    return of(history).pipe(delay(400));
  }

  // 新增Mock数据方法
  private getMockFundInfo(id: string): Observable<FundInfo | null> {
    const mockFunds = this.generateMockFundInfos();
    const fund = mockFunds.find(f => f.id === id);
    return of(fund || null).pipe(delay(300));
  }

  private getMockKLineData(id: string, days: number): Observable<KLineDataPoint[]> {
    const kLineData: KLineDataPoint[] = [];
    const today = new Date();
    let currentNav = 1.0;

    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // 模拟OHLC数据
      const dailyChange = (Math.random() - 0.5) * 0.03; // ±3%波动
      const open = currentNav;
      const close = currentNav * (1 + dailyChange);
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);

      kLineData.push({
        date: date,
        open: parseFloat(open.toFixed(4)),
        high: parseFloat(high.toFixed(4)),
        low: parseFloat(low.toFixed(4)),
        close: parseFloat(close.toFixed(4))
      });

      currentNav = close;
    }

    return of(kLineData).pipe(delay(400));
  }

  private getMockTrendInfo(id: string): Observable<TrendInfo | null> {
    const currentNav = 1.0 + (Math.random() - 0.3) * 0.5;
    const yesterdayNav = currentNav * (1 + (Math.random() - 0.5) * 0.03);
    const changeAmount = currentNav - yesterdayNav;
    const changePercent = (changeAmount / yesterdayNav) * 100;

    const trendInfo: TrendInfo = {
      currentNav,
      changeAmount,
      changePercent,
      trend: changeAmount > 0 ? 'up' : changeAmount < 0 ? 'down' : 'flat'
    };

    return of(trendInfo).pipe(delay(200));
  }

  private generateMockFundInfos(): FundInfo[] {
    const mockFunds: FundInfo[] = [];
    const types = ['stock', 'bond', 'hybrid', 'index', 'etf', 'qdii'];

    for (let i = 1; i <= 20; i++) {
      const currentNav = 1.0 + (Math.random() - 0.3) * 0.5;
      const yesterdayNav = currentNav * (1 + (Math.random() - 0.5) * 0.03);

      mockFunds.push({
        id: `fund_${i.toString().padStart(4, '0')}`,
        code: `${Math.floor(Math.random() * 900000) + 100000}`,
        name: `模拟基金${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        currentNav: parseFloat(currentNav.toFixed(4)),
        yesterdayNav: parseFloat(yesterdayNav.toFixed(4)),
        weekNav: parseFloat((currentNav * (1 + (Math.random() - 0.5) * 0.05)).toFixed(4)),
        monthNav: parseFloat((currentNav * (1 + (Math.random() - 0.5) * 0.1)).toFixed(4)),
        yearNav: parseFloat((currentNav * (1 + (Math.random() - 0.5) * 0.3)).toFixed(4)),
        lastUpdate: new Date()
      });
    }

    return mockFunds;
  }

  private generateMockFunds(): Fund[] {
    const mockFunds: Fund[] = [];
    const types = ['股票型', '债券型', '混合型', '指数型', 'QDII', '货币型'];
    const riskLevels = ['低风险', '中低风险', '中等风险', '中高风险', '高风险'];
    const managers = ['张三', '李四', '王五', '赵六', '陈七', '刘八'];

    for (let i = 1; i <= 50; i++) {
      const nav = 1 + (Math.random() - 0.3) * 0.5; // 0.85-1.35
      const dailyChange = (Math.random() - 0.5) * 0.05; // -2.5% to +2.5%

      mockFunds.push({
        id: `fund_${i.toString().padStart(4, '0')}`,
        code: `${Math.floor(Math.random() * 900000) + 100000}`,
        name: `模拟基金${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        manager: managers[Math.floor(Math.random() * managers.length)],
        establishDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        nav: parseFloat(nav.toFixed(4)),
        totalNav: parseFloat((nav * 1.15).toFixed(4)),
        dailyChange: parseFloat(dailyChange.toFixed(4)),
        dailyChangeAmount: parseFloat((nav * dailyChange).toFixed(4)),
        weeklyChange: parseFloat(((Math.random() - 0.5) * 0.1).toFixed(4)),
        monthlyChange: parseFloat(((Math.random() - 0.5) * 0.2).toFixed(4)),
        yearlyChange: parseFloat(((Math.random() - 0.5) * 0.5).toFixed(4)),
        minAmount: Math.floor(Math.random() * 9000) + 1000,
        status: Math.random() > 0.1 ? '正常' : '暂停',
        riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)],
        lastUpdated: new Date().toISOString()
      });
    }

    return mockFunds;
  }
}