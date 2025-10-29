import { FundInfo, KLineDataPoint, TrendInfo } from '../models/fund.model';

// 模拟基金数据
export const MOCK_FUNDS: FundInfo[] = [
  {
    id: 'fund_0001',
    code: '110022',
    name: '易方达消费行业股票',
    type: 'stock',
    currentNav: 1.2345,
    yesterdayNav: 1.2210,
    weekNav: 1.2456,
    monthNav: 1.1987,
    yearNav: 1.0892,
    lastUpdate: new Date()
  },
  {
    id: 'fund_0002',
    code: '161725',
    name: '招商中证白酒指数',
    type: 'index',
    currentNav: 0.9876,
    yesterdayNav: 0.9654,
    weekNav: 1.0123,
    monthNav: 0.9456,
    yearNav: 0.8765,
    lastUpdate: new Date()
  },
  {
    id: 'fund_0003',
    code: '000001',
    name: '华夏成长混合',
    type: 'hybrid',
    currentNav: 2.3456,
    yesterdayNav: 2.2987,
    weekNav: 2.4123,
    monthNav: 2.1876,
    yearNav: 1.9876,
    lastUpdate: new Date()
  },
  {
    id: 'fund_0004',
    code: '511880',
    name: '银华日利ETF',
    type: 'etf',
    currentNav: 1.0001,
    yesterdayNav: 1.0000,
    weekNav: 1.0002,
    monthNav: 1.0001,
    yearNav: 1.0000,
    lastUpdate: new Date()
  },
  {
    id: 'fund_0005',
    code: '161726',
    name: '易方达黄金ETF',
    type: 'etf',
    currentNav: 3.4567,
    yesterdayNav: 3.4234,
    weekNav: 3.4876,
    monthNav: 3.3987,
    yearNav: 3.2345,
    lastUpdate: new Date()
  },
  {
    id: 'fund_0006',
    code: '040025',
    name: '华安科技动力混合',
    type: 'hybrid',
    currentNav: 1.5678,
    yesterdayNav: 1.5432,
    weekNav: 1.5890,
    monthNav: 1.4987,
    yearNav: 1.3456,
    lastUpdate: new Date()
  }
];

// 生成模拟K线图数据
export function generateMockKLineData(days: number = 90): KLineDataPoint[] {
  const data: KLineDataPoint[] = [];
  const today = new Date();
  let currentNav = 1.0;

  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // 模拟OHLC数据
    const dailyChange = (Math.random() - 0.5) * 0.04; // ±2%波动
    const open = currentNav;
    const close = currentNav * (1 + dailyChange);
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);

    data.push({
      date: date,
      open: parseFloat(open.toFixed(4)),
      high: parseFloat(high.toFixed(4)),
      low: parseFloat(low.toFixed(4)),
      close: parseFloat(close.toFixed(4))
    });

    currentNav = close;
  }

  return data;
}

// 生成模拟涨跌信息
export function generateMockTrendInfo(fund: FundInfo): TrendInfo {
  const changeAmount = fund.currentNav - fund.yesterdayNav;
  const changePercent = (changeAmount / fund.yesterdayNav) * 100;

  return {
    currentNav: fund.currentNav,
    changeAmount: parseFloat(changeAmount.toFixed(4)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    trend: changeAmount > 0 ? 'up' : changeAmount < 0 ? 'down' : 'flat'
  };
}

// 模拟市场指数数据
export const MOCK_MARKET_INDICES = [
  { name: '上证指数', value: 3120.45, change: 0.0125, changeAmount: 38.76 },
  { name: '深证成指', value: 11256.89, change: -0.0087, changeAmount: -98.23 },
  { name: '创业板指', value: 2345.67, change: 0.0156, changeAmount: 36.12 },
  { name: '科创50', value: 987.65, change: 0.0234, changeAmount: 22.67 },
  { name: '恒生指数', value: 18456.78, change: -0.0056, changeAmount: -104.32 }
];

// 模拟基金类型分布
export const MOCK_FUND_TYPE_DISTRIBUTION = [
  { type: '股票型', count: 3, percentage: 50, totalAssets: 150000 },
  { type: '混合型', count: 2, percentage: 33.3, totalAssets: 100000 },
  { type: '债券型', count: 1, percentage: 16.7, totalAssets: 50000 }
];

// 模拟收益表现数据
export const MOCK_PERFORMANCE_DATA = {
  daily: { averageReturn: 0.0125, bestReturn: 0.0456, worstReturn: -0.0234 },
  weekly: { averageReturn: -0.0082, bestReturn: 0.0234, worstReturn: -0.0456 },
  monthly: { averageReturn: 0.0345, bestReturn: 0.0789, worstReturn: -0.0123 },
  yearly: { averageReturn: 0.1234, bestReturn: 0.2345, worstReturn: 0.0456 }
};