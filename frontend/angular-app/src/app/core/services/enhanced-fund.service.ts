import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, tap, catchError, retry } from 'rxjs/operators';
import { ApiConfigService } from './api-config.service';
import { AuthService } from './auth.service';

// 基金信息接口
export interface Fund {
  id: number;
  fund_code: string;
  fund_name: string;
  fund_type: string;
  fund_company?: string;
  establish_date?: string;
  fund_manager?: string;
  fund_size?: number;
  management_fee_rate?: number;
  custody_fee_rate?: number;
  status: string;
  created_at: string;
  updated_at: string;
  recent_navs?: NavData[];
}

// 净值数据接口
export interface NavData {
  nav_date: string;
  unit_nav: number;
  accumulated_nav: number;
  daily_change_rate?: number;
  daily_change_amount?: number;
}

// 基金列表响应接口
export interface FundListResponse {
  data: Fund[];
  pagination: {
    page: number;
    size: number;
    total: number;
    pages: number;
  };
}

// 基金筛选接口
export interface FundFilter {
  search?: string;
  fund_type?: string;
  fund_company?: string;
  status?: string;
  page?: number;
  size?: number;
}

// K线图数据点接口
export interface KLineDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// 趋势信息接口
export interface TrendInfo {
  currentNav: number;
  changeAmount: number;
  changePercent: number;
  trend: 'up' | 'down' | 'flat';
  lastUpdate: string;
}

// 统计数据接口
export interface FundStatistics {
  totalFunds: number;
  activeFunds: number;
  totalTypes: number;
  averageNav: number;
  bestPerformer: Fund;
  worstPerformer: Fund;
}

