import { FundInfo } from '../../../models/fund.model';

// 基金详情扩展模型
export interface FundDetail extends FundInfo {
  // 基本信息扩展
  fundCompany: string;           // 基金公司
  establishDate: Date;         // 成立日期
  fundScale: number;            // 基金规模（亿元）
  managementFee: number;        // 管理费率
  custodyFee: number;           // 托管费率
  purchaseFee: number;          // 申购费率
  redemptionFee: number;        // 赎回费率

  // 基金经理信息
  managers: FundManager[];

  // 持仓信息
  holdings: HoldingInfo[];

  // 行业配置
  industries: IndustryAllocation[];

  // 风险指标
  riskMetrics: RiskMetrics;

  // 业绩表现
  performance: PerformanceData;

  // 分红信息
  dividends: DividendRecord[];
}

// 基金经理信息
export interface FundManager {
  name: string;
  experience: string;           // 从业年限
  education: string;           // 教育背景
  startDate: Date;             // 任职开始日期
  description: string;         // 简介
  managedFunds: string[];      // 管理的其他基金
  performance: {               // 任职期间业绩
    period: string;            // 任职期间
    return: number;            // 收益率
    annualizedReturn: number;  // 年化收益率
    maxDrawdown: number;       // 最大回撤
  };
}

// 持仓信息
export interface HoldingInfo {
  stockCode: string;           // 股票代码
  stockName: string;           // 股票名称
  shares: number;              // 持股数量（万股）
  marketValue: number;         // 持仓市值（万元）
  weight: number;              // 占净值比例
  changePercent: number;       // 较上期变动
}

// 行业配置
export interface IndustryAllocation {
  industryName: string;        // 行业名称
  weight: number;              // 配置比例
  changePercent: number;       // 较上期变动
  description?: string;        // 行业描述
}

// 风险指标
export interface RiskMetrics {
  standardDeviation: number;   // 标准差
  beta: number;                // Beta系数
  sharpeRatio: number;         // 夏普比率
  sortinoRatio: number;        // 索提诺比率
  informationRatio: number;    // 信息比率
  maxDrawdown: number;         // 最大回撤
  volatility: number;          // 年化波动率
  var95: number;               // VaR(95%置信度)
  trackingError: number;       // 跟踪误差
}

// 业绩表现数据
export interface PerformanceData {
  // 近期业绩
  recentReturns: {
    oneDay: number;            // 近1日
    oneWeek: number;           // 近1周
    oneMonth: number;          // 近1月
    threeMonths: number;       // 近3月
    sixMonths: number;         // 近6月
    oneYear: number;           // 近1年
    twoYears: number;          // 近2年
    threeYears: number;        // 近3年
    sinceInception: number;    // 成立以来
  };

  // 阶段业绩
  periodReturns: PeriodReturn[];

  // 风险收益评级
  riskReturnRating: {
    risk: 'low' | 'medium' | 'high';
    return: 'low' | 'medium' | 'high';
    rating: number;            // 综合评级 1-5星
  };

  // 基准比较
  benchmarkComparison: BenchmarkComparison;
}

// 阶段业绩
export interface PeriodReturn {
  period: string;              // 时间段
  fundReturn: number;          // 基金收益率
  benchmarkReturn: number;     // 基准收益率
  excessReturn: number;        // 超额收益
  ranking: string;             // 排名
  totalFunds: number;          // 同类基金总数
}

// 基准比较
export interface BenchmarkComparison {
  benchmarkName: string;       // 基准名称
  correlation: number;         // 相关系数
  beta: number;                // Beta系数
  alpha: number;               // Alpha系数
  trackingError: number;       // 跟踪误差
  informationRatio: number;    // 信息比率
  upMarketCapture: number;     // 上涨市场捕获率
  downMarketCapture: number;   // 下跌市场捕获率
}

// 分红记录
export interface DividendRecord {
  exDividendDate: Date;        // 除权除息日
  dividendType: string;        // 分红类型
  dividendPerUnit: number;     // 每份分红金额
  totalAmount: number;         // 分红总额
  afterTaxDividend: number;    // 税后分红
}

// 基金评级
export interface FundRating {
  agency: string;              // 评级机构
  rating: string;              // 评级
  ratingDate: Date;            // 评级日期
  description: string;         // 评级说明
}

// 持有人结构
export interface HolderStructure {
  type: 'individual' | 'institution';
  name: string;                // 持有人名称
  shares: number;              // 持有份额
  weight: number;              // 占比
  change: number;              // 较上期变动
}

// 净值历史数据
export interface NavHistory {
  date: Date;
  nav: number;                 // 单位净值
  accumulatedNav: number;      // 累计净值
  dailyReturn: number;         // 日收益率
  totalReturn: number;         // 累计收益率
}

// 基金新闻
export interface FundNews {
  id: string;
  title: string;
  summary: string;
  publishDate: Date;
  source: string;
  url?: string;
  tags: string[];
  importance: 'high' | 'medium' | 'low';
}

// 基金公告
export interface FundAnnouncement {
  id: string;
  title: string;
  type: string;                // 公告类型
  publishDate: Date;
  summary: string;
  url?: string;
}

// 查询参数
export interface FundDetailQuery {
  fundId: string;
  includeHoldings?: boolean;
  includeNews?: boolean;
  includeAnnouncements?: boolean;
  newsLimit?: number;
  announcementLimit?: number;
}

// API响应模型
export interface FundDetailResponse {
  success: boolean;
  data?: FundDetail;
  error?: string;
  timestamp: Date;
}