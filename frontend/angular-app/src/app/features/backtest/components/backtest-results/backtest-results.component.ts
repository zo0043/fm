import { Component, Input, Output, EventEmitter } from '@angular/core';
import { BacktestResult, BacktestSummary } from '../../models/backtest.model';

@Component({
  selector: 'app-backtest-results',
  templateUrl: './backtest-results.component.html',
  styleUrls: ['./backtest-results.component.scss']
})
export class BacktestResultsComponent {
  @Input() result: BacktestResult | null = null;
  @Input() isLoading: boolean = false;
  @Output() exportReport = new EventEmitter<void>();

  get summary(): BacktestSummary | null {
    return this.result?.summary || null;
  }

  get performanceData() {
    return this.result?.performance || [];
  }

  get statistics() {
    return this.result?.statistics;
  }

  get drawdowns() {
    return this.result?.drawdowns || [];
  }

  get monthlyReturns() {
    return this.result?.monthlyReturns || [];
  }

  get yearlyReturns() {
    return this.result?.yearlyReturns || [];
  }

  formatPercent(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }

  formatCurrency(value: number): string {
    return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatNumber(value: number, decimals: number = 2): string {
    return value.toFixed(decimals);
  }

  getReturnColor(value: number): string {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  }

  getSharpeRatioColor(ratio: number): string {
    if (ratio >= 2) return 'excellent';
    if (ratio >= 1) return 'good';
    if (ratio >= 0) return 'neutral';
    return 'poor';
  }

  getDrawdownColor(drawdown: number): string {
    if (drawdown < 0.05) return 'low';
    if (drawdown < 0.15) return 'medium';
    return 'high';
  }

  getMaxDrawdownPeriod(): { duration: string; recovery: string } {
    const maxDrawdown = this.drawdowns.reduce((max, dd) =>
      dd.depth > max.depth ? dd : max, this.drawdowns[0]
    );

    if (!maxDrawdown) return { duration: '-', recovery: '-' };

    const duration = this.formatDuration(maxDrawdown.duration);
    const recovery = maxDrawdown.recoveryDate ?
      this.formatDuration(Math.floor((maxDrawdown.recoveryDate.getTime() - maxDrawdown.startDate.getTime()) / (1000 * 60 * 60 * 24))) :
      '未恢复';

    return { duration, recovery };
  }

  private formatDuration(days: number): string {
    if (days < 30) return `${days}天`;
    if (days < 365) return `${Math.floor(days / 30)}个月`;
    return `${(days / 365).toFixed(1)}年`;
  }

  onExport() {
    this.exportReport.emit();
  }
}