import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { TradeRecord, TradeQuery, TradeResponse, CreateTradeRequest, UpdateTradeRequest } from '../models/trade-record.model';

@Injectable({
  providedIn: 'root'
})
export class TradeRecordService {
  private apiUrl = '/api'; // 基础API URL

  constructor(private http: HttpClient) {}

  /**
   * 获取交易记录列表
   * @param query 查询参数
   */
  getTrades(query?: TradeQuery): Observable<TradeResponse> {
    let params = new HttpParams();
    
    if (query) {
      Object.keys(query).forEach(key => {
        const value = query[key as keyof TradeQuery];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<TradeRecord[]>(`${this.apiUrl}/trades`, { params }).pipe(
      map(data => ({
        success: true,
        data,
        pagination: {
          page: query?.page || 1,
          size: query?.pageSize || 20,
          total: data.length,
          pages: Math.ceil(data.length / (query?.pageSize || 20))
        }
      })),
      catchError(error => {
        return of({
          success: false,
          data: [],
          pagination: {
            page: 1,
            size: 20,
            total: 0,
            pages: 0
          },
          error: error.message || '获取交易记录失败'
        });
      })
    );
  }

  /**
   * 根据ID获取交易记录详情
   * @param id 交易记录ID
   */
  getTradeById(id: string): Observable<TradeRecord | null> {
    return this.http.get<TradeRecord>(`${this.apiUrl}/trades/${id}`).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * 创建新的交易记录
   * @param trade 交易记录数据
   */
  createTrade(trade: CreateTradeRequest): Observable<{success: boolean, data?: TradeRecord, error?: string}> {
    return this.http.post<TradeRecord>(`${this.apiUrl}/trades`, trade).pipe(
      map(data => ({ success: true, data })),
      catchError(error => {
        return of({ 
          success: false, 
          error: error.message || '创建交易记录失败' 
        });
      })
    );
  }

  /**
   * 更新交易记录
   * @param id 交易记录ID
   * @param trade 更新的交易记录数据
   */
  updateTrade(id: string, trade: UpdateTradeRequest): Observable<{success: boolean, data?: TradeRecord, error?: string}> {
    return this.http.put<TradeRecord>(`${this.apiUrl}/trades/${id}`, trade).pipe(
      map(data => ({ success: true, data })),
      catchError(error => {
        return of({ 
          success: false, 
          error: error.message || '更新交易记录失败' 
        });
      })
    );
  }

  /**
   * 删除交易记录
   * @param id 交易记录ID
   */
  deleteTrade(id: string): Observable<boolean> {
    return this.http.delete(`${this.apiUrl}/trades/${id}`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }
}