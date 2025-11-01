import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FundDetail, FundManager } from '../../models/fund-detail.model';

@Component({
  selector: 'app-fund-basic-info',
  templateUrl: './fund-basic-info.component.html',
  styleUrls: ['./fund-basic-info.component.scss']
})
export class FundBasicInfoComponent {
  @Input() fund: FundDetail | null = null;
  @Input() isLoading: boolean = false;
  @Output() addToWatchlist = new EventEmitter<string>();
  @Output() removeFromWatchlist = new EventEmitter<string>();

  get isWatchlisted(): boolean {
    // 这里应该从状态管理中获取
    return false;
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

  getRiskLevelLabel(riskLevel?: string): string {
    const riskLabels: { [key: string]: string } = {
      'low': '低风险',
      'medium-low': '中低风险',
      'medium': '中等风险',
      'medium-high': '中高风险',
      'high': '高风险'
    };
    return riskLabels[riskLevel || ''] || '未知';
  }

  getRiskLevelColor(riskLevel?: string): string {
    const riskColors: { [key: string]: string } = {
      'low': '#4caf50',
      'medium-low': '#8bc34a',
      'medium': '#ff9800',
      'medium-high': '#ff5722',
      'high': '#f44336'
    };
    return riskColors[riskLevel || ''] || '#666';
  }

  getRatingStars(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < Math.floor(rating));
  }

  getTrendInfo(): { trend: string; change: number; color: string } {
    if (!this.fund) return { trend: 'flat', change: 0, color: '#666' };

    const change = this.fund.currentNav - this.fund.yesterdayNav;
    const changePercent = (change / this.fund.yesterdayNav) * 100;

    let trend = 'flat';
    let color = '#666';

    if (changePercent > 0) {
      trend = 'up';
      color = '#4caf50';
    } else if (changePercent < 0) {
      trend = 'down';
      color = '#f44336';
    }

    return { trend, change: changePercent, color };
  }

  formatCurrency(value: number): string {
    return `¥${value.toFixed(4)}`;
  }

  formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
  }

  formatLargeNumber(value: number): string {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(2)}万亿`;
    } else if (value >= 100) {
      return `${(value / 100).toFixed(2)}亿`;
    }
    return value.toFixed(2);
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('zh-CN');
  }

  onWatchlistToggle() {
    if (!this.fund) return;

    if (this.isWatchlisted) {
      this.removeFromWatchlist.emit(this.fund.id);
    } else {
      this.addToWatchlist.emit(this.fund.id);
    }
  }

  getManagerExperience(manager: FundManager): string {
    return manager.experience;
  }

  getManagerTenure(manager: FundManager): string {
    const today = new Date();
    const tenureYears = Math.floor((today.getTime() - manager.startDate.getTime()) / (365 * 24 * 60 * 60 * 1000));
    const tenureMonths = Math.floor(((today.getTime() - manager.startDate.getTime()) % (365 * 24 * 60 * 60 * 1000)) / (30 * 24 * 60 * 60 * 1000));

    if (tenureYears > 0) {
      return `${tenureYears}年${tenureMonths}个月`;
    }
    return `${tenureMonths}个月`;
  }
}