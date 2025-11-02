import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatSliderModule } from '@angular/material/slider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgFor, NgIf, NgClass } from '@angular/common';

import { AppComponent } from '../app.component';
import { DashboardComponent } from '../features/dashboard/dashboard.component';
import { FundManagementComponent } from '../features/fund-management/fund-management.component';
import { MonitorSettingsComponent } from '../features/monitor-settings/monitor-settings.component';
import { BacktestComponent } from '../features/backtest/backtest.component';
import { FundDetailComponent } from '../features/fund-detail/fund-detail.component';
import { PortfolioComponent } from '../features/portfolio/portfolio.component';
import { HistoryComponent } from '../features/history/history.component';
import { AppNavComponent } from './shared/components/app-nav/app-nav.component';

// 回测组件
import { StrategySelectorComponent } from '../features/backtest/components/strategy-selector/strategy-selector.component';
import { DateRangePickerComponent } from '../features/backtest/components/date-range-picker/date-range-picker.component';
import { FundSelectorComponent } from '../features/backtest/components/fund-selector/fund-selector.component';
import { BacktestResultsComponent } from '../features/backtest/components/backtest-results/backtest-results.component';

// 基金详情组件
import { FundBasicInfoComponent } from '../features/fund-detail/components/fund-basic-info/fund-basic-info.component';
import { PerformanceChartComponent } from '../features/fund-detail/components/performance-chart/performance-chart.component';

// 投资组合组件
import { AssetAllocationComponent } from '../features/portfolio/components/asset-allocation/asset-allocation.component';

// 历史记录组件
import { TransactionRecordsComponent } from '../features/history/components/transaction-records/transaction-records.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    title: '基金监控面板'
  },
  {
    path: 'funds',
    component: FundManagementComponent,
    title: '基金管理'
  },
  {
    path: 'monitor',
    component: MonitorSettingsComponent,
    title: '监控设置'
  },
  {
    path: 'backtest',
    component: BacktestComponent,
    title: '投资策略回测'
  },
  {
    path: 'fund/:id',
    component: FundDetailComponent,
    title: '基金详情'
  },
  {
    path: 'portfolio',
    component: PortfolioComponent,
    title: '投资组合分析'
  },
  {
    path: 'history',
    component: HistoryComponent,
    title: '历史记录'
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    FundManagementComponent,
    MonitorSettingsComponent,
    BacktestComponent,
    FundDetailComponent,
    PortfolioComponent,
    HistoryComponent,
    AppNavComponent,
    // 回测组件
    StrategySelectorComponent,
    DateRangePickerComponent,
    FundSelectorComponent,
    BacktestResultsComponent,
    // 基金详情组件
    FundBasicInfoComponent,
    PerformanceChartComponent,
    // 投资组合组件
    AssetAllocationComponent,
    // 历史记录组件
    TransactionRecordsComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RouterModule.forRoot(routes),
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    // 基金管理模块
    MatTableModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    // 监控设置模块
    MatChipsModule,
    MatDialogModule,
    // 回测功能模块
    MatRadioModule,
    MatSliderModule,
    MatTabsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatExpansionModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }