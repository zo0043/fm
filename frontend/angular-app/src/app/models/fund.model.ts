/**
 * 基金数据模型定义
 */

// 基础基金信息
export interface FundInfo {
  id: string;
  code: string;
  name: string;
  type: string;
  currentNav: number; // 当前净值
  yesterdayNav: number; // 昨日净值
  weekNav: number; // 周净值
  monthNav: number; // 月净值
  yearNav: number; // 年净值
  lastUpdate: Date;
}

// K线图数据点（OHLC格式）
export interface KLineDataPoint {
  date: Date;
  open: number;     // 开盘价
  high: number;     // 最高价
  low: number;      // 最低价
  close: number;    // 收盘价
}

// 涨跌信息
export interface TrendInfo {
  currentNav: number;
  changeAmount: number;     // 涨跌金额
  changePercent: number;    // 涨跌百分比
  trend: 'up' | 'down' | 'flat';  // 涨跌趋势
}

// 图表数据集
export interface ChartDataset {
  label: string;
  data: KLineDataPoint[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

// 基金统计数据
export interface FundStatistics {
  maxNav: number;
  minNav: number;
  avgNav: number;
  volatility: number;
  totalReturn: number;
  annualizedReturn: number;
}