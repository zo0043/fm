"""
pytest配置文件
提供测试夹具和全局配置
"""

import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import AsyncMock, MagicMock

from shared.database import get_async_db, Base
from shared.config.settings import get_settings

# 测试数据库配置
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/test_fund_monitor"

@pytest.fixture(scope="session")
def event_loop():
    """创建事件循环"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    """创建测试数据库引擎"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        future=True
    )

    # 创建测试表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # 清理测试表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()

@pytest.fixture
async def test_db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """创建测试数据库会话"""
    TestSessionLocal = sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with TestSessionLocal() as session:
        yield session

@pytest.fixture
def mock_db_session():
    """模拟数据库会话"""
    return AsyncMock(spec=AsyncSession)

@pytest.fixture
async def test_client() -> AsyncGenerator[AsyncClient, None]:
    """创建测试HTTP客户端"""
    async with AsyncClient(base_url="http://testserver") as client:
        yield client

@pytest.fixture
def mock_settings():
    """模拟配置"""
    settings = MagicMock()
    settings.database_url = TEST_DATABASE_URL
    settings.redis_url = "redis://localhost:6379/1"
    settings.jwt_secret = "test_secret_key"
    settings.jwt_algorithm = "HS256"
    settings.jwt_access_token_expire_minutes = 30
    return settings

@pytest.fixture
def sample_user_data():
    """示例用户数据"""
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123",
        "confirm_password": "testpass123"
    }

@pytest.fixture
def sample_fund_data():
    """示例基金数据"""
    return {
        "fund_code": "000001",
        "fund_name": "华夏成长混合",
        "fund_type": "混合型",
        "fund_company": "华夏基金管理有限公司",
        "establish_date": "2001-12-18",
        "fund_manager": "张三",
        "fund_size": 100.50,
        "management_fee_rate": 0.0150,
        "custody_fee_rate": 0.0025,
        "status": "active"
    }

@pytest.fixture
def sample_monitor_rule_data():
    """示例监控规则数据"""
    return {
        "rule_name": "涨跌幅监控",
        "description": "监控基金每日涨跌幅变化",
        "rule_type": "price_threshold",
        "condition_operator": ">",
        "threshold_value": 5.0,
        "notification_channels": ["email", "wechat"],
        "is_active": True
    }

# 测试标记
pytest.mark.unit = pytest.mark.unit
pytest.mark.integration = pytest.mark.integration
pytest.mark.slow = pytest.mark.slow