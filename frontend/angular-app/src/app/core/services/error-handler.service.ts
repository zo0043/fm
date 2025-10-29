import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError, Observable } from 'rxjs';

export interface ErrorInfo {
  message: string;
  status: number;
  statusText: string;
  timestamp: Date;
  url?: string;
  details?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private errors: ErrorInfo[] = [];
  private maxErrors = 100; // 最大保存错误数量

  constructor() {}

  /**
   * 处理HTTP错误
   */
  handleHttpError(error: HttpErrorResponse): Observable<never> {
    const errorInfo = this.createErrorInfo(error);
    this.logError(errorInfo);
    return throwError(() => new Error(errorInfo.message));
  }

  /**
   * 处理一般错误
   */
  handleError(error: any, context?: string): Observable<never> {
    const errorInfo: ErrorInfo = {
      message: typeof error === 'string' ? error : error.message || '未知错误',
      status: 0,
      statusText: 'Client Error',
      timestamp: new Date(),
      details: error
    };

    if (context) {
      errorInfo.message = `[${context}] ${errorInfo.message}`;
    }

    this.logError(errorInfo);
    return throwError(() => new Error(errorInfo.message));
  }

  /**
   * 创建错误信息对象
   */
  private createErrorInfo(error: HttpErrorResponse): ErrorInfo {
    let message = '未知错误';

    if (error.error instanceof ErrorEvent) {
      // 客户端错误
      message = `客户端错误: ${error.error.message}`;
    } else {
      // 服务端错误
      message = this.getServerErrorMessage(error);
    }

    return {
      message,
      status: error.status,
      statusText: error.statusText,
      timestamp: new Date(),
      url: error.url,
      details: error.error
    };
  }

  /**
   * 获取服务器错误信息
   */
  private getServerErrorMessage(error: HttpErrorResponse): string {
    if (error.error && typeof error.error === 'object') {
      // 尝试从响应中提取详细错误信息
      if (error.error.detail) {
        return error.error.detail;
      }
      if (error.error.message) {
        return error.error.message;
      }
      if (error.error.error) {
        return error.error.error;
      }
    }

    // 根据状态码返回通用错误信息
    switch (error.status) {
      case 400:
        return '请求参数错误';
      case 401:
        return '请先登录';
      case 403:
        return '权限不足';
      case 404:
        return '请求的资源不存在';
      case 408:
        return '请求超时';
      case 409:
        return '资源冲突';
      case 422:
        return '请求参数验证失败';
      case 429:
        return '请求过于频繁，请稍后重试';
      case 500:
        return '服务器内部错误';
      case 502:
        return '网关错误';
      case 503:
        return '服务暂时不可用';
      case 504:
        return '网关超时';
      default:
        return `服务器错误 (${error.status})`;
    }
  }

  /**
   * 记录错误日志
   */
  private logError(errorInfo: ErrorInfo): void {
    // 添加到错误列表
    this.errors.unshift(errorInfo);

    // 限制错误列表长度
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // 输出到控制台
    console.error('应用错误:', errorInfo);

    // 在生产环境中，可以在这里添加错误上报逻辑
    // this.reportError(errorInfo);
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): ErrorInfo[] {
    return [...this.errors];
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errors = [];
  }

  /**
   * 获取最近的错误
   */
  getRecentError(): ErrorInfo | null {
    return this.errors.length > 0 ? this.errors[0] : null;
  }

  /**
   * 检查是否有网络错误
   */
  isNetworkError(error: any): boolean {
    return error instanceof HttpErrorResponse && error.status === 0;
  }

  /**
   * 检查是否为认证错误
   */
  isAuthError(error: any): boolean {
    return error instanceof HttpErrorResponse && error.status === 401;
  }

  /**
   * 检查是否为权限错误
   */
  isPermissionError(error: any): boolean {
    return error instanceof HttpErrorResponse && error.status === 403;
  }

  /**
   * 检查是否为服务器错误
   */
  isServerError(error: any): boolean {
    return error instanceof HttpErrorResponse && error.status >= 500;
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserFriendlyMessage(error: any): string {
    if (this.isNetworkError(error)) {
      return '网络连接失败，请检查网络设置';
    }

    if (this.isAuthError(error)) {
      return '登录已过期，请重新登录';
    }

    if (this.isPermissionError(error)) {
      return '您没有权限执行此操作';
    }

    if (this.isServerError(error)) {
      return '服务器暂时不可用，请稍后重试';
    }

    if (error instanceof HttpErrorResponse && error.error?.detail) {
      return error.error.detail;
    }

    if (error.message) {
      return error.message;
    }

    return '操作失败，请稍后重试';
  }

  /**
   * 错误上报（可选实现）
   */
  private reportError(errorInfo: ErrorInfo): void {
    // 这里可以实现错误上报到监控服务的逻辑
    // 例如发送到Sentry、Bugsnag等
    console.log('错误上报:', errorInfo);
  }
}