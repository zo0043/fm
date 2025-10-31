/**
 * 仪表板数据模型定义
 */

export interface Fund {
  id: number;
  code: string;
  name: string;
  type: string;
  company: string;
  establishDate?: string;
  manager?: string;
  size?: number;
  managementFeeRate?: number;
  custodyFeeRate?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface NavData {
  id: number;
  fundCode: string;
  navDate: string;
  unitNav: number;
  accumulatedNav: number;
  dailyChange: number;
  dailyChangePercent: number;
  createdAt: string;
}

export interface Alert {
  id: number;
  ruleId: number;
  ruleName: string;
  fundCode: string;
  fundName: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  thresholdValue?: number;
  currentValue?: number;
  status: 'pending' | 'acknowledged' | 'resolved';
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface Activity {
  id: number;
  userId: number;
  username: string;
  action: string;
  entityType: string;
  entityId: number;
  entityName: string;
  description: string;
  metadata?: any;
  createdAt: string;
}

export interface MarketSummary {
  date: string;
  totalFunds: number;
  activeFunds: number;
  totalMarketValue: number;
  averageChange: number;
  positiveCount: number;
  negativeCount: number;
  flatCount: number;
  topGainers: Fund[];
  topLosers: Fund[];
  mostActive: Fund[];
}

export interface Recommendation {
  id: number;
  type: 'buy' | 'sell' | 'hold' | 'watch';
  title: string;
  description: string;
  fundCode?: string;
  fundName?: string;
  confidence: number; // 0-100
  priority: 'low' | 'medium' | 'high';
  validUntil: string;
  createdAt: string;
  metadata?: any;
}

export interface OverviewData {
  totalFunds: number;
  activeRules: number;
  todayNotifications: number;
  totalUsers: number;
  totalAlerts: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  lastUpdateTime: string;
}

export interface PortfolioOverview {
  totalValue: number;
  totalInvestment: number;
  totalReturn: number;
  totalReturnPercent: number;
  dayChange: number;
  dayChangePercent: number;
  fundCount: number;
  topHoldings: Fund[];
  assetAllocation: {
    equity: number;
    bond: number;
    mixed: number;
    money: number;
    other: number;
  };
}

export interface PerformanceData {
  period: string;
  startValue: number;
  endValue: number;
  return: number;
  returnPercent: number;
  maxDrawdown: number;
  volatility: number;
  sharpeRatio: number;
  dailyReturns: Array<{
    date: string;
    value: number;
    return: number;
  }>;
}