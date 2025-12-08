import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, throwError } from 'rxjs';
import { TIME_CONSTANTS } from '../../shared/constants/app.constants';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'network',
  AUTH = 'auth',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

/**
 * 应用错误接口
 */
export interface AppError {
  type: ErrorType;
  message: string;
  detail?: string;
  code?: string | number;
  timestamp: Date;
  originalError?: any;
}

/**
 * 统一错误处理服务
 * 提供应用级别的错误处理、用户提示和日志记录
 *
 * 使用方法：
 * constructor(private errorHandler: ErrorHandlerService) {}
 *
 * // 在 catchError 中使用
 * this.http.get('/api/data').pipe(
 *   catchError(error => this.errorHandler.handleHttpError(error))
 * );
 *
 * // 直接显示错误
 * this.errorHandler.showError('操作失败');
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  // 错误消息映射
  private readonly errorMessages: Record<ErrorType, string> = {
    [ErrorType.NETWORK]: '网络连接失败，请检查网络设置',
    [ErrorType.AUTH]: '登录已过期，请重新登录',
    [ErrorType.VALIDATION]: '输入数据验证失败',
    [ErrorType.NOT_FOUND]: '请求的资源不存在',
    [ErrorType.SERVER]: '服务器错误，请稍后重试',
    [ErrorType.TIMEOUT]: '请求超时，请稍后重试',
    [ErrorType.UNKNOWN]: '发生未知错误'
  };

  // HTTP 状态码映射
  private readonly httpStatusMessages: Record<number, string> = {
    400: '请求参数错误',
    401: '未授权，请登录',
    403: '没有权限执行此操作',
    404: '请求的资源不存在',
    408: '请求超时',
    409: '数据冲突，请刷新后重试',
    422: '数据验证失败',
    429: '请求过于频繁，请稍后重试',
    500: '服务器内部错误',
    502: '网关错误',
    503: '服务暂时不可用',
    504: '网关超时'
  };

  constructor(private snackBar: MatSnackBar) {}

  /**
   * 处理 HTTP 错误
   * @param error HTTP 错误响应
   * @param customMessage 自定义错误消息（可选）
   * @returns Observable 错误
   */
  handleHttpError(error: HttpErrorResponse, customMessage?: string): Observable<never> {
    const appError = this.parseHttpError(error);

    // 显示用户友好的错误提示
    this.showError(customMessage || appError.message, appError.type);

    // 记录错误日志
    this.logError(appError);

    return throwError(() => appError);
  }

  /**
   * 解析 HTTP 错误为应用错误
   */
  parseHttpError(error: HttpErrorResponse): AppError {
    let type: ErrorType;
    let message: string;
    let detail: string | undefined;

    // 判断错误类型
    if (error.status === 0) {
      // 网络错误或 CORS 错误
      type = ErrorType.NETWORK;
      message = this.errorMessages[ErrorType.NETWORK];
    } else if (error.status === 401) {
      type = ErrorType.AUTH;
      message = this.errorMessages[ErrorType.AUTH];
    } else if (error.status === 404) {
      type = ErrorType.NOT_FOUND;
      message = this.httpStatusMessages[404];
    } else if (error.status >= 400 && error.status < 500) {
      type = ErrorType.VALIDATION;
      message = this.httpStatusMessages[error.status] || this.errorMessages[ErrorType.VALIDATION];
      // 尝试获取服务器返回的详细错误信息
      if (error.error?.message) {
        detail = error.error.message;
      }
    } else if (error.status >= 500) {
      type = ErrorType.SERVER;
      message = this.httpStatusMessages[error.status] || this.errorMessages[ErrorType.SERVER];
    } else {
      type = ErrorType.UNKNOWN;
      message = this.errorMessages[ErrorType.UNKNOWN];
    }

    return {
      type,
      message,
      detail,
      code: error.status,
      timestamp: new Date(),
      originalError: error
    };
  }

  /**
   * 显示错误提示
   * @param message 错误消息
   * @param type 错误类型（用于确定样式）
   * @param action 操作按钮文本
   * @param duration 显示时长
   */
  showError(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    action: string = '关闭',
    duration: number = TIME_CONSTANTS.SNACKBAR_DURATION
  ): void {
    const panelClass = this.getSnackBarClass(type);

    this.snackBar.open(message, action, {
      duration,
      panelClass: [panelClass],
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  /**
   * 显示成功提示
   */
  showSuccess(message: string, duration: number = TIME_CONSTANTS.SNACKBAR_DURATION): void {
    this.snackBar.open(message, '关闭', {
      duration,
      panelClass: ['snackbar-success'],
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  /**
   * 显示警告提示
   */
  showWarning(message: string, duration: number = TIME_CONSTANTS.SNACKBAR_DURATION): void {
    this.snackBar.open(message, '关闭', {
      duration,
      panelClass: ['snackbar-warning'],
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  /**
   * 显示信息提示
   */
  showInfo(message: string, duration: number = TIME_CONSTANTS.SNACKBAR_DURATION): void {
    this.snackBar.open(message, '关闭', {
      duration,
      panelClass: ['snackbar-info'],
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  /**
   * 显示离线/模拟数据提示
   */
  showOfflineNotice(): void {
    this.snackBar.open('当前使用离线数据，部分功能可能不可用', '了解', {
      duration: 5000,
      panelClass: ['snackbar-warning'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  /**
   * 显示模拟数据提示
   */
  showMockDataNotice(): void {
    this.snackBar.open('当前显示模拟数据，API 服务不可用', '了解', {
      duration: 5000,
      panelClass: ['snackbar-info'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom'
    });
  }

  /**
   * 记录错误日志
   */
  private logError(error: AppError): void {
    // 开发环境打印详细日志
    console.error('[ErrorHandler]', {
      type: error.type,
      message: error.message,
      detail: error.detail,
      code: error.code,
      timestamp: error.timestamp.toISOString()
    });

    // 生产环境可以发送到日志服务
    // this.sendToLogService(error);
  }

  /**
   * 获取 SnackBar 样式类
   */
  private getSnackBarClass(type: ErrorType): string {
    switch (type) {
      case ErrorType.AUTH:
        return 'snackbar-warning';
      case ErrorType.NETWORK:
      case ErrorType.TIMEOUT:
        return 'snackbar-error';
      case ErrorType.VALIDATION:
        return 'snackbar-warning';
      case ErrorType.NOT_FOUND:
        return 'snackbar-info';
      case ErrorType.SERVER:
        return 'snackbar-error';
      default:
        return 'snackbar-error';
    }
  }

  /**
   * 创建用户友好的错误消息
   * @param operation 操作名称
   * @param error 原始错误
   */
  createUserMessage(operation: string, error?: any): string {
    if (error instanceof HttpErrorResponse) {
      const appError = this.parseHttpError(error);
      return `${operation}失败：${appError.message}`;
    }

    if (error?.message) {
      return `${operation}失败：${error.message}`;
    }

    return `${operation}失败，请稍后重试`;
  }

  /**
   * 判断是否为网络错误
   */
  isNetworkError(error: any): boolean {
    if (error instanceof HttpErrorResponse) {
      return error.status === 0;
    }
    return false;
  }

  /**
   * 判断是否为认证错误
   */
  isAuthError(error: any): boolean {
    if (error instanceof HttpErrorResponse) {
      return error.status === 401;
    }
    return false;
  }

  /**
   * 判断是否为服务器错误
   */
  isServerError(error: any): boolean {
    if (error instanceof HttpErrorResponse) {
      return error.status >= 500;
    }
    return false;
  }
}
