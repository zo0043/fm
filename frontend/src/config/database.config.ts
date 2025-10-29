import { TypeOrmModuleOptions, TypeOrmOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Fund } from '../funds/entities/fund.entity';
import { NetAssetValue } from '../funds/entities/nav.entity';
import { MonitorRule } from '../monitor/entities/monitor-rule.entity';
import { MonitorResult } from '../monitor/entities/monitor-result.entity';
import { NotificationConfig } from '../notifications/entities/notification-config.entity';
import { NotificationLog } from '../notifications/entities/notification-log.entity';
import { BacktestStrategy } from '../backtest/entities/backtest-strategy.entity';
import { BacktestResult } from '../backtest/entities/backtest-result.entity';

export const databaseConfig = async (
  configService: ConfigService,
): Promise<TypeOrmModuleOptions> => {
  const dbConfig = configService.get('database');

  return {
    type: dbConfig.type as any,
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    entities: [
      User,
      Fund,
      NetAssetValue,
      MonitorRule,
      MonitorResult,
      NotificationConfig,
      NotificationLog,
      BacktestStrategy,
      BacktestResult,
    ],
    synchronize: dbConfig.synchronize,
    logging: dbConfig.logging,
    autoLoadEntities: dbConfig.autoLoadEntities,
    // 连接池配置
    extra: {
      connectionLimit: 20,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    },
    // SSL配置 (生产环境)
    ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
    // 时区配置
    timezone: '+08:00',
  } as TypeOrmOptions;
};