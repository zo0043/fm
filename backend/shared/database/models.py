"""
基金监控应用数据库模型
使用SQLAlchemy ORM定义所有数据表
"""

from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, DateTime, Date, Boolean,
    Text, DECIMAL, BigInteger, ForeignKey, ARRAY, JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


class Fund(Base):
    """基金基础信息表"""
    __tablename__ = "funds"

    id = Column(Integer, primary_key=True, index=True)
    fund_code = Column(String(10), unique=True, nullable=False, index=True, comment="基金代码")
    fund_name = Column(String(200), nullable=False, comment="基金名称")
    fund_type = Column(String(50), nullable=False, index=True, comment="基金类型")
    fund_company = Column(String(100), comment="基金公司")
    establish_date = Column(Date, comment="成立日期")
    fund_manager = Column(String(100), comment="基金经理")
    fund_size = Column(DECIMAL(18, 2), comment="基金规模(亿元)")
    management_fee_rate = Column(DECIMAL(5, 4), comment="管理费率")
    custody_fee_rate = Column(DECIMAL(5, 4), comment="托管费率")
    status = Column(String(20), default="active", index=True, comment="状态")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")

    # 关系
    net_values = relationship("NetAssetValue", back_populates="fund")
    monitor_results = relationship("MonitorResult", back_populates="fund")

    def __repr__(self):
        return f"<Fund(code={self.fund_code}, name={self.fund_name})>"


class NetAssetValue(Base):
    """净值数据表"""
    __tablename__ = "net_asset_values"

    id = Column(BigInteger, primary_key=True, index=True)
    fund_code = Column(String(10), nullable=False, index=True, comment="基金代码")
    nav_date = Column(Date, nullable=False, index=True, comment="净值日期")
    unit_nav = Column(DECIMAL(10, 4), nullable=False, comment="单位净值")
    accumulated_nav = Column(DECIMAL(10, 4), nullable=False, comment="累计净值")
    daily_change_rate = Column(DECIMAL(8, 4), index=True, comment="日涨跌幅(%)")
    daily_change_amount = Column(DECIMAL(10, 4), comment="日涨跌金额")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")

    # 关系
    fund = relationship("Fund", back_populates="net_values")

    # 唯一约束
    __table_args__ = (
        {"comment": "基金净值数据表"},
    )

    def __repr__(self):
        return f"<NetAssetValue(fund={self.fund_code}, date={self.nav_date}, nav={self.unit_nav})>"


class MonitorRule(Base):
    """监控规则表"""
    __tablename__ = "monitor_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_name = Column(String(100), nullable=False, comment="规则名称")
    fund_code = Column(String(10), index=True, comment="基金代码(为空表示监控所有)")
    rule_type = Column(String(50), nullable=False, comment="规则类型")
    condition_operator = Column(String(10), nullable=False, comment="条件操作符")
    threshold_value = Column(DECIMAL(10, 4), comment="阈值")
    notification_channels = Column(ARRAY(String), comment="通知渠道")
    is_active = Column(Boolean, default=True, index=True, comment="是否启用")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")

    # 关系
    monitor_results = relationship("MonitorResult", back_populates="rule")

    def __repr__(self):
        return f"<MonitorRule(name={self.rule_name}, type={self.rule_type})>"


class MonitorResult(Base):
    """监控结果表"""
    __tablename__ = "monitor_results"

    id = Column(BigInteger, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("monitor_rules.id"), nullable=False, index=True, comment="规则ID")
    fund_code = Column(String(10), nullable=False, index=True, comment="基金代码")
    trigger_time = Column(DateTime, nullable=False, index=True, comment="触发时间")
    trigger_value = Column(DECIMAL(10, 4), comment="触发时的值")
    threshold_value = Column(DECIMAL(10, 4), comment="阈值")
    notification_sent = Column(Boolean, default=False, comment="是否已发送通知")
    notification_sent_at = Column(DateTime, comment="通知发送时间")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")

    # 关系
    rule = relationship("MonitorRule", back_populates="monitor_results")
    fund = relationship("Fund", back_populates="monitor_results")

    def __repr__(self):
        return f"<MonitorResult(rule_id={self.rule_id}, fund={self.fund_code})>"


