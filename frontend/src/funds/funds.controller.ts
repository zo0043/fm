import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

import { FundsService } from './funds.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFundDto } from './dto/create-fund.dto';
import { UpdateFundDto } from './dto/update-fund.dto';
import { GetFundsDto } from './dto/get-funds.dto';
import { User } from '../common/decorators/user.decorator';

@ApiTags('基金管理')
@Controller('funds')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FundsController {
  constructor(private readonly fundsService: FundsService) {}

  @Get()
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiOperation({ summary: '获取基金列表' })
  @ApiResponse({ status: 200, description: '成功获取基金列表' })
  async getFunds(@Query() query: GetFundsDto, @User() user: any) {
    const result = await this.fundsService.getFunds(query, user.id);
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get(':code')
  @ApiOperation({ summary: '获取基金详情' })
  @ApiResponse({ status: 200, description: '成功获取基金详情' })
  @ApiResponse({ status: 404, description: '基金不存在' })
  async getFundByCode(@Param('code') code: string) {
    const fund = await this.fundsService.getFundByCode(code);
    if (!fund) {
      throw new HttpException('基金不存在', HttpStatus.NOT_FOUND);
    }
    return {
      success: true,
      data: fund,
    };
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: '创建基金' })
  @ApiResponse({ status: 201, description: '成功创建基金' })
  async createFund(@Body() createFundDto: CreateFundDto, @User() user: any) {
    const fund = await this.fundsService.createFund(createFundDto, user.id);
    return {
      success: true,
      message: '基金创建成功',
      data: fund,
    };
  }

  @Put(':code')
  @ApiOperation({ summary: '更新基金信息' })
  @ApiResponse({ status: 200, description: '成功更新基金' })
  @ApiResponse({ status: 404, description: '基金不存在' })
  async updateFund(
    @Param('code') code: string,
    @Body() updateFundDto: UpdateFundDto,
  ) {
    const fund = await this.fundsService.updateFund(code, updateFundDto);
    if (!fund) {
      throw new HttpException('基金不存在', HttpStatus.NOT_FOUND);
    }
    return {
      success: true,
      message: '基金更新成功',
      data: fund,
    };
  }

  @Delete(':code')
  @ApiOperation({ summary: '删除基金' })
  @ApiResponse({ status: 200, description: '成功删除基金' })
  @ApiResponse({ status: 404, description: '基金不存在' })
  async deleteFund(@Param('code') code: string) {
    const success = await this.fundsService.deleteFund(code);
    if (!success) {
      throw new HttpException('基金不存在', HttpStatus.NOT_FOUND);
    }
    return {
      success: true,
      message: '基金删除成功',
    };
  }

  @Get(':code/nav')
  @ApiOperation({ summary: '获取基金净值历史' })
  @ApiResponse({ status: 200, description: '成功获取净值历史' })
  async getFundNavHistory(
    @Param('code') code: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 100,
  ) {
    const result = await this.fundsService.getFundNavHistory(code, {
      startDate,
      endDate,
      page,
      limit,
    });
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get(':code/performance')
  @ApiOperation({ summary: '获取基金表现分析' })
  @ApiResponse({ status: 200, description: '成功获取表现分析' })
  async getFundPerformance(
    @Param('code') code: string,
    @Query('period') period: string = '1y', // 1m, 3m, 6m, 1y, 3y, 5y
  ) {
    const performance = await this.fundsService.getFundPerformance(code, period);
    return {
      success: true,
      data: performance,
    };
  }

  @Post('sync')
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5分钟内最多5次
  @ApiOperation({ summary: '同步基金数据' })
  async syncFunds(@Body() body: { codes?: string[] }) {
    const result = await this.fundsService.syncFunds(body.codes);
    return {
      success: true,
      message: '基金数据同步已启动',
      data: {
        taskId: result.taskId,
        fundsCount: result.fundsCount,
      },
    };
  }

  @Post(':code/collect')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: '收集指定基金数据' })
  async collectFundData(@Param('code') code: string) {
    const result = await this.fundsService.collectFundData(code);
    return {
      success: true,
      message: '数据收集已启动',
      data: {
        taskId: result.taskId,
        fundCode: code,
      },
    };
  }

  @Get('types')
  @ApiOperation({ summary: '获取基金类型列表' })
  async getFundTypes() {
    const types = await this.fundsService.getFundTypes();
    return {
      success: true,
      data: types,
    };
  }

  @Get('companies')
  @ApiOperation({ summary: '获取基金公司列表' })
  async getFundCompanies() {
    const companies = await this.fundsService.getFundCompanies();
    return {
      success: true,
      data: companies,
    };
  }

  @Get('search')
  @ApiOperation({ summary: '搜索基金' })
  async searchFunds(
    @Query('keyword') keyword: string,
    @Query('type') type?: string,
    @Query('company') company?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const result = await this.fundsService.searchFunds({
      keyword,
      type,
      company,
      page,
      limit,
    });
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Post('batch')
  @Throttle({ default: { limit: 3, ttl: 600000 } }) // 10分钟内最多3次
  @ApiOperation({ summary: '批量操作基金' })
  async batchOperation(@Body() body: {
    action: 'sync' | 'delete';
    codes?: string[];
    filters?: {
      type?: string;
      company?: string;
      status?: string;
    };
  }) {
    const result = await this.fundsService.batchOperation(body);
    return {
      success: true,
      message: `批量${body.action}操作已启动`,
      data: {
        taskId: result.taskId,
        affectedCount: result.affectedCount,
      },
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取基金统计信息' })
  async getFundStatistics() {
    const statistics = await this.fundsService.getFundStatistics();
    return {
      success: true,
      data: statistics,
    };
  }

  @Post(':code/favorite')
  @ApiOperation({ summary: '添加/移除收藏基金' })
  async toggleFavorite(
    @Param('code') code: string,
    @Body() body: { action: 'add' | 'remove' },
    @User() user: any,
  ) {
    const result = await this.fundsService.toggleFavorite(code, body.action, user.id);
    return {
      success: true,
      message: result.message,
      data: {
        isFavorite: result.isFavorite,
      },
    };
  }

  @Get('favorites')
  @ApiOperation({ summary: '获取收藏的基金列表' })
  async getFavoriteFunds(
    @User() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const result = await this.fundsService.getFavoriteFunds(user.id, page, limit);
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }
}