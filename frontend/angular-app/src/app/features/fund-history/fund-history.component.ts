import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { FundService, FundHistoryData } from '../../core/services/fund.service';
import { Observable } from 'rxjs';
import { ChartConfiguration, ChartData, ChartEvent, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-fund-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSelectModule,
    MatOptionModule,
    MatDividerModule
  ],
  templateUrl: './fund-history.component.html',
  styleUrls: ['./fund-history.component.scss']
})
export class FundHistoryComponent implements OnInit {
  // 表单控件
  historyForm: FormGroup;
  
  // 数据
  displayedColumns: string[] = ['date', 'nav', 'totalNav', 'dailyChange'];
  dataSource: FundHistoryData[] = [];
  filteredData: FundHistoryData[] = [];
  
  // 状态
  isLoading = false;
  isChartLoading = false;
  error: string | null = null;
  
  // 分页
  pageSize = 20;
  pageIndex = 0;
  totalItems = 0;
  
  // 排序
  sortOrder: 'asc' | 'desc' = 'desc';
  sortActive = 'date';
  
  // 图表相关
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  
  chartType: ChartType = 'line';
  chartDatasets: ChartConfiguration['data']['datasets'] = [];
  chartLabels: string[] = [];
  
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '日期'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: '净值'
        }
      }
    }
  };
  
  // 图表类型选项
  chartTypes = [
    { value: 'line', label: '折线图' },
    { value: 'bar', label: '柱状图' }
  ];
  
  // 时间周期选项
  timePeriods = [
    { value: '7d', label: '最近7天' },
    { value: '1m', label: '最近1个月' },
    { value: '3m', label: '最近3个月' },
    { value: '6m', label: '最近6个月' },
    { value: '1y', label: '最近1年' },
    { value: '3y', label: '最近3年' },
    { value: '5y', label: '最近5年' },
    { value: 'custom', label: '自定义' }
  ];
  
  // 默认日期范围
  defaultStartDate: Date;
  defaultEndDate: Date;
  
  constructor(
    private fb: FormBuilder,
    private fundService: FundService,
    private snackBar: MatSnackBar
  ) {
    // 初始化日期范围（默认最近1年）
    this.defaultEndDate = new Date();
    this.defaultStartDate = new Date();
    this.defaultStartDate.setFullYear(this.defaultEndDate.getFullYear() - 1);
    
    // 初始化表单
    this.historyForm = this.fb.group({
      fundCode: ['110022', Validators.required],
      timePeriod: ['1y'],
      startDate: [this.defaultStartDate],
      endDate: [this.defaultEndDate]
    });
    
    // 监听时间周期变化，自动更新日期范围
    this.historyForm.get('timePeriod')?.valueChanges.subscribe(period => {
      this.updateDateRangeByPeriod(period);
    });
  }
  
  ngOnInit(): void {
    // 初始加载数据
    this.loadFundHistory();
  }
  
  /**
   * 根据时间周期更新日期范围
   */
  updateDateRangeByPeriod(period: string): void {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '1m':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case '3y':
        startDate.setFullYear(endDate.getFullYear() - 3);
        break;
      case '5y':
        startDate.setFullYear(endDate.getFullYear() - 5);
        break;
      case 'custom':
        return; // 自定义范围，不自动更新
      default:
        startDate.setFullYear(endDate.getFullYear() - 1);
    }
    
    this.historyForm.patchValue({
      startDate,
      endDate
    });
  }
  
  /**
   * 加载基金历史数据
   */
  loadFundHistory(): void {
    if (!this.historyForm.valid) {
      return;
    }
    
    this.isLoading = true;
    this.isChartLoading = true;
    this.error = null;
    
    const fundCode = this.historyForm.get('fundCode')?.value;
    const startDate = this.historyForm.get('startDate')?.value;
    const endDate = this.historyForm.get('endDate')?.value;
    
    // 格式化日期
    const formattedStartDate = startDate?.toISOString().split('T')[0];
    const formattedEndDate = endDate?.toISOString().split('T')[0];
    
    this.fundService.getFundNavFromEastmoney(fundCode, 1, 1000, formattedStartDate, formattedEndDate)
      .subscribe({
        next: (data) => {
          this.dataSource = data;
          this.filteredData = [...data];
          this.totalItems = data.length;
          this.pageIndex = 0;
          this.sortData();
          this.updateChartData();
          this.isLoading = false;
          this.isChartLoading = false;
          this.snackBar.open(`成功加载基金${fundCode}的历史净值数据`, '关闭', { duration: 3000 });
        },
        error: (error) => {
          this.error = `获取基金历史数据失败: ${error.message}`;
          this.isLoading = false;
          this.isChartLoading = false;
          this.snackBar.open('获取基金历史数据失败', '关闭', { duration: 3000 });
        }
      });
  }
  
  /**
   * 更新图表数据
   */
  updateChartData(): void {
    if (this.dataSource.length === 0) {
      return;
    }
    
    // 排序数据（按日期升序）
    const sortedData = [...this.dataSource].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // 准备图表数据
    this.chartLabels = sortedData.map(item => item.date);
    
    this.chartDatasets = [
      {
        data: sortedData.map(item => item.nav),
        label: '单位净值',
        borderColor: '#3f51b5',
        backgroundColor: 'rgba(63, 81, 181, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
      {
        data: sortedData.map(item => item.totalNav),
        label: '累计净值',
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5,
      }
    ];
    
    // 更新图表
    this.chart?.update();
  }
  
  /**
   * 处理分页变化
   */
  handlePageEvent(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
  }
  
  /**
   * 处理排序变化
   */
  handleSortChange(sort: Sort): void {
    if (sort.active && sort.direction) {
      this.sortActive = sort.active;
      this.sortOrder = sort.direction as 'asc' | 'desc';
      this.sortData();
    }
  }
  
  /**
   * 排序数据
   */
  sortData(): void {
    const data = [...this.dataSource];
    const isAsc = this.sortOrder === 'asc';
    
    this.filteredData = data.sort((a, b) => {
      switch (this.sortActive) {
        case 'date':
          return this.compare(new Date(a.date), new Date(b.date), isAsc);
        case 'nav':
          return this.compare(a.nav, b.nav, isAsc);
        case 'totalNav':
          return this.compare(a.totalNav, b.totalNav, isAsc);
        case 'dailyChange':
          return this.compare(a.dailyChange, b.dailyChange, isAsc);
        default:
          return 0;
      }
    });
  }
  
  /**
   * 比较函数
   */
  compare(a: number | Date, b: number | Date, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }
  
  /**
   * 格式化涨跌幅
   */
  formatDailyChange(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(2)}%`;
  }
  
  /**
   * 获取涨跌幅样式类
   */
  getDailyChangeClass(value: number): string {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  }
  
  /**
   * 刷新数据
   */
  refreshData(): void {
    // 清除缓存
    const fundCode = this.historyForm.get('fundCode')?.value;
    this.fundService.clearNavDataCache(fundCode);
    // 重新加载数据
    this.loadFundHistory();
  }
  
  /**
   * 切换图表类型
   */
  changeChartType(type: ChartType): void {
    this.chartType = type;
    this.chart?.update();
  }
  
  /**
   * 导出数据
   */
  exportData(): void {
    if (this.dataSource.length === 0) {
      this.snackBar.open('没有数据可以导出', '关闭', { duration: 3000 });
      return;
    }
    
    // 生成CSV内容
    const headers = ['日期', '单位净值', '累计净值', '日涨跌幅(%)'];
    const rows = this.dataSource.map(item => [
      item.date,
      item.nav,
      item.totalNav,
      (item.dailyChange * 100).toFixed(2)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // 创建下载链接
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `fund_history_${this.historyForm.get('fundCode')?.value}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.snackBar.open('数据导出成功', '关闭', { duration: 3000 });
  }
}