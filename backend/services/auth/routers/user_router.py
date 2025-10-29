"""
用户管理路由
处理用户信息管理、密码修改等用户相关操作
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, validator

from shared.database import get_async_db
from shared.utils import get_logger
from .services.auth_service import AuthService
from .routers.auth_router import get_current_user

router = APIRouter()
logger = get_logger(__name__)


# 请求模型
class UpdateUserRequest(BaseModel):
    """更新用户信息请求"""
    email: EmailStr

    @validator('email')
    def validate_email(cls, v):
        if not v:
            raise ValueError('邮箱不能为空')
        return v


class ChangePasswordRequest(BaseModel):
    """修改密码请求"""
    old_password: str
    new_password: str
    confirm_password: str

    @validator('old_password')
    def validate_old_password(cls, v):
        if not v:
            raise ValueError('旧密码不能为空')
        return v

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
class UserResponse(BaseModel):
    """用户信息响应"""
    id: int
    username: str
    email: str
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


@router.get("/profile", response_model=UserResponse, summary="获取用户个人资料")
async def get_user_profile(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    获取当前用户的个人资料

    需要在请求头中提供有效的访问令牌
    """
    return UserResponse(**current_user)


@router.put("/profile", response_model=UserResponse, summary="更新用户个人资料")
async def update_user_profile(
    user_data: UpdateUserRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    更新当前用户的个人资料

    - **email**: 新的邮箱地址

    需要在请求头中提供有效的访问令牌
    """
    try:
        auth_service = AuthService(db)

        # 获取用户对象
        user = await auth_service.get_user_by_username(current_user["username"])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )

        # 更新用户信息
        success = await auth_service.update_user_info(user, email=user_data.email)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="更新用户信息失败"
            )

        # 返回更新后的用户信息
        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            is_active=user.is_active,
            created_at=user.created_at.isoformat()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新用户资料失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新用户资料失败"
        )


@router.post("/change-password", summary="修改用户密码")
async def change_user_password(
    password_data: ChangePasswordRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    修改当前用户的密码

    - **old_password**: 旧密码
    - **new_password**: 新密码，至少6个字符
    - **confirm_password**: 确认新密码，必须与新密码一致

    需要在请求头中提供有效的访问令牌
    """
    try:
        auth_service = AuthService(db)

        # 获取用户对象
        user = await auth_service.get_user_by_username(current_user["username"])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )

        # 验证旧密码
        if not auth_service.verify_password(password_data.old_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="旧密码错误"
            )

        # 更新密码
        success = await auth_service.update_user_password(user, password_data.new_password)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="密码修改失败"
            )

        return {"message": "密码修改成功"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"修改用户密码失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="密码修改失败"
        )


@router.post("/deactivate", summary="停用用户账户")
async def deactivate_user_account(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    停用当前用户的账户

    注意：停用后用户将无法登录，如需重新启用请联系管理员

    需要在请求头中提供有效的访问令牌
    """
    try:
        auth_service = AuthService(db)

        # 获取用户对象
        user = await auth_service.get_user_by_username(current_user["username"])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )

        # 停用用户
        success = await auth_service.deactivate_user(user)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="账户停用失败"
            )

        return {"message": "账户已成功停用"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"停用用户账户失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="账户停用失败"
        )