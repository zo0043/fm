import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface NotificationChannel {
  type: 'email' | 'wechat' | 'sms' | 'webhook';
  name: string;
  config: any;
  isActive: boolean;
}

export interface NotificationTemplate {
  id: number;
  name: string;
  type: string;
  subject: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: number;
  channelType: string;
  channelName: string;
  recipient: string;
  subject: string;
  content: string;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  sentAt?: string;
  error?: string;
  createdAt: string;
}

export interface TestNotificationRequest {
  channelType: string;
  recipient: string;
  subject: string;
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = environment.microservices.notification;

  constructor(private http: HttpClient) {}

  // 获取通知渠道
  getChannels(): Observable<{ success: boolean; data: NotificationChannel[] }> {
    return this.http.get<{ success: boolean; data: NotificationChannel[] }>(`${this.apiUrl}/channels`).pipe(
      catchError(this.handleError)
    );
  }

  // 创建通知渠道
  createChannel(channel: Omit<NotificationChannel, 'isActive'>): Observable<{ success: boolean; data: NotificationChannel }> {
    return this.http.post<{ success: boolean; data: NotificationChannel }>(`${this.apiUrl}/channels`, channel).pipe(
      catchError(this.handleError)
    );
  }

  // 更新通知渠道
  updateChannel(channelId: number, channel: Partial<NotificationChannel>): Observable<{ success: boolean; data: NotificationChannel }> {
    return this.http.put<{ success: boolean; data: NotificationChannel }>(`${this.apiUrl}/channels/${channelId}`, channel).pipe(
      catchError(this.handleError)
    );
  }

  // 删除通知渠道
  deleteChannel(channelId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/channels/${channelId}`).pipe(
      catchError(this.handleError)
    );
  }

  // 测试通知渠道
  testChannel(channelId: number, request: TestNotificationRequest): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/channels/${channelId}/test`, request).pipe(
      catchError(this.handleError)
    );
  }

  // 获取通知模板
  getTemplates(): Observable<{ success: boolean; data: NotificationTemplate[] }> {
    return this.http.get<{ success: boolean; data: NotificationTemplate[] }>(`${this.apiUrl}/templates`).pipe(
      catchError(this.handleError)
    );
  }

  // 创建通知模板
  createTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Observable<{ success: boolean; data: NotificationTemplate }> {
    return this.http.post<{ success: boolean; data: NotificationTemplate }>(`${this.apiUrl}/templates`, template).pipe(
      catchError(this.handleError)
    );
  }

  // 更新通知模板
  updateTemplate(templateId: number, template: Partial<NotificationTemplate>): Observable<{ success: boolean; data: NotificationTemplate }> {
    return this.http.put<{ success: boolean; data: NotificationTemplate }>(`${this.apiUrl}/templates/${templateId}`, template).pipe(
      catchError(this.handleError)
    );
  }

  // 删除通知模板
  deleteTemplate(templateId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/templates/${templateId}`).pipe(
      catchError(this.handleError)
    );
  }

  // 获取通知记录
  getNotifications(
    page: number = 1,
    pageSize: number = 20,
    status?: string,
    channelType?: string,
    startDate?: string,
    endDate?: string
  ): Observable<{
    success: boolean;
    data: { notifications: NotificationRecord[]; total: number; page: number; pageSize: number; };
  }> {
    let url = `${this.apiUrl}/notifications?page=${page}&size=${pageSize}`;

    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (channelType) params.set('channelType', channelType);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    if (params.toString()) {
      url += `&${params.toString()}`;
    }

    return this.http.get<{
      success: boolean;
      data: { notifications: NotificationRecord[]; total: number; page: number; pageSize: number; };
    }>(url).pipe(
      catchError(this.handleError)
    );
  }

  // 重新发送通知
  resendNotification(notificationId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/notifications/${notificationId}/resend`, {}).pipe(
      catchError(this.handleError)
    );
  }

  // 获取通知统计
  getStatistics(startDate?: string, endDate?: string): Observable<{
    success: boolean;
    data: {
      total: number;
      sent: number;
      failed: number;
      pending: number;
      byChannel: { [channelType: string]: number };
      byStatus: { [status: string]: number };
    };
  }> {
    let url = `${this.apiUrl}/statistics`;

    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.http.get<{
      success: boolean;
      data: {
        total: number;
        sent: number;
        failed: number;
        pending: number;
        byChannel: { [channelType: string]: number };
        byStatus: { [status: string]: number };
      };
    }>(url).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('Notification service error:', error);
    throw error;
  }
}