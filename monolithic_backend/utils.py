"""
工具模块
包含各种通用工具函数和配置
"""
import logging
import os
import sys

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base

from .config import settings

# 创建基本模型类
Base = declarative_base()

# 创建异步引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True
)

# 获取异步会话
async def get_async_db() -> AsyncSession:
    """创建并返回异步数据库会话"""
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker
    
    # 创建异步会话工厂
    AsyncSessionLocal = sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    """初始化数据库，创建所有表"""
    async with engine.begin() as conn:
        # 创建所有表
        await conn.run_sync(Base.metadata.create_all)
        
    await engine.dispose()

def get_logger(name: str) -> logging.Logger:
    """
    获取配置好的日志记录器
    :param name: 日志记录器名称
    :return: 配置好的日志记录器
    """
    # 创建日志记录器
    logger = logging.getLogger(name)
    
    # 仅在未配置处理程序时配置
    if not logger.hasHandlers():
        # 设置日志级别
        logger.setLevel(logging.INFO)
        
        # 创建控制台处理器
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        
        # 创建日志格式
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(formatter)
        
        # 添加控制台处理器
        logger.addHandler(console_handler)
        
        # 添加文件处理器（可选）
        if os.path.exists('./logs'):
            file_handler = logging.FileHandler('./backend.log', encoding='utf-8')
            file_handler.setLevel(logging.INFO)
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
    
    return logger
