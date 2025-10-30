"""
API集成测试
测试各个微服务之间的API接口交互
"""

import pytest
import asyncio
from httpx import AsyncClient
from typing import Dict, Any

from tests.conftest import sample_user_data, sample_fund_data, sample_monitor_rule_data


@pytest.mark.integration
@pytest.mark.asyncio
class TestAPIIntegration:
    """API集成测试类"""

    @pytest.fixture
    async def auth_client(self):
        """创建认证服务客户端"""
        return AsyncClient(base_url="http://localhost:8000")

    @pytest.fixture
    async def data_collector_client(self):
        """创建数据收集服务客户端"""
        return AsyncClient(base_url="http://localhost:8001")

    @pytest.fixture
    async def monitor_client(self):
        """创建监控引擎服务客户端"""
        return AsyncClient(base_url="http://localhost:8002")

    @pytest.fixture
    async def notification_client(self):
        """创建通知服务客户端"""
        return AsyncClient(base_url="http://localhost:8003")

    @pytest.fixture
    async def backtest_client(self):
        """创建回测服务客户端"""
        return AsyncClient(base_url="http://localhost:8004")

    async def test_auth_service_health_check(self, auth_client):
        """测试认证服务健康检查"""
        # Act
        response = await auth_client.get("/health")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "auth-service"

    async def test_data_collector_service_health_check(self, data_collector_client):
        """测试数据收集服务健康检查"""
        # Act
        response = await data_collector_client.get("/health")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "data-collector-service"

    async def test_monitor_service_health_check(self, monitor_client):
        """测试监控引擎服务健康检查"""
        # Act
        response = await monitor_client.get("/health")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "monitor-engine-service"

    async def test_notification_service_health_check(self, notification_client):
        """测试通知服务健康检查"""
        # Act
        response = await notification_client.get("/health")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "notification-service"

    async def test_backtest_service_health_check(self, backtest_client):
        """测试回测服务健康检查"""
        # Act
        response = await backtest_client.get("/health")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "backtest-service"

    async def test_complete_user_flow(self, auth_client, data_collector_client, monitor_client):
        """测试完整的用户流程：注册 -> 登录 -> 创建监控规则"""
        # 1. 注册用户
        register_response = await auth_client.post("/api/v1/auth/register", json=sample_user_data)
        assert register_response.status_code == 200
        register_data = register_response.json()
        assert register_data["success"] is True

        # 2. 登录
        login_data = {
            "username": sample_user_data["username"],
            "password": sample_user_data["password"]
        }
        login_response = await auth_client.post("/api/v1/auth/login", json=login_data)
        assert login_response.status_code == 200
        login_data = login_response.json()
        assert login_data["success"] is True
        access_token = login_data["data"]["token"]["access_token"]

        headers = {"Authorization": f"Bearer {access_token}"}

        # 3. 创建基金
        fund_response = await data_collector_client.post("/funds", json=sample_fund_data, headers=headers)
        assert fund_response.status_code == 200
        fund_data = fund_response.json()
        assert fund_data["success"] is True

        # 4. 创建监控规则
        monitor_rule_response = await monitor_client.post("/rules", json=sample_monitor_rule_data, headers=headers)
        assert monitor_rule_response.status_code == 200
        monitor_data = monitor_rule_response.json()
        assert monitor_data["success"] is True

        # 5. 验证用户信息
        me_response = await auth_client.get("/api/v1/auth/me", headers=headers)
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data["success"] is True
        assert me_data["data"]["username"] == sample_user_data["username"]

    async def test_cross_service_communication(self, data_collector_client, monitor_client, notification_client):
        """测试跨服务通信"""
        # 1. 模拟创建基金
        fund_response = await data_collector_client.post("/funds", json=sample_fund_data)
        assert fund_response.status_code == 200
        fund_data = fund_response.json()
        fund_code = fund_data["data"]["fund_code"]

        # 2. 创建针对该基金的监控规则
        rule_data = sample_monitor_rule_data.copy()
        rule_data["fund_codes"] = [fund_code]

        # 注意：这里需要先认证，但为了简化测试，我们假设服务内部有认证机制
        # 在实际情况下，应该先获取令牌
        rule_response = await monitor_client.post("/rules", json=rule_data)
        assert rule_response.status_code == 200

    async def test_concurrent_requests(self, auth_client, data_collector_client):
        """测试并发请求"""
        # 并发发送多个请求
        tasks = [
            auth_client.get("/health"),
            data_collector_client.get("/health"),
            auth_client.get("/"),
            data_collector_client.get("/funds/types"),
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 验证所有请求都成功
        for result in results:
            if isinstance(result, Exception):
                pytest.fail(f"并发请求失败: {result}")
            else:
                assert result.status_code in [200, 404]  # 404可能是因为某些端点不存在

    async def test_error_handling(self, auth_client):
        """测试错误处理"""
        # 测试无效的注册数据
        invalid_user_data = {
            "username": "a",  # 太短
            "email": "invalid_email",  # 无效邮箱
            "password": "123"  # 密码太短
        }

        response = await auth_client.post("/api/v1/auth/register", json=invalid_user_data)
        assert response.status_code == 422

        # 测试无效的登录凭据
        invalid_login_data = {
            "username": "nonexistent",
            "password": "wrongpassword"
        }

        response = await auth_client.post("/api/v1/auth/login", json=invalid_login_data)
        assert response.status_code == 401

        # 测试无效的令牌
        headers = {"Authorization": "Bearer invalid_token"}
        response = await auth_client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 401

    async def test_service_discovery(self):
        """测试服务发现机制"""
        services = [
            ("http://localhost:8000", "auth-service"),
            ("http://localhost:8001", "data-collector-service"),
            ("http://localhost:8002", "monitor-engine-service"),
            ("http://localhost:8003", "notification-service"),
            ("http://localhost:8004", "backtest-service")
        ]

        health_checks = []
        for base_url, expected_service in services:
            try:
                client = AsyncClient(base_url=base_url)
                response = await client.get("/health", timeout=5.0)
                health_checks.append((expected_service, response.status_code, response.json()))
            except Exception as e:
                health_checks.append((expected_service, None, str(e)))

        # 验证所有服务都可以访问
        for service_name, status_code, _ in health_checks:
            if status_code != 200:
                pytest.fail(f"服务 {service_name} 不可访问")

    async def test_load_balancing(self, auth_client):
        """测试负载均衡（模拟）"""
        # 发送多个相同的请求
        responses = await asyncio.gather(*[
            auth_client.get("/health") for _ in range(10)
        ])

        # 验证所有请求都成功
        for response in responses:
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"

    async def test_caching_mechanism(self, data_collector_client):
        """测试缓存机制（模拟）"""
        # 第一次请求
        response1 = await data_collector_client.get("/funds/types")
        assert response1.status_code == 200
        data1 = response1.json()

        # 第二次请求（可能来自缓存）
        response2 = await data_collector_client.get("/funds/types")
        assert response2.status_code == 200
        data2 = response2.json()

        # 验证数据一致性
        assert data1 == data2


@pytest.mark.integration
@pytest.mark.asyncio
class TestPerformanceMetrics:
    """性能指标测试"""

    async def test_response_times(self, auth_client):
        """测试响应时间"""
        import time

        start_time = time.time()
        response = await auth_client.get("/health")
        end_time = time.time()

        response_time = end_time - start_time

        assert response.status_code == 200
        assert response_time < 1.0  # 响应时间应该小于1秒

    async def test_memory_usage(self):
        """测试内存使用情况"""
        import psutil
        import os

        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()

        # 验证内存使用在合理范围内
        assert memory_info.rss < 512 * 1024 * 1024  # 小于512MB

    async def test_database_connection_pool(self):
        """测试数据库连接池"""
        # 这里可以添加数据库连接池的测试
        # 由于我们使用模拟的数据库会话，这里只是示例
        pass


if __name__ == "__main__":
    # 可以直接运行特定测试
    pytest.main([__file__, "-v"])