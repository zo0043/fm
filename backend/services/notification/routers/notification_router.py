"""
通知管理路由
处理通知配置、消息模板、通知记录等管理功能
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, validator
from datetime import datetime

from shared.database import get_async_db
from shared.database.models import NotificationConfig, NotificationLog, MonitorResult
from shared.utils import get_logger
from ..services.notification_manager import NotificationManager

router = APIRouter()
logger = get_logger(__name__)


# 请求模型
class NotificationConfigRequest(BaseModel):
    """通知配置请求"""
    config_name: str
    channel_type: str
    config_data: Dict[str, Any]

    @validator('config_name')
    def validate_config_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('配置名称不能为空')
        if len(v) > 100:
            raise ValueError('配置名称不能超过100个字符')
        return v.strip()

    @validator('channel_type')
    def validate_channel_type(cls, v):
        valid_types = ['email', 'wechat', 'webhook', 'sms']
        if v not in valid_types:
            raise ValueError(f'通知渠道类型必须是: {", ".join(valid_types)}')
        return v

    @validator('config_data')
    def validate_config_data(cls, v):
        if not isinstance(v, dict):
            raise ValueError('配置数据必须是字典格式')
        return v


class SendNotificationRequest(BaseModel):
    """发送通知请求"""
    channel_type: str
    recipient: str
    subject: Optional[str] = None
    content: str
    config_id: Optional[int] = None

    @validator('channel_type')
    def validate_channel_type(cls, v):
        valid_types = ['email', 'wechat', 'webhook', 'sms']
        if v not in valid_types:
            raise ValueError(f'通知渠道类型必须是: {", ".join(valid_types)}')
        return v

    @validator('recipient')
    def validate_recipient(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('接收者不能为空')
        return v.strip()

    @validator('content')
    def validate_content(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('通知内容不能为空')
        return v.strip()


class TestNotificationRequest(BaseModel):
    """测试通知配置请求"""
    config_id: int
    test_message: str = "这是一条测试消息"

    @validator('test_message')
    def validate_test_message(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('测试消息不能为空')
        return v.strip()


# 响应模型
class NotificationConfigResponse(BaseModel):
    """通知配置响应"""
    id: int
    config_name: str
    channel_type: str
    config_data: Dict[str, Any]
    is_active: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class NotificationLogResponse(BaseModel):
    """通知记录响应"""
    id: int
    monitor_result_id: Optional[int]
    channel_type: str
    recipient: str
    message_content: Optional[str]
    send_status: str
    error_message: Optional[str]
    sent_at: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


@router.get("/configs", response_model=Dict[str, Any], summary="获取通知配置列表")
async def get_notification_configs(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    channel_type: Optional[str] = Query(None, description="通知渠道类型"),
    is_active: Optional[bool] = Query(None, description="是否启用"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    获取通知配置列表，支持分页和筛选
    """
    try:
        # 构建查询
        query = select(NotificationConfig)
        count_query = select(func.count(NotificationConfig.id))

        # 添加筛选条件
        if channel_type:
            query = query.where(NotificationConfig.channel_type == channel_type)
            count_query = count_query.where(NotificationConfig.channel_type == channel_type)

        if is_active is not None:
            query = query.where(NotificationConfig.is_active == is_active)
            count_query = count_query.where(NotificationConfig.is_active == is_active)

        # 获取总数
        total_count = await db.scalar(count_query)

        # 分页查询
        offset = (page - 1) * size
        query = query.offset(offset).limit(size).order_by(NotificationConfig.created_at.desc())

        result = await db.execute(query)
        configs = result.scalars().all()

        # 转换为字典
        config_list = []
        for config in configs:
            config_dict = {
                "id": config.id,
                "config_name": config.config_name,
                "channel_type": config.channel_type,
                "config_data": config.config_data,
                "is_active": config.is_active,
                "created_at": config.created_at.isoformat(),
                "updated_at": config.updated_at.isoformat(),
            }
            config_list.append(config_dict)

        return {
            "data": config_list,
            "pagination": {
                "page": page,
                "size": size,
                "total": total_count,
                "pages": (total_count + size - 1) // size
            }
        }

    except Exception as e:
        logger.error(f"获取通知配置列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/configs", response_model=NotificationConfigResponse, summary="创建通知配置")
