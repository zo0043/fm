import { Injectable } from '@angular/core';
import { WebSocketService, FundUpdateData, MarketData, SystemNotification } from '../core/services/websocket.service';
import { FundService } from '../core/services/fund.service';
import { Subject, BehaviorSubject, combineLatest, timer } from 'rxjs';
import { takeUntil, filter, map, switchMap, startWith } from 'rxjs/operators';

export interface RealtimeStatus {
  connected: boolean;
  lastUpdate: Date;
  activeSubscriptions: string[];
  messageCount: number;
}

export interface NotificationItem extends SystemNotification {
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AppRealtimeService {
  // 状态管理
  private statusSubject = new BehaviorSubject<RealtimeStatus>({
    connected: false,
    lastUpdate: new Date(),
    activeSubscriptions: [],
    messageCount: 0
  });
  public status$ = this.statusSubject.asObservable();

  // 通知管理
  private notificationsSubject = new BehaviorSubject<NotificationItem[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  // 实时数据
  private fundUpdatesSubject = new BehaviorSubject<FundUpdateData | null>(null);
  public fundUpdates$ = this.fundUpdatesSubject.asObservable();

  private marketDataSubject = new BehaviorSubject<MarketData | null>(null);
  public marketData$ = this.marketDataSubject.asObservable();

  // 连接管理
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private isDestroyed = false;

  // 订阅管理
  private subscriptions = new Set<string>();
  private watchedFunds = new Set<string>();

  constructor(
    private webSocketService: WebSocketService,
    private fundService: FundService
  ) {
    this.initializeRealtimeService();
  }

  /**
   * 初始化实时服务
   */
  private initializeRealtimeService(): void {
    // 监听WebSocket连接状态
    this.webSocketService.connectionStatus$.pipe(
      takeUntil(this.getDestroySubject())
    ).subscribe(status => {
      this.updateConnectionStatus(status);
    });

    // 监听基金更新
    this.webSocketService.fundUpdates$.pipe(
      takeUntil(this.getDestroySubject())
    ).subscribe(update => {
      this.handleFundUpdate(update);
    });

    // 监听市场数据
    this.webSocketService.marketData$.pipe(
      takeUntil(this.getDestroySubject())
    ).subscribe(data => {
      this.handleMarketData(data);
    });

    // 监听系统通知
    this.webSocketService.notifications$.pipe(
      takeUntil(this.getDestroySubject())
    ).subscribe(notification => {
      this.handleSystemNotification(notification);
    });

    // 自动重连逻辑
    this.setupAutoReconnect();

    // 定期状态检查
    this.setupStatusCheck();
  }

  /**
   * 连接到WebSocket服务器
   */
  connect(): void {
    if (this.isDestroyed) return;

    this.webSocketService.connect();
  }

  /**
   * 断开WebSocket连接
   */
  disconnect(): void {
    this.webSocketService.disconnect();
    this.subscriptions.clear();
    this.watchedFunds.clear();
  }

  /**
   * 订阅基金实时更新
   */
  subscribeToFundUpdates(fundIds: string[]): void {
    if (this.isDestroyed || !fundIds.length) return;

    // 添加到监听列表
    fundIds.forEach(id => this.watchedFunds.add(id));

    // 订阅WebSocket更新
    this.webSocketService.subscribeFundUpdates(fundIds);

    // 更新订阅状态
    fundIds.forEach(id => this.subscriptions.add(`fund:${id}`));
    this.updateStatus();
  }

  /**
   * 取消订阅基金更新
   */
  unsubscribeFromFundUpdates(fundIds: string[]): void {
    if (!fundIds.length) return;

    // 从监听列表移除
    fundIds.forEach(id => this.watchedFunds.delete(id));

    // 取消WebSocket订阅
    this.webSocketService.unsubscribeFundUpdates(fundIds);

    // 更新订阅状态
    fundIds.forEach(id => this.subscriptions.delete(`fund:${id}`));
    this.updateStatus();
  }

  /**
   * 订阅市场数据
   */
  subscribeToMarketData(indices: string[] = ['000001', '399001']): void {
    if (this.isDestroyed) return;

    this.webSocketService.subscribeMarketData(indices);
    indices.forEach(index => this.subscriptions.add(`market:${index}`));
    this.updateStatus();
  }

  /**
   * 订阅系统通知
   */
  subscribeToNotifications(): void {
    if (this.isDestroyed) return;

    this.webSocketService.subscribeNotifications();
    this.subscriptions.add('notifications');
    this.updateStatus();
  }

  /**
   * 启动实时数据模拟（用于开发测试）
   */
  startSimulation(): void {
    if (this.isDestroyed) return;

    // 模拟基金数据更新
    timer(0, 5000).pipe(
      takeUntil(this.getDestroySubject()),
      switchMap(() => this.getWatchedFunds())
    ).subscribe(funds => {
      if (funds.length > 0) {
        const randomFund = funds[Math.floor(Math.random() * funds.length)];
        const mockUpdate: FundUpdateData = {
          fundId: randomFund.id,
          code: randomFund.code,
          nav: randomFund.nav * (1 + (Math.random() - 0.5) * 0.001),
          dailyChange: randomFund.dailyChange + (Math.random() - 0.5) * 0.0001,
          dailyChangeAmount: 0,
          updateTime: new Date().toISOString()
        };
        mockUpdate.dailyChangeAmount = mockUpdate.nav * mockUpdate.dailyChange;
        this.handleFundUpdate(mockUpdate);
      }
    });

    // 模拟市场数据更新
    timer(0, 10000).pipe(
      takeUntil(this.getDestroySubject())
    ).subscribe(() => {
      const mockMarketData: MarketData = {
        marketIndex: '000001',
        currentValue: 3000 + Math.random() * 200,
        change: (Math.random() - 0.5) * 20,
        changePercent: (Math.random() - 0.5) * 0.01,
        updateTime: new Date().toISOString()
      };
      this.handleMarketData(mockMarketData);
    });
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): RealtimeStatus {
    return this.statusSubject.value;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.statusSubject.value.connected;
  }

  /**
   * 获取未读通知数量
   */
  getUnreadNotificationsCount(): number {
    return this.notificationsSubject.value.filter(n => !n.read).length;
  }

  /**
   * 标记通知为已读
   */
  markNotificationAsRead(notificationId: string): void {
    const notifications = this.notificationsSubject.value;
    const updatedNotifications = notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    this.notificationsSubject.next(updatedNotifications);
  }

  /**
   * 标记所有通知为已读
   */
  markAllNotificationsAsRead(): void {
    const notifications = this.notificationsSubject.value;
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    this.notificationsSubject.next(updatedNotifications);
  }

  /**
   * 清除通知
   */
  clearNotifications(): void {
    this.notificationsSubject.next([]);
  }

  /**
   * 获取监听的基金列表
   */
  private getWatchedFunds() {
    return this.fundService.getFunds({}, 1, 100).pipe(
      map(response => response.funds.filter(fund => this.watchedFunds.has(fund.id)))
    );
  }

  /**
   * 处理基金更新
   */
  private handleFundUpdate(update: FundUpdateData): void {
    this.fundUpdatesSubject.next(update);
    this.updateStatus();

    // 如果是大幅波动，生成通知
    if (Math.abs(update.dailyChange) > 0.05) {
      const notification: NotificationItem = {
        id: `fund_alert_${Date.now()}`,
        title: '基金价格异常波动',
        content: `基金 ${update.code} 涨跌幅达到 ${(update.dailyChange * 100).toFixed(2)}%`,
        level: Math.abs(update.dailyChange) > 0.08 ? 'error' : 'warning',
        timestamp: new Date(),
        read: false
      };
      this.addNotification(notification);
    }
  }

  /**
   * 处理市场数据更新
   */
  private handleMarketData(data: MarketData): void {
    this.marketDataSubject.next(data);
    this.updateStatus();

    // 如果市场大幅波动，生成通知
    if (Math.abs(data.changePercent) > 0.02) {
      const notification: NotificationItem = {
        id: `market_alert_${Date.now()}`,
        title: '市场指数大幅波动',
        content: `${data.marketIndex} 指数变化 ${data.changePercent > 0 ? '+' : ''}${(data.changePercent * 100).toFixed(2)}%`,
        level: Math.abs(data.changePercent) > 0.03 ? 'error' : 'warning',
        timestamp: new Date(),
        read: false
      };
      this.addNotification(notification);
    }
  }

  /**
   * 处理系统通知
   */
  private handleSystemNotification(notification: SystemNotification): void {
    const notificationItem: NotificationItem = {
      ...notification,
      timestamp: new Date(),
      read: false
    };
    this.addNotification(notificationItem);
  }

  /**
   * 添加通知
   */
  private addNotification(notification: NotificationItem): void {
    const currentNotifications = this.notificationsSubject.value;

    // 限制通知数量，保留最新的50条
    const updatedNotifications = [notification, ...currentNotifications].slice(0, 50);
    this.notificationsSubject.next(updatedNotifications);
  }

  /**
   * 更新连接状态
   */
  private updateConnectionStatus(status: any): void {
    const currentStatus = this.statusSubject.value;
    const newStatus: RealtimeStatus = {
      connected: status === 'connected',
      lastUpdate: new Date(),
      activeSubscriptions: Array.from(this.subscriptions),
      messageCount: currentStatus.messageCount
    };

    this.statusSubject.next(newStatus);

    // 如果连接断开，尝试重连
    if (status === 'disconnected' && !this.isDestroyed) {
      this.attemptReconnect();
    }
  }

  /**
   * 更新状态
   */
  private updateStatus(): void {
    const currentStatus = this.statusSubject.value;
    const newStatus: RealtimeStatus = {
      ...currentStatus,
      lastUpdate: new Date(),
      activeSubscriptions: Array.from(this.subscriptions),
      messageCount: currentStatus.messageCount + 1
    };
    this.statusSubject.next(newStatus);
  }

  /**
   * 设置自动重连
   */
  private setupAutoReconnect(): void {
    this.webSocketService.connectionStatus$.pipe(
      filter(status => status === 'disconnected'),
      takeUntil(this.getDestroySubject())
    ).subscribe(() => {
      if (!this.isDestroyed) {
        this.attemptReconnect();
      }
    });
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isDestroyed) {
      return;
    }

    this.reconnectAttempts++;

    setTimeout(() => {
      if (!this.isDestroyed) {
        console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.connect();
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * 设置状态检查
   */
  private setupStatusCheck(): void {
    timer(0, 30000).pipe(
      takeUntil(this.getDestroySubject())
    ).subscribe(() => {
      if (!this.isDestroyed && !this.isConnected()) {
        console.warn('连接状态异常，尝试重新连接...');
        this.connect();
      }
    });
  }

  /**
   * 获取销毁Subject
   */
  private getDestroySubject(): Subject<void> {
    return new Subject<void>();
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.isDestroyed = true;
    this.disconnect();
    this.fundUpdatesSubject.complete();
    this.marketDataSubject.complete();
    this.notificationsSubject.complete();
    this.statusSubject.complete();
  }
}