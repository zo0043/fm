import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Routes } from '@angular/router';

// 导入所有页面组件
import { DashboardComponent } from '../features/dashboard/dashboard.component';
import { FundManagementComponent } from '../features/fund-management/fund-management.component';
import { MonitorSettingsComponent } from '../features/monitor-settings/monitor-settings.component';

// 使用方法：在main.ts中提供
// import { provideRouter } from '@angular/router';
// bootstrapApplication(AppComponent, {
//   providers: [provideRouter(routes)]
// });

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'funds', component: FundManagementComponent },
  { path: 'monitor', component: MonitorSettingsComponent },
  { path: '**', redirectTo: '/dashboard' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes),
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule
  ],
  declarations: [
    AppComponent,
    DashboardComponent,
    FundManagementComponent,
    MonitorSettingsComponent
  ],
  bootstrap: [AppComponent]
})
export class SimpleRoutingModule { }