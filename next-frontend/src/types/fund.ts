// 基金基本信息类型
export interface Fund {
  id: string;
  code: string;
  name: string;
  type: string;
  manager: string;
  establishDate: string;
  nav: number;
  totalNav: number;
  dailyChange: number;
  dailyChangeAmount: number;
  weeklyChange: number;
  monthlyChange: number;
  yearlyChange: number;
  minAmount: number;
  status: string;
  riskLevel: string;
  lastUpdated: string;
}

// 基金历史净值数据类型
export interface FundHistoryData {
  date: string;
  nav: number;
  totalNav: number;
  dailyChange: number;
}

// 基金详情类型
export interface FundDetail {
  id: string;
  code: string;
  name: string;
  type: string;
  manager: string;
  establishDate: string;
  nav: number;
  totalNav: number;
  dailyChange: number;
  dailyChangeAmount: number;
  weeklyChange: number;
  monthlyChange: number;
  yearlyChange: number;
  minAmount: number;
  status: string;
  riskLevel: string;
  lastUpdated: string;
  description?: string;
  holdings?: FundHolding[];
  industries?: FundIndustry[];
  performance?: FundPerformance;
}

// 基金持仓类型
export interface FundHolding {
  stockCode: string;
  stockName: string;
  shares: number;
  marketValue: number;
  weight: number;
  changePercent: number;
}

// 基金行业配置类型
export interface FundIndustry {
  industryName: string;
  weight: number;
  changePercent: number;
  description?: string;
}

// 基金业绩类型
export interface FundPerformance {
  recentReturns: {
    oneDay: number;
    oneWeek: number;
    oneMonth: number;
    oneYear: number;
    threeYear: number;
    fiveYear: number;
  };
  riskReturnRating: {
    rating: number;
    riskLevel: string;
  };
}

// 基金列表响应类型
export interface FundListResponse {
  funds: Fund[];
  total: number;
  page: number;
  pageSize: number;
}

// 基金筛选条件类型
export interface FundFilter {
  search?: string;
  type?: string;
  riskLevel?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 基金趋势信息类型
export interface TrendInfo {
  currentNav: number;
  changeAmount: number;
  changePercent: number;
  trend: 'up' | 'down' | 'flat';
}

// 关注列表基金类型
export interface WatchlistFund {
  id: string;
  code: string;
  name: string;
}
