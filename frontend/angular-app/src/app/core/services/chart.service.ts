import { Injectable } from '@angular/core';
import { FundService, FundHistoryData } from './fund.service';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

// Chart.js相关类型
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  circumference?: number;
  rotation?: number;
}

export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: {
    legend?: {
      display: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
      labels?: {
        color: string;
      };
    };
    tooltip?: {
      enabled: boolean;
      mode?: 'index' | 'point' | 'nearest' | 'x' | 'y';
      intersect?: boolean;
    };
    title?: {
      display: boolean;
      text: string;
      font?: {
        size: number;
        weight: string;
      };
    };
  };
  scales?: {
    x?: {
      display: boolean;
      title?: {
        display: boolean;
        text: string;
      };
      ticks?: {
        color: string;
      };
      grid?: {
        color: string;
      };
    };
    y?: {
      display: boolean;
      title?: {
        display: boolean;
        text: string;
      };
      beginAtZero?: boolean;
      max?: number;
      ticks?: {
        color: string;
      };
      grid?: {
        color: string;
      };
    };
  };
  animation?: {
    duration: number;
  };
  cutout?: string;
}

// 图表类型枚举
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  DOUGHNUT = 'doughnut',
  RADAR = 'radar',
  POLAR_AREA = 'polarArea'
}

// 主题颜色配置
export const CHART_COLORS = {
  primary: '#1976d2',
  secondary: '#dc004e',
  success: '#2e7d32',
  info: '#0288d1',
  warning: '#ed6c02',
  danger: '#d32f2f',
  light: '#f5f5f5',
  dark: '#212121',

  // 渐变色数组
  blue: ['#42a5f5', '#1e88e5', '#1976d2', '#1565c0', '#0d47a1'],
  green: ['#66bb6a', '#43a047', '#2e7d32', '#1b5e20', '#0d47a1'],
  red: ['#ef5350', '#e53935', '#d32f2f', '#c62828', '#b71c1c'],
  orange: ['#ff9800', '#f57c00', '#ef6c00', '#e65100', '#bf360c'],
  purple: ['#ab47bc', '#8e24aa', '#7b1fa2', '#6a1b9a', '#4a148c'],
  teal: ['#26a69a', '#00897b', '#00796b', '#00695c', '#004d40']
};

@Injectable({
  providedIn: 'root'
})
export class ChartService {

  constructor(private fundService: FundService) {}

  /**
   * 生成基金净值走势图数据
   */
  generateNetValueChart(fundId: string, days: number = 30): Observable<{ data: ChartData; options: ChartOptions }> {
    return this.fundService.getFundHistory(fundId).pipe(
      map(history => {
        const recentHistory = history.slice(-days);

        const data: ChartData = {
          labels: recentHistory.map(item => this.formatDate(item.date)),
          datasets: [
            {
              label: '单位净值',
              data: recentHistory.map(item => item.nav),
              borderColor: CHART_COLORS.primary,
              backgroundColor: `${CHART_COLORS.primary}20`,
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 6
            },
            {
              label: '累计净值',
              data: recentHistory.map(item => item.totalNav),
              borderColor: CHART_COLORS.secondary,
              backgroundColor: `${CHART_COLORS.secondary}20`,
              borderWidth: 2,
              fill: false,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 6
            }
          ]
        };

        const options: ChartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false
            },
            title: {
              display: true,
              text: '基金净值走势',
              font: {
                size: 16,
                weight: 'bold'
              }
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: '日期'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: '净值'
              },
              beginAtZero: false
            }
          },
          animation: {
            duration: 1000
          }
        };

