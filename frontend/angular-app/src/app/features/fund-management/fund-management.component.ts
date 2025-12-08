import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// 导入服务和组件
import { FundService } from '../../core/services/fund.service';
import { WatchlistService } from '../../core/services/watchlist.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { FundCardComponent } from '../../shared/components/fund-card/fund-card.component';
import { TrendIndicatorComponent } from '../../shared/components/trend-indicator/trend-indicator.component';
import { SimpleExportButtonComponent } from '../../shared/components/simple-export-button/simple-export-button.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';

import { FundInfo } from '../../models/fund.model';
import { TIME_CONSTANTS } from '../../shared/constants/app.constants';
import { FormatUtils } from '../../shared/utils/format.utils';

/**
 * 基金管理组件
 * 展示关注列表和可添加的基金，支持搜索和筛选
 *
 * 使用方法：路由配置 { path: 'funds', component: FundManagementComponent }
 */
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
    MatProgressSpinnerModule,
    MatChipsModule,
    FundCardComponent,
    TrendIndicatorComponent,
    SimpleExportButtonComponent,
    EmptyStateComponent,
    SkeletonLoaderComponent
  ],
  templateUrl: './fund-management.component.html',
  styleUrls: ['./fund-management.component.scss']
})
export class FundManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // 数据属性
  allFunds: FundInfo[] = [];
  watchlistFunds: FundInfo[] = [];
  filteredAvailableFunds: FundInfo[] = [];

  // 数据来源标识
  get isUsingMockData(): boolean {
    return this.fundService.isUsingMockData;
  }

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

  // 导出选项
  exportOptions = [
    { label: '导出关注列表', format: 'excel' as const, icon: 'download', value: 'watchlist' },
    { label: '导出全部基金', format: 'excel' as const, icon: 'download', value: 'all' },
    { label: '导出筛选结果', format: 'excel' as const, icon: 'download', value: 'filtered' }
  ];

  constructor(
    private fundService: FundService,
    private watchlistService: WatchlistService,
    private mockDataService: MockDataService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFunds();
    this.subscribeToWatchlist();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 订阅关注列表变化
  private subscribeToWatchlist(): void {
    this.watchlistService.watchlist$
      .pipe(takeUntil(this.destroy$))
      .subscribe(watchlist => {
        // 根据关注列表更新 watchlistFunds
        const watchlistIds = watchlist.map(item => item.fundId);
        this.watchlistFunds = this.allFunds.filter(fund => watchlistIds.includes(fund.id));
        this.updateStatistics();
        this.applyFiltersToAvailable();
      });
  }

  // 加载基金数据
  private loadFunds(): void {
    this.loading = true;

    // 使用模拟数据服务
    this.mockDataService.getFunds()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (funds) => {
          this.allFunds = funds;

          // 根据 WatchlistService 初始化关注列表
          const watchlistIds = this.watchlistService.watchedFundIds;
          if (watchlistIds.length > 0) {
            this.watchlistFunds = this.allFunds.filter(fund => watchlistIds.includes(fund.id));
          } else {
            // 如果没有关注列表，使用前6个作为默认
            this.watchlistFunds = funds.slice(0, 6);
            // 同步到 WatchlistService
            this.watchlistFunds.forEach(fund => {
              this.watchlistService.add({ id: fund.id, code: fund.code, name: fund.name });
            });
          }

          this.updateStatistics();
          this.applyFiltersToAvailable();
          this.loading = false;
        },
        error: (error) => {
          console.error('加载基金数据失败:', error);
          this.loading = false;
          this.snackBar.open('加载基金数据失败', '关闭', { duration: TIME_CONSTANTS.SNACKBAR_DURATION });
        }
      });
  }

  // 应用筛选到可添加的基金列表（不影响关注列表）
  private applyFiltersToAvailable(): void {
    // 获取关注列表的 ID
    const watchlistIds = this.watchlistFunds.map(f => f.id);

    // 从所有基金中排除关注列表
    let available = this.allFunds.filter(fund => !watchlistIds.includes(fund.id));

    // 应用搜索筛选
    if (this.searchQuery) {
      available = available.filter(fund =>
        fund.name.toLowerCase().includes(this.searchQuery) ||
        fund.code.toLowerCase().includes(this.searchQuery)
      );
    }

    // 应用类型筛选
    if (this.selectedType !== 'all') {
      available = available.filter(fund => fund.type === this.selectedType);
    }

    this.filteredAvailableFunds = available;
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
  onAddToWatchlist(fundId: string): void {
    const fund = this.allFunds.find(f => f.id === fundId);
    if (fund && !this.watchlistFunds.find(f => f.id === fundId)) {
      // 使用 WatchlistService 添加
      this.watchlistService.add({ id: fund.id, code: fund.code, name: fund.name })
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.watchlistFunds.push(fund);
          this.updateStatistics();
          this.applyFiltersToAvailable();
          this.snackBar.open(`已将 ${fund.name} 添加到关注列表`, '关闭', { duration: TIME_CONSTANTS.SNACKBAR_DURATION });
        });
    }
  }

  // 处理从关注列表移除
  onRemoveFromWatchlist(fundId: string): void {
    const fund = this.watchlistFunds.find(f => f.id === fundId);
    if (fund) {
      // 使用 WatchlistService 移除
      this.watchlistService.remove(fundId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.watchlistFunds = this.watchlistFunds.filter(f => f.id !== fundId);
          this.updateStatistics();
          this.applyFiltersToAvailable();
          this.snackBar.open(`已将 ${fund.name} 从关注列表移除`, '关闭', { duration: TIME_CONSTANTS.SNACKBAR_DURATION });
        });
    }
  }

  // 检查基金是否在关注列表
  isWatched(fundId: string): boolean {
    return this.watchlistService.isWatched(fundId);
  }

  // 处理搜索
  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value.toLowerCase();
    this.applyFiltersToAvailable();
  }

  // 处理类型筛选
  onTypeFilterChange(event: any): void {
    this.selectedType = event.value;
    this.applyFiltersToAvailable();
  }

  // 处理导出
  onExportClick(option: any): void {
    this.snackBar.open(`正在导出${option.label}...`, '关闭', { duration: 2000 });

    let dataToExport: FundInfo[] = [];
    switch (option.value) {
      case 'watchlist':
        dataToExport = this.watchlistFunds;
        break;
      case 'all':
        dataToExport = this.allFunds;
        break;
      case 'filtered':
        dataToExport = this.filteredAvailableFunds;
        break;
    }

    this.exportToCSV(dataToExport, option.label);
  }

  // 导出为 CSV
  private exportToCSV(funds: FundInfo[], filename: string): void {
    const headers = ['基金代码', '基金名称', '类型', '当前净值', '昨日净值', '日涨跌幅'];
    const rows = funds.map(fund => [
      fund.code,
      fund.name,
      FormatUtils.fundType(fund.type),
      fund.currentNav.toFixed(4),
      fund.yesterdayNav.toFixed(4),
      FormatUtils.percent((fund.currentNav - fund.yesterdayNav) / fund.yesterdayNav)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    this.snackBar.open('导出成功', '关闭', { duration: TIME_CONSTANTS.SNACKBAR_DURATION });
  }

  // 处理查看基金详情
  onViewDetails(fundId: string): void {
    this.router.navigate(['/fund', fundId]);
  }

  // 处理批量操作
  onBatchAction(action: string): void {
    this.snackBar.open(`执行批量操作: ${action}`, '关闭', { duration: 2000 });
  }

  // 获取基金类型显示名称（使用工具类）
  getFundTypeDisplay(type: string): string {
    return FormatUtils.fundType(type);
  }

  // 格式化百分比（使用工具类）
  formatPercent(value: number): string {
    return FormatUtils.percent(value, true, 2);
  }

  // 计算涨跌幅
  calculateChangePercent(fund: FundInfo): number {
    return ((fund.currentNav - fund.yesterdayNav) / fund.yesterdayNav) * 100;
  }
}