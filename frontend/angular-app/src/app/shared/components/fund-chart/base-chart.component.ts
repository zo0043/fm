import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, ChartOptions, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

// 注册Chart.js所有组件
Chart.register(...registerables);

@Component({
  selector: 'app-base-chart',
  template: `
    <div class="chart-container" [style.height]="height">
      <canvas
        baseChart
        [type]="type"
        [data]="data"
        [options]="options"
        (chartClick)="onChartClick($event)"
        (chartHover)="onChartHover($event)">
      </canvas>
    </div>
  `,
  styles: [`
    .chart-container {
      position: relative;
      width: 100%;
    }
  `]
})
export class BaseChartComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chartDirective?: BaseChartDirective;
  @ViewChild('chartCanvas', { static: false }) chartCanvas?: ElementRef;

  // 基础配置
  @Input() type: ChartType = 'line';
  @Input() height: string = '400px';
  @Input() loading: boolean = false;
  @Input() error: string | null = null;

  // 图表数据和配置
  @Input() data: any = { labels: [], datasets: [] };
  @Input() options: ChartOptions = {};
  @Input() plugins: any[] = [];

  // 事件输出
  @Output() chartClick = new EventEmitter<any>();
  @Output() chartHover = new EventEmitter<any>();
  @Output() chartReady = new EventEmitter<Chart>();

  // 图表实例
  private chartInstance: Chart | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initializeChart();
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  /**
   * 初始化图表
   */
  private initializeChart(): void {
    // 合并默认选项
    this.options = this.mergeDefaultOptions(this.options);

    // 等待视图更新后初始化图表
    setTimeout(() => {
      if (this.chartDirective && this.chartDirective.chart) {
        this.chartInstance = this.chartDirective.chart;
        this.setupChart();
        this.chartReady.emit(this.chartInstance);
      }
    }, 100);
  }

  /**
   * 合并默认图表选项
   */
  private mergeDefaultOptions(customOptions: ChartOptions): ChartOptions {
    const defaultOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#ffffff',
          borderWidth: 1,
          cornerRadius: 4,
          padding: 10
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    };

    return this.deepMerge(defaultOptions, customOptions);
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * 设置图表
   */
  private setupChart(): void {
    if (!this.chartInstance) return;

    // 添加自定义插件
    this.plugins.forEach(plugin => {
      this.chartInstance?.plugins?.push(plugin);
    });

    // 设置样式
    this.applyStyles();

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 应用样式
   */
  private applyStyles(): void {
    if (!this.chartInstance) return;

    const canvas = this.chartInstance.canvas;
    const ctx = this.chartInstance.ctx;

    // 设置字体
    ctx.font = '12px Arial, sans-serif';

    // 设置抗锯齿
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.chartInstance) return;

    // 点击事件
    this.chartInstance.options.onClick = (event, activeElements) => {
      this.chartClick.emit({ event, activeElements });
    };

    // 悬停事件
    this.chartInstance.options.onHover = (event, activeElements) => {
      this.chartHover.emit({ event, activeElements });
    };
  }

  /**
   * 更新图表数据
   */
  public updateChart(data?: any, options?: ChartOptions): void {
    if (!this.chartInstance) return;

    if (data) {
      this.data = data;
      this.chartInstance.data = data;
    }

    if (options) {
      this.options = this.mergeDefaultOptions(options);
      this.chartInstance.options = this.options;
    }

    this.chartInstance.update('active');
  }

  /**
   * 更新图表配置
   */
  public updateOptions(options: ChartOptions): void {
    if (!this.chartInstance) return;

    this.options = this.mergeDefaultOptions(options);
    this.chartInstance.options = this.options;
    this.chartInstance.update();
  }

  /**
   * 重置图表缩放
   */
  public resetZoom(): void {
    if (!this.chartInstance) return;

    // 如果有zoom插件
    if ((this.chartInstance as any).resetZoom) {
      (this.chartInstance as any).resetZoom();
    } else {
      this.chartInstance.update();
    }
  }

  /**
   * 导出图表为图片
   */
  public exportChart(format: 'png' | 'jpeg' = 'png'): string {
    if (!this.chartInstance) return '';

    const canvas = this.chartInstance.canvas;
    return canvas.toDataURL(`image/${format}`);
  }

  /**
   * 获取图表数据URL
   */
  public getChartImageURL(type: 'png' | 'jpeg' = 'png', quality: number = 1.0): string {
    if (!this.chartInstance) return '';

    return this.chartInstance.toBase64Image(type, quality);
  }

  /**
   * 添加数据点
   */
  public addDataPoint(label: string, data: number[], datasetIndex?: number): void {
    if (!this.chartInstance) return;

    if (datasetIndex !== undefined) {
      // 添加到指定数据集
      this.chartInstance.data.datasets[datasetIndex].data.push(data[0]);
    } else {
      // 添加到所有数据集
      this.chartInstance.data.datasets.forEach((dataset, index) => {
        dataset.data.push(data[index] || 0);
      });
    }

    if (label) {
      this.chartInstance.data.labels.push(label);
    }

    this.chartInstance.update();
  }

  /**
   * 移除数据点
   */
  public removeDataPoint(index: number): void {
    if (!this.chartInstance) return;

    this.chartInstance.data.labels.splice(index, 1);
    this.chartInstance.data.datasets.forEach(dataset => {
      dataset.data.splice(index, 1);
    });

    this.chartInstance.update();
  }

  /**
   * 切换数据集显示
   */
  public toggleDataset(datasetIndex: number): void {
    if (!this.chartInstance) return;

    const meta = this.chartInstance.getDatasetMeta(datasetIndex);
    meta.hidden = !meta.hidden;
    this.chartInstance.update();
  }

  /**
   * 设置主题
   */
  public setTheme(isDark: boolean): void {
    if (!this.chartInstance) return;

    const textColor = isDark ? '#ffffff' : '#333333';
    const gridColor = isDark ? '#444444' : '#e0e0e0';

    // 更新文字颜色
    if (this.chartInstance.options.plugins?.legend?.labels) {
      (this.chartInstance.options.plugins.legend.labels as any).color = textColor;
    }

    // 更新网格颜色
    if (this.chartInstance.options.scales?.x) {
      (this.chartInstance.options.scales.x as any).ticks = { color: textColor };
      (this.chartInstance.options.scales.x as any).grid = { color: gridColor };
    }

    if (this.chartInstance.options.scales?.y) {
      (this.chartInstance.options.scales.y as any).ticks = { color: textColor };
      (this.chartInstance.options.scales.y as any).grid = { color: gridColor };
    }

    this.chartInstance.update();
  }

  /**
   * 销毁图表
   */
  private destroyChart(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
  }

  // 事件处理方法
  onChartClick(event: any): void {
    this.chartClick.emit(event);
  }

  onChartHover(event: any): void {
    this.chartHover.emit(event);
  }

  // Getter方法
  get chart(): Chart | null {
    return this.chartInstance;
  }

  get isChartReady(): boolean {
    return this.chartInstance !== null;
  }
}