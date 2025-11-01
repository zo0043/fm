import { FundInfo } from '../../../models/fund.model';

// 投资组合概览
export interface PortfolioOverview {
  totalValue: number;              // 总资产
  totalInvested: number;           // 总投入
  totalReturn: number;             // 总收益
  totalReturnRate: number;         // 总收益率
  dailyChange: number;             // 日涨跌额
  dailyChangeRate: number;         // 日涨跌幅
  lastUpdate: Date;                // 最后更新时间
  fundCount: number;               // 基金数量
}

// 资产配置
export interface AssetAllocation {
  fundId: string;
  fundCode: string;
  fundName: string;
  fundType: string;
  currentValue: number;            // 当前市值
  investedAmount: number;          // 投入金额
  weight: number;                  // 占比
  return: number;                  // 收益额
  returnRate: number;              // 收益率
  shares: number;                  // 持有份额
  averageCost: number;             // 平均成本
  currentNav: number;              // 当前净值
  dailyChange: number;             // 日涨跌额
  dailyChangeRate: number;         // 日涨跌幅
}

// 资产配置汇总（按类型）
export interface AssetAllocationSummary {
  type: string;                    // 资产类型
  totalValue: number;              // 总市值
  weight: number;                  // 占比
  return: number;                  // 收益额
  returnRate: number;              // 收益率
  fundCount: number;               // 基金数量
  riskLevel: string;               // 风险等级
  recommendedWeight: number;        // 建议配置比例
}

// 业绩表现
export interface PortfolioPerformance {
  // 时间序列表现
  timeSeriesPerformance: TimeSeriesData[];

  // 收益率统计
  returnStatistics: {
    oneDay: number;                // 近1日
    oneWeek: number;               // 近1周
    oneMonth: number;              // 近1月
    threeMonths: number;           // 近3月
    sixMonths: number;             // 近6月
    oneYear: number;               // 近1年
    twoYears: number;              // 近2年
    threeYears: number;            // 近3年
    sinceInception: number;        // 成立以来
  };

  // 阶段表现对比
  periodComparison: PeriodComparison[];

  // 基准比较
  benchmarkComparison: BenchmarkComparison;

  // 收益率分解
  returnDecomposition: ReturnDecomposition;
}

// 时间序列数据
export interface TimeSeriesData {
  date: Date;
  portfolioValue: number;          // 组合价值
  benchmarkValue?: number;         // 基准价值
  cumulativeReturn: number;        // 累计收益率
  benchmarkReturn?: number;        // 基准收益率
}

// 阶段对比
export interface PeriodComparison {
  period: string;                  // 时间段
  portfolioReturn: number;         // 组合收益率
  benchmarkReturn: number;         // 基准收益率
  excessReturn: number;            // 超额收益
  ranking: string;                 // 排名
  quartile: number;                // 四分位数
}

// 基准比较
export interface BenchmarkComparison {
  benchmarkName: string;           // 基准名称
  correlation: number;             // 相关系数
  beta: number;                    // Beta系数
  alpha: number;                   // Alpha系数
  trackingError: number;           // 跟踪误差
  informationRatio: number;        // 信息比率
  upMarketCapture: number;         // 上涨市场捕获率
  downMarketCapture: number;       // 下跌市场捕获率
}

// 收益率分解
export interface ReturnDecomposition {
  assetAllocation: number;         // 资产配置贡献
  securitySelection: number;       // 个券选择贡献
  interaction: number;             // 交互效应
  total: number;                   // 总贡献
}

// 风险分析
export interface PortfolioRiskAnalysis {
  // 风险指标
  riskMetrics: {
    standardDeviation: number;     // 标准差
    beta: number;                  // Beta系数
    sharpeRatio: number;           // 夏普比率
    sortinoRatio: number;          // 索提诺比率
    maxDrawdown: number;           // 最大回撤
    currentDrawdown: number;       // 当前回撤
    volatility: number;            // 年化波动率
    var95: number;                 // VaR(95%置信度)
    cvar95: number;                // CVaR(95%置信度)
  };

