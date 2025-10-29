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
  HttpStatus,
  Res
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';

@ApiTags('微服务代理')
@Controller('proxy')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProxyController {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Get('data-collector/*')
  @ApiOperation({ summary: '代理数据收集服务' })
  async proxyDataCollector(@Req() req: Request, @Res() res: Response) {
    return this.proxyRequest(req, res, 'dataCollector');
  }

  @Post('data-collector/*')
  @ApiOperation({ summary: '代理数据收集服务' })
  async proxyDataCollectorPost(@Req() req: Request, @Res() res: Response) {
    return this.proxyRequest(req, res, 'dataCollector');
  }

  @Put('data-collector/*')
  @ApiOperation({ summary: '代理数据收集服务' })
  async proxyDataCollectorPut(@Req() req: Request, @Res() res: Response) {
    return this.proxyRequest(req, res, 'dataCollector');
  }

  @Delete('data-collector/*')
  @ApiOperation({ summary: '代理数据收集服务' })
  async proxyDataCollectorDelete(@Req() req: Request, @Res() res: Response) {
    return this.proxyRequest(req, res, 'dataCollector');
  }

  @Get('monitor-engine/*')
  @ApiOperation({ summary: '代理监控引擎服务' })
  async proxyMonitorEngine(@Req() req: Request, @Res() res: Response) {
    return this.proxyRequest(req, res, 'monitorEngine');
  }

  @Post('monitor-engine/*')
  @ApiOperation({ summary: '代理监控引擎服务' })
  async proxyMonitorEnginePost(@Req() req: Request, @Res() res: Response) {
    return this.proxyRequest(req, res, 'monitorEngine');
  }

  @Get('notification/*')
  @ApiOperation({ summary: '代理通知服务' })
  async proxyNotification(@Req() req: Request, @Res() res: Response) {
    return this.proxyRequest(req, res, 'notification');
  }

  @Post('notification/*')
  @ApiOperation({ summary: '代理通知服务' })
  async proxyNotificationPost(@Req() req: Request, @Res() res: Response) {
    return this.proxyRequest(req, res, 'notification');
  }

  @Get('backtest/*')
  @ApiOperation({ summary: '代理回测服务' })
  async proxyBacktest(@Req() req: Request, @Res() res: Response) {
    return this.proxyRequest(req, res, 'backtest');
  }

  @Post('backtest/*')
  @ApiOperation({ summary: '代理回测服务' })
  async proxyBacktestPost(@Req() req: Request, @Res() res: Response) {
    return this.proxyRequest(req, res, 'backtest');
  }

  @Get('services/health')
  @ApiOperation({ summary: '获取所有微服务健康状态' })
  @ApiResponse({ status: 200, description: '成功获取健康状态' })
  async getServicesHealth() {
    const services = [
      'dataCollector',
      'monitorEngine',
      'notification',
      'backtest'
    ];

    const healthChecks = await Promise.allSettled(
      services.map(async (service) => {
        try {
          const url = this.configService.get(`microservices.${service}.url`);
          const response = await this.httpService.get(`${url}/health`, {
            timeout: 5000,
          });
          return {
            service,
            status: 'healthy',
            data: response.data,
          };
        } catch (error) {
          return {
            service,
            status: 'unhealthy',
            error: error.message,
          };
        }
      })
    );

    return {
      success: true,
      data: {
        services: healthChecks.map(result => result.value),
        overall: healthChecks.every(result => result.value.status === 'healthy') ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('services/stats')
  @ApiOperation({ summary: '获取所有微服务统计信息' })
  async getServicesStats() {
    const services = [
      'dataCollector',
      'monitorEngine',
      'notification',
      'backtest'
    ];

    const stats = await Promise.allSettled(
      services.map(async (service) => {
        try {
          const url = this.configService.get(`microservices.${service}.url`);
          const response = await this.httpService.get(`${url}/api/v1/stats`, {
            timeout: 10000,
          });
          return {
            service,
            status: 'success',
            data: response.data,
          };
        } catch (error) {
          return {
            service,
            status: 'error',
            error: error.message,
          };
        }
      })
    );

    return {
      success: true,
      data: {
        services: stats.map(result => result.value),
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('services/:service/*')
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiOperation({ summary: '通用代理接口' })
  async proxyServiceRequest(
    @Param('service') service: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.proxyRequest(req, res, service);
  }

  private async proxyRequest(req: Request, res: Response, service: string) {
    try {
      const baseUrl = this.configService.get(`microservices.${service}.url`);
      if (!baseUrl) {
        throw new HttpException(`服务 ${service} 未配置`, HttpStatus.BAD_REQUEST);
      }

      // 构建目标URL
      const originalUrl = req.url;
      const targetPath = originalUrl.replace(`/api/proxy/${service}`, '');
      const targetUrl = `${baseUrl}${targetPath}`;

      // 设置请求头
      const headers = {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Accept': req.headers['accept'] || 'application/json',
        ...Object.fromEntries(req.headers as any),
      };

      // 移除host头，避免冲突
      delete headers['host'];

      let response;

      try {
        switch (req.method) {
          case 'GET':
            response = await this.httpService.get(targetUrl, {
              headers,
              responseType: 'stream',
            });
            break;
          case 'POST':
            response = await this.httpService.post(targetUrl, req.body, {
              headers,
              responseType: 'stream',
            });
            break;
          case 'PUT':
            response = await this.httpService.put(targetUrl, req.body, {
              headers,
              responseType: 'stream',
            });
            break;
          case 'DELETE':
            response = await this.httpService.delete(targetUrl, {
              headers,
              responseType: 'stream',
            });
            break;
          default:
            throw new HttpException(`不支持的方法: ${req.method}`, HttpStatus.METHOD_NOT_ALLOWED);
        }

        // 设置响应头
        Object.entries(response.headers).forEach(([key, value]) => {
          if (key !== 'transfer-encoding' && key !== 'content-length') {
            res.setHeader(key, value);
          }
        });

        res.status(response.status);
        response.data.pipe(res);

      } catch (error) {
        const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const message = error.response?.data?.message || error.message || '服务请求失败';

        res.status(status).json({
          success: false,
          error: message,
          service,
          timestamp: new Date().toISOString(),
        });
      }

    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message,
        service,
        timestamp: new Date().toISOString(),
      });
    }
  }
}