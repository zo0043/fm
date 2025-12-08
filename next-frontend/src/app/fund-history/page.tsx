'use client';

import React, { useState, useEffect } from 'react';
import { FundHistoryData } from '../../types/fund';
import { fundService } from '../../services/fundService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Chip,
  Tabs,
  Tab,
  CardActions
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  BarChart as BarChartIcon,
  ShowChart as LineChartIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const FundHistoryPage: React.FC = () => {
  // 表单状态
  const [fundCode, setFundCode] = useState<string>('110022');
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [timePeriod, setTimePeriod] = useState<string>('1y');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
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
  const [exportError, setExportError] = useState<string | null>(null);
  
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

  // 获取涨跌幅样式
  const getDailyChangeClass = (value: number): string => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  };

  // 渲染图表
  const renderChart = () => {
    if (historyData.length === 0) {
      return (
        <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
          <Typography variant="h6">暂无数据，无法生成图表</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.slice(5)} // 只显示月-日
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.toFixed(3)}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                formatter={(value: number) => [value.toFixed(4), '']}
                labelFormatter={(label) => `日期: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="nav" 
                name="单位净值" 
                stroke="#3f51b5" 
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
              <Line 
                type="monotone" 
                dataKey="totalNav" 
                name="累计净值" 
                stroke="#4caf50" 
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          ) : (
            <BarChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.slice(5)} // 只显示月-日
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.toFixed(3)}
              />
              <Tooltip 
                formatter={(value: number) => [value.toFixed(4), '']}
                labelFormatter={(label) => `日期: ${label}`}
              />
              <Legend />
              <Bar 
                dataKey="nav" 
                name="单位净值" 
                fill="#3f51b5" 
              />
              <Bar 
                dataKey="totalNav" 
                name="累计净值" 
                fill="#4caf50" 
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </Box>
    );
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* 页面标题 */}
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountBalanceWalletIcon sx={{ fontSize: 32 }} />
        基金历史净值查询
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* 查询表单 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'end' }}>
            {/* 基金代码输入 */}
            <TextField
              label="基金代码"
              variant="outlined"
              value={fundCode}
              onChange={(e) => setFundCode(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: 200 }}
              placeholder="请输入基金代码，例如：110022"
            />
            
            {/* 时间周期选择 */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>时间周期</InputLabel>
              <Select
                value={timePeriod}
                label="时间周期"
                onChange={(e) => setTimePeriod(e.target.value)}
              >
                {timePeriods.map((period) => (
                  <MenuItem key={period.value} value={period.value}>
                    {period.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* 开始日期 */}
            <TextField
              label="开始日期"
              type="date"
              variant="outlined"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
              InputLabelProps={{ shrink: true }}
            />
            
            {/* 结束日期 */}
            <TextField
              label="结束日期"
              type="date"
              variant="outlined"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
              InputLabelProps={{ shrink: true }}
            />
            
            {/* 查询按钮 */}
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={fetchHistoryData}
              disabled={isLoading}
              size="small"
            >
              {isLoading ? <CircularProgress size={20} /> : '查询'}
            </Button>
            
            {/* 刷新按钮 */}
            <IconButton
              color="secondary"
              onClick={refreshData}
              disabled={isLoading}
              title="刷新数据"
            >
              <RefreshIcon />
            </IconButton>
            
            {/* 导出按钮 */}
            <IconButton
              color="secondary"
              onClick={exportData}
              disabled={isLoading || historyData.length === 0}
              title="导出数据"
            >
              <DownloadIcon />
            </IconButton>
          </Box>
        </CardContent>
      </Card>

      {/* 图表区域 */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="净值走势图表"
          subheader="基金单位净值和累计净值变化趋势"
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>图表类型:</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label="折线图"
                  icon={<LineChartIcon fontSize="small" />}
                  color={chartType === 'line' ? 'primary' : 'default'}
                  onClick={() => setChartType('line')}
                  clickable
                />
                <Chip
                  label="柱状图"
                  icon={<BarChartIcon fontSize="small" />}
                  color={chartType === 'bar' ? 'primary' : 'default'}
                  onClick={() => setChartType('bar')}
                  clickable
                />
              </Box>
            </Box>
          }
        />
        <CardContent>
          {isLoading ? (
            <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
            renderChart()
          )}
        </CardContent>
      </Card>

      {/* 数据表格 */}
      <Card>
        <CardHeader
          title="历史净值数据"
          subheader={`共 ${historyData.length} 条记录`}
        />
        <CardContent>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : historyData.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <Typography variant="h6">暂无数据</Typography>
              <Typography variant="body2">请输入基金代码并点击查询按钮获取数据</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader aria-label="fund history table">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>日期</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>单位净值</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>累计净值</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>日涨跌幅</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyData.map((row) => (
                    <TableRow
                      key={row.date}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.nav.toFixed(4)}</TableCell>
                      <TableCell>{row.totalNav.toFixed(4)}</TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 500,
                          color: row.dailyChange > 0 ? '#4caf50' : row.dailyChange < 0 ? '#f44336' : '#9e9e9e'
                        }}
                      >
                        {formatDailyChange(row.dailyChange)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
        {historyData.length > 0 && (
          <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportData}
            >
              导出数据
            </Button>
          </CardActions>
        )}
      </Card>

      {/* 消息提示 */}
      <Snackbar
        open={!!isError || !!exportError || !!successMessage}
        autoHideDuration={3000}
        onClose={() => { setExportError(null); setSuccessMessage(null); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => { setExportError(null); setSuccessMessage(null); }}
          severity={isError || exportError ? 'error' : 'success'}
          sx={{ width: '100%' }}
        >
          {(error as Error)?.message || exportError || successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FundHistoryPage;