async def create_notification_config(
    config_data: NotificationConfigRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    创建新的通知配置

    - **config_name**: 配置名称
    - **channel_type**: 通知渠道类型 (email, wechat, webhook, sms)
    - **config_data**: 配置数据 (JSON格式)
    """
    try:
        # 检查配置名称是否已存在
        existing_query = select(NotificationConfig).where(NotificationConfig.config_name == config_data.config_name)
        existing_result = await db.execute(existing_query)
        existing_config = existing_result.scalar_one_or_none()

        if existing_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="配置名称已存在"
            )

        # 创建新配置
        new_config = NotificationConfig(
            config_name=config_data.config_name,
            channel_type=config_data.channel_type,
            config_data=config_data.config_data,
            is_active=True
        )

        db.add(new_config)
        await db.commit()
        await db.refresh(new_config)

        logger.info(f"通知配置创建成功: {new_config.config_name}")

        return NotificationConfigResponse(
            id=new_config.id,
            config_name=new_config.config_name,
            channel_type=new_config.channel_type,
            config_data=new_config.config_data,
            is_active=new_config.is_active,
            created_at=new_config.created_at.isoformat(),
            updated_at=new_config.updated_at.isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"创建通知配置失败: {e}")
        raise HTTPException(status_code=500, detail="创建通知配置失败")


@router.get("/configs/{config_id}", response_model=NotificationConfigResponse, summary="获取通知配置详情")
async def get_notification_config(
    config_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """获取指定通知配置的详细信息"""
    try:
        config = await db.get(NotificationConfig, config_id)
        if not config:
            raise HTTPException(status_code=404, detail="通知配置不存在")

        return NotificationConfigResponse(
            id=config.id,
            config_name=config.config_name,
            channel_type=config.channel_type,
            config_data=config.config_data,
            is_active=config.is_active,
            created_at=config.created_at.isoformat(),
            updated_at=config.updated_at.isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取通知配置详情失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/configs/{config_id}", response_model=NotificationConfigResponse, summary="更新通知配置")
async def update_notification_config(
    config_id: int,
    config_data: NotificationConfigRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    更新指定的通知配置

    - **config_name**: 配置名称
    - **channel_type**: 通知渠道类型
    - **config_data**: 配置数据
    """
    try:
        config = await db.get(NotificationConfig, config_id)
        if not config:
            raise HTTPException(status_code=404, detail="通知配置不存在")

        # 检查配置名称是否与其他配置重复
        existing_query = select(NotificationConfig).where(
            NotificationConfig.config_name == config_data.config_name,
            NotificationConfig.id != config_id
        )
        existing_result = await db.execute(existing_query)
        existing_config = existing_result.scalar_one_or_none()

        if existing_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="配置名称已被其他配置使用"
            )

        # 更新配置
        config.config_name = config_data.config_name
        config.channel_type = config_data.channel_type
        config.config_data = config_data.config_data
        config.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(config)

        logger.info(f"通知配置更新成功: {config.config_name}")

        return NotificationConfigResponse(
            id=config.id,
            config_name=config.config_name,
            channel_type=config.channel_type,
            config_data=config.config_data,
            is_active=config.is_active,
            created_at=config.created_at.isoformat(),
            updated_at=config.updated_at.isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"更新通知配置失败: {e}")
        raise HTTPException(status_code=500, detail="更新通知配置失败")


@router.delete("/configs/{config_id}", summary="删除通知配置")
async def delete_notification_config(
    config_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """删除指定的通知配置"""
    try:
        config = await db.get(NotificationConfig, config_id)
        if not config:
            raise HTTPException(status_code=404, detail="通知配置不存在")

        await db.delete(config)
        await db.commit()

        logger.info(f"通知配置删除成功: {config.config_name}")
        return {"message": "通知配置删除成功"}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"删除通知配置失败: {e}")
        raise HTTPException(status_code=500, detail="删除通知配置失败")


@router.post("/configs/{config_id}/toggle", summary="切换通知配置状态")
async def toggle_notification_config(
    config_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """切换通知配置的启用/禁用状态"""
    try:
        config = await db.get(NotificationConfig, config_id)
        if not config:
            raise HTTPException(status_code=404, detail="通知配置不存在")

        config.is_active = not config.is_active
        config.updated_at = datetime.utcnow()

        await db.commit()

        status_text = "启用" if config.is_active else "禁用"
        logger.info(f"通知配置状态切换成功: {config.config_name} -> {status_text}")

        return {
            "message": f"通知配置已{status_text}",
            "is_active": config.is_active
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"切换通知配置状态失败: {e}")
        raise HTTPException(status_code=500, detail="切换配置状态失败")


@router.post("/configs/{config_id}/test", summary="测试通知配置")
async def test_notification_config(
    config_id: int,
    test_data: TestNotificationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db)
):
    """
    测试指定的通知配置

    - **test_message**: 测试消息内容
    """
    try:
        config = await db.get(NotificationConfig, config_id)
        if not config:
            raise HTTPException(status_code=404, detail="通知配置不存在")

        if not config.is_active:
            raise HTTPException(status_code=400, detail="通知配置未启用")

        # 异步发送测试通知
        background_tasks.add_task(
            _send_test_notification,
            config=config,
            test_message=test_data.test_message
        )

        return {"message": "测试通知已发送"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"测试通知配置失败: {e}")
        raise HTTPException(status_code=500, detail="测试通知配置失败")


