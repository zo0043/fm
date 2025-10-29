import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';

// 导入数据模型
import { FundInfo } from '../../../models/fund.model';

// 使用方法：在组件中使用
// <app-filter-panel
//   [funds]="funds"
//   (filterChange)="onFilterChange($event)"
//   (resetFilters)="onResetFilters($event)">
// </app-filter-panel>

export interface FilterOption {
  key: string;
  label: string;
  value: any;
  type: 'text' | 'select' | 'range' | 'date' | 'checkbox';
  options?: any[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface FilterGroup {
  title: string;
  key: string;
  filters: FilterOption[];
  expanded?: boolean;
}

export interface FilterState {
  search: string;
  fundType: string[];
  priceRange: { min: number; max: number };
  riskLevel: string[];
  performanceRange: { min: number; max: number };
  dateRange: { start: Date; end: Date };
  showInactive: boolean;
}

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatCheckboxModule,
    MatSliderModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipModule,
    MatTooltipModule,
    MatDividerModule,
    MatExpansionModule
  ],
  templateUrl: './filter-panel.component.html',
  styleUrls: ['./filter-panel.component.scss']
})
export class FilterPanelComponent implements OnInit, OnChanges {
  @Input() funds: FundInfo[] = [];
  @Input() loading = false;
  @Input() compact = false;

  @Output() filterChange = new EventEmitter<FilterState>();
  @Output() resetFilters = new EventEmitter<void>();

  // 筛选状态
  filterState: FilterState = {
    search: '',
    fundType: [],
    priceRange: { min: 0, max: 1000 },
    riskLevel: [],
    performanceRange: { min: -20, max: 50 },
    dateRange: { start: new Date(), end: new Date() },
    showInactive: true
  };

  // 筛选组定义
  filterGroups: FilterGroup[] = [
    {
      title: '基础筛选',
      key: 'basic',
      expanded: true,
      filters: [
        {
          key: 'search',
          label: '搜索',
          type: 'text',
          value: ''
        },
        {
          key: 'fundType',
          label: '基金类型',
          type: 'checkbox',
          options: [
            { value: 'stock', label: '股票型' },
            { value: 'bond', label: '债券型' },
            { value: 'hybrid', label: '混合型' },
            { value: 'index', label: '指数型' },
            { value: 'etf', label: 'ETF' },
            { value: 'qdii', label: 'QDII' }
          ]
        }
      ]
    },
    {
      title: '高级筛选',
      key: 'advanced',
      expanded: false,
      filters: [
        {
          key: 'priceRange',
          label: '净值范围',
          type: 'range',
          min: 0,
          max: 10,
          step: 0.01,
          unit: '元'
        },
        {
          key: 'riskLevel',
          label: '风险等级',
          type: 'checkbox',
          options: [
            { value: 'low', label: '低风险' },
            { value: 'medium', label: 'risk_level_medium' },
            { value: 'high', label: 'high' }
          ]
        },
        {
          key: 'performanceRange',
          label: '收益范围',
          type: 'range',
          min: -50,
          max: 100,
          step: 1,
          unit: '%'
        }
      ]
    },
    {
      title: '时间筛选',
      key: 'time',
      expanded: false,
      filters: [
        {
          key: 'dateRange',
          label: '日期范围',
          type: 'date',
          value: []
        },
        {
          key: 'showInactive',
          label: '仅显示活跃基金',
          type: 'checkbox',
          value: true
        }
      ]
    }
  ];

  // 统计信息
  availableTypes: string[] = [];
  availableRiskLevels: string[] = [];
  priceRange: { min: 0, max: 1000 } = { min: 0, max: 1000 };
  performanceRange: { min: -50, max: 50 } = { min: -50, max: 50 };

  constructor() {
    this.updateAvailableOptions();
  }

