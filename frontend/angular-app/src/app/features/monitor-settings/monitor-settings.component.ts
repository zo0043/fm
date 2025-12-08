import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient, HttpParams } from '@angular/common/http';

// 导入服务
import { FundService } from '../../core/services/fund.service';
import { ApiConfigService } from '../../core/services/api-config.service';
// 导入共享组件
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
// 导入常量
import { STORAGE_KEYS, TIME_CONSTANTS } from '../../shared/constants/app.constants';

// 类型定义
interface PushStrategy {
  condition: 'once' | 'every' | 'continuous'; // 推送条件：一次、每次、连续
  continuousDays: number; // 连续天数
  pushInterval: number; // 推送间隔（分钟）
}

interface MessageTemplates {
  up: string; // 上涨消息模板
  down: string; // 下跌消息模板
}

interface MonitorRule {
  id: number;
  name: string;
  description: string;
  enabled: boolean;
  thresholdType: 'percent' | 'value'; // 阈值类型：百分比、绝对值
  upThreshold: number; // 上涨阈值
  downThreshold: number; // 下跌阈值
  notificationType: Array<'wechat' | 'email' | 'bark'>; // 通知类型
  messageTemplates: MessageTemplates; // 消息模板
  pushStrategy: PushStrategy; // 推送策略
}

interface WechatConfig {
  enabled: boolean;
  webhookUrl: string;
  mentionUsers: string[];
  secret: string;
}

interface EmailConfig {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  recipients: string[];
}

interface BarkConfig {
  enabled: boolean;
  serverUrl: string;
  deviceKey: string;
  group: string;
  sound: string;
  isArchive: boolean;
}

interface NotificationSettings {
  wechat: WechatConfig;
  email: EmailConfig;
  bark: BarkConfig;
}

interface MonitoringFrequency {
  realtime: boolean; // 是否实时监控
  interval: number; // 监控间隔（秒）
  marketHoursOnly: boolean; // 是否仅在交易时间监控
  weekdaysOnly: boolean; // 是否仅在工作日监控
}

interface GlobalSettings {
  enableSound: boolean; // 是否启用声音提醒
  enableNotification: boolean; // 是否启用通知
  enableAutoRefresh: boolean; // 是否启用自动刷新
  dataRetention: number; // 数据保留天数
}

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
    MatTabsModule,
    MatTooltipModule,
    MatExpansionModule,
    MatChipsModule,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './monitor-settings.component.html',
  styleUrls: ['./monitor-settings.component.scss']
})
export class MonitorSettingsComponent implements OnInit {
  // 监控规则配置
  monitorRules: MonitorRule[] = [
    {
      id: 1,
      name: '涨跌幅监控',
      description: '监控基金每日涨跌幅变化',
      enabled: true,
      thresholdType: 'percent',
      upThreshold: 5.0,
      downThreshold: -5.0,
      notificationType: ['wechat', 'email', 'bark'],
      messageTemplates: {
        up: '{{fundName}}上涨了{{changePercent}}%，当前净值{{currentNav}}',
        down: '{{fundName}}下跌了{{changePercent}}%，当前净值{{currentNav}}'
      },
      pushStrategy: {
        condition: 'once', // once, every, continuous
        continuousDays: 1,
        pushInterval: 0 // 分钟
      }
    },
    {
      id: 2,
      name: '净值突破监控',
      description: '监控基金净值突破关键点位',
      enabled: true,
      thresholdType: 'value',
      upThreshold: 2.0,
      downThreshold: 1.0,
      notificationType: ['wechat', 'bark'],
      messageTemplates: {
        up: '{{fundName}}净值突破{{threshold}}，当前净值{{currentNav}}',
        down: '{{fundName}}净值跌破{{threshold}}，当前净值{{currentNav}}'
      },
      pushStrategy: {
        condition: 'once',
        continuousDays: 1,
        pushInterval: 0
      }
    },
    {
      id: 3,
      name: '周收益监控',
      description: '监控基金一周累计收益',
      enabled: false,
      thresholdType: 'percent',
      upThreshold: 10.0,
      downThreshold: -8.0,
      notificationType: ['email', 'bark'],
      messageTemplates: {
        up: '{{fundName}}本周上涨了{{changePercent}}%',
        down: '{{fundName}}本周下跌了{{changePercent}}%'
      },
      pushStrategy: {
        condition: 'once',
        continuousDays: 1,
        pushInterval: 0
      }
    }
  ];

