'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

// 导航菜单项
const menuItems = [
  { path: '/', label: '仪表盘', icon: '📊' },
  { path: '/fund-history', label: '基金历史净值', icon: '📈' },
  { path: '/portfolio', label: '我的投资组合', icon: '🥧' },
  { path: '/analysis', label: '基金分析', icon: '📊' },
  { path: '/about', label: '关于', icon: 'ℹ️' },
];

interface SideNavProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function SideNav({ sidebarOpen, setSidebarOpen }: SideNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
    setSidebarOpen(false);
  };

  return (
    <>
      {/* 桌面端侧边栏 */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* 品牌标识 */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">📈</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-blue-600">基金监控系统</h2>
              <p className="text-xs text-gray-500">Fund Monitor</p>
            </div>
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <button
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      pathname === item.path
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleNavigation(item.path)}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* 底部信息 */}
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              © {new Date().getFullYear()} 基金监控系统
            </p>
          </div>
        </div>
      </aside>

      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 移动端侧边栏 */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-white transform transition-transform duration-300 ease-in-out md:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* 关闭按钮 */}
          <div className="flex justify-end p-4">
            <button
              className="p-2 text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(false)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 品牌标识 */}
          <div className="flex items-center gap-3 px-4 pb-4 border-b border-gray-200">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">📈</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-blue-600">基金监控系统</h2>
              <p className="text-xs text-gray-500">Fund Monitor</p>
            </div>
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <button
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      pathname === item.path
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleNavigation(item.path)}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* 底部信息 */}
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              © {new Date().getFullYear()} 基金监控系统
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}