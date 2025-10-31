import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    access_token: string;
    expires_in: number;
    user: User;
  };
}

export interface LoginRequest {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.microservices.auth;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenKey = 'auth_token';

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.currentUserSubject.asObservable().pipe(
    map(user => user !== null)
  );

  constructor(private http: HttpClient) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      // TODO: 验证token有效性并获取用户信息
      this.getCurrentUser().subscribe();
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/api/v1/auth/login`, credentials).pipe(
      tap(response => {
        if (response.success) {
          this.setToken(response.data.access_token);
          this.currentUserSubject.next(response.data.user);
        }
      }),
      catchError(this.handleError)
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/v1/auth/logout`, {}).pipe(
      tap(() => {
        this.clearToken();
        this.currentUserSubject.next(null);
      }),
      catchError(this.handleError)
    );
  }

  getCurrentUser(): Observable<{ success: boolean; data: User }> {
    return this.http.get<{ success: boolean; data: User }>(`${this.apiUrl}/api/v1/auth/me`).pipe(
      tap(response => {
        if (response.success) {
          this.currentUserSubject.next(response.data);
        }
      }),
      catchError(this.handleError)
    );
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  private handleError(error: any): Observable<never> {
    console.error('Auth service error:', error);
    throw error;
  }
}