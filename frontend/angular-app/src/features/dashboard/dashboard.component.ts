import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, interval } from 'rxjs';

import { DashboardService } from '../../core/services/dashboard.service';
import { Fund, NavData, Alert, Activity, MarketSummary, Recommendation } from '../models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  pageTitle = '仪表板';

  private subscriptions: Subscription[] = [];

  overviewData: any = {};
  portfolioOverview: any = {};
  performanceData: any = {};
  recentAlerts: Alert[] = [];
  recentActivities: Activity[] = [];
  marketSummary: MarketSummary | undefined;
  recommendations: Recommendation[] = [];

  loading = true;

  // 统计数据
  totalFunds = 0;
  activeRules = 0;
  todayNotifications = 0;

  constructor(
    private router: Router,
    private titleService: Title,
    private dashboardService: DashboardService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle(this.pageTitle);
    this.loadDashboardData();
    this.startRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadDashboardData(): void {
    this.loading = true;

    // 并行加载所有数据
    this.dashboardService.getOverview().subscribe({
      next: (data) => {
        this.overviewData = data.data;
        this.updateStatistics();
      },
      error: (error) => {
        console.error('加载概览数据失败:', error);
        this.snackBar.open('加载数据失败，请稍后重试', '关闭', { duration: 3000 });
        this.loading = false;
      }
    });

    this.dashboardService.getPortfolioOverview().subscribe({
      next: (data) => {
        this.portfolioOverview = data.data;
      },
      error: (error) => {
        console.error('加载投资组合数据失败:', error);
      }
    });

    this.dashboardService.getPerformance('1m').subscribe({
      next: (data) => {
        this.performanceData = data.data;
      },
      error: (error) => {
        console.error('加载性能数据失败:', error);
      }
    });

    this.dashboardService.getAlerts('pending', 'high', 5).subscribe({
      next: (data) => {
        this.recentAlerts = data.data;
        this.todayNotifications = this.recentAlerts.length;
      },
      error: (error) => {
        console.error('加载告警数据失败:', error);
      }
    });

    this.dashboardService.getActivities(10).subscribe({
      next: (data) => {
        this.recentActivities = data.data;
      },
      error: (error) => {
        console.error('加载活动数据失败:', error);
      }
    });

    this.dashboardService.getMarketSummary().subscribe({
      next: (data) => {
        this.marketSummary = data.data;
      },
      error: (error) => {
        console.error('加载市场概览失败:', error);
      }
    });

    this.dashboardService.getRecommendations().subscribe({
      next: (data) => {
        this.recommendations = data.data;
      },
      error: (error) => {
        console.error('加载投资建议失败:', error);
      }
    });

    // 加载完成后隐藏加载状态
    Promise.all([
      this.overviewData ? Promise.resolve() : Promise.reject(),
      this.portfolioOverview ? Promise.resolve() : Promise.resolve(),
      this.performanceData ? Promise.resolve() : Promise.resolve()
    ]).then(() => {
      this.loading = false;
    }).catch(() => {
      this.loading = false;
    });
  }

  private updateStatistics(): void {
    if (this.overviewData?.data) {
      this.totalFunds = this.overviewData.data.totalFunds || 0;
      this.activeRules = this.overviewData.data.activeRules || 0;
      this.todayNotifications = this.overviewData.data.todayNotifications || 0;
    }
  }

  private startRealTimeUpdates(): void {
    // 每30秒刷新一次数据
    const refreshSubscription = interval(30000).subscribe(() => {
      this.loadDashboardData();
    });
    this.subscriptions.push(refreshSubscription);

    // 每5分钟刷新市场数据
    const marketRefreshSubscription = interval(300000).subscribe(() => {
      this.dashboardService.getMarketSummary().subscribe({
        next: (data) => {
          this.marketSummary = data.data;
        },
        error: (error) => {
          console.error('刷新市场数据失败:', error);
        }
      });
    });
    this.subscriptions.push(marketRefreshSubscription);
  }

  // 查看基金详情
  viewFundDetails(fund: Fund): void {
    this.router.navigate(['/funds', fund.code]);
  }

  // 查看基金性能
  viewFundPerformance(fund: Fund): void {
    // TODO: 实现基金性能对话框组件
    console.log('查看基金性能:', fund);
    this.snackBar.open(`基金性能功能待实现: ${fund.name}`, '关闭', {
      duration: 3000
    });
    // const dialogRef = this.dialog.open(FundPerformanceDialogComponent, {
    //   width: '80vw',
    //   maxWidth: '1000px',
    //   data: { fund }
    // });
  }

  // 查看告警详情
  viewAlertDetails(alert: Alert): void {
    // TODO: 实现告警详情对话框组件
    console.log('查看告警详情:', alert);
    this.snackBar.open(`告警详情功能待实现: ${alert.ruleName}`, '关闭', {
      duration: 3000
    });
    // const dialogRef = this.dialog.open(AlertDialogComponent, {
    //   width: '60vw',
    //   maxWidth: '600px',
    //   data: { alert }
    // });
  }

  // 确认告警
  acknowledgeAlert(alert: Alert): void {
    this.dashboardService.acknowledgeAlert(alert.id).subscribe({
      next: (data) => {
        if (data.success) {
          this.snackBar.open('告警已确认', '关闭', {
            duration: 3000
          });
          this.recentAlerts = this.recentAlerts.filter(a => a.id !== alert.id);
        }
      },
      error: (error) => {
        this.snackBar.open('确认告警失败', '关闭', {
          duration: 3000
        });
      }
    });
  }

  // 刷新数据
  refreshData(): void {
    this.loading = true;
    this.loadDashboardData();
  }

  // 获取页面标题
  get pageTitle$(): string {
    return this.titleService.getTitle();
  }
}