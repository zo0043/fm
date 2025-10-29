import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { BaseChartComponent } from './base-chart.component';
import { ChartOptions, ChartType } from 'chart.js';

export interface PieChartData {
  label: string;
  value: number;
  color?: string;
}

@Component({
  selector: 'app-pie-chart',
  template: `
    <div class="pie-chart-wrapper">
      <div class="chart-header" *ngIf="title">
        <h3 class="chart-title">{{ title }}</h3>
        <div class="chart-summary" *ngIf="showSummary">
          <span class="summary-item">
            <strong>总计:</strong> {{ totalValue | currency }}
          </span>
        </div>
      </div>

      <div class="chart-content">
        <div class="chart-container">
          <div class="chart-loading-overlay" *ngIf="loading">
            <mat-spinner diameter="40"></mat-spinner>
            <span>加载中...</span>
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
            (chartReady)="onChartReady($event)"
            (chartClick)="onChartClick.emit($event)">
          </app-base-chart>
        </div>

        <div class="chart-info" *ngIf="showLegend || showDetails">
          <div class="chart-legend" *ngIf="showLegend">
            <div
              class="legend-item"
              *ngFor="let item of chartDataItems; let i = index"
              [class.legend-item-hidden]="hiddenItems.has(i)"
              (click)="toggleItem(i)">
              <div class="legend-color" [style.backgroundColor]="item.color"></div>
              <div class="legend-content">
                <span class="legend-label">{{ item.label }}</span>
                <div class="legend-details" *ngIf="showDetails">
                  <span class="legend-value">{{ item.value | currency }}</span>
                  <span class="legend-percentage">{{ getPercentage(item.value) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-actions" *ngIf="showActions">
        <button mat-icon-button (click)="toggleChartType()" matTooltip="切换图表类型">
          <mat-icon>{{ chartType === 'pie' ? 'donut_large' : 'pie_chart' }}</mat-icon>
        </button>
        <button mat-icon-button (click)="exportChart()" matTooltip="导出图表">
          <mat-icon>download</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .pie-chart-wrapper {
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

    .chart-summary {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .summary-item {
      font-size: 14px;
      color: #666666;
    }

    .summary-item strong {
      color: #333333;
    }

    .chart-content {
      display: flex;
      padding: 20px;
      gap: 20px;
    }

    .chart-container {
      flex: 1;
      min-width: 200px;
      position: relative;
    }

    .chart-info {
      flex: 0 0 300px;
    }

    .chart-loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10;
    }

    .chart-loading-overlay span {
      margin-top: 12px;
      color: #666666;
      font-size: 14px;
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
      font-size: 48px;
      margin-bottom: 8px;
    }

    .chart-legend {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .legend-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .legend-item:hover {
      background-color: #f5f5f5;
    }

    .legend-item-hidden {
      opacity: 0.3;
    }

    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .legend-content {
      flex: 1;
      min-width: 0;
    }

    .legend-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #333333;
      margin-bottom: 4px;
      word-break: break-word;
    }

    .legend-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .legend-value {
      font-size: 13px;
      color: #666666;
    }

    .legend-percentage {
      font-size: 12px;
      font-weight: 500;
      color: #1976d2;
    }

    .chart-actions {
      display: flex;
      justify-content: flex-end;
      padding: 12px 20px;
      border-top: 1px solid #e0e0e0;
      gap: 8px;
    }

    @media (max-width: 768px) {
      .chart-content {
        flex-direction: column;
      }

      .chart-info {
        flex: 1;
        width: 100%;
      }

      .chart-header {
        flex-direction: column;
        gap: 8px;
        align-items: stretch;
      }

      .chart-summary {
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .chart-content {
        padding: 16px;
      }

      .legend-details {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
      }
    }
  `]
})
export class PieChartComponent extends BaseChartComponent implements OnInit, OnChanges {
  // 输入属性
  @Input() title: string = '';
  @Input() data: PieChartData[] = [];
  @Input() chartType: 'pie' | 'doughnut' = 'pie';
  @Input() showLegend: boolean = true;
  @Input() showDetails: boolean = true;
  @Input() showSummary: boolean = true;
  @Input() showActions: boolean = true;
  @Input() height: string = '300px';

  // 输出事件
  @Output() itemClick = new EventEmitter<{ item: PieChartData; index: number }>();
  @Output() itemToggle = new EventEmitter<{ item: PieChartData; index: number; visible: boolean }>();

  // 内部状态
  hiddenItems = new Set<number>();
  chartInstance: any = null;

