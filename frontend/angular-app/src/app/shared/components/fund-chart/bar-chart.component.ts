import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { BaseChartComponent } from './base-chart.component';
import { ChartOptions, ChartType } from 'chart.js';

export interface BarChartDataset {
  label: string;
  data: number[];
  backgroundColor: string | string[];
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
}

export type BarChartOrientation = 'vertical' | 'horizontal';

@Component({
  selector: 'app-bar-chart',
  template: `
    <div class="bar-chart-wrapper">
      <div class="chart-header" *ngIf="title || showControls">
        <h3 class="chart-title" *ngIf="title">{{ title }}</h3>
        <div class="chart-controls" *ngIf="showControls">
          <mat-button-toggle-group [(value)]="orientation" (change)="onOrientationChange($event)">
            <mat-button-toggle value="vertical">
              <mat-icon>bar_chart</mat-icon>
            </mat-button-toggle>
            <mat-button-toggle value="horizontal">
              <mat-icon>stacked_bar_chart</mat-icon>
            </mat-button-toggle>
          </mat-button-toggle-group>
          <mat-select
            [value]="sortOrder"
            (selectionChange)="onSortChange($event)"
            placeholder="排序方式"
            style="width: 120px;">
            <mat-option value="none">默认</mat-option>
            <mat-option value="asc">升序</mat-option>
            <mat-option value="desc">降序</mat-option>
          </mat-select>
        </div>
      </div>

      <div class="chart-loading-overlay" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <span>加载中...</span>
      </div>

      <div class="chart-error" *ngIf="error">
        <mat-icon color="warn">error</mat-icon>
        <span>{{ error }}</span>
      </div>

      <div class="chart-content">
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

      <div class="chart-summary" *ngIf="showSummary">
        <div class="summary-item" *ngFor="let dataset of summaryData; let i = index">
          <div class="summary-color" [style.backgroundColor]="dataset.backgroundColor"></div>
          <span class="summary-label">{{ dataset.label }}:</span>
          <span class="summary-value">{{ dataset.average | percent }}</span>
          <span class="summary-max">最高: {{ dataset.max | percent }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bar-chart-wrapper {
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

    .chart-controls {
      display: flex;
      align-items: center;
      gap: 12px;
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

    .chart-content {
      padding: 20px;
    }

    .chart-summary {
      display: flex;
      justify-content: space-around;
      padding: 16px 20px;
      border-top: 1px solid #e0e0e0;
      background-color: #fafafa;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }

    .summary-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .summary-label {
      color: #666666;
    }

    .summary-value {
      font-weight: 500;
      color: #333333;
    }

    .summary-max {
      color: #1976d2;
      margin-left: 8px;
    }

    @media (max-width: 768px) {
      .chart-header {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }

      .chart-controls {
        justify-content: center;
      }

      .chart-summary {
        flex-direction: column;
        gap: 8px;
      }
    }
  `]
})
export class BarChartComponent extends BaseChartComponent implements OnInit, OnChanges {
  // 输入属性
  @Input() title: string = '';
  @Input() labels: string[] = [];
  @Input() datasets: BarChartDataset[] = [];
  @Input() orientation: BarChartOrientation = 'vertical';
  @Input() showControls: boolean = true;
  @Input() showSummary: boolean = true;
  @Input() sortOrder: 'none' | 'asc' | 'desc' = 'none';
  @Input() showValues: boolean = false;
  @Input() valueFormat: 'number' | 'percent' = 'number';

  // 输出事件
  @Output() barClick = new EventEmitter<{ index: number; dataset: any; value: number }>();
  @Output() orientationChange = new EventEmitter<BarChartOrientation>();
  @Output() sortChange = new EventEmitter<'none' | 'asc' | 'desc'>();

  // 内部状态
  chartInstance: any = null;
  private originalLabels: string[] = [];
  private originalDatasets: BarChartDataset[] = [];

  // 默认颜色
  private defaultColors = [
    '#1976d2', '#dc004e', '#2e7d32', '#ed6c02', '#d32f2f',
    '#7b1fa2', '#00796b', '#c62828', '#f57c00', '#0277bd'
  ];

  get chartType(): ChartType {
    return this.orientation === 'horizontal' ? 'bar' : 'bar';
  }

  get summaryData(): any[] {
    return this.datasets.map(dataset => {
      const values = dataset.data.filter(v => v !== null && v !== undefined);
      const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const max = values.length > 0 ? Math.max(...values) : 0;

      return {
        label: dataset.label,
        backgroundColor: Array.isArray(dataset.backgroundColor) ? dataset.backgroundColor[0] : dataset.backgroundColor,
        average,
        max
      };
    });
  }

