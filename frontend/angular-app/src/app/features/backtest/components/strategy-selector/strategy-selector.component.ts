import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatRadioModule } from '@angular/material/radio';

import { BacktestStrategy } from '../../models/backtest.model';

@Component({
  selector: 'app-strategy-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatTooltipModule,
    MatExpansionModule,
    MatChipsModule,
    MatRadioModule
  ],
  templateUrl: './strategy-selector.component.html',
  styleUrls: ['./strategy-selector.component.scss']
})
export class StrategySelectorComponent implements OnChanges {
  @Input() selectedStrategy: BacktestStrategy | null = null;
  @Input() strategies: BacktestStrategy[] = [];
  @Output() strategyChange = new EventEmitter<BacktestStrategy>();

  selectedStrategyId: string = '';

  ngOnChanges() {
    if (this.selectedStrategy) {
      this.selectedStrategyId = this.selectedStrategy.id;
    }
  }

  onStrategyChange(event: any) {
    // 处理不同类型的事件对象
    const strategyId = event.target?.value || event;
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