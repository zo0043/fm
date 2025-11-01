// 回测功能数据模型

export interface BacktestConfig {
  strategy: BacktestStrategy;
  funds: FundAllocation[];
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  investment: {
    amount: number;
    frequency: InvestmentFrequency;
    dayOfMonth?: number; // 每月定投日期
  };
  benchmark?: string; // 对比基准
}

export interface BacktestStrategy {
  id: string;
  name: string;
  type: 'fixed-amount' | 'fixed-amount-scheduled' | 'smart' | 'value-averaging';
  description: string;
  params?: StrategyParams;
}

export interface StrategyParams {
  // 智能定投参数
  threshold?: number; // 阈值
  volatilityAdjustment?: boolean; // 波动率调整
  // 价值平均策略参数
  targetGrowthRate?: number; // 目标增长率
}

export interface FundAllocation {
  fundId: string;
  fundCode: string;
  fundName: string;
  weight: number; // 权重 0-100
  minAmount?: number; // 最小投资金额
}

export type InvestmentFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly';

export interface BacktestResult {
  summary: BacktestSummary;
  performance: PerformanceData[];
  statistics: BacktestStatistics;
  drawdowns: DrawdownData[];
  monthlyReturns: MonthlyReturnData[];
  yearlyReturns: YearlyReturnData[];
}

export interface BacktestSummary {
  totalInvested: number; // 总投入金额
  finalValue: number; // 最终价值
  totalReturn: number; // 总收益率
  annualizedReturn: number; // 年化收益率
  maxDrawdown: number; // 最大回撤
  sharpeRatio: number; // 夏普比率
  volatility: number; // 年化波动率
  totalPeriods: number; // 投资期数
  winningPeriods: number; // 盈利期数
  benchmarkReturn?: number; // 基准收益率
  excessReturn?: number; // 超额收益率
}

export interface PerformanceData {
  date: Date;
  portfolioValue: number;
  investedAmount: number;
  cumulativeReturn: number;
  benchmarkValue?: number;
}

export interface BacktestStatistics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
  bestMonth: number;
  worstMonth: number;
  positiveMonths: number;
  negativeMonths: number;
  totalMonths: number;
}

export interface DrawdownData {
  startDate: Date;
  endDate: Date;
  depth: number; // 回撤深度
  recoveryDate?: Date;
  duration: number; // 回撤持续时间（天）
}

export interface MonthlyReturnData {
  date: string; // YYYY-MM
  return: number;
  portfolioValue: number;
}

export interface YearlyReturnData {
  year: number;
  return: number;
  portfolioValue: number;
  investedAmount: number;
}

export interface TransactionRecord {
  date: Date;
  type: 'buy' | 'sell';
  fundId: string;
  fundCode: string;
  amount: number;
  shares: number;
  nav: number;
  fee?: number;
}

export interface BacktestRequest {
  config: BacktestConfig;
  includeBenchmark?: boolean;
  benchmarkCode?: string;
}

export interface BacktestApiResponse {
  success: boolean;
  data?: BacktestResult;
  error?: string;
  executionTime?: number; // 执行时间（毫秒）
}

// 预定义的回测策略
export const PREDEFINED_STRATEGIES: BacktestStrategy[] = [
  {
    id: 'fixed-monthly',
    name: '定期定额',
    type: 'fixed-amount-scheduled',
    description: '每月固定日期投资固定金额，简单易执行，适合长期投资'
  },
  {
    id: 'fixed-weekly',
    name: '每周定投',
    type: 'fixed-amount-scheduled',
    description: '每周固定投资，降低择时风险，适合有稳定收入流的投资者'
  },
  {
    id: 'smart-volatility',
    name: '智能定投（波动率策略）',
    type: 'smart',
    description: '根据市场波动率调整投资金额，市场低估时多投，高估时少投',
    params: {
      threshold: 0.02,
      volatilityAdjustment: true
    }
  },
  {
    id: 'value-averaging',
    name: '价值平均策略',
    type: 'value-averaging',
    description: '目标使投资组合价值按固定增长率增长，市场下跌时增加投资',
    params: {
      targetGrowthRate: 0.08 // 年化8%
    }
  }
];

// 常用投资基金期限
export const INVESTMENT_PERIODS = [
  { label: '3个月', value: 3 },
  { label: '6个月', value: 6 },
  { label: '1年', value: 12 },
  { label: '3年', value: 36 },
  { label: '5年', value: 60 },
  { label: '10年', value: 120 }
];

// 常用定投金额
export const INVESTMENT_AMOUNTS = [
  { label: '500元', value: 500 },
  { label: '1000元', value: 1000 },
  { label: '2000元', value: 2000 },
  { label: '3000元', value: 3000 },
  { label: '5000元', value: 5000 },
  { label: '10000元', value: 10000 }
];