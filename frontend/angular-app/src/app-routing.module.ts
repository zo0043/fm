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
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: '基金监控面板'
  },
  {
    path: 'funds',
    loadChildren: () => import('./features/fund-management/fund-management.module').then(m => m.FundManagementModule)
  },
  {
    path: 'monitor',
    loadChildren: () => import('./features/monitor-settings/monitor-settings.module').then(m => m.MonitorSettingsModule)
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