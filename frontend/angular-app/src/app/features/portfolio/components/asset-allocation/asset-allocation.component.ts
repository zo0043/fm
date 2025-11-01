import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ChartConfiguration, ChartType } from 'chart.js';
import { AssetAllocation, AssetAllocationSummary } from '../../models/portfolio.model';

@Component({
  selector: 'app-asset-allocation',
  templateUrl: './asset-allocation.component.html',
  styleUrls: ['./asset-allocation.component.scss']
})
export class AssetAllocationComponent {
  @Input() allocation: AssetAllocation[] = [];
  @Input() summary: AssetAllocationSummary[] = [];
  @Input() isLoading: boolean = false;
  @Output() rebalance = new EventEmitter<AssetAllocation[]>();

  // 图表配置
  pieChartConfig: ChartConfiguration<'doughnut'> | null = null;
  barChartConfig: ChartConfiguration<'bar'> | null = null;

  // 显示控制
  showDetails: boolean = false;
  selectedView: 'pie' | 'bar' | 'table' = 'pie';

  ngOnChanges() {
    this.updateCharts();
  }

  private updateCharts() {
    this.updatePieChart();
    this.updateBarChart();
  }

  private updatePieChart() {
    if (!this.allocation.length) {
      this.pieChartConfig = null;
      return;
    }

    const labels = this.allocation.map(item => `${item.fundName} (${item.fundCode})`);
    const data = this.allocation.map(item => item.weight);
    const backgroundColors = this.generateColors(data.length);

    this.pieChartConfig = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: backgroundColors,
            borderColor: '#ffffff',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'right'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                return `${label}: ${value.toFixed(2)}%`;
              }
            }
          }
        }
      }
    };
  }

  private updateBarChart() {
    if (!this.allocation.length) {
      this.barChartConfig = null;
      return;
    }

    const labels = this.allocation.map(item => item.fundCode);
    const returns = this.allocation.map(item => item.returnRate * 100);
    const weights = this.allocation.map(item => item.weight);

    this.barChartConfig = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '收益率 (%)',
            data: returns,
            backgroundColor: returns.map(value => value >= 0 ? '#4caf50' : '#f44336'),
            borderColor: returns.map(value => value >= 0 ? '#4caf50' : '#f44336'),
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: '权重 (%)',
            data: weights,
            backgroundColor: '#3f51b5',
            borderColor: '#3f51b5',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
              callback: (value) => `${value}%`
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${value.toFixed(2)}%`;
              }
            }
          }
        }
      }
    };
  }

  private generateColors(count: number): string[] {
    const colors = [
      '#3f51b5', '#e91e63', '#ff9800', '#4caf50', '#00bcd4',
      '#9c27b0', '#ff5722', '#795548', '#607d8b', '#8bc34a'
    ];

    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  }

  // 格式化方法
  formatCurrency(value: number): string {
    return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
  }

  formatLargeNumber(value: number): string {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(2)}万`;
    }
    return value.toFixed(2);
  }

  getFundTypeLabel(type: string): string {
    const typeLabels: { [key: string]: string } = {
      'stock': '股票型',
      'bond': '债券型',
      'hybrid': '混合型',
      'index': '指数型',
      'etf': 'ETF',
      'qdii': 'QDII'
    };
    return typeLabels[type] || type;
  }

  getReturnColor(value: number): string {
    return value >= 0 ? '#4caf50' : '#f44336';
  }

  getReturnClass(value: number): string {
    return value >= 0 ? 'positive' : 'negative';
  }

  // 计算汇总数据
  get totalInvested(): number {
    return this.allocation.reduce((sum, item) => sum + item.investedAmount, 0);
  }

  get totalValue(): number {
    return this.allocation.reduce((sum, item) => sum + item.currentValue, 0);
  }

  get totalReturn(): number {
    return this.allocation.reduce((sum, item) => sum + item.return, 0);
  }

  get totalReturnRate(): number {
    if (this.totalInvested === 0) return 0;
    return this.totalReturn / this.totalInvested;
  }

  get bestPerformer(): AssetAllocation | null {
    if (!this.allocation.length) return null;
    return this.allocation.reduce((best, current) =>
      current.returnRate > best.returnRate ? current : best
    );
  }

  get worstPerformer(): AssetAllocation | null {
    if (!this.allocation.length) return null;
    return this.allocation.reduce((worst, current) =>
      current.returnRate < worst.returnRate ? current : worst
    );
  }

  // 交互方法
  onViewChange(view: 'pie' | 'bar' | 'table') {
    this.selectedView = view;
  }

  onToggleDetails() {
    this.showDetails = !this.showDetails;
  }

  onRebalance() {
    if (this.allocation.length > 0) {
      this.rebalance.emit(this.allocation);
    }
  }

  // 获取类型汇总
  getTypeSummary(): { [type: string]: AssetAllocationSummary } {
    const summary: { [type: string]: AssetAllocationSummary } = {};

    this.allocation.forEach(item => {
      if (!summary[item.fundType]) {
        summary[item.fundType] = {
          type: item.fundType,
          totalValue: 0,
          weight: 0,
          return: 0,
          returnRate: 0,
          fundCount: 0,
          riskLevel: this.getRiskLevelByType(item.fundType),
          recommendedWeight: this.getRecommendedWeightByType(item.fundType)
        };
      }

      const typeData = summary[item.fundType];
      typeData.totalValue += item.currentValue;
      typeData.return += item.return;
      typeData.fundCount += 1;
    });

    // 计算权重和收益率
    const totalValue = this.totalValue;
    Object.keys(summary).forEach(type => {
      const typeData = summary[type];
      typeData.weight = (typeData.totalValue / totalValue) * 100;
      typeData.returnRate = typeData.return / (typeData.totalValue - typeData.return);
    });

    return summary;
  }

  private getRiskLevelByType(type: string): string {
    const riskLevels: { [key: string]: string } = {
      'stock': 'high',
      'bond': 'low',
      'hybrid': 'medium',
      'index': 'medium',
      'etf': 'medium',
      'qdii': 'high'
    };
    return riskLevels[type] || 'medium';
  }

  private getRecommendedWeightByType(type: string): number {
    const recommendedWeights: { [key: string]: number } = {
      'stock': 60,
      'bond': 20,
      'hybrid': 15,
      'index': 5,
      'etf': 0,
      'qdii': 0
    };
    return recommendedWeights[type] || 0;
  }
}