import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

import { Fund, NavData } from '../../features/models/dashboard.model';

export interface FundListResponse {
  success: boolean;
  data: {
    funds: Fund[];
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface FundDetailResponse {
  success: boolean;
  data: Fund & {
    navHistory: NavData[];
    performance: {
      daily: number;
      weekly: number;
      monthly: number;
      quarterly: number;
      yearly: number;
    };
  };
}

export interface FundFilter {
  type?: string;
  company?: string;
  manager?: string;
  status?: string;
  minSize?: number;
  maxSize?: number;
}

@Injectable({
  providedIn: 'root'
})
export class FundService {
  private apiUrl = environment.microservices.dataCollector;

  constructor(private http: HttpClient) {}

  getFunds(
    page: number = 1,
    pageSize: number = 20,
    filter?: FundFilter
  ): Observable<FundListResponse> {
    let url = `${this.apiUrl}/funds?page=${page}&size=${pageSize}`;

    if (filter) {
      if (filter.type) url += `&type=${encodeURIComponent(filter.type)}`;
      if (filter.company) url += `&company=${encodeURIComponent(filter.company)}`;
      if (filter.manager) url += `&manager=${encodeURIComponent(filter.manager)}`;
      if (filter.status) url += `&status=${encodeURIComponent(filter.status)}`;
      if (filter.minSize) url += `&minSize=${filter.minSize}`;
      if (filter.maxSize) url += `&maxSize=${filter.maxSize}`;
    }

    return this.http.get<FundListResponse>(url).pipe(
      catchError(this.handleError)
    );
  }

  getFundDetail(fundCode: string): Observable<FundDetailResponse> {
    return this.http.get<FundDetailResponse>(`${this.apiUrl}/funds/${fundCode}`).pipe(
      catchError(this.handleError)
    );
  }

  searchFunds(keyword: string): Observable<FundListResponse> {
    return this.http.get<FundListResponse>(`${this.apiUrl}/funds/search?q=${encodeURIComponent(keyword)}`).pipe(
      catchError(this.handleError)
    );
  }

  getFundTypes(): Observable<{ success: boolean; data: string[] }> {
    return this.http.get<{ success: boolean; data: string[] }>(`${this.apiUrl}/funds/types`).pipe(
      catchError(this.handleError)
    );
  }

  getFundCompanies(): Observable<{ success: boolean; data: string[] }> {
    return this.http.get<{ success: boolean; data: string[] }>(`${this.apiUrl}/funds/companies`).pipe(
      catchError(this.handleError)
    );
  }

  getNavHistory(
    fundCode: string,
    startDate?: string,
    endDate?: string
  ): Observable<{ success: boolean; data: NavData[] }> {
    let url = `${this.apiUrl}/funds/${fundCode}/nav`;

    if (startDate || endDate) {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      url += `?${params.toString()}`;
    }

    return this.http.get<{ success: boolean; data: NavData[] }>(url).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('Fund service error:', error);
    throw error;
  }
}