  // 默认颜色
  private defaultColors = [
    '#1976d2', '#dc004e', '#2e7d32', '#ed6c02', '#d32f2f',
    '#7b1fa2', '#00796b', '#c62828', '#f57c00', '#0277bd',
    '#455a64', '#546e7a', '#607d8b', '#78909c', '#90a4ae'
  ];

  get chartDataItems(): (PieChartData & { color: string })[] {
    return this.data.map((item, index) => ({
      ...item,
      color: item.color || this.defaultColors[index % this.defaultColors.length]
    }));
  }

  get totalValue(): number {
    return this.chartDataItems
      .filter((_, index) => !this.hiddenItems.has(index))
      .reduce((sum, item) => sum + item.value, 0);
  }

  ngOnInit(): void {
    super.ngOnInit();
    this.updateChartData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.updateChartData();
    }
  }

  /**
   * 更新图表数据
   */
  private updateChartData(): void {
    const visibleItems = this.chartDataItems.filter((_, index) => !this.hiddenItems.has(index));

    this.data = {
      labels: visibleItems.map(item => item.label),
      datasets: [{
        data: visibleItems.map(item => item.value),
        backgroundColor: visibleItems.map(item => item.color),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverBorderColor: '#ffffff'
      }]
    };

    this.updateChartData();
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
          display: false // 使用自定义图例
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context) => {
              const item = this.chartDataItems[context.dataIndex];
              const value = context.parsed;
              const percentage = this.getPercentage(value);
              return [
                `${item.label}: ${value.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}`,
                `占比: ${percentage}%`
              ];
            }
          }
        }
      },
      cutout: this.chartType === 'doughnut' ? '50%' : '0%',
      animation: {
        animateRotate: true,
        animateScale: false,
        duration: 1000
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
   * 切换项目显示
   */
  toggleItem(index: number): void {
    const originalIndex = this.getOriginalIndex(index);

    if (this.hiddenItems.has(originalIndex)) {
      this.hiddenItems.delete(originalIndex);
    } else {
      this.hiddenItems.add(originalIndex);
    }

    const item = this.chartDataItems[originalIndex];
    this.itemToggle.emit({
      item,
      index: originalIndex,
      visible: !this.hiddenItems.has(originalIndex)
    });

    this.updateChartData();
  }

  /**
   * 获取原始索引
   */
  private getOriginalIndex(visibleIndex: number): number {
    let originalIndex = 0;
    let visibleCount = 0;

    for (let i = 0; i < this.chartDataItems.length; i++) {
      if (!this.hiddenItems.has(i)) {
        if (visibleCount === visibleIndex) {
          return i;
        }
        visibleCount++;
      }
    }

    return 0;
  }

  /**
   * 获取百分比
   */
  getPercentage(value: number): number {
    if (this.totalValue === 0) return 0;
    return Math.round((value / this.totalValue) * 100);
  }

  /**
   * 切换图表类型
   */
  toggleChartType(): void {
    this.chartType = this.chartType === 'pie' ? 'doughnut' : 'pie';
    this.updateChartData();
  }

  /**
   * 导出图表
   */
  exportChart(): void {
    if (this.chartInstance) {
      const url = this.chartInstance.toBase64Image();
      const link = document.createElement('a');
      link.download = `pie-chart-${Date.now()}.png`;
      link.href = url;
      link.click();
    }
  }

  /**
   * 设置数据
   */
  setData(data: PieChartData[]): void {
    this.data = data;
    this.hiddenItems.clear();
    this.updateChartData();
  }

  /**
   * 添加数据项
   */
  addDataItem(item: PieChartData): void {
    this.data.push(item);
    this.updateChartData();
  }

  /**
   * 移除数据项
   */
  removeDataItem(index: number): void {
    this.data.splice(index, 1);
    this.hiddenItems.delete(index); // 清除隐藏状态
    this.updateChartData();
  }

  /**
   * 清空数据
   */
  clearData(): void {
    this.data = [];
    this.hiddenItems.clear();
    this.updateChartData();
  }

  /**
   * 设置颜色方案
   */
  setColorScheme(colors: string[]): void {
    this.defaultColors = colors;
    this.updateChartData();
  }

  /**
   * 显示所有项目
   */
  showAllItems(): void {
    this.hiddenItems.clear();
    this.updateChartData();
  }

  /**
   * 隐藏所有项目
   */
  hideAllItems(): void {
    this.chartDataItems.forEach((_, index) => {
      this.hiddenItems.add(index);
    });
    this.updateChartData();
  }
}