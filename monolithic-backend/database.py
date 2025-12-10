"""
数据库模块
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from config import settings
import logging

logger = logging.getLogger(__name__)

# SQLAlchemy 2.0 风格的基类
class Base(DeclarativeBase):
    pass

# 数据库引擎和会话工厂
engine = create_async_engine(
    settings.DATABASE_URL or f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}",
    echo=False,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# 用户模型
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    portfolios = relationship("Portfolio", back_populates="user")
    monitor_rules = relationship("MonitorRule", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

# 基金模型
class Fund(Base):
    __tablename__ = "funds"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    short_name = Column(String(50))
    type = Column(String(50))
    management_company = Column(String(100))
    fund_manager = Column(String(100))
    establishment_date = Column(DateTime)
    scale = Column(Float)
    fee_rate = Column(Float)  # 管理费率
    is_index_fund = Column(Boolean, default=False)
    is_etf = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    nav_records = relationship("NavRecord", back_populates="fund")
    portfolio_items = relationship("PortfolioItem", back_populates="fund")
    monitor_rule_items = relationship("MonitorRuleItem", back_populates="fund")

# 基金净值记录模型
class NavRecord(Base):
    __tablename__ = "nav_records"
    
    id = Column(Integer, primary_key=True, index=True)
    fund_id = Column(Integer, ForeignKey("funds.id", ondelete="CASCADE"), index=True, nullable=False)
    nav_date = Column(DateTime, index=True, nullable=False)  # 净值日期
    nav = Column(Float, nullable=False)  # 单位净值
    acc_nav = Column(Float, nullable=False)  # 累计净值
    daily_change = Column(Float, default=0)  # 日涨跌幅
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 索引
    Index("ix_nav_records_fund_date", fund_id, nav_date, unique=True)
    
    # 关系
    fund = relationship("Fund", back_populates="nav_records")

# 投资组合模型
class Portfolio(Base):
    __tablename__ = "portfolios"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    user = relationship("User", back_populates="portfolios")
    items = relationship("PortfolioItem", back_populates="portfolio", cascade="all, delete-orphan")

# 投资组合项目模型
class PortfolioItem(Base):
    __tablename__ = "portfolio_items"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id", ondelete="CASCADE"), index=True, nullable=False)
    fund_id = Column(Integer, ForeignKey("funds.id", ondelete="CASCADE"), index=True, nullable=False)
    allocation = Column(Float, default=0)  # 配置比例
    target_amount = Column(Float, default=0)  # 目标金额
    current_amount = Column(Float, default=0)  # 当前金额
    average_cost = Column(Float, default=0)  # 平均成本
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    portfolio = relationship("Portfolio", back_populates="items")
    fund = relationship("Fund", back_populates="portfolio_items")

# 监控规则模型
class MonitorRule(Base):
    __tablename__ = "monitor_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    alert_threshold = Column(Float, nullable=False)  # 告警阈值
    comparison_operator = Column(String(10), nullable=False)  # 比较运算符
    notification_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    user = relationship("User", back_populates="monitor_rules")
    items = relationship("MonitorRuleItem", back_populates="rule", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="rule")

# 监控规则项目模型
class MonitorRuleItem(Base):
    __tablename__ = "monitor_rule_items"
    
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("monitor_rules.id", ondelete="CASCADE"), index=True, nullable=False)
    fund_id = Column(Integer, ForeignKey("funds.id", ondelete="CASCADE"), index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    rule = relationship("MonitorRule", back_populates="items")
    fund = relationship("Fund", back_populates="monitor_rule_items")

# 回测策略模型
class BacktestStrategy(Base):
    __tablename__ = "backtest_strategies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    parameters = Column(Text)  # JSON格式存储策略参数
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    results = relationship("BacktestResult", back_populates="strategy")

# 回测结果模型
class BacktestResult(Base):
    __tablename__ = "backtest_results"
    
    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("backtest_strategies.id", ondelete="CASCADE"), index=True, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    initial_capital = Column(Float, nullable=False)
    final_capital = Column(Float, nullable=False)
    total_return = Column(Float, nullable=False)  # 总收益率
    annual_return = Column(Float, nullable=False)  # 年化收益率
    max_drawdown = Column(Float, nullable=False)  # 最大回撤
    sharpe_ratio = Column(Float, nullable=False)  # 夏普比率
    win_rate = Column(Float, nullable=False)  # 胜率
    details = Column(Text)  # JSON格式存储详细回测结果
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    strategy = relationship("BacktestStrategy", back_populates="results")

# 通知模型
class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    rule_id = Column(Integer, ForeignKey("monitor_rules.id", ondelete="SET NULL"), index=True, nullable=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    type = Column(String(50), nullable=False)  # email, wechat, sms
    status = Column(String(50), default="pending")  # pending, sent, failed
    sent_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    user = relationship("User", back_populates="notifications")
    rule = relationship("MonitorRule", back_populates="notifications")

# 通知设置模型
class NotificationSettings(Base):
    __tablename__ = "notification_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    email_enabled = Column(Boolean, default=False)
    email_address = Column(String(100))
    wechat_enabled = Column(Boolean, default=False)
    wechat_webhook = Column(String(500))
    sms_enabled = Column(Boolean, default=False)
    push_enabled = Column(Boolean, default=True)
    monitor_alerts_enabled = Column(Boolean, default=True)
    price_change_alerts_enabled = Column(Boolean, default=True)
    news_alerts_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# 通知日志模型
class NotificationLog(Base):
    __tablename__ = "notification_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    notification_type = Column(String(50), nullable=False)  # email, wechat, sms
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String(50), default="pending")  # pending, success, failed
    error_message = Column(Text)
    sent_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 索引
    Index("ix_notification_logs_user_sent", user_id, sent_at)

# 获取数据库会话
async def get_async_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# 初始化数据库
async def init_db():
    async with engine.begin() as conn:
        # 创建所有表
        await conn.run_sync(Base.metadata.create_all)
    logger.info("数据库初始化完成")