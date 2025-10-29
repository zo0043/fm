import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, tap, catchError, retry } from 'rxjs/operators';
import { ApiConfigService } from './api-config.service';
import { AuthService } from './auth.service';

// 监控规则接口
export interface MonitorRule {
  id: number;
  rule_name: string;
  fund_code?: string;
  rule_type: string;
  condition_operator: string;
  threshold_value?: number;
  notification_channels: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 监控结果接口
export interface MonitorResult {
  id: number;
  rule_id: number;
  fund_code: string;
  trigger_time: string;
  trigger_value?: number;
  threshold_value?: number;
  notification_sent: boolean;
  notification_sent_at?: string;
  created_at: string;
  rule?: MonitorRule;
}

// 监控统计接口
export interface MonitorStatistics {
  totalRules: number;
  activeRules: number;
  totalResults: number;
  todayResults: number;
  successRate: number;
}

// 仪表板数据接口
export interface MonitorDashboard {
  overview: {
    totalFunds: number;
    monitoredFunds: number;
    activeRules: number;
    todayAlerts: number;
  };
  recentAlerts: MonitorResult[];
  ruleStatus: {
    active: number;
    inactive: number;
    error: number;
  };
  topTriggeredRules: Array<{
    rule: MonitorRule;
    triggerCount: number;
  }>;
}

// 创建/更新监控规则请求接口
export interface MonitorRuleRequest {
  rule_name: string;
  fund_code?: string;
  rule_type: string;
  condition_operator: string;
  threshold_value?: number;
  notification_channels: string[];
}

// 监控筛选接口
export interface MonitorFilter {
  rule_type?: string;
  fund_code?: string;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
  page?: number;
  size?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MonitorService {
  private rulesSubject = new BehaviorSubject<MonitorRule[]>([]);
  public rules$ = this.rulesSubject.asObservable();

  private resultsSubject = new BehaviorSubject<MonitorResult[]>([]);
  public results$ = this.resultsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private apiConfig: ApiConfigService,
    private authService: AuthService
  ) {}

  /**
   * 获取监控规则列表
   */
  getRules(filter: MonitorFilter = {}): Observable<{ data: MonitorRule[], pagination: any }> {
    this.loadingSubject.next(true);

    let params = new HttpParams();
    params = params.set('page', (filter.page || 1).toString());
    params = params.set('size', (filter.size || 20).toString());

    if (filter.rule_type) {
      params = params.set('rule_type', filter.rule_type);
    }
    if (filter.fund_code) {
      params = params.set('fund_code', filter.fund_code);
    }
    if (filter.is_active !== undefined) {
      params = params.set('is_active', filter.is_active.toString());
    }

    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(this.apiConfig.rulesUrl, { params, headers }).pipe(
      retry(2),
      map(response => ({
        data: response.data || [],
        pagination: response.pagination || {
          page: filter.page || 1,
          size: filter.size || 20,
          total: 0,
          pages: 0
        }
      })),
      tap(response => {
        if (filter.page === 1) {
          this.rulesSubject.next(response.data);
        }
        this.loadingSubject.next(false);
      }),
      catchError(error => this.handleError(error, '获取监控规则失败'))
    );
  }

  /**
   * 获取监控规则详情
   */
  getRuleDetail(ruleId: number): Observable<MonitorRule> {
    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(`${this.apiConfig.rulesUrl}/${ruleId}`, { headers }).pipe(
      map(response => this.transformRuleData(response)),
      catchError(error => this.handleError(error, '获取监控规则详情失败'))
    );
  }

  /**
   * 创建监控规则
   */
  createRule(ruleData: MonitorRuleRequest): Observable<MonitorRule> {
    const headers = this.authService.getAuthHeaders();

    return this.http.post<any>(this.apiConfig.rulesUrl, ruleData, { headers }).pipe(
      map(response => this.transformRuleData(response)),
      tap(rule => {
        // 更新本地规则列表
        const currentRules = this.rulesSubject.value;
        this.rulesSubject.next([...currentRules, rule]);
      }),
      catchError(error => this.handleError(error, '创建监控规则失败'))
    );
  }

