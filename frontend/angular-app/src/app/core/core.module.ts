import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';

// 原有核心服务
import { FundService } from './services/fund.service';
import { ChartService } from './services/chart.service';
import { ExportService } from './services/export.service';
import { WebSocketService } from './services/websocket.service';
import { MockDataService } from './services/mock-data.service';

// 新增核心服务
import { ApiConfigService } from './services/api-config.service';
import { AuthService } from './services/auth.service';
import { EnhancedFundService } from './services/enhanced-fund.service';
import { MonitorService } from './services/monitor.service';
import { LoadingService } from './services/loading.service';
import { ErrorHandlerService } from './services/error-handler.service';

// HTTP拦截器
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { LoadingInterceptor } from './interceptors/loading.interceptor';

@NgModule({
  imports: [
    HttpClientModule,
  ],
  providers: [
    // 原有服务
    FundService,
    ChartService,
    ExportService,
    WebSocketService,
    MockDataService,

    // 新增服务
    ApiConfigService,
    AuthService,
    EnhancedFundService,
    MonitorService,
    LoadingService,
    ErrorHandlerService,

    // HTTP拦截器（按顺序执行）
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
})
export class CoreModule {
  static forRoot() {
    return {
      ngModule: CoreModule,
      providers: []
    };
  }
}