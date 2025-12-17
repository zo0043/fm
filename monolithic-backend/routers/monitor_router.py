from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from database import get_async_db, MonitorRule, MonitorRuleItem, NavRecord, Fund
from config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/rules")
async def get_monitor_rules(
    skip: int = 0, 
    limit: int = 100,
    db: AsyncSession = Depends(get_async_db),

):
    """获取用户的监控规则列表"""
    try:
        query = select(MonitorRule).where(
            current_user["user_id"]
        ).offset(skip).limit(limit)
        
        result = await db.execute(query)
        rules = result.scalars().all()
        
        return {
            "rules": [
                {
                    "id": rule.id,
                    "name": rule.name,
                    "description": rule.description,
                    "is_active": rule.is_active,
                    "alert_threshold": rule.alert_threshold,
                    "created_at": rule.created_at.isoformat(),
                    "updated_at": rule.updated_at.isoformat() if rule.updated_at else None
                }
                for rule in rules
            ],
            "total": len(rules)
        }
    except Exception as e:
        logger.error(f"获取监控规则失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取监控规则失败: {str(e)}")

@router.post("/rules")
async def create_monitor_rule(
    rule_data: Dict[str, Any],
    db: AsyncSession = Depends(get_async_db),

):
    """创建新的监控规则"""
    try:
        # 检查用户是否超过最大规则数
        count_query = select(MonitorRule).where(
            current_user["user_id"]
        )
        count_result = await db.execute(count_query)
        existing_rules = count_result.scalars().all()
        
        if len(existing_rules) >= settings.MONITOR_MAX_RULES_PER_USER:
            raise HTTPException(
                status_code=400, 
                detail=f"每个用户最多只能创建 {settings.MONITOR_MAX_RULES_PER_USER} 个监控规则"
            )
        
        # 创建监控规则
        monitor_rule = MonitorRule(
            user_id=current_user["user_id"],
            name=rule_data["name"],
            description=rule_data.get("description", ""),
            is_active=rule_data.get("is_active", True),
            alert_threshold=rule_data.get("alert_threshold", 0.05)
        )
        
        db.add(monitor_rule)
        await db.commit()
        await db.refresh(monitor_rule)
        
        # 添加监控基金
        fund_codes = rule_data.get("fund_codes", [])
        for fund_code in fund_codes:
            # 检查基金是否存在
            fund_query = select(Fund).where(Fund.code == fund_code)
            fund_result = await db.execute(fund_query)
            fund = fund_result.scalar_one_or_none()
            
            if fund:
                rule_item = MonitorRuleItem(
                    monitor_rule_id=monitor_rule.id,
                    fund_id=fund.id
                )
                db.add(rule_item)
        
        await db.commit()
        
        return {
            "message": "监控规则创建成功",
            "rule_id": monitor_rule.id
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"创建监控规则失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"创建监控规则失败: {str(e)}")

@router.get("/rules/{rule_id}")
async def get_monitor_rule_detail(
    rule_id: int,
    db: AsyncSession = Depends(get_async_db),

):
    """获取监控规则详情"""
    try:
        # 查询监控规则
        rule_query = select(MonitorRule).where(
            and_(
                MonitorRule.id == rule_id,
                current_user["user_id"]
            )
        )
        rule_result = await db.execute(rule_query)
        rule = rule_result.scalar_one_or_none()
        
        if not rule:
            raise HTTPException(status_code=404, detail="监控规则不存在")
        
        # 查询监控的基金
        items_query = select(MonitorRuleItem, Fund).join(
            Fund, MonitorRuleItem.fund_id == Fund.id
        ).where(MonitorRuleItem.monitor_rule_id == rule_id)
        
        items_result = await db.execute(items_query)
        items = items_result.all()
        
        fund_codes = []
        for item, fund in items:
            fund_codes.append({
                "code": fund.code,
                "name": fund.name,
                "type": fund.type
            })
        
        return {
            "id": rule.id,
            "name": rule.name,
            "description": rule.description,
            "is_active": rule.is_active,
            "alert_threshold": rule.alert_threshold,
            "fund_codes": fund_codes,
            "created_at": rule.created_at.isoformat(),
            "updated_at": rule.updated_at.isoformat() if rule.updated_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取监控规则详情失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取监控规则详情失败: {str(e)}")

@router.put("/rules/{rule_id}")
async def update_monitor_rule(
    rule_id: int,
    rule_data: Dict[str, Any],
    db: AsyncSession = Depends(get_async_db),

):
    """更新监控规则"""
    try:
        # 查询监控规则
        rule_query = select(MonitorRule).where(
            and_(
                MonitorRule.id == rule_id,
                current_user["user_id"]
            )
        )
        rule_result = await db.execute(rule_query)
        rule = rule_result.scalar_one_or_none()
        
        if not rule:
            raise HTTPException(status_code=404, detail="监控规则不存在")
        
        # 更新规则基本信息
        if "name" in rule_data:
            rule.name = rule_data["name"]
        if "description" in rule_data:
            rule.description = rule_data["description"]
        if "is_active" in rule_data:
            rule.is_active = rule_data["is_active"]
        if "alert_threshold" in rule_data:
            rule.alert_threshold = rule_data["alert_threshold"]
        
        rule.updated_at = datetime.utcnow()
        
        # 更新监控基金列表
        if "fund_codes" in rule_data:
            # 删除旧的监控基金
            delete_query = delete(MonitorRuleItem).where(
                MonitorRuleItem.monitor_rule_id == rule_id
            )
            await db.execute(delete_query)
            
            # 添加新的监控基金
            fund_codes = rule_data["fund_codes"]
            for fund_code in fund_codes:
                fund_query = select(Fund).where(Fund.code == fund_code)
                fund_result = await db.execute(fund_query)
                fund = fund_result.scalar_one_or_none()
                
                if fund:
                    rule_item = MonitorRuleItem(
                        monitor_rule_id=rule_id,
                        fund_id=fund.id
                    )
                    db.add(rule_item)
        
        await db.commit()
        
        return {"message": "监控规则更新成功"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"更新监控规则失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"更新监控规则失败: {str(e)}")

@router.delete("/rules/{rule_id}")
async def delete_monitor_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_async_db),

):
    """删除监控规则"""
    try:
        # 查询监控规则
        rule_query = select(MonitorRule).where(
            and_(
                MonitorRule.id == rule_id,
                current_user["user_id"]
            )
        )
        rule_result = await db.execute(rule_query)
        rule = rule_result.scalar_one_or_none()
        
        if not rule:
            raise HTTPException(status_code=404, detail="监控规则不存在")
        
        # 删除监控规则（级联删除监控基金）
        await db.delete(rule)
        await db.commit()
        
        return {"message": "监控规则删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"删除监控规则失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"删除监控规则失败: {str(e)}")

@router.post("/rules/{rule_id}/toggle")
async def toggle_monitor_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_async_db),

):
    """切换监控规则启用/禁用状态"""
    try:
        # 查询监控规则
        rule_query = select(MonitorRule).where(
            and_(
                MonitorRule.id == rule_id,
                current_user["user_id"]
            )
        )
        rule_result = await db.execute(rule_query)
        rule = rule_result.scalar_one_or_none()
        
        if not rule:
            raise HTTPException(status_code=404, detail="监控规则不存在")
        
        # 切换状态
        rule.is_active = not rule.is_active
        rule.updated_at = datetime.utcnow()
        
        await db.commit()
        
        status = "启用" if rule.is_active else "禁用"
        return {"message": f"监控规则已{status}"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"切换监控规则状态失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"切换监控规则状态失败: {str(e)}")

@router.get("/alerts")
async def get_monitor_alerts(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_async_db),

):
    """获取监控告警历史"""
    try:
        # 这里可以扩展为包含告警记录表，目前返回空列表
        return {
            "alerts": [],
            "total": 0,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"获取监控告警失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取监控告警失败: {str(e)}")

@router.post("/check")
async def check_monitor_rules(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db),

):
    """手动触发监控规则检查"""
    try:
        # 添加后台任务检查监控规则
        background_tasks.add_task(
            monitor_engine.check_all_rules,
            current_user["user_id"],
            db
        )
        
        return {"message": "监控规则检查任务已启动"}
    except Exception as e:
        logger.error(f"启动监控检查失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"启动监控检查失败: {str(e)}")

