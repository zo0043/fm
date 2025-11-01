import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, delay } from 'rxjs/operators';

import {
  FundDetail,
  FundDetailQuery,
  FundDetailResponse,
  NavHistory,
  FundNews,
  FundAnnouncement,
  HoldingInfo,
  IndustryAllocation,
  PerformanceData
} from '../models/fund-detail.model';
import { FundInfo } from '../../../models/fund.model';

@Injectable({
  providedIn: 'root'
})
export class FundDetailService {
  private apiUrl = '/api/funds/detail';

  constructor(private http: HttpClient) {}

  /**
   * 获取基金详细信息
   */
  getFundDetail(query: FundDetailQuery): Observable<FundDetailResponse> {
    let params = new HttpParams()
      .set('fundId', query.fundId);

    if (query.includeHoldings !== undefined) {
      params = params.set('includeHoldings', query.includeHoldings.toString());
    }
    if (query.includeNews !== undefined) {
      params = params.set('includeNews', query.includeNews.toString());
    }
    if (query.includeAnnouncements !== undefined) {
      params = params.set('includeAnnouncements', query.includeAnnouncements.toString());
    }
    if (query.newsLimit) {
      params = params.set('newsLimit', query.newsLimit.toString());
    }
    if (query.announcementLimit) {
      params = params.set('announcementLimit', query.announcementLimit.toString());
    }

    return this.http.get<FundDetailResponse>(this.apiUrl, { params }).pipe(
      catchError(error => {
        console.error('获取基金详情失败:', error);
        return this.generateMockFundDetail(query.fundId);
      })
    );
  }

  /**
   * 获取基金净值历史数据
   */
  getNavHistory(fundId: string, startDate?: Date, endDate?: Date): Observable<NavHistory[]> {
    let params = new HttpParams().set('fundId', fundId);

    if (startDate) {
      params = params.set('startDate', startDate.toISOString().split('T')[0]);
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString().split('T')[0]);
    }

