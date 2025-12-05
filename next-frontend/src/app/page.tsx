'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  LinearProgress,
  Fade,
  Slide
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ShowChart as ShowChartIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  ArrowForward as ArrowForwardIcon,
  TrendingFlat as TrendingFlatIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { Fund } from '../types/fund';
import { fundService } from '../services/fundService';

const DashboardPage: React.FC = () => {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [marketStats, setMarketStats] = useState({
    total: 0,
    up: 0,
    down: 0,
    flat: 0
  });

  // 模拟市场趋势数据
  const marketTrendData = [
    { date: '01-01', value: 100 },
    { date: '02-01', value: 102 },
    { date: '03-01', value: 98 },
    { date: '04-01', value: 105 },
    { date: '05-01', value: 110 },
    { date: '06-01', value: 108 },
    { date: '07-01', value: 115 },
    { date: '08-01', value: 120 },
    { date: '09-01', value: 118 },
    { date: '10-01', value: 125 },
    { date: '11-01', value: 130 },
    { date: '12-01', value: 128 }
  ];

  // 加载基金数据
  useEffect(() => {
    const loadFunds = async () => {
      setIsLoading(true);
      try {
        const response = await fundService.getFunds({}, 1, 30);
        const fundList = response.funds;
        setFunds(fundList);
        
        // 计算市场统计数据
        const stats = {
          total: fundList.length,
          up: fundList.filter(fund => fund.dailyChange > 0).length,
          down: fundList.filter(fund => fund.dailyChange < 0).length,
          flat: fundList.filter(fund => fund.dailyChange === 0).length
        };
        setMarketStats(stats);
      } catch (error) {
        console.error('加载基金数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFunds();
  }, []);

  // 格式化涨跌幅
  const formatChange = (value: number): string => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(2)}%`;
  };

  // 获取涨跌幅颜色
  const getChangeColor = (value: number): string => {
    if (value > 0) return '#43a047';
    if (value < 0) return '#f44336';
    return '#9e9e9e';
  };

  // 获取涨跌幅图标
  const getChangeIcon = (value: number) => {
    if (value > 0) return <TrendingUpIcon sx={{ fontSize: 18 }} />;
    if (value < 0) return <TrendingDownIcon sx={{ fontSize: 18 }} />;
    return <TrendingFlatIcon sx={{ fontSize: 18 }} />;
  };

  // 热门基金（按日涨跌幅排序）
  const topGainers = [...funds].sort((a, b) => b.dailyChange - a.dailyChange).slice(0, 5);
  const topLosers = [...funds].sort((a, b) => a.dailyChange - b.dailyChange).slice(0, 5);

  return (
    <Box sx={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* 页面标题和描述 - 淡入动画 */}
      <Fade in timeout={600}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <ShowChartIcon sx={{ fontSize: 36, color: '#1976d2' }} />
            基金市场仪表盘
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon sx={{ fontSize: 16 }} />
            实时监控基金市场动态，把握投资机会
          </Typography>
          <Divider sx={{ mt: 2, mb: 3 }} />
        </Box>
      </Fade>

      {/* 市场概览卡片 - 滑入动画 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* 总基金数 */}
        <Grid item xs={12} sm={6} md={3}>
          <Slide direction="up" in timeout={{ enter: 300, exit: 300 }}>
            <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', top: 0, right: 0, p: 1, opacity: 0.1 }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 80 }} />
              </Box>
              <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      总基金数
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 700, mt: 0.5 }}>
                      {marketStats.total}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#1976d2', width: 48, height: 48 }}>
                    <AccountBalanceWalletIcon sx={{ fontSize: 24 }} />
                  </Avatar>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={100} 
                    sx={{ 
                      height: 6, 
                      borderRadius: 3,
                      bgcolor: 'rgba(0, 0, 0, 0.08)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        bgcolor: '#1976d2'
                      }
                    }} 
                  />
                </Box>
              </CardContent>
            </Card>
          </Slide>
        </Grid>

        {/* 上涨基金数 */}
        <Grid item xs={12} sm={6} md={3}>
          <Slide direction="up" in timeout={{ enter: 400, exit: 400 }}>
            <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', top: 0, right: 0, p: 1, opacity: 0.1 }}>
                <TrendingUpIcon sx={{ fontSize: 80 }} />
              </Box>
              <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      上涨基金
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 700, mt: 0.5, color: '#43a047' }}>
                      {marketStats.up}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#43a047', width: 48, height: 48 }}>
                    <TrendingUpIcon sx={{ fontSize: 24 }} />
                  </Avatar>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Chip 
                    label={`${((marketStats.up / marketStats.total) * 100).toFixed(1)}%`} 
                    size="small" 
                    sx={{ 
                      bgcolor: 'rgba(67, 160, 71, 0.1)', 
                      color: '#43a047',
                      fontWeight: 500
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Slide>
        </Grid>

        {/* 下跌基金数 */}
        <Grid item xs={12} sm={6} md={3}>
          <Slide direction="up" in timeout={{ enter: 500, exit: 500 }}>
            <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', top: 0, right: 0, p: 1, opacity: 0.1 }}>
                <TrendingDownIcon sx={{ fontSize: 80 }} />
              </Box>
              <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      下跌基金
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 700, mt: 0.5, color: '#f44336' }}>
                      {marketStats.down}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#f44336', width: 48, height: 48 }}>
                    <TrendingDownIcon sx={{ fontSize: 24 }} />
                  </Avatar>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Chip 
                    label={`${((marketStats.down / marketStats.total) * 100).toFixed(1)}%`} 
                    size="small" 
                    sx={{ 
                      bgcolor: 'rgba(244, 67, 54, 0.1)', 
                      color: '#f44336',
                      fontWeight: 500
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Slide>
        </Grid>

        {/* 平盘基金数 */}
        <Grid item xs={12} sm={6} md={3}>
          <Slide direction="up" in timeout={{ enter: 600, exit: 600 }}>
            <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', top: 0, right: 0, p: 1, opacity: 0.1 }}>
                <TrendingFlatIcon sx={{ fontSize: 80 }} />
              </Box>
              <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      平盘基金
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 700, mt: 0.5, color: '#9e9e9e' }}>
                      {marketStats.flat}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#9e9e9e', width: 48, height: 48 }}>
                    <TrendingFlatIcon sx={{ fontSize: 24 }} />
                  </Avatar>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Chip 
                    label={`${((marketStats.flat / marketStats.total) * 100).toFixed(1)}%`} 
                    size="small" 
                    sx={{ 
                      bgcolor: 'rgba(158, 158, 158, 0.1)', 
                      color: '#9e9e9e',
                      fontWeight: 500
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Slide>
        </Grid>
      </Grid>

      {/* 市场趋势图表 - 淡入动画 */}
      <Fade in timeout={800}>
        <Card sx={{ mb: 4 }}>
          <CardHeader
            title="市场趋势"
            subheader="基金市场整体走势"
            sx={{ 
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              '& .MuiCardHeader-title': {
                fontWeight: 600
              }
            }}
          />
          <CardContent>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={marketTrendData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1976d2" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#1976d2" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fill: '#666' }}
                    axisLine={{ stroke: '#e0e0e0' }}
                    tickLine={{ stroke: '#e0e0e0' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#666' }}
                    axisLine={{ stroke: '#e0e0e0' }}
                    tickLine={{ stroke: '#e0e0e0' }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value}`, '市场指数']}
                    labelFormatter={(label) => `日期: ${label}`}
                    contentStyle={{
                      borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      border: 'none'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#1976d2" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorValue)"
                    dot={{ r: 4, stroke: '#1976d2', strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6, stroke: '#1976d2', strokeWidth: 2, fill: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Fade>

      {/* 热门基金列表 */}
      <Grid container spacing={3}>
        {/* 涨幅榜 - 从左侧滑入 */}
        <Grid item xs={12} md={6}>
          <Slide direction="left" in timeout={{ enter: 800, exit: 800 }}>
            <Card>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpIcon sx={{ fontSize: 18, color: '#43a047' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      涨幅榜
                    </Typography>
                  </Box>
                }
                subheader="日涨跌幅排名前5"
                action={
                  <Chip 
                    label="查看更多" 
                    size="small" 
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 500 }}
                  />
                }
                sx={{ 
                  borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                }}
              />
              <CardContent>
                {isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                    <CircularProgress />
                  </Box>
                ) : topGainers.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                    <ShowChartIcon sx={{ fontSize: 48, opacity: 0.2, mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      暂无数据
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ py: 0 }}>
                    {topGainers.map((fund, index) => (
                      <Fade key={fund.id} in timeout={{ enter: 1000 + index * 100, exit: 300 }}>
                        <Box sx={{ mb: 1.5 }}>
                          <ListItem
                            secondaryAction={
                              <IconButton edge="end" aria-label="details" sx={{ color: '#1976d2' }}>
                                <ArrowForwardIcon />
                              </IconButton>
                            }
                          >
                            <ListItemAvatar>
                              <Avatar 
                                sx={{ 
                                  bgcolor: index === 0 ? '#ffd700' : 
                                           index === 1 ? '#c0c0c0' : 
                                           index === 2 ? '#cd7f32' : '#43a047',
                                  width: 40, 
                                  height: 40,
                                  fontWeight: 700,
                                  fontSize: 16
                                }}
                              >
                                {index + 1}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {fund.name}
                                </Typography>
                              }
                              secondary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary" component="span">
                                    {fund.code} · {fund.type}
                                  </Typography>
                                  <Chip
                                    label={formatChange(fund.dailyChange)}
                                    size="small"
                                    sx={{
                                      bgcolor: 'rgba(67, 160, 71, 0.1)',
                                      color: '#43a047',
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                      height: 18
                                    }}
                                  />
                                </Box>
                              }
                              secondaryTypographyProps={{ component: 'div' }}
                            />
                          </ListItem>
                          {index < topGainers.length - 1 && (
                            <Divider sx={{ mx: 2 }} />
                          )}
                        </Box>
                      </Fade>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Slide>
        </Grid>

        {/* 跌幅榜 - 从右侧滑入 */}
        <Grid item xs={12} md={6}>
          <Slide direction="right" in timeout={{ enter: 800, exit: 800 }}>
            <Card>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingDownIcon sx={{ fontSize: 18, color: '#f44336' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      跌幅榜
                    </Typography>
                  </Box>
                }
                subheader="日涨跌幅排名后5"
                action={
                  <Chip 
                    label="查看更多" 
                    size="small" 
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 500 }}
                  />
                }
                sx={{ 
                  borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                }}
              />
              <CardContent>
                {isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                    <CircularProgress />
                  </Box>
                ) : topLosers.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                    <ShowChartIcon sx={{ fontSize: 48, opacity: 0.2, mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      暂无数据
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ py: 0 }}>
                    {topLosers.map((fund, index) => (
                      <Fade key={fund.id} in timeout={{ enter: 1000 + index * 100, exit: 300 }}>
                        <Box sx={{ mb: 1.5 }}>
                          <ListItem
                            secondaryAction={
                              <IconButton edge="end" aria-label="details" sx={{ color: '#1976d2' }}>
                                <ArrowForwardIcon />
                              </IconButton>
                            }
                          >
                            <ListItemAvatar>
                              <Avatar 
                                sx={{ 
                                  bgcolor: '#f44336',
                                  width: 40, 
                                  height: 40,
                                  fontWeight: 700,
                                  fontSize: 16
                                }}
                              >
                                {index + 1}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {fund.name}
                                </Typography>
                              }
                              secondary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary" component="span">
                                    {fund.code} · {fund.type}
                                  </Typography>
                                  <Chip
                                    label={formatChange(fund.dailyChange)}
                                    size="small"
                                    sx={{
                                      bgcolor: 'rgba(244, 67, 54, 0.1)',
                                      color: '#f44336',
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                      height: 18
                                    }}
                                  />
                                </Box>
                              }
                              secondaryTypographyProps={{ component: 'div' }}
                            />
                          </ListItem>
                          {index < topLosers.length - 1 && (
                            <Divider sx={{ mx: 2 }} />
                          )}
                        </Box>
                      </Fade>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Slide>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;