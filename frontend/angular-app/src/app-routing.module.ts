import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./app/features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: '基金监控面板'
  },
  {
    path: 'funds',
    loadComponent: () => import('./app/features/fund-management/fund-management.component').then(m => m.FundManagementComponent),
    title: '基金管理'
  },
  {
    path: 'backtest',
    loadComponent: () => import('./app/features/backtest/backtest.component').then(m => m.BacktestComponent),
    title: '回测分析'
  },
  {
    path: 'monitor',
    loadComponent: () => import('./app/features/monitor-settings/monitor-settings.component').then(m => m.MonitorSettingsComponent),
    title: '监控设置'
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }