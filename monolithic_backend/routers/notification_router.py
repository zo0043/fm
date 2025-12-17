from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from .database import get_async_db, NotificationSettings, NotificationLog
from config import settings


router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/settings")
async def get_notification_settings(
    db: AsyncSession = Depends(get_async_db),

):
    """获取用户的通知设置"""
    try:
        query = select(NotificationSettings).where(
            
        )
        
        result = await db.execute(query)
        settings_obj = result.scalar_one_or_none()
        
        if not settings_obj:
            # 如果没有设置，创建默认设置
            settings_obj = NotificationSettings(
                user_id=current_user["user_id"],
                email_enabled=settings.NOTIFICATION_EMAIL_ENABLED,
                email_address="",
                wechat_enabled=settings.NOTIFICATION_WECHAT_ENABLED,
                wechat_webhook=settings.NOTIFICATION_WECHAT_WEBHOOK,
                sms_enabled=False,
                push_enabled=True,
                monitor_alerts_enabled=True,
                price_change_alerts_enabled=True,
                news_alerts_enabled=False
            )
            
            db.add(settings_obj)
            await db.commit()
            await db.refresh(settings_obj)
        
        return {
            "email_enabled": settings_obj.email_enabled,
            "email_address": settings_obj.email_address,
            "wechat_enabled": settings_obj.wechat_enabled,
            "wechat_webhook": settings_obj.wechat_webhook,
            "sms_enabled": settings_obj.sms_enabled,
            "push_enabled": settings_obj.push_enabled,
            "monitor_alerts_enabled": settings_obj.monitor_alerts_enabled,
            "price_change_alerts_enabled": settings_obj.price_change_alerts_enabled,
            "news_alerts_enabled": settings_obj.news_alerts_enabled
        }
    except Exception as e:
        logger.error(f"获取通知设置失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取通知设置失败: {str(e)}")

@router.put("/settings")
async def update_notification_settings(
    settings_data: Dict[str, Any],
    db: AsyncSession = Depends(get_async_db),

):
    """更新用户的通知设置"""
    try:
        # 查询现有设置
        query = select(NotificationSettings).where(
            
        )
        
        result = await db.execute(query)
        notification_settings = result.scalar_one_or_none()
        
        if not notification_settings:
            # 如果没有设置，创建新设置
            notification_settings = NotificationSettings(
                user_id=current_user["user_id"],
                email_enabled=settings_data.get("email_enabled", settings.NOTIFICATION_EMAIL_ENABLED),
                email_address=settings_data.get("email_address", ""),
                wechat_enabled=settings_data.get("wechat_enabled", settings.NOTIFICATION_WECHAT_ENABLED),
                wechat_webhook=settings_data.get("wechat_webhook", settings.NOTIFICATION_WECHAT_WEBHOOK),
                sms_enabled=settings_data.get("sms_enabled", False),
                push_enabled=settings_data.get("push_enabled", True),
                monitor_alerts_enabled=settings_data.get("monitor_alerts_enabled", True),
                price_change_alerts_enabled=settings_data.get("price_change_alerts_enabled", True),
                news_alerts_enabled=settings_data.get("news_alerts_enabled", False)
            )
            
            db.add(notification_settings)
        else:
            # 更新现有设置
            if "email_enabled" in settings_data:
                notification_settings.email_enabled = settings_data["email_enabled"]
            if "email_address" in settings_data:
                notification_settings.email_address = settings_data["email_address"]
            if "wechat_enabled" in settings_data:
                notification_settings.wechat_enabled = settings_data["wechat_enabled"]
            if "wechat_webhook" in settings_data:
                notification_settings.wechat_webhook = settings_data["wechat_webhook"]
            if "sms_enabled" in settings_data:
                notification_settings.sms_enabled = settings_data["sms_enabled"]
            if "push_enabled" in settings_data:
                notification_settings.push_enabled = settings_data["push_enabled"]
            if "monitor_alerts_enabled" in settings_data:
                notification_settings.monitor_alerts_enabled = settings_data["monitor_alerts_enabled"]
            if "price_change_alerts_enabled" in settings_data:
                notification_settings.price_change_alerts_enabled = settings_data["price_change_alerts_enabled"]
            if "news_alerts_enabled" in settings_data:
                notification_settings.news_alerts_enabled = settings_data["news_alerts_enabled"]
            
            notification_settings.updated_at = datetime.utcnow()
        
        await db.commit()
        
        return {"message": "通知设置更新成功"}
    except Exception as e:
        await db.rollback()
        logger.error(f"更新通知设置失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"更新通知设置失败: {str(e)}")

@router.post("/test")
async def send_test_notification(
    notification_type: str,
    db: AsyncSession = Depends(get_async_db),

):
    """发送测试通知"""
    try:
        # 获取用户通知设置
        settings_query = select(NotificationSettings).where(
            
        )
        settings_result = await db.execute(settings_query)
        user_settings = settings_result.scalar_one_or_none()
        
        if not user_settings:
            raise HTTPException(status_code=400, detail="请先配置通知设置")
        
        success_count = 0
        failed_count = 0
        
        # 发送邮件通知
        if notification_type == "email" and user_settings.email_enabled and user_settings.email_address:
            try:
                await send_email_notification(
                    user_settings.email_address,
                    "基金监控系统 - 测试通知",
                    "这是一条测试通知，您的邮件通知配置正确。"
                )
                success_count += 1
            except Exception as e:
                logger.error(f"发送测试邮件失败: {str(e)}")
                failed_count += 1
        
        # 发送微信通知
        if notification_type == "wechat" and user_settings.wechat_enabled and user_settings.wechat_webhook:
            try:
                await send_wechat_notification(
                    user_settings.wechat_webhook,
                    "基金监控系统测试通知",
                    "这是一条测试通知，您的微信通知配置正确。"
                )
                success_count += 1
            except Exception as e:
                logger.error(f"发送测试微信通知失败: {str(e)}")
                failed_count += 1
        
        # 记录通知日志
        log_entry = NotificationLog(
            user_id=current_user["user_id"],
            notification_type=notification_type,
            title="测试通知",
            content="这是一条测试通知",
            status="success" if success_count > 0 else "failed",
            sent_at=datetime.utcnow()
        )
        db.add(log_entry)
        await db.commit()
        
        return {
            "message": "测试通知发送完成",
            "success_count": success_count,
            "failed_count": failed_count
        }
    except Exception as e:
        logger.error(f"发送测试通知失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"发送测试通知失败: {str(e)}")

@router.get("/history")
async def get_notification_history(
    skip: int = 0,
    limit: int = 50,
    notification_type: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db),

):
    """获取通知历史"""
    try:
        query = select(NotificationLog).where(
            NotificationLog.user_id == current_user["user_id"]
        )
        
        if notification_type:
            query = query.where(NotificationLog.notification_type == notification_type)
        
        query = query.order_by(NotificationLog.sent_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        logs = result.scalars().all()
        
        return {
            "logs": [
                {
                    "id": log.id,
                    "notification_type": log.notification_type,
                    "title": log.title,
                    "content": log.content,
                    "status": log.status,
                    "sent_at": log.sent_at.isoformat(),
                    "error_message": log.error_message
                }
                for log in logs
            ],
            "total": len(logs)
        }
    except Exception as e:
        logger.error(f"获取通知历史失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取通知历史失败: {str(e)}")

@router.delete("/history/{log_id}")
async def delete_notification_log(
    log_id: int,
    db: AsyncSession = Depends(get_async_db),

):
    """删除通知日志"""
    try:
        query = select(NotificationLog).where(
            and_(
                NotificationLog.id == log_id,
                NotificationLog.user_id == current_user["user_id"]
            )
        )
        
        result = await db.execute(query)
        log = result.scalar_one_or_none()
        
        if not log:
            raise HTTPException(status_code=404, detail="通知日志不存在")
        
        await db.delete(log)
        await db.commit()
        
        return {"message": "通知日志删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"删除通知日志失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"删除通知日志失败: {str(e)}")

# 辅助函数
async def send_email_notification(email_address: str, title: str, content: str):
    """发送邮件通知"""
    # 这里实现邮件发送逻辑
    # 可以使用 smtplib 或者第三方服务如 SendGrid, AWS SES 等
    logger.info(f"发送邮件通知到 {email_address}: {title}")

async def send_wechat_notification(webhook_url: str, title: str, content: str):
    """发送微信通知"""
    # 这里实现微信通知逻辑
    # 通常使用企业微信机器人的 webhook
    logger.info(f"发送微信通知到 {webhook_url}: {title}")

# 依赖注入函数