  ngOnInit(): void {
    super.ngOnInit();
    this.originalLabels = [...this.labels];
    this.originalDatasets = JSON.parse(JSON.stringify(this.datasets));
    this.updateChartData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['labels'] || changes['datasets']) {
      this.originalLabels = [...this.labels];
      this.originalDatasets = JSON.parse(JSON.stringify(this.datasets));
      this.applySorting();
    }
  }

  /**
   * 更新图表数据
   */
  private updateChartData(): void {
    this.data = {
      labels: this.labels,
      datasets: this.datasets.map((dataset, index) => ({
        ...dataset,
        backgroundColor: dataset.backgroundColor || this.defaultColors[index % this.defaultColors.length],
        borderColor: dataset.borderColor || this.defaultColors[index % this.defaultColors.length],
        borderWidth: dataset.borderWidth || 1,
        borderRadius: dataset.borderRadius || 4,
        borderSkipped: false
      }))
    };

    this.updateChartData();
  }

  /**
   * 获取默认图表选项
   */
  protected getDefaultOptions(): ChartOptions {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: this.datasets.length > 1,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              const value = context.parsed.y || context.parsed.x;
              if (this.valueFormat === 'percent') {
                label += (value * 100).toFixed(2) + '%';
              } else {
                label += value.toLocaleString('zh-CN');
              }
              return label;
            }
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    };

    if (this.orientation === 'horizontal') {
      return {
        ...baseOptions,
        indexAxis: 'y',
        scales: {
          x: {
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: (value) => {
                if (this.valueFormat === 'percent') {
                  return (value * 100).toFixed(0) + '%';
                }
                return value.toLocaleString('zh-CN');
              }
            }
          },
          y: {
            grid: {
              display: false
            }
          }
        }
      } as ChartOptions;
    } else {
      return {
        ...baseOptions,
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: (value) => {
                if (this.valueFormat === 'percent') {
                  return (value * 100).toFixed(0) + '%';
                }
                return value.toLocaleString('zh-CN');
              }
            }
          }
        }
      };
    }
  }

  /**
   * 图表就绪事件
   */
  onChartReady(chart: any): void {
    this.chartInstance = chart;

    // 添加数据标签
    if (this.showValues) {
      this.addDataLabels();
    }
  }

  /**
   * 添加数据标签
   */
  private addDataLabels(): void {
    // 需要安装 chartjs-plugin-datalabels
    if (this.chartInstance) {
      this.chartInstance.options.plugins = {
        ...this.chartInstance.options.plugins,
        datalabels: {
          anchor: this.orientation === 'horizontal' ? 'end' : 'center',
          align: this.orientation === 'horizontal' ? 'end' : 'center',
          formatter: (value: number) => {
            if (this.valueFormat === 'percent') {
              return (value * 100).toFixed(1) + '%';
            }
            return value.toLocaleString('zh-CN');
          },
          font: {
            size: 10,
            weight: 'bold'
          },
          color: '#333333'
        }
      };
      this.chartInstance.update();
    }
  }

  /**
   * 方向变更
   */
  onOrientationChange(event: any): void {
    this.orientation = event.value;
    this.orientationChange.emit(this.orientation);
    this.updateChartData();
  }

  /**
   * 排序变更
   */
  onSortChange(event: any): void {
    this.sortOrder = event.value;
    this.sortChange.emit(this.sortOrder);
    this.applySorting();
  }

  /**
   * 应用排序
   */
  private applySorting(): void {
    if (this.sortOrder === 'none') {
      this.labels = [...this.originalLabels];
      this.datasets = JSON.parse(JSON.stringify(this.originalDatasets));
    } else {
      // 根据第一个数据集的值进行排序
      const primaryDataset = this.originalDatasets[0];
      if (!primaryDataset) return;

      const indices = primaryDataset.data
        .map((value, index) => ({ value, index }))
        .sort((a, b) => {
          const comparison = a.value - b.value;
          return this.sortOrder === 'asc' ? comparison : -comparison;
        })
        .map(item => item.index);

      this.labels = indices.map(i => this.originalLabels[i]);
      this.datasets = this.originalDatasets.map(dataset => ({
        ...dataset,
        data: indices.map(i => dataset.data[i]),
        backgroundColor: Array.isArray(dataset.backgroundColor)
          ? indices.map(i => dataset.backgroundColor[i])
          : dataset.backgroundColor
      }));
    }

    this.updateChartData();
  }

  /**
   * 图表点击事件
   */
  onChartClick(event: any): void {
    if (event.activeElements && event.activeElements.length > 0) {
      const element = event.activeElements[0];
      const datasetIndex = element.datasetIndex;
      const index = element.index;

      const dataset = this.datasets[datasetIndex];
      const value = dataset.data[index];

      this.barClick.emit({
        index,
        dataset,
        value
      });
    }
  }

  /**
   * 设置数据
   */
  setData(labels: string[], datasets: BarChartDataset[]): void {
    this.labels = labels;
    this.datasets = datasets;
    this.originalLabels = [...labels];
    this.originalDatasets = JSON.parse(JSON.stringify(datasets));
    this.applySorting();
  }

  /**
   * 添加数据集
   */
  addDataset(dataset: BarChartDataset): void {
    this.datasets.push(dataset);
    this.originalDatasets.push(JSON.parse(JSON.stringify(dataset)));
    this.updateChartData();
  }

  /**
   * 移除数据集
   */
  removeDataset(index: number): void {
    this.datasets.splice(index, 1);
    this.originalDatasets.splice(index, 1);
    this.updateChartData();
  }

  /**
   * 添加数据点
   */
  addDataPoint(label: string, data: number[]): void {
    this.labels.push(label);
    this.datasets.forEach((dataset, index) => {
      dataset.data.push(data[index] || 0);
    });
    this.updateChartData();
  }

  /**
   * 移除数据点
   */
  removeDataPoint(index: number): void {
    this.labels.splice(index, 1);
    this.datasets.forEach(dataset => {
      dataset.data.splice(index, 1);
    });
    this.updateChartData();
  }

  /**
   * 清空数据
   */
  clearData(): void {
    this.labels = [];
    this.datasets.forEach(dataset => {
      dataset.data = [];
    });
    this.updateChartData();
  }

  /**
   * 设置颜色方案
   */
  setColorScheme(colors: string[]): void {
    this.defaultColors = colors;
    this.updateChartData();
  }
}