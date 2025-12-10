// 交易记录模型定义

// 交易记录接口
export interface TradeRecord {
  id: string;
  fundCode: string;
  fundName: string;
  tradeDate: string; // ISO格式日期字符串
  tradeType: 'buy' | 'sell' | 'dividend';
  shares: number;
  amount: number;
  fee: number;
  totalPrice: number;
  nav: number; // 成交净值
  remarks?: string;
  createdAt: string; // ISO格式日期字符串
  updatedAt: string; // ISO格式日期字符串
}

// 交易查询参数
export interface TradeQuery {
  keyword?: string;
  fundCode?: string;
  tradeType?: 'buy' | 'sell' | 'dividend';
  startDate?: string; // ISO格式日期字符串
  endDate?: string; // ISO格式日期字符串
  page?: number;
  pageSize?: number;
}

// 交易记录响应
export interface TradeResponse {
  success: boolean;
  data: TradeRecord[];
  pagination: {
    page: number;
    size: number;
    total: number;
    pages: number;
  };
  error?: string;
}

// 创建交易记录请求
export interface CreateTradeRequest {
  fundCode: string;
  tradeDate: string; // ISO格式日期字符串
  tradeType: 'buy' | 'sell' | 'dividend';
  shares: number;
  amount: number;
  fee: number;
  nav: number;
  remarks?: string;
}

// 更新交易记录请求
export interface UpdateTradeRequest {
  fundCode?: string;
  tradeDate?: string; // ISO格式日期字符串
  tradeType?: 'buy' | 'sell' | 'dividend';
  shares?: number;
  amount?: number;
  fee?: number;
  nav?: number;
  remarks?: string;
}