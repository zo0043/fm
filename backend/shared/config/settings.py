"""
基金监控应用配置管理
统一管理所有服务的配置项
"""

from functools import lru_cache
from typing import List, Optional
from pydantic import BaseSettings, validator
import os


class DatabaseSettings(BaseSettings):
    """数据库配置"""
    url: str = "postgresql://fund_user:fund_password@localhost:5432/fund_monitor"
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    echo: bool = False

    class Config:
        env_prefix = "DATABASE_"


class RedisSettings(BaseSettings):
    """Redis配置"""
    url: str = "redis://localhost:6379/0"
    password: Optional[str] = None
    max_connections: int = 10

    class Config:
        env_prefix = "REDIS_"


class InfluxDBSettings(BaseSettings):
    """InfluxDB配置"""
    url: str = "http://localhost:8086"
    token: str = "fund_monitor_token"
    org: str = "fund_monitor"
    bucket: str = "fund_data"
    username: Optional[str] = None
    password: Optional[str] = None

    class Config:
        env_prefix = "INFLUXDB_"


class APISettings(BaseSettings):
    """API服务配置"""
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = False
    workers: int = 1
    debug: bool = False

    class Config:
        env_prefix = "API_"


class ServicePorts(BaseSettings):
    """微服务端口配置"""
    data_collector: int = 8000
    monitor_engine: int = 8001
    notification: int = 8002
    backtest: int = 8003
    frontend: int = 3000

    class Config:
        env_prefix = "SERVICE_PORT_"


class ExternalAPISettings(BaseSettings):
    """外部API配置"""
    ttfund_base_url: str = "https://fund.eastmoney.com"
    sina_base_url: str = "https://hq.sinajs.cn"
    request_timeout: int = 30
    max_retries: int = 3
    retry_delay: float = 1.0

    class Config:
        env_prefix = "EXTERNAL_API_"


class NotificationSettings(BaseSettings):
    """通知配置"""
    wechat_webhook_url: str = ""
    wechat_webhook_key: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    batch_size: int = 100
    max_retry_attempts: int = 3

    class Config:
        env_prefix = "NOTIFICATION_"


class SecuritySettings(BaseSettings):
    """安全配置"""
    jwt_secret: str = "fund_monitor_jwt_secret_key"
    jwt_algorithm: str = "HS256"
    jwt_expires_in: int = 24 * 60 * 60  # 24小时

    class Config:
        env_prefix = "JWT_"


class LoggingSettings(BaseSettings):
    """日志配置"""
    level: str = "INFO"
    file_path: str = "./logs/app.log"
    max_file_size: str = "10MB"
    backup_count: int = 5
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    class Config:
        env_prefix = "LOG_"


class CelerySettings(BaseSettings):
    """Celery配置"""
    broker_url: str = "redis://localhost:6379/1"
    result_backend: str = "redis://localhost:6379/1"
    task_serializer: str = "json"
    result_serializer: str = "json"
    accept_content: List[str] = ["json"]
    timezone: str = "Asia/Shanghai"
    enable_utc: bool = False

    class Config:
        env_prefix = "CELERY_"


class SystemSettings(BaseSettings):
    """系统配置"""
    environment: str = "development"
    default_timezone: str = "Asia/Shanghai"
    data_collection_time: str = "18:00"  # 数据采集时间
    fund_types: List[str] = [
        "股票型", "债券型", "混合型", "指数型", "QDII", "FOF", "货币型"
    ]
    supported_fund_exchanges: List[str] = [
        "深圳", "上海", "北京"
    ]

    @validator("environment")
    def validate_environment(cls, v):
        allowed_envs = ["development", "testing", "staging", "production"]
        if v not in allowed_envs:
            raise ValueError(f"Environment must be one of {allowed_envs}")
        return v

    class Config:
        env_prefix = "SYSTEM_"


class Settings(BaseSettings):
    """总配置类"""
    # 应用基础信息
    app_name: str = "基金监控应用"
    app_version: str = "1.0.0"
    app_description: str = "基于微服务架构的基金涨跌幅监控应用"

    # 子配置
    database: DatabaseSettings = DatabaseSettings()
    redis: RedisSettings = RedisSettings()
    influxdb: InfluxDBSettings = InfluxDBSettings()
    api: APISettings = APISettings()
    service_ports: ServicePorts = ServicePorts()
    external_api: ExternalAPISettings = ExternalAPISettings()
    notification: NotificationSettings = NotificationSettings()
    security: SecuritySettings = SecuritySettings()
    logging: LoggingSettings = LoggingSettings()
    celery: CelerySettings = CelerySettings()
    system: SystemSettings = SystemSettings()

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    def is_production(self) -> bool:
        """判断是否为生产环境"""
        return self.system.environment == "production"

    def is_development(self) -> bool:
        """判断是否为开发环境"""
        return self.system.environment == "development"

    def get_database_url(self) -> str:
        """获取数据库连接URL"""
        return self.database.url

    def get_redis_url(self) -> str:
        """获取Redis连接URL"""
        return self.redis.url

    def get_influxdb_config(self) -> dict:
        """获取InfluxDB配置"""
        return {
            "url": self.influxdb.url,
            "token": self.influxdb.token,
            "org": self.influxdb.org,
            "bucket": self.influxdb.bucket
        }


@lru_cache()
def get_settings() -> Settings:
    """获取配置实例 (单例模式)"""
    return Settings()


# 全局配置实例
settings = get_settings()