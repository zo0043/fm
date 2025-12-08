import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * API 配置服务
 * 统一管理所有 API 端点配置，支持开发/生产环境切换
 *
 * 使用方法：
 * constructor(private apiConfig: ApiConfigService) {}
 * const url = this.apiConfig.getUrl('funds', '/list');
 */
@Injectable({
  providedIn: 'root'
})
export class ApiConfigService {
  // NestJS API Gateway 地址（统一入口）
  private readonly gatewayUrl = environment.production
    ? ''  // 生产环境使用相对路径
    : 'http://localhost:3000';

  // 微服务直连地址（开发调试用）
  private readonly microservices = {
    auth: 'http://localhost:8000',
    dataCollector: 'http://localhost:8001',
    monitorEngine: 'http://localhost:8002',
    notification: 'http://localhost:8003',
    backtest: 'http://localhost:8004',
  };

  // API 版本
  private readonly apiVersion = 'v1';

  // 服务路由映射
  private readonly serviceRoutes: Record<string, string> = {
    auth: '/api/auth',
    users: '/api/users',
    funds: '/api/funds',
    nav: '/api/nav',
    monitor: '/api/monitor',
    rules: '/api/rules',
    notifications: '/api/notifications',
    configs: '/api/configs',
    backtest: '/api/backtest',
    strategies: '/api/strategies',
    // 代理服务（解决跨域问题）
    proxy: '/api/proxy',
  };

  // 外部数据源代理配置
  private readonly externalProxies = {
    eastmoney: '/api/proxy/eastmoney',
    sina: '/api/proxy/sina',
  };

  /**
   * 获取 API URL
   * @param service 服务名称
   * @param endpoint 端点路径
   */
  getUrl(service: keyof typeof this.serviceRoutes, endpoint: string = ''): string {
    const basePath = this.serviceRoutes[service] || '';
    return `${this.gatewayUrl}${basePath}${endpoint}`;
  }

  /**
   * 获取外部数据源代理 URL
   * @param source 数据源名称
   * @param params 查询参数
   */
  getProxyUrl(source: 'eastmoney' | 'sina', params: Record<string, string> = {}): string {
    const basePath = this.externalProxies[source];
    const queryString = new URLSearchParams(params).toString();
    return `${this.gatewayUrl}${basePath}${queryString ? '?' + queryString : ''}`;
  }

  /**
   * 获取东方财富基金净值代理 URL
   * @param fundCode 基金代码
   * @param page 页码
   * @param pageSize 每页条数
   */
  getEastmoneyNavUrl(fundCode: string, page: number = 1, pageSize: number = 20): string {
    return this.getProxyUrl('eastmoney', {
      type: 'lsjz',
      code: fundCode,
      page: page.toString(),
      per: pageSize.toString(),
    });
  }

  // ============= 便捷访问器 =============

  get authUrl(): string {
    return this.getUrl('auth');
  }

  get usersUrl(): string {
    return this.getUrl('users');
  }

  get fundsUrl(): string {
    return this.getUrl('funds');
  }

  get navUrl(): string {
    return this.getUrl('nav');
  }

  get monitorUrl(): string {
    return this.getUrl('monitor');
  }

  get rulesUrl(): string {
    return this.getUrl('rules');
  }

  get notificationsUrl(): string {
    return this.getUrl('notifications');
  }

  get configsUrl(): string {
    return this.getUrl('configs');
  }

  get backtestUrl(): string {
    return this.getUrl('backtest');
  }

  get strategiesUrl(): string {
    return this.getUrl('strategies');
  }

  // ============= 环境信息 =============

  get isDevelopment(): boolean {
    return !environment.production;
  }

  get isProduction(): boolean {
    return environment.production;
  }

  get gatewayBaseUrl(): string {
    return this.gatewayUrl;
  }

  /**
   * 获取微服务直连地址（仅开发环境使用）
   */
  getMicroserviceUrl(service: keyof typeof this.microservices): string {
    if (this.isProduction) {
      console.warn('生产环境不应直连微服务');
    }
    return this.microservices[service];
  }
}