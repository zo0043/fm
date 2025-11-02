// 交易记录
export interface TransactionRecord {
  id: string;
  fundId: string;
  fundCode: string;
  fundName: string;
  fundType: string;
  transactionType: 'buy' | 'sell' | 'redemption' | 'subscription' | 'switch';
  transactionDate: Date;
  tradeDate: Date;
  settlementDate: Date;
  amount: number;                  // 交易金额
  shares: number;                  // 交易份额
  nav: number;                     // 交易净值
  fee: number;                     // 手续费
  tax: number;                     // 税费
  netAmount: number;               // 实际金额
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  reference: string;               // 交易参考号
  channel: 'web' | 'mobile' | 'app' | 'phone' | 'offline';
  remarks?: string;                // 备注
}

// 净值历史记录
export interface NavHistory {
  id: string;
  fundId: string;
  fundCode: string;
  fundName: string;
  date: Date;
  unitNav: number;                // 单位净值
  accumulatedNav: number;         // 累计净值
  dailyChange: number;            // 日涨跌幅
  dailyChangeAmount: number;      // 日涨跌额
  weeklyChange: number;           // 周涨跌幅
  monthlyChange: number;          // 月涨跌幅
  yearlyChange: number;           // 年涨跌幅
  totalReturn: number;            // 累计收益率
  benchmarkNav?: number;          // 基准净值
  benchmarkReturn?: number;       // 基准收益率
}

// 操作日志
export interface OperationLog {
  id: string;
  userId: string;
  username: string;
  operation: string;              // 操作类型
  module: string;                 // 操作模块
  description: string;            // 操作描述
  details: { [key: string]: any }; // 操作详情
  ipAddress: string;              // IP地址
  userAgent: string;               // 用户代理
  status: 'success' | 'failed' | 'warning';
  errorMessage?: string;          // 错误信息
  timestamp: Date;                // 操作时间
}

// 分红记录
export interface DividendRecord {
  id: string;
  fundId: string;
  fundCode: string;
  fundName: string;
  exDividendDate: Date;          // 除权除息日
  recordDate: Date;               // 股权登记日
  paymentDate: Date;              // 派息日
  dividendType: 'cash' | 'stock' | 'hybrid';
  dividendPerUnit: number;        // 每份分红金额
  totalAmount: number;            // 分红总额
  afterTaxDividend: number;       // 税后分红
  taxRate: number;                // 税率
  reinvested: boolean;            // 是否再投资
  status: 'declared' | 'pending' | 'paid' | 'cancelled';
}

// 持仓历史记录
export interface HoldingHistory {
  id: string;
  fundId: string;
  fundCode: string;
  fundName: string;
  date: Date;
  shares: number;                 // 持有份额
  cost: number;                   // 成本
  marketValue: number;            // 市值
  averageCost: number;            // 平均成本
  unrealizedReturn: number;       // 未实现收益
  unrealizedReturnRate: number;   // 未实现收益率
  realizedReturn: number;         // 已实现收益
  realizedReturnRate: number;     // 已实现收益率
}

// 查询参数
export interface HistoryQuery {
  // 通用参数
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';

  // 交易记录专用
  fundId?: string;
  transactionType?: string;
  status?: string;
  channel?: string;

  // 净值历史专用
  fundIds?: string[];
  includeBenchmark?: boolean;

  // 操作日志专用
  module?: string;
  operation?: string;
  status?: string;
  userId?: string;
}

// 查询响应
export interface HistoryResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  statistics?: {
    totalAmount?: number;
    totalShares?: number;
    totalFee?: number;
    averageReturn?: number;
    bestPerformer?: string;
    worstPerformer?: string;
  };
  error?: string;
  timestamp: Date;
}

// 统计数据
export interface HistoryStatistics {
  // 交易统计
  transactionStats: {
    totalTransactions: number;
    totalAmount: number;
    totalFee: number;
    buyTransactions: number;
    sellTransactions: number;
    successRate: number;
    averageTransactionAmount: number;
    mostActiveFund: string;
    mostActiveDay: string;
  };

  // 收益统计
  returnStats: {
    totalInvested: number;
    currentValue: number;
    totalReturn: number;
    totalReturnRate: number;
    bestMonthReturn: number;
    worstMonthReturn: number;
    bestYearReturn: number;
    worstYearReturn: number;
    maxDrawdown: number;
    currentDrawdown: number;
  };

  // 操作统计
  operationStats: {
    totalOperations: number;
    successOperations: number;
    failedOperations: number;
    mostActiveModule: string;
    mostActiveUser?: string;
    operationFrequency: { [date: string]: number };
  };

  // 时间段统计
  periodStats: {
    daily: PeriodStats[];
    weekly: PeriodStats[];
    monthly: PeriodStats[];
    yearly: PeriodStats[];
  };
}

// 时间段统计
export interface PeriodStats {
  period: string;
  transactions: number;
  amount: number;
  return: number;
  fees: number;
}

// 导出配置
export interface ExportConfig {
  format: 'excel' | 'csv' | 'pdf';
  dataType: 'transactions' | 'nav_history' | 'operations' | 'dividends';
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  fields: string[];
  includeStatistics: boolean;
  filename?: string;
}

// 数据导出响应
export interface ExportResponse {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  fileSize?: number;
  error?: string;
  timestamp: Date;
}

// 过滤器配置
export interface FilterConfig {
  transactionTypes: Array<{ value: string; label: string }>;
  statusOptions: Array<{ value: string; label: string }>;
  channelOptions: Array<{ value: string; label: string }>;
  moduleOptions: Array<{ value: string; label: string }>;
  operationOptions: Array<{ value: string; label: string }>;
  sortOptions: Array<{ value: string; label: string }>;
}

// 预设时间范围
export const PRESET_DATE_RANGES = [
  { label: '最近7天', value: 7, unit: 'days' },
  { label: '最近30天', value: 30, unit: 'days' },
  { label: '最近3个月', value: 3, unit: 'months' },
  { label: '最近6个月', value: 6, unit: 'months' },
  { label: '最近1年', value: 1, unit: 'years' },
  { label: '最近3年', value: 3, unit: 'years' },
  { label: '今年至今', value: 'ytd', unit: 'special' },
  { label: '全部时间', value: 'all', unit: 'special' }
];

// 交易类型配置
export const TRANSACTION_TYPES = [
  { value: 'all', label: '全部类型' },
  { value: 'buy', label: '申购' },
  { value: 'sell', label: '赎回' },
  { value: 'subscription', label: '认购' },
  { value: 'redemption', label: '赎回' },
  { value: 'switch', label: '转换' }
];

// 交易状态配置
export const TRANSACTION_STATUS = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
  { value: 'cancelled', label: '已取消' }
];

// 操作类型配置
export const OPERATION_TYPES = [
  { value: 'all', label: '全部操作' },
  { value: 'login', label: '登录' },
  { value: 'logout', label: '登出' },
  { value: 'view', label: '查看' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'export', label: '导出' },
  { value: 'import', label: '导入' }
];

// 模块配置
export const MODULES = [
  { value: 'all', label: '全部模块' },
  { value: 'dashboard', label: '仪表板' },
  { value: 'funds', label: '基金管理' },
  { value: 'portfolio', label: '投资组合' },
  { value: 'backtest', label: '回测分析' },
  { value: 'monitor', label: '监控设置' },
  { value: 'user', label: '用户管理' },
  { value: 'system', label: '系统管理' }
];