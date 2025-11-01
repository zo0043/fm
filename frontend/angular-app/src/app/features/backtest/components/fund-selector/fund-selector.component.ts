import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FundAllocation } from '../../models/backtest.model';
import { FundInfo } from '../../../models/fund.model';

@Component({
  selector: 'app-fund-selector',
  templateUrl: './fund-selector.component.html',
  styleUrls: ['./fund-selector.component.scss']
})
export class FundSelectorComponent {
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

  updateFundWeight(fundId: string, newWeight: number) {
    if (newWeight < 0 || newWeight > 100) {
      return;
    }

    const updatedFunds = this.selectedFunds.map(f =>
      f.fundId === fundId ? { ...f, weight: newWeight } : f
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