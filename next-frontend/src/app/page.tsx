'use client';

import React from 'react';
import { Box, Typography, Divider, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fundService } from '../services/fundService';
import { Fund } from '../types/fund';

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
    <Box sx={{ maxWidth: 1400, margin: '0 auto', p: 2 }}>
      {/* 页面标题和描述 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          基金市场仪表盘
        </Typography>
        <Typography variant="body1" color="text.secondary">
          实时监控基金市场动态，把握投资机会
        </Typography>
        <Divider sx={{ mt: 2, mb: 3 }} />
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 5, color: 'error.main' }}>
          <Typography variant="h6">加载数据失败，请稍后重试</Typography>
        </Box>
      ) : (
        <>
          {/* 市场概览卡片 */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
            <Box sx={{ flex: { xs: '0 0 100%', sm: '0 0 calc(50% - 12px)', md: '0 0 calc(25% - 18px)' } }}>
              <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  总基金数
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
                  {marketStats.total}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ flex: { xs: '0 0 100%', sm: '0 0 calc(50% - 12px)', md: '0 0 calc(25% - 18px)' } }}>
              <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  上涨基金
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#43a047' }}>
                  {marketStats.up}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ flex: { xs: '0 0 100%', sm: '0 0 calc(50% - 12px)', md: '0 0 calc(25% - 18px)' } }}>
              <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  下跌基金
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#f44336' }}>
                  {marketStats.down}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ flex: { xs: '0 0 100%', sm: '0 0 calc(50% - 12px)', md: '0 0 calc(25% - 18px)' } }}>
              <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  平盘基金
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#9e9e9e' }}>
                  {marketStats.flat}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* 简单的内容区域 */}
          <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              市场趋势
            </Typography>
            <Typography variant="body2" color="text.secondary">
              市场趋势数据将显示在这里
            </Typography>
          </Box>

          {/* 简单的基金列表 */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: { xs: '0 0 100%', md: '0 0 calc(50% - 12px)' } }}>
              <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  涨幅榜
                </Typography>
                {topGainers.length > 0 ? (
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {topGainers.map((fund) => (
                      <Box key={fund.id} sx={{ mb: 2, p: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {fund.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {fund.code} · {fund.type}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            mt: 0.5, 
                            fontWeight: 600, 
                            color: fund.dailyChange > 0 ? '#43a047' : fund.dailyChange < 0 ? '#f44336' : '#9e9e9e'
                          }}
                        >
                          {fund.dailyChange > 0 ? '+' : ''}{(fund.dailyChange * 100).toFixed(2)}%
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    暂无数据
                  </Typography>
                )}
              </Box>
            </Box>
            <Box sx={{ flex: { xs: '0 0 100%', md: '0 0 calc(50% - 12px)' } }}>
              <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  跌幅榜
                </Typography>
                {topLosers.length > 0 ? (
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {topLosers.map((fund) => (
                      <Box key={fund.id} sx={{ mb: 2, p: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {fund.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {fund.code} · {fund.type}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            mt: 0.5, 
                            fontWeight: 600, 
                            color: fund.dailyChange > 0 ? '#43a047' : fund.dailyChange < 0 ? '#f44336' : '#9e9e9e'
                          }}
                        >
                          {fund.dailyChange > 0 ? '+' : ''}{(fund.dailyChange * 100).toFixed(2)}%
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    暂无数据
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}