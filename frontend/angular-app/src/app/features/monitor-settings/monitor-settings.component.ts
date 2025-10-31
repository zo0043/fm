import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// 导入服务
import { FundService } from '../../core/services/fund.service';

// 使用方法：在路由配置中使用
// { path: 'monitor', component: MonitorSettingsComponent }

@Component({
  selector: 'app-monitor-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatCheckboxModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatRadioModule,
    MatSnackBar,
    MatDividerModule,
    MatTabsModule,
    MatExpansionModule,
    MatChipModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './monitor-settings.component.html',
  styleUrls: ['./monitor-settings.component.scss']
})
export class MonitorSettingsComponent implements OnInit {
  // 监控规则配置
  monitorRules = [
    {
      id: 1,
      name: '涨跌幅监控',
      description: '监控基金每日涨跌幅变化',
      enabled: true,
      thresholdType: 'percent',
      upThreshold: 5.0,
      downThreshold: -5.0,
      notificationType: ['wechat', 'email']
    },
    {
      id: 2,
      name: '净值突破监控',
      description: '监控基金净值突破关键点位',
      enabled: true,
      thresholdType: 'value',
      upThreshold: 2.0,
      downThreshold: 1.0,
      notificationType: ['wechat']
    },
    {
      id: 3,
      name: '周收益监控',
      description: '监控基金一周累计收益',
      enabled: false,
      thresholdType: 'percent',
      upThreshold: 10.0,
      downThreshold: -8.0,
      notificationType: ['email']
    }
  ];

  // 通知配置
  notificationSettings = {
    wechat: {
      enabled: true,
      webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=your-key',
      mentionUsers: ['@all'],
      secret: 'your-secret'
    },
    email: {
      enabled: true,
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      username: 'your-email@example.com',
      password: 'your-password',
      recipients: ['user@example.com']
    }
  };

  // 监控频率配置
  monitoringFrequency = {
    realtime: true,
    interval: 300, // 5分钟
    marketHoursOnly: true,
    weekdaysOnly: false
  };

  // 全局设置
  globalSettings = {
    enableSound: true,
    enableNotification: true,
    enableAutoRefresh: true,
    dataRetention: 30 // 天
  };

  constructor(
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  // 加载设置
  private loadSettings(): void {
    // 这里可以从后端API加载设置
    console.log('加载监控设置...');
  }

  // 保存设置
  saveSettings(): void {
    // 这里可以保存到后端API
    this.snackBar.open('监控设置已保存', '关闭', { duration: 3000 });
    console.log('保存监控设置:', {
      rules: this.monitorRules,
      notifications: this.notificationSettings,
      frequency: this.monitoringFrequency,
      global: this.globalSettings
    });
  }

  // 重置设置
  resetSettings(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: '重置设置',
        message: '确定要重置所有监控设置到默认值吗？',
        confirmText: '确定',
        cancelText: '取消'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDefaultSettings();
        this.snackBar.open('设置已重置', '关闭', { duration: 3000 });
      }
    });
  }

  // 加载默认设置
  private loadDefaultSettings(): void {
    // 重置为默认值
    this.monitorRules = [
      {
        id: 1,
        name: '涨跌幅监控',
        description: '监控基金每日涨跌幅变化',
        enabled: true,
        thresholdType: 'percent',
        upThreshold: 5.0,
        downThreshold: -5.0,
        notificationType: ['wechat', 'email']
      }
    ];
  }

  // 添加监控规则
  addMonitorRule(): void {
    const newRule = {
      id: Date.now(),
      name: '新监控规则',
      description: '自定义监控规则',
      enabled: true,
      thresholdType: 'percent' as 'percent' | 'value',
      upThreshold: 3.0,
      downThreshold: -3.0,
      notificationType: ['wechat']
    };
    this.monitorRules.push(newRule);
    this.snackBar.open('已添加新监控规则', '关闭', { duration: 2000 });
  }

  // 删除监控规则
  deleteMonitorRule(ruleId: number): void {
    this.monitorRules = this.monitorRules.filter(rule => rule.id !== ruleId);
    this.snackBar.open('已删除监控规则', '关闭', { duration: 2000 });
  }

  // 测试通知
  testNotification(type: 'wechat' | 'email'): void {
    this.snackBar.open(`正在测试${type === 'wechat' ? '微信' : '邮件'}通知...`, '关闭', { duration: 2000 });
    // 这里可以调用通知服务进行测试
  }

  // 格式化时间间隔
  formatInterval(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}秒`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}分钟`;
    } else {
      return `${Math.floor(seconds / 3600)}小时`;
    }
  }
}

// 确认对话框组件
@Component({
  selector: 'app-confirm-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">{{ data.cancelText }}</button>
      <button mat-button [mat-dialog-close]="true" color="primary">{{ data.confirmText }}</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [MatButtonModule, MatDialogModule]
})
export class ConfirmDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}