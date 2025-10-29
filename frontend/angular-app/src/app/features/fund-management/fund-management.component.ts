import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

// 导入服务和组件
import { FundService } from '../../core/services/fund.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { FundCardComponent } from '../../shared/components/fund-card/fund-card.component';
import { TrendIndicatorComponent } from '../../shared/components/trend-indicator/trend-indicator.component';
import { SimpleExportButtonComponent } from '../../shared/components/simple-export-button/simple-export-button.component';

import { FundInfo } from '../../models/fund.model';

// 使用方法：在路由配置中使用
// { path: 'funds', component: FundManagementComponent }

@Component({
  selector: 'app-fund-management',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatDialogModule,
    MatTabsModule,
    MatDividerModule,
    MatTooltipModule,
    MatProgressBarModule,
    FundCardComponent,
    TrendIndicatorComponent,
    SimpleExportButtonComponent
  ],
  templateUrl: './fund-management.component.html',
  styleUrls: ['./fund-management.component.scss']
})
export class FundManagementComponent implements OnInit {
  // 数据属性
  allFunds: FundInfo[] = [];
  watchlistFunds: FundInfo[] = [];
  availableFunds: FundInfo[] = [];

  // UI状态
  loading = false;
  selectedTab = 0;

  // 分页和排序
  displayedColumns: string[] = ['code', 'name', 'type', 'currentNav', 'changePercent', 'actions'];
  pageSize = 10;
  currentPage = 0;
  totalItems = 0;

  // 筛选选项
  selectedType = 'all';
  searchQuery = '';

  // 统计数据
  totalFunds = 0;
  upCount = 0;
  downCount = 0;
  flatCount = 0;

  constructor(
    private fundService: FundService,
    private mockDataService: MockDataService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadFunds();
  }

  // 加载基金数据
  private loadFunds(): void {
    this.loading = true;

    // 使用模拟数据服务
    this.mockDataService.getFunds().subscribe(funds => {
      this.allFunds = funds;
      this.watchlistFunds = funds.slice(0, 6); // 模拟关注列表
      this.availableFunds = funds.slice(6); // 可添加的基金
      this.updateStatistics();
      this.loading = false;
    });
  }

  // 更新统计数据
  private updateStatistics(): void {
    this.totalFunds = this.watchlistFunds.length;
    this.upCount = this.watchlistFunds.filter(f => f.currentNav > f.yesterdayNav).length;
    this.downCount = this.watchlistFunds.filter(f => f.currentNav < f.yesterdayNav).length;
    this.flatCount = this.watchlistFunds.filter(f => f.currentNav === f.yesterdayNav).length;
  }

  // 处理标签页切换
  onTabChange(index: number): void {
    this.selectedTab = index;
  }

  // 处理基金添加到关注列表
  onAddToWatchlist(fund: FundInfo): void {
    if (!this.watchlistFunds.find(f => f.id === fund.id)) {
      this.watchlistFunds.push(fund);
      this.availableFunds = this.availableFunds.filter(f => f.id !== fund.id);
      this.updateStatistics();
      this.snackBar.open(`已将 ${fund.name} 添加到关注列表`, '关闭', { duration: 3000 });
    }
  }

  // 处理从关注列表移除
  onRemoveFromWatchlist(fund: FundInfo): void {
    this.watchlistFunds = this.watchlistFunds.filter(f => f.id !== fund.id);
    this.availableFunds.push(fund);
    this.updateStatistics();
    this.snackBar.open(`已将 ${fund.name} 从关注列表移除`, '关闭', { duration: 3000 });
  }

  // 处理搜索
  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value.toLowerCase();
    this.applyFilters();
  }

  // 处理类型筛选
  onTypeFilterChange(event: any): void {
    this.selectedType = event.value;
    this.applyFilters();
  }

  // 应用筛选条件
  private applyFilters(): void {
    let filtered = [...this.allFunds];

    // 搜索筛选
    if (this.searchQuery) {
      filtered = filtered.filter(fund =>
        fund.name.toLowerCase().includes(this.searchQuery) ||
        fund.code.toLowerCase().includes(this.searchQuery)
      );
    }

    // 类型筛选
    if (this.selectedType !== 'all') {
      filtered = filtered.filter(fund => fund.type === this.selectedType);
    }

    this.watchlistFunds = filtered.slice(0, 6); // 模拟关注列表
    this.availableFunds = filtered.slice(6);
    this.updateStatistics();
  }

  // 处理导出
  onExportClick(option: any): void {
    this.snackBar.open(`正在导出${option.label}...`, '关闭', { duration: 2000 });
    console.log('导出选项:', option);
  }

  // 处理查看基金详情
  onViewDetails(fund: FundInfo): void {
    this.snackBar.open(`查看 ${fund.name} 详情`, '关闭', { duration: 2000 });
  }

  // 处理批量操作
  onBatchAction(action: string): void {
    this.snackBar.open(`执行批量操作: ${action}`, '关闭', { duration: 2000 });
  }

  // 获取基金类型显示名称
  getFundTypeDisplay(type: string): string {
    const typeMap: { [key: string]: string } = {
      'stock': '股票型',
      'bond': '债券型',
      'hybrid': '混合型',
      'index': '指数型',
      'etf': 'ETF',
      'qdii': 'QDII'
    };
    return typeMap[type] || type;
  }

  // 格式化百分比
  formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  // 计算涨跌幅
  calculateChangePercent(fund: FundInfo): number {
    return ((fund.currentNav - fund.yesterdayNav) / fund.yesterdayNav) * 100;
  }
}