  /**
   * 更新监控规则
   */
  updateRule(ruleId: number, ruleData: MonitorRuleRequest): Observable<MonitorRule> {
    const headers = this.authService.getAuthHeaders();

    return this.http.put<any>(`${this.apiConfig.rulesUrl}/${ruleId}`, ruleData, { headers }).pipe(
      map(response => this.transformRuleData(response)),
      tap(updatedRule => {
        // 更新本地规则列表
        const currentRules = this.rulesSubject.value;
        const updatedRules = currentRules.map(rule =>
          rule.id === ruleId ? updatedRule : rule
        );
        this.rulesSubject.next(updatedRules);
      }),
      catchError(error => this.handleError(error, '更新监控规则失败'))
    );
  }

  /**
   * 删除监控规则
   */
  deleteRule(ruleId: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();

    return this.http.delete(`${this.apiConfig.rulesUrl}/${ruleId}`, { headers }).pipe(
      tap(() => {
        // 从本地规则列表中移除
        const currentRules = this.rulesSubject.value;
        const updatedRules = currentRules.filter(rule => rule.id !== ruleId);
        this.rulesSubject.next(updatedRules);
      }),
      catchError(error => this.handleError(error, '删除监控规则失败'))
    );
  }

  /**
   * 切换监控规则状态
   */
  toggleRuleStatus(ruleId: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();

    return this.http.post(`${this.apiConfig.rulesUrl}/${ruleId}/toggle`, {}, { headers }).pipe(
      tap(response => {
        // 更新本地规则状态
        const currentRules = this.rulesSubject.value;
        const updatedRules = currentRules.map(rule =>
          rule.id === ruleId ? { ...rule, is_active: response.is_active } : rule
        );
        this.rulesSubject.next(updatedRules);
      }),
      catchError(error => this.handleError(error, '切换规则状态失败'))
    );
  }

  /**
   * 获取监控结果列表
   */
  getResults(filter: MonitorFilter = {}): Observable<{ data: MonitorResult[], pagination: any }> {
    let params = new HttpParams();
    params = params.set('page', (filter.page || 1).toString());
    params = params.set('size', (filter.size || 20).toString());

    if (filter.fund_code) {
      params = params.set('fund_code', filter.fund_code);
    }
    if (filter.start_date) {
      params = params.set('start_date', filter.start_date);
    }
    if (filter.end_date) {
      params = params.set('end_date', filter.end_date);
    }

    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(`${this.apiConfig.monitorUrl}/results`, { params, headers }).pipe(
      retry(2),
      map(response => ({
        data: (response.data || []).map((item: any) => this.transformResultData(item)),
        pagination: response.pagination || {
          page: filter.page || 1,
          size: filter.size || 20,
          total: 0,
          pages: 0
        }
      })),
      tap(response => {
        if (filter.page === 1) {
          this.resultsSubject.next(response.data);
        }
      }),
      catchError(error => this.handleError(error, '获取监控结果失败'))
    );
  }

  /**
   * 获取监控结果详情
   */
  getResultDetail(resultId: number): Observable<MonitorResult> {
    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(`${this.apiConfig.monitorUrl}/results/${resultId}`, { headers }).pipe(
      map(response => this.transformResultData(response)),
      catchError(error => this.handleError(error, '获取监控结果详情失败'))
    );
  }

  /**
   * 手动执行监控任务
   */
  runMonitor(fundCodes?: string[]): Observable<any> {
    const params = fundCodes ? new HttpParams().set('fund_codes', fundCodes.join(',')) : undefined;
    const headers = this.authService.getAuthHeaders();

    return this.http.post(`${this.apiConfig.monitorUrl}/run`, null, { params, headers }).pipe(
      catchError(error => this.handleError(error, '执行监控任务失败'))
    );
  }

