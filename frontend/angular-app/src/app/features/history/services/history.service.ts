import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, delay } from 'rxjs/operators';

import {
  TransactionRecord,
  NavHistory,
  OperationLog,
  DividendRecord,
  HistoryQuery,
  HistoryResponse,
  HistoryStatistics,
  ExportConfig,
  ExportResponse
} from '../models/history.model';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private apiUrl = '/api/history';

  constructor(private http: HttpClient) {}

  // 交易记录相关方法
  getTransactions(query: HistoryQuery = {}): Observable<HistoryResponse<TransactionRecord>> {
    const params = this.buildQueryParams(query);
    return this.http.get<HistoryResponse<TransactionRecord>>(`${this.apiUrl}/transactions`, { params }).pipe(
      catchError(error => {
        console.error('获取交易记录失败:', error);
        return this.generateMockTransactions(query);
      })
    );
  }

  getTransaction(id: string): Observable<TransactionRecord | null> {
    return this.http.get<TransactionRecord>(`${this.apiUrl}/transactions/${id}`).pipe(
      catchError(error => {
        console.error('获取交易详情失败:', error);
        return this.generateMockTransaction(id);
      })
    );
  }

  // 净值历史相关方法
  getNavHistory(query: HistoryQuery = {}): Observable<HistoryResponse<NavHistory>> {
    const params = this.buildQueryParams(query);
    return this.http.get<HistoryResponse<NavHistory>>(`${this.apiUrl}/nav-history`, { params }).pipe(
      catchError(error => {
        console.error('获取净值历史失败:', error);
        return this.generateMockNavHistory(query);
      })
    );
  }

  // 操作日志相关方法
  getOperationLogs(query: HistoryQuery = {}): Observable<HistoryResponse<OperationLog>> {
    const params = this.buildQueryParams(query);
    return this.http.get<HistoryResponse<OperationLog>>(`${this.apiUrl}/operations`, { params }).pipe(
      catchError(error => {
        console.error('获取操作日志失败:', error);
        return this.generateMockOperationLogs(query);
      })
    );
  }

  // 分红记录相关方法
  getDividendRecords(query: HistoryQuery = {}): Observable<HistoryResponse<DividendRecord>> {
    const params = this.buildQueryParams(query);
    return this.http.get<HistoryResponse<DividendRecord>>(`${this.apiUrl}/dividends`, { params }).pipe(
      catchError(error => {
        console.error('获取分红记录失败:', error);
        return this.generateMockDividends(query);
      })
    );
  }

  // 统计数据相关方法
  getStatistics(query: HistoryQuery = {}): Observable<HistoryStatistics> {
    const params = this.buildQueryParams(query);
    return this.http.get<HistoryStatistics>(`${this.apiUrl}/statistics`, { params }).pipe(
      catchError(error => {
        console.error('获取统计数据失败:', error);
        return this.generateMockStatistics();
      })
    );
  }

  // 数据导出相关方法
  exportData(config: ExportConfig): Observable<ExportResponse> {
    return this.http.post<ExportResponse>(`${this.apiUrl}/export`, config).pipe(
      catchError(error => {
        console.error('导出数据失败:', error);
        return this.generateMockExportResponse(config);
      })
    );
  }

  // 工具方法
  private buildQueryParams(query: HistoryQuery): HttpParams {
    let params = new HttpParams();

    if (query.startDate) params = params.set('startDate', query.startDate.toISOString());
    if (query.endDate) params = params.set('endDate', query.endDate.toISOString());
    if (query.page) params = params.set('page', query.page.toString());
    if (query.pageSize) params = params.set('pageSize', query.pageSize.toString());
    if (query.sortBy) params = params.set('sortBy', query.sortBy);
    if (query.sortOrder) params = params.set('sortOrder', query.sortOrder);
    if (query.fundId) params = params.set('fundId', query.fundId);
    if (query.transactionType) params = params.set('transactionType', query.transactionType);
    if (query.status) params = params.set('status', query.status);
    if (query.channel) params = params.set('channel', query.channel);
    if (query.module) params = params.set('module', query.module);
    if (query.operation) params = params.set('operation', query.operation);
    if (query.userId) params = params.set('userId', query.userId);

    return params;
  }

  // Mock数据生成方法
  private generateMockTransactions(query: HistoryQuery): Observable<HistoryResponse<TransactionRecord>> {
    const mockData = this.createMockTransactions(query);
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = mockData.slice(startIndex, endIndex);

    return of({
      success: true,
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        total: mockData.length,
        totalPages: Math.ceil(mockData.length / pageSize)
      },
      statistics: {
        totalAmount: mockData.reduce((sum, item) => sum + item.amount, 0),
        totalFee: mockData.reduce((sum, item) => sum + item.fee, 0),
        averageReturn: 0.12
      },
      timestamp: new Date()
    }).pipe(delay(500));
  }

  private createMockTransactions(query: HistoryQuery): TransactionRecord[] {
    const funds = [
      { id: 'fund_1', code: '110022', name: '易方达消费行业', type: 'stock' },
      { id: 'fund_2', code: '161725', name: '招商中证白酒', type: 'index' },
      { id: 'fund_3', code: '000001', name: '华夏成长', type: 'hybrid' },
      { id: 'fund_4', code: '510300', name: '沪深300ETF', type: 'etf' }
    ];

    const transactions: TransactionRecord[] = [];
    const totalRecords = 150;

    for (let i = 0; i < totalRecords; i++) {
      const fund = funds[Math.floor(Math.random() * funds.length)];
      const transactionType = ['buy', 'sell'][Math.floor(Math.random() * 2)] as 'buy' | 'sell';
      const statusOptions = ['completed', 'completed', 'completed', 'failed', 'pending'] as const;
      const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
      const channelOptions = ['web', 'mobile', 'app'] as const;
      const channel = channelOptions[Math.floor(Math.random() * channelOptions.length)];

      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 365));

      transactions.push({
        id: `txn_${String(i + 1).padStart(6, '0')}`,
        fundId: fund.id,
        fundCode: fund.code,
        fundName: fund.name,
        fundType: fund.type,
        transactionType,
        transactionDate: date,
        tradeDate: new Date(date.getTime() + 24 * 60 * 60 * 1000),
        settlementDate: new Date(date.getTime() + 2 * 24 * 60 * 60 * 1000),
        amount: Math.floor(Math.random() * 50000) + 1000,
        shares: Math.floor(Math.random() * 10000) + 100,
        nav: Math.random() * 3 + 1,
        fee: Math.random() * 100 + 5,
        tax: Math.random() * 20,
        netAmount: 0, // 将在下面计算
        status,
        reference: `REF${Date.now()}${i}`,
        channel,
        remarks: Math.random() > 0.8 ? '系统自动处理' : undefined
      });

      // 计算净金额
      transactions[i].netAmount = transactions[i].amount * (transactions[i].transactionType === 'buy' ? -1 : 1) -
                                      (transactions[i].fee + transactions[i].tax);
    }

    // 应用过滤条件
    let filteredData = transactions;

    if (query.fundId) {
      filteredData = filteredData.filter(t => t.fundId === query.fundId);
    }
    if (query.transactionType && query.transactionType !== 'all') {
      filteredData = filteredData.filter(t => t.transactionType === query.transactionType);
    }
    if (query.status && query.status !== 'all') {
      filteredData = filteredData.filter(t => t.status === query.status);
    }
    if (query.startDate) {
      filteredData = filteredData.filter(t => t.transactionDate >= query.startDate!);
    }
    if (query.endDate) {
      filteredData = filteredData.filter(t => t.transactionDate <= query.endDate!);
    }

    // 排序
    if (query.sortBy) {
      filteredData.sort((a, b) => {
        const aValue = a[query.sortBy as keyof TransactionRecord];
        const bValue = b[query.sortBy as keyof TransactionRecord];
        const multiplier = query.sortOrder === 'desc' ? -1 : 1;
        return aValue > bValue ? multiplier : -multiplier;
      });
    }

    return filteredData;
  }

  private generateMockTransaction(id: string): Observable<TransactionRecord | null> {
    const mockData = this.createMockTransactions({});
    const transaction = mockData.find(t => t.id === id);
    return of(transaction || null).pipe(delay(300));
  }

  private generateMockNavHistory(query: HistoryQuery): Observable<HistoryResponse<NavHistory>> {
    const mockData = this.createMockNavHistory(query);
    const page = query.page || 1;
    const pageSize = query.pageSize || 50;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = mockData.slice(startIndex, endIndex);

    return of({
      success: true,
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        total: mockData.length,
        totalPages: Math.ceil(mockData.length / pageSize)
      },
      timestamp: new Date()
    }).pipe(delay(400));
  }

  private createMockNavHistory(query: HistoryQuery): NavHistory[] {
    const funds = [
      { id: 'fund_1', code: '110022', name: '易方达消费行业' },
      { id: 'fund_2', code: '161725', name: '招商中证白酒' },
      { id: 'fund_3', code: '000001', name: '华夏成长' }
    ];

    const history: NavHistory[] = [];
    const today = new Date();
    const startDate = query.startDate || new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate || today;

    funds.forEach(fund => {
      let nav = 1.0 + Math.random() * 0.5;
      let accumulatedNav = nav;

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        // 跳过周末
        if (d.getDay() === 0 || d.getDay() === 6) continue;

        const dailyChange = (Math.random() - 0.5) * 0.03;
        nav = nav * (1 + dailyChange);
        accumulatedNav = accumulatedNav * (1 + dailyChange);

        history.push({
          id: `nav_${fund.id}_${d.getTime()}`,
          fundId: fund.id,
          fundCode: fund.code,
          fundName: fund.name,
          date: new Date(d),
          unitNav: parseFloat(nav.toFixed(4)),
          accumulatedNav: parseFloat(accumulatedNav.toFixed(4)),
          dailyChange: parseFloat(dailyChange.toFixed(6)),
          dailyChangeAmount: parseFloat((dailyChange * nav).toFixed(4)),
          weeklyChange: parseFloat((Math.random() - 0.5) * 0.05.toFixed(4)),
          monthlyChange: parseFloat((Math.random() - 0.5) * 0.1.toFixed(4)),
          yearlyChange: parseFloat((Math.random() - 0.3) * 0.3.toFixed(4)),
          totalReturn: parseFloat(((accumulatedNav - 1) * 100).toFixed(2)),
          benchmarkNav: parseFloat((nav * (1 + (Math.random() - 0.5) * 0.01)).toFixed(4)),
          benchmarkReturn: parseFloat(((Math.random() - 0.5) * 0.02 * 100).toFixed(2))
        });
      }
    });

    return history.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  private generateMockOperationLogs(query: HistoryQuery): Observable<HistoryResponse<OperationLog>> {
    const mockData = this.createMockOperationLogs(query);
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = mockData.slice(startIndex, endIndex);

    return of({
      success: true,
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        total: mockData.length,
        totalPages: Math.ceil(mockData.length / pageSize)
      },
      timestamp: new Date()
    }).pipe(delay(300));
  }

  private createMockOperationLogs(query: HistoryQuery): OperationLog[] {
    const operations = [
      '登录', '查看基金', '申购基金', '赎回基金', '查看投资组合', '导出报告', '修改设置'
    ];
    const modules = ['dashboard', 'funds', 'portfolio', 'backtest', 'monitor'];
    const logs: OperationLog[] = [];

    for (let i = 0; i < 200; i++) {
      const date = new Date();
      date.setMinutes(date.getMinutes() - Math.floor(Math.random() * 10080)); // 最近一周

      logs.push({
        id: `log_${String(i + 1).padStart(6, '0')}`,
        userId: 'user_001',
        username: 'test_user',
        operation: operations[Math.floor(Math.random() * operations.length)],
        module: modules[Math.floor(Math.random() * modules.length)],
        description: `用户执行了${operations[Math.floor(Math.random() * operations.length)]}操作`,
        details: {
          ip: '192.168.1.' + Math.floor(Math.random() * 255),
          duration: Math.floor(Math.random() * 5000) + 100
        },
        ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        status: Math.random() > 0.1 ? 'success' : 'failed',
        errorMessage: Math.random() > 0.9 ? '操作失败：网络错误' : undefined,
        timestamp: date
      });
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private generateMockDividends(query: HistoryQuery): Observable<HistoryResponse<DividendRecord>> {
    const mockData = this.createMockDividends(query);
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = mockData.slice(startIndex, endIndex);

    return of({
      success: true,
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        total: mockData.length,
        totalPages: Math.ceil(mockData.length / pageSize)
      },
      timestamp: new Date()
    }).pipe(delay(400));
  }

  private createMockDividends(query: HistoryQuery): DividendRecord[] {
    const funds = [
      { id: 'fund_1', code: '110022', name: '易方达消费行业' },
      { id: 'fund_2', code: '161725', name: '招商中证白酒' }
    ];

    const dividends: DividendRecord[] = [];

    funds.forEach(fund => {
      for (let year = 2021; year <= 2024; year++) {
        for (let quarter = 1; quarter <= 4; quarter++) {
          const date = new Date(year, quarter * 3 - 1, 15);

          dividends.push({
            id: `div_${fund.id}_${year}_${quarter}`,
            fundId: fund.id,
            fundCode: fund.code,
            fundName: fund.name,
            exDividendDate: new Date(date.getTime() - 2 * 24 * 60 * 60 * 1000),
            recordDate: new Date(date.getTime() - 24 * 60 * 60 * 1000),
            paymentDate: new Date(date.getTime() + 3 * 24 * 60 * 60 * 1000),
            dividendType: Math.random() > 0.8 ? 'stock' : 'cash',
            dividendPerUnit: Math.random() * 0.1 + 0.01,
            totalAmount: Math.random() * 1000000 + 100000,
            afterTaxDividend: 0, // 将在下面计算
            taxRate: 0.2,
            reinvested: Math.random() > 0.5,
            status: 'paid'
          });

          dividends[dividends.length - 1].afterTaxDividend =
            dividends[dividends.length - 1].dividendPerUnit * (1 - dividends[dividends.length - 1].taxRate);
        }
      }
    });

    return dividends.sort((a, b) => b.exDividendDate.getTime() - a.exDividendDate.getTime());
  }

  private generateMockStatistics(): Observable<HistoryStatistics> {
    return of({
      transactionStats: {
        totalTransactions: 150,
        totalAmount: 2500000,
        totalFee: 5000,
        buyTransactions: 80,
        sellTransactions: 70,
        successRate: 0.95,
        averageTransactionAmount: 16667,
        mostActiveFund: '易方达消费行业',
        mostActiveDay: '2024-01-15'
      },
      returnStats: {
        totalInvested: 1000000,
        currentValue: 1120000,
        totalReturn: 120000,
        totalReturnRate: 0.12,
        bestMonthReturn: 0.08,
        worstMonthReturn: -0.05,
        bestYearReturn: 0.25,
        worstYearReturn: -0.15,
        maxDrawdown: -0.12,
        currentDrawdown: -0.02
      },
      operationStats: {
        totalOperations: 500,
        successOperations: 475,
        failedOperations: 25,
        mostActiveModule: 'funds',
        operationFrequency: {}
      },
      periodStats: {
        daily: [],
        weekly: [],
        monthly: [],
        yearly: []
      }
    }).pipe(delay(300));
  }

  private generateMockExportResponse(config: ExportConfig): Observable<ExportResponse> {
    return of({
      success: true,
      downloadUrl: `/api/downloads/export_${Date.now()}.${config.format}`,
      filename: `history_export_${Date.now()}.${config.format}`,
      fileSize: 1024 * 1024 * Math.random() + 500 * 1024, // 0.5MB - 1.5MB
      timestamp: new Date()
    }).pipe(delay(1000));
  }
}