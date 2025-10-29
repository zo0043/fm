import { Component, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { KLineDataPoint, FundInfo } from '../../../../models/fund.model';

// 使用方法：在父组件中导入并使用
// <app-k-line-chart [fundData]="fundData" [height]="400"></app-k-line-chart>

@Component({
  selector: 'app-k-line-chart',
  standalone: true,
  imports: [
    CommonModule,
    BaseChartDirective,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    DecimalPipe
  ],
  templateUrl: './k-line-chart.component.html',
  styleUrls: ['./k-line-chart.component.scss']
})
export class KLineChartComponent implements OnChanges, OnDestroy {
  @Input() fundData: KLineDataPoint[] = [];
  @Input() fundInfo: FundInfo | null = null;
  @Input() height: number = 400;
  @Input() showVolume: boolean = false;
  @Input() showMA: boolean = true;

  // Chart.js 配置
  public lineChartData: ChartConfiguration['data'] = {
    datasets: []
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            size: 12
          },
          color: '#333'
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#ddd',
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const point = this.fundData[context.dataIndex];
            if (!point) return '';

            return [
              `开盘: ${point.open.toFixed(4)}`,
              `最高: ${point.high.toFixed(4)}`,
              `最低: ${point.low.toFixed(4)}`,
              `收盘: ${point.close.toFixed(4)}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MM-dd'
          }
        },
        title: {
          display: true,
          text: '日期'
        },
        grid: {
          display: true,
          color: 'rgba(0,0,0,0.1)'
        }
      },
      y: {
        title: {
          display: true,
          text: '净值'
        },
        position: 'right',
        grid: {
          display: true,
          color: 'rgba(0,0,0,0.1)'
        }
      }
    }
  };

  public lineChartType: ChartType = 'line';

  private chart: Chart | null = null;

  constructor() {
    Chart.register(...registerables);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fundData'] && this.fundData?.length > 0) {
      this.updateChartData();
    }
  }

  private updateChartData(): void {
    if (!this.fundData || this.fundData.length === 0) return;

    // 准备K线图数据 - 使用散点图模拟K线
    const kLineData = this.prepareKLineData();
    const ma5Data = this.calculateMA(5);
    const ma10Data = this.calculateMA(10);

    this.lineChartData = {
      datasets: [
        {
          label: '净值',
          data: kLineData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 2,
          pointRadius: 1,
          pointHoverRadius: 4,
          tension: 0.1
        },
        ...(this.showMA && ma5Data ? [{
          label: 'MA5',
          data: ma5Data,
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.1)',
          borderWidth: 1,
          pointRadius: 0,
          pointHoverRadius: 3,
          tension: 0.1
        }] : []),
        ...(this.showMA && ma10Data ? [{
          label: 'MA10',
          data: ma10Data,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderWidth: 1,
          pointRadius: 0,
          pointHoverRadius: 3,
          tension: 0.1
        }] : [])
      ]
    };
  }

  private prepareKLineData(): any[] {
    return this.fundData.map(point => ({
      x: point.date,
      y: point.close
    }));
  }

  private calculateMA(period: number): any[] | null {
    if (this.fundData.length < period) return null;

    const maData: any[] = [];

    for (let i = period - 1; i < this.fundData.length; i++) {
      const sum = this.fundData
        .slice(i - period + 1, i + 1)
        .reduce((acc, point) => acc + point.close, 0);

      maData.push({
        x: this.fundData[i].date,
        y: sum / period
      });
    }

    return maData;
  }

  onChartReady($event: any): void {
    this.chart = $event as Chart;
    this.updateChartOptions();
  }

  private updateChartOptions(): void {
    if (!this.chart) return;

    // 更新图表高度
    if (this.chart.canvas) {
      this.chart.canvas.style.height = `${this.height}px`;
    }

    this.chart.update();
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  // 公共方法：刷新图表
  public refreshChart(): void {
    if (this.chart) {
      this.chart.update();
    }
  }

  // 公共方法：导出图表数据
  public exportData(): KLineDataPoint[] {
    return [...this.fundData];
  }

  // 公共方法：获取图表图片
  public getChartImage(): string | null {
    return this.chart ? this.chart.toBase64Image() : null;
  }

  // 辅助方法：获取最高净值
  getMaxNav(): number {
    if (!this.fundData.length) return 0;
    return Math.max(...this.fundData.map(point => point.high));
  }

  // 辅助方法：获取最低净值
  getMinNav(): number {
    if (!this.fundData.length) return 0;
    return Math.min(...this.fundData.map(point => point.low));
  }

  // 辅助方法：获取平均净值
  getAvgNav(): number {
    if (!this.fundData.length) return 0;
    const sum = this.fundData.reduce((acc, point) => acc + point.close, 0);
    return sum / this.fundData.length;
  }
}