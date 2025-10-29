import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule, DecimalPipe, PercentPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { FundInfo, TrendInfo } from '../../../models/fund.model';

// 使用方法：在父组件中导入并使用
// <app-fund-card [fund]="fundData" [showActions]="true" (viewDetails)="onViewDetails($event)"></app-fund-card>

@Component({
  selector: 'app-fund-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    DecimalPipe,
    PercentPipe
  ],
  templateUrl: './fund-card.component.html',
  styleUrls: ['./fund-card.component.scss']
})
export class FundCardComponent implements OnChanges {
  @Input() fund: FundInfo | null = null;
  @Input() showActions: boolean = true;
  @Input() compact: boolean = false;

  @Output() viewDetails = new EventEmitter<string>();
  @Output() addToWatchlist = new EventEmitter<string>();
  @Output() removeFromWatchlist = new EventEmitter<string>();

  trendInfo: TrendInfo | null = null;
  isInWatchlist: boolean = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fund'] && this.fund) {
      this.calculateTrendInfo();
    }
  }

  private calculateTrendInfo(): void {
    if (!this.fund) return;

    const changeAmount = this.fund.currentNav - this.fund.yesterdayNav;
    const changePercent = (changeAmount / this.fund.yesterdayNav) * 100;

    this.trendInfo = {
      currentNav: this.fund.currentNav,
      changeAmount: changeAmount,
      changePercent: changePercent,
      trend: changeAmount > 0 ? 'up' : changeAmount < 0 ? 'down' : 'flat'
    };
  }

  // 获取趋势颜色类
  getTrendColorClass(): string {
    if (!this.trendInfo) return '';

    switch (this.trendInfo.trend) {
      case 'up':
        return 'trend-up';
      case 'down':
        return 'trend-down';
      default:
        return 'trend-flat';
    }
  }

  // 获取趋势图标
  getTrendIcon(): string {
    if (!this.trendInfo) return 'remove';

    switch (this.trendInfo.trend) {
      case 'up':
        return 'trending_up';
      case 'down':
        return 'trending_down';
      default:
        return 'trending_flat';
    }
  }

  // 处理查看详情
  onViewDetailsClick(): void {
    if (this.fund) {
      this.viewDetails.emit(this.fund.id);
    }
  }

  // 处理添加到监控列表
  onAddToWatchlist(): void {
    if (this.fund) {
      this.addToWatchlist.emit(this.fund.id);
      this.isInWatchlist = true;
    }
  }

  // 处理从监控列表移除
  onRemoveFromWatchlist(): void {
    if (this.fund) {
      this.removeFromWatchlist.emit(this.fund.id);
      this.isInWatchlist = false;
    }
  }

  // 获取基金类型显示名称
  getFundTypeDisplay(): string {
    if (!this.fund) return '';

    const typeMap: { [key: string]: string } = {
      'stock': '股票型',
      'bond': '债券型',
      'hybrid': '混合型',
      'money': '货币型',
      'index': '指数型',
      'etf': 'ETF',
      'qdii': 'QDII'
    };

    return typeMap[this.fund.type] || this.fund.type;
  }

  // 格式化净值显示
  formatNav(value: number): string {
    return value.toFixed(4);
  }

  // 格式化涨跌幅显示
  formatChangePercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }
}