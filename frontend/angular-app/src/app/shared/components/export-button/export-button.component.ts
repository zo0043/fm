import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

export interface ExportOption {
  label: string;
  format: 'excel' | 'pdf' | 'csv';
  icon: string;
  description?: string;
  disabled?: boolean;
}

export interface ExportProgress {
  format: string;
  percentage: number;
  status: 'preparing' | 'processing' | 'completed' | 'error';
  message: string;
}

@Component({
  selector: 'app-export-button',
  template: `
    <div class="export-button-wrapper">
      <!-- 主按钮 -->
      <button mat-raised-button
              [color]="color"
              [disabled]="loading || disabled"
              [matMenuTriggerFor]="exportMenu"
              class="export-main-button">
        <mat-icon>{{ icon }}</mat-icon>
        <span>{{ label }}</span>
        <mat-icon *ngIf="!loading">arrow_drop_down</mat-icon>
        <mat-spinner *ngIf="loading" diameter="16" class="button-spinner"></mat-spinner>
      </button>

      <!-- 导出菜单 -->
      <mat-menu #exportMenu="matMenu" xPosition="before" class="export-menu">
        <div class="export-menu-header">
          <div class="menu-title">选择导出格式</div>
          <div class="menu-subtitle" *ngIf="subtitle">{{ subtitle }}</div>
        </div>

        <mat-divider></mat-divider>

        <div class="export-options">
          <button mat-menu-item
                  *ngFor="let option of exportOptions"
                  (click)="onExportOptionClick(option)"
                  [disabled]="option.disabled || getExportProgress(option.format)?.status === 'processing'">
            <mat-icon>{{ option.icon }}</mat-icon>
            <div class="option-content">
              <div class="option-label">{{ option.label }}</div>
              <div class="option-description" *ngIf="option.description">{{ option.description }}</div>
              <!-- 进度条 -->
              <div class="option-progress" *ngIf="getExportProgress(option.format)?.status === 'processing'">
                <mat-progress-bar mode="determinate" [value]="getExportProgress(option.format)?.percentage"></mat-progress-bar>
                <span class="progress-text">{{ getExportProgress(option.format)?.percentage }}%</span>
              </div>
              <!-- 完成状态 -->
              <div class="option-success" *ngIf="getExportProgress(option.format)?.status === 'completed'">
                <mat-icon color="primary">check_circle</mat-icon>
                <span class="success-text">导出完成</span>
              </div>
              <!-- 错误状态 -->
              <div class="option-error" *ngIf="getExportProgress(option.format)?.status === 'error'">
                <mat-icon color="warn">error</mat-icon>
                <span class="error-text">{{ getExportProgress(option.format)?.message }}</span>
              </div>
            </div>
            <mat-icon *ngIf="getExportProgress(option.format)?.status === 'processing'"
                     class="processing-spinner"
                     [matSpinner]="true"
                     diameter="16"></mat-icon>
          </button>
        </div>

        <mat-divider *ngIf="showAdvancedOptions"></mat-divider>

        <!-- 高级选项 -->
        <div class="advanced-options" *ngIf="showAdvancedOptions">
          <button mat-menu-item (click)="onCustomExportClick()">
            <mat-icon>settings</mat-icon>
            <span>自定义导出</span>
          </button>
          <button mat-menu-item (click)="onScheduleExportClick()">
            <mat-icon>schedule</mat-icon>
            <span>定时导出</span>
          </button>
          <button mat-menu-item (click)="onExportHistoryClick()">
            <mat-icon>history</mat-icon>
            <span>导出历史</span>
          </button>
        </div>
      </mat-menu>

      <!-- 快速导出按钮组 -->
      <div class="quick-export-buttons" *ngIf="showQuickActions">
        <button mat-icon-button
                *ngFor="let option of quickExportOptions"
                [color]="option.color || 'default'"
                [disabled]="loading"
                (click)="onExportOptionClick(option)"
                matTooltip="{{ option.tooltip || option.label }}">
          <mat-icon>{{ option.icon }}</mat-icon>
        </button>
      </div>

      <!-- 导出进度弹窗 -->
      <div class="export-progress-dialog" *ngIf="showProgressDialog && hasActiveExports">
        <mat-card class="progress-card">
          <mat-card-header>
            <mat-card-title>导出进度</mat-card-title>
            <button mat-icon-button (click)="closeProgressDialog()">
              <mat-icon>close</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content>
            <div class="progress-list">
              <div class="progress-item" *ngFor="let progress of activeExports">
                <div class="progress-info">
                  <mat-icon>{{ getExportOption(progress.format)?.icon }}</mat-icon>
                  <span class="progress-label">{{ getExportOption(progress.format)?.label }}</span>
                </div>
                <div class="progress-bar-container">
                  <mat-progress-bar
                    mode="determinate"
                    [value]="progress.percentage"
                    [color]="progress.status === 'error' ? 'warn' : 'primary'">
                  </mat-progress-bar>
                  <span class="progress-percentage">{{ progress.percentage }}%</span>
                </div>
                <div class="progress-message">{{ progress.message }}</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .export-button-wrapper {
      position: relative;
      display: inline-block;
    }

    .export-main-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 16px;
      min-width: 120px;
    }

    .button-spinner {
      margin: 0;
    }

    .export-menu {
      min-width: 280px;
    }

    .export-menu-header {
      padding: 16px;
      background-color: #fafafa;
    }

    .menu-title {
      font-size: 16px;
      font-weight: 500;
      color: #333333;
      margin-bottom: 4px;
    }

    .menu-subtitle {
      font-size: 12px;
      color: #666666;
    }

    .export-options {
      padding: 8px 0;
    }

    .option-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .option-label {
      font-size: 14px;
      font-weight: 500;
      color: #333333;
    }

    .option-description {
      font-size: 12px;
      color: #666666;
      line-height: 1.4;
    }

    .option-progress {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }

    .option-progress mat-progress-bar {
      flex: 1;
      height: 4px;
    }

    .progress-text {
      font-size: 11px;
      color: #1976d2;
      font-weight: 500;
      min-width: 32px;
    }

    .option-success {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
    }

    .option-success mat-icon {
      font-size: 16px;
      height: 16px;
      width: 16px;
    }

    .success-text {
      font-size: 12px;
      color: #2e7d32;
      font-weight: 500;
    }

    .option-error {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
    }

    .option-error mat-icon {
      font-size: 16px;
      height: 16px;
      width: 16px;
    }

    .error-text {
      font-size: 12px;
      color: #d32f2f;
      font-weight: 500;
    }

    .processing-spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .advanced-options {
      padding: 8px 0;
    }

    .quick-export-buttons {
      display: flex;
      gap: 4px;
      margin-left: 8px;
    }

    .export-progress-dialog {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .progress-card {
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow: auto;
    }

    .progress-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .progress-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .progress-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .progress-label {
      font-weight: 500;
      color: #333333;
    }

    .progress-bar-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .progress-bar-container mat-progress-bar {
      flex: 1;
    }

    .progress-percentage {
      font-size: 12px;
      color: #666666;
      min-width: 40px;
      text-align: right;
    }

    .progress-message {
      font-size: 12px;
      color: #666666;
    }

    @media (max-width: 768px) {
      .export-menu {
        min-width: 240px;
      }

      .quick-export-buttons {
        flex-direction: column;
        gap: 2px;
        margin-left: 0;
        margin-top: 4px;
      }

      .progress-card {
        width: 95%;
        margin: 16px;
      }
    }
  `]
})
export class ExportButtonComponent {
  // 输入属性
  @Input() label: string = '导出';
  @Input() icon: string = 'download';
  @Input() color: 'primary' | 'accent' | 'warn' | 'default' = 'primary';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() subtitle: string = '';
  @Input() showAdvancedOptions: boolean = false;
  @Input() showQuickActions: boolean = false;
  @Input() showProgressDialog: boolean = true;
  @Input() exportOptions: ExportOption[] = [
    {
      label: 'Excel 表格',
      format: 'excel',
      icon: 'table_chart',
      description: '导出为 Microsoft Excel 格式，支持完整的数据和格式'
    },
    {
      label: 'PDF 文档',
      format: 'pdf',
      icon: 'picture_as_pdf',
      description: '导出为 PDF 格式，适合打印和分享'
    },
    {
      label: 'CSV 文件',
      format: 'csv',
      icon: 'description',
      description: '导出为 CSV 格式，可被大多数数据处理软件打开'
    }
  ];

