import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

import { FundService, FundFilter, FundListResponse } from '../../core/services/fund.service';
import { Fund } from '../models/dashboard.model';

@Component({
  selector: 'app-fund-management',
  templateUrl: './fund-management.component.html',
  styleUrls: ['./fund-management.component.scss']
})
export class FundManagementComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];

  funds: Fund[] = [];
  totalFunds = 0;
  currentPage = 1;
  pageSize = 20;
  loading = false;
  searchKeyword = '';

  // 筛选条件
  filter: FundFilter = {};

  // 基金类型选项
  fundTypes: string[] = [];
  fundCompanies: string[] = [];

  // 选中的基金
  selectedFunds: Set<string> = new Set();

  constructor(
    private router: Router,
    private titleService: Title,
    private fundService: FundService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('基金管理');
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadInitialData(): void {
    this.loading = true;

    // 并行加载数据
    this.fundService.getFundTypes().subscribe({
      next: (response) => {
        if (response.success) {
          this.fundTypes = response.data;
        }
      },
      error: (error) => {
        console.error('加载基金类型失败:', error);
      }
    });

    this.fundService.getFundCompanies().subscribe({
      next: (response) => {
        if (response.success) {
          this.fundCompanies = response.data;
        }
      },
      error: (error) => {
        console.error('加载基金公司失败:', error);
      }
    });

    this.loadFunds();
  }

  private loadFunds(): void {
    this.loading = true;

    this.fundService.getFunds(this.currentPage, this.pageSize, this.filter).subscribe({
      next: (response: FundListResponse) => {
        if (response.success) {
          this.funds = response.data.funds;
          this.totalFunds = response.data.total;
        } else {
          this.snackBar.open('加载基金数据失败', '关闭', { duration: 3000 });
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('加载基金数据失败:', error);
        this.snackBar.open('加载基金数据失败', '关闭', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  // 搜索基金
  searchFunds(): void {
    if (this.searchKeyword.trim()) {
      this.loading = true;
      this.fundService.searchFunds(this.searchKeyword).subscribe({
        next: (response: FundListResponse) => {
          if (response.success) {
            this.funds = response.data.funds;
            this.totalFunds = response.data.total;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('搜索基金失败:', error);
          this.snackBar.open('搜索基金失败', '关闭', { duration: 3000 });
          this.loading = false;
        }
      });
    } else {
      this.filter = {};
      this.loadFunds();
    }
  }

  // 应用筛选
  applyFilter(): void {
    this.currentPage = 1;
    this.loadFunds();
  }

  // 清除筛选
  clearFilter(): void {
    this.filter = {};
    this.searchKeyword = '';
    this.currentPage = 1;
    this.loadFunds();
  }

  // 查看基金详情
  viewFundDetail(fund: Fund): void {
    this.router.navigate(['/funds', fund.code]);
  }

  // 添加基金到收藏
  addToFavorites(fund: Fund): void {
    // TODO: 实现收藏功能
    this.snackBar.open(`已添加 ${fund.name} 到收藏`, '关闭', { duration: 2000 });
  }

  // 切换选择状态
  toggleSelection(fundCode: string): void {
    if (this.selectedFunds.has(fundCode)) {
      this.selectedFunds.delete(fundCode);
    } else {
      this.selectedFunds.add(fundCode);
    }
  }

  // 全选/取消全选
  toggleSelectAll(): void {
    if (this.selectedFunds.size === this.funds.length) {
      this.selectedFunds.clear();
    } else {
      this.funds.forEach(fund => this.selectedFunds.add(fund.code));
    }
  }

  // 批量操作
  performBatchOperation(operation: string): void {
    if (this.selectedFunds.size === 0) {
      this.snackBar.open('请先选择基金', '关闭', { duration: 2000 });
      return;
    }

    switch (operation) {
      case 'addToMonitor':
        this.snackBar.open(`已将 ${this.selectedFunds.size} 个基金添加到监控`, '关闭', { duration: 2000 });
        break;
      case 'export':
        this.snackBar.open('导出功能待实现', '关闭', { duration: 2000 });
        break;
      case 'refresh':
        this.refreshSelectedFunds();
        break;
    }
  }

  // 刷新选中的基金数据
  private refreshSelectedFunds(): void {
    // TODO: 实现刷新选中基金数据
    this.snackBar.open('刷新功能待实现', '关闭', { duration: 2000 });
  }

  // 分页
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadFunds();
  }

  // 格式化基金规模
  formatFundSize(size?: number): string {
    if (!size) return '--';
    if (size >= 10000) {
      return `${(size / 10000).toFixed(2)}万亿`;
    } else if (size >= 100) {
      return `${(size / 100).toFixed(2)}千亿`;
    } else {
      return `${size.toFixed(2)}亿`;
    }
  }

  // 格式化日期
  formatDate(date?: string): string {
    if (!date) return '--';
    return new Date(date).toLocaleDateString('zh-CN');
  }

  // 获取基金状态样式
  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'suspended':
        return 'status-suspended';
      case 'liquidating':
        return 'status-liquidating';
      default:
        return 'status-unknown';
    }
  }

  // 获取基金状态文本
  getStatusText(status: string): string {
    switch (status) {
      case 'active':
        return '正常';
      case 'suspended':
        return '暂停';
      case 'liquidating':
        return '清算';
      default:
        return '未知';
    }
  }
}