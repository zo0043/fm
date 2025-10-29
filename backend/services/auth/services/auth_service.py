"""
认证服务
处理用户注册、登录、权限验证等核心逻辑
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
from passlib.context import CryptContext
from passlib.hash import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
import secrets

from shared.database.models import User
from shared.utils import get_logger

logger = get_logger(__name__)

# JWT配置
SECRET_KEY = secrets.token_urlsafe(32)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """认证服务类"""

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """验证密码"""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        """生成密码哈希"""
        return pwd_context.hash(password)

    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """创建访问令牌"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    @staticmethod
    def create_refresh_token(data: Dict[str, Any]) -> str:
        """创建刷新令牌"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    @staticmethod
    def verify_token(token: str) -> Dict[str, Any]:
        """验证令牌"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="令牌已过期",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的令牌",
                headers={"WWW-Authenticate": "Bearer"},
            )

    async def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """验证用户身份"""
        try:
            result = await self.db.execute(
                select(User).where(User.username == username)
            )
            user = result.scalar_one_or_none()

            if user and self.verify_password(password, user.password_hash):
                return user
            return None
        except Exception as e:
            logger.error(f"用户认证失败: {e}")
            return None

    async def get_user_by_username(self, username: str) -> Optional[User]:
        """根据用户名获取用户"""
        try:
            result = await self.db.execute(
                select(User).where(User.username == username)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"获取用户失败: {e}")
            return None

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """根据邮箱获取用户"""
        try:
            result = await self.db.execute(
                select(User).where(User.email == email)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"获取用户失败: {e}")
            return None

    async def create_user(self, username: str, email: str, password: str) -> User:
        """创建新用户"""
        try:
            # 检查用户名是否已存在
            existing_user = await self.get_user_by_username(username)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="用户名已存在"
                )

            # 检查邮箱是否已存在
            existing_email = await self.get_user_by_email(email)
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="邮箱已被使用"
                )

            # 创建新用户
            hashed_password = self.get_password_hash(password)
            user = User(
                username=username,
                email=email,
                password_hash=hashed_password,
                is_active=True
            )

            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)

            logger.info(f"新用户创建成功: {username}")
            return user

        except HTTPException:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"创建用户失败: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="创建用户失败"
            )

    async def update_user_password(self, user: User, new_password: str) -> bool:
        """更新用户密码"""
        try:
            user.password_hash = self.get_password_hash(new_password)
            user.updated_at = datetime.utcnow()

            await self.db.commit()
            logger.info(f"用户密码更新成功: {user.username}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"更新用户密码失败: {e}")
            return False

    async def update_user_info(self, user: User, **kwargs) -> bool:
        """更新用户信息"""
        try:
            # 允许更新的字段
            updateable_fields = ['email']

            for field, value in kwargs.items():
                if field in updateable_fields and hasattr(user, field):
                    # 检查邮箱是否被其他用户使用
                    if field == 'email':
                        existing_user = await self.get_user_by_email(value)
                        if existing_user and existing_user.id != user.id:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail="邮箱已被其他用户使用"
                            )

                    setattr(user, field, value)

            user.updated_at = datetime.utcnow()
            await self.db.commit()
            logger.info(f"用户信息更新成功: {user.username}")
            return True
        except HTTPException:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"更新用户信息失败: {e}")
            return False

    async def deactivate_user(self, user: User) -> bool:
        """停用用户"""
        try:
            user.is_active = False
            user.updated_at = datetime.utcnow()

            await self.db.commit()
            logger.info(f"用户已停用: {user.username}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"停用用户失败: {e}")
            return False

    async def create_default_admin(self) -> None:
        """创建默认管理员用户"""
        try:
            # 检查是否已存在管理员用户
            admin_username = "admin"
            existing_admin = await self.get_user_by_username(admin_username)

            if existing_admin:
                logger.info("默认管理员用户已存在")
                return

            # 创建默认管理员
            admin_email = "admin@fund-monitor.local"
            admin_password = "admin123456"  # 生产环境中应该使用更安全的密码

            admin_user = await self.create_user(
                username=admin_username,
                email=admin_email,
                password=admin_password
            )

            logger.info(f"默认管理员用户创建成功: {admin_username}")
            logger.warning("请立即修改默认管理员密码以确保安全！")

        except Exception as e:
            logger.error(f"创建默认管理员用户失败: {e}")

    async def refresh_access_token(self, refresh_token: str) -> Dict[str, str]:
        """刷新访问令牌"""
        try:
            payload = self.verify_token(refresh_token)

            # 验证是否为刷新令牌
            if payload.get("type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="无效的刷新令牌"
                )

            username = payload.get("sub")
            if not username:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="令牌中缺少用户信息"
                )

            # 获取用户信息
            user = await self.get_user_by_username(username)
            if not user or not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="用户不存在或已被停用"
                )

            # 生成新的访问令牌
            access_token_data = {"sub": user.username, "user_id": user.id}
            access_token = self.create_access_token(access_token_data)

            return {"access_token": access_token, "token_type": "bearer"}

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"刷新访问令牌失败: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="令牌刷新失败"
            )