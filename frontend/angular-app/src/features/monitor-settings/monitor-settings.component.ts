import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { MonitorService, MonitorRule, RuleType } from '../../core/services/monitor.service';

@Component({
  selector: 'app-monitor-settings',
  templateUrl: './monitor-settings.component.html',
  styleUrls: ['./monitor-settings.component.scss']
})
export class MonitorSettingsComponent implements OnInit {
  pageTitle = '监控设置';

  // 监控规则列表
  monitorRules: MonitorRule[] = [];
  ruleTypes: RuleType[] = [];
  loading = false;

  // 表单数据
  newRule: any = {
    name: '',
    description: '',
    ruleType: 'price_threshold',
    conditionOperator: '>',
    thresholdValue: 0,
    notificationChannels: ['email'],
    fundCodes: [],
    isActive: true
  };

  // 通知渠道选项
  notificationChannels = [
    { value: 'email', label: '邮件通知' },
    { value: 'wechat', label: '微信通知' },
    { value: 'sms', label: '短信通知' },
    { value: 'webhook', label: 'Webhook' }
  ];

  // 操作符选项
  operators = [
    { value: '>', label: '大于' },
    { value: '<', label: '小于' },
    { value: '>=', label: '大于等于' },
    { value: '<=', label: '小于等于' },
    { value: '==', label: '等于' },
    { value: '!=', label: '不等于' }
  ];

  constructor(
    private router: Router,
    private titleService: Title,
    private monitorService: MonitorService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle(this.pageTitle);
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;

    // 并行加载规则和规则类型
    this.monitorService.getRules().subscribe({
      next: (response) => {
        if (response.success) {
          this.monitorRules = response.data.rules;
        }
      },
      error: (error) => {
        console.error('加载监控规则失败:', error);
        this.snackBar.open('加载监控规则失败', '关闭', { duration: 3000 });
      }
    });

    this.monitorService.getRuleTypes().subscribe({
      next: (response) => {
        if (response.success) {
          this.ruleTypes = response.data;
        }
      },
      error: (error) => {
        console.error('加载规则类型失败:', error);
      }
    });

    this.monitorService.getOperators().subscribe({
      next: (response) => {
        if (response.success) {
          // 更新操作符选项
          this.operators = response.data.map(op => ({ value: op, label: this.getOperatorLabel(op) }));
        }
      },
      error: (error) => {
        console.error('加载操作符失败:', error);
      }
    });

    // 模拟加载完成
    setTimeout(() => {
      this.loading = false;
    }, 1000);
  }

