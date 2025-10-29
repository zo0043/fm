import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject, Observable, interval, map } from 'rxjs';
import { switchMap, filter, takeWhile, startWith } from 'rxjs/operators';

// WebSocket连接状态
export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

// 消息类型
export enum MessageType {
  FUND_UPDATE = 'fund_update',
  MARKET_DATA = 'market_data',
  NOTIFICATION = 'notification',
  SYSTEM_STATUS = 'system_status',
  PING = 'ping',
  PONG = 'pong'
}

// WebSocket消息接口
export interface WebSocketMessage {
  type: MessageType;
  data: any;
  timestamp: number;
  id?: string;
}

// 基金更新数据
export interface FundUpdateData {
  fundId: string;
  code: string;
  nav: number;
  dailyChange: number;
  dailyChangeAmount: number;
  updateTime: string;
}

// 市场数据
export interface MarketData {
  marketIndex: string;
  currentValue: number;
  change: number;
  changePercent: number;
  updateTime: string;
}

// 系统通知
export interface SystemNotification {
  id: string;
  title: string;
  content: string;
  level: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5秒
  private heartbeatInterval = 30000; // 30秒心跳

  // 连接状态
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  // 消息主题
  private messageSubject = new Subject<WebSocketMessage>();
  public messages$ = this.messageSubject.asObservable();

  // 基金更新主题
  private fundUpdateSubject = new Subject<FundUpdateData>();
  public fundUpdates$ = this.fundUpdateSubject.asObservable();

  // 市场数据主题
  private marketDataSubject = new Subject<MarketData>();
  public marketData$ = this.marketDataSubject.asObservable();

  // 系统通知主题
  private notificationSubject = new Subject<SystemNotification>();
  public notifications$ = this.notificationSubject.asObservable();

  // 订阅管理
  private subscriptions = new Set<string>();
  private heartbeatTimer: any = null;

  constructor() {
    this.initializeConnection();
  }

  /**
   * 初始化WebSocket连接
   */
  private initializeConnection(): void {
    // 自动连接（如果需要的话，可以改为手动连接）
    // this.connect();
  }

  /**
   * 连接WebSocket
   */
  connect(url?: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket已连接');
      return;
    }

    const wsUrl = url || this.getWebSocketUrl();

