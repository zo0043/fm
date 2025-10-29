import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface BreakpointState {
  xs: boolean;
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
  current: string;
}

@Component({
  selector: 'app-responsive-layout',
  template: `
    <div class="responsive-layout" [ngClass]="layoutClasses">
      <!-- 侧边栏 -->
      <aside class="sidebar"
             [class.collapsed]="sidebarCollapsed"
             [class.hidden]="sidebarHidden"
             [attr.aria-hidden]="sidebarHidden">
        <div class="sidebar-header">
          <div class="logo" *ngIf="!sidebarCollapsed">
            <img [src]="logoUrl" [alt]="logoAlt" class="logo-image" *ngIf="logoUrl">
            <span class="logo-text" *ngIf="title">{{ title }}</span>
          </div>
          <div class="logo-collapsed" *ngIf="sidebarCollapsed">
            <img [src]="logoUrl" [alt]="logoAlt" class="logo-collapsed-image" *ngIf="logoUrl">
            <span class="logo-collapsed-text" *ngIf="title">{{ title.charAt(0) }}</span>
          </div>
        </div>

        <div class="sidebar-content">
          <ng-content select="[sidebar]"></ng-content>
        </div>

        <div class="sidebar-footer" *ngIf="showSidebarFooter">
          <ng-content select="[sidebar-footer]"></ng-content>
        </div>
      </aside>

      <!-- 移动端侧边栏遮罩 -->
      <div class="sidebar-overlay"
           [class.visible]="isMobile && !sidebarHidden"
           (click)="toggleSidebar()">
      </div>

      <!-- 主内容区 -->
      <main class="main-content" [class.full-width]="sidebarHidden">
        <!-- 顶部导航栏 -->
        <header class="header" [class.fixed]="fixedHeader">
          <div class="header-left">
            <button mat-icon-button
                    (click)="toggleSidebar()"
                    [attr.aria-label]="sidebarHidden ? '显示侧边栏' : '隐藏侧边栏'"
                    class="menu-toggle">
              <mat-icon>menu</mat-icon>
            </button>

            <div class="header-title" *ngIf="headerTitle">
              <h1>{{ headerTitle }}</h1>
              <span class="header-subtitle" *ngIf="headerSubtitle">{{ headerSubtitle }}</span>
            </div>
          </div>

          <div class="header-center">
            <ng-content select="[header-center]"></ng-content>
          </div>

          <div class="header-right">
            <ng-content select="[header-right]"></ng-content>

            <!-- 响应式工具 -->
            <div class="responsive-tools">
              <app-realtime-status
                [showText]="breakpointState.md"
                [showControls]="breakpointState.lg">
              </app-realtime-status>
            </div>
          </div>
        </header>

        <!-- 内容区域 -->
        <div class="content-wrapper" [class.has-fixed-header]="fixedHeader">
          <div class="content">
            <ng-content></ng-content>
          </div>
        </div>

        <!-- 底部 -->
        <footer class="footer" *ngIf="showFooter">
          <ng-content select="[footer]"></ng-content>
        </footer>
      </main>
    </div>
  `,
  styles: [`
    .responsive-layout {
      display: flex;
      min-height: 100vh;
      background-color: var(--background-primary);
    }

    .sidebar {
      width: 280px;
      background-color: var(--background-secondary);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      transition: width 0.3s ease, transform 0.3s ease;
      position: relative;
      z-index: 100;
    }

    .sidebar.collapsed {
      width: 80px;
    }

    .sidebar.hidden {
      transform: translateX(-100%);
    }

    .sidebar-header {
      padding: 16px;
      border-bottom: 1px solid var(--border-color);
      background-color: var(--background-light);
      min-height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-image {
      height: 32px;
      width: auto;
    }

    .logo-text {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
    }

    .logo-collapsed {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .logo-collapsed-image {
      height: 32px;
      width: auto;
    }

    .logo-collapsed-text {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      text-transform: uppercase;
    }

    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px 0;
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid var(--border-color);
      background-color: var(--background-light);
    }

    .sidebar-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 99;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }

    .sidebar-overlay.visible {
      opacity: 1;
      visibility: visible;
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      transition: margin-left 0.3s ease;
    }

    .main-content.full-width {
      margin-left: 0;
    }

    .header {
      height: 64px;
      background-color: var(--background-secondary);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      padding: 0 24px;
      gap: 16px;
      position: relative;
      z-index: 50;
    }

    .header.fixed {
      position: sticky;
      top: 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
    }

    .menu-toggle {
      display: none;
    }

    .header-title h1 {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .header-subtitle {
      font-size: 14px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .header-center {
      flex: 2;
      display: flex;
      justify-content: center;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      justify-content: flex-end;
    }

    .responsive-tools {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .content-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .content-wrapper.has-fixed-header {
      padding-top: 0;
    }

    .content {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
    }

    .footer {
      padding: 16px 24px;
      background-color: var(--background-light);
      border-top: 1px solid var(--border-color);
      text-align: center;
      color: var(--text-muted);
      font-size: 14px;
    }

    /* 响应式设计 */
    @media (max-width: 1279px) {
      .sidebar {
        width: 80px;
      }

      .logo-text,
      .header-title {
        display: none;
      }
    }

    @media (max-width: 1023px) {
      .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 280px;
        transform: translateX(-100%);
        z-index: 1000;
      }

      .sidebar.hidden {
        transform: translateX(-100%);
      }

      .sidebar:not(.hidden) {
        transform: translateX(0);
      }

      .main-content {
        margin-left: 0;
      }

      .menu-toggle {
        display: flex;
      }

      .header-center {
        display: none;
      }

      .header-right {
        flex: 2;
      }

      .content {
        padding: 16px;
      }
    }

    @media (max-width: 767px) {
      .header {
        padding: 0 16px;
        height: 56px;
      }

      .content {
        padding: 12px;
      }

      .sidebar {
        width: 100%;
        max-width: 280px;
      }

      .responsive-tools {
        gap: 4px;
      }
    }

    @media (max-width: 479px) {
      .header-left {
        gap: 8px;
      }

      .header-right {
        gap: 8px;
      }

      .header-subtitle {
        display: none;
      }
    }

    /* 无障碍支持 */
    @media (prefers-reduced-motion: reduce) {
      .sidebar,
      .main-content,
      .sidebar-overlay {
        transition: none;
      }
    }

    /* 打印样式 */
    @media print {
      .sidebar,
      .sidebar-overlay,
      .menu-toggle,
      .header-right {
        display: none !important;
      }

      .main-content {
        margin: 0 !important;
      }

      .header {
        position: static !important;
      }

      .content {
        padding: 0 !important;
      }
    }

    /* 高对比度模式 */
    @media (prefers-contrast: high) {
      .sidebar,
      .header {
        border-width: 2px;
      }

      .logo-text,
      .header-title h1 {
        font-weight: 700;
      }
    }
  `]
})
export class ResponsiveLayoutComponent implements OnInit, OnDestroy {
  // 输入属性
  @Input() title: string = '基金监控';
  @Input() logoUrl: string = '';
  @Input() logoAlt: string = 'Logo';
  @Input() headerTitle: string = '';
  @Input() headerSubtitle: string = '';
  @Input() fixedHeader: boolean = true;
  @Input() showSidebar: boolean = true;
  @Input() showSidebarFooter: boolean = false;
  @Input() showFooter: boolean = true;
  @Input() defaultCollapsed: boolean = false;

