import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';

// 导入数据模型
import { FundInfo } from '../../../models/fund.model';

// 使用方法：在组件中使用
// <app-enhanced-fund-table
//   [funds]="funds"
//   [loading]="loading"
//   (rowAction)="onRowAction($event)"
//   (selectionChange)="onSelectionChange($event)">
// </app-enhanced-fund-table>

export interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'percent' | 'date' | 'badge' | 'action';
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any, row: any) => string;
}

export interface TableAction {
  label: string;
  icon: string;
  color: 'primary' | 'accent' | 'warn';
  action: (row: FundInfo) => void;
  condition?: (row: FundInfo) => boolean;
}

export interface FilterOptions {
  search: string;
  type: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  pageSize: number;
}

@Component({
  selector: 'app-enhanced-fund-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    FundCardModule,
    MatOptionModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatSnackBar,
    MatMenuModule,
    MatChipsModule
  ],
  templateUrl: './enhanced-fund-table.component.html',
  styleUrls: ['./enhanced-fund-table.component.scss']
})
export class EnhancedFundTableComponent implements OnInit {
  @Input() funds: FundInfo[] = [];
  @Input() loading = false;
  @Input() showToolbar = true;
  @Input() showPagination = true;
  @Input() showSelection = false;
  @Input() pageSize = 10;

  @Output() rowAction = new EventEmitter<{ action: string; row: FundInfo }>();
  @Output() selectionChange = new EventEmitter<FundInfo[]>();
  @Output() filterChange = new EventEmitter<FilterOptions>();

  // 表格列定义
  defaultColumns: TableColumn[] = [
    { key: 'code', label: '基金代码', type: 'text', sortable: true, filterable: true, align: 'left' },
    { key: 'name', label: '基金名称', type: 'text', sortable: true, filterable: true, align: 'left' },
    { key: 'type', label: '基金类型', type: 'text', sortable: true, filterable: true, align: 'center' },
    { key: 'currentNav', label: '当前净值', type: 'currency', sortable: true, align: 'right' },
    { key: 'changePercent', label: '涨跌幅', type: 'percent', sortable: true, align: 'right' },
    { key: 'weekNav', label: '周净值', type: 'currency', sortable: true, align: 'right' },
    { key: 'monthNav', label: '月净值', type: 'currency', sortable: true, align: 'right' },
    { key: 'actions', label: '操作', type: 'action', align: 'center' }
  ];

  @Input() columns: TableColumn[] = this.defaultColumns;

  // 数据源和分页
  dataSource: MatTableDataSource<FundInfo>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // 筛选和排序
  filterOptions: FilterOptions = {
    search: '',
    type: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    pageSize: this.pageSize
  };

  // 选择
  selection = new SelectionModel<FundInfo>(true, []);
  displayData: FundInfo[] = [];

  // 可用操作
  tableActions: TableAction[] = [
    { label: '查看详情', icon: 'info', color: 'primary', action: (row) => this.rowAction.emit({ action: 'view', row }) },
    { label: '编辑', icon: 'edit', color: 'accent', action: (row) => this.rowAction.emit({ action: 'edit', row }) },
    { label: '删除', icon: 'delete', color: 'warn', action: (row) => this.rowAction.emit({ action: 'delete', row }) }
  ];

  @Input() actions: TableAction[] = this.tableActions;

  // 统计信息
  totalFunds = 0;
  filteredFunds = 0;
  upCount = 0;
  downCount = 0;
  flatCount = 0;

  constructor(private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource(this.displayData);
    this.initializeTable();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['funds']) {
      this.applyFilters();
    }
    if (changes['columns']) {
      this.initializeTable();
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.applyFilters();
  }

  // 初始化表格
  private initializeTable(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  // 应用筛选
  applyFilters(): void {
    let filteredData = [...this.funds];

    // 搜索筛选
    if (this.filterOptions.search) {
      const searchTerm = this.filterOptions.search.toLowerCase();
      filteredData = filteredData.filter(fund =>
        fund.name.toLowerCase().includes(searchTerm) ||
        fund.code.toLowerCase().includes(searchTerm)
      );
    }

    // 类型筛选
    if (this.filterOptions.type !== 'all') {
      filteredData = filteredData.filter(fund => fund.type === this.filterOptions.type);
    }

    // 排序
    filteredData.sort((a, b) => {
      let compareValue = 0;
      const aValue = a[this.filterOptions.sortBy];
      const bValue = b[this.filterOptions.sortBy];

      if (aValue < bValue) {
        compareValue = -1;
      } else if (aValue > bValue) {
        compareValue = 1;
      }

      return this.filterOptions.sortOrder === 'desc' ? -compareValue : compareValue;
    });

    this.displayData = filteredData;
    this.dataSource.data = filteredData;

    // 更新统计信息
    this.updateStatistics();
    this.filterChange.emit(this.filterOptions);
  }

  // 更新统计信息
  private updateStatistics(): void {
    this.totalFunds = this.funds.length;
    this.filteredFunds = this.displayData.length;
    this.upCount = this.displayData.filter(f => f.currentNav > f.yesterdayNav).length;
    this.downCount = this.displayData.filter(f => f.currentNav < f.yesterdayNav).length;
    this.flatCount = this.displayData.filter(f => f.currentNav === f.yesterdayNav).length;
  }

  // 格式化方法
  formatValue(value: any, row: FundInfo, column: TableColumn): string {
    if (column.formatter) {
      return column.formatter(value, row);
    }

    switch (column.type) {
      case 'currency':
        return `¥${value.toFixed(4)}`;
      case 'percent':
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
      case 'date':
        return new Date(value).toLocaleDateString();
      default:
        return value?.toString() || '';
    }
  }

  // 获取涨跌状态样式类
  getTrendClass(row: FundInfo): string {
    const changePercent = ((row.currentNav - row.yesterdayNav) / row.yesterdayNav) * 100;
    if (changePercent > 0) return 'trend-up';
    if (changePercent < 0) return 'trend-down';
    return 'trend-flat';
  }

  // 刷新数据
  refreshData(): void {
    this.applyFilters();
    this.snackBar.open('数据已刷新', '关闭', { duration: 2000 });
  }

  // 切换列显示
  toggleColumnVisibility(column: TableColumn): void {
    // 这里可以实现列的显示/隐藏逻辑
    this.snackBar.open(`切换 ${column.label} 显示状态`, '关闭', { duration: 2000 });
  }

  // 导出数据
  exportData(format: 'excel' | 'csv'): void {
    this.snackBar.open(`正在导出${format.toUpperCase()}格式...`, '关闭', { duration: 2000 });
    // 这里可以实现实际的导出逻辑
  }

  // 选择所有
  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this.displayData);
    }
    this.selectionChange.emit(this.selection.selected);
  }

  // 检查是否全选
  isAllSelected(): boolean {
    return this.selection.selected.length === this.displayData.length && this.displayData.length > 0;
  }

  // 获取复选框状态
  isRowSelected(row: FundInfo): boolean {
    return this.selection.isSelected(row);
  }

  // 行选择切换
  toggleRowSelection(row: FundInfo): void {
    this.selection.toggle(row);
    this.selectionChange.emit(this.selection.selected);
  }

  // 执行表格操作
  executeAction(action: TableAction, row: FundInfo): void {
    if (action.condition && !action.condition(row)) {
      return;
    }
    action.action(row);
  }

  // 分页事件处理
  onPageEvent(event: any): void {
    this.filterOptions.pageSize = event.pageSize;
    this.applyFilters();
  }
}