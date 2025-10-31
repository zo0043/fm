import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface MonitorRule {
  id: number;
  name: string;
  description: string;
  ruleType: string;
  conditionOperator: string;
  thresholdValue: number;
  notificationChannels: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMonitorRuleRequest {
  name: string;
  description: string;
  ruleType: string;
  conditionOperator: string;
  thresholdValue: number;
  notificationChannels: string[];
  fundCodes?: string[];
}

export interface MonitorResult {
  id: number;
  ruleId: number;
  ruleName: string;
  fundCode: string;
  fundName: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentValue: number;
  thresholdValue: number;
  status: 'pending' | 'acknowledged' | 'resolved';
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface RuleType {
  type: string;
  name: string;
  description: string;
  supportedOperators: string[];
  unit?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MonitorService {
  private apiUrl = environment.microservices.monitorEngine;

  constructor(private http: HttpClient) {}

  // 获取监控规则列表
  getRules(page: number = 1, pageSize: number = 20): Observable<{
    success: boolean;
    data: { rules: MonitorRule[]; total: number; page: number; pageSize: number; };
  }> {
    return this.http.get<{
      success: boolean;
      data: { rules: MonitorRule[]; total: number; page: number; pageSize: number; };
    }>(`${this.apiUrl}/rules?page=${page}&size=${pageSize}`).pipe(
      catchError(this.handleError)
    );
  }

  // 获取单个监控规则
  getRule(ruleId: number): Observable<{ success: boolean; data: MonitorRule }> {
    return this.http.get<{ success: boolean; data: MonitorRule }>(`${this.apiUrl}/rules/${ruleId}`).pipe(
      catchError(this.handleError)
    );
  }

  // 创建监控规则
  createRule(rule: CreateMonitorRuleRequest): Observable<{ success: boolean; data: MonitorRule }> {
    return this.http.post<{ success: boolean; data: MonitorRule }>(`${this.apiUrl}/rules`, rule).pipe(
      catchError(this.handleError)
    );
  }

  // 更新监控规则
  updateRule(ruleId: number, rule: Partial<CreateMonitorRuleRequest>): Observable<{ success: boolean; data: MonitorRule }> {
    return this.http.put<{ success: boolean; data: MonitorRule }>(`${this.apiUrl}/rules/${ruleId}`, rule).pipe(
      catchError(this.handleError)
    );
  }

  // 删除监控规则
  deleteRule(ruleId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/rules/${ruleId}`).pipe(
      catchError(this.handleError)
    );
  }

  // 启用/禁用监控规则
  toggleRule(ruleId: number, isActive: boolean): Observable<{ success: boolean; data: MonitorRule }> {
    return this.http.patch<{ success: boolean; data: MonitorRule }>(`${this.apiUrl}/rules/${ruleId}/toggle`, { isActive }).pipe(
      catchError(this.handleError)
    );
  }

  // 获取监控结果
  getMonitorResults(
    page: number = 1,
    pageSize: number = 20,
    status?: string,
    severity?: string,
    startDate?: string,
    endDate?: string
  ): Observable<{
    success: boolean;
    data: { results: MonitorResult[]; total: number; page: number; pageSize: number; };
  }> {
    let url = `${this.apiUrl}/monitor/results?page=${page}&size=${pageSize}`;

    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (severity) params.set('severity', severity);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    if (params.toString()) {
      url += `&${params.toString()}`;
    }

    return this.http.get<{
      success: boolean;
      data: { results: MonitorResult[]; total: number; page: number; pageSize: number; };
    }>(url).pipe(
      catchError(this.handleError)
    );
  }

  // 确认监控结果
  acknowledgeResult(resultId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/monitor/results/${resultId}/acknowledge`, {}).pipe(
      catchError(this.handleError)
    );
  }

  // 获取规则类型
  getRuleTypes(): Observable<{ success: boolean; data: RuleType[] }> {
    return this.http.get<{ success: boolean; data: RuleType[] }>(`${this.apiUrl}/rules/types`).pipe(
      catchError(this.handleError)
    );
  }

  // 获取操作符
  getOperators(): Observable<{ success: boolean; data: string[] }> {
    return this.http.get<{ success: boolean; data: string[] }>(`${this.apiUrl}/rules/operators`).pipe(
      catchError(this.handleError)
    );
  }

  // 手动执行规则
  executeRule(ruleId: number): Observable<{ success: boolean; message: string; data?: MonitorResult[] }> {
    return this.http.post<{ success: boolean; message: string; data?: MonitorResult[] }>(`${this.apiUrl}/rules/${ruleId}/execute`, {}).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('Monitor service error:', error);
    throw error;
  }
}