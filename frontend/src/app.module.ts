import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { configuration } from './config/configuration';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FundsModule } from './funds/funds.module';
import { MonitorModule } from './monitor/monitor.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BacktestModule } from './backtest/backtest.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ProxyModule } from './proxy/proxy.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // 数据库模块
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: databaseConfig,
      inject: [ConfigService],
    }),

    // 其他模块
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000, // 1分钟
          limit: 100, // 100次请求
        },
      ],
    }),

    ScheduleModule.forRoot(),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
        },
      }),
      inject: [ConfigService],
    }),

    PassportModule.register({}),

    // 业务模块
    AuthModule,
    UsersModule,
    FundsModule,
    MonitorModule,
    NotificationsModule,
    BacktestModule,
    DashboardModule,
    ProxyModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}