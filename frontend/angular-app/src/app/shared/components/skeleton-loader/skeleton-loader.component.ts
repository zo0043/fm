import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * 骨架屏加载组件
 * 用于数据加载时显示占位内容，提升用户体验
 *
 * 使用方法：
 * <app-skeleton-loader type="card" [count]="3"></app-skeleton-loader>
 * <app-skeleton-loader type="table" [rows]="5"></app-skeleton-loader>
 * <app-skeleton-loader type="text" [lines]="3"></app-skeleton-loader>
 */
@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-container" [class]="'skeleton-' + type">
      <!-- 卡片骨架 -->
      <ng-container *ngIf="type === 'card'">
        <div class="skeleton-card" *ngFor="let item of items">
          <div class="skeleton-card-header">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-header-text">
              <div class="skeleton-line skeleton-title"></div>
              <div class="skeleton-line skeleton-subtitle"></div>
            </div>
          </div>
          <div class="skeleton-card-body">
            <div class="skeleton-line" *ngFor="let line of [1,2,3]" [style.width.%]="getRandomWidth()"></div>
          </div>
          <div class="skeleton-card-footer">
            <div class="skeleton-button"></div>
            <div class="skeleton-button"></div>
          </div>
        </div>
      </ng-container>

      <!-- 表格骨架 -->
      <ng-container *ngIf="type === 'table'">
        <div class="skeleton-table">
          <div class="skeleton-table-header">
            <div class="skeleton-cell" *ngFor="let col of columns" [style.width.%]="100/columns.length"></div>
          </div>
          <div class="skeleton-table-row" *ngFor="let row of tableRows">
            <div class="skeleton-cell" *ngFor="let col of columns" [style.width.%]="100/columns.length">
              <div class="skeleton-line" [style.width.%]="getRandomWidth()"></div>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- 文本骨架 -->
      <ng-container *ngIf="type === 'text'">
        <div class="skeleton-text">
          <div class="skeleton-line" *ngFor="let line of textLines; let last = last"
               [style.width.%]="last ? 60 : getRandomWidth()"></div>
        </div>
      </ng-container>

      <!-- 列表骨架 -->
      <ng-container *ngIf="type === 'list'">
        <div class="skeleton-list-item" *ngFor="let item of items">
          <div class="skeleton-avatar" [class.skeleton-avatar-sm]="avatarSize === 'small'"></div>
          <div class="skeleton-list-content">
            <div class="skeleton-line skeleton-title" style="width: 40%"></div>
            <div class="skeleton-line" style="width: 80%"></div>
          </div>
        </div>
      </ng-container>

      <!-- 图表骨架 -->
      <ng-container *ngIf="type === 'chart'">
        <div class="skeleton-chart">
          <div class="skeleton-chart-title"></div>
          <div class="skeleton-chart-area">
            <div class="skeleton-chart-bar" *ngFor="let bar of chartBars"
                 [style.height.%]="bar"></div>
          </div>
          <div class="skeleton-chart-legend">
            <div class="skeleton-legend-item" *ngFor="let i of [1,2,3]"></div>
          </div>
        </div>
      </ng-container>

      <!-- 详情骨架 -->
      <ng-container *ngIf="type === 'detail'">
        <div class="skeleton-detail">
          <div class="skeleton-detail-header">
            <div class="skeleton-avatar skeleton-avatar-lg"></div>
            <div class="skeleton-detail-title">
              <div class="skeleton-line skeleton-title" style="width: 60%"></div>
              <div class="skeleton-line" style="width: 40%"></div>
            </div>
          </div>
          <div class="skeleton-detail-stats">
            <div class="skeleton-stat" *ngFor="let i of [1,2,3,4]">
              <div class="skeleton-line" style="width: 50%"></div>
              <div class="skeleton-line skeleton-title" style="width: 70%"></div>
            </div>
          </div>
          <div class="skeleton-detail-content">
            <div class="skeleton-line" *ngFor="let i of [1,2,3,4,5]" [style.width.%]="getRandomWidth()"></div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .skeleton-container {
      width: 100%;
    }

    /* 骨架动画 */
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .skeleton-line,
    .skeleton-avatar,
    .skeleton-button,
    .skeleton-cell,
    .skeleton-chart-bar,
    .skeleton-chart-title,
    .skeleton-legend-item {
      background: linear-gradient(
        90deg,
        #f0f0f0 25%,
        #e0e0e0 50%,
        #f0f0f0 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }

    .skeleton-line {
      height: 14px;
      margin-bottom: 10px;
      width: 100%;
    }

    .skeleton-title {
      height: 18px;
      width: 60%;
    }

    .skeleton-subtitle {
      height: 12px;
      width: 40%;
    }

    .skeleton-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .skeleton-avatar-sm {
      width: 32px;
      height: 32px;
    }

    .skeleton-avatar-lg {
      width: 64px;
      height: 64px;
    }

    /* 卡片骨架 */
    .skeleton-card {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .skeleton-card-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .skeleton-header-text {
      flex: 1;
    }

    .skeleton-card-body {
      margin-bottom: 20px;
    }

    .skeleton-card-footer {
      display: flex;
      gap: 12px;
    }

    .skeleton-button {
      width: 80px;
      height: 36px;
      border-radius: 18px;
    }

    /* 表格骨架 */
    .skeleton-table {
      width: 100%;
    }

    .skeleton-table-header,
    .skeleton-table-row {
      display: flex;
      padding: 16px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .skeleton-table-header {
      background: #fafafa;
    }

    .skeleton-cell {
      padding: 0 12px;
    }

    /* 列表骨架 */
    .skeleton-list-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .skeleton-list-content {
      flex: 1;
    }

    /* 图表骨架 */
    .skeleton-chart {
      padding: 20px;
      background: #fff;
      border-radius: 12px;
    }

    .skeleton-chart-title {
      width: 120px;
      height: 20px;
      margin-bottom: 24px;
    }

    .skeleton-chart-area {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      height: 200px;
      padding: 0 20px;
    }

    .skeleton-chart-bar {
      flex: 1;
      min-height: 20px;
      border-radius: 4px 4px 0 0;
    }

    .skeleton-chart-legend {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 20px;
    }

    .skeleton-legend-item {
      width: 60px;
      height: 16px;
    }

    /* 详情骨架 */
    .skeleton-detail {
      padding: 24px;
    }

    .skeleton-detail-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 32px;
    }

    .skeleton-detail-title {
      flex: 1;
    }

    .skeleton-detail-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      margin-bottom: 32px;
      padding: 24px;
      background: #fafafa;
      border-radius: 12px;
    }

    .skeleton-stat {
      text-align: center;
    }

    .skeleton-stat .skeleton-line {
      margin: 0 auto 8px;
    }

    .skeleton-detail-content {
      padding-top: 24px;
      border-top: 1px solid #f0f0f0;
    }

    /* 网格布局 */
    .skeleton-card:only-child {
      margin-bottom: 0;
    }

    :host-context(.grid) .skeleton-card {
      margin-bottom: 0;
    }
  `]
})
export class SkeletonLoaderComponent {
  @Input() type: 'card' | 'table' | 'text' | 'list' | 'chart' | 'detail' = 'card';
  @Input() count: number = 1;
  @Input() rows: number = 5;
  @Input() lines: number = 3;
  @Input() avatarSize: 'small' | 'medium' | 'large' = 'medium';

  get items(): number[] {
    return Array(this.count).fill(0);
  }

  get tableRows(): number[] {
    return Array(this.rows).fill(0);
  }

  get textLines(): number[] {
    return Array(this.lines).fill(0);
  }

  get columns(): number[] {
    return Array(5).fill(0); // 默认5列
  }

  get chartBars(): number[] {
    return [60, 80, 40, 90, 50, 70, 85, 45, 75, 55];
  }

  getRandomWidth(): number {
    return Math.floor(Math.random() * 40) + 60; // 60-100%
  }
}
