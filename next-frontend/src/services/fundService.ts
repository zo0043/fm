import axios from 'axios';
import { Fund, FundHistoryData, FundDetail, FundFilter, FundListResponse } from '../types/fund';

// API基础URL
const API_URL = '/api/funds';

// 缓存机制配置
const CACHE_EXPIRY = 30 * 60 * 1000; // 30分钟
const navDataCache = new Map<string, { data: FundHistoryData[]; timestamp: number }>();

/**
 * 基金服务类
 * 提供基金数据的获取、缓存和管理功能
 */
export class FundService {
  private isUsingMockData = false;

  /**
   * 获取基金列表
   */
  async getFunds(filter: FundFilter = {}, page: number = 1, pageSize: number = 20): Promise<FundListResponse> {
    try {
      // 实际项目中这里应该调用真实API
      // const response = await axios.get<FundListResponse>(API_URL, { params: { ...filter, page, pageSize } });
      // return response.data;
      
      // 目前使用模拟数据
      return this.getMockFunds(filter, page, pageSize);
    } catch (error) {
      console.error('获取基金列表失败:', error);
      return this.getMockFunds(filter, page, pageSize);
    }
  }

  /**
   * 获取基金详情
   */
  async getFundDetail(id: string): Promise<FundDetail | null> {
    try {
      // 实际项目中这里应该调用真实API
      // const response = await axios.get<FundDetail>(`${API_URL}/${id}`);
      // return response.data;
      
      // 目前使用模拟数据
      return this.getMockFundDetail(id);
    } catch (error) {
      console.error('获取基金详情失败:', error);
      return this.getMockFundDetail(id);
    }
  }

  /**
   * 使用东方财富接口获取基金净值数据
   */
  async getFundNavFromEastmoney(
    fundCode: string,
    page: number = 1,
    pageSize: number = 100,
    startDate?: string,
    endDate?: string
  ): Promise<FundHistoryData[]> {
    // 检查缓存
    const cacheKey = `${fundCode}_${page}_${pageSize}_${startDate || ''}_${endDate || ''}`;
    const cachedData = navDataCache.get(cacheKey);
    
    // 如果缓存存在且未过期，直接返回缓存数据
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_EXPIRY) {
      return cachedData.data;
    }
    
