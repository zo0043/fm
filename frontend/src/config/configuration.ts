export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '0.0.0.0',
  globalPrefix: process.env.GLOBAL_PREFIX || 'api',

  // 数据库配置
  database: {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USERNAME || 'fund_user',
    password: process.env.DATABASE_PASSWORD || 'fund_password',
    database: process.env.DATABASE_NAME || 'fund_monitor',
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
    autoLoadEntities: true,
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // Redis配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },

  // 微服务配置
  microservices: {
    dataCollector: {
      url: process.env.DATA_COLLECTOR_URL || 'http://localhost:8000',
      timeout: parseInt(process.env.DATA_COLLECTOR_TIMEOUT, 10) || 10000,
    },
    monitorEngine: {
      url: process.env.MONITOR_ENGINE_URL || 'http://localhost:8001',
      timeout: parseInt(process.env.MONITOR_ENGINE_TIMEOUT, 10) || 10000,
    },
    notification: {
      url: process.env.NOTIFICATION_URL || 'http://localhost:8002',
      timeout: parseInt(process.env.NOTIFICATION_TIMEOUT, 10) || 10000,
    },
    backtest: {
      url: process.env.BACKTEST_URL || 'http://localhost:8003',
      timeout: parseInt(process.env.BACKTEST_TIMEOUT, 10) || 30000,
    },
  },

  // CORS配置
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4200', 'http://localhost:3000'],
    credentials: true,
  },

  // 文件上传配置
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'application/pdf'],
  },

  // 缓存配置
  cache: {
    ttl: parseInt(process.env.CACHE_TTL, 10) || 300, // 5分钟
    maxSize: parseInt(process.env.CACHE_MAX_SIZE, 10) || 100, // 最大缓存项数
  },

  // 限流配置
  throttling: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60000, // 1分钟
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 100, // 100次请求
  },

  // 分页配置
  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_PAGE_LIMIT, 10) || 20,
    maxLimit: parseInt(process.env.MAX_PAGE_LIMIT, 10) || 100,
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
  },
});