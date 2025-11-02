import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import { HistoryService } from './services/history.service';
import {
  TransactionRecord,
  NavHistory,
  OperationLog,
  DividendRecord,
  HistoryQuery,
  HistoryResponse,
  HistoryStatistics,
  ExportConfig
} from './models/history.model';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // 标签页控制
  selectedTab = 0;

  // 交易记录数据
  transactions: TransactionRecord[] = [];
  transactionLoading = false;
  transactionError: string | null = null;
  transactionTotal = 0;
  transactionPage = 1;
  transactionPageSize = 20;

  // 净值历史数据
  navHistory: NavHistory[] = [];
  navLoading = false;
  navError: string | null = null;
  navTotal = 0;
  navPage = 1;
  navPageSize = 50;

  // 操作日志数据
  operationLogs: OperationLog[] = [];
  operationLoading = false;
  operationError: string | null = null;
  operationTotal = 0;
  operationPage = 1;
  operationPageSize = 20;

  // 分红记录数据
  dividendRecords: DividendRecord[] = [];
  dividendLoading = false;
  dividendError: string | null = null;
  dividendTotal = 0;
  dividendPage = 1;
  dividendPageSize = 20;

  // 统计数据
  statistics: HistoryStatistics | null = null;

  // 筛选条件
  transactionFilter: HistoryQuery = {};
  navFilter: HistoryQuery = {};
  operationFilter: HistoryQuery = {};
  dividendFilter: HistoryQuery = {};

  constructor(private historyService: HistoryService) {}

  ngOnInit() {
    this.loadInitialData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData() {
    this.loadTransactions();
    this.loadNavHistory();
    this.loadOperationLogs();
    this.loadDividendRecords();
    this.loadStatistics();
  }

  // 加载交易记录
  loadTransactions(page: number = 1) {
    this.transactionLoading = true;
    this.transactionError = null;
    this.transactionPage = page;

    const query = { ...this.transactionFilter, page, pageSize: this.transactionPageSize };

    this.historyService.getTransactions(query)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.transactionLoading = false)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.transactions = response.data;
            this.transactionTotal = response.pagination.total;
          } else {
            this.transactionError = response.error || '加载交易记录失败';
          }
        },
        error: (err) => {
          console.error('加载交易记录失败:', err);
          this.transactionError = '加载交易记录失败，请稍后重试';
        }
      });
  }

  // 加载净值历史
  loadNavHistory(page: number = 1) {
    this.navLoading = true;
    this.navError = null;
    this.navPage = page;

    const query = { ...this.navFilter, page, pageSize: this.navPageSize };

    this.historyService.getNavHistory(query)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.navLoading = false)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.navHistory = response.data;
            this.navTotal = response.pagination.total;
          } else {
            this.navError = response.error || '加载净值历史失败';
          }
        },
        error: (err) => {
          console.error('加载净值历史失败:', err);
          this.navError = '加载净值历史失败，请稍后重试';
        }
      });
  }

  // 加载操作日志
  loadOperationLogs(page: number = 1) {
    this.operationLoading = true;
    this.operationError = null;
    this.operationPage = page;

    const query = { ...this.operationFilter, page, pageSize: this.operationPageSize };

    this.historyService.getOperationLogs(query)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.operationLoading = false)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.operationLogs = response.data;
            this.operationTotal = response.pagination.total;
          } else {
            this.operationError = response.error || '加载操作日志失败';
          }
        },
        error: (err) => {
          console.error('加载操作日志失败:', err);
          this.operationError = '加载操作日志失败，请稍后重试';
        }
      });
  }

  // 加载分红记录
  loadDividendRecords(page: number = 1) {
    this.dividendLoading = true;
    this.dividendError = null;
    this.dividendPage = page;

    const query = { ...this.dividendFilter, page, pageSize: this.dividendPageSize };

    this.historyService.getDividendRecords(query)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.dividendLoading = false)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.dividendRecords = response.data;
            this.dividendTotal = response.pagination.total;
          } else {
            this.dividendError = response.error || '加载分红记录失败';
          }
        },
        error: (err) => {
          console.error('加载分红记录失败:', err);
          this.dividendError = '加载分红记录失败，请稍后重试';
        }
      });
  }

  // 加载统计数据
  loadStatistics() {
    this.historyService.getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics = stats;
        },
        error: (err) => {
          console.error('加载统计数据失败:', err);
        }
      });
  }

  // 事件处理方法
  onTabChange(index: number) {
    this.selectedTab = index;
  }

  onTransactionFilterChange(filter: HistoryQuery) {
    this.transactionFilter = filter;
    this.loadTransactions(1);
  }

  onTransactionPageChange(page: number) {
    this.loadTransactions(page);
  }

  onNavFilterChange(filter: HistoryQuery) {
    this.navFilter = filter;
    this.loadNavHistory(1);
  }

  onNavPageChange(page: number) {
    this.loadNavHistory(page);
  }

  onOperationFilterChange(filter: HistoryQuery) {
    this.operationFilter = filter;
    this.loadOperationLogs(1);
  }

  onOperationPageChange(page: number) {
    this.loadOperationLogs(page);
  }

  onDividendFilterChange(filter: HistoryQuery) {
    this.dividendFilter = filter;
    this.loadDividendRecords(1);
  }

  onDividendPageChange(page: number) {
    this.loadDividendRecords(page);
  }

  onExportTransactions() {
    const config: ExportConfig = {
      format: 'excel',
      dataType: 'transactions',
      dateRange: {
        startDate: this.transactionFilter.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        endDate: this.transactionFilter.endDate || new Date()
      },
      fields: ['transactionDate', 'fundName', 'transactionType', 'amount', 'status', 'channel'],
      includeStatistics: true,
      filename: `交易记录_${new Date().toISOString().split('T')[0]}.xlsx`
    };

    this.historyService.exportData(config)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.downloadUrl) {
            // 创建下载链接
            const link = document.createElement('a');
            link.href = response.downloadUrl;
            link.download = response.filename || 'export.xlsx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        },
        error: (err) => {
          console.error('导出失败:', err);
        }
      });
  }

  onExportNavHistory() {
    const config: ExportConfig = {
      format: 'csv',
      dataType: 'nav_history',
      dateRange: {
        startDate: this.navFilter.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        endDate: this.navFilter.endDate || new Date()
      },
      fields: ['date', 'fundName', 'unitNav', 'accumulatedNav', 'dailyChange'],
      includeStatistics: false,
      filename: `净值历史_${new Date().toISOString().split('T')[0]}.csv`
    };

    this.historyService.exportData(config)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.downloadUrl) {
            const link = document.createElement('a');
            link.href = response.downloadUrl;
            link.download = response.filename || 'export.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        },
        error: (err) => {
          console.error('导出失败:', err);
        }
      });
  }

  onRefresh() {
    switch (this.selectedTab) {
      case 0:
        this.loadTransactions(this.transactionPage);
        break;
      case 1:
        this.loadNavHistory(this.navPage);
        break;
      case 2:
        this.loadOperationLogs(this.operationPage);
        break;
      case 3:
        this.loadDividendRecords(this.dividendPage);
        break;
    }
    this.loadStatistics();
  }

  // 格式化方法
  formatCurrency(value: number): string {
    return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('zh-CN');
  }

  formatDateTime(date: Date): string {
    return date.toLocaleString('zh-CN');
  }

  // 获取统计数据摘要
  getSummaryStats() {
    if (!this.statistics) return null;

    return {
      totalTransactions: this.statistics.transactionStats.totalTransactions,
      totalAmount: this.statistics.transactionStats.totalAmount,
      totalReturn: this.statistics.returnStats.totalReturn,
      totalReturnRate: this.statistics.returnStats.totalReturnRate,
      successRate: this.statistics.transactionStats.successRate,
      totalOperations: this.statistics.operationStats.totalOperations
    };
  }

  // 获取当前标签页的数据
  getCurrentTabData() {
    switch (this.selectedTab) {
      case 0:
        return {
          loading: this.transactionLoading,
          error: this.transactionError,
          data: this.transactions,
          total: this.transactionTotal,
          page: this.transactionPage,
          pageSize: this.transactionPageSize
        };
      case 1:
        return {
          loading: this.navLoading,
          error: this.navError,
          data: this.navHistory,
          total: this.navTotal,
          page: this.navPage,
          pageSize: this.navPageSize
        };
      case 2:
        return {
          loading: this.operationLoading,
          error: this.operationError,
          data: this.operationLogs,
          total: this.operationTotal,
          page: this.operationPage,
          pageSize: this.operationPageSize
        };
      case 3:
        return {
          loading: this.dividendLoading,
          error: this.dividendError,
          data: this.dividendRecords,
          total: this.dividendTotal,
          page: this.dividendPage,
          pageSize: this.dividendPageSize
        };
      default:
        return null;
    }
  }

  // 获取当前标签页的标题
  getCurrentTabTitle(): string {
    const titles = ['交易记录', '净值历史', '操作日志', '分红记录'];
    return titles[this.selectedTab] || '历史记录';
  }
}