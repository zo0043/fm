import {
  Controller,
  Get,
  UseGuards,
  Query,
  Param,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';

@ApiTags('仪表板')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: '获取仪表板概览' })
  async getOverview(@User() user: any) {
    const overview = await this.dashboardService.getOverview(user.id);
    return {
      success: true,
      data: overview,
    };
  }

  @Get('portfolio')
  @ApiOperation({ summary: '获取投资组合概览' })
  async getPortfolioOverview(@User() user: any) {
    const portfolio = await this.dashboardService.getPortfolioOverview(user.id);
    return {
      success: true,
      data: portfolio,
    };
  }

  @Get('performance')
  @ApiOperation({ summary: '获取性能数据' })
  async getPerformance(
    @Query('period') period: string = '1m', // 1d, 1w, 1m, 3m, 6m, 1y
    @Query('fundCode') fundCode?: string,
  ) {
    const performance = await this.dashboardService.getPerformance(period, fundCode);
    return {
      success: true,
      data: performance,
    };
  }

  @Get('alerts')
  @ApiOperation({ summary: '获取告警信息' })
  async getAlerts(
    @Query('status') status?: 'pending' | 'acknowledged' | 'resolved',
    @Query('severity') severity?: 'high' | 'medium' | 'low',
    @Query('limit') limit: number = 10,
  ) {
    const alerts = await this.dashboardService.getAlerts(status, severity, limit);
    return {
      success: true,
      data: alerts,
    };
  }

  @Get('activities')
  @ApiOperation({ summary: '获取最近活动' })
  async getActivities(
    @Query('limit') limit: number = 20,
    @Query('type') type?: 'all' | 'monitor' | 'notification' | 'backtest',
  ) {
    const activities = await this.dashboardService.getActivities(limit, type);
    return {
      success: true,
      data: activities,
    };
  }

  @Get('watchlist')
  @ApiOperation({ summary: '获取监控列表' })
  async getWatchlist(@User() user: any) {
    const watchlist = await this.dashboardService.getWatchlist(user.id);
    return {
      success: true,
      data: watchlist,
    };
  }

  @Post('watchlist/:fundCode')
  @ApiOperation({ summary: '添加到监控列表' })
  async addToWatchlist(
    @Param('fundCode') fundCode: string,
    @User() user: any,
  ) {
    const result = await this.dashboardService.addToWatchlist(user.id, fundCode);
    return {
      success: true,
      message: result.message,
      data: result.watchlistItem,
    };
  }

  @Delete('watchlist/:fundCode')
  @ApiOperation({ summary: '从监控列表移除' })
  async removeFromWatchlist(
    @Param('fundCode') fundCode: string,
    @User() user: any,
  ) {
    const result = await this.dashboardService.removeFromWatchlist(user.id, fundCode);
    return {
      success: true,
      message: result.message,
    };
  }

  @Get('market-summary')
  @ApiOperation({ summary: '获取市场概览' })
  async getMarketSummary() {
    const marketSummary = await this.dashboardService.getMarketSummary();
    return {
      success: true,
      data: marketSummary,
    };
  }

  @Get('trending')
  @ApiOperation({ summary: '获取热门基金' })
  async getTrendingFunds(
    @Query('period') period: string = '1w', // 1d, 1w, 1m
    @Query('type') type?: 'gainers' | 'losers' | 'volume',
  ) {
    const trending = await this.dashboardService.getTrendingFunds(period, type);
    return {
      success: true,
      data: trending,
    };
  }

  @Get('calendar')
  @ApiOperation({ summary: '获取日历事件' })
  async getCalendarEvents(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const events = await this.dashboardService.getCalendarEvents(start, end);
    return {
      success: true,
      data: events,
    };
  }

  @Get('reports/summary')
  @ApiOperation({ summary: '获取报告摘要' })
  async getReportsSummary(@User() user: any) {
    const summary = await this.dashboardService.getReportsSummary(user.id);
    return {
      success: true,
      data: summary,
    };
  }

  @Get('notifications')
  @ApiOperation({ summary: '获取通知设置' })
  async getNotifications(@User() user: any) {
    const notifications = await this.dashboardService.getNotifications(user.id);
    return {
      success: true,
      data: notifications,
    };
  }

  @Put('notifications')
  @ApiOperation({ summary: '更新通知设置' })
  async updateNotifications(
    @Body() settings: any,
    @User() user: any,
  ) {
    const result = await this.dashboardService.updateNotifications(user.id, settings);
    return {
      success: true,
      message: '通知设置更新成功',
      data: result,
    };
  }

  @Get('widgets')
  @ApiOperation({ summary: '获取仪表板组件配置' })
  async getWidgets(@User() user: any) {
    const widgets = await this.dashboardService.getWidgets(user.id);
    return {
      success: true,
      data: widgets,
    };
  }

  @Put('widgets')
  @ApiOperation({ summary: '更新仪表板组件配置' })
  async updateWidgets(
    @Body() widgets: any,
    @User() user: any,
  ) {
    const result = await this.dashboardService.updateWidgets(user.id, widgets);
    return {
      success: true,
      message: '仪表板配置更新成功',
      data: result,
    };
  }

  @Get('export')
  @ApiOperation({ summary: '导出仪表板数据' })
  async exportData(
    @Query('format') format: 'json' | 'csv' | 'pdf',
    @Query('type') type?: 'overview' | 'portfolio' | 'performance',
    @User() user: any,
  ) {
    const result = await this.dashboardService.exportData(user.id, format, type);
    return {
      success: true,
      data: result,
    };
  }

  @Get('analytics')
  @ApiOperation({ summary: '获取分析数据' })
  async getAnalytics(
    @Query('metric') metric: 'returns' | 'risk' | 'correlation',
    @Query('period') period: string = '1m',
    @Query('fundCodes') fundCodes?: string,
  ) {
    const analytics = await this.dashboardService.getAnalytics(metric, period, fundCodes);
    return {
      success: true,
      data: analytics,
    };
  }

  @Get('recommendations')
  @ApiOperation({ summary: '获取投资建议' })
  async getRecommendations(@User() user: any) {
    const recommendations = await this.dashboardService.getRecommendations(user.id);
    return {
      success: true,
      data: recommendations,
    };
  }
}