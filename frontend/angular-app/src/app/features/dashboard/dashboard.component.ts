import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

// 导入自定义组件
import { KLineChartComponent } from '../../shared/components/fund-chart/k-line-chart/k-line-chart.component';
import { FundCardComponent } from '../../shared/components/fund-card/fund-card.component';
import { TrendIndicatorComponent } from '../../shared/components/trend-indicator/trend-indicator.component';
import { SimpleExportButtonComponent } from '../../shared/components/simple-export-button/simple-export-button.component';

// 导入服务和模型
import { FundService } from '../../core/services/fund.service';
import { FundInfo, KLineDataPoint, TrendInfo } from '../../models/fund.model';
import { QuickExportOption } from '../../shared/components/simple-export-button/simple-export-button.component';

// 使用方法：在路由配置中使用
// { path: 'dashboard', component: DashboardComponent }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatGridListModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTabsModule,
    MatSelectModule,
    MatOptionModule,
    KLineChartComponent,
    FundCardComponent,
    TrendIndicatorComponent,
    SimpleExportButtonComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  // 数据属性
  funds: FundInfo[] = [];
  selectedFund: FundInfo | null = null;
  kLineData: KLineDataPoint[] = [];
  trendInfo: TrendInfo | null = null;

  // 状态属性
  isLoading = true;
  selectedTab = 0;
  refreshing = false;

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
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  // 加载仪表盘数据
  private loadDashboardData(): void {
    this.isLoading = true;
    this.loadWatchlistFunds();
  }

  // 加载关注列表基金
  private loadWatchlistFunds(): void {
    // 模拟获取关注列表的基金
    const fundIds = ['fund_0001', 'fund_0002', 'fund_0003', 'fund_0004', 'fund_0005', 'fund_0006'];

    fundIds.forEach(id => {
      this.fundService.getFundInfo(id).subscribe(
        fundInfo => {
          if (fundInfo) {
            this.funds.push(fundInfo);
          }

          // 加载完数据后选择第一个基金显示图表
          if (this.funds.length === 1 && !this.selectedFund) {
            this.selectFund(this.funds[0]);
          }
        },
        error => {
          console.error('加载基金信息失败:', error);
        }
      );
    });

    // 模拟加载完成
    setTimeout(() => {
      this.isLoading = false;
    }, 1000);
  }

  // 选择基金显示详情
  selectFund(fund: FundInfo): void {
    this.selectedFund = fund;
    this.loadFundDetails(fund.id);
  }

  // 加载基金详细信息
  private loadFundDetails(fundId: string): void {
    // 加载K线图数据
    this.fundService.getFundKLineData(fundId, 90).subscribe(
      data => {
        this.kLineData = data;
      },
      error => {
        console.error('加载K线数据失败:', error);
        this.snackBar.open('加载图表数据失败', '关闭', { duration: 3000 });
      }
    );

    // 加载涨跌信息
    this.fundService.getFundTrendInfo(fundId).subscribe(
      trendInfo => {
        this.trendInfo = trendInfo;
      },
      error => {
        console.error('加载涨跌信息失败:', error);
      }
    );
  }

  // 处理查看基金详情
  onViewFundDetails(fundId: string): void {
    this.snackBar.open(`查看基金 ${fundId} 详情`, '关闭', { duration: 2000 });
  }

  // 处理添加到关注列表
  onAddToWatchlist(fundId: string): void {
    this.fundService.addToWatchlist(fundId).subscribe(
      response => {
        this.snackBar.open('已添加到关注列表', '关闭', { duration: 3000 });
      },
      error => {
        this.snackBar.open('添加失败', '关闭', { duration: 3000 });
      }
    );
  }

  // 处理从关注列表移除
  onRemoveFromWatchlist(fundId: string): void {
    this.fundService.removeFromWatchlist(fundId).subscribe(
      response => {
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

        this.snackBar.open('已从关注列表移除', '关闭', { duration: 3000 });
      },
      error => {
        this.snackBar.open('移除失败', '关闭', { duration: 3000 });
      }
    );
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
    // 每5分钟自动刷新一次
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, 5 * 60 * 1000);
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

  // 格式化百分比
  formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  // 导出处理
  onExportClick(option: QuickExportOption): void {
    this.snackBar.open(`正在导出${option.label}...`, '关闭', { duration: 2000 });
    console.log('导出选项:', option);
  }
}