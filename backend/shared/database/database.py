"""
数据库连接和会话管理
"""

from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session
from contextlib import asynccontextmanager, contextmanager
from typing import AsyncGenerator, Generator
import logging

from ..config.settings import settings
from .models import Base

logger = logging.getLogger(__name__)


class DatabaseManager:
    """数据库管理器"""

    def __init__(self):
        self._engine = None
        self._async_engine = None
        self._session_factory = None
        self._async_session_factory = None

    @property
    def engine(self):
        """获取同步数据库引擎"""
        if self._engine is None:
            self._engine = create_engine(
                settings.database.url,
                pool_size=settings.database.pool_size,
                max_overflow=settings.database.max_overflow,
                pool_timeout=settings.database.pool_timeout,
                echo=settings.database.echo,
                # 连接池配置
                pool_pre_ping=True,
                pool_recycle=3600,
            )
            logger.info("同步数据库引擎已创建")
        return self._engine

    @property
    def async_engine(self):
        """获取异步数据库引擎"""
        if self._async_engine is None:
            # 将数据库URL转换为异步版本
            async_url = settings.database.url.replace("postgresql://", "postgresql+asyncpg://")
            self._async_engine = create_async_engine(
                async_url,
                pool_size=settings.database.pool_size,
                max_overflow=settings.database.max_overflow,
                pool_timeout=settings.database.pool_timeout,
                echo=settings.database.echo,
                pool_pre_ping=True,
                pool_recycle=3600,
            )
            logger.info("异步数据库引擎已创建")
        return self._async_engine

    @property
    def session_factory(self):
        """获取同步会话工厂"""
        if self._session_factory is None:
            self._session_factory = sessionmaker(
                bind=self.engine,
                autocommit=False,
                autoflush=False,
            )
        return self._session_factory

    @property
    def async_session_factory(self):
        """获取异步会话工厂"""
        if self._async_session_factory is None:
            self._async_session_factory = async_sessionmaker(
                bind=self.async_engine,
                class_=AsyncSession,
                expire_on_commit=False,
            )
        return self._async_session_factory

    @contextmanager
    def get_session(self) -> Generator[Session, None, None]:
        """获取同步数据库会话 (上下文管理器)"""
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"数据库会话错误: {e}")
            raise
        finally:
            session.close()

    @asynccontextmanager
    async def get_async_session(self) -> AsyncGenerator[AsyncSession, None]:
        """获取异步数据库会话 (上下文管理器)"""
        session = self.async_session_factory()
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"异步数据库会话错误: {e}")
            raise
        finally:
            await session.close()

    def create_tables(self):
        """创建所有数据表"""
        Base.metadata.create_all(bind=self.engine)
        logger.info("数据表创建完成")

    async def create_tables_async(self):
        """异步创建所有数据表"""
        async with self.async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("异步数据表创建完成")

    def drop_tables(self):
        """删除所有数据表"""
        Base.metadata.drop_all(bind=self.engine)
        logger.info("数据表删除完成")

    async def drop_tables_async(self):
        """异步删除所有数据表"""
        async with self.async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        logger.info("异步数据表删除完成")

    def close(self):
        """关闭数据库连接"""
        if self._engine:
            self._engine.dispose()
        if self._async_engine:
            self.async_engine.sync_engine.dispose()
        logger.info("数据库连接已关闭")


# 全局数据库管理器实例
db_manager = DatabaseManager()


# 便捷函数
def get_db() -> Generator[Session, None, None]:
    """获取数据库会话 (用于FastAPI依赖注入)"""
    with db_manager.get_session() as session:
        yield session


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """获取异步数据库会话 (用于FastAPI依赖注入)"""
    async with db_manager.get_async_session() as session:
        yield session


# 依赖注入装饰器 (可选)
def with_session(func):
    """为函数注入数据库会话"""
    def wrapper(*args, **kwargs):
        with db_manager.get_session() as session:
            return func(session, *args, **kwargs)
    return wrapper


def with_async_session(func):
    """为异步函数注入数据库会话"""
    async def wrapper(*args, **kwargs):
        async with db_manager.get_async_session() as session:
            return await func(session, *args, **kwargs)
    return wrapper


# 数据库健康检查
async def check_database_health() -> bool:
    """检查数据库连接健康状态"""
    try:
        async with db_manager.get_async_session() as session:
            await session.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"数据库健康检查失败: {e}")
        return False


# 数据库统计信息
async def get_database_stats() -> dict:
    """获取数据库统计信息"""
    stats = {}
    try:
        async with db_manager.get_async_session() as session:
            # 获取各表的记录数
            from .models import (
                Fund, NetAssetValue, MonitorRule, MonitorResult,
                NotificationConfig, NotificationLog, BacktestStrategy,
                BacktestResult, User, SystemConfig
            )

            tables = [
                ("funds", Fund),
                ("net_asset_values", NetAssetValue),
                ("monitor_rules", MonitorRule),
                ("monitor_results", MonitorResult),
                ("notification_configs", NotificationConfig),
                ("notification_logs", NotificationLog),
                ("backtest_strategies", BacktestStrategy),
                ("backtest_results", BacktestResult),
                ("users", User),
                ("system_configs", SystemConfig),
            ]

            for table_name, model in tables:
                count = await session.execute(f"SELECT COUNT(*) FROM {table_name}")
                stats[table_name] = count.scalar()

    except Exception as e:
        logger.error(f"获取数据库统计信息失败: {e}")

    return stats