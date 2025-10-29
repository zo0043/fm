import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { Subscription, BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  pageTitle$ = new BehaviorSubject<string>('基金监控系统');
  notificationCount = 0;

  private titleService: Title;
  private router: Router;
  private routerSubscription: Subscription;

  constructor(
    titleService: Title,
    router: Router
  ) {
    this.titleService = titleService;
    this.router = router;
  }

  ngOnInit(): void {
    // 设置页面标题
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd))
      .subscribe(() => {
        this.setPageTitle();
      });

    // 初始化应用
    this.initializeApp();
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private setPageTitle(): void {
    const title = this.getTitle(this.router.router.url);
    this.titleService.setTitle(title);
    this.pageTitle$.next(title);
  }

  private getTitle(url: string): string {
    const titleMap: { [key: string]: string } = {
      '/dashboard': '仪表板',
      '/funds': '基金管理',
      '/monitor': '监控管理',
      '/notifications': '通知管理',
      '/backtest': '回测管理',
      '/auth': '用户认证',
      '/profile': '个人资料'
    };

    // 移除查询参数和哈希
    const cleanUrl = url.split('?')[0].split('#')[0];

    // 查找匹配的标题
    for (const [path, title] of Object.entries(titleMap)) {
      if (cleanUrl === path || cleanUrl.startsWith(path + '/')) {
        return title;
      }
    }

    return '基金监控系统';
  }

  private initializeApp(): void {
    console.log('基金监控系统启动中...');
    console.log('📊 后端API: http://localhost:3000/api');
    console.log('🖥️️ 微服务架构运行中');

    // 检查后端连接状态
    this.checkBackendConnection();
  }

  private async checkBackendConnection(): Promise<void> {
    try {
      // 这里可以添加后端健康检查
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      console.log('✅ 后端服务状态:', data.status);

      if (data.status === 'healthy') {
        console.log('🎉 系统初始化完成');
        console.log('🌐 系统包含以下微服务:');
        console.log('   📊 数据收集服务');
        console.log('   🔍 监控引擎服务');
        console.log   🔔 通知服务');
        console.log('   📈 回测服务');
        console.log('   🛡️ API网关');
      }
    } catch (error) {
      console.error('❌ 后端服务连接失败:', error);
      console.log('请确保后端服务正在运行');
      console.log('启动命令: npm run dev:backend');
    }
  }
}