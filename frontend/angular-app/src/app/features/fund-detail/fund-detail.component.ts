import { Component, OnInit, OnDestroy, ActivatedRoute } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize, catchError } from 'rxjs/operators';

import { FundDetailService } from './services/fund-detail.service';
import { FundDetail, NavHistory, FundNews, FundAnnouncement } from './models/fund-detail.model';
import { FundService } from '../../core/services/fund.service';

@Component({
  selector: 'app-fund-detail',
  templateUrl: './fund-detail.component.html',
  styleUrls: ['./fund-detail.component.scss']
})
export class FundDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // 基金数据
  fund: FundDetail | null = null;
  fundId: string = '';
  navHistory: NavHistory[] = [];
  fundNews: FundNews[] = [];
  fundAnnouncements: FundAnnouncement[] = [];

  // 状态管理
  isLoading = true;
  isNewsLoading = false;
  isAnnouncementsLoading = false;
  error: string | null = null;

  // 标签页控制
  selectedTab: number = 0;

  // 图表相关
  chartPeriod: string = '1Y';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fundDetailService: FundDetailService,
    private fundService: FundService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.fundId = params['id'];
      if (this.fundId) {
        this.loadFundDetail();
        this.loadNavHistory();
        this.loadNews();
        this.loadAnnouncements();
      } else {
        this.error = '无效的基金ID';
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFundDetail() {
    this.isLoading = true;
    this.error = null;

    this.fundDetailService.getFundDetail({
      fundId: this.fundId,
      includeHoldings: true,
      includeNews: false,
      includeAnnouncements: false
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoading = false),
      catchError(error => {
        console.error('加载基金详情失败:', error);
        this.error = '加载基金信息失败，请稍后重试';
        throw error;
      })
    ).subscribe(response => {
      if (response.success && response.data) {
        this.fund = response.data;
      } else {
        this.error = response.error || '基金信息加载失败';
      }
    });
  }

  private loadNavHistory() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 3); // 默认加载3年数据

    this.fundDetailService.getNavHistory(this.fundId, startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe(history => {
        this.navHistory = history;
      });
  }

  private loadNews() {
    this.isNewsLoading = true;

    this.fundDetailService.getFundNews(this.fundId, 5)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isNewsLoading = false)
      )
      .subscribe(news => {
        this.fundNews = news;
      });
  }

  private loadAnnouncements() {
    this.isAnnouncementsLoading = true;

    this.fundDetailService.getFundAnnouncements(this.fundId, 5)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isAnnouncementsLoading = false)
      )
      .subscribe(announcements => {
        this.fundAnnouncements = announcements;
      });
  }

  onTabChange(index: number) {
    this.selectedTab = index;
  }

  onChartPeriodChange(period: string) {
    this.chartPeriod = period;
  }

  onRefresh() {
    this.loadFundDetail();
    this.loadNavHistory();
  }

  onAddToWatchlist(fundId: string) {
    this.fundService.addToWatchlist(fundId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            console.log('添加到关注列表成功');
          }
        },
        error: (error) => {
          console.error('添加关注失败:', error);
        }
      });
  }

  onRemoveFromWatchlist(fundId: string) {
    this.fundService.removeFromWatchlist(fundId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            console.log('从关注列表移除成功');
          }
        },
        error: (error) => {
          console.error('移除关注失败:', error);
        }
      });
  }

  onGoBack() {
    this.router.navigate(['/funds']);
  }

  // 格式化方法
  formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
  }

  formatCurrency(value: number): string {
    return `¥${value.toFixed(4)}`;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('zh-CN');
  }

  getFundTypeLabel(type: string): string {
    const typeLabels: { [key: string]: string } = {
      'stock': '股票型',
      'bond': '债券型',
      'hybrid': '混合型',
      'index': '指数型',
      'etf': 'ETF',
      'qdii': 'QDII'
    };
    return typeLabels[type] || type;
  }

  getNewsImportanceColor(importance: string): string {
    const colors: { [key: string]: string } = {
      'high': '#f44336',
      'medium': '#ff9800',
      'low': '#4caf50'
    };
    return colors[importance] || '#666';
  }

  getNewsImportanceLabel(importance: string): string {
    const labels: { [key: string]: string } = {
      'high': '重要',
      'medium': '中等',
      'low': '一般'
    };
    return labels[importance] || importance;
  }

  getFilteredNavHistory(): NavHistory[] {
    if (!this.navHistory.length) return [];

    const now = new Date();
    let cutoffDate = new Date();

    switch (this.chartPeriod) {
      case '1M':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case '3Y':
        cutoffDate.setFullYear(now.getFullYear() - 3);
        break;
      default:
        return this.navHistory;
    }

    return this.navHistory.filter(item => new Date(item.date) >= cutoffDate);
  }

  // 计算统计数据
  getNavStatistics() {
    if (!this.navHistory.length) return null;

    const filteredHistory = this.getFilteredNavHistory();
    const navValues = filteredHistory.map(item => item.nav);
    const returns = filteredHistory.slice(1).map((item, index) =>
      (item.nav - filteredHistory[index].nav) / filteredHistory[index].nav
    );

    const startNav = navValues[0];
    const endNav = navValues[navValues.length - 1];
    const totalReturn = (endNav - startNav) / startNav;
    const maxNav = Math.max(...navValues);
    const minNav = Math.min(...navValues);
    const maxDrawdown = (maxNav - minNav) / maxNav;

    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const volatility = returns.length > 1 ? this.calculateStandardDeviation(returns) : 0;
    const sharpeRatio = volatility > 0 ? (avgReturn * 252) / (volatility * Math.sqrt(252)) : 0;

    return {
      totalReturn,
      maxDrawdown,
      volatility: volatility * Math.sqrt(252),
      sharpeRatio,
      startNav,
      endNav,
      maxNav,
      minNav
    };
  }

  private calculateStandardDeviation(values: number[]): number {
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  // 检查基金是否在关注列表中（这里应该从状态管理中获取）
  get isWatchlisted(): boolean {
    return false; // 临时实现
  }

  // 获取基金评级颜色
  getRatingColor(rating: number): string {
    if (rating >= 4.5) return '#4caf50';
    if (rating >= 3.5) return '#8bc34a';
    if (rating >= 2.5) return '#ff9800';
    return '#f44336';
  }

  // 获取基金评级文本
  getRatingText(rating: number): string {
    if (rating >= 4.5) return '优秀';
    if (rating >= 3.5) return '良好';
    if (rating >= 2.5) return '一般';
    return '较差';
  }
}