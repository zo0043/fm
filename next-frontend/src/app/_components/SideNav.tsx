'use client';

import { useState } from 'react';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { usePathname, useRouter } from 'next/navigation';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HistoryIcon from '@mui/icons-material/History';
import PieChartIcon from '@mui/icons-material/PieChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import InfoIcon from '@mui/icons-material/Info';
import ShowChartIcon from '@mui/icons-material/ShowChart';

// 侧边栏宽度
const DRAWER_WIDTH = 240;

// 导航菜单项
const menuItems = [
  { path: '/', label: '仪表盘', icon: <DashboardIcon /> },
  { path: '/fund-history', label: '基金历史净值', icon: <HistoryIcon /> },
  { path: '/portfolio', label: '我的投资组合', icon: <PieChartIcon /> },
  { path: '/analysis', label: '基金分析', icon: <TrendingUpIcon /> },
  { path: '/about', label: '关于', icon: <InfoIcon /> },
];

interface SideNavProps {
  mobileOpen: boolean;
  onDrawerToggle: () => void;
}

export default function SideNav({ mobileOpen, onDrawerToggle }: SideNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
    onDrawerToggle();
  };

  // 渲染侧边栏内容
  const drawer = (
    <div>
      {/* 品牌标识和系统名称 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 2,
          pt: 3,
          pb: 2,
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
        }}
      >
        <ShowChartIcon sx={{ fontSize: 28, color: '#1976d2' }} />
        <Box>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, color: '#1976d2' }}>
            基金监控系统
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Fund Monitor
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 1 }} />

      <List>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={pathname === item.path}
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon sx={{ color: pathname === item.path ? '#1976d2' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label} 
                primaryTypographyProps={{
                  sx: {
                    fontWeight: pathname === item.path ? 500 : 400,
                    color: pathname === item.path ? '#1976d2' : 'inherit',
                  }
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* 底部信息 */}
      <Box
        sx={{
          mt: 'auto',
          p: 2,
          borderTop: '1px solid rgba(0, 0, 0, 0.1)',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
          © {new Date().getFullYear()} 基金监控系统
        </Typography>
      </Box>
    </div>
  );

  return (
    <>
      {/* 桌面端侧边栏 */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        anchor="left"
      >
        {drawer}
      </Drawer>

      {/* 移动端侧边栏 */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{
          keepMounted: true, // 优化性能，保持侧边栏挂载
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        anchor="left"
      >
        {drawer}
      </Drawer>
    </>
  );
}