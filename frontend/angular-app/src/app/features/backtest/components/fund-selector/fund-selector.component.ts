import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';

import { FundAllocation } from '../../models/backtest.model';
import { FundInfo } from '../../../../models/fund.model';

@Component({
  selector: 'app-fund-selector',
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
    MatCheckboxModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatRadioModule
  ],
  templateUrl: './fund-selector.component.html',
  styleUrls: ['./fund-selector.component.scss']
})
export class FundSelectorComponent {
  // 暴露Math对象给模板使用
  Math = Math;
  @Input() availableFunds: FundInfo[] = [];
  @Input() selectedFunds: FundAllocation[] = [];
  @Output() fundsChange = new EventEmitter<FundAllocation[]>();

  // 搜索和筛选
  searchTerm: string = '';
  selectedFundId: string = '';
  currentWeight: number = 100;

  // 显示控制
  showAddFundDialog: boolean = false;

  get filteredFunds(): FundInfo[] {
    if (!this.searchTerm) {
      return this.availableFunds;
    }

    const searchLower = this.searchTerm.toLowerCase();
    return this.availableFunds.filter(fund =>
      fund.code.toLowerCase().includes(searchLower) ||
      fund.name.toLowerCase().includes(searchLower)
    );
  }

  get availableFundsForSelection(): FundInfo[] {
    const selectedFundIds = this.selectedFunds.map(f => f.fundId);
    return this.filteredFunds.filter(fund => !selectedFundIds.includes(fund.id));
  }

  get totalWeight(): number {
    return this.selectedFunds.reduce((sum, fund) => sum + fund.weight, 0);
  }

  get isValidWeights(): boolean {
    return Math.abs(this.totalWeight - 100) < 0.01;
  }

  getFundTrendInfo(fund: FundInfo): { trend: string; change: number; color: string } {
    const change = fund.currentNav - fund.yesterdayNav;
    const changePercent = (change / fund.yesterdayNav) * 100;

    let trend = 'flat';
    let color = '#666';

    if (changePercent > 0) {
      trend = 'up';
      color = '#4caf50';
    } else if (changePercent < 0) {
      trend = 'down';
      color = '#f44336';
    }

    return { trend, change: changePercent, color };
  }

  onSearchChange() {
    // 搜索变化时的处理
  }

  openAddFundDialog() {
    if (this.availableFundsForSelection.length === 0) {
      return;
    }

    this.showAddFundDialog = true;
    this.selectedFundId = '';
    this.currentWeight = Math.max(0, 100 - this.totalWeight);
  }

  addFund() {
    if (!this.selectedFundId || this.currentWeight <= 0) {
      return;
    }

    const fund = this.availableFunds.find(f => f.id === this.selectedFundId);
    if (!fund) {
      return;
    }

    const allocation: FundAllocation = {
      fundId: fund.id,
      fundCode: fund.code,
      fundName: fund.name,
      weight: this.currentWeight
    };

    const updatedFunds = [...this.selectedFunds, allocation];
    this.selectedFunds = updatedFunds;
    this.fundsChange.emit(updatedFunds);

    this.showAddFundDialog = false;
    this.selectedFundId = '';
  }

  removeFund(fundId: string) {
    const updatedFunds = this.selectedFunds.filter(f => f.fundId !== fundId);
    this.selectedFunds = updatedFunds;
    this.fundsChange.emit(updatedFunds);
  }

  updateFundWeight(fundId: string, newWeight: any) {
    // 处理不同类型的事件对象
    const weight = typeof newWeight === 'number' ? newWeight : parseFloat(newWeight);
    if (isNaN(weight) || weight < 0 || weight > 100) {
      return;
    }

    const updatedFunds = this.selectedFunds.map(f =>
      f.fundId === fundId ? { ...f, weight } : f
    );

    this.selectedFunds = updatedFunds;
    this.fundsChange.emit(updatedFunds);
  }

  normalizeWeights() {
    if (this.selectedFunds.length === 0) {
      return;
    }

    const currentTotal = this.totalWeight;
    if (currentTotal === 0) {
      return;
    }

    const updatedFunds = this.selectedFunds.map(f => ({
      ...f,
      weight: (f.weight / currentTotal) * 100
    }));

    this.selectedFunds = updatedFunds;
    this.fundsChange.emit(updatedFunds);
  }

  closeDialog() {
    this.showAddFundDialog = false;
    this.selectedFundId = '';
    this.currentWeight = 100;
  }

  // 辅助方法
  formatPercent(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  formatCurrency(value: number): string {
    return `¥${value.toFixed(4)}`;
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
}