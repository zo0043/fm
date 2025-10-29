import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { Fund } from '../../../core/services/fund.service';

export interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'percent' | 'date' | 'badge' | 'action';
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any, row: any) => string;
  class?: (value: any, row: any) => string;
}

export interface TableAction {
  label: string;
  icon: string;
  color: 'primary' | 'accent' | 'warn';
  action: (row: any) => void;
  condition?: (row: any) => boolean;
}

export interface FilterOptions {
  search: string;
  type: string;
  riskLevel: string;
  status: string;
  minChange: number;
  maxChange: number;
}

@Component({
  selector: 'app-fund-data-table',
  template: `
    <div class="data-table-wrapper">
      <!-- 表格工具栏 -->
      <div class="table-toolbar" *ngIf="showToolbar">
        <div class="toolbar-left">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>搜索基金</mat-label>
            <input matInput
                   [(ngModel)]="filterOptions.search"
                   (keyup)="applyFilter()"
                   placeholder="输入基金名称或代码">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <mat-button-toggle-group [(value)]="viewMode" (change)="onViewModeChange($event)" *ngIf="showViewMode">
            <mat-button-toggle value="table">
              <mat-icon>table_view</mat-icon>
            </mat-button-toggle>
            <mat-button-toggle value="card">
              <mat-icon>view_module</mat-icon>
            </mat-button-toggle>
          </mat-button-toggle-group>
        </div>

        <div class="toolbar-right">
          <button mat-icon-button
                  [matMenuTriggerFor]="filterMenu"
                  matTooltip="筛选"
                  [color]="hasActiveFilters ? 'warn' : 'default'">
            <mat-icon>filter_list</mat-icon>
          </button>

          <button mat-icon-button
                  [matMenuTriggerFor]="columnMenu"
                  matTooltip="列设置">
            <mat-icon>view_column</mat-icon>
          </button>

          <button mat-icon-button
                  (click)="refreshData()"
                  matTooltip="刷新">
            <mat-icon>refresh</mat-icon>
          </button>

          <button mat-icon-button
                  [matMenuTriggerFor]="exportMenu"
                  matTooltip="导出">
            <mat-icon>download</mat-icon>
          </button>
        </div>
      </div>

      <!-- 筛选菜单 -->
      <mat-menu #filterMenu="matMenu" xPosition="before">
        <div class="filter-menu-content">
          <mat-form-field appearance="outline">
            <mat-label>基金类型</mat-label>
            <mat-select [(ngModel)]="filterOptions.type" (selectionChange)="applyFilter()">
              <mat-option value="">全部</mat-option>
              <mat-option value="股票型">股票型</mat-option>
              <mat-option value="债券型">债券型</mat-option>
              <mat-option value="混合型">混合型</mat-option>
              <mat-option value="指数型">指数型</mat-option>
              <mat-option value="QDII">QDII</mat-option>
              <mat-option value="货币型">货币型</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>风险等级</mat-label>
            <mat-select [(ngModel)]="filterOptions.riskLevel" (selectionChange)="applyFilter()">
              <mat-option value="">全部</mat-option>
              <mat-option value="低风险">低风险</mat-option>
              <mat-option value="中低风险">中低风险</mat-option>
              <mat-option value="中等风险">中等风险</mat-option>
              <mat-option value="中高风险">中高风险</mat-option>
              <mat-option value="高风险">高风险</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>状态</mat-label>
            <mat-select [(ngModel)]="filterOptions.status" (selectionChange)="applyFilter()">
              <mat-option value="">全部</mat-option>
              <mat-option value="正常">正常</mat-option>
              <mat-option value="暂停">暂停</mat-option>
            </mat-select>
          </mat-form-field>

          <div class="filter-actions">
            <button mat-stroked-button (click)="clearFilters()">清除筛选</button>
            <button mat-raised-button color="primary" (click)="applyFilter()">应用筛选</button>
          </div>
        </div>
      </mat-menu>

      <!-- 列设置菜单 -->
      <mat-menu #columnMenu="matMenu" xPosition="before">
        <div class="column-menu-content">
          <div class="menu-title">显示列</div>
          <mat-checkbox
            *ngFor="let column of availableColumns"
            [(ngModel)]="column.visible"
            (change)="updateVisibleColumns()"
            class="column-checkbox">
            {{ column.label }}
          </mat-checkbox>
        </div>
      </mat-menu>

      <!-- 导出菜单 -->
      <mat-menu #exportMenu="matMenu" xPosition="before">
        <button mat-menu-item (click)="exportData('excel')">
          <mat-icon>table_chart</mat-icon>
          <span>导出为 Excel</span>
        </button>
        <button mat-menu-item (click)="exportData('pdf')">
          <mat-icon>picture_as_pdf</mat-icon>
          <span>导出为 PDF</span>
        </button>
        <button mat-menu-item (click)="exportData('csv')">
          <mat-icon>description</mat-icon>
          <span>导出为 CSV</span>
        </button>
      </mat-menu>

      <!-- 批量操作栏 -->
      <div class="bulk-actions" *ngIf="showBulkActions && selection.hasValue()">
        <span class="selected-count">
          已选择 {{ selection.selected.length }} 项
        </span>
        <button mat-icon-button (click)="selectAll()" matTooltip="全选">
          <mat-icon>select_all</mat-icon>
        </button>
        <button mat-icon-button (click)="clearSelection()" matTooltip="清除选择">
          <mat-icon>clear</mat-icon>
        </button>
        <button mat-raised-button color="primary" (click)="onBulkAction()">
          批量操作
        </button>
      </div>

      <!-- 加载状态 -->
      <div class="loading-overlay" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <span>加载中...</span>
      </div>

      <!-- 错误状态 -->
      <div class="error-state" *ngIf="error">
        <mat-icon color="warn">error</mat-icon>
        <span>{{ error }}</span>
        <button mat-raised-button color="primary" (click)="refreshData()">重试</button>
      </div>

      <!-- 数据表格 -->
      <div class="table-container" [class.empty-state]="!filteredData.length && !loading">
        <table mat-table
               [dataSource]="dataSource"
               matSort
               (matSortChange)="onSortChange($event)"
               [trackBy]="trackByFn">

          <!-- 选择列 -->
          <ng-container matColumnDef="select" *ngIf="showSelection">
            <th mat-header-cell *matHeaderCellDef>
              <mat-checkbox (change)="$event ? masterToggle() : null"
                           [checked]="selection.hasValue() && isAllSelected()"
                           [indeterminate]="selection.hasValue() && !isAllSelected()"
                           [aria-label]="checkboxLabel()">
              </mat-checkbox>
            </th>
            <td mat-cell *matCellDef="let row">
              <mat-checkbox (click)="$event.stopPropagation()"
                           (change)="$event ? selection.toggle(row) : null"
                           [checked]="selection.isSelected(row)"
                           [aria-label]="checkboxLabel(row)">
              </mat-checkbox>
            </td>
          </ng-container>

          <!-- 动态列 -->
          <ng-container *ngFor="let column of visibleColumns" [matColumnDef]="column.key">
            <th mat-header-cell
                *matHeaderCellDef
                mat-sort-header
                [disabled]="!column.sortable"
                [class.align-right]="column.align === 'right'"
                [class.align-center]="column.align === 'center'">
              {{ column.label }}
            </th>
            <td mat-cell
                *matCellDef="let row"
                [class.align-right]="column.align === 'right'"
                [class.align-center]="column.align === 'center'"
                [ngClass]="getColumnClass(column, row)">
              <ng-container [ngSwitch]="column.type">
                <!-- 文本类型 -->
                <span *ngSwitchCase="'text'">
                  {{ getCellValue(column, row) }}
                </span>

                <!-- 数字类型 -->
                <span *ngSwitchCase="'number'" class="number-cell">
                  {{ getCellValue(column, row) }}
                </span>

                <!-- 货币类型 -->
                <span *ngSwitchCase="'currency'" class="currency-cell">
                  {{ getCellValue(column, row) }}
                </span>

                <!-- 百分比类型 -->
                <span *ngSwitchCase="'percent'" class="percent-cell" [ngClass]="getPercentClass(row[column.key])">
                  {{ getCellValue(column, row) }}
                </span>

                <!-- 日期类型 -->
                <span *ngSwitchCase="'date'">
                  {{ getCellValue(column, row) }}
                </span>

                <!-- 徽章类型 -->
                <span *ngSwitchCase="'badge'" class="badge" [ngClass]="getBadgeClass(row[column.key])">
                  {{ getCellValue(column, row) }}
                </span>

                <!-- 操作类型 -->
                <div *ngSwitchCase="'action'" class="action-cell">
                  <button mat-icon-button
                          *ngFor="let action of getRowActions(row)"
                          [color]="action.color"
                          (click)="action.action(row)"
                          matTooltip="{{ action.label }}">
                    <mat-icon>{{ action.icon }}</mat-icon>
                  </button>
                </div>

                <!-- 默认 -->
                <span *ngSwitchDefault>
                  {{ getCellValue(column, row) }}
                </span>
              </ng-container>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="getRowColumns()"></tr>
          <tr mat-row *matRowDef="let row; columns: getRowColumns();"
              [class.selected-row]="selection.isSelected(row)"
              (click)="onRowClick(row)"></tr>
        </table>

        <!-- 空状态 -->
        <div class="empty-state-content" *ngIf="!filteredData.length && !loading">
          <mat-icon class="empty-icon">inbox</mat-icon>
          <div class="empty-title">暂无数据</div>
          <div class="empty-description">
            {{ hasActiveFilters ? '没有符合筛选条件的数据' : '没有可显示的数据' }}
          </div>
          <button mat-raised-button color="primary" (click)="clearFilters()" *ngIf="hasActiveFilters">
            清除筛选条件
          </button>
        </div>
      </div>

      <!-- 分页 -->
      <mat-paginator *ngIf="showPagination"
                     [length]="totalCount"
                     [pageSize]="pageSize"
                     [pageSizeOptions]="pageSizeOptions"
                     (page)="onPageChange($event)"
                     showFirstLastButtons
                     class="table-paginator">
      </mat-paginator>
    </div>
  `,
  styles: [`
    .data-table-wrapper {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .table-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #e0e0e0;
      gap: 16px;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .search-field {
      min-width: 250px;
    }

    .filter-menu-content,
    .column-menu-content {
      padding: 16px;
      min-width: 200px;
    }

    .menu-title {
      font-weight: 500;
      margin-bottom: 12px;
      color: #333333;
    }

    .column-checkbox {
      display: block;
      margin-bottom: 8px;
    }

    .filter-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      justify-content: flex-end;
    }

    .bulk-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background-color: #f5f5f5;
      border-bottom: 1px solid #e0e0e0;
    }

    .selected-count {
      font-size: 14px;
      color: #666666;
      margin-right: 8px;
    }

    .loading-overlay {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 60px 20px;
      gap: 16px;
    }

    .error-state {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 60px 20px;
      gap: 16px;
      text-align: center;
    }

    .error-state mat-icon {
      font-size: 48px;
    }

    .table-container {
      position: relative;
      min-height: 400px;
    }

    .table-container.empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    table {
      width: 100%;
    }

    .align-right {
      text-align: right;
    }

    .align-center {
      text-align: center;
    }

    .selected-row {
      background-color: #f5f5f5;
    }

    .number-cell {
      font-family: 'Roboto Mono', monospace;
      font-weight: 500;
    }

    .currency-cell {
      font-family: 'Roboto Mono', monospace;
      font-weight: 500;
      color: #2e7d32;
    }

    .percent-cell {
      font-family: 'Roboto Mono', monospace;
      font-weight: 500;
    }

    .percent-cell.positive {
      color: #2e7d32;
    }

    .percent-cell.negative {
      color: #d32f2f;
    }

    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      text-align: center;
    }

    .badge.normal {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .badge.suspended {
      background-color: #ffebee;
      color: #d32f2f;
    }

    .badge.low-risk {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .badge.medium-risk {
      background-color: #fff8e1;
      color: #f57c00;
    }

    .badge.high-risk {
      background-color: #ffebee;
      color: #d32f2f;
    }

    .action-cell {
      display: flex;
      gap: 4px;
      justify-content: center;
    }

    .empty-state-content {
      text-align: center;
      padding: 60px 20px;
    }

    .empty-icon {
      font-size: 64px;
      color: #cccccc;
      margin-bottom: 16px;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 500;
      color: #666666;
      margin-bottom: 8px;
    }

    .empty-description {
      font-size: 14px;
      color: #999999;
      margin-bottom: 24px;
    }

    .table-paginator {
      border-top: 1px solid #e0e0e0;
    }

    @media (max-width: 768px) {
      .table-toolbar {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }

      .toolbar-left {
        flex-direction: column;
        gap: 12px;
      }

      .search-field {
        width: 100%;
        min-width: unset;
      }

      .toolbar-right {
        justify-content: center;
      }

      .bulk-actions {
        flex-wrap: wrap;
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .filter-menu-content,
      .column-menu-content {
        padding: 12px;
        min-width: 150px;
      }

      .filter-actions {
        flex-direction: column;
      }
    }
  `]
})
export class FundDataTableComponent implements OnInit, OnChanges, AfterViewInit {
  // 输入属性
  @Input() data: Fund[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() loading: boolean = false;
  @Input() error: string | null = null;
  @Input() showToolbar: boolean = true;
  @Input() showSelection: boolean = true;
  @Input() showBulkActions: boolean = true;
  @Input() showPagination: boolean = true;
  @Input() showViewMode: boolean = false;
  @Input() pageSize: number = 20;
  @Input() pageSizeOptions: number[] = [10, 20, 50, 100];
  @Input() actions: TableAction[] = [];

  // 输出事件
  @Output() rowClick = new EventEmitter<Fund>();
  @Output() selectionChange = new EventEmitter<Fund[]>();
  @Output() filterChange = new EventEmitter<FilterOptions>();
  @Output() sortChange = new EventEmitter<{ active: string; direction: string }>();
  @Output() pageChange = new EventEmitter<{ pageIndex: number; pageSize: number }>();
  @Output() refresh = new EventEmitter<void>();
  @Output() export = new EventEmitter<{ format: string; data: Fund[] }>();
  @Output() bulkAction = new EventEmitter<Fund[]>();

  // ViewChild
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // 内部状态
  dataSource = new MatTableDataSource<Fund>();
  selection = new SelectionModel<Fund>(true, []);
  filteredData: Fund[] = [];
  availableColumns: TableColumn[] = [];
  visibleColumns: TableColumn[] = [];
  viewMode: 'table' | 'card' = 'table';

  // 筛选选项
  filterOptions: FilterOptions = {
    search: '',
    type: '',
    riskLevel: '',
    status: '',
    minChange: -Infinity,
    maxChange: Infinity
  };

  // 分页状态
  totalCount: number = 0;
  currentPageIndex: number = 0;
  currentPageSize: number = 20;

  get hasActiveFilters(): boolean {
    return !!(
      this.filterOptions.search ||
      this.filterOptions.type ||
      this.filterOptions.riskLevel ||
      this.filterOptions.status ||
      this.filterOptions.minChange > -Infinity ||
      this.filterOptions.maxChange < Infinity
    );
  }

  ngOnInit(): void {
    this.initializeColumns();
    this.updateDataSource();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.updateDataSource();
    }
    if (changes['columns']) {
      this.initializeColumns();
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * 初始化列配置
   */
  private initializeColumns(): void {
    if (this.columns.length === 0) {
      // 默认列配置
      this.availableColumns = [
        { key: 'code', label: '基金代码', type: 'text', sortable: true, filterable: true },
        { key: 'name', label: '基金名称', type: 'text', sortable: true, filterable: true },
        { key: 'type', label: '基金类型', type: 'badge', sortable: true, filterable: true },
        { key: 'nav', label: '单位净值', type: 'currency', sortable: true, align: 'right' },
        { key: 'dailyChange', label: '日涨跌幅', type: 'percent', sortable: true, align: 'right' },
        { key: 'riskLevel', label: '风险等级', type: 'badge', sortable: true, filterable: true },
        { key: 'manager', label: '基金经理', type: 'text', sortable: true, filterable: true },
        { key: 'status', label: '状态', type: 'badge', sortable: true, filterable: true }
      ];
    } else {
      this.availableColumns = this.columns.map(col => ({ ...col, visible: col.visible !== false }));
    }

    this.visibleColumns = this.availableColumns.filter(col => col.visible !== false);
  }

  /**
   * 更新数据源
   */
  private updateDataSource(): void {
    this.dataSource.data = this.data;
    this.applyFilter();
  }

  /**
   * 应用筛选
   */
  applyFilter(): void {
    if (!this.data || this.data.length === 0) {
      this.filteredData = [];
      this.dataSource.data = [];
      return;
    }

    let filtered = [...this.data];

    // 文本搜索
    if (this.filterOptions.search) {
      const searchLower = this.filterOptions.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.code.toLowerCase().includes(searchLower)
      );
    }

    // 类型筛选
    if (this.filterOptions.type) {
      filtered = filtered.filter(item => item.type === this.filterOptions.type);
    }

    // 风险等级筛选
    if (this.filterOptions.riskLevel) {
      filtered = filtered.filter(item => item.riskLevel === this.filterOptions.riskLevel);
    }

    // 状态筛选
    if (this.filterOptions.status) {
      filtered = filtered.filter(item => item.status === this.filterOptions.status);
    }

    // 涨跌幅范围筛选
    filtered = filtered.filter(item =>
      item.dailyChange >= this.filterOptions.minChange &&
      item.dailyChange <= this.filterOptions.maxChange
    );

    this.filteredData = filtered;
    this.dataSource.data = filtered;
    this.totalCount = filtered.length;

    // 重置分页
    if (this.paginator) {
      this.paginator.firstPage();
    }

    this.filterChange.emit(this.filterOptions);
  }

  /**
   * 清除筛选
   */
  clearFilters(): void {
    this.filterOptions = {
      search: '',
      type: '',
      riskLevel: '',
      status: '',
      minChange: -Infinity,
      maxChange: Infinity
    };
    this.applyFilter();
  }

  /**
   * 更新可见列
   */
  updateVisibleColumns(): void {
    this.visibleColumns = this.availableColumns.filter(col => col.visible !== false);
    // 重新渲染表格
    this.updateDataSource();
  }

  /**
   * 排序变更
   */
  onSortChange(event: any): void {
    this.sortChange.emit({
      active: event.active,
      direction: event.direction
    });
  }

  /**
   * 分页变更
   */
  onPageChange(event: any): void {
    this.currentPageIndex = event.pageIndex;
    this.currentPageSize = event.pageSize;
    this.pageChange.emit({
      pageIndex: event.pageIndex,
      pageSize: event.pageSize
    });
  }

  /**
   * 视图模式变更
   */
  onViewModeChange(event: any): void {
    this.viewMode = event.value;
  }

  /**
   * 行点击
   */
  onRowClick(row: Fund): void {
    this.rowClick.emit(row);
  }

  /**
   * 获取单元格值
   */
  getCellValue(column: TableColumn, row: Fund): string {
    const value = row[column.key];

    if (column.formatter) {
      return column.formatter(value, row);
    }

    switch (column.type) {
      case 'currency':
        return `¥${value?.toLocaleString('zh-CN', { minimumFractionDigits: 4 }) || '0.0000'}`;
      case 'percent':
        return `${(value * 100).toFixed(2)}%`;
      case 'date':
        return value ? new Date(value).toLocaleDateString('zh-CN') : '-';
      default:
        return value || '-';
    }
  }

  /**
   * 获取列样式类
   */
  getColumnClass(column: TableColumn, row: Fund): string {
    if (column.class) {
      return column.class(row[column.key], row);
    }
    return '';
  }

  /**
   * 获取百分比样式类
   */
  getPercentClass(value: number): string {
    return value > 0 ? 'positive' : value < 0 ? 'negative' : '';
  }

  /**
   * 获取徽章样式类
   */
  getBadgeClass(value: string): string {
    switch (value) {
      case '正常':
        return 'normal';
      case '暂停':
        return 'suspended';
      case '低风险':
        return 'low-risk';
      case '中低风险':
      case '中等风险':
        return 'medium-risk';
      case '中高风险':
      case '高风险':
        return 'high-risk';
      default:
        return '';
    }
  }

  /**
   * 获取行操作
   */
  getRowActions(row: Fund): TableAction[] {
    return this.actions.filter(action => !action.condition || action.condition(row));
  }

  /**
   * 获取表格列定义
   */
  getRowColumns(): string[] {
    const columns = [];

    if (this.showSelection) {
      columns.push('select');
    }

    columns.push(...this.visibleColumns.map(col => col.key));

    return columns;
  }

  /**
   * 选择相关方法
   */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows && numRows > 0;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.dataSource.data.forEach(row => this.selection.select(row));
    }
    this.selectionChange.emit(this.selection.selected);
  }

  selectAll(): void {
    this.dataSource.data.forEach(row => this.selection.select(row));
    this.selectionChange.emit(this.selection.selected);
  }

  clearSelection(): void {
    this.selection.clear();
    this.selectionChange.emit(this.selection.selected);
  }

  checkboxLabel(row?: Fund): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.id}`;
  }

  /**
   * 批量操作
   */
  onBulkAction(): void {
    this.bulkAction.emit(this.selection.selected);
  }

  /**
   * 刷新数据
   */
  refreshData(): void {
    this.refresh.emit();
  }

  /**
   * 导出数据
   */
  exportData(format: string): void {
    this.export.emit({
      format,
      data: this.filteredData
    });
  }

  /**
   * TrackBy 函数
   */
  trackByFn(index: number, item: Fund): string {
    return item.id;
  }
}