import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ThrottlerModule } from '@nestjs/throttler';
import * as helmet from 'helmet';
import * as compression from 'compression';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 获取配置服务
  const configService = app.get(ConfigService);

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS配置
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 安全中间件
  app.use(helmet());
  app.use(compression());

  // API限流
  app.use(
    await ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000, // 1分钟
          limit: 100, // 100次请求
        },
      ],
    }).create(),
  );

  // Swagger文档配置
  const config = new DocumentBuilder()
    .setTitle('基金监控API')
    .setDescription('基金涨跌幅监控应用API文档')
    .setVersion('1.0')
    .addTag('auth', '认证管理')
    .addTag('funds', '基金管理')
    .addTag('monitor', '监控管理')
    .addTag('notifications', '通知管理')
    .addTag('backtest', '回测管理')
    .addTag('dashboard', '仪表板')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: '基金监控API文档',
    customfavIcon: '/favicon.ico',
    customCssUrl: '/swagger-ui.css',
    customJs: '/swagger-ui-init.js',
  });

  // 设置全局前缀
  const globalPrefix = configService.get<string>('GLOBAL_PREFIX', 'api');
  app.setGlobalPrefix(globalPrefix);

  // 启动监听
  const port = configService.get<number>('PORT', 3000);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  console.log(`🚀 Application is running on: http://${host}:${port}/${globalPrefix}`);
  console.log(`📚 API Documentation available at: http://${host}:${port}/${globalPrefix}/api-docs`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});