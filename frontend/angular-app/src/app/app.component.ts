import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule
  ],
  template: `
    <mat-toolbar color="primary">
      <span>基金监控应用</span>
      <span class="version">v1.0.0</span>
      <span class="status">开发中</span>
    </mat-toolbar>
    <div class="app-content">
      <h1>🚀� 基金监控仪表盘</h1>
      <p>专业的基金投资组合监控应用</p>
    </div>
  `,
  styleUrls: [': [`
    .app-root {
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    }

    .app-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: $spacing-xl;
    }

    .page-title {
      font-size: $font-size-xxl;
      font-weight: 600;
      color: #333;
      margin-bottom: $spacing-lg;
    }

    .status {
      color: #666;
      font-size: $font-size-sm;
    }
  }
  `]
})