import { createTheme } from '@mui/material/styles';

// 创建MUI主题，使用现代化配色方案
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // 现代深邃蓝，更专业
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#43a047', // 绿色，与主色调和谐
      light: '#66bb6a',
      dark: '#388e3c',
    },
    warning: {
      main: '#ff9800', // 橙色，用于重要提示
    },
    background: {
      default: '#f5f5f5', // 柔和背景色，提升阅读体验
      paper: '#ffffff',
    },
    text: {
      primary: '#333333', // 深灰色，提升可读性
      secondary: '#666666',
    },
    divider: '#e0e0e0', // 柔和分隔线
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12, // 增加卡片圆角
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)', // 柔和阴影
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', // 增强卡片阴影
          transition: 'all 0.3s ease', // 平滑过渡
          '&:hover': {
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)', // 悬停效果
            transform: 'translateY(-2px)', // 轻微上浮
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
            borderLeft: '4px solid #1976d2',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          boxShadow: '2px 0 10px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
  zIndex: {
    drawer: 1200,
    appBar: 1201,
  },
});
