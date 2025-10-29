import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // 跳过认证服务的登录和注册请求
    if (this.isAuthRequest(req.url)) {
      return next.handle(req);
    }

    return from(this.handleRequest(req, next));
  }

  private async handleRequest(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Promise<HttpEvent<any>> {
    let request = req;

    // 添加认证头
    const token = this.authService.getAccessToken();
    if (token && !this.isTokenExpired(token)) {
      request = this.addTokenHeader(request, token);
    }

    // 自动刷新令牌（如果即将过期）
    if (this.authService.isAuthenticated && this.shouldRefreshToken()) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        try {
          await this.authService.refreshToken().toPromise();
          const newToken = this.authService.getAccessToken();
          if (newToken) {
            request = this.addTokenHeader(req, newToken);
          }
        } catch (error) {
          console.error('令牌刷新失败:', error);
          // 刷新失败，清除认证状态
          this.authService.logout().subscribe();
        } finally {
          this.isRefreshing = false;
        }
      }
    }

    return next.handle(request).pipe(
      map((event: HttpEvent<any>) => {
        // 可以在这里处理响应
        return event;
      }),
      catchError((error: HttpErrorResponse) => {
        return this.handleResponseError(error, req, next);
      })
    ).toPromise();
  }

  private addTokenHeader(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private handleResponseError(
    error: HttpErrorResponse,
    originalRequest: HttpRequest<any>,
    next: HttpHandler
  ): Observable<never> {
    if (error.status === 401) {
      // 401 错误，可能是令牌过期
      if (!this.isRefreshing && this.authService.getRefreshToken()) {
        this.isRefreshing = true;

        return this.authService.refreshToken().pipe(
          switchMap(() => {
            this.isRefreshing = false;
            const newToken = this.authService.getAccessToken();
            if (newToken) {
              const newRequest = this.addTokenHeader(originalRequest, newToken);
              return next.handle(newRequest);
            }
            return throwError(() => error);
          }),
          catchError((refreshError) => {
            this.isRefreshing = false;
            // 刷新失败，清除认证状态
            this.authService.logout().subscribe();
            return throwError(() => refreshError);
          })
        );
      } else {
        // 没有刷新令牌或正在刷新中，直接登出
        this.authService.logout().subscribe();
      }
    }

    return throwError(() => error);
  }

  private isAuthRequest(url: string): boolean {
    const authEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/refresh'
    ];

    return authEndpoints.some(endpoint => url.includes(endpoint));
  }

  private isTokenExpired(token: string): boolean {
    return this.authService.isTokenExpired(token);
  }

  private shouldRefreshToken(): boolean {
    const remainingTime = this.authService.getTokenRemainingTime();
    // 如果令牌在5分钟内过期，需要刷新
    return remainingTime > 0 && remainingTime < 300;
  }
}