  /**
   * 获取监控告警列表
   */
  getAlerts(filter: MonitorFilter = {}): Observable<MonitorResult[]> {
    let params = new HttpParams();
    if (filter.fund_code) {
      params = params.set('fund_code', filter.fund_code);
    }
    if (filter.start_date) {
      params = params.set('start_date', filter.start_date);
    }
    if (filter.end_date) {
      params = params.set('end_date', filter.end_date);
    }

    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(`${this.apiConfig.monitorUrl}/alerts`, { params, headers }).pipe(
      map(response => (response.data || []).map((item: any) => this.transformResultData(item))),
      catchError(error => this.handleError(error, '获取监控告警失败'))
    );
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();

    return this.http.post(`${this.apiConfig.monitorUrl}/alerts/${alertId}/acknowledge`, {}, { headers }).pipe(
      catchError(error => this.handleError(error, '确认告警失败'))
    );
  }

  /**
   * 获取监控统计信息
   */
  getMonitorStatistics(): Observable<MonitorStatistics> {
    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(`${this.apiConfig.monitorUrl}/statistics`, { headers }).pipe(
      map(response => ({
        totalRules: response.total_rules || 0,
        activeRules: response.active_rules || 0,
        totalResults: response.total_results || 0,
        todayResults: response.today_results || 0,
        successRate: response.success_rate || 0
      })),
      catchError(error => this.handleError(error, '获取监控统计失败'))
    );
  }

  /**
   * 获取监控仪表板数据
   */
  getMonitorDashboard(): Observable<MonitorDashboard> {
    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(`${this.apiConfig.monitorUrl}/dashboard`, { headers }).pipe(
      map(response => ({
        overview: {
          totalFunds: response.overview?.total_funds || 0,
          monitoredFunds: response.overview?.monitored_funds || 0,
          activeRules: response.overview?.active_rules || 0,
          todayAlerts: response.overview?.today_alerts || 0
        },
        recentAlerts: (response.recent_alerts || []).map((item: any) => this.transformResultData(item)),
        ruleStatus: {
          active: response.rule_status?.active || 0,
          inactive: response.rule_status?.inactive || 0,
          error: response.rule_status?.error || 0
        },
        topTriggeredRules: (response.top_triggered_rules || []).map((item: any) => ({
          rule: this.transformRuleData(item.rule),
          triggerCount: item.trigger_count
        }))
      })),
      catchError(error => this.handleError(error, '获取监控仪表板数据失败'))
    );
  }

  /**
   * 获取规则类型列表
   */
  getRuleTypes(): Observable<string[]> {
    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(`${this.apiConfig.rulesUrl}/types`, { headers }).pipe(
      map(response => response.data || []),
      catchError(error => this.handleError(error, '获取规则类型失败'))
    );
  }

  /**
   * 获取条件操作符列表
   */
  getConditionOperators(): Observable<string[]> {
    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(`${this.apiConfig.rulesUrl}/operators`, { headers }).pipe(
      map(response => response.data || []),
      catchError(error => this.handleError(error, '获取条件操作符失败'))
    );
  }

  /**
   * 获取通知渠道列表
   */
  getNotificationChannels(): Observable<string[]> {
    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(`${this.apiConfig.rulesUrl}/channels`, { headers }).pipe(
      map(response => response.data || []),
      catchError(error => this.handleError(error, '获取通知渠道失败'))
    );
  }

  /**
   * 获取监控状态
   */
  getMonitorStatus(): Observable<any> {
    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(`${this.apiConfig.monitorUrl}/status`, { headers }).pipe(
      catchError(error => this.handleError(error, '获取监控状态失败'))
    );
  }

  /**
   * 转换规则数据格式
   */
  private transformRuleData(data: any): MonitorRule {
    return {
      id: data.id,
      rule_name: data.rule_name,
      fund_code: data.fund_code,
      rule_type: data.rule_type,
      condition_operator: data.condition_operator,
      threshold_value: data.threshold_value,
      notification_channels: data.notification_channels || [],
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }

  /**
   * 转换结果数据格式
   */
  private transformResultData(data: any): MonitorResult {
    return {
      id: data.id,
      rule_id: data.rule_id,
      fund_code: data.fund_code,
      trigger_time: data.trigger_time,
      trigger_value: data.trigger_value,
      threshold_value: data.threshold_value,
      notification_sent: data.notification_sent,
      notification_sent_at: data.notification_sent_at,
      created_at: data.created_at,
      rule: data.rule ? this.transformRuleData(data.rule) : undefined
    };
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