    try {
      this.connectionStatusSubject.next(ConnectionStatus.CONNECTING);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket连接成功');
        this.connectionStatusSubject.next(ConnectionStatus.CONNECTED);
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.resubscribeAll();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket连接关闭:', event.code, event.reason);
        this.connectionStatusSubject.next(ConnectionStatus.DISCONNECTED);
        this.stopHeartbeat();

        // 如果不是主动关闭，尝试重连
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        this.connectionStatusSubject.next(ConnectionStatus.ERROR);
      };

    } catch (error) {
      console.error('WebSocket连接失败:', error);
      this.connectionStatusSubject.next(ConnectionStatus.ERROR);
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, '主动断开');
      this.ws = null;
    }
    this.stopHeartbeat();
    this.connectionStatusSubject.next(ConnectionStatus.DISCONNECTED);
  }

  /**
   * 发送消息
   */
  sendMessage(message: Partial<WebSocketMessage>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const fullMessage: WebSocketMessage = {
        type: message.type || MessageType.SYSTEM_STATUS,
        data: message.data || {},
        timestamp: Date.now(),
        id: this.generateMessageId(),
        ...message
      };

      this.ws.send(JSON.stringify(fullMessage));
    } else {
      console.warn('WebSocket未连接，无法发送消息');
    }
  }

  /**
   * 订阅基金更新
   */
  subscribeFundUpdates(fundIds: string[]): void {
    if (fundIds.length === 0) return;

    this.sendMessage({
      type: MessageType.FUND_UPDATE,
      data: {
        action: 'subscribe',
        fundIds: fundIds
      }
    });

    fundIds.forEach(id => this.subscriptions.add(`fund:${id}`));
  }

  /**
   * 取消订阅基金更新
   */
  unsubscribeFundUpdates(fundIds: string[]): void {
    if (fundIds.length === 0) return;

    this.sendMessage({
      type: MessageType.FUND_UPDATE,
      data: {
        action: 'unsubscribe',
        fundIds: fundIds
      }
    });

    fundIds.forEach(id => this.subscriptions.delete(`fund:${id}`));
  }

  /**
   * 订阅市场数据
   */
  subscribeMarketData(indices: string[] = ['000001', '399001']): void {
    this.sendMessage({
      type: MessageType.MARKET_DATA,
      data: {
        action: 'subscribe',
        indices: indices
      }
    });

    indices.forEach(index => this.subscriptions.add(`market:${index}`));
  }

  /**
   * 订阅系统通知
   */
  subscribeNotifications(): void {
    this.sendMessage({
      type: MessageType.NOTIFICATION,
      data: {
        action: 'subscribe'
      }
    });

    this.subscriptions.add('notifications');
  }

  /**
   * 获取特定类型的消息
   */
  getMessages<T>(type: MessageType): Observable<T> {
    return this.messages$.pipe(
      filter(message => message.type === type),
      map(message => message.data as T)
    );
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      this.messageSubject.next(message);

      switch (message.type) {
        case MessageType.FUND_UPDATE:
          this.handleFundUpdate(message.data as FundUpdateData);
          break;
        case MessageType.MARKET_DATA:
          this.handleMarketData(message.data as MarketData);
          break;
        case MessageType.NOTIFICATION:
          this.handleNotification(message.data as SystemNotification);
          break;
        case MessageType.PING:
          this.sendMessage({ type: MessageType.PONG, data: {} });
          break;
        case MessageType.PONG:
          // 心跳响应，不需要特殊处理
          break;
        default:
          console.log('收到未知类型消息:', message);
      }
    } catch (error) {
      console.error('解析WebSocket消息失败:', error);
    }
  }

  /**
   * 处理基金更新
   */
  private handleFundUpdate(data: FundUpdateData): void {
    this.fundUpdateSubject.next(data);
  }

  /**
   * 处理市场数据
   */
  private handleMarketData(data: MarketData): void {
    this.marketDataSubject.next(data);
  }

  /**
   * 处理系统通知
   */
  private handleNotification(data: SystemNotification): void {
    this.notificationSubject.next(data);
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = interval(this.heartbeatInterval).subscribe(() => {
      this.sendMessage({ type: MessageType.PING, data: {} });
    });
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      this.heartbeatTimer.unsubscribe();
      this.heartbeatTimer = null;
    }
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }

  /**
   * 重新订阅所有频道
   */
  private resubscribeAll(): void {
    // 这里可以记录之前的订阅并重新订阅
    // 简化实现，可以根据需要扩展
    console.log('重新订阅所有频道');
  }

  /**
   * 获取WebSocket URL
   */
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatusSubject.value;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.connectionStatusSubject.value === ConnectionStatus.CONNECTED;
  }

  /**
   * 模拟实时数据（用于开发测试）
   */
  simulateRealtimeData(): void {
    // 模拟基金更新
    interval(5000).pipe(
      takeWhile(() => !this.isConnected())
    ).subscribe(() => {
      const mockFundUpdate: FundUpdateData = {
        fundId: `fund_${Math.floor(Math.random() * 50) + 1}`,
        code: `${Math.floor(Math.random() * 900000) + 100000}`,
        nav: 1 + (Math.random() - 0.5) * 0.02,
        dailyChange: (Math.random() - 0.5) * 0.03,
        dailyChangeAmount: (Math.random() - 0.5) * 0.01,
        updateTime: new Date().toISOString()
      };
      this.fundUpdateSubject.next(mockFundUpdate);
    });

    // 模拟市场数据
    interval(10000).pipe(
      takeWhile(() => !this.isConnected())
    ).subscribe(() => {
      const mockMarketData: MarketData = {
        marketIndex: '000001',
        currentValue: 3000 + Math.random() * 200,
        change: (Math.random() - 0.5) * 50,
        changePercent: (Math.random() - 0.5) * 2,
        updateTime: new Date().toISOString()
      };
      this.marketDataSubject.next(mockMarketData);
    });
  }

  /**
   * 清理资源
   */
  ngOnDestroy(): void {
    this.disconnect();
    this.subscriptions.clear();
  }
}