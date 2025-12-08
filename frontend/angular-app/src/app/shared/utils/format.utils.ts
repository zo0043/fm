/**
 * 格式化工具函数
 * 使用方法：import { FormatUtils } from '@shared/utils/format.utils';
 */

export class FormatUtils {
  /**
   * 格式化百分比
   * @param value 数值（0.1 表示 10%）
   * @param showSign 是否显示正负号
   * @param decimals 小数位数
   */
  static percent(value: number, showSign = true, decimals = 2): string {
    if (value == null || isNaN(value)) return '--';
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * 格式化货币（人民币）
   * @param value 金额
   * @param decimals 小数位数
   */
  static currency(value: number, decimals = 2): string {
    if (value == null || isNaN(value)) return '--';
    return `¥${value.toLocaleString('zh-CN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }

  /**
   * 格式化净值
   * @param value 净值
   */
  static nav(value: number): string {
    if (value == null || isNaN(value)) return '--';
    return value.toFixed(4);
  }

  /**
   * 格式化日期
   * @param date 日期
   * @param format 格式 'date' | 'datetime' | 'time'
   */
  static date(date: Date | string, format: 'date' | 'datetime' | 'time' = 'date'): string {
    if (!date) return '--';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '--';

    const options: Intl.DateTimeFormatOptions = {};

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
  }

  /**
   * 格式化相对时间（如：3分钟前）
   * @param date 日期
   */
  static relativeTime(date: Date | string): string {
    if (!date) return '--';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '--';

    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return this.date(d);
  }

  /**
   * 格式化大数字（如：1.5万、2.3亿）
   * @param value 数值
   */
  static largeNumber(value: number): string {
    if (value == null || isNaN(value)) return '--';

    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 100000000) {
      return `${sign}${(absValue / 100000000).toFixed(2)}亿`;
    }
    if (absValue >= 10000) {
      return `${sign}${(absValue / 10000).toFixed(2)}万`;
    }
    return `${sign}${absValue.toFixed(2)}`;
  }

  /**
   * 格式化文件大小
   * @param bytes 字节数
   */
  static fileSize(bytes: number): string {
    if (bytes == null || isNaN(bytes)) return '--';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * 格式化时长（秒转为可读格式）
   * @param seconds 秒数
   */
  static duration(seconds: number): string {
    if (seconds == null || isNaN(seconds)) return '--';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    if (minutes > 0) {
      return `${minutes}分钟${secs}秒`;
    }
    return `${secs}秒`;
  }

  /**
   * 获取涨跌样式类名
   * @param value 数值
   */
  static getTrendClass(value: number): string {
    if (value > 0) return 'trend-up';
    if (value < 0) return 'trend-down';
    return 'trend-neutral';
  }

  /**
   * 获取涨跌颜色
   * @param value 数值
   */
  static getTrendColor(value: number): string {
    if (value > 0) return '#26a69a';
    if (value < 0) return '#ef5350';
    return '#78909c';
  }

  /**
   * 截断文本
   * @param text 文本
   * @param maxLength 最大长度
   * @param suffix 后缀
   */
  static truncate(text: string, maxLength: number, suffix = '...'): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * 基金类型转中文
   * @param type 类型代码
   */
  static fundType(type: string): string {
    const typeMap: Record<string, string> = {
      stock: '股票型',
      bond: '债券型',
      hybrid: '混合型',
      index: '指数型',
      etf: 'ETF',
      qdii: 'QDII',
      money: '货币型',
    };
    return typeMap[type] || type;
  }

  /**
   * 风险等级转中文
   * @param level 等级代码
   */
  static riskLevel(level: string): { label: string; color: string } {
    const levelMap: Record<string, { label: string; color: string }> = {
      low: { label: '低风险', color: '#4caf50' },
      'medium-low': { label: '中低风险', color: '#8bc34a' },
      medium: { label: '中等风险', color: '#ff9800' },
      'medium-high': { label: '中高风险', color: '#ff5722' },
      high: { label: '高风险', color: '#f44336' },
    };
    return levelMap[level] || { label: level, color: '#78909c' };
  }
}
