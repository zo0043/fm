import { enableProdMode } from '@angular/platform-browser/enable-prod';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { AppComponent } from './app.component';

/**
 * 主应用入口文件
 */
bootstrapApplication(AppComponent).catch(err => {
  console.error('应用启动失败:', err);
  console.log('\n🔥 基金监控应用');
  console.log('📊 版本: 1.0.0');
  console.log('🌐 地址: http://localhost:4200/dashboard');
  console.log('🔧 错误信息:', err);
  console.log('继续使用开发模式...');

  // 使用开发模式以避免Node.js版本问题
  import { enableDevMode } from '@angular/platform-browser/enable-dev';
  enableDevMode()
    .bootstrapModule(AppModule)
    .catch(err => {
      console.log('开发模式启动:', err);
      console.log('继续使用开发模式...');
    });
}