  // 快速导出选项
  @Input() quickExportOptions: ExportOption[] = [];

  // 输出事件
  @Output() exportClick = new EventEmitter<{ format: string; option: ExportOption }>();
  @Output() customExport = new EventEmitter<void>();
  @Output() scheduleExport = new EventEmitter<void>();
  @Output() exportHistory = new EventEmitter<void>();
  @Output() progressComplete = new EventEmitter<{ format: string; success: boolean }>();

  // ViewChild
  @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;

  // 内部状态
  exportProgress: Map<string, ExportProgress> = new Map();

  get activeExports(): ExportProgress[] {
    return Array.from(this.exportProgress.values()).filter(
      progress => progress.status === 'preparing' || progress.status === 'processing'
    );
  }

  get hasActiveExports(): boolean {
    return this.activeExports.length > 0;
  }

  /**
   * 导出选项点击
   */
  onExportOptionClick(option: ExportOption): void {
    if (option.disabled) return;

    // 初始化进度
    this.exportProgress.set(option.format, {
      format: option.format,
      percentage: 0,
      status: 'preparing',
      message: '准备导出...'
    });

    // 触发导出事件
    this.exportClick.emit({ format: option.format, option });

    // 关闭菜单
    this.menuTrigger.closeMenu();
  }

  /**
   * 自定义导出点击
   */
  onCustomExportClick(): void {
    this.customExport.emit();
    this.menuTrigger.closeMenu();
  }