    return this.http.get<NavHistory[]>(`${this.apiUrl}/nav-history`, { params }).pipe(
      catchError(error => {
        console.error('获取净值历史失败:', error);
        return this.generateMockNavHistory(fundId, startDate, endDate);
      })
    );
  }

  /**
   * 获取基金相关新闻
   */
  getFundNews(fundId: string, limit: number = 10): Observable<FundNews[]> {
    const params = new HttpParams()
      .set('fundId', fundId)
      .set('limit', limit.toString());

    return this.http.get<FundNews[]>(`${this.apiUrl}/news`, { params }).pipe(
      catchError(error => {
        console.error('获取基金新闻失败:', error);
        return this.generateMockFundNews(fundId, limit);
      })
    );
  }

  /**
   * 获取基金公告
   */
  getFundAnnouncements(fundId: string, limit: number = 10): Observable<FundAnnouncement[]> {
    const params = new HttpParams()
      .set('fundId', fundId)
      .set('limit', limit.toString());

    return this.http.get<FundAnnouncement[]>(`${this.apiUrl}/announcements`, { params }).pipe(
      catchError(error => {
        console.error('获取基金公告失败:', error);
        return this.generateMockFundAnnouncements(fundId, limit);
      })
    );
  }

  /**
   * 搜索基金
   */
  searchFunds(keyword: string): Observable<FundInfo[]> {
    const params = new HttpParams().set('keyword', keyword);

    return this.http.get<FundInfo[]>(`${this.apiUrl}/search`, { params }).pipe(
      catchError(error => {
        console.error('搜索基金失败:', error);
        return this.generateMockSearchResults(keyword);
      })
    );
  }

  // Mock数据生成方法
  private generateMockFundDetail(fundId: string): Observable<FundDetailResponse> {
    const mockDetail: FundDetail = this.createMockFundDetail(fundId);

    return of({
      success: true,
      data: mockDetail,
      timestamp: new Date()
    }).pipe(delay(800));
  }

  private createMockFundDetail(fundId: string): FundDetail {
    const baseInfo = this.getBaseFundInfo(fundId);

    return {
      ...baseInfo,
      fundCompany: '易方达基金管理有限公司',
      establishDate: new Date('2015-06-15'),
      fundScale: Math.random() * 100 + 10, // 10-110亿元
      managementFee: 0.015, // 1.5%
      custodyFee: 0.0025,   // 0.25%
      purchaseFee: 0.0015,  // 0.15%
      redemptionFee: 0.005, // 0.5%

      managers: this.createMockManagers(),
      holdings: this.createMockHoldings(),
      industries: this.createMockIndustries(),
      riskMetrics: this.createMockRiskMetrics(),
      performance: this.createMockPerformance(),
      dividends: this.createMockDividends()
    };
  }

  private getBaseFundInfo(fundId: string): FundInfo {
    const funds = [
      {
        id: 'fund_0001',
        code: '110022',
        name: '易方达消费行业',
        type: 'stock',
        currentNav: 2.3456,
        yesterdayNav: 2.3123,
        weekNav: 2.2890,
        monthNav: 2.1987,
        yearNav: 2.0123,
        lastUpdate: new Date()
      },
      {
        id: 'fund_0002',
        code: '161725',
        name: '招商中证白酒',
        type: 'index',
        currentNav: 1.7890,
        yesterdayNav: 1.7654,
        weekNav: 1.7432,
        monthNav: 1.6987,
        yearNav: 1.5432,
        lastUpdate: new Date()
      }
    ];

    return funds.find(f => f.id === fundId) || funds[0];
  }

  private createMockManagers() {
    return [
      {
        name: '张三',
        experience: '8年',
        education: '北京大学金融学硕士',
        startDate: new Date('2018-03-15'),
        description: '资深基金经理，擅长消费行业投资',
        managedFunds: ['易方达消费行业', '易方达消费精选'],
        performance: {
          period: '2018-03-15 至今',
          return: 125.6,
          annualizedReturn: 18.2,
          maxDrawdown: -15.3
        }
      }
    ];
  }

  private createMockHoldings(): HoldingInfo[] {
    const stocks = [
      { code: '000001', name: '平安银行' },
      { code: '000002', name: '万科A' },
      { code: '000858', name: '五粮液' },
      { code: '600519', name: '贵州茅台' },
      { code: '600036', name: '招商银行' },
      { code: '000002', name: '中国平安' },
      { code: '600276', name: '恒瑞医药' },
      { code: '000651', name: '格力电器' },
      { code: '600031', name: '三一重工' },
      { code: '000876', name: '新希望' }
    ];

    let remainingWeight = 100;
    return stocks.map((stock, index) => {
      const weight = index === stocks.length - 1 ? remainingWeight : Math.random() * 15 + 2;
      remainingWeight -= weight;

      return {
        stockCode: stock.code,
        stockName: stock.name,
        shares: Math.floor(Math.random() * 10000 + 1000),
        marketValue: Math.random() * 50000 + 5000,
        weight: Math.min(weight, remainingWeight),
        changePercent: (Math.random() - 0.5) * 10
      };
    });
  }

  private createMockIndustries(): IndustryAllocation[] {
    const industries = [
      { name: '食品饮料', description: '白酒、乳制品、调味品等' },
      { name: '医药生物', description: '化学制药、中药、医疗器械等' },
      { name: '家用电器', description: '白色家电、小家电等' },
      { name: '房地产', description: '房地产开发、物业管理等' },
      { name: '金融服务', description: '银行、保险、证券等' },
      { name: '电子', description: '半导体、消费电子等' }
    ];

    let remainingWeight = 100;
    return industries.map((industry, index) => {
      const weight = index === industries.length - 1 ? remainingWeight : Math.random() * 25 + 5;
      remainingWeight -= weight;

      return {
        industryName: industry.name,
        weight: Math.min(weight, remainingWeight),
        changePercent: (Math.random() - 0.5) * 8,
        description: industry.description
      };
    });
  }

  private createMockRiskMetrics() {
    return {
      standardDeviation: Math.random() * 0.3 + 0.1,
      beta: Math.random() * 0.4 + 0.8,
      sharpeRatio: Math.random() * 2 + 0.5,
      sortinoRatio: Math.random() * 2.5 + 0.8,
      informationRatio: Math.random() * 1.5 + 0.3,
      maxDrawdown: -(Math.random() * 0.3 + 0.1),
      volatility: Math.random() * 0.25 + 0.15,
      var95: -(Math.random() * 0.05 + 0.02),
      trackingError: Math.random() * 0.08 + 0.02
    };
  }

  private createMockPerformance(): PerformanceData {
    return {
      recentReturns: {
        oneDay: (Math.random() - 0.5) * 0.06,
        oneWeek: (Math.random() - 0.5) * 0.1,
        oneMonth: (Math.random() - 0.5) * 0.15,
        threeMonths: (Math.random() - 0.5) * 0.25,
        sixMonths: (Math.random() - 0.5) * 0.35,
        oneYear: Math.random() * 0.6 - 0.1,
        twoYears: Math.random() * 0.8,
        threeYears: Math.random() * 1.2,
        sinceInception: Math.random() * 2 + 0.5
      },
      periodReturns: this.createMockPeriodReturns(),
      riskReturnRating: {
        risk: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
        return: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
        rating: Math.floor(Math.random() * 3) + 3 // 3-5星
      },
      benchmarkComparison: {
        benchmarkName: '沪深300',
        correlation: Math.random() * 0.3 + 0.7,
        beta: Math.random() * 0.4 + 0.8,
        alpha: (Math.random() - 0.3) * 0.1,
        trackingError: Math.random() * 0.08 + 0.02,
        informationRatio: Math.random() * 1.5 + 0.3,
        upMarketCapture: Math.random() * 0.3 + 0.8,
        downMarketCapture: Math.random() * 0.2 + 0.9
      }
    };
  }

  private createMockPeriodReturns() {
    const periods = ['近1月', '近3月', '近6月', '近1年', '近2年', '近3年'];
    return periods.map(period => ({
      period,
      fundReturn: (Math.random() - 0.2) * 0.8,
      benchmarkReturn: (Math.random() - 0.3) * 0.6,
      excessReturn: (Math.random() - 0.4) * 0.3,
      ranking: `${Math.floor(Math.random() * 500) + 1}/${Math.floor(Math.random() * 200) + 500}`,
      totalFunds: Math.floor(Math.random() * 200) + 500
    }));
  }

  private createMockDividends() {
    const dividends = [];
    const today = new Date();

    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i * 3);

      dividends.push({
        exDividendDate: date,
        dividendType: i % 2 === 0 ? '现金分红' : '红利再投资',
        dividendPerUnit: Math.random() * 0.1 + 0.01,
        totalAmount: Math.random() * 10000000 + 1000000,
        afterTaxDividend: Math.random() * 0.08 + 0.008
      });
    }

    return dividends;
  }

  private generateMockNavHistory(fundId: string, startDate?: Date, endDate?: Date): Observable<NavHistory[]> {
    const history: NavHistory[] = [];
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000); // 默认1年

    let nav = 1.0;
    let accumulatedNav = 1.0;

    const currentDate = new Date(start);
    while (currentDate <= end) {
      // 模拟净值变化
      const dailyReturn = (Math.random() - 0.5) * 0.04; // ±2%
      nav = nav * (1 + dailyReturn);
      accumulatedNav = accumulatedNav * (1 + dailyReturn);

      // 跳过周末
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        history.push({
          date: new Date(currentDate),
          nav: parseFloat(nav.toFixed(4)),
          accumulatedNav: parseFloat(accumulatedNav.toFixed(4)),
          dailyReturn: parseFloat(dailyReturn.toFixed(6)),
          totalReturn: parseFloat(((nav - 1) * 100).toFixed(2))
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return of(history).pipe(delay(500));
  }

  private generateMockFundNews(fundId: string, limit: number): Observable<FundNews[]> {
    const newsTemplates = [
      { title: '基金四季报显示，消费行业配置比例提升', importance: 'high' as const },
      { title: '基金经理看好消费升级长期投资机会', importance: 'medium' as const },
      { title: '消费板块震荡调整，基金净值小幅回落', importance: 'low' as const },
      { title: '新消费概念股表现活跃，相关基金受益', importance: 'medium' as const },
      { title: '消费基金规模创新高，投资者信心增强', importance: 'high' as const }
    ];

    const news: FundNews[] = newsTemplates.slice(0, limit).map((template, index) => ({
      id: `news_${fundId}_${index}`,
      title: template.title,
      summary: `关于${template.title}的详细分析...`,
      publishDate: new Date(Date.now() - index * 24 * 60 * 60 * 1000),
      source: '证券时报',
      tags: ['基金', '消费', '投资'],
      importance: template.importance
    }));

    return of(news).pipe(delay(300));
  }

  private generateMockFundAnnouncements(fundId: string, limit: number): Observable<FundAnnouncement[]> {
    const announcements: FundAnnouncement[] = [
      {
        id: `announcement_${fundId}_1`,
        title: '关于易方达消费行业基金分红的公告',
        type: '分红公告',
        publishDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        summary: '基金决定进行年度分红，每份基金份额派发现金红利0.05元...'
      },
      {
        id: `announcement_${fundId}_2`,
        title: '基金季度报告',
        type: '季度报告',
        publishDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        summary: '2024年第一季度投资组合回顾及后市展望...'
      }
    ].slice(0, limit);

    return of(announcements).pipe(delay(300));
  }

  private generateMockSearchResults(keyword: string): Observable<FundInfo[]> {
    // 简单的模拟搜索结果
    const mockResults: FundInfo[] = [
      {
        id: 'search_1',
        code: '110022',
        name: '易方达消费行业',
        type: 'stock',
        currentNav: 2.3456,
        yesterdayNav: 2.3123,
        weekNav: 2.2890,
        monthNav: 2.1987,
        yearNav: 2.0123,
        lastUpdate: new Date()
      }
    ].filter(fund =>
      fund.name.includes(keyword) || fund.code.includes(keyword)
    );

    return of(mockResults).pipe(delay(200));
  }
}