  // 创建新规则
  createRule(): void {
    if (!this.validateRule()) {
      return;
    }

    this.monitorService.createRule(this.newRule).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('监控规则创建成功', '关闭', { duration: 3000 });
          this.resetForm();
          this.loadData();
        } else {
          this.snackBar.open('创建监控规则失败', '关闭', { duration: 3000 });
        }
      },
      error: (error) => {
        console.error('创建监控规则失败:', error);
        this.snackBar.open('创建监控规则失败', '关闭', { duration: 3000 });
      }
    });
  }

  // 更新规则
  updateRule(rule: MonitorRule): void {
    this.monitorService.updateRule(rule.id, rule).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('监控规则更新成功', '关闭', { duration: 3000 });
          this.loadData();
        } else {
          this.snackBar.open('更新监控规则失败', '关闭', { duration: 3000 });
        }
      },
      error: (error) => {
        console.error('更新监控规则失败:', error);
        this.snackBar.open('更新监控规则失败', '关闭', { duration: 3000 });
      }
    });
  }

  // 删除规则
  deleteRule(ruleId: number): void {
    if (!confirm('确定要删除这个监控规则吗？')) {
      return;
    }

    this.monitorService.deleteRule(ruleId).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('监控规则删除成功', '关闭', { duration: 3000 });
          this.loadData();
        } else {
          this.snackBar.open('删除监控规则失败', '关闭', { duration: 3000 });
        }
      },
      error: (error) => {
        console.error('删除监控规则失败:', error);
        this.snackBar.open('删除监控规则失败', '关闭', { duration: 3000 });
      }
    });
  }

  // 切换规则状态
  toggleRule(rule: MonitorRule): void {
    this.monitorService.toggleRule(rule.id, !rule.isActive).subscribe({
      next: (response) => {
        if (response.success) {
          rule.isActive = !rule.isActive;
          this.snackBar.open(
            rule.isActive ? '规则已启用' : '规则已禁用',
            '关闭',
            { duration: 2000 }
          );
        }
      },
      error: (error) => {
        console.error('切换规则状态失败:', error);
        this.snackBar.open('操作失败', '关闭', { duration: 3000 });
      }
    });
  }

  // 手动执行规则
  executeRule(ruleId: number): void {
    this.monitorService.executeRule(ruleId).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('规则执行成功', '关闭', { duration: 3000 });
          if (response.data && response.data.length > 0) {
            this.snackBar.open(`触发 ${response.data.length} 个告警`, '关闭', { duration: 3000 });
          }
        } else {
          this.snackBar.open('规则执行失败', '关闭', { duration: 3000 });
        }
      },
      error: (error) => {
        console.error('执行规则失败:', error);
        this.snackBar.open('执行规则失败', '关闭', { duration: 3000 });
      }
    });
  }

  // 验证规则表单
  private validateRule(): boolean {
    if (!this.newRule.name.trim()) {
      this.snackBar.open('请输入规则名称', '关闭', { duration: 3000 });
      return false;
    }

    if (!this.newRule.ruleType) {
      this.snackBar.open('请选择规则类型', '关闭', { duration: 3000 });
      return false;
    }

    if (this.newRule.notificationChannels.length === 0) {
      this.snackBar.open('请选择至少一个通知渠道', '关闭', { duration: 3000 });
      return false;
    }

    return true;
  }

  // 重置表单
  resetForm(): void {
    this.newRule = {
      name: '',
      description: '',
      ruleType: 'price_threshold',
      conditionOperator: '>',
      thresholdValue: 0,
      notificationChannels: ['email'],
      fundCodes: [],
      isActive: true
    };
  }

  // 获取操作符标签
  getOperatorLabel(operator: string): string {
    const labels: { [key: string]: string } = {
      '>': '大于',
      '<': '小于',
      '>=': '大于等于',
      '<=': '小于等于',
      '==': '等于',
      '!=': '不等于',
      'contains': '包含',
      'not_contains': '不包含'
    };
    return labels[operator] || operator;
  }

  // 获取规则类型名称
  getRuleTypeName(ruleType: string): string {
    const type = this.ruleTypes.find(t => t.type === ruleType);
    return type ? type.name : ruleType;
  }

  // 获取规则类型描述
  getRuleTypeDescription(ruleType: string): string {
    const type = this.ruleTypes.find(t => t.type === ruleType);
    return type ? type.description : '';
  }

  // 获取规则类型单位
  getRuleTypeUnit(ruleType: string): string {
    const type = this.ruleTypes.find(t => t.type === ruleType);
    return type && type.unit ? type.unit : '';
  }

  // 格式化阈值显示
  formatThresholdValue(rule: MonitorRule): string {
    const unit = this.getRuleTypeUnit(rule.ruleType);
    return `${rule.thresholdValue}${unit}`;
  }

  // 格式化时间
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('zh-CN');
  }

  // 获取状态样式
  getStatusClass(isActive: boolean): string {
    return isActive ? 'status-active' : 'status-inactive';
  }

  // 获取状态文本
  getStatusText(isActive: boolean): string {
    return isActive ? '启用' : '禁用';
  }

  // 获取通知渠道名称
  getChannelName(channel: string): string {
    const channelMap: { [key: string]: string } = {
      'email': '邮件',
      'wechat': '微信',
      'sms': '短信',
      'webhook': 'Webhook'
    };
    return channelMap[channel] || channel;
  }
}