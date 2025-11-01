import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ChartConfiguration, ChartType } from 'chart.js';
import { PerformanceData, NavHistory } from '../../models/fund-detail.model';

@Component({
  selector: 'app-performance-chart',
  templateUrl: './performance-chart.component.html',
  styleUrls: ['./performance-chart.component.scss']
})
export class PerformanceChartComponent implements OnChanges {
  @Input() performance: PerformanceData | null = null;
  @Input() navHistory: NavHistory[] = [];
  @Input() isLoading: boolean = false;

  // 图表配置
  public navChartConfig: ChartConfiguration<'line'> | null = null;
  public returnChartConfig: ChartConfiguration<'bar'> | null = null;
  public selectedPeriod: string = '1Y'; // 默认显示1年

  // 时间周期选项
  periodOptions = [
    { label: '1个月', value: '1M' },
    { label: '3个月', value: '3M' },
    { label: '6个月', value: '6M' },
    { label: '1年', value: '1Y' },
    { label: '3年', value: '3Y' },
    { label: '全部', value: 'ALL' }
  ];

  ngOnChanges(changes: SimpleChanges) {
    if (changes.navHistory || changes.performance) {
      this.updateCharts();
    }
  }

  onPeriodChange(period: string) {
    this.selectedPeriod = period;
    this.updateCharts();
  }

  private updateCharts() {
    this.updateNavChart();
    this.updateReturnChart();
  }

  private updateNavChart() {
    if (!this.navHistory || this.navHistory.length === 0) {
      this.navChartConfig = null;
      return;
    }

    const filteredData = this.filterDataByPeriod(this.navHistory, this.selectedPeriod);
    const labels = filteredData.map(item => this.formatChartDate(item.date));
    const navData = filteredData.map(item => item.nav);
    const accumulatedData = filteredData.map(item => item.accumulatedNav);

    this.navChartConfig = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '单位净值',
            data: navData,
            borderColor: '#3f51b5',
            backgroundColor: 'rgba(63, 81, 181, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#3f51b5'
          },
          {
            label: '累计净值',
            data: accumulatedData,
            borderColor: '#ff9800',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#ff9800'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ¥${value.toFixed(4)}`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: false
            }
          },
          y: {
            display: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: (value) => `¥${Number(value).toFixed(2)}`
            }
          }
        }
      }
    };
  }

  private updateReturnChart() {
    if (!this.performance) {
      this.returnChartConfig = null;
      return;
    }

    const returns = this.performance.recentReturns;
    const labels = ['近1日', '近1周', '近1月', '近3月', '近6月', '近1年'];
    const data = [
      returns.oneDay * 100,
      returns.oneWeek * 100,
      returns.oneMonth * 100,
      returns.threeMonths * 100,
      returns.sixMonths * 100,
      returns.oneYear * 100
    ];

    const backgroundColors = data.map(value => value >= 0 ? '#4caf50' : '#f44336');

    this.returnChartConfig = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '收益率',
            data,
            backgroundColor: backgroundColors,
            borderColor: backgroundColors,
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                return `收益率: ${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: false
            }
          },
          y: {
            display: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
            }
          }
        }
      }
    };
  }

  private filterDataByPeriod(data: NavHistory[], period: string): NavHistory[] {
    if (period === 'ALL') {
      return data;
    }

    const now = new Date();
    let cutoffDate = new Date();

    switch (period) {
      case '1M':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case '3Y':
        cutoffDate.setFullYear(now.getFullYear() - 3);
        break;
      default:
        cutoffDate.setFullYear(now.getFullYear() - 1);
    }

    return data.filter(item => new Date(item.date) >= cutoffDate);
  }

  private formatChartDate(date: Date): string {
    // 根据选择的周期调整日期格式
    const d = new Date(date);

    switch (this.selectedPeriod) {
      case '1M':
      case '3M':
        return `${d.getMonth() + 1}/${d.getDate()}`;
      case '6M':
        return `${d.getMonth() + 1}月`;
      default:
        return `${d.getFullYear()}/${d.getMonth() + 1}`;
    }
  }

  // 辅助方法
  formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  getReturnColor(value: number): string {
    return value >= 0 ? '#4caf50' : '#f44336';
  }

  getPerformanceLevel(rating: number): string {
    if (rating >= 4.5) return 'excellent';
    if (rating >= 3.5) return 'good';
    if (rating >= 2.5) return 'average';
    return 'poor';
  }

  getBenchmarkComparison() {
    if (!this.performance?.benchmarkComparison) return null;
    return this.performance.benchmarkComparison;
  }
}