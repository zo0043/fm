import { Injectable } from '@angular/core';
import { of, timer } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthStorageService {
  private readonly storageKey = 'auth_token';
  private readonly refreshKey = 'refresh_token';
  private readonly tokenExpiryKey = 'token_expiry';

  constructor() {}

  /**
   * 存储访问令牌
   * 使用HttpOnly cookie提高安全性
   */
  setAccessToken(token: string, expiresIn?: number): void {
    const expiryTime = expiresIn || 3600; // 默认1小时
    const expiryDate = new Date.now() + expiryTime * 1000;

    // 使用HttpOnly cookie
    document.cookie = `${this.storageKey}=${token}; path=/; SameSite=Strict; HttpOnly; Secure=${window.location.protocol === 'https:'}; Expires=${expiryDate.toUTCString()};`;
  }

  /**
   * 获取访问令牌
   */
  getAccessToken(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === this.storageKey) {
        return value;
      }
    }
    return null;
  }

  /**
   * 存储刷新令牌
   */
  setRefreshToken(token: string, expiresIn?: number): void {
    const expiryTime = expiresIn || 86400; // 默认24小时
    const expiryDate = new Date.now() + expiryTime * 1000;

    document.cookie = `${this.refreshKey}=${token}; path=/; SameSite=Strict; HttpOnly; Secure=${window.location.protocol === 'https:'}; Expires=${expiryDate.toUTCString()};`;
  }

  /**
   * 获取刷新令牌
   */
  getRefreshToken(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === this.refreshKey) {
        return value;
      }
    }
    return null;
  }

  /**
   * 检查令牌是否存在
   */
  hasToken(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * 检查刷新令牌是否存在
   */
  hasRefreshToken(): boolean {
    return !!this.getRefreshToken();
  }

  /**
   * 清除认证信息
   */
  clearAuth(): void {
    document.cookie = `${this.storageKey}=; path=/; SameSite=Strict; HttpOnly; Secure=${window.location.protocol === 'https:'}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${this.refreshKey}=; path=/; SameSite=Strict; HttpOnly; Secure=${window.location.protocol === 'https:'}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }

  /**
   * 获取令牌剩余有效时间（秒）
   */
  getTokenRemainingTime(): number {
    const token = this.getAccessToken();
    if (!token) return 0;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now();
      const expiryTime = payload.exp * 1000;

      return Math.max(0, (expiryTime - currentTime) / 1000);
    } catch (error) {
      // 如果解析失败，假设令牌已过期
      return 0;
    }
  }

  /**
   * 自动刷新令牌
   */
  autoRefreshToken(): Observable<boolean> {
    if (!this.hasToken()) {
      return of(false);
    }

    const remainingTime = this.getTokenRemainingTime();
    // 如果令牌在5分钟内过期，需要刷新
    if (remainingTime > 0 && remainingTime < 300) {
      return of(true);
    }

    return of(false);
  }

  /**
   * 生成安全的UUID
   */
  generateSecureUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, '');
  }
}