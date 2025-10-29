import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DecimalPipe, PercentPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TrendInfo } from '../../../models/fund.model';

// 使用方法：在父组件中导入并使用
// <app-trend-indicator [trendInfo]="trendData" [size]="'large'" [showValue]="true"></app-trend-indicator>

@Component({
  selector: 'app-trend-indicator',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    DecimalPipe,
    PercentPipe
  ],
  templateUrl: './trend-indicator.component.html',
  styleUrls: ['./trend-indicator.component.scss']
})
export class TrendIndicatorComponent implements OnChanges {
  @Input() trendInfo: TrendInfo | null = null;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showValue: boolean = true;
  @Input() showIcon: boolean = true;
  @Input() showPercentage: boolean = true;
  @Input() compact: boolean = false;

  trendClass: string = '';
  trendIcon: string = 'remove';
  trendColor: string = '#9e9e9e';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['trendInfo'] && this.trendInfo) {
      this.updateTrendDisplay();
    }
  }

  private updateTrendDisplay(): void {
    if (!this.trendInfo) return;

    switch (this.trendInfo.trend) {
      case 'up':
        this.trendClass = 'trend-up';
        this.trendIcon = 'trending_up';
        this.trendColor = '#4caf50'; // Material Green
        break;
      case 'down':
        this.trendClass = 'trend-down';
        this.trendIcon = 'trending_down';
        this.trendColor = '#f44336'; // Material Red
        break;
      default:
        this.trendClass = 'trend-flat';
        this.trendIcon = 'trending_flat';
        this.trendColor = '#9e9e9e'; // Material Grey
        break;
    }
  }

  // 获取组件尺寸类
  getSizeClass(): string {
    return `size-${this.size}`;
  }

  // 格式化涨跌幅显示
  formatChangePercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  // 格式化涨跌金额显示
  formatChangeAmount(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(4)}`;
  }

  // 获取工具提示文本
  getTooltipText(): string {
    if (!this.trendInfo) return '暂无数据';

    const trendText = this.trendInfo.trend === 'up' ? '上涨' :
                     this.trendInfo.trend === 'down' ? '下跌' : '平盘';

    return `当前净值: ${this.trendInfo.currentNav.toFixed(4)} (${trendText} ${this.formatChangePercent(this.trendInfo.changePercent)})`;
  }

  // 获取样式对象
  getIndicatorStyles(): any {
    return {
      color: this.trendColor,
      borderColor: this.trendColor,
      backgroundColor: this.compact ? 'transparent' : `${this.trendColor}15`
    };
  }
}