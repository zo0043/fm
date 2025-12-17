'use client';

import React, { useState, useEffect } from 'react';
import { FundHistoryData } from '../../types/fund';
import { fundService } from '../../services/fundService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LineChart, XAxis, YAxis, Tooltip, Line } from 'recharts';


const FundHistoryPage: React.FC = () => {
  // 表单状态
  const [fundCode, setFundCode] = useState<string>('110022');
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'candle'>('line');
  const [timePeriod, setTimePeriod] = useState<string>('1y');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  
  // 时间周期选项
  const timePeriods = [
    { value: '7d', label: '最近7天' },
    { value: '1m', label: '最近1个月' },
    { value: '3m', label: '最近3个月' },
    { value: '6m', label: '最近6个月' },
    { value: '1y', label: '最近1年' },
    { value: '3y', label: '最近3年' },
    { value: '5y', label: '最近5年' },
    { value: 'custom', label: '自定义' }
  ];

  // React Query客户端
  const queryClient = useQueryClient();

  // 根据时间周期更新日期范围
  useEffect(() => {
    if (timePeriod !== 'custom') {
      const end = new Date();
      const start = new Date();
      
      switch (timePeriod) {
        case '7d':
          start.setDate(end.getDate() - 7);
          break;
        case '1m':
          start.setMonth(end.getMonth() - 1);
          break;
        case '3m':
          start.setMonth(end.getMonth() - 3);
          break;
        case '6m':
          start.setMonth(end.getMonth() - 6);
          break;
        case '1y':
          start.setFullYear(end.getFullYear() - 1);
          break;
        case '3y':
          start.setFullYear(end.getFullYear() - 3);
          break;
        case '5y':
          start.setFullYear(end.getFullYear() - 5);
          break;
      }
      
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [timePeriod]);

  // 使用React Query获取历史净值数据
  const { data: historyData = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['fundHistory', fundCode, startDate, endDate],
    queryFn: () => fundService.getFundNavFromEastmoney(fundCode, 1, 1000, startDate, endDate),
    enabled: false, // 手动触发
    staleTime: 30 * 60 * 1000, // 30分钟缓存
  });

  // 使用useEffect监听查询状态变化
  useEffect(() => {
    if (historyData.length > 0) {
      setSuccessMessage(`成功加载基金${fundCode}的历史净值数据`);
    } else if (isError) {
      setSuccessMessage(null);
    }
  }, [historyData, isError, fundCode]);

  // 刷新数据的mutation
  const refreshMutation = useMutation({
    mutationFn: () => {
      // 清除缓存
      fundService.clearNavDataCache(fundCode);
      // 重新获取数据
      return fundService.getFundNavFromEastmoney(fundCode, 1, 1000, startDate, endDate);
    },
    onSettled: (data, error) => {
      if (data) {
        // 更新缓存
        queryClient.setQueryData(['fundHistory', fundCode, startDate, endDate], data);
        setSuccessMessage(`成功刷新基金${fundCode}的历史净值数据`);
      } else if (error) {
        setSuccessMessage(null);
      }
    }
  });

  // 获取历史净值数据
  const fetchHistoryData = () => {
    refetch();
  };

  // 刷新数据
  const refreshData = () => {
    refreshMutation.mutate();
  };
  
  // 导出数据
  const exportData = () => {
    if (historyData.length === 0) {
      setExportError('没有数据可以导出');
      return;
    }
    
    // 生成CSV内容
    const headers = ['日期', '单位净值', '累计净值', '日涨跌幅(%)'];
    const rows = historyData.map(item => [
      item.date,
      item.nav,
      item.totalNav,
      (item.dailyChange * 100).toFixed(2)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // 创建下载链接
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `fund_history_${fundCode}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSuccessMessage('数据导出成功');
    setExportError(null);
  };

  // 格式化涨跌幅
  const formatDailyChange = (value: number): string => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(2)}%`;
  };

  // 获取涨跌幅样式类
  const getDailyChangeClass = (value: number): string => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // 渲染简单的文本图表
  const renderSimpleChart = () => {
    if (historyData.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium">暂无数据</h3>
            <p className="text-sm text-gray-400">无法生成图表</p>
          </div>
        </div>
      );
    }

    // 计算简单的走势指标
    const latestNav = historyData[historyData.length - 1]?.nav || 0;
    const firstNav = historyData[0]?.nav || 0;
    const totalReturn = ((latestNav - firstNav) / firstNav) * 100;

    return (
      <div className="space-y-4">
        {/* 走势指标 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">起始净值</div>
            <div className="text-2xl font-semibold">{firstNav.toFixed(4)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">最新净值</div>
            <div className="text-2xl font-semibold">{latestNav.toFixed(4)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">总收益率</div>
            <div className={`text-2xl font-semibold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* 简化的数据点展示 */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium mb-3">净值变化趋势 (最近10个交易日)</h4>
          <div className="space-y-2">
            {historyData.slice(-10).reverse().map((item, index) => (
              <div key={item.date} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <span className="text-sm text-gray-600">{item.date}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">{item.nav.toFixed(4)}</span>
                  <span className={`text-sm font-medium ${getDailyChangeClass(item.dailyChange)}`}>
                    {formatDailyChange(item.dailyChange)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">基金历史净值查询</h1>
      </div>

      <div className="w-24 h-1 bg-blue-600 rounded-full"></div>

      {/* 查询表单 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* 基金代码输入 */}
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">基金代码</label>
            <input
              type="text"
              value={fundCode}
              onChange={(e) => setFundCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入基金代码，例如：110022"
            />
          </div>
          
          {/* 时间周期选择 */}
          <div className="min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">时间周期</label>
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {timePeriods.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* 开始日期 */}
          <div className="min-w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* 结束日期 */}
          <div className="min-w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* 操作按钮 */}
          <div className="flex gap-2">
            <button
              onClick={fetchHistoryData}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              查询
            </button>
            
            <button
              onClick={refreshData}
              disabled={isLoading}
              title="刷新数据"
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            <button
              onClick={exportData}
              disabled={isLoading || historyData.length === 0}
              title="导出数据"
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">净值走势分析</h3>
              <p className="text-sm text-gray-600">基金单位净值和累计净值变化趋势</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">图表类型:</span>
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1 text-sm rounded-md ${
                  chartType === 'line'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                折线图
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 text-sm rounded-md ${
                  chartType === 'bar'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                柱状图
              </button>
              <button
                onClick={() => setChartType('candle')}
                className={`px-3 py-1 text-sm rounded-md ${
                  chartType === 'candle'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                蜡烛图
              </button>
            </div>
          </div>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-gray-600">加载中...</span>
              </div>
            </div>
          ) : chartType === 'candle' ? (
            <div className="h-96">
              {historyData.length > 0 ? (
                <LineChart
                  data={historyData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <XAxis dataKey="date" type="category" interval="preserveStartEnd" />
                  <YAxis />
                  <Tooltip content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
                          <p className="text-xs text-gray-600 mb-1">单位净值: {data.nav.toFixed(4)}</p>
                          <p className="text-xs text-gray-600 mb-1">累计净值: {data.totalNav.toFixed(4)}</p>
                          <p className={`text-xs font-medium ${data.dailyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            日涨跌幅: {data.dailyChange >= 0 ? '+' : ''}{(data.dailyChange * 100).toFixed(2)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Line
                    type="monotone"
                    dataKey="nav"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#8884d8' }}
                    activeDot={{ r: 6, fill: '#82ca9d' }}
                  />
                </LineChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h3 className="text-lg font-medium">暂无数据</h3>
                    <p className="text-sm text-gray-400">无法生成蜡烛图</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            renderSimpleChart()
          )}
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">历史净值数据</h3>
              <p className="text-sm text-gray-600">共 {historyData.length} 条记录</p>
            </div>
            {historyData.length > 0 && (
              <button
                onClick={exportData}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                导出数据
              </button>
            )}
          </div>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-gray-600">加载中...</span>
              </div>
            </div>
          ) : historyData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium mb-2">暂无数据</h3>
              <p className="text-sm">请输入基金代码并点击查询按钮获取数据</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单位净值</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">累计净值</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日涨跌幅</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {historyData.map((row) => (
                    <tr key={row.date} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.nav.toFixed(4)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.totalNav.toFixed(4)}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getDailyChangeClass(row.dailyChange)}`}>
                        {formatDailyChange(row.dailyChange)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 消息提示 */}
      {(isError || exportError || successMessage) && (
        <div className={`fixed bottom-4 right-4 max-w-sm p-4 rounded-lg shadow-lg ${
          isError || exportError 
            ? 'bg-red-50 border border-red-200 text-red-800' 
            : 'bg-green-50 border border-green-200 text-green-800'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {isError || exportError ? (
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">
                {(error as Error)?.message || exportError || successMessage}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => { setExportError(null); setSuccessMessage(null); }}
                className={`inline-flex rounded-md p-1.5 ${
                  isError || exportError 
                    ? 'text-red-500 hover:bg-red-100 focus:ring-red-600' 
                    : 'text-green-500 hover:bg-green-100 focus:ring-green-600'
                } focus:outline-none focus:ring-2 focus:ring-offset-2`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundHistoryPage;