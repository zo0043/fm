import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiConfigService {
  // 基础API配置
  private readonly baseUrls = {
    // 开发环境API地址
    development: {
      auth: 'http://localhost:8000/api/v1/auth',
      users: 'http://localhost:8000/api/v1/users',
      funds: 'http://localhost:8001/funds',
      nav: 'http://localhost:8001/nav',
      monitor: 'http://localhost:8002/monitor',
      rules: 'http://localhost:8002/rules',
      notifications: 'http://localhost:8003/notifications',
      configs: 'http://localhost:8003/configs',
      backtest: 'http://localhost:8004/backtest',
      strategies: 'http://localhost:8004/strategies'
    },
    // 生产环境API地址
    production: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      funds: '/api/v1/funds',
      nav: '/api/v1/nav',
      monitor: '/api/v1/monitor',
      rules: '/api/v1/rules',
      notifications: '/api/v1/notifications',
      configs: '/api/v1/configs',
      backtest: '/api/v1/backtest',
      strategies: '/api/v1/strategies'
    }
  };

  private readonly environment = 'development'; // 可以根据环境变量切换

  getBaseUrl(service: keyof typeof this.baseUrls.development): string {
    return this.baseUrls[this.environment][service];
  }

  // 获取认证服务URL
  get authUrl(): string {
    return this.getBaseUrl('auth');
  }

  // 获取用户服务URL
  get usersUrl(): string {
    return this.getBaseUrl('users');
  }

  // 获取基金服务URL
  get fundsUrl(): string {
    return this.getBaseUrl('funds');
  }

  // 获取净值服务URL
  get navUrl(): string {
    return this.getBaseUrl('nav');
  }

  // 获取监控服务URL
  get monitorUrl(): string {
    return this.getBaseUrl('monitor');
  }

  // 获取规则服务URL
  get rulesUrl(): string {
    return this.getBaseUrl('rules');
  }

  // 获取通知服务URL
  get notificationsUrl(): string {
    return this.getBaseUrl('notifications');
  }

  // 获取配置服务URL
  get configsUrl(): string {
    return this.getBaseUrl('configs');
  }

  // 获取回测服务URL
  get backtestUrl(): string {
    return this.getBaseUrl('backtest');
  }

  // 获取策略服务URL
  get strategiesUrl(): string {
    return this.getBaseUrl('strategies');
  }

  // 检查是否为开发环境
  get isDevelopment(): boolean {
    return this.environment === 'development';
  }

  // 获取完整的API URL
  getFullUrl(service: keyof typeof this.baseUrls.development, endpoint: string): string {
    const baseUrl = this.getBaseUrl(service);
    return `${baseUrl}${endpoint}`;
  }
}