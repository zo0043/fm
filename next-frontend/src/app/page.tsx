'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fundService } from '../services/fundService';

// 仪表盘页面
export default function DashboardPage() {
  // 使用React Query获取基金数据
  const { data, isLoading, error } = useQuery({
    queryKey: ['funds', 1, 30],
    queryFn: () => fundService.getFunds({}, 1, 30),
    staleTime: 30 * 60 * 1000, // 30分钟缓存
  });

  const funds = data?.funds || [];
  
  // 计算市场统计数据
  const marketStats = {
    total: funds.length,
    up: funds.filter(fund => fund.dailyChange > 0).length,
    down: funds.filter(fund => fund.dailyChange < 0).length,
    flat: funds.filter(fund => fund.dailyChange === 0).length
  };

  // 热门基金（按日涨跌幅排序）
  const topGainers = [...funds].sort((a, b) => b.dailyChange - a.dailyChange).slice(0, 5);
  const topLosers = [...funds].sort((a, b) => a.dailyChange - b.dailyChange).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* 页面标题和描述 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">基金市场仪表盘</h1>
        <p className="text-gray-600 mb-4">实时监控基金市场动态，把握投资机会</p>
        <hr className="border-gray-200" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-600">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">加载失败</h3>
            <p className="mt-1 text-sm text-gray-500">加载数据失败，请稍后重试</p>
          </div>
        </div>
      ) : (
        <>
          {/* 市场概览卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-500 mb-1">总基金数</div>
              <div className="text-2xl font-bold text-gray-900">{marketStats.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-500 mb-1">上涨基金</div>
              <div className="text-2xl font-bold text-green-600">{marketStats.up}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-500 mb-1">下跌基金</div>
              <div className="text-2xl font-bold text-red-600">{marketStats.down}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-500 mb-1">平盘基金</div>
              <div className="text-2xl font-bold text-gray-500">{marketStats.flat}</div>
            </div>
          </div>

          {/* 市场趋势 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">市场趋势</h2>
            <p className="text-gray-600">市场趋势图表将显示在这里</p>
          </div>

          {/* 基金排行榜 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 涨幅榜 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-green-500 mr-2">📈</span>
                涨幅榜 Top 5
              </h3>
              {topGainers.length > 0 ? (
                <div className="space-y-3">
                  {topGainers.map((fund, index) => (
                    <div key={fund.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center justify-center">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{fund.name}</div>
                          <div className="text-sm text-gray-500">{fund.code} · {fund.type}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          +{(fund.dailyChange * 100).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">暂无数据</p>
              )}
            </div>

            {/* 跌幅榜 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-red-500 mr-2">📉</span>
                跌幅榜 Top 5
              </h3>
              {topLosers.length > 0 ? (
                <div className="space-y-3">
                  {topLosers.map((fund, index) => (
                    <div key={fund.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-800 text-xs font-medium rounded-full flex items-center justify-center">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{fund.name}</div>
                          <div className="text-sm text-gray-500">{fund.code} · {fund.type}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-red-600">
                          {(fund.dailyChange * 100).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">暂无数据</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}