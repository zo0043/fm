import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// 导入自定义组件
import { KLineChartComponent } from '../../shared/components/fund-chart/k-line-chart/k-line-chart.component';
import { FundCardComponent } from '../../shared/components/fund-card/fund-card.component';
import { TrendIndicatorComponent } from '../../shared/components/trend-indicator/trend-indicator.component';
import { SimpleExportButtonComponent } from '../../shared/components/simple-export-button/simple-export-button.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';

// 导入服务和模型
import { FundService } from '../../core/services/fund.service';
import { WatchlistService } from '../../core/services/watchlist.service';
import { FundInfo, KLineDataPoint, TrendInfo } from '../../models/fund.model';
import { QuickExportOption } from '../../shared/components/simple-export-button/simple-export-button.component';
import { TIME_CONSTANTS } from '../../shared/constants/app.constants';
import { FormatUtils } from '../../shared/utils/format.utils';

/**
 * 仪表板组件
 * 展示用户关注的基金列表、K线图和涨跌统计
 *
 * 使用方法：路由配置 { path: 'dashboard', component: DashboardComponent }
 */
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatGridListModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatSnackBarModule,
    MatSelectModule,
    MatOptionModule,
    MatChipsModule,
    MatTooltipModule,
    KLineChartComponent,
    FundCardComponent,
    TrendIndicatorComponent,
    SimpleExportButtonComponent,
    EmptyStateComponent,
    SkeletonLoaderComponent
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // 数据属性
  funds: FundInfo[] = [];
  selectedFund: FundInfo | null = null;
  kLineData: KLineDataPoint[] = [];
  trendInfo: TrendInfo | null = null;

  // 状态属性
  isLoading = true;
  selectedTab = 0;
  refreshing = false;

  // 数据来源提示
  get isUsingMockData(): boolean {
    return this.fundService.isUsingMockData;
  }

  // 导出配置
  quickExportOptions: QuickExportOption[] = [
    { label: '导出仪表盘', format: 'pdf', icon: 'picture_as_pdf', tooltip: '导出完整仪表盘为PDF' },
    { label: '导出数据', format: 'excel', icon: 'table_chart', tooltip: '导出数据为Excel' }
  ];

  // 配置属性
  readonly gridCols = {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4
  };

  private refreshInterval: any = null;

  constructor(
    private fundService: FundService,
    private watchlistService: WatchlistService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.startAutoRefresh();
    this.subscribeToWatchlist();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopAutoRefresh();
  }

  // 订阅关注列表变化
  private subscribeToWatchlist(): void {
    this.watchlistService.watchlist$
      .pipe(takeUntil(this.destroy$))
      .subscribe(watchlist => {
        // 当关注列表变化时重新加载数据
        if (watchlist.length > 0 && !this.isLoading) {
          this.loadWatchlistFunds();
        }
      });
  }

  // 加载仪表盘数据
  private loadDashboardData(): void {
    this.isLoading = true;
    this.loadWatchlistFunds();
  }

  // 加载关注列表基金
  private loadWatchlistFunds(): void {
    // 从 WatchlistService 获取关注列表
    const watchlist = this.watchlistService.watchlist;

    if (watchlist.length === 0) {
      // 如果没有关注的基金，使用默认列表
      const defaultFundIds = ['fund_0001', 'fund_0002', 'fund_0003', 'fund_0004', 'fund_0005', 'fund_0006'];
      this.loadFundsByIds(defaultFundIds);
    } else {
      const fundIds = watchlist.map(item => item.fundId);
      this.loadFundsByIds(fundIds);
    }
  }

  private loadFundsByIds(fundIds: string[]): void {
    this.funds = [];
    let loadedCount = 0;

    fundIds.forEach(id => {
      this.fundService.getFundInfo(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (fundInfo) => {
            if (fundInfo) {
              this.funds.push(fundInfo);
            }
            loadedCount++;

            // 加载完数据后选择第一个基金显示图表
            if (this.funds.length === 1 && !this.selectedFund) {
              this.selectFund(this.funds[0]);
            }

            // 全部加载完成
            if (loadedCount === fundIds.length) {
              this.isLoading = false;
            }
          },
          error: (error) => {
            console.error('加载基金信息失败:', error);
            loadedCount++;
            if (loadedCount === fundIds.length) {
              this.isLoading = false;
            }
          }
        });
    });

    // 如果没有基金需要加载
    if (fundIds.length === 0) {
      this.isLoading = false;
    }
  }

  // 选择基金显示详情
  selectFund(fund: FundInfo): void {
    this.selectedFund = fund;
    this.loadFundDetails(fund.id);
  }

  // 加载基金详细信息
  private loadFundDetails(fundId: string): void {
    // 加载K线图数据
    this.fundService.getFundKLineData(fundId, 90)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.kLineData = data;
        },
        error: (error) => {
          console.error('加载K线数据失败:', error);
          this.snackBar.open('加载图表数据失败', '关闭', { duration: TIME_CONSTANTS.SNACKBAR_DURATION });
        }
      });

    // 加载涨跌信息
    this.fundService.getFundTrendInfo(fundId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (trendInfo) => {
          this.trendInfo = trendInfo;
        },
        error: (error) => {
          console.error('加载涨跌信息失败:', error);
        }
      });
  }

  // 处理查看基金详情
  onViewFundDetails(fundId: string): void {
    this.router.navigate(['/fund', fundId]);
  }

  // 处理添加到关注列表
  onAddToWatchlist(fundId: string): void {
    const fund = this.funds.find(f => f.id === fundId);
    if (fund) {
      this.watchlistService.add({ id: fund.id, code: fund.code, name: fund.name })
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.snackBar.open('已添加到关注列表', '关闭', { duration: TIME_CONSTANTS.SNACKBAR_DURATION });
        });
    }
  }

  // 处理从关注列表移除
  onRemoveFromWatchlist(fundId: string): void {
    this.watchlistService.remove(fundId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // 从列表中移除基金
        this.funds = this.funds.filter(f => f.id !== fundId);

        // 如果移除的是当前选中的基金，选择第一个
        if (this.selectedFund?.id === fundId && this.funds.length > 0) {
          this.selectFund(this.funds[0]);
        } else if (this.funds.length === 0) {
          this.selectedFund = null;
          this.kLineData = [];
          this.trendInfo = null;
        }

        this.snackBar.open('已从关注列表移除', '关闭', { duration: TIME_CONSTANTS.SNACKBAR_DURATION });
      });
  }

  // 检查基金是否在关注列表
  isWatched(fundId: string): boolean {
    return this.watchlistService.isWatched(fundId);
  }

  // 手动刷新数据
  refreshData(): void {
    this.refreshing = true;

    // 重新加载所有数据
    this.funds = [];
    this.loadWatchlistFunds();

    if (this.selectedFund) {
      this.loadFundDetails(this.selectedFund.id);
    }

    setTimeout(() => {
      this.refreshing = false;
      this.snackBar.open('数据已刷新', '关闭', { duration: 2000 });
    }, 1000);
  }

  // 切换标签页
  onTabChange(index: number): void {
    this.selectedTab = index;
  }

  // 获取网格列数
  getGridCols(): number {
    const width = window.innerWidth;
    if (width < 600) return this.gridCols.xs;
    if (width < 960) return this.gridCols.sm;
    if (width < 1280) return this.gridCols.md;
    return this.gridCols.lg;
  }

  // 开始自动刷新
  private startAutoRefresh(): void {
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, TIME_CONSTANTS.AUTO_REFRESH_INTERVAL);
  }

  // 停止自动刷新
  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // 获取页面标题
  getPageTitle(): string {
    if (this.selectedTab === 0) {
      return '基金监控面板';
    } else if (this.selectedTab === 1) {
      return '图表分析';
    } else {
      return '数据统计';
    }
  }

  // 获取涨跌统计
  getTrendStats(): { up: number; down: number; flat: number } {
    const stats = { up: 0, down: 0, flat: 0 };

    this.funds.forEach(fund => {
      const change = fund.currentNav - fund.yesterdayNav;
      if (change > 0) stats.up++;
      else if (change < 0) stats.down++;
      else stats.flat++;
    });

    return stats;
  }

  // 格式化百分比（使用工具类）
  formatPercent(value: number): string {
    return FormatUtils.percent(value, true, 2);
  }

  // 导出处理
  onExportClick(option: QuickExportOption): void {
    this.snackBar.open(`正在导出${option.label}...`, '关闭', { duration: 2000 });

    if (option.format === 'excel') {
      this.exportToExcel();
    } else if (option.format === 'pdf') {
      this.exportToPdf();
    }
  }

  // 导出到 Excel
  private exportToExcel(): void {
    const headers = ['基金代码', '基金名称', '类型', '当前净值', '昨日净值', '日涨跌幅'];
    const rows = this.funds.map(fund => [
      fund.code,
      fund.name,
      fund.type,
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
    link.download = `基金监控_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    this.snackBar.open('导出成功', '关闭', { duration: TIME_CONSTANTS.SNACKBAR_DURATION });
  }

  // 导出到 PDF（简化版，实际需要 PDF 库）
  private exportToPdf(): void {
    this.snackBar.open('PDF 导出功能开发中...', '关闭', { duration: TIME_CONSTANTS.SNACKBAR_DURATION });
  }

  // 跳转到基金管理页面添加基金
  goToFundManagement(): void {
    this.router.navigate(['/funds']);
  }
}