        return { data, options };
      })
    );
  }

  /**
   * 生成收益率对比图数据
   */
  generateReturnComparisonChart(funds: any[]): Observable<{ data: ChartData; options: ChartOptions }> {
    return of().pipe(
      map(() => {
        const labels = funds.map(fund => fund.name);
        const dailyReturns = funds.map(fund => fund.dailyChange * 100);
        const monthlyReturns = funds.map(fund => fund.monthlyChange * 100);
        const yearlyReturns = funds.map(fund => fund.yearlyChange * 100);

        const data: ChartData = {
          labels,
          datasets: [
            {
              label: '日收益率(%)',
              data: dailyReturns,
              backgroundColor: CHART_COLORS.blue,
              borderWidth: 1
            },
            {
              label: '月收益率(%)',
              data: monthlyReturns,
              backgroundColor: CHART_COLORS.green,
              borderWidth: 1
            },
            {
              label: '年收益率(%)',
              data: yearlyReturns,
              backgroundColor: CHART_COLORS.orange,
              borderWidth: 1
            }
          ]
        };

        const options: ChartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false
            },
            title: {
              display: true,
              text: '基金收益率对比',
              font: {
                size: 16,
                weight: 'bold'
              }
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: '基金名称'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: '收益率(%)'
              }
            }
          },
          animation: {
            duration: 1000
          }
        };

        return { data, options };
      })
    );
  }

  /**
   * 生成资产分布饼图数据
   */
  generateAssetDistributionChart(allocations: { name: string; value: number; percentage: number }[]): Observable<{ data: ChartData; options: ChartOptions }> {
    return of().pipe(
      map(() => {
        const data: ChartData = {
          labels: allocations.map(item => item.name),
          datasets: [{
            label: '资产分布',
            data: allocations.map(item => item.value),
            backgroundColor: [
              CHART_COLORS.primary,
              CHART_COLORS.secondary,
              CHART_COLORS.success,
              CHART_COLORS.warning,
              CHART_COLORS.danger,
              CHART_COLORS.info,
              CHART_COLORS.blue[0],
              CHART_COLORS.green[0],
              CHART_COLORS.red[0],
              CHART_COLORS.orange[0]
            ],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        };

        const options: ChartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'right'
            },
            tooltip: {
              enabled: true,
              mode: 'point'
            },
            title: {
              display: true,
              text: '资产分布',
              font: {
                size: 16,
                weight: 'bold'
              }
            }
          },
          animation: {
            duration: 1000
          }
        };

        return { data, options };
      })
    );
  }

  /**
   * 生成风险指标雷达图数据
   */
  generateRiskRadarChart(fund: any): Observable<{ data: ChartData; options: ChartOptions }> {
    return of().pipe(
      map(() => {
        const metrics = [
          { label: '收益率', value: Math.abs(fund.yearlyChange) * 20 },
          { label: '波动率', value: 15 + Math.random() * 10 },
          { label: '夏普比率', value: 1 + Math.random() * 2 },
          { label: '最大回撤', value: 5 + Math.random() * 15 },
          { label: '信息比率', value: 0.5 + Math.random() * 1.5 },
          { label: '跟踪误差', value: 2 + Math.random() * 6 }
        ];

        const data: ChartData = {
          labels: metrics.map(m => m.label),
          datasets: [{
            label: fund.name,
            data: metrics.map(m => m.value),
            borderColor: CHART_COLORS.primary,
            backgroundColor: `${CHART_COLORS.primary}30`,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        };

        const options: ChartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: '风险指标分析',
              font: {
                size: 16,
                weight: 'bold'
              }
            }
          },
          scales: {
            y: {
              display: true,
              beginAtZero: true,
              max: 20
            }
          },
          animation: {
            duration: 1000
          }
        };

        return { data, options };
      })
    );
  }

  /**
   * 生成仪表盘图数据（用于显示单一指标）
   */
  generateGaugeChart(value: number, max: number = 100, label: string = '指标'): Observable<{ data: ChartData; options: ChartOptions }> {
    return of().pipe(
      map(() => {
        const percentage = (value / max) * 100;
        const color = this.getGaugeColor(percentage);

        const data: ChartData = {
          labels: [label],
          datasets: [{
            label: label,
            data: [percentage, 100 - percentage],
            backgroundColor: [color, '#e0e0e0'],
            borderWidth: 0,
            circumference: 180,
            rotation: 270
          }]
        };

        const options: ChartOptions = {
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
          animation: {
            duration: 1000
          }
        };

        return { data, options };
      })
    );
  }

  /**
   * 根据百分比获取仪表盘颜色
   */
  private getGaugeColor(percentage: number): string {
    if (percentage < 30) return CHART_COLORS.danger;
    if (percentage < 60) return CHART_COLORS.warning;
    if (percentage < 80) return CHART_COLORS.info;
    return CHART_COLORS.success;
  }

  /**
   * 格式化日期显示
   */
  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  /**
   * 获取主题配置
   */
  getThemeOptions(isDark: boolean = false): ChartOptions {
    const textColor = isDark ? '#ffffff' : '#333333';
    const gridColor = isDark ? '#444444' : '#e0e0e0';

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: textColor
          }
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          display: true,
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor
          }
        },
        y: {
          display: true,
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor
          }
        }
      }
    };
  }
}