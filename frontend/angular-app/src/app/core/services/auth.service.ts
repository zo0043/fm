import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { ApiConfigService } from './api-config.service';

// 用户信息接口
export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

// 认证响应接口
export interface AuthResponse {
  user: User;
  token: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
}

// 登录请求接口
export interface LoginRequest {
  username: string;
  password: string;
}

// 注册请求接口
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

// 修改密码请求接口
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

// 更新用户信息请求接口
export interface UpdateUserRequest {
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'current_user';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private apiConfig: ApiConfigService
  ) {
    this.initializeAuth();
  }

  /**
   * 初始化认证状态
   */
  private initializeAuth(): void {
    const token = this.getAccessToken();
    const user = this.getCurrentUser();

    if (token && user) {
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
    }
  }

  /**
   * 用户登录
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiConfig.authUrl}/login`, credentials).pipe(
      tap(response => {
        this.setTokens(response.token);
        this.setCurrentUser(response.user);
        this.currentUserSubject.next(response.user);
        this.isAuthenticatedSubject.next(true);
      }),
      catchError(error => this.handleError(error, '登录失败'))
    );
  }

  /**
   * 用户注册
   */
  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiConfig.authUrl}/register`, userData).pipe(
      tap(response => {
        this.setTokens(response.token);
        this.setCurrentUser(response.user);
        this.currentUserSubject.next(response.user);
        this.isAuthenticatedSubject.next(true);
      }),
      catchError(error => this.handleError(error, '注册失败'))
    );
  }

  /**
   * 用户登出
   */
  logout(): Observable<any> {
    return this.http.post(`${this.apiConfig.authUrl}/logout`, {}).pipe(
      tap(() => {
        this.clearAuthData();
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
      }),
      catchError(error => {
        // 即使服务端登出失败，也清除本地数据
        this.clearAuthData();
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        return of({ message: '登出成功' });
      })
    );
  }

  /**
   * 刷新访问令牌
   */
  refreshToken(): Observable<{ access_token: string; token_type: string }> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearAuthData();
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
      return throwError('没有刷新令牌');
    }

    return this.http.post<{ access_token: string; token_type: string }>(
      `${this.apiConfig.authUrl}/refresh`,
      { refresh_token: refreshToken }
    ).pipe(
      tap(response => {
        this.setAccessToken(response.access_token);
      }),
      catchError(error => {
        this.clearAuthData();
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        return this.handleError(error, '令牌刷新失败');
      })
    );
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUserInfo(): Observable<User> {
    return this.http.get<User>(`${this.apiConfig.authUrl}/me`).pipe(
      tap(user => {
        this.setCurrentUser(user);
        this.currentUserSubject.next(user);
      }),
      catchError(error => this.handleError(error, '获取用户信息失败'))
    );
  }

  /**
   * 更新用户资料
   */
  updateProfile(userData: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.apiConfig.usersUrl}/profile`, userData).pipe(
      tap(user => {
        this.setCurrentUser(user);
        this.currentUserSubject.next(user);
      }),
      catchError(error => this.handleError(error, '更新用户资料失败'))
    );
  }

  /**
   * 修改密码
   */
  changePassword(passwordData: ChangePasswordRequest): Observable<any> {
    return this.http.post(`${this.apiConfig.usersUrl}/change-password`, passwordData).pipe(
      catchError(error => this.handleError(error, '修改密码失败'))
    );
  }

  /**
   * 停用用户账户
   */
  deactivateAccount(): Observable<any> {
    return this.http.post(`${this.apiConfig.usersUrl}/deactivate`, {}).pipe(
      tap(() => {
        this.clearAuthData();
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
      }),
      catchError(error => this.handleError(error, '账户停用失败'))
    );
  }

  /**
   * 检查是否已认证
   */
  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * 获取当前用户
   */
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * 获取访问令牌
   */
  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * 获取刷新令牌
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * 设置访问令牌
   */
  private setAccessToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * 设置令牌
   */
  private setTokens(token: { access_token: string; refresh_token: string }): void {
    localStorage.setItem(this.TOKEN_KEY, token.access_token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token.refresh_token);
  }

  /**
   * 设置当前用户
   */
  private setCurrentUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * 获取当前用户（从存储）
   */
  private getCurrentUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * 清除认证数据
   */
  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * 获取认证头
   */
  getAuthHeaders(): HttpHeaders {
    const token = this.getAccessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * 检查令牌是否过期
   */
  isTokenExpired(token?: string): boolean {
    const accessToken = token || this.getAccessToken();
    if (!accessToken) {
      return true;
    }

    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const exp = payload.exp;
      const now = Math.floor(Date.now() / 1000);
      return exp < now;
    } catch {
      return true;
    }
  }

  /**
   * 获取令牌剩余有效时间（秒）
   */
  getTokenRemainingTime(): number {
    const token = this.getAccessToken();
    if (!token) {
      return 0;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      const now = Math.floor(Date.now() / 1000);
      return Math.max(0, exp - now);
    } catch {
      return 0;
    }
  }

  /**
   * 自动刷新令牌（如果即将过期）
   */
  autoRefreshTokenIfNeeded(): Observable<any> {
    const remainingTime = this.getTokenRemainingTime();

    // 如果令牌在5分钟内过期，自动刷新
    if (remainingTime > 0 && remainingTime < 300) {
      return this.refreshToken();
    }

    return of(null);
  }

  /**
   * 错误处理
   */
  private handleError(error: any, defaultMessage: string): Observable<never> {
    console.error(`${defaultMessage}:`, error);

    let message = defaultMessage;

    if (error.error && error.error.detail) {
      message = error.error.detail;
    } else if (error.status === 401) {
      message = '认证失败，请重新登录';
      this.clearAuthData();
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
    } else if (error.status === 403) {
      message = '权限不足';
    } else if (error.status === 404) {
      message = '请求的资源不存在';
    } else if (error.status === 500) {
      message = '服务器内部错误，请稍后重试';
    }

    return throwError(() => new Error(message));
  }
}