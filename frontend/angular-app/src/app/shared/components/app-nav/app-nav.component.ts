import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-app-nav',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatMenuModule,
    MatTooltipModule
  ],
  templateUrl: './app-nav.component.html',
  styleUrls: ['./app-nav.component.scss']
})
export class AppNavComponent {
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
    private router: Router
  ) {}

  isActiveRoute(path: string): boolean {
    return this.router.url === path || this.router.url.startsWith(path + '/');
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}