  /**
   * 定时导出点击
   */
  onScheduleExportClick(): void {
    this.scheduleExport.emit();
    this.menuTrigger.closeMenu();
  }

  /**
   * 导出历史点击
   */
  onExportHistoryClick(): void {
    this.exportHistory.emit();
    this.menuTrigger.closeMenu();
  }

  /**
   * 更新导出进度
   */
  updateProgress(format: string, progress: Partial<ExportProgress>): void {
    const current = this.exportProgress.get(format);
    if (current) {
      this.exportProgress.set(format, { ...current, ...progress });
    }

    // 检查是否完成
    if (progress.status === 'completed' || progress.status === 'error') {
      setTimeout(() => {
        this.progressComplete.emit({
          format,
          success: progress.status === 'completed'
        });

        // 3秒后清除进度
        setTimeout(() => {
          this.exportProgress.delete(format);
        }, 3000);
      }, 1000);
    }
  }

  /**
   * 获取导出进度
   */
  getExportProgress(format: string): ExportProgress | undefined {
    return this.exportProgress.get(format);
  }

  /**
   * 获取导出选项
   */
  getExportOption(format: string): ExportOption | undefined {
    return this.exportOptions.find(option => option.format === format);
  }

  /**
   * 关闭进度对话框
   */
  closeProgressDialog(): void {
    // 清除已完成的进度
    const completedFormats: string[] = [];
    this.exportProgress.forEach((progress, format) => {
      if (progress.status === 'completed' || progress.status === 'error') {
        completedFormats.push(format);
      }
    });

    completedFormats.forEach(format => {
      this.exportProgress.delete(format);
    });
  }

  /**
   * 清除所有进度
   */
  clearAllProgress(): void {
    this.exportProgress.clear();
  }

  /**
   * 模拟导出进度（用于演示）
   */
  simulateExportProgress(format: string): void {
    let percentage = 0;
    const interval = setInterval(() => {
      percentage += Math.random() * 20;

      if (percentage >= 100) {
        percentage = 100;
        clearInterval(interval);
        this.updateProgress(format, {
          percentage: 100,
          status: 'completed',
          message: '导出完成！'
        });
      } else {
        this.updateProgress(format, {
          percentage: Math.floor(percentage),
          status: 'processing',
          message: `正在导出... ${Math.floor(percentage)}%`
        });
      }
    }, 500);
  }

  /**
   * 快速导出（一键导出为默认格式）
   */
  quickExport(format: string = 'excel'): void {
    const option = this.exportOptions.find(opt => opt.format === format);
    if (option) {
      this.onExportOptionClick(option);
    }
  }

  /**
   * 批量导出
   */
  batchExport(formats: string[]): void {
    formats.forEach((format, index) => {
      setTimeout(() => {
        this.quickExport(format);
      }, index * 500); // 错开执行时间
    });
  }
}