  // 输出事件
  @Output() sidebarToggle = new EventEmitter<boolean>();
  @Output() breakpointChange = new EventEmitter<BreakpointState>();

  // 内部状态
  sidebarCollapsed: boolean = false;
  sidebarHidden: boolean = false;
  isMobile: boolean = false;
  breakpointState: BreakpointState = {
    xs: false,
    sm: false,
    md: false,
    lg: false,
    xl: false,
    current: 'lg'
  };

  private destroy$ = new Subject<void>();
  private resizeTimeout: any;

  ngOnInit(): void {
    this.sidebarCollapsed = this.defaultCollapsed;
    this.setupResponsive();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
  }

  /**
   * 设置响应式监听
   */
  private setupResponsive(): void {
    this.updateBreakpointState();

    window.addEventListener('resize', this.handleResize.bind(this));

    // 初始检查
    setTimeout(() => {
      this.updateBreakpointState();
    }, 100);
  }

  /**
   * 处理窗口大小变化
   */
  private handleResize(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = setTimeout(() => {
      this.updateBreakpointState();
    }, 150);
  }

  /**
   * 更新断点状态
   */
  private updateBreakpointState(): void {
    const width = window.innerWidth;
    const oldState = { ...this.breakpointState };

    this.breakpointState = {
      xs: width >= 0 && width < 480,
      sm: width >= 480 && width < 768,
      md: width >= 768 && width < 1024,
      lg: width >= 1024 && width < 1280,
      xl: width >= 1280,
      current: this.getCurrentBreakpoint(width)
    };

    this.isMobile = this.breakpointState.xs || this.breakpointState.sm;

    // 在移动端自动隐藏侧边栏
    if (this.isMobile && !this.sidebarHidden) {
      this.sidebarHidden = true;
    } else if (!this.isMobile && this.sidebarHidden) {
      this.sidebarHidden = false;
    }

    // 如果状态改变，触发事件
    if (oldState.current !== this.breakpointState.current) {
      this.breakpointChange.emit(this.breakpointState);
    }
  }

  /**
   * 获取当前断点
   */
  private getCurrentBreakpoint(width: number): string {
    if (width >= 1280) return 'xl';
    if (width >= 1024) return 'lg';
    if (width >= 768) return 'md';
    if (width >= 480) return 'sm';
    return 'xs';
  }

  /**
   * 切换侧边栏
   */
  toggleSidebar(): void {
    if (this.isMobile) {
      this.sidebarHidden = !this.sidebarHidden;
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }

    this.sidebarToggle.emit(this.isMobile ? !this.sidebarHidden : !this.sidebarCollapsed);
  }

  /**
   * 获取布局样式类
   */
  get layoutClasses(): string {
    const classes = [
      `breakpoint-${this.breakpointState.current}`,
      this.isMobile ? 'mobile' : 'desktop'
    ];

    if (this.sidebarCollapsed) {
      classes.push('sidebar-collapsed');
    }

    if (this.sidebarHidden) {
      classes.push('sidebar-hidden');
    }

    return classes.join(' ');
  }

  /**
   * 手动设置侧边栏状态
   */
  setSidebarState(collapsed: boolean, hidden?: boolean): void {
    if (hidden !== undefined) {
      this.sidebarHidden = hidden;
    } else {
      this.sidebarCollapsed = collapsed;
    }
  }

  /**
   * 检查是否为移动端
   */
  get isMobileDevice(): boolean {
    return this.isMobile;
  }

  /**
   * 获取当前断点
   */
  get currentBreakpoint(): string {
    return this.breakpointState.current;
  }
}