import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

/**
 * 空状态组件
 * 用于展示列表为空或加载失败等状态
 *
 * 使用方法：
 * <app-empty-state
 *   icon="inbox"
 *   title="暂无数据"
 *   description="您还没有添加任何基金到关注列表"
 *   [actionLabel]="'添加基金'"
 *   (action)="onAddFund()">
 * </app-empty-state>
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="empty-state-container" [class]="'empty-state-' + variant">
      <!-- 图标/插画区域 -->
      <div class="empty-state-icon" [class.animated]="animated">
        <ng-container *ngIf="!customIcon">
          <mat-icon [style.color]="iconColor">{{ icon }}</mat-icon>
        </ng-container>
        <ng-content select="[emptyIcon]"></ng-content>
      </div>

      <!-- 标题 -->
      <h3 class="empty-state-title" *ngIf="title">{{ title }}</h3>

      <!-- 描述 -->
      <p class="empty-state-description" *ngIf="description">{{ description }}</p>

      <!-- 自定义内容 -->
      <ng-content></ng-content>

      <!-- 操作按钮 -->
      <div class="empty-state-actions" *ngIf="actionLabel">
        <button
          mat-raised-button
          [color]="actionColor"
          (click)="onActionClick()">
          <mat-icon *ngIf="actionIcon">{{ actionIcon }}</mat-icon>
          {{ actionLabel }}
        </button>
      </div>

      <!-- 辅助操作 -->
      <div class="empty-state-secondary" *ngIf="secondaryLabel">
        <button mat-button (click)="onSecondaryClick()">
          {{ secondaryLabel }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .empty-state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      min-height: 300px;
    }

    .empty-state-icon {
      margin-bottom: 24px;

      mat-icon {
        font-size: 80px;
        width: 80px;
        height: 80px;
        opacity: 0.6;
      }

      &.animated mat-icon {
        animation: float 3s ease-in-out infinite;
      }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .empty-state-title {
      font-size: 20px;
      font-weight: 500;
      color: #333;
      margin: 0 0 12px;
    }

    .empty-state-description {
      font-size: 14px;
      color: #666;
      margin: 0 0 24px;
      max-width: 400px;
      line-height: 1.6;
    }

    .empty-state-actions {
      margin-top: 8px;

      button {
        min-width: 140px;
        height: 44px;
        font-size: 14px;

        mat-icon {
          margin-right: 8px;
        }
      }
    }

    .empty-state-secondary {
      margin-top: 16px;

      button {
        color: #666;
      }
    }

    /* 变体样式 */
    .empty-state-compact {
      padding: 24px 16px;
      min-height: 200px;

      .empty-state-icon mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
      }

      .empty-state-title {
        font-size: 16px;
      }

      .empty-state-description {
        font-size: 13px;
      }
    }

    .empty-state-inline {
      flex-direction: row;
      padding: 24px;
      min-height: auto;
      text-align: left;
      gap: 24px;

      .empty-state-icon {
        margin-bottom: 0;

        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
        }
      }

      .empty-state-title {
        margin-bottom: 8px;
      }

      .empty-state-description {
        margin-bottom: 16px;
      }
    }

    .empty-state-error {
      .empty-state-icon mat-icon {
        color: #f44336;
      }
    }

    .empty-state-success {
      .empty-state-icon mat-icon {
        color: #4caf50;
      }
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon: string = 'inbox';
  @Input() customIcon: boolean = false;
  @Input() iconColor: string = '#9e9e9e';
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() actionLabel: string = '';
  @Input() actionIcon: string = '';
  @Input() actionColor: 'primary' | 'accent' | 'warn' = 'primary';
  @Input() secondaryLabel: string = '';
  @Input() variant: 'default' | 'compact' | 'inline' | 'error' | 'success' = 'default';
  @Input() animated: boolean = true;

  onActionClick(): void {
    // 通过 EventEmitter 发射事件
  }

  onSecondaryClick(): void {
    // 通过 EventEmitter 发射事件
  }
}
