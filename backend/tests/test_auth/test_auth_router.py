"""
认证路由单元测试
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import status

from services.auth.main import app
from services.auth.services.auth_service import AuthService


@pytest.mark.unit
class TestAuthRouter:
    """认证路由测试类"""

    @pytest.fixture
    def client(self):
        """创建测试客户端"""
        return TestClient(app)

    @pytest.fixture
    def mock_auth_service(self):
        """模拟认证服务"""
        return AsyncMock(spec=AuthService)

    @pytest.fixture
    def mock_user_data(self):
        """模拟用户数据"""
        return {
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpass123",
            "confirm_password": "testpass123"
        }

    @pytest.fixture
    def mock_login_data(self):
        """模拟登录数据"""
        return {
            "username": "testuser",
            "password": "testpass123"
        }

    @pytest.fixture
    def mock_user_response(self):
        """模拟用户响应数据"""
        return {
            "id": 1,
            "username": "testuser",
            "email": "test@example.com",
            "is_active": True,
            "created_at": "2024-01-01T00:00:00"
        }

    @pytest.fixture
    def mock_token_response(self):
        """模拟令牌响应数据"""
        return {
            "access_token": "test_access_token",
            "refresh_token": "test_refresh_token",
            "token_type": "bearer",
            "expires_in": 1800
        }

    def test_register_success(self, client, mock_user_data, mock_user_response, mock_token_response):
        """测试成功注册"""
        # Arrange
        with patch('services.auth.routers.auth_router.AuthService') as mock_service_class:
            mock_service = AsyncMock(spec=AuthService)
            mock_service_class.return_value = mock_service

            # 模拟创建用户
            mock_user = MagicMock()
            mock_user.id = 1
            mock_user.username = mock_user_data["username"]
            mock_user.email = mock_user_data["email"]
            mock_user.is_active = True
            mock_user.created_at = "2024-01-01T00:00:00"

            # 模拟生成令牌
            mock_service.create_user.return_value = mock_user
            mock_service.create_access_token.return_value = mock_token_response["access_token"]
            mock_service.create_refresh_token.return_value = mock_token_response["refresh_token"]

            # Act
            response = client.post("/api/v1/auth/register", json=mock_user_data)

            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"]["user"]["username"] == mock_user_data["username"]
            assert data["data"]["user"]["email"] == mock_user_data["email"]
            assert "access_token" in data["data"]["token"]
            assert "refresh_token" in data["data"]["token"]

    def test_register_passwords_not_match(self, client, mock_user_data):
        """测试注册时密码不匹配"""
        # Arrange
        mock_user_data["confirm_password"] = "different_password"

        # Act
        response = client.post("/api/v1/auth/register", json=mock_user_data)

        # Assert
        assert response.status_code == 422  # Validation error
        errors = response.json()["detail"]
        assert any("密码不一致" in str(error) for error in errors)

    def test_register_short_password(self, client, mock_user_data):
        """测试注册时密码过短"""
        # Arrange
        mock_user_data["password"] = "123"
        mock_user_data["confirm_password"] = "123"

        # Act
        response = client.post("/api/v1/auth/register", json=mock_user_data)

        # Assert
        assert response.status_code == 422
        errors = response.json()["detail"]
        assert any("至少需要6个字符" in str(error) for error in errors)

    def test_register_invalid_username(self, client, mock_user_data):
        """测试注册时用户名无效"""
        # Arrange
        mock_user_data["username"] = "ab"  # 太短

        # Act
        response = client.post("/api/v1/auth/register", json=mock_user_data)

        # Assert
        assert response.status_code == 422
        errors = response.json()["detail"]
        assert any("至少需要3个字符" in str(error) for error in errors)

    def test_register_username_exists(self, client, mock_user_data):
        """测试注册时用户名已存在"""
        # Arrange
        with patch('services.auth.routers.auth_router.AuthService') as mock_service_class:
            mock_service = AsyncMock(spec=AuthService)
            mock_service_class.return_value = mock_service

            # 模拟用户名已存在
            mock_service.create_user.side_effect = Exception("用户名已存在")

            # Act
            response = client.post("/api/v1/auth/register", json=mock_user_data)

            # Assert
            assert response.status_code == 500
            assert "注册失败" in response.json()["detail"]

    def test_login_success(self, client, mock_login_data, mock_user_response, mock_token_response):
        """测试成功登录"""
        # Arrange
        with patch('services.auth.routers.auth_router.AuthService') as mock_service_class:
            mock_service = AsyncMock(spec=AuthService)
            mock_service_class.return_value = mock_service

            # 模拟认证成功
            mock_user = MagicMock()
            mock_user.id = 1
            mock_user.username = mock_login_data["username"]
            mock_user.email = "test@example.com"
            mock_user.is_active = True
            mock_user.created_at = "2024-01-01T00:00:00"

            mock_service.authenticate_user.return_value = mock_user
            mock_service.create_access_token.return_value = mock_token_response["access_token"]
            mock_service.create_refresh_token.return_value = mock_token_response["refresh_token"]

            # Act
            response = client.post("/api/v1/auth/login", json=mock_login_data)

            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"]["user"]["username"] == mock_login_data["username"]
            assert "access_token" in data["data"]["token"]
            assert "refresh_token" in data["data"]["token"]

    def test_login_invalid_credentials(self, client, mock_login_data):
        """测试登录时凭据无效"""
        # Arrange
        with patch('services.auth.routers.auth_router.AuthService') as mock_service_class:
            mock_service = AsyncMock(spec=AuthService)
            mock_service_class.return_value = mock_service

            # 模拟认证失败
            mock_service.authenticate_user.return_value = None

            # Act
            response = client.post("/api/v1/auth/login", json=mock_login_data)

            # Assert
            assert response.status_code == 401
            assert "用户名或密码错误" in response.json()["detail"]

    def test_login_empty_fields(self, client):
        """测试登录时字段为空"""
        # Arrange
        login_data = {"username": "", "password": ""}

        # Act
        response = client.post("/api/v1/auth/login", json=login_data)

        # Assert
        assert response.status_code == 422
        errors = response.json()["detail"]
        assert any("不能为空" in str(error) for error in errors)

    def test_get_current_user_success(self, client, mock_user_response):
        """测试获取当前用户信息成功"""
        # Arrange
        token = "valid_token"
        headers = {"Authorization": f"Bearer {token}"}

        with patch('services.auth.routers.auth_router.AuthService') as mock_service_class:
            mock_service = AsyncMock(spec=AuthService)
            mock_service_class.return_value = mock_service

            # 模拟验证令牌和获取用户
            mock_service.verify_token.return_value = {
                "sub": "testuser",
                "user_id": 1
            }

            mock_user = MagicMock()
            mock_user.id = 1
            mock_user.username = "testuser"
            mock_user.email = "test@example.com"
            mock_user.is_active = True
            mock_user.created_at = "2024-01-01T00:00:00"

            mock_service.get_user_by_username.return_value = mock_user

            # Act
            response = client.get("/api/v1/auth/me", headers=headers)

            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"]["username"] == "testuser"

    def test_get_current_user_no_token(self, client):
        """测试获取当前用户信息时没有令牌"""
        # Act
        response = client.get("/api/v1/auth/me")

        # Assert
        assert response.status_code == 401

    def test_get_current_user_invalid_token(self, client):
        """测试获取当前用户信息时令牌无效"""
        # Arrange
        headers = {"Authorization": "Bearer invalid_token"}

        with patch('services.auth.routers.auth_router.AuthService') as mock_service_class:
            mock_service = AsyncMock(spec=AuthService)
            mock_service_class.return_value = mock_service
            mock_service.verify_token.side_effect = Exception("Invalid token")

            # Act
            response = client.get("/api/v1/auth/me", headers=headers)

            # Assert
            assert response.status_code == 401

    def test_refresh_token_success(self, client, mock_token_response):
        """测试刷新令牌成功"""
        # Arrange
        refresh_data = {"refresh_token": "valid_refresh_token"}

        with patch('services.auth.routers.auth_router.AuthService') as mock_service_class:
            mock_service = AsyncMock(spec=AuthService)
            mock_service_class.return_value = mock_service

            mock_service.refresh_access_token.return_value = {
                "access_token": "new_access_token",
                "expires_in": 1800
            }

            # Act
            response = client.post("/api/v1/auth/refresh", json=refresh_data)

            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "access_token" in data["data"]
            assert data["data"]["access_token"] == "new_access_token"

    def test_refresh_token_invalid(self, client):
        """测试刷新令牌时令牌无效"""
        # Arrange
        refresh_data = {"refresh_token": "invalid_refresh_token"}

        with patch('services.auth.routers.auth_router.AuthService') as mock_service_class:
            mock_service = AsyncMock(spec=AuthService)
            mock_service_class.return_value = mock_service
            mock_service.refresh_access_token.side_effect = Exception("Invalid refresh token")

            # Act
            response = client.post("/api/v1/auth/refresh", json=refresh_data)

            # Assert
            assert response.status_code == 401

    def test_logout_success(self, client):
        """测试登出成功"""
        # Act
        response = client.post("/api/v1/auth/logout")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "登出成功"

    def test_change_password_success(self, client):
        """测试修改密码成功"""
        # Arrange
        token = "valid_token"
        headers = {"Authorization": f"Bearer {token}"}
        password_data = {
            "old_password": "oldpass",
            "new_password": "newpass123",
            "confirm_password": "newpass123"
        }

        with patch('services.auth.routers.auth_router.AuthService') as mock_service_class:
            mock_service = AsyncMock(spec=AuthService)
            mock_service_class.return_value = mock_service

            # 模拟验证令牌和获取用户
            mock_service.verify_token.return_value = {
                "sub": "testuser",
                "user_id": 1
            }

            mock_user = MagicMock()
            mock_service.get_user_by_username.return_value = mock_user
            mock_service.change_password.return_value = None

            # Act
            response = client.post("/api/v1/auth/change-password", json=password_data, headers=headers)

            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "修改密码成功" in data["message"]

    def test_change_password_mismatch(self, client):
        """测试修改密码时新密码不匹配"""
        # Arrange
        password_data = {
            "old_password": "oldpass",
            "new_password": "newpass123",
            "confirm_password": "different_pass"
        }

        # Act
        response = client.post("/api/v1/auth/change-password", json=password_data)

        # Assert
        assert response.status_code == 422
        errors = response.json()["detail"]
        assert any("新密码不一致" in str(error) for error in errors)

    def test_change_password_short_password(self, client):
        """测试修改密码时新密码过短"""
        # Arrange
        password_data = {
            "old_password": "oldpass",
            "new_password": "123",
            "confirm_password": "123"
        }

        # Act
        response = client.post("/api/v1/auth/change-password", json=password_data)

        # Assert
        assert response.status_code == 422
        errors = response.json()["detail"]
        assert any("新密码至少需要6个字符" in str(error) for error in errors)

    def test_root_endpoint(self, client):
        """测试根端点"""
        # Act
        response = client.get("/")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "认证服务"
        assert data["status"] == "running"

    def test_health_check(self, client):
        """测试健康检查端点"""
        # Act
        response = client.get("/health")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "auth-service"