  ngOnInit(): void {
    this.resetFilters();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['funds']) {
      this.updateAvailableOptions();
    }
  }

  // 更新可用选项
  private updateAvailableOptions(): void {
    const types = [...new Set(this.funds.map(f => f.type))];
    this.availableTypes = types;

    const riskLevels = [...new Set(this.funds.map(f => this.getRiskLevel(f))];
    this.availableRiskLevels = riskLevels;

    // 自动计算价格范围
    const prices = this.funds.map(f => f.currentNav);
    this.priceRange = {
      min: Math.floor(Math.min(...prices) * 100) / 100,
      max: Math.ceil(Math.max(...prices) * 110) / 100
    };

    // 自动计算收益范围
    const performances = this.funds.map(f => this.calculatePerformance(f));
    this.performanceRange = {
      min: Math.floor(Math.min(...performances) * 1.2),
      max: Math.ceil(Math.max(...performances) * 1.1)
    };
  }

  // 计算风险等级
  private getRiskLevel(fund: FundInfo): string {
    const volatility = this.calculateVolatility(fund);
    if (volatility < 0.1) return 'low';
    if (volatility < 0.2) return 'medium';
    return 'high';
  }

  // 计算收益
  private calculatePerformance(fund: FundInfo): number {
    return ((fund.currentNav - fund.yesterdayNav) / fund.yesterdayNav) * 100;
  }

  // 计算波动率
  private calculateVolatility(fund: FundInfo): number {
    // 简化计算：基于涨跌幅的标准差
    const changes = [
      ((fund.currentNav - fund.yesterdayNav) / fund.yesterdayNav) * 100,
      ((fund.weekNav - fund.currentNav) / fund.currentNav) * 100,
      ((fund.monthNav - fund.currentNav) / fund.currentNav) * 100
    ];
    const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
    const variance = changes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / changes.length;
    return Math.sqrt(variance);
  }

  // 应用筛选
  applyFilters(): void {
    let filtered = [...this.funds];

    // 搜索筛选
    if (this.filterState.search) {
      const searchTerm = this.filterState.search.toLowerCase();
      filtered = filtered.filter(fund =>
        fund.name.toLowerCase().includes(searchTerm) ||
        fund.code.toLowerCase().includes(searchTerm)
      );
    }

    // 基金类型筛选
    if (this.filterState.fundType.length > 0) {
      filtered = filtered.filter(fund =>
        this.filterState.fundType.includes(fund.type)
      );
    }

    // 价格范围筛选
    if (this.filterState.priceRange.min > 0 || this.filterState.priceRange.max < 1000) {
      filtered = filtered.filter(fund =>
        fund.currentNav >= this.filterState.priceRange.min &&
        fund.currentNav <= this.filterState.priceRange.max
      );
    }

    // 风险等级筛选
    if (this.filterState.riskLevel.length > 0) {
      filtered = filtered.filter(fund =>
        this.filterState.riskLevel.includes(this.getRiskLevel(fund))
      );
    }

    // 收益范围筛选
    if (this.filterState.performanceRange.min > -50 || this.filterState.performanceRange.max < 50) {
      const perf = this.filterState.performanceRange;
      filtered = filtered.filter(fund => {
        const perf = this.calculatePerformance(fund);
        return perf >= perf.min && perf <= perf.max;
      });
    }

    // 日期范围筛选
    if (this.filterState.dateRange.start && this.filterState.dateRange.end) {
      filtered = filtered.filter(fund =>
        new Date(fund.lastUpdate) >= this.filterState.dateRange.start &&
        new Date(fund.lastUpdate) <= this.filterState.dateRange.end
      );
    }

    // 仅显示活跃基金
    if (this.filterState.showInactive) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(fund =>
        new Date(fund.lastUpdate) >= thirtyDaysAgo
      );
    }

    this.filterChange.emit(this.filterState);
  }

  // 重置筛选
  resetFilters(): void {
    this.filterState = {
      search: '',
      fundType: [],
      priceRange: { min: 0, max: 1000 },
      riskLevel: [],
      performanceRange: { min: -20, max: 50 },
      dateRange: { start: new Date(), end: new Date() },
      showInactive: true
    };
    this.resetFilters.emit();
  }

  // 快速筛选
  quickFilter(type: string): void {
    switch (type) {
      case 'low-risk':
        this.filterState.riskLevel = ['low'];
        break;
      case 'high-performance':
        this.filterState.performanceRange = { min: 10, max: 50 };
        break;
      case 'large-value':
        this.filterState.priceRange = { min: 2.0, max: 1000 };
        break;
      case 'recent-active':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        this.filterState.dateRange = {
          start: thirtyDaysAgo,
          end: new Date()
        };
        this.filterState.showInactive = false;
        break;
    }
    this.applyFilters();
  }

  // 清除特定筛选
  clearFilter(filterKey: string): void {
    if (filterKey === 'all') {
      this.resetFilters();
    } else {
      // 清除特定筛选
      switch (filterKey) {
        case 'fundType':
          this.filterState.fundType = [];
          break;
        case 'riskLevel':
          this.filterState.riskLevel = [];
          break;
        case 'priceRange':
          this.filterState.priceRange = { min: 0, max: 1000 };
          break;
        case 'performanceRange':
          this.filterState.performanceRange = { min: -20, max: 50 };
          break;
      }
      this.applyFilters();
    }
  }

  // 获取活跃筛选数量
  getActiveFilterCount(): number {
    let count = 0;
    if (this.filterState.search) count++;
    if (this.filterState.fundType.length > 0) count++;
    if (this.filterState.priceRange.min > 0 || this.filterState.priceRange.max < 1000) count++;
    if (this.filterState.riskLevel.length > 0) count++;
    if (this.toggleExpanded && this.filterState.performanceRange.min > -50 || this.toggleExpanded.max < 50) count++;
    if (this.filterState.dateRange.start || this.filterState.dateRange.end) count++;
    if (this.filterState.showInactive === false) count++;
    return count;
  }

  // 切换展开状态
  toggleExpanded(groupKey: string): void {
    const group = this.filterGroups.find(g => g.key === groupKey);
    if (group) {
      group.expanded = !group.expanded;
    }
  }

  // 格式化价格范围
  formatPriceRange(): string {
    const { min, max } = this.filterState.priceRange;
    if (min === 0 && max === 1000) {
      return '不限';
    }
    return `¥${min.toFixed(2)} - ¥${max.toFixed(2)}`;
  }

  // 格式化收益范围
  formatPerformanceRange(): string {
    const { min, max } = this.filterState.performanceRange;
    if (min === -50 && max === 50) {
      return '不限';
    }
    return `${min.toFixed(1)}% - ${max.toFixed(1)}%`;
  }

  // 格式化日期范围
  formatDateRange(): string {
    const { start, end } = this.filterState.dateRange;
    if (!start && !end) {
      return '不限';
    }
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('zh-CN', options)} - ${end.toLocaleDateString('zh-CN', options)}`;
  }

  // 添加到已选标签
  addToChips(chipValue: string, filterKey: string): void {
    switch (filterKey) {
      case 'fundType':
        if (!this.filterState.fundType.includes(chipValue)) {
          this.filterState.fundType.push(chipValue);
        }
        break;
      case 'riskLevel':
        if (!this.filterState.riskLevel.includes(chipValue)) {
          this.filterState.riskLevel.push(chipValue);
        }
        break;
    }
    this.applyFilters();
  }

  // 从已选标签移除
  removeFromChips(chipValue: string, filterKey: string): void {
    switch (filterKey) {
      case 'fundType':
        this.filterState.fundType = this.filterState.fundType.filter(type => type !== chipValue);
        break;
      case 'riskLevel':
        this.filterState.riskLevel = this.filterState.riskLevel.filter(level => level !== chipValue);
        break;
    }
    this.applyFilters();
  }

  // 获取筛选统计
  getFilterStats(): any {
    return {
      total: this.funds.length,
      filtered: this.getFilteredCount(),
      activeFilters: this.getActiveFilterCount()
    };
  }

  // 获取筛选后的数据
  getFilteredCount(): number {
    // 这里返回基于当前筛选状态的计数
    return this.getFilterStats().filtered;
  }
}