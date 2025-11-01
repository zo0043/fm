import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BacktestStrategy } from '../../models/backtest.model';

@Component({
  selector: 'app-strategy-selector',
  templateUrl: './strategy-selector.component.html',
  styleUrls: ['./strategy-selector.component.scss']
})
export class StrategySelectorComponent {
  @Input() selectedStrategy: BacktestStrategy | null = null;
  @Input() strategies: BacktestStrategy[] = [];
  @Output() strategyChange = new EventEmitter<BacktestStrategy>();

  selectedStrategyId: string = '';

  ngOnChanges() {
    if (this.selectedStrategy) {
      this.selectedStrategyId = this.selectedStrategy.id;
    }
  }

  onStrategyChange(strategyId: string) {
    const strategy = this.strategies.find(s => s.id === strategyId);
    if (strategy) {
      this.selectedStrategy = strategy;
      this.strategyChange.emit(strategy);
    }
  }

  getStrategyTypeLabel(type: string): string {
    const typeLabels: { [key: string]: string } = {
      'fixed-amount': '定额投资',
      'fixed-amount-scheduled': '定期定额',
      'smart': '智能定投',
      'value-averaging': '价值平均'
    };
    return typeLabels[type] || type;
  }
}