class NotificationConfig(Base):
    """通知配置表"""
    __tablename__ = "notification_configs"

    id = Column(Integer, primary_key=True, index=True)
    config_name = Column(String(100), nullable=False, comment="配置名称")
    channel_type = Column(String(50), nullable=False, comment="渠道类型")
    config_data = Column(JSON, nullable=False, comment="配置数据")
    is_active = Column(Boolean, default=True, comment="是否启用")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")

    def __repr__(self):
        return f"<NotificationConfig(name={self.config_name}, type={self.channel_type})>"


class NotificationLog(Base):
    """通知记录表"""
    __tablename__ = "notification_logs"

    id = Column(BigInteger, primary_key=True, index=True)
    monitor_result_id = Column(BigInteger, ForeignKey("monitor_results.id"), comment="监控结果ID")
    channel_type = Column(String(50), nullable=False, comment="渠道类型")
    recipient = Column(String(200), nullable=False, comment="接收者")
    message_content = Column(Text, comment="消息内容")
    send_status = Column(String(20), default="pending", index=True, comment="发送状态")
    error_message = Column(Text, comment="错误信息")
    sent_at = Column(DateTime, index=True, comment="发送时间")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")

    def __repr__(self):
        return f"<NotificationLog(channel={self.channel_type}, status={self.send_status})>"


class BacktestStrategy(Base):
    """回测策略表"""
    __tablename__ = "backtest_strategies"

    id = Column(Integer, primary_key=True, index=True)
    strategy_name = Column(String(100), nullable=False, comment="策略名称")
    strategy_type = Column(String(50), nullable=False, comment="策略类型")
    fund_codes = Column(String(500), nullable=False, comment="基金代码列表")
    investment_amount = Column(DECIMAL(12, 2), nullable=False, comment="投资金额")
    investment_frequency = Column(String(20), nullable=False, comment="投资频率")
    start_date = Column(Date, nullable=False, comment="回测开始日期")
    end_date = Column(Date, nullable=False, comment="回测结束日期")
    strategy_params = Column(JSON, comment="策略参数")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")

    # 关系
    backtest_results = relationship("BacktestResult", back_populates="strategy")

    def __repr__(self):
        return f"<BacktestStrategy(name={self.strategy_name}, type={self.strategy_type})>"


class BacktestResult(Base):
    """回测结果表"""
    __tablename__ = "backtest_results"

    id = Column(BigInteger, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("backtest_strategies.id"), nullable=False, index=True, comment="策略ID")
    total_invested = Column(DECIMAL(12, 2), nullable=False, comment="总投入金额")
    total_value = Column(DECIMAL(12, 2), nullable=False, comment="总价值")
    total_return = Column(DECIMAL(10, 4), nullable=False, comment="总收益率")
    annualized_return = Column(DECIMAL(8, 4), comment="年化收益率")
    max_drawdown = Column(DECIMAL(8, 4), comment="最大回撤")
    sharpe_ratio = Column(DECIMAL(8, 4), comment="夏普比率")
    volatility = Column(DECIMAL(8, 4), comment="波动率")
    win_rate = Column(DECIMAL(5, 4), comment="胜率")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")

    # 关系
    strategy = relationship("BacktestStrategy", back_populates="backtest_results")

    def __repr__(self):
        return f"<BacktestResult(strategy_id={self.strategy_id}, return={self.total_return})>"


class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, comment="用户名")
    email = Column(String(100), unique=True, nullable=False, comment="邮箱")
    password_hash = Column(String(255), nullable=False, comment="密码哈希")
    is_active = Column(Boolean, default=True, comment="是否激活")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")

    def __repr__(self):
        return f"<User(username={self.username})>"


class SystemConfig(Base):
    """系统配置表"""
    __tablename__ = "system_configs"

    id = Column(Integer, primary_key=True, index=True)
    config_key = Column(String(100), unique=True, nullable=False, comment="配置键")
    config_value = Column(Text, nullable=False, comment="配置值")
    description = Column(Text, comment="描述")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")

    def __repr__(self):
        return f"<SystemConfig(key={self.config_key})>"


# 数据库初始化函数
def create_tables(engine):
    """创建所有数据表"""
    Base.metadata.create_all(bind=engine)


def drop_tables(engine):
    """删除所有数据表"""
    Base.metadata.drop_all(bind=engine)