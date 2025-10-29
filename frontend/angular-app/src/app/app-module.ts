import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';

// 导入简化路由配置
import { SimpleRoutingModule } from './app-routing-simple';

// 导入核心模块
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';

// 导入新创建的页面组件
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { FundManagementComponent } from './features/fund-management/fund-management.component';
import { MonitorSettingsComponent } from './features/monitor-settings/monitor-settings.component';

// 导入服务
import { MockDataService } from './core/services/mock-data.service';

import { AppComponent } from '../app.component';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    FundManagementComponent,
    MonitorSettingsComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    SimpleRoutingModule,
    CoreModule,
    SharedModule
  ],
  providers: [
    MockDataService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }