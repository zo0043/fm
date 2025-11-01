import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import { PortfolioService } from './services/portfolio.service';
import {
  PortfolioOverview,
  AssetAllocation,
  PortfolioPerformance,
  PortfolioRiskAnalysis,
  CorrelationMatrix,
  AssetAllocationSummary
} from './models/portfolio.model';

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.scss']
})
export class PortfolioComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // 数据
  overview: PortfolioOverview | null = null;
  allocation: AssetAllocation[] = [];
  performance: PortfolioPerformance | null = null;
  riskAnalysis: PortfolioRiskAnalysis | null = null;
  correlation: CorrelationMatrix | null = null;

  // 状态管理
  isLoading = true;
  error: string | null = null;

  // 标签页控制
  selectedTab: number = 0;

  // 图表周期
  selectedPeriod: string = '1Y';

  constructor(private portfolioService: PortfolioService) {}

  ngOnInit() {
    this.loadPortfolioData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPortfolioData() {
    this.isLoading = true;
    this.error = null;

    this.portfolioService.getPortfolioOverview({
      includeRisk: true,
      includeRecommendations: true
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.overview = response.data.overview;
          this.allocation = response.data.allocation;
          this.performance = response.data.performance;
          this.riskAnalysis = response.data.riskAnalysis || null;
          this.correlation = response.data.correlation || null;
        } else {
          this.error = response.error || '加载投资组合数据失败';
        }
      },
      error: (err) => {
        console.error('加载投资组合数据失败:', err);
        this.error = '加载投资组合数据失败，请稍后重试';
      }
    });
  }

  onTabChange(index: number) {
    this.selectedTab = index;
  }

  onPeriodChange(period: string) {
    this.selectedPeriod = period;
  }

  onRefresh() {
    this.loadPortfolioData();
  }

  onRebalance(targetAllocations: AssetAllocation[]) {
    console.log('执行再平衡:', targetAllocations);
    // 这里可以调用再平衡API
  }

  // 格式化方法
  formatCurrency(value: number): string {
    return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('zh-CN');
  }

  // 计算统计数据
  getOverallPerformance() {
    if (!this.overview) return null;

    return {
      totalValue: this.overview.totalValue,
      totalReturn: this.overview.totalReturn,
      totalReturnRate: this.overview.totalReturnRate,
      dailyChange: this.overview.dailyChange,
      dailyChangeRate: this.overview.dailyChangeRate
    };
  }

  getRiskLevel(): string {
    if (!this.riskAnalysis) return 'medium';

    const sharpeRatio = this.riskAnalysis.riskMetrics.sharpeRatio;
    if (sharpeRatio >= 2) return 'low';
    if (sharpeRatio >= 1) return 'medium';
    return 'high';
  }

  getRiskLevelColor(): string {
    const level = this.getRiskLevel();
    const colors = {
      'low': '#4caf50',
      'medium': '#ff9800',
      'high': '#f44336'
    };
    return colors[level as keyof typeof colors] || '#666';
  }

  getRiskLevelText(): string {
    const level = this.getRiskLevel();
    const texts = {
      'low': '低风险',
      'medium': '中等风险',
      'high': '高风险'
    };
    return texts[level as keyof typeof texts] || '未知';
  }

  // 获取业绩评级
  getPerformanceRating(): number {
    if (!this.performance) return 3;

    const oneYearReturn = this.performance.returnStatistics.oneYear;
    if (oneYearReturn >= 0.20) return 5; // 优秀
    if (oneYearReturn >= 0.10) return 4; // 良好
    if (oneYearReturn >= 0) return 3; // 一般
    if (oneYearReturn >= -0.10) return 2; // 较差
    return 1; // 很差
  }

  getRatingStars(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < Math.floor(rating));
  }

  getRatingColor(rating: number): string {
    if (rating >= 4.5) return '#4caf50';
    if (rating >= 3.5) return '#8bc34a';
    if (rating >= 2.5) return '#ff9800';
    return '#f44336';
  }

  getRatingText(rating: number): string {
    if (rating >= 4.5) return '优秀';
    if (rating >= 3.5) return '良好';
    if (rating >= 2.5) return '一般';
    if (rating >= 1.5) return '较差';
    return '很差';
  }

  // 获取关键指标
  getKeyMetrics() {
    if (!this.performance || !this.riskAnalysis) return null;

    return {
      sharpeRatio: this.riskAnalysis.riskMetrics.sharpeRatio,
      maxDrawdown: this.riskAnalysis.riskMetrics.maxDrawdown,
      volatility: this.riskAnalysis.riskMetrics.volatility,
      beta: this.riskAnalysis.riskMetrics.beta,
      alpha: this.performance.benchmarkComparison?.alpha || 0,
      informationRatio: this.performance.benchmarkComparison?.informationRatio || 0
    };
  }

  // 获取相关性统计
  getCorrelationStats() {
    if (!this.correlation) return null;

    return {
      averageCorrelation: this.correlation.averageCorrelation,
      minCorrelation: this.correlation.minCorrelation,
      maxCorrelation: this.correlation.maxCorrelation
    };
  }

  // 获取分散化程度
  getDiversificationLevel(): { level: string; color: string; text: string } {
    if (!this.correlation) return { level: 'medium', color: '#ff9800', text: '中等' };

    const avgCorrelation = this.correlation.averageCorrelation;

    if (avgCorrelation < 0.3) {
      return { level: 'excellent', color: '#4caf50', text: '优秀' };
    } else if (avgCorrelation < 0.6) {
      return { level: 'good', color: '#8bc34a', text: '良好' };
    } else if (avgCorrelation < 0.8) {
      return { level: 'medium', color: '#ff9800', text: '中等' };
    } else {
      return { level: 'poor', color: '#f44336', text: '较差' };
    }
  }

  // 获取时间周期选项
  getPeriodOptions() {
    return [
      { label: '1个月', value: '1M' },
      { label: '3个月', value: '3M' },
      { label: '6个月', value: '6M' },
      { label: '1年', value: '1Y' },
      { label: '3年', value: '3Y' },
      { label: '全部', value: 'ALL' }
    ];
  }

  // 获取回撤分析
  getDrawdownAnalysis() {
    if (!this.riskAnalysis?.drawdownAnalysis) return [];

    return this.riskAnalysis.drawdownAnalysis
      .sort((a, b) => b.depth - a.depth) // 按深度排序
      .slice(0, 5); // 只显示前5个最大回撤
  }

  // 获取风险贡献前5名
  getTopRiskContributors() {
    if (!this.riskAnalysis?.riskContribution) return [];

    return this.riskAnalysis.riskContribution
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 5);
  }

  // 获取压力测试结果
  getStressTestResults() {
    return this.riskAnalysis?.stressTest || [];
  }
}