@router.post("/send", summary="发送通知")
async def send_notification(
    notification_data: SendNotificationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db)
):
    """
    直接发送通知

    - **channel_type**: 通知渠道类型
    - **recipient**: 接收者
    - **subject**: 主题 (可选)
    - **content**: 通知内容
    - **config_id**: 配置ID (可选)
    """
    try:
        # 获取通知配置
        config = None
        if notification_data.config_id:
            config = await db.get(NotificationConfig, notification_data.config_id)
            if not config:
                raise HTTPException(status_code=404, detail="通知配置不存在")
            if not config.is_active:
                raise HTTPException(status_code=400, detail="通知配置未启用")

        # 异步发送通知
        background_tasks.add_task(
            _send_notification,
            channel_type=notification_data.channel_type,
            recipient=notification_data.recipient,
            subject=notification_data.subject,
            content=notification_data.content,
            config=config
        )

        return {"message": "通知发送中"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"发送通知失败: {e}")
        raise HTTPException(status_code=500, detail="发送通知失败")


@router.get("/logs", response_model=Dict[str, Any], summary="获取通知记录列表")
async def get_notification_logs(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    channel_type: Optional[str] = Query(None, description="通知渠道类型"),
    send_status: Optional[str] = Query(None, description="发送状态"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    获取通知记录列表，支持分页和筛选
    """
    try:
        # 构建查询
        query = select(NotificationLog)
        count_query = select(func.count(NotificationLog.id))

        # 添加筛选条件
        if channel_type:
            query = query.where(NotificationLog.channel_type == channel_type)
            count_query = count_query.where(NotificationLog.channel_type == channel_type)

        if send_status:
            query = query.where(NotificationLog.send_status == send_status)
            count_query = count_query.where(NotificationLog.send_status == send_status)

        # 获取总数
        total_count = await db.scalar(count_query)

        # 分页查询
        offset = (page - 1) * size
        query = query.offset(offset).limit(size).order_by(NotificationLog.created_at.desc())

        result = await db.execute(query)
        logs = result.scalars().all()

        # 转换为字典
        log_list = []
        for log in logs:
            log_dict = {
                "id": log.id,
                "monitor_result_id": log.monitor_result_id,
                "channel_type": log.channel_type,
                "recipient": log.recipient,
                "message_content": log.message_content,
                "send_status": log.send_status,
                "error_message": log.error_message,
                "sent_at": log.sent_at.isoformat() if log.sent_at else None,
                "created_at": log.created_at.isoformat(),
            }
            log_list.append(log_dict)

        return {
            "data": log_list,
            "pagination": {
                "page": page,
                "size": size,
                "total": total_count,
                "pages": (total_count + size - 1) // size
            }
        }

    except Exception as e:
        logger.error(f"获取通知记录列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _send_test_notification(config: NotificationConfig, test_message: str):
    """发送测试通知的后台任务"""
    try:
        notification_manager = NotificationManager()

        # 根据配置类型获取测试接收者
        test_recipient = _get_test_recipient(config.channel_type, config.config_data)

        success = await notification_manager.send_notification(
            channel_type=config.channel_type,
            recipient=test_recipient,
            subject="测试通知",
            content=test_message,
            config_data=config.config_data
        )

        if success:
            logger.info(f"测试通知发送成功: {config.config_name}")
        else:
            logger.error(f"测试通知发送失败: {config.config_name}")

    except Exception as e:
        logger.error(f"发送测试通知失败: {e}")


async def _send_notification(
    channel_type: str,
    recipient: str,
    subject: Optional[str],
    content: str,
    config: Optional[NotificationConfig] = None
):
    """发送通知的后台任务"""
    try:
        notification_manager = NotificationManager()

        config_data = config.config_data if config else None

        success = await notification_manager.send_notification(
            channel_type=channel_type,
            recipient=recipient,
            subject=subject,
            content=content,
            config_data=config_data
        )

        if success:
            logger.info(f"通知发送成功: {channel_type} -> {recipient}")
        else:
            logger.error(f"通知发送失败: {channel_type} -> {recipient}")

    except Exception as e:
        logger.error(f"发送通知失败: {e}")


def _get_test_recipient(channel_type: str, config_data: Dict[str, Any]) -> str:
    """根据渠道类型获取测试接收者"""
    if channel_type == "email":
        return config_data.get("smtp_username", "test@example.com")
    elif channel_type == "wechat":
        return config_data.get("webhook_url", "test_webhook")
    elif channel_type == "webhook":
        return config_data.get("url", "test_webhook")
    elif channel_type == "sms":
        return config_data.get("test_phone", "13800138000")
    else:
        return "test_recipient"