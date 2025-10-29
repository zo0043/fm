import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { BaseChartComponent } from './base-chart.component';
import { ChartOptions, ChartType } from 'chart.js';

export interface GaugeConfig {
  min: number;
  max: number;
  thresholds: {
    good: number;
    warning: number;
    danger: number;
  };
  label: string;
  unit?: string;
}

export interface GaugeData {
  value: number;
  timestamp?: string;
  trend?: number; // -1下降, 0平稳, 1上升
}

@Component({
  selector: 'app-gauge-chart',
  template: `
    <div class="gauge-chart-wrapper">
      <div class="chart-header">
        <h3 class="chart-title" *ngIf="title">{{ title }}</h3>
        <div class="chart-status" [ngClass]="getStatusClass()">
          <mat-icon>{{ getStatusIcon() }}</mat-icon>
          <span>{{ getStatusText() }}</span>
        </div>
      </div>

      <div class="chart-content">
        <div class="gauge-container">
          <div class="chart-loading-overlay" *ngIf="loading">
            <mat-spinner diameter="30"></mat-spinner>
          </div>

          <div class="chart-error" *ngIf="error">
            <mat-icon color="warn">error</mat-icon>
            <span>{{ error }}</span>
          </div>

          <app-base-chart
            [type]="chartType"
            [height]="height"
            [loading]="loading"
            [error]="error"
            [data]="chartData"
            [options]="chartOptions"
            (chartReady)="onChartReady($event)">
          </app-base-chart>

          <div class="gauge-center">
            <div class="gauge-value">
              <span class="value-number">{{ displayValue }}</span>
              <span class="value-unit">{{ config.unit }}</span>
            </div>
            <div class="gauge-label">{{ config.label }}</div>
            <div class="gauge-trend" *ngIf="showTrend && data.trend !== undefined">
              <mat-icon [color]="getTrendColor()">{{ getTrendIcon() }}</mat-icon>
              <span [style.color]="getTrendColor()">{{ getTrendText() }}</span>
            </div>
          </div>
        </div>

        <div class="gauge-info" *ngIf="showDetails">
          <div class="info-item">
            <span class="info-label">当前值:</span>
            <span class="info-value">{{ data.value }}{{ config.unit }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">范围:</span>
            <span class="info-value">{{ config.min }} - {{ config.max }}{{ config.unit }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">状态:</span>
            <span class="info-value" [ngClass]="getStatusClass()">{{ getStatusText() }}</span>
          </div>
          <div class="info-item" *ngIf="data.timestamp">
            <span class="info-label">更新时间:</span>
            <span class="info-value">{{ formatDate(data.timestamp) }}</span>
          </div>
        </div>
      </div>

      <div class="gauge-legend" *ngIf="showLegend">
        <div class="legend-item good">
          <div class="legend-color"></div>
          <span>良好 (≥{{ config.thresholds.good }})</span>
        </div>
        <div class="legend-item warning">
          <div class="legend-color"></div>
          <span>警告 ({{ config.thresholds.warning }}-{{ config.thresholds.good - 1 }})</span>
        </div>
        <div class="legend-item danger">
          <div class="legend-color"></div>
          <span>危险 (<{{ config.thresholds.warning }})</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gauge-chart-wrapper {
      position: relative;
      width: 100%;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #e0e0e0;
    }

    .chart-title {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      color: #333333;
    }

    .chart-status {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
    }

    .chart-status.good {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .chart-status.warning {
      background-color: #fff8e1;
      color: #f57c00;
    }

    .chart-status.danger {
      background-color: #ffebee;
      color: #d32f2f;
    }

    .chart-content {
      display: flex;
      padding: 20px;
      gap: 20px;
    }

    .gauge-container {
      flex: 1;
      position: relative;
      min-width: 200px;
    }

    .chart-loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10;
    }

    .chart-error {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      color: #f44336;
      text-align: center;
    }

    .chart-error mat-icon {
      font-size: 36px;
      margin-bottom: 8px;
    }

    .gauge-center {
      position: absolute;
      top: 60%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }

    .gauge-value {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 2px;
      margin-bottom: 4px;
    }

    .value-number {
      font-size: 28px;
      font-weight: bold;
      color: #333333;
      line-height: 1;
    }

    .value-unit {
      font-size: 14px;
      color: #666666;
    }

    .gauge-label {
      font-size: 12px;
      color: #666666;
      margin-bottom: 8px;
    }

    .gauge-trend {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-size: 12px;
    }

    .gauge-trend mat-icon {
      font-size: 16px;
      height: 16px;
      width: 16px;
    }

    .gauge-info {
      flex: 0 0 200px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .info-item:last-child {
      border-bottom: none;
    }

    .info-label {
      font-size: 12px;
      color: #666666;
    }

    .info-value {
      font-size: 12px;
      font-weight: 500;
      color: #333333;
    }

    .info-value.good {
      color: #2e7d32;
    }

    .info-value.warning {
      color: #f57c00;
    }

    .info-value.danger {
      color: #d32f2f;
    }

    .gauge-legend {
      display: flex;
      justify-content: space-around;
      padding: 16px 20px;
      border-top: 1px solid #e0e0e0;
      background-color: #fafafa;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #666666;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .legend-item.good .legend-color {
      background-color: #4caf50;
    }

    .legend-item.warning .legend-color {
      background-color: #ff9800;
    }

    .legend-item.danger .legend-color {
      background-color: #f44336;
    }

    @media (max-width: 768px) {
      .chart-content {
        flex-direction: column;
        align-items: center;
      }

      .gauge-info {
        flex: 1;
        width: 100%;
      }

      .gauge-center {
        top: 55%;
      }

      .value-number {
        font-size: 24px;
      }
    }

    @media (max-width: 480px) {
      .chart-header {
        flex-direction: column;
        gap: 8px;
        align-items: stretch;
      }

      .chart-status {
        align-self: center;
      }

      .gauge-legend {
        flex-direction: column;
        gap: 8px;
      }
    }
  `]
})
export class GaugeChartComponent extends BaseChartComponent implements OnInit, OnChanges {
  // 输入属性
  @Input() title: string = '';
  @Input() data: GaugeData = { value: 0 };
  @Input() config: GaugeConfig = {
    min: 0,
    max: 100,
    thresholds: {
      good: 80,
      warning: 50,
      danger: 0
    },
    label: '指标',
    unit: ''
  };
  @Input() showDetails: boolean = true;
  @Input() showLegend: boolean = true;
  @Input() showTrend: boolean = true;
  @Input() height: string = '250px';

