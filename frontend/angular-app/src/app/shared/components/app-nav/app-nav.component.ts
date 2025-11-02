import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { AuthService, User } from '../../../core/services/auth.service';

@Component({
  selector: 'app-app-nav',
  templateUrl: './app-nav.component.html',
  styleUrls: ['./app-nav.component.scss']
})
export class AppNavComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isAuthenticated = false;

  private authSubscription: Subscription | undefined;

  navigationItems = [
    {
      path: '/dashboard',
      icon: 'dashboard',
      label: '仪表板'
    },
    {
      path: '/funds',
      icon: 'show_chart',
      label: '基金管理'
    },
    {
      path: '/portfolio',
      icon: 'account_balance',
      label: '投资组合'
    },
    {
      path: '/backtest',
      icon: 'assessment',
      label: '回测分析'
    },
    {
      path: '/history',
      icon: 'history',
      label: '历史记录'
    },
    {
      path: '/monitor',
      icon: 'notifications_active',
      label: '监控设置'
    },
    {
      path: '/notifications',
      icon: 'notifications',
      label: '通知管理'
    }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAuthenticated = user !== null;
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  isActiveRoute(path: string): boolean {
    return this.router.url === path || this.router.url.startsWith(path + '/');
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout failed:', error);
        // 即使登出失败，也清除本地状态
        this.router.navigate(['/login']);
      }
    });
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    const username = this.currentUser.username;
    return username.substring(0, 2).toUpperCase();
  }

  formatUserName(): string {
    if (!this.currentUser) return '';
    return this.currentUser.username.charAt(0).toUpperCase() +
           this.currentUser.username.slice(1).toLowerCase();
  }
}