"""
认证路由
处理用户登录、注册、令牌刷新等认证相关请求
"""

from datetime import timedelta
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, validator
import re

from shared.database import get_async_db
from shared.utils import get_logger
from .services.auth_service import AuthService, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()
logger = get_logger(__name__)


# 请求模型
class UserRegisterRequest(BaseModel):
    """用户注册请求"""
    username: str
    email: EmailStr
    password: str
    confirm_password: str

    @validator('username')
    def validate_username(cls, v):
        if not v or len(v) < 3:
            raise ValueError('用户名至少需要3个字符')
        if len(v) > 50:
            raise ValueError('用户名不能超过50个字符')
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('用户名只能包含字母、数字和下划线')
        return v

    @validator('password')
    def validate_password(cls, v):
        if not v or len(v) < 6:
            raise ValueError('密码至少需要6个字符')
        if len(v) > 100:
            raise ValueError('密码不能超过100个字符')
        return v

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('两次输入的密码不一致')
        return v


class UserLoginRequest(BaseModel):
    """用户登录请求"""
    username: str
    password: str

    @validator('username')
    def validate_username(cls, v):
        if not v:
            raise ValueError('用户名不能为空')
        return v

    @validator('password')
    def validate_password(cls, v):
        if not v:
            raise ValueError('密码不能为空')
        return v


class RefreshTokenRequest(BaseModel):
    """刷新令牌请求"""
    refresh_token: str

    @validator('refresh_token')
    def validate_refresh_token(cls, v):
        if not v:
            raise ValueError('刷新令牌不能为空')
        return v


class ChangePasswordRequest(BaseModel):
    """修改密码请求"""
    old_password: str
    new_password: str
    confirm_password: str

    @validator('new_password')
    def validate_new_password(cls, v):
        if not v or len(v) < 6:
            raise ValueError('新密码至少需要6个字符')
        return v

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('两次输入的新密码不一致')
        return v


# 响应模型
class TokenResponse(BaseModel):
    """令牌响应"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

    class Config:
        schema_extra = {
            "example": {
                "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
                "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
                "token_type": "bearer",
                "expires_in": 1800
            }
        }


class UserResponse(BaseModel):
    """用户信息响应"""
    id: int
    username: str
    email: str
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """认证响应"""
    user: UserResponse
    token: TokenResponse


@router.post("/register", response_model=AuthResponse, summary="用户注册")
async def register(
    user_data: UserRegisterRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    用户注册接口

    - **username**: 用户名，3-50个字符，只能包含字母、数字和下划线
    - **email**: 邮箱地址
    - **password**: 密码，至少6个字符
    - **confirm_password**: 确认密码，必须与密码一致
    """
    try:
        auth_service = AuthService(db)

        # 创建用户
        user = await auth_service.create_user(
            username=user_data.username,
            email=user_data.email,
            password=user_data.password
        )

        # 生成令牌
        token_data = {"sub": user.username, "user_id": user.id}
        access_token = auth_service.create_access_token(token_data)
        refresh_token = auth_service.create_refresh_token(token_data)

        # 构建响应
        user_response = UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            is_active=user.is_active,
            created_at=user.created_at.isoformat()
        )

        token_response = TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

        return AuthResponse(user=user_response, token=token_response)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"用户注册失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="注册失败，请稍后重试"
        )


@router.post("/login", response_model=AuthResponse, summary="用户登录")
async def login(
    login_data: UserLoginRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    用户登录接口

    - **username**: 用户名
    - **password**: 密码

    返回访问令牌和用户信息
    """
    try:
        auth_service = AuthService(db)

        # 验证用户身份
        user = await auth_service.authenticate_user(
            username=login_data.username,
            password=login_data.password
        )

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户名或密码错误"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户已被停用"
            )

        # 生成令牌
        token_data = {"sub": user.username, "user_id": user.id}
        access_token = auth_service.create_access_token(token_data)
        refresh_token = auth_service.create_refresh_token(token_data)

        # 构建响应
        user_response = UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            is_active=user.is_active,
            created_at=user.created_at.isoformat()
        )

        token_response = TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

        return AuthResponse(user=user_response, token=token_response)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"用户登录失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="登录失败，请稍后重试"
        )


@router.post("/refresh", response_model=Dict[str, str], summary="刷新访问令牌")
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    使用刷新令牌获取新的访问令牌

    - **refresh_token**: 刷新令牌

    返回新的访问令牌
    """
    try:
        auth_service = AuthService(db)
        result = await auth_service.refresh_access_token(refresh_data.refresh_token)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"刷新令牌失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="令牌刷新失败"
        )


@router.post("/logout", summary="用户登出")
async def logout():
    """
    用户登出接口

    实际项目中可能需要将令牌加入黑名单
    """
    return {"message": "登出成功"}


@router.get("/me", response_model=UserResponse, summary="获取当前用户信息")
async def get_current_user_info(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    获取当前登录用户的信息

    需要在请求头中提供有效的访问令牌
    """
    return UserResponse(**current_user)


# 依赖注入函数
async def get_current_user(
    credentials: str = Depends(HTTPBearer()),
    db: AsyncSession = Depends(get_async_db)
) -> Dict[str, Any]:
    """获取当前用户信息"""
    try:
        auth_service = AuthService(db)
        payload = auth_service.verify_token(credentials.credentials)

        username = payload.get("sub")
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="令牌中缺少用户信息"
            )

        user = await auth_service.get_user_by_username(username)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户不存在或已被停用"
            )

        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取当前用户信息失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户认证失败"
        )