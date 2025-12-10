"use strict";
/**
 * 格式化工具函数
 * 使用方法：import { FormatUtils } from '@shared/utils/format.utils';
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormatUtils = void 0;
var FormatUtils = /** @class */ (function () {
    function FormatUtils() {
    }
    /**
     * 格式化百分比
     * @param value 数值（0.1 表示 10%）
     * @param showSign 是否显示正负号
     * @param decimals 小数位数
     */
    FormatUtils.percent = function (value, showSign, decimals) {
        if (showSign === void 0) { showSign = true; }
        if (decimals === void 0) { decimals = 2; }
        if (value == null || isNaN(value))
            return '--';
        var sign = showSign && value > 0 ? '+' : '';
        return "".concat(sign).concat((value * 100).toFixed(decimals), "%");
    };
    /**
     * 格式化货币（人民币）
     * @param value 金额
     * @param decimals 小数位数
     */
    FormatUtils.currency = function (value, decimals) {
        if (decimals === void 0) { decimals = 2; }
        if (value == null || isNaN(value))
            return '--';
        return "\u00A5".concat(value.toLocaleString('zh-CN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }));
    };
    /**
     * 格式化净值
     * @param value 净值
     */
    FormatUtils.nav = function (value) {
        if (value == null || isNaN(value))
            return '--';
        return value.toFixed(4);
    };
    /**
     * 格式化日期
     * @param date 日期
     * @param format 格式 'date' | 'datetime' | 'time'
     */
    FormatUtils.date = function (date, format) {
        if (format === void 0) { format = 'date'; }
        if (!date)
            return '--';
        var d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime()))
            return '--';
        var options = {};
        switch (format) {
            case 'date':
                options.year = 'numeric';
                options.month = '2-digit';
                options.day = '2-digit';
                break;
            case 'datetime':
                options.year = 'numeric';
                options.month = '2-digit';
                options.day = '2-digit';
                options.hour = '2-digit';
                options.minute = '2-digit';
                break;
            case 'time':
                options.hour = '2-digit';
                options.minute = '2-digit';
                options.second = '2-digit';
                break;
        }
        return d.toLocaleString('zh-CN', options);
    };
    /**
     * 格式化相对时间（如：3分钟前）
     * @param date 日期
     */
    FormatUtils.relativeTime = function (date) {
        if (!date)
            return '--';
        var d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime()))
            return '--';
        var now = new Date();
        var diff = now.getTime() - d.getTime();
        var seconds = Math.floor(diff / 1000);
        var minutes = Math.floor(seconds / 60);
        var hours = Math.floor(minutes / 60);
        var days = Math.floor(hours / 24);
        if (seconds < 60)
            return '刚刚';
        if (minutes < 60)
            return "".concat(minutes, "\u5206\u949F\u524D");
        if (hours < 24)
            return "".concat(hours, "\u5C0F\u65F6\u524D");
        if (days < 7)
            return "".concat(days, "\u5929\u524D");
        return this.date(d);
    };
    /**
     * 格式化大数字（如：1.5万、2.3亿）
     * @param value 数值
     */
    FormatUtils.largeNumber = function (value) {
        if (value == null || isNaN(value))
            return '--';
        var absValue = Math.abs(value);
        var sign = value < 0 ? '-' : '';
        if (absValue >= 100000000) {
            return "".concat(sign).concat((absValue / 100000000).toFixed(2), "\u4EBF");
        }
        if (absValue >= 10000) {
            return "".concat(sign).concat((absValue / 10000).toFixed(2), "\u4E07");
        }
        return "".concat(sign).concat(absValue.toFixed(2));
    };
    /**
     * 格式化文件大小
     * @param bytes 字节数
     */
    FormatUtils.fileSize = function (bytes) {
        if (bytes == null || isNaN(bytes))
            return '--';
        var units = ['B', 'KB', 'MB', 'GB', 'TB'];
        var unitIndex = 0;
        var size = bytes;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return "".concat(size.toFixed(2), " ").concat(units[unitIndex]);
    };
    /**
     * 格式化时长（秒转为可读格式）
     * @param seconds 秒数
     */
    FormatUtils.duration = function (seconds) {
        if (seconds == null || isNaN(seconds))
            return '--';
        var hours = Math.floor(seconds / 3600);
        var minutes = Math.floor((seconds % 3600) / 60);
        var secs = Math.floor(seconds % 60);
        if (hours > 0) {
            return "".concat(hours, "\u5C0F\u65F6").concat(minutes, "\u5206\u949F");
        }
        if (minutes > 0) {
            return "".concat(minutes, "\u5206\u949F").concat(secs, "\u79D2");
        }
        return "".concat(secs, "\u79D2");
    };
    /**
     * 获取涨跌样式类名
     * @param value 数值
     */
    FormatUtils.getTrendClass = function (value) {
        if (value > 0)
            return 'trend-up';
        if (value < 0)
            return 'trend-down';
        return 'trend-neutral';
    };
    /**
     * 获取涨跌颜色
     * @param value 数值
     */
    FormatUtils.getTrendColor = function (value) {
        if (value > 0)
            return '#26a69a';
        if (value < 0)
            return '#ef5350';
        return '#78909c';
    };
    /**
     * 截断文本
     * @param text 文本
     * @param maxLength 最大长度
     * @param suffix 后缀
     */
    FormatUtils.truncate = function (text, maxLength, suffix) {
        if (suffix === void 0) { suffix = '...'; }
        if (!text)
            return '';
        if (text.length <= maxLength)
            return text;
        return text.substring(0, maxLength - suffix.length) + suffix;
    };
    /**
     * 基金类型转中文
     * @param type 类型代码
     */
    FormatUtils.fundType = function (type) {
        var typeMap = {
            stock: '股票型',
            bond: '债券型',
            hybrid: '混合型',
            index: '指数型',
            etf: 'ETF',
            qdii: 'QDII',
            money: '货币型',
        };
        return typeMap[type] || type;
    };
    /**
     * 风险等级转中文
     * @param level 等级代码
     */
    FormatUtils.riskLevel = function (level) {
        var levelMap = {
            low: { label: '低风险', color: '#4caf50' },
            'medium-low': { label: '中低风险', color: '#8bc34a' },
            medium: { label: '中等风险', color: '#ff9800' },
            'medium-high': { label: '中高风险', color: '#ff5722' },
            high: { label: '高风险', color: '#f44336' },
        };
        return levelMap[level] || { label: level, color: '#78909c' };
    };
    return FormatUtils;
}());
exports.FormatUtils = FormatUtils;