  // 回撤分析
  drawdownAnalysis: DrawdownAnalysis[];

  // 风险贡献分析
  riskContribution: RiskContribution[];

  // 压力测试
  stressTest: StressTestResult[];
}

// 回撤分析
export interface DrawdownAnalysis {
  startDate: Date;                 // 开始日期
  endDate: Date;                   // 结束日期
  depth: number;                   // 回撤深度
  recoveryDate?: Date;             // 恢复日期
  duration: number;                // 持续天数
  recoveryDuration?: number;       // 恢复天数
}

// 风险贡献
export interface RiskContribution {
  fundId: string;
  fundName: string;
  weight: number;                  // 权重
  marginalRisk: number;            // 边际风险
  contribution: number;            // 风险贡献
  percentage: number;              // 贡献百分比
}

// 压力测试结果
export interface StressTestResult {
  scenario: string;                // 压力场景
  description: string;             // 场景描述
  portfolioLoss: number;           // 组合损失
  lossRate: number;                // 损失率
  worstFund: string;               // 表现最差基金
  worstFundLoss: number;           // 最差基金损失
}

// 相关性矩阵
export interface CorrelationMatrix {
  funds: FundCorrelation[];
  matrix: number[][];
  averageCorrelation: number;      // 平均相关性
  minCorrelation: number;          // 最低相关性
  maxCorrelation: number;          // 最高相关性
}

// 基金相关性
export interface FundCorrelation {
  fundId: string;
  fundName: string;
  fundCode: string;
  correlations: { [fundId: string]: number };
}

// 投资建议
export interface PortfolioRecommendation {
  overallRating: number;           // 综合评级 1-5星
  riskLevel: 'low' | 'medium' | 'high'; // 风险等级
  expectedReturn: number;          // 预期收益率
  recommendedActions: RecommendedAction[];
  optimization: OptimizationSuggestion;
}

// 推荐操作
export interface RecommendedAction {
  type: 'buy' | 'sell' | 'hold' | 'rebalance';
  priority: 'high' | 'medium' | 'low';
  description: string;
  targetFund?: string;
  amount?: number;
  reasoning: string;
}

// 优化建议
export interface OptimizationSuggestion {
  currentAllocation: AssetAllocationSummary[];
  optimalAllocation: AssetAllocationSummary[];
  expectedImprovement: {
    return: number;                // 收益改善
    risk: number;                  // 风险改善
    sharpeRatio: number;           // 夏普比率改善
  };
  rebalancingActions: RecommendedAction[];
}

// 交易记录
export interface TransactionRecord {
  id: string;
  fundId: string;
  fundName: string;
  fundCode: string;
  type: 'buy' | 'sell';
  date: Date;
  amount: number;                  // 交易金额
  shares: number;                  // 交易份额
  nav: number;                     // 交易净值
  fee: number;                     // 手续费
  status: 'pending' | 'completed' | 'failed';
}

// 投资组合配置
export interface PortfolioConfig {
  id: string;
  name: string;
  description: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  investmentHorizon: string;      // 投资期限
  targetReturn: number;            // 目标收益率
  maxDrawdown: number;             // 最大可接受回撤
  rebalanceFrequency: string;      // 再平衡频率
  createdAt: Date;
  updatedAt: Date;
}

// API查询参数
export interface PortfolioQuery {
  userId?: string;
  portfolioId?: string;
  includeRisk?: boolean;
  includeRecommendations?: boolean;
  includeTransactions?: boolean;
  startDate?: Date;
  endDate?: Date;
}

// API响应模型
export interface PortfolioResponse {
  success: boolean;
  data?: {
    overview: PortfolioOverview;
    allocation: AssetAllocation[];
    performance: PortfolioPerformance;
    riskAnalysis?: PortfolioRiskAnalysis;
    correlation?: CorrelationMatrix;
    recommendations?: PortfolioRecommendation;
    transactions?: TransactionRecord[];
  };
  error?: string;
  timestamp: Date;
}