@Injectable({
  providedIn: 'root'
})
export class EnhancedFundService {
  private fundsSubject = new BehaviorSubject<Fund[]>([]);
  public funds$ = this.fundsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private apiConfig: ApiConfigService,
    private authService: AuthService
  ) {}

  /**
   * 获取基金列表
   */
  getFunds(filter: FundFilter = {}): Observable<FundListResponse> {
    this.loadingSubject.next(true);

    let params = new HttpParams();

    // 设置分页参数
    params = params.set('page', (filter.page || 1).toString());
    params = params.set('size', (filter.size || 20).toString());

    // 添加筛选参数
    if (filter.fund_type) {
      params = params.set('fund_type', filter.fund_type);
    }
    if (filter.fund_company) {
      params = params.set('fund_company', filter.fund_company);
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }

    // 构建请求头
    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(this.apiConfig.fundsUrl, { params, headers }).pipe(
      retry(2), // 失败时重试2次
      map(response => {
        // 转换数据格式
        const transformedResponse: FundListResponse = {
          data: response.data || [],
          pagination: response.pagination || {
            page: filter.page || 1,
            size: filter.size || 20,
            total: 0,
            pages: 0
          }
        };

        // 更新本地数据
        if (filter.page === 1) {
          this.fundsSubject.next(transformedResponse.data);
        }

        return transformedResponse;
      }),
      tap(() => this.loadingSubject.next(false)),
      catchError(error => this.handleError(error, '获取基金列表失败'))
    );
  }

  /**
   * 获取基金详情
   */
  getFundDetail(fundCode: string): Observable<Fund> {
    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(`${this.apiConfig.fundsUrl}/${fundCode}`, { headers }).pipe(
      map(response => this.transformFundData(response)),
      catchError(error => this.handleError(error, '获取基金详情失败'))
    );
  }

  /**
   * 搜索基金
   */
  searchFunds(query: string, page: number = 1, size: number = 20): Observable<FundListResponse> {
    return this.getFunds({
      search: query,
      page,
      size
    });
  }

  /**
   * 获取基金历史净值数据
   */
  getFundNavHistory(fundCode: string, startDate?: string, endDate?: string): Observable<NavData[]> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('start_date', startDate);
    }
    if (endDate) {
      params = params.set('end_date', endDate);
    }

    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(`${this.apiConfig.navUrl}/history/${fundCode}`, { params, headers }).pipe(
      map(response => response.data || []),
      catchError(error => this.handleError(error, '获取基金历史数据失败'))
    );
  }

  /**
   * 获取最新净值
   */
  getLatestNav(fundCode: string): Observable<NavData | null> {
    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(`${this.apiConfig.navUrl}/latest/${fundCode}`, { headers }).pipe(
      map(response => response.data || null),
      catchError(error => this.handleError(error, '获取最新净值失败'))
    );
  }

  /**
   * 获取基金K线图数据
   */
  getFundKLineData(fundCode: string, days: number = 90): Observable<KLineDataPoint[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    return this.getFundNavHistory(
      fundCode,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    ).pipe(
      map(navData => this.convertNavToKLineData(navData)),
      catchError(error => this.handleError(error, '获取K线数据失败'))
    );
  }

  /**
   * 获取基金涨跌信息
   */
  getFundTrendInfo(fundCode: string): Observable<TrendInfo | null> {
    return this.getLatestNav(fundCode).pipe(
      map(nav => {
        if (!nav) return null;

        const changeAmount = nav.daily_change_amount || 0;
        const changePercent = nav.daily_change_rate || 0;
        let trend: 'up' | 'down' | 'flat' = 'flat';

        if (changeAmount > 0) {
          trend = 'up';
        } else if (changeAmount < 0) {
          trend = 'down';
        }

        return {
          currentNav: nav.unit_nav,
          changeAmount,
          changePercent,
          trend,
          lastUpdate: nav.nav_date
        };
      })
    );
  }

  /**
   * 获取基金类型列表
   */
  getFundTypes(): Observable<string[]> {
    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(`${this.apiConfig.fundsUrl}/types`, { headers }).pipe(
      map(response => response.data || []),
      catchError(error => this.handleError(error, '获取基金类型失败'))
    );
  }

  /**
   * 获取基金公司列表
   */
  getFundCompanies(): Observable<string[]> {
    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(`${this.apiConfig.fundsUrl}/companies`, { headers }).pipe(
      map(response => response.data || []),
      catchError(error => this.handleError(error, '获取基金公司失败'))
    );
  }

  /**
   * 收集基金数据
   */
  collectFundsData(forceUpdate: boolean = false, fundCodes?: string[]): Observable<any> {
    let params = new HttpParams().set('force_update', forceUpdate.toString());
    if (fundCodes && fundCodes.length > 0) {
      params = params.set('fund_codes', fundCodes.join(','));
    }

    const headers = this.authService.getAuthHeaders();

    return this.http.post(`${this.apiConfig.fundsUrl}/collect`, null, { params, headers }).pipe(
      catchError(error => this.handleError(error, '收集基金数据失败'))
    );
  }

  /**
   * 收集净值数据
   */
  collectNavData(forceUpdate: boolean = false, fundCodes?: string[]): Observable<any> {
    let params = new HttpParams().set('force_update', forceUpdate.toString());
    if (fundCodes && fundCodes.length > 0) {
      params = params.set('fund_codes', fundCodes.join(','));
    }

    const headers = this.authService.getAuthHeaders();

    return this.http.post(`${this.apiConfig.navUrl}/collect`, null, { params, headers }).pipe(
      catchError(error => this.handleError(error, '收集净值数据失败'))
    );
  }

  /**
   * 获取基金统计数据
   */
  getFundStatistics(): Observable<FundStatistics> {
    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(`${this.apiConfig.navUrl}/summary`, { headers }).pipe(
      map(response => ({
        totalFunds: response.total_funds || 0,
        activeFunds: response.active_funds || 0,
        totalTypes: response.total_types || 0,
        averageNav: response.average_nav || 0,
        bestPerformer: response.best_performer,
        worstPerformer: response.worst_performer
      })),
      catchError(error => this.handleError(error, '获取基金统计数据失败'))
    );
  }

  /**
   * 清理旧净值数据
   */
  cleanupOldData(daysToKeep: number = 365): Observable<any> {
    const params = new HttpParams().set('days_to_keep', daysToKeep.toString());
    const headers = this.authService.getAuthHeaders();

    return this.http.delete(`${this.apiConfig.navUrl}/cleanup`, { params, headers }).pipe(
      catchError(error => this.handleError(error, '清理旧数据失败'))
    );
  }

  /**
   * 刷新基金数据
   */
  refreshFundsData(): void {
    if (this.fundsSubject.value.length > 0) {
      this.getFunds({ page: 1, size: 20 }).subscribe();
    }
  }

  /**
   * 转换基金数据格式
   */
  private transformFundData(data: any): Fund {
    return {
      id: data.id,
      fund_code: data.fund_code,
      fund_name: data.fund_name,
      fund_type: data.fund_type,
      fund_company: data.fund_company,
      establish_date: data.establish_date,
      fund_manager: data.fund_manager,
      fund_size: data.fund_size,
      management_fee_rate: data.management_fee_rate,
      custody_fee_rate: data.custody_fee_rate,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      recent_navs: data.recent_navs || []
    };
  }

  /**
   * 将净值数据转换为K线图数据
   */
  private convertNavToKLineData(navData: NavData[]): KLineDataPoint[] {
    return navData.map((item, index) => {
      const close = item.unit_nav;
      const changeRate = item.daily_change_rate || 0;

      // 简化计算OHLC数据（实际应用中需要更复杂的计算）
      let open: number, high: number, low: number;

      if (index === 0) {
        // 第一条数据
        open = close * (1 - changeRate * 0.5);
      } else {
        open = navData[index - 1].unit_nav;
      }

      high = Math.max(open, close) * (1 + Math.random() * 0.01);
      low = Math.min(open, close) * (1 - Math.random() * 0.01);

      return {
        date: item.nav_date,
        open: parseFloat(open.toFixed(4)),
        high: parseFloat(high.toFixed(4)),
        low: parseFloat(low.toFixed(4)),
        close: parseFloat(close.toFixed(4)),
        volume: undefined // 基金没有成交量概念
      };
    });
  }

  /**
   * 错误处理
   */
  private handleError(error: any, defaultMessage: string): Observable<never> {
    console.error(`${defaultMessage}:`, error);

    let message = defaultMessage;

    if (error.error && error.error.detail) {
      message = error.error.detail;
    } else if (error.status === 401) {
      message = '请先登录';
    } else if (error.status === 403) {
      message = '权限不足';
    } else if (error.status === 404) {
      message = '请求的资源不存在';
    } else if (error.status === 500) {
      message = '服务器内部错误，请稍后重试';
    }

    return throwError(() => new Error(message));
  }
}