    try {
      const url = `https://fundf10.eastmoney.com/F10DataApi.aspx?type=lsjz&code=${fundCode}&page=${page}&per=${pageSize}`;
      
      const response = await axios.get(url, { responseType: 'text' });
      const dataMatch = response.data.match(/var apidata=({.*?});/s);
      
      if (!dataMatch) {
        throw new Error('无法解析返回的数据格式');
      }
      
      const data = JSON.parse(dataMatch[1]);
      if (!data.content) {
        throw new Error('返回数据中没有内容');
      }
      
      const content = data.content;
      
      // 解析表格内容，使用正则表达式匹配每一行数据
      const rowRegex = /<tr[^>]*>\s*<td[^>]*>(\d{4}-\d{2}-\d{2})<\/td>\s*<td[^>]*>(\d+(?:\.\d+)?)<\/td>\s*<td[^>]*>(\d+(?:\.\d+)?)<\/td>\s*<td[^>]*>([+-]?\d+(?:\.\d+)?)%<\/td>/gi;
      const historyData: FundHistoryData[] = [];
      let match;
      
      while ((match = rowRegex.exec(content)) !== null) {
        const [, date, navStr, totalNavStr, dailyChangeStr] = match;
        
        historyData.push({
          date,
          nav: parseFloat(navStr),
          totalNav: parseFloat(totalNavStr),
          dailyChange: parseFloat(dailyChangeStr) / 100
        });
      }
      
      // 按日期排序（从旧到新）
      historyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // 应用日期范围过滤
      let filteredData = historyData;
      if (startDate) {
        const start = new Date(startDate);
        filteredData = filteredData.filter(item => new Date(item.date) >= start);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // 包含结束日期的全天
        filteredData = filteredData.filter(item => new Date(item.date) <= end);
      }
      
      // 保存到缓存
      navDataCache.set(cacheKey, {
        data: filteredData,
        timestamp: Date.now()
      });
      
      return filteredData;
    } catch (error) {
      console.error(`获取基金${fundCode}净值数据失败:`, error);
      // 返回模拟数据作为备选
      return this.getMockFundHistory(fundCode);
    }
  }

  /**
   * 清除指定基金的缓存数据
   */
  clearNavDataCache(fundCode?: string): void {
    if (fundCode) {
      // 清除指定基金的所有缓存
      const keysToDelete: string[] = [];
      navDataCache.forEach((value, key) => {
        if (key.startsWith(`${fundCode}_`)) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => {
        navDataCache.delete(key);
      });
    } else {
      // 清除所有缓存
      navDataCache.clear();
    }
  }

  /**
   * 获取基金类型列表
   */
  async getFundTypes(): Promise<string[]> {
    try {
      // 实际项目中这里应该调用真实API
      // const response = await axios.get<string[]>(`${API_URL}/types`);
      // return response.data;
      
      // 目前使用模拟数据
      return ['股票型', '债券型', '混合型', '指数型', 'QDII', '货币型'];
    } catch (error) {
      console.error('获取基金类型失败:', error);
      return ['股票型', '债券型', '混合型', '指数型', 'QDII', '货币型'];
    }
  }

  /**
   * 获取风险等级列表
   */
  async getRiskLevels(): Promise<string[]> {
    try {
      // 实际项目中这里应该调用真实API
      // const response = await axios.get<string[]>(`${API_URL}/risk-levels`);
      // return response.data;
      
      // 目前使用模拟数据
      return ['低风险', '中低风险', '中等风险', '中高风险', '高风险'];
    } catch (error) {
      console.error('获取风险等级失败:', error);
      return ['低风险', '中低风险', '中等风险', '中高风险', '高风险'];
    }
  }

  // 模拟数据生成方法

  /**
   * 生成模拟基金列表
   */
  private getMockFunds(filter: FundFilter, page: number, pageSize: number): FundListResponse {
    const mockFunds = this.generateMockFunds();
    
    // 应用筛选
    let filteredFunds = [...mockFunds];
    
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filteredFunds = filteredFunds.filter(fund => 
        fund.name.toLowerCase().includes(searchLower) || 
        fund.code.includes(searchLower)
      );
    }
    
    if (filter.type && filter.type !== 'all') {
      filteredFunds = filteredFunds.filter(fund => fund.type === filter.type);
    }
    
    if (filter.riskLevel && filter.riskLevel !== 'all') {
      filteredFunds = filteredFunds.filter(fund => fund.riskLevel === filter.riskLevel);
    }
    
    if (filter.status && filter.status !== 'all') {
      filteredFunds = filteredFunds.filter(fund => fund.status === filter.status);
    }
    
    // 应用排序
    if (filter.sortBy) {
      filteredFunds.sort((a, b) => {
        const aValue = a[filter.sortBy as keyof Fund];
        const bValue = b[filter.sortBy as keyof Fund];
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return filter.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        return 0;
      });
    }
    
    // 应用分页
    const total = filteredFunds.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedFunds = filteredFunds.slice(startIndex, startIndex + pageSize);
    
    return {
      funds: paginatedFunds,
      total,
      page,
      pageSize
    };
  }

  /**
   * 生成模拟基金详情
   */
  private getMockFundDetail(id: string): FundDetail | null {
    const mockFunds = this.generateMockFunds();
    const fund = mockFunds.find(f => f.id === id);
    
    if (!fund) return null;
    
    // 转换为FundDetail类型
    return {
      ...fund,
      description: '这是一只模拟的基金详情描述，用于演示基金详情页面的功能。',
      holdings: this.generateMockHoldings(),
      industries: this.generateMockIndustries(),
      performance: {
        recentReturns: {
          oneDay: (Math.random() - 0.5) * 0.03,
          oneWeek: (Math.random() - 0.5) * 0.08,
          oneMonth: (Math.random() - 0.5) * 0.15,
          oneYear: (Math.random() - 0.3) * 0.5,
          threeYear: (Math.random() - 0.2) * 1.2,
          fiveYear: (Math.random() - 0.1) * 2.0
        },
        riskReturnRating: {
          rating: 3.5 + Math.random() * 1.5,
          riskLevel: '中高风险'
        }
      }
    };
  }

  /**
   * 生成模拟基金历史净值数据
   */
  private getMockFundHistory(fundCode: string): FundHistoryData[] {
    const history: FundHistoryData[] = [];
    const today = new Date();
    let nav = 1.0;

    for (let i = 252; i >= 0; i--) { // 一年的交易日
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // 模拟净值变化
      nav = nav * (1 + (Math.random() - 0.5) * 0.02); // 随机波动±2%
      const dailyChange = (Math.random() - 0.5) * 0.03; // 当日涨跌幅

      history.push({
        date: date.toISOString().split('T')[0],
        nav: parseFloat(nav.toFixed(4)),
        totalNav: parseFloat((nav * 1.15).toFixed(4)),
        dailyChange: parseFloat(dailyChange.toFixed(4))
      });
    }

    return history;
  }

  /**
   * 生成模拟基金列表
   */
  private generateMockFunds(): Fund[] {
    const mockFunds: Fund[] = [];
    const types = ['股票型', '债券型', '混合型', '指数型', 'QDII', '货币型'];
    const riskLevels = ['低风险', '中低风险', '中等风险', '中高风险', '高风险'];
    const managers = ['张三', '李四', '王五', '赵六', '陈七', '刘八'];

    for (let i = 1; i <= 50; i++) {
      const nav = 1 + (Math.random() - 0.3) * 0.5; // 0.85-1.35
      const dailyChange = (Math.random() - 0.5) * 0.05; // -2.5% to +2.5%

      mockFunds.push({
        id: `fund_${i.toString().padStart(4, '0')}`,
        code: `${Math.floor(Math.random() * 900000) + 100000}`,
        name: `模拟基金${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        manager: managers[Math.floor(Math.random() * managers.length)],
        establishDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        nav: parseFloat(nav.toFixed(4)),
        totalNav: parseFloat((nav * 1.15).toFixed(4)),
        dailyChange: parseFloat(dailyChange.toFixed(4)),
        dailyChangeAmount: parseFloat((nav * dailyChange).toFixed(4)),
        weeklyChange: parseFloat(((Math.random() - 0.5) * 0.1).toFixed(4)),
        monthlyChange: parseFloat(((Math.random() - 0.5) * 0.2).toFixed(4)),
        yearlyChange: parseFloat(((Math.random() - 0.5) * 0.5).toFixed(4)),
        minAmount: Math.floor(Math.random() * 9000) + 1000,
        status: Math.random() > 0.1 ? '正常' : '暂停',
        riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)],
        lastUpdated: new Date().toISOString()
      });
    }

    return mockFunds;
  }

  /**
   * 生成模拟基金持仓
   */
  private generateMockHoldings(): any[] {
    const mockHoldings = [];
    const stockNames = ['贵州茅台', '五粮液', '工商银行', '建设银行', '阿里巴巴', '腾讯控股', '苹果', '微软', '亚马逊', '谷歌'];
    
    for (let i = 0; i < 10; i++) {
      mockHoldings.push({
        stockCode: `600${Math.floor(Math.random() * 1000)}`,
        stockName: stockNames[i],
        shares: Math.floor(Math.random() * 10000000) + 1000000,
        marketValue: Math.floor(Math.random() * 100000000) + 10000000,
        weight: parseFloat((Math.random() * 8 + 1).toFixed(2)),
        changePercent: parseFloat((Math.random() - 0.5) * 10).toFixed(2)
      });
    }
    
    return mockHoldings;
  }

  /**
   * 生成模拟基金行业配置
   */
  private generateMockIndustries(): any[] {
    const mockIndustries = [];
    const industries = ['食品饮料', '金融', '科技', '医药', '新能源', '房地产', '化工', '汽车', '消费', '军工'];
    
    for (let i = 0; i < 8; i++) {
      mockIndustries.push({
        industryName: industries[i],
        weight: parseFloat((Math.random() * 20 + 5).toFixed(2)),
        changePercent: parseFloat((Math.random() - 0.5) * 5).toFixed(2),
        description: `${industries[i]}行业的配置说明`
      });
    }
    
    return mockIndustries;
  }
}

// 导出单例实例
export const fundService = new FundService();
