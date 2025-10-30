"""
认证服务单元测试
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from services.auth.services.auth_service import AuthService, ACCESS_TOKEN_EXPIRE_MINUTES
from shared.database.models import User


@pytest.mark.unit
class TestAuthService:
    """认证服务测试类"""

    @pytest.fixture
    def auth_service(self, mock_db_session):
        """创建认证服务实例"""
        return AuthService(mock_db_session)

    @pytest.fixture
    def mock_user(self):
        """创建模拟用户对象"""
        user = MagicMock(spec=User)
        user.id = 1
        user.username = "testuser"
        user.email = "test@example.com"
        user.hashed_password = "hashed_password"
        user.is_active = True
        user.created_at = datetime.now()
        user.updated_at = datetime.now()
        return user

    async def test_create_user_success(self, auth_service, mock_db_session):
        """测试成功创建用户"""
        # Arrange
        username = "testuser"
        email = "test@example.com"
        password = "password123"

        # 模拟数据库查询和操作
        mock_db_session.execute.return_value.scalar.return_value = None  # 用户不存在
        mock_db_session.add = MagicMock()
        mock_db_session.commit = MagicMock()
        mock_db_session.refresh = MagicMock()

        # 模拟返回的用户对象
        mock_user = MagicMock(spec=User)
        mock_user.id = 1
        mock_user.username = username
        mock_user.email = email
        mock_user.is_active = True
        mock_user.created_at = datetime.now()

        with patch.object(auth_service, '_hash_password', return_value="hashed_password"):
            with patch('sqlalchemy.select', return_value=MagicMock()) as mock_select:
                with patch.object(auth_service, 'get_user_by_username', return_value=None):
                    # Act
                    result = await auth_service.create_user(username, email, password)

                    # Assert
                    assert result is not None
                    assert result.username == username
                    assert result.email == email
                    assert result.is_active is True

    async def test_create_user_existing_username(self, auth_service):
        """测试创建用户时用户名已存在"""
        # Arrange
        username = "existinguser"
        email = "test@example.com"
        password = "password123"

        existing_user = MagicMock(spec=User)
        existing_user.username = username

        with patch.object(auth_service, 'get_user_by_username', return_value=existing_user):
            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.create_user(username, email, password)

            assert exc_info.value.status_code == 400
            assert "用户名已存在" in str(exc_info.value.detail)

    async def test_authenticate_user_success(self, auth_service, mock_user):
        """测试成功认证用户"""
        # Arrange
        username = "testuser"
        password = "password123"

        with patch.object(auth_service, 'get_user_by_username', return_value=mock_user):
            with patch.object(auth_service, '_verify_password', return_value=True):
                # Act
                result = await auth_service.authenticate_user(username, password)

                # Assert
                assert result is not None
                assert result.username == username

    async def test_authenticate_user_invalid_password(self, auth_service, mock_user):
        """测试认证用户时密码错误"""
        # Arrange
        username = "testuser"
        password = "wrongpassword"

        with patch.object(auth_service, 'get_user_by_username', return_value=mock_user):
            with patch.object(auth_service, '_verify_password', return_value=False):
                # Act
                result = await auth_service.authenticate_user(username, password)

                # Assert
                assert result is None

    async def test_authenticate_user_not_found(self, auth_service):
        """测试认证用户时用户不存在"""
        # Arrange
        username = "nonexistentuser"
        password = "password123"

        with patch.object(auth_service, 'get_user_by_username', return_value=None):
            # Act
            result = await auth_service.authenticate_user(username, password)

            # Assert
            assert result is None

    async def test_authenticate_user_inactive(self, auth_service, mock_user):
        """测试认证用户时用户已被禁用"""
        # Arrange
        mock_user.is_active = False

        with patch.object(auth_service, 'get_user_by_username', return_value=mock_user):
            with patch.object(auth_service, '_verify_password', return_value=True):
                # Act
                result = await auth_service.authenticate_user("testuser", "password123")

                # Assert
                assert result is None

    def test_create_access_token(self, auth_service):
        """测试创建访问令牌"""
        # Arrange
        token_data = {"sub": "testuser", "user_id": 1}

        # Act
        token = auth_service.create_access_token(token_data)

        # Assert
        assert token is not None
        assert isinstance(token, str)
        # JWT token 应该包含三个部分
        assert len(token.split('.')) == 3

    def test_create_refresh_token(self, auth_service):
        """测试创建刷新令牌"""
        # Arrange
        token_data = {"sub": "testuser", "user_id": 1}

        # Act
        token = auth_service.create_refresh_token(token_data)

        # Assert
        assert token is not None
        assert isinstance(token, str)
        assert len(token.split('.')) == 3

    def test_verify_token_valid(self, auth_service):
        """测试验证有效令牌"""
        # Arrange
        token_data = {"sub": "testuser", "user_id": 1}
        token = auth_service.create_access_token(token_data)

        # Act
        payload = auth_service.verify_token(token)

        # Assert
        assert payload is not None
        assert payload["sub"] == "testuser"
        assert payload["user_id"] == 1

    def test_verify_token_invalid(self, auth_service):
        """测试验证无效令牌"""
        # Arrange
        invalid_token = "invalid.token.here"

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            auth_service.verify_token(invalid_token)

        assert exc_info.value.status_code == 401

    def test_verify_token_expired(self, auth_service):
        """测试验证过期令牌"""
        # Arrange
        token_data = {"sub": "testuser", "user_id": 1, "exp": 0}  # 已过期
        token = auth_service.create_access_token(token_data)

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            auth_service.verify_token(token)

        assert exc_info.value.status_code == 401

    async def test_refresh_access_token_success(self, auth_service, mock_user):
        """测试成功刷新访问令牌"""
        # Arrange
        refresh_token_data = {"sub": "testuser", "user_id": 1}
        refresh_token = auth_service.create_refresh_token(refresh_token_data)

        with patch.object(auth_service, 'get_user_by_username', return_value=mock_user):
            # Act
            result = await auth_service.refresh_access_token(refresh_token)

            # Assert
            assert result is not None
            assert "access_token" in result
            assert "expires_in" in result

    async def test_refresh_access_token_invalid(self, auth_service):
        """测试刷新访问令牌时令牌无效"""
        # Arrange
        invalid_refresh_token = "invalid.token"

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.refresh_access_token(invalid_refresh_token)

        assert exc_info.value.status_code == 401

    async def test_change_password_success(self, auth_service, mock_user):
        """测试成功修改密码"""
        # Arrange
        old_password = "oldpassword"
        new_password = "newpassword123"

        with patch.object(auth_service, 'get_user_by_id', return_value=mock_user):
            with patch.object(auth_service, '_verify_password', return_value=True):
                with patch.object(auth_service, '_hash_password', return_value="new_hashed_password"):
                    mock_db_session.commit = MagicMock()

                    # Act
                    await auth_service.change_password(1, old_password, new_password)

                    # Assert
                    mock_db_session.commit.assert_called_once()

    async def test_change_password_wrong_old_password(self, auth_service, mock_user):
        """测试修改密码时旧密码错误"""
        # Arrange
        old_password = "wrongpassword"
        new_password = "newpassword123"

        with patch.object(auth_service, 'get_user_by_id', return_value=mock_user):
            with patch.object(auth_service, '_verify_password', return_value=False):
                # Act & Assert
                with pytest.raises(HTTPException) as exc_info:
                    await auth_service.change_password(1, old_password, new_password)

                assert exc_info.value.status_code == 400

    def test_hash_password(self, auth_service):
        """测试密码哈希"""
        # Arrange
        password = "testpassword123"

        # Act
        hashed_password = auth_service._hash_password(password)

        # Assert
        assert hashed_password is not None
        assert hashed_password != password
        assert len(hashed_password) == 60  # bcrypt 哈希长度

    def test_verify_password_correct(self, auth_service):
        """测试验证密码正确"""
        # Arrange
        password = "testpassword123"
        hashed_password = auth_service._hash_password(password)

        # Act
        is_valid = auth_service._verify_password(password, hashed_password)

        # Assert
        assert is_valid is True

    def test_verify_password_incorrect(self, auth_service):
        """测试验证密码错误"""
        # Arrange
        password = "correctpassword"
        wrong_password = "wrongpassword"
        hashed_password = auth_service._hash_password(password)

        # Act
        is_valid = auth_service._verify_password(wrong_password, hashed_password)

        # Assert
        assert is_valid is False

    async def test_create_default_admin(self, auth_service):
        """测试创建默认管理员用户"""
        # Arrange
        mock_db_session.execute.return_value.scalar.return_value = None  # 用户不存在
        mock_db_session.add = MagicMock()
        mock_db_session.commit = MagicMock()

        with patch.object(auth_service, 'create_user') as mock_create:
            mock_create.return_value = MagicMock(spec=User)
            mock_create.return_value.username = "admin"
            mock_create.return_value.email = "admin@example.com"

            # Act
            await auth_service.create_default_admin()

            # Assert
            mock_create.assert_called_once_with("admin", "admin@example.com", "admin123456")

    async def test_create_default_admin_exists(self, auth_service):
        """测试创建默认管理员时用户已存在"""
        # Arrange
        existing_user = MagicMock(spec=User)
        existing_user.username = "admin"

        with patch.object(auth_service, 'get_user_by_username', return_value=existing_user):
            # Act
            await auth_service.create_default_admin()

            # Assert - 不应该创建新用户
            pass  # 没有抛出异常即为成功

    def test_token_expiration_time(self):
        """测试令牌过期时间"""
        # Arrange
        auth_service = MagicMock()
        auth_service.ACCESS_TOKEN_EXPIRE_MINUTES = ACCESS_TOKEN_EXPIRE_MINUTES

        # Act & Assert
        assert ACCESS_TOKEN_EXPIRE_MINUTES == 30  # 30分钟过期