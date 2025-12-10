"use strict";
/**
 * 应用全局常量配置
 * 使用方法：import { APP_CONSTANTS } from '@shared/constants/app.constants';
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_CONSTANTS = exports.DESIGN_SYSTEM = exports.API_ENDPOINTS = exports.STORAGE_KEYS = exports.RISK_LEVELS = exports.FUND_TYPES = exports.CHART_CONSTANTS = exports.PAGINATION = exports.TIME_CONSTANTS = void 0;
// ============= 时间常量 =============
exports.TIME_CONSTANTS = {
    /** 自动刷新间隔（毫秒）- 5分钟 */
    AUTO_REFRESH_INTERVAL: 5 * 60 * 1000,
    /** 缓存过期时间（毫秒）- 30分钟 */
    CACHE_EXPIRY: 30 * 60 * 1000,
    /** SnackBar 默认显示时间（毫秒） */
    SNACKBAR_DURATION: 3000,
    /** API 请求超时时间（毫秒） */
    API_TIMEOUT: 30000,
    /** 防抖延迟（毫秒） */
    DEBOUNCE_DELAY: 300,
};
// ============= 分页常量 =============
exports.PAGINATION = {
    /** 默认每页条数 */
    DEFAULT_PAGE_SIZE: 20,
    /** 每页条数选项 */
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
    /** 起始页码 */
    INITIAL_PAGE: 0,
};
// ============= 图表常量 =============
exports.CHART_CONSTANTS = {
    /** 默认K线图天数 */
    DEFAULT_KLINE_DAYS: 90,
    /** 图表颜色 */
    COLORS: {
        UP: '#26a69a',
        DOWN: '#ef5350',
        NEUTRAL: '#78909c',
        PRIMARY: '#1976d2',
        ACCENT: '#ff4081',
        WARN: '#ff9800', // 警告色
    },
    /** 时间周期选项 */
    TIME_PERIODS: [
        { value: '1M', label: '1个月' },
        { value: '3M', label: '3个月' },
        { value: '6M', label: '6个月' },
        { value: '1Y', label: '1年' },
        { value: '3Y', label: '3年' },
        { value: 'ALL', label: '全部' },
    ],
};
// ============= 基金类型 =============
exports.FUND_TYPES = {
    stock: '股票型',
    bond: '债券型',
    hybrid: '混合型',
    index: '指数型',
    etf: 'ETF',
    qdii: 'QDII',
    money: '货币型',
};
// ============= 风险等级 =============
exports.RISK_LEVELS = {
    low: { label: '低风险', color: '#4caf50' },
    'medium-low': { label: '中低风险', color: '#8bc34a' },
    medium: { label: '中等风险', color: '#ff9800' },
    'medium-high': { label: '中高风险', color: '#ff5722' },
    high: { label: '高风险', color: '#f44336' },
};
// ============= 存储键名 =============
exports.STORAGE_KEYS = {
    WATCHLIST: 'fund_monitor_watchlist',
    MONITOR_SETTINGS: 'fund_monitor_settings',
    USER_PREFERENCES: 'fund_monitor_preferences',
    CACHE_PREFIX: 'fund_monitor_cache_',
};
// ============= API 端点 =============
exports.API_ENDPOINTS = {
    // 认证服务
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
    },
    // 基金服务
    FUNDS: {
        LIST: '/funds',
        DETAIL: '/funds/:id',
        HISTORY: '/funds/:id/history',
        WATCH: '/funds/:id/watch',
        TYPES: '/funds/types',
    },
    // 监控服务
    MONITOR: {
        RULES: '/monitor/rules',
        RESULTS: '/monitor/results',
    },
    // 通知服务
    NOTIFICATION: {
        CONFIG: '/notifications/config',
        TEST: '/notifications/test',
        LOGS: '/notifications/logs',
    },
    // 回测服务
    BACKTEST: {
        RUN: '/backtest',
        STRATEGIES: '/backtest/strategies',
        EXPORT: '/backtest/export',
    },
};
// ============= 设计系统常量 =============
exports.DESIGN_SYSTEM = {
    /** 圆角尺寸 */
    BORDER_RADIUS: {
        SMALL: '4px',
        MEDIUM: '8px',
        LARGE: '12px',
        XLARGE: '16px',
        ROUND: '50%',
    },
    /** 阴影 */
    SHADOWS: {
        CARD: '0 2px 8px rgba(0, 0, 0, 0.08)',
        CARD_HOVER: '0 4px 16px rgba(0, 0, 0, 0.12)',
        DROPDOWN: '0 4px 12px rgba(0, 0, 0, 0.15)',
        MODAL: '0 8px 32px rgba(0, 0, 0, 0.2)',
    },
    /** 动画时长 */
    TRANSITIONS: {
        FAST: '150ms',
        NORMAL: '250ms',
        SLOW: '400ms',
    },
    /** 间距 */
    SPACING: {
        XS: '4px',
        SM: '8px',
        MD: '16px',
        LG: '24px',
        XL: '32px',
        XXL: '48px',
    },
};
// 导出所有常量
exports.APP_CONSTANTS = {
    TIME: exports.TIME_CONSTANTS,
    PAGINATION: exports.PAGINATION,
    CHART: exports.CHART_CONSTANTS,
    FUND_TYPES: exports.FUND_TYPES,
    RISK_LEVELS: exports.RISK_LEVELS,
    STORAGE: exports.STORAGE_KEYS,
    API: exports.API_ENDPOINTS,
    DESIGN: exports.DESIGN_SYSTEM,
};
