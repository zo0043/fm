import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor() {
    console.log('🚀 基金监控系统启动');
    console.log('📊 支持的功能：仪表板、基金管理、监控设置、通知管理、回测分析');
  }
}