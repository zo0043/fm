'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import AppBar from '@mui/material/AppBar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MenuIcon from '@mui/icons-material/Menu';
import SideNav from './SideNav';

interface LayoutContentProps {
  children: React.ReactNode;
}

export default function LayoutContent({ children }: LayoutContentProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* 顶部导航栏 */}
      <AppBar
        position="fixed"
        sx={{ zIndex: 1201 }}
      >
        <Toolbar>
          {/* 移动端汉堡菜单 */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* 品牌标识 - 移动端显示 */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, mr: 2 }}>
            <Avatar sx={{ bgcolor: '#1976d2', width: 32, height: 32 }}>
              FM
            </Avatar>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              基金监控
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* 通知图标 */}
          <IconButton
            size="large"
            edge="end"
            color="inherit"
            aria-label="notifications"
            sx={{ mr: 1 }}
          >
            <Badge badgeContent={3} color="warning">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* 用户信息 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
            <Typography variant="body2" color="inherit" sx={{ display: { xs: 'none', sm: 'block' } }}>
              管理员
            </Typography>
            <Avatar sx={{ bgcolor: '#43a047', width: 32, height: 32 }}>
              <AccountCircleIcon />
            </Avatar>
          </Box>
        </Toolbar>
      </AppBar>

      {/* 侧边栏 - 客户端组件 */}
      <SideNav mobileOpen={mobileOpen} onDrawerToggle={handleDrawerToggle} />

      {/* 主内容区域 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: { xs: 2, sm: 3, md: 4 },
          pt: 10,
          minHeight: '100vh',
          width: { xs: '100%', md: `calc(100% - 240px)` }, // 确保主内容区域在桌面端有正确的宽度
        }}
      >
        {children}
      </Box>
    </Box>
  );
}