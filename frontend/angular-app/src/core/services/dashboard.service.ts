import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

import {
  DashboardOverview,
  PortfolioOverview,
  PerformanceData,
  Alert,
  Activity,
  MarketSummary,
  Recommendation
} from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getOverview(): Observable<{ success: boolean; data: DashboardOverview }> {
    return this.http.get<{ success: boolean; data: DashboardOverview }>(`${this.baseUrl}/dashboard/overview`).pipe(
      catchError(this.handleError)
    );
  }

  getPortfolioOverview(): Observable<{ success: boolean; data: PortfolioOverview }> {
    return this.http.get<{ success: boolean; data: PortfolioOverview }>(`${this.baseUrl}/dashboard/portfolio`).pipe(
      catchError(this.handleError)
    );
  }

  getPerformance(period: string = '1m'): Observable<{ success: boolean; data: PerformanceData }> {
    return this.http.get<{ success: boolean; data: PerformanceData }>(`${this.baseUrl}/dashboard/performance?period=${period}`).pipe(
      catchError(this.handleError)
    );
  }

  getAlerts(
    status?: string = 'pending',
    severity?: string = 'all',
    limit: number = 10
  ): Observable<{ success: boolean; data: Alert[] }> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (severity) params.set('severity', severity);
    params.set('limit', limit.toString());

    return this.http.get<{ success: boolean; data: Alert[] }>(`${this.baseUrl}/dashboard/alerts?${params}`).pipe(
      catchError(this.handleError)
    );
  }

  getActivities(
    limit: number = 20,
    type: string = 'all'
  ): Observable<{ success: boolean; data: Activity[] }> {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    if (type !== 'all') params.set('type', type);

    return this.http.get<{ success: boolean; data: Activity[] }>(`${this.baseUrl}/dashboard/activities?${params}`).pipe(
      catchError(this.handleError)
    );
  }

  getMarketSummary(): Observable<{ success: boolean; data: MarketSummary }> {
    return this.http.get<{ success: boolean; data: MarketSummary }>(`${this.baseUrl}/dashboard/market-summary`).pipe(
      catchError(this.handleError)
    );
  }

  getRecommendations(): Observable<{ success: boolean; data: Recommendation[] }> {
    return this.http.get<{ success: boolean; data: Recommendation[] }>(`${this.baseUrl}/dashboard/recommendations`).pipe(
      catchError(this.handleError)
    );
  }

  acknowledgeAlert(alertId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post(`${this.baseUrl}/dashboard/alerts/${alertId}/acknowledge`).pipe(
      catchError(this.handleError)
    );
  }

  exportData(format: 'json' | 'csv' | 'pdf'): Observable<Blob> {
    const params = new URLSearchParams();
    params.set('format', format);

    return this.http.get(`${this.baseUrl}/dashboard/export?${params}`, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  refreshData(): Observable<any> {
    // 并行刷新所有数据
    return fork({
      overview: this.getOverview(),
      portfolio: this.getPortfolioOverview(),
      performance: this.getPerformance(),
      alerts: this.getAlerts(),
      activities: this.getActivities(),
      market: this.getMarketSummary(),
      recommendations: this.getRecommendations()
    }).pipe(
      map(results => {
        return {
          success: results.every(result => result.success),
          data: {
            overview: results.overview.data,
            portfolio: results.portfolio.data,
            performance: results.performance.data,
            alerts: results.alerts.data,
            activities: results.activities.data,
            market: results.market.data,
            recommendations: results.recommendations.data
          },
          timestamp: new Date().toISOString()
        };
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('Dashboard service error:', error);
    return throwError(() => error);
  }
}