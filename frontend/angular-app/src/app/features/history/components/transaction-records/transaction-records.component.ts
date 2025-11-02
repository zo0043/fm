import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TransactionRecord, HistoryQuery, TransactionStatus } from '../../models/history.model';

@Component({
  selector: 'app-transaction-records',
  templateUrl: './transaction-records.component.html',
  styleUrls: ['./transaction-records.component.scss']
})
export class TransactionRecordsComponent {
  @Input() transactions: TransactionRecord[] = [];
  @Input() isLoading: boolean = false;
  @Input() totalCount: number = 0;
  @Input() currentPage: number = 1;
  @Input() pageSize: number = 20;
  @Input() statistics?: {
    totalAmount: number;
    totalFee: number;
    averageReturn: number;
  };

  @Output() pageChange = new EventEmitter<number>();
  @Output() filterChange = new EventEmitter<HistoryQuery>();
  @Output() exportData = new EventEmitter<void>();
  @Output() viewDetails = new EventEmitter<TransactionRecord>();

  // 筛选条件
  filterQuery: HistoryQuery = {};

  // 预设选项
  dateRanges = [
    { label: '最近7天', value: 7 },
    { label: '最近30天', value: 30 },
    { label: '最近3个月', value: 90 },
    { label: '最近6个月', value: 180 },
    { label: '最近1年', value: 365 }
  ];

  transactionTypes = [
    { value: 'all', label: '全部类型' },
    { value: 'buy', label: '申购' },
    { value: 'sell', label: '赎回' },
    { value: 'subscription', label: '认购' },
    { value: 'redemption', label: '赎回' },
    { value: 'switch', label: '转换' }
  ];

  statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'pending', label: '待处理' },
    { value: 'processing', label: '处理中' },
    { value: 'completed', label: '已完成' },
    { value: 'failed', label: '失败' },
    { value: 'cancelled', label: '已取消' }
  ];

  sortOptions = [
    { value: 'transactionDate', label: '交易日期' },
    { value: 'amount', label: '交易金额' },
    { value: 'netAmount', label: '净金额' },
    { value: 'fundName', label: '基金名称' }
  ];

  // 显示控制
  showFilters = false;
  selectedTransactionId: string | null = null;

  onFilterChange() {
    this.filterChange.emit(this.filterQuery);
  }

  onDateRangeChange(days: number) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    this.filterQuery.startDate = startDate;
    this.filterQuery.endDate = endDate;
    this.onFilterChange();
  }

  onCustomDateChange(event: any, type: 'start' | 'end') {
    if (type === 'start') {
      this.filterQuery.startDate = event.value;
    } else {
      this.filterQuery.endDate = event.value;
    }
    this.onFilterChange();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.pageChange.emit(page);
  }

  onExport() {
    this.exportData.emit();
  }

  onViewDetails(transaction: TransactionRecord) {
    this.selectedTransactionId = transaction.id;
    this.viewDetails.emit(transaction);
  }

  onCloseDetails() {
    this.selectedTransactionId = null;
  }

  onToggleFilters() {
    this.showFilters = !this.showFilters;
  }

  // 格式化方法
  formatCurrency(value: number): string {
    return `¥${Math.abs(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('zh-CN');
  }

  formatDateTime(date: Date): string {
    return date.toLocaleString('zh-CN');
  }

  getTransactionTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'buy': '申购',
      'sell': '赎回',
      'subscription': '认购',
      'redemption': '赎回',
      'switch': '转换'
    };
    return labels[type] || type;
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': '待处理',
      'processing': '处理中',
      'completed': '已完成',
      'failed': '失败',
      'cancelled': '已取消'
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'pending': '#ff9800',
      'processing': '#2196f3',
      'completed': '#4caf50',
      'failed': '#f44336',
      'cancelled': '#9e9e9e'
    };
    return colors[status] || '#666';
  }

  getChannelLabel(channel: string): string {
    const labels: { [key: string]: string } = {
      'web': '网页',
      'mobile': '手机网页',
      'app': 'APP',
      'phone': '电话',
      'offline': '柜台'
    };
    return labels[channel] || channel;
  }

  getAmountColor(transaction: TransactionRecord): string {
    return transaction.transactionType === 'buy' ? '#f44336' : '#4caf50';
  }

  getAmountPrefix(transaction: TransactionRecord): string {
    return transaction.transactionType === 'buy' ? '-' : '+';
  }

  // 计算统计数据
  get totalAmount(): number {
    if (this.statistics?.totalAmount) {
      return this.statistics.totalAmount;
    }
    return this.transactions.reduce((sum, t) => sum + t.amount, 0);
  }

  get totalFee(): number {
    if (this.statistics?.totalFee) {
      return this.statistics.totalFee;
    }
    return this.transactions.reduce((sum, t) => sum + t.fee, 0);
  }

  get totalNetAmount(): number {
    return this.transactions.reduce((sum, t) => sum + t.netAmount, 0);
  }

  get buyCount(): number {
    return this.transactions.filter(t => t.transactionType === 'buy').length;
  }

  get sellCount(): number {
    return this.transactions.filter(t => t.transactionType === 'sell').length;
  }

  get completedCount(): number {
    return this.transactions.filter(t => t.status === 'completed').length;
  }

  get pendingCount(): number {
    return this.transactions.filter(t => t.status === 'pending').length;
  }

  getSuccessRate(): number {
    if (this.transactions.length === 0) return 0;
    return (this.completedCount / this.transactions.length) * 100;
  }

  // 获取分页信息
  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  getPaginationArray(): number[] {
    const totalPages = this.totalPages;
    const current = this.currentPage;
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    range.push(1);
    for (let i = current - delta; i <= current + delta; i++) {
      if (i > 1 && i < totalPages) {
        range.push(i);
      }
    }
    range.push(totalPages);

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots as number[];
  }

  // 获取筛选器状态摘要
  getFilterSummary(): string {
    const parts: string[] = [];

    if (this.filterQuery.transactionType && this.filterQuery.transactionType !== 'all') {
      parts.push(`类型: ${this.getTransactionTypeLabel(this.filterQuery.transactionType)}`);
    }

    if (this.filterQuery.status && this.filterQuery.status !== 'all') {
      parts.push(`状态: ${this.getStatusLabel(this.filterQuery.status)}`);
    }

    if (this.filterQuery.startDate || this.filterQuery.endDate) {
      const start = this.filterQuery.startDate ? this.formatDate(this.filterQuery.startDate) : '开始';
      const end = this.filterQuery.endDate ? this.formatDate(this.filterQuery.endDate) : '结束';
      parts.push(`日期: ${start} - ${end}`);
    }

    return parts.length > 0 ? parts.join(' | ') : '无筛选条件';
  }

  // 重置筛选条件
  resetFilters() {
    this.filterQuery = {};
    this.onFilterChange();
  }

  // 应用筛选条件
  applyFilters() {
    this.showFilters = false;
    this.onFilterChange();
  }

  // 检查是否有活跃的筛选条件
  hasActiveFilters(): boolean {
    return Object.keys(this.filterQuery).length > 0;
  }
}