import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material Modules
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

// Chart.js
import { BaseChartDirective } from 'ng2-charts';

// 管道
import { SafeHtmlPipe } from './pipes/safe-html.pipe';

// 导入我们创建的组件
import { KLineChartComponent } from './components/fund-chart/k-line-chart/k-line-chart.component';
import { FundCardComponent } from './components/fund-card/fund-card.component';
import { TrendIndicatorComponent } from './components/trend-indicator/trend-indicator.component';
import { SimpleExportButtonComponent } from './components/simple-export-button/simple-export-button.component';

@NgModule({
  declarations: [
    SafeHtmlPipe
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    MatTabsModule,
    MatGridListModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatSelectModule,
    MatOptionModule,
    BaseChartDirective
  ],
  exports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    MatTabsModule,
    MatGridListModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatSelectModule,
    MatOptionModule,
    SafeHtmlPipe,
    BaseChartDirective
  ]
})
export class SharedModule { }