  // 通知配置
  notificationSettings: NotificationSettings = {
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
    },
    bark: {
      enabled: false,
      serverUrl: 'https://api.day.app',
      deviceKey: '',
      group: '基金监控',
      sound: 'bell',
      isArchive: true
    }
  };

  // 监控频率配置
  monitoringFrequency: MonitoringFrequency = {
    realtime: true,
    interval: 300, // 5分钟
    marketHoursOnly: true,
    weekdaysOnly: false
  };

  // 全局设置
  globalSettings: GlobalSettings = {
    enableSound: true,
    enableNotification: true,
    enableAutoRefresh: true,
    dataRetention: 30 // 天
  };

  constructor(
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private http: HttpClient,
    private apiConfig: ApiConfigService
  ) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  // 加载设置
  private loadSettings(): void {
    // 1. 先尝试从 localStorage 加载
    const savedSettings = this.loadFromStorage();
    if (savedSettings) {
      this.applySettings(savedSettings);
      console.log('从本地存储加载监控设置');
    }

    // 2. 尝试从后端 API 加载（会覆盖本地设置）
    this.http.get<any>(`${this.apiConfig.monitorUrl}/settings`).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.applySettings(response.data);
          // 同步更新本地存储
          this.saveToStorage();
          console.log('从服务器加载监控设置');
        }
      },
      error: (error) => {
        console.warn('从服务器加载监控设置失败，使用本地设置:', error);
        // 使用本地设置或默认设置（已在上面加载）
      }
    });
  }

  // 应用设置
  private applySettings(settings: any): void {
    if (settings.rules) {
      this.monitorRules = settings.rules;
    }
    if (settings.notifications) {
      this.notificationSettings = settings.notifications;
    }
    if (settings.frequency) {
      this.monitoringFrequency = settings.frequency;
    }
    if (settings.global) {
      this.globalSettings = settings.global;
    }
  }

  // 从本地存储加载
  private loadFromStorage(): any {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MONITOR_SETTINGS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('解析本地监控设置失败:', error);
    }
    return null;
  }

  // 保存到本地存储
  private saveToStorage(): void {
    try {
      const settings = {
        rules: this.monitorRules,
        notifications: this.notificationSettings,
        frequency: this.monitoringFrequency,
        global: this.globalSettings,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEYS.MONITOR_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('保存监控设置到本地存储失败:', error);
    }
  }

  // 保存设置
  saveSettings(): void {
    const settings = {
      rules: this.monitorRules,
      notifications: this.notificationSettings,
      frequency: this.monitoringFrequency,
      global: this.globalSettings
    };

    // 1. 保存到本地存储（即时生效）
    this.saveToStorage();

    // 2. 保存到后端 API
    this.http.post(`${this.apiConfig.monitorUrl}/settings`, settings).subscribe({
      next: (response) => {
        this.snackBar.open('监控设置已保存到服务器', '关闭', { duration: TIME_CONSTANTS.SNACKBAR_DURATION });
        console.log('监控设置已保存到服务器:', response);
      },
      error: (error) => {
        // API 保存失败，但本地已保存
        console.error('保存监控设置到服务器失败:', error);
        this.snackBar.open('设置已保存到本地（服务器同步失败）', '关闭', { duration: TIME_CONSTANTS.SNACKBAR_DURATION });
      }
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
    // 重置监控规则
    this.monitorRules = [
      {
        id: 1,
        name: '涨跌幅监控',
        description: '监控基金每日涨跌幅变化',
        enabled: true,
        thresholdType: 'percent',
        upThreshold: 5.0,
        downThreshold: -5.0,
        notificationType: ['wechat', 'email', 'bark'],
        messageTemplates: {
          up: '{{fundName}}上涨了{{changePercent}}%，当前净值{{currentNav}}',
          down: '{{fundName}}下跌了{{changePercent}}%，当前净值{{currentNav}}'
        },
        pushStrategy: {
          condition: 'once',
          continuousDays: 1,
          pushInterval: 0
        }
      },
      {
        id: 2,
        name: '净值突破监控',
        description: '监控基金净值突破关键点位',
        enabled: true,
        thresholdType: 'value',
        upThreshold: 2.0,
        downThreshold: 1.0,
        notificationType: ['wechat', 'bark'],
        messageTemplates: {
          up: '{{fundName}}净值突破{{threshold}}，当前净值{{currentNav}}',
          down: '{{fundName}}净值跌破{{threshold}}，当前净值{{currentNav}}'
        },
        pushStrategy: {
          condition: 'once',
          continuousDays: 1,
          pushInterval: 0
        }
      },
      {
        id: 3,
        name: '周收益监控',
        description: '监控基金一周累计收益',
        enabled: false,
        thresholdType: 'percent',
        upThreshold: 10.0,
        downThreshold: -8.0,
        notificationType: ['email', 'bark'],
        messageTemplates: {
          up: '{{fundName}}本周上涨了{{changePercent}}%',
          down: '{{fundName}}本周下跌了{{changePercent}}%'
        },
        pushStrategy: {
          condition: 'once',
          continuousDays: 1,
          pushInterval: 0
        }
      }
    ];

    // 重置通知配置
    this.notificationSettings = {
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
      },
      bark: {
        enabled: false,
        serverUrl: 'https://api.day.app',
        deviceKey: '',
        group: '基金监控',
        sound: 'bell',
        isArchive: true
      }
    };

    // 重置监控频率配置
    this.monitoringFrequency = {
      realtime: true,
      interval: 300, // 5分钟
      marketHoursOnly: true,
      weekdaysOnly: false
    };

    // 重置全局设置
    this.globalSettings = {
      enableSound: true,
      enableNotification: true,
      enableAutoRefresh: true,
      dataRetention: 30 // 天
    };
  }

  // 添加监控规则
  addMonitorRule(): void {
    const newRule: MonitorRule = {
      id: Date.now(),
      name: '新监控规则',
      description: '自定义监控规则',
      enabled: true,
      thresholdType: 'percent',
      upThreshold: 3.0,
      downThreshold: -3.0,
      notificationType: ['wechat', 'bark'],
      messageTemplates: {
        up: '{{fundName}}上涨了{{changePercent}}%，当前净值{{currentNav}}',
        down: '{{fundName}}下跌了{{changePercent}}%，当前净值{{currentNav}}'
      },
      pushStrategy: {
        condition: 'once',
        continuousDays: 1,
        pushInterval: 0
      }
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
  testNotification(type: 'wechat' | 'email' | 'bark'): void {
    this.snackBar.open(`正在测试${this.getNotificationTypeName(type)}通知...`, '关闭', { duration: 2000 });
    
    try {
      switch (type) {
        case 'bark':
          this.testBarkNotification();
          break;
        case 'wechat':
          this.testWechatNotification();
          break;
        case 'email':
          this.testEmailNotification();
          break;
      }
    } catch (error) {
      console.error(`测试${this.getNotificationTypeName(type)}通知失败:`, error);
      this.snackBar.open(`${this.getNotificationTypeName(type)}通知测试失败`, '关闭', { duration: 3000 });
    }
  }

  // 测试Bark通知
  private testBarkNotification(): void {
    const barkConfig = this.notificationSettings.bark;
    if (!barkConfig.enabled || !barkConfig.deviceKey) {
      this.snackBar.open('Bark通知未启用或未配置设备密钥', '关闭', { duration: 3000 });
      return;
    }

    const url = `${barkConfig.serverUrl}/${barkConfig.deviceKey}/基金监控测试/这是一条测试消息`;
    let params = new HttpParams();
    if (barkConfig.group) params = params.append('group', barkConfig.group);
    if (barkConfig.sound) params = params.append('sound', barkConfig.sound);
    if (barkConfig.isArchive) params = params.append('isArchive', '1');

    this.http.get(url, { params, responseType: 'text' }).subscribe({
      next: (response) => {
        console.log('Bark通知测试成功:', response);
        this.snackBar.open('Bark通知测试成功', '关闭', { duration: 3000 });
      },
      error: (error) => {
        console.error('Bark通知测试失败:', error);
        this.snackBar.open('Bark通知测试失败', '关闭', { duration: 3000 });
      }
    });
  }

  // 测试微信通知
  private testWechatNotification(): void {
    const wechatConfig = this.notificationSettings.wechat;
    if (!wechatConfig.enabled || !wechatConfig.webhookUrl) {
      this.snackBar.open('微信通知未启用或未配置 Webhook URL', '关闭', { duration: TIME_CONSTANTS.SNACKBAR_DURATION });
      return;
    }

    // 通过后端代理发送微信通知（避免跨域）
    const payload = {
      type: 'wechat',
      config: {
        webhookUrl: wechatConfig.webhookUrl,
        secret: wechatConfig.secret
      },
      message: {
        msgtype: 'text',
        text: {
          content: '【基金监控测试】这是一条测试消息，请忽略。',
          mentioned_list: wechatConfig.mentionUsers
        }
      }
    };

    this.http.post(`${this.apiConfig.notificationsUrl}/test`, payload).subscribe({
      next: (response) => {
        console.log('微信通知测试成功:', response);
        this.snackBar.open('微信通知测试成功', '关闭', { duration: TIME_CONSTANTS.SNACKBAR_DURATION });
      },
      error: (error) => {
        console.error('微信通知测试失败:', error);
        this.snackBar.open('微信通知测试失败，请检查配置', '关闭', { duration: TIME_CONSTANTS.SNACKBAR_DURATION });
      }
    });
  }

  // 测试邮件通知
  private testEmailNotification(): void {
    const emailConfig = this.notificationSettings.email;
    if (!emailConfig.enabled || !emailConfig.smtpHost || emailConfig.recipients.length === 0) {
      this.snackBar.open('邮件通知未启用或配置不完整', '关闭', { duration: TIME_CONSTANTS.SNACKBAR_DURATION });
      return;
    }

    // 通过后端发送测试邮件
    const payload = {
      type: 'email',
      config: {
        smtpHost: emailConfig.smtpHost,
        smtpPort: emailConfig.smtpPort,
        username: emailConfig.username,
        password: emailConfig.password
      },
      message: {
        to: emailConfig.recipients,
        subject: '【基金监控】测试邮件',
        body: '这是一封测试邮件，用于验证邮件通知配置是否正确。'
      }
    };

    this.http.post(`${this.apiConfig.notificationsUrl}/test`, payload).subscribe({
      next: (response) => {
        console.log('邮件通知测试成功:', response);
        this.snackBar.open('邮件通知测试成功，请检查收件箱', '关闭', { duration: TIME_CONSTANTS.SNACKBAR_DURATION });
      },
      error: (error) => {
        console.error('邮件通知测试失败:', error);
        this.snackBar.open('邮件通知测试失败，请检查 SMTP 配置', '关闭', { duration: TIME_CONSTANTS.SNACKBAR_DURATION });
      }
    });
  }

  // 获取通知类型名称
  getNotificationTypeName(type: string): string {
    const typeNames = {
      wechat: '微信',
      email: '邮件',
      bark: 'Bark'
    };
    return typeNames[type as keyof typeof typeNames] || type;
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