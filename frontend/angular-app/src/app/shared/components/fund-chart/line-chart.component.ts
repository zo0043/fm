import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { BaseChartComponent } from './base-chart.component';
import { ChartOptions, ChartType } from 'chart.js';

export interface LineChartDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  borderWidth: number;
  fill: boolean;
  tension: number;
  pointRadius: number;
  pointHoverRadius: number;
}

@Component({
  selector: 'app-line-chart',
  template: `
    <div class="line-chart-wrapper">
      <div class="chart-header" *ngIf="title || showControls">
        <h3 class="chart-title" *ngIf="title">{{ title }}</h3>
        <div class="chart-controls" *ngIf="showControls">
          <mat-button-toggle-group [(value)]="selectedPeriod" (change)="onPeriodChange($event)">
            <mat-button-toggle value="7">7天</mat-button-toggle>
            <mat-button-toggle value="30">30天</mat-button-toggle>
            <mat-button-toggle value="90">3个月</mat-button-toggle>
            <mat-button-toggle value="365">1年</mat-button-toggle>
          </mat-button-toggle-group>
          <button mat-icon-button (click)="resetZoom()" matTooltip="重置缩放">
            <mat-icon>zoom_out_map</mat-icon>
          </button>
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

      <app-base-chart
        [type]="'line'"
        [height]="height"
        [loading]="loading"
        [error]="error"
        [data]="chartData"
        [options]="chartOptions"
        (chartReady)="onChartReady($event)"
        (chartClick)="onChartClick.emit($event)">
      </app-base-chart>

      <div class="chart-legend" *ngIf="showCustomLegend && datasets.length > 1">
        <div
          class="legend-item"
          *ngFor="let dataset of datasets; let i = index"
          [class.legend-item-hidden]="hiddenDatasets.has(i)"
          (click)="toggleDataset(i)">
          <div class="legend-color" [style.backgroundColor]="dataset.borderColor"></div>
          <span class="legend-label">{{ dataset.label }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .line-chart-wrapper {
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

    .chart-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      padding: 16px 20px;
      border-top: 1px solid #e0e0e0;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .legend-item:hover {
      opacity: 0.8;
    }

    .legend-item-hidden {
      opacity: 0.3;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .legend-label {
      font-size: 12px;
      color: #666666;
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

      .chart-legend {
        justify-content: center;
      }
    }
  `]
})
export class LineChartComponent extends BaseChartComponent implements OnInit, OnChanges {
  // 输入属性
  @Input() title: string = '';
  @Input() labels: string[] = [];
  @Input() datasets: LineChartDataset[] = [];
  @Input() showControls: boolean = true;
  @Input() showCustomLegend: boolean = true;
  @Input() selectedPeriod: number = 30;
  @Input() showZoom: boolean = true;
  @Input() showTooltip: boolean = true;

  // 输出事件
  @Output() periodChange = new EventEmitter<number>();
  @Output() dataPointClick = new EventEmitter<{ index: number; dataset: any }>();

  // 内部状态
  hiddenDatasets = new Set<number>();
  chartInstance: any = null;

  ngOnInit(): void {
    super.ngOnInit();
    this.updateChartData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['labels'] || changes['datasets']) {
      this.updateChartData();
    }
  }

  /**
   * 更新图表数据
   */
  private updateChartData(): void {
    this.data = {
      labels: this.labels,
      datasets: this.datasets.filter((_, index) => !this.hiddenDatasets.has(index))
    };

    this.updateChartData();
  }

  /**
   * 生成默认图表选项
   */
  protected getDefaultOptions(): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false // 使用自定义图例
        },
        tooltip: {
          enabled: this.showTooltip,
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (context) => {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              label += context.parsed.y.toFixed(4);
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false
          },
          ticks: {
            maxTicksLimit: 8
          }
        },
        y: {
          display: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            callback: (value) => value.toFixed(2)
          }
        }
      },
      elements: {
        point: {
          radius: 0,
          hoverRadius: 6,
          hitRadius: 10
        }
      }
    };
  }

  /**
   * 图表就绪事件
   */
  onChartReady(chart: any): void {
    this.chartInstance = chart;

    // 添加缩放功能
    if (this.showZoom) {
      this.enableZoom();
    }
  }

  /**
   * 启用缩放功能
   */
  private enableZoom(): void {
    // 需要安装 chartjs-plugin-zoom
    if (this.chartInstance && (this.chartInstance.options as any).zoom) {
      (this.chartInstance.options as any).zoom = {
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
        },
        pan: {
          enabled: true,
          mode: 'x',
        }
      };
      this.chartInstance.update();
    }
  }

  /**
   * 周期变更
   */
  onPeriodChange(event: any): void {
    this.selectedPeriod = parseInt(event.value);
    this.periodChange.emit(this.selectedPeriod);
  }

  /**
   * 切换数据集显示
   */
  toggleDataset(index: number): void {
    if (this.hiddenDatasets.has(index)) {
      this.hiddenDatasets.delete(index);
    } else {
      this.hiddenDatasets.add(index);
    }
    this.updateChartData();
  }

  /**
   * 重置缩放
   */
  resetZoom(): void {
    if (this.chartInstance && (this.chartInstance as any).resetZoom) {
      (this.chartInstance as any).resetZoom();
    }
  }

  /**
   * 图表点击事件
   */
  onChartClick(event: any): void {
    if (event.activeElements && event.activeElements.length > 0) {
      const element = event.activeElements[0];
      const datasetIndex = element.datasetIndex;
      const index = element.index;

      // 映射到原始数据集索引
      const originalDatasetIndex = this.getOriginalDatasetIndex(datasetIndex);
      const dataset = this.datasets[originalDatasetIndex];

      this.dataPointClick.emit({
        index,
        dataset
      });
    }
  }

  /**
   * 获取原始数据集索引
   */
  private getOriginalDatasetIndex(visibleIndex: number): number {
    let originalIndex = 0;
    let visibleCount = 0;

    for (let i = 0; i < this.datasets.length; i++) {
      if (!this.hiddenDatasets.has(i)) {
        if (visibleCount === visibleIndex) {
          return i;
        }
        visibleCount++;
      }
    }

    return 0;
  }

  /**
   * 设置数据
   */
  setData(labels: string[], datasets: LineChartDataset[]): void {
    this.labels = labels;
    this.datasets = datasets;
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
}