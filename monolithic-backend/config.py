"""
应用配置模块
"""

from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    # API 设置
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "基金监控系统"
    PROJECT_VERSION: str = "1.0.0"
    
    # 安全设置
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8天
    
    # 数据库设置
    DATABASE_URL: str = "sqlite+aiosqlite:///./fund_monitor.db"
    
    # Redis 设置
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    
    # CORS 设置
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # 数据源设置
    FUND_DATA_SOURCE: str = "eastmoney"  # eastmoney, alipay, jd等
    DATA_UPDATE_INTERVAL: int = 300  # 5分钟
    HISTORY_DATA_START_YEAR: int = 2018  # 历史数据起始年份
    
    # 通知设置
    NOTIFICATION_EMAIL_ENABLED: bool = False
    NOTIFICATION_EMAIL_HOST: str = ""
    NOTIFICATION_EMAIL_PORT: int = 587
    NOTIFICATION_EMAIL_USERNAME: str = ""
    NOTIFICATION_EMAIL_PASSWORD: str = ""
    
    NOTIFICATION_WECHAT_ENABLED: bool = False
    NOTIFICATION_WECHAT_WEBHOOK: str = ""
    
    # 回测设置
    BACKTEST_DEFAULT_START_DATE: str = "2020-01-01"
    BACKTEST_DEFAULT_END_DATE: str = "2023-12-31"
    BACKTEST_DEFAULT_BENCHMARK: str = "000001"  # 上证指数
    
    # 监控设置
    MONITOR_CHECK_INTERVAL: int = 60  # 1分钟检查一次
    MONITOR_ALERT_THRESHOLD: float = 0.05  # 5% 涨跌阈值
    MONITOR_MAX_RULES_PER_USER: int = 50  # 每个用户最大监控规则数
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()