  // 输出事件
  @Output() valueChange = new EventEmitter<GaugeData>();
  @Output() statusChange = new EventEmitter<'good' | 'warning' | 'danger'>();

  // 内部状态
  chartInstance: any = null;

  get chartType(): ChartType {
    return 'doughnut';
  }

  get displayValue(): string {
    if (this.config.unit === '%') {
      return (this.data.value * 100).toFixed(1);
    }
    return this.data.value.toFixed(2);
  }

  ngOnInit(): void {
    super.ngOnInit();
    this.updateChartData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['config']) {
      this.updateChartData();
    }
  }

  /**
   * 更新图表数据
   */
  private updateChartData(): void {
    const percentage = this.calculatePercentage();
    const color = this.getGaugeColor(percentage);

    this.data = {
      labels: ['值', '剩余'],
      datasets: [{
        data: [percentage, 100 - percentage],
        backgroundColor: [color, '#e0e0e0'],
        borderColor: '#ffffff',
        borderWidth: 2,
        circumference: 180,
        rotation: 270,
        cutout: '75%'
      }]
    };

    this.updateChartData();
  }

  /**
   * 计算百分比
   */
  private calculatePercentage(): number {
    const range = this.config.max - this.config.min;
    const value = Math.max(this.config.min, Math.min(this.config.max, this.data.value));
    return ((value - this.config.min) / range) * 100;
  }

  /**
   * 获取仪表盘颜色
   */
  private getGaugeColor(percentage: number): string {
    const value = this.data.value;
    if (value >= this.config.thresholds.good) {
      return '#4caf50'; // 绿色
    } else if (value >= this.config.thresholds.warning) {
      return '#ff9800'; // 橙色
    } else {
      return '#f44336'; // 红色
    }
  }

  /**
   * 获取状态
   */
  getStatus(): 'good' | 'warning' | 'danger' {
    const value = this.data.value;
    if (value >= this.config.thresholds.good) {
      return 'good';
    } else if (value >= this.config.thresholds.warning) {
      return 'warning';
    } else {
      return 'danger';
    }
  }

  /**
   * 获取状态类名
   */
  getStatusClass(): string {
    return this.getStatus();
  }

  /**
   * 获取状态图标
   */
  getStatusIcon(): string {
    const status = this.getStatus();
    switch (status) {
      case 'good': return 'check_circle';
      case 'warning': return 'warning';
      case 'danger': return 'error';
      default: return 'help';
    }
  }

  /**
   * 获取状态文本
   */
  getStatusText(): string {
    const status = this.getStatus();
    switch (status) {
      case 'good': return '良好';
      case 'warning': return '警告';
      case 'danger': return '危险';
      default: return '未知';
    }
  }

  /**
   * 获取趋势颜色
   */
  getTrendColor(): string {
    if (!this.data.trend) return '#666666';
    return this.data.trend > 0 ? '#4caf50' : this.data.trend < 0 ? '#f44336' : '#666666';
  }

  /**
   * 获取趋势图标
   */
  getTrendIcon(): string {
    if (!this.data.trend) return 'remove';
    return this.data.trend > 0 ? 'trending_up' : 'trending_down';
  }

  /**
   * 获取趋势文本
   */
  getTrendText(): string {
    if (!this.data.trend) return '持平';
    return this.data.trend > 0 ? '上升' : '下降';
  }

  /**
   * 格式化日期
   */
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  }

  /**
   * 获取默认图表选项
   */
  protected getDefaultOptions(): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: false
        }
      },
      cutout: '75%',
      circumference: 180,
      rotation: 270,
      animation: {
        animateRotate: true,
        animateScale: false,
        duration: 1500,
        easing: 'easeInOutQuart'
      }
    };
  }

  /**
   * 图表就绪事件
   */
  onChartReady(chart: any): void {
    this.chartInstance = chart;
  }

  /**
   * 更新值
   */
  updateValue(value: number): void {
    const oldStatus = this.getStatus();
    this.data.value = value;
    this.updateChartData();

    const newStatus = this.getStatus();
    if (oldStatus !== newStatus) {
      this.statusChange.emit(newStatus);
    }

    this.valueChange.emit({ ...this.data });
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<GaugeConfig>): void {
    this.config = { ...this.config, ...config };
    this.updateChartData();
  }

  /**
   * 添加动画效果
   */
  animateValue(fromValue: number, toValue: number, duration: number = 1000): void {
    const startTime = Date.now();
    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeProgress = this.easeInOutQuart(progress);
      const currentValue = fromValue + (toValue - fromValue) * easeProgress;

      this.updateValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  /**
   * 缓动函数
   */
  private easeInOutQuart(t: number): number {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  /**
   * 设置主题
   */
  setTheme(isDark: boolean): void {
    if (this.chartInstance) {
      // 仪表盘主题设置
      this.updateChartData();
    }
  }
}