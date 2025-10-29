"""
监控规则路由
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from shared.database import get_async_db
from shared.database.models import MonitorRule
from shared.utils import get_logger, log_performance

router = APIRouter()
logger = get_logger(__name__)


class RuleCreateRequest(BaseModel):
    """创建规则请求"""
    rule_name: str
    fund_code: Optional[str] = None
    rule_type: str
    condition_operator: str
    threshold_value: Optional[str] = None
    notification_channels: Optional[List[str]] = []


class RuleUpdateRequest(BaseModel):
    """更新规则请求"""
    rule_name: Optional[str] = None
    fund_code: Optional[str] = None
    rule_type: Optional[str] = None
    condition_operator: Optional[str] = None
    threshold_value: Optional[str] = None
    notification_channels: Optional[List[str]] = None
    is_active: Optional[bool] = None


@router.get("/", summary="获取监控规则列表")
async def get_monitor_rules(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    fund_code: Optional[str] = Query(None, description="基金代码"),
    rule_type: Optional[str] = Query(None, description="规则类型"),
    is_active: Optional[bool] = Query(None, description="是否激活"),
    db: AsyncSession = Depends(get_async_db)
):
    """获取监控规则列表，支持分页和筛选"""
    try:
        from sqlalchemy import select, func

        # 构建查询
        query = select(MonitorRule)
        count_query = select(func.count(MonitorRule.id))

        # 添加筛选条件
        conditions = []

        if fund_code:
            conditions.append(MonitorRule.fund_code == fund_code)

        if rule_type:
            conditions.append(MonitorRule.rule_type == rule_type)

        if is_active is not None:
            conditions.append(MonitorRule.is_active == is_active)

        if conditions:
            from sqlalchemy import and_
            query = query.where(and_(*conditions))
            count_query = count_query.where(and_(*conditions))

        # 获取总数
        total_count = await db.scalar(count_query)

        # 分页查询
        offset = (page - 1) * size
        query = query.offset(offset).limit(size).order_by(MonitorRule.created_at.desc())

        result = await db.execute(query)
        rules = result.scalars().all()

        # 转换为字典
        rule_list = []
        for rule in rules:
            rule_dict = {
                "id": rule.id,
                "rule_name": rule.rule_name,
                "fund_code": rule.fund_code,
                "rule_type": rule.rule_type,
                "condition_operator": rule.condition_operator,
                "threshold_value": str(rule.threshold_value) if rule.threshold_value else None,
                "notification_channels": rule.notification_channels or [],
                "is_active": rule.is_active,
                "created_at": rule.created_at.isoformat(),
                "updated_at": rule.updated_at.isoformat(),
            }
            rule_list.append(rule_dict)

        return {
            "data": rule_list,
            "pagination": {
                "page": page,
                "size": size,
                "total": total_count,
                "pages": (total_count + size - 1) // size
            }
        }

    except Exception as e:
        logger.error(f"获取监控规则列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{rule_id}", summary="获取监控规则详情")
async def get_rule_detail(
    rule_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """获取指定监控规则的详细信息"""
    try:
        rule = await db.get(MonitorRule, rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail=f"监控规则 {rule_id} 不存在")

        # 获取规则统计信息
        from ..services.rule_engine import RuleEngine
        rule_engine = RuleEngine()
        stats = await rule_engine.get_rule_statistics(rule_id)

        # 构建响应
        rule_detail = {
            "id": rule.id,
            "rule_name": rule.rule_name,
            "fund_code": rule.fund_code,
            "rule_type": rule.rule_type,
            "condition_operator": rule.condition_operator,
            "threshold_value": str(rule.threshold_value) if rule.threshold_value else None,
            "notification_channels": rule.notification_channels or [],
            "is_active": rule.is_active,
            "created_at": rule.created_at.isoformat(),
            "updated_at": rule.updated_at.isoformat(),
            "statistics": stats
        }

        return rule_detail

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取监控规则详情失败 {rule_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", summary="创建监控规则")
async def create_monitor_rule(
    rule_request: RuleCreateRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """创建新的监控规则"""
    try:
        # 验证规则类型和操作符
        if not _validate_rule_config(rule_request.rule_type, rule_request.condition_operator):
            raise HTTPException(status_code=400, detail="无效的规则配置")

        # 创建规则
        new_rule = MonitorRule(
            rule_name=rule_request.rule_name,
            fund_code=rule_request.fund_code,
            rule_type=rule_request.rule_type,
            condition_operator=rule_request.condition_operator,
            threshold_value=rule_request.threshold_value,
            notification_channels=rule_request.notification_channels,
            is_active=True
        )

        db.add(new_rule)
        await db.commit()
        await db.refresh(new_rule)

        logger.info(f"监控规则已创建: {new_rule.id} - {new_rule.rule_name}")

        return {
            "message": "监控规则创建成功",
            "rule_id": new_rule.id,
            "rule_name": new_rule.rule_name
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"创建监控规则失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{rule_id}", summary="更新监控规则")
async def update_monitor_rule(
    rule_id: int,
    rule_request: RuleUpdateRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """更新监控规则"""
    try:
        rule = await db.get(MonitorRule, rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail=f"监控规则不存在")

        # 更新字段
        update_data = rule_request.dict(exclude_unset=True)

        # 验证规则配置
        if 'rule_type' in update_data or 'condition_operator' in update_data:
            rule_type = update_data.get('rule_type', rule.rule_type)
            condition_operator = update_data.get('condition_operator', rule.condition_operator)
            if not _validate_rule_config(rule_type, condition_operator):
                raise HTTPException(status_code=400, detail="无效的规则配置")

        for field, value in update_data.items():
            if hasattr(rule, field):
                setattr(rule, field, value)

        rule.updated_at = datetime.now()
        await db.commit()

        logger.info(f"监控规则已更新: {rule_id} - {rule.rule_name}")

        return {"message": "监控规则更新成功"}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"更新监控规则失败 {rule_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{rule_id}", summary="删除监控规则")
async def delete_monitor_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """删除监控规则"""
    try:
        rule = await db.get(MonitorRule, rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail=f"监控规则不存在")

        await db.delete(rule)
        await db.commit()

        logger.info(f"监控规则已删除: {rule_id} - {rule.rule_name}")

        return {"message": "监控规则删除成功"}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"删除监控规则失败 {rule_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{rule_id}/toggle", summary="切换规则状态")
async def toggle_rule_status(
    rule_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """切换监控规则的激活状态"""
    try:
        rule = await db.get(MonitorRule, rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail=f"监控规则不存在")

        rule.is_active = not rule.is_active
        rule.updated_at = datetime.now()
        await db.commit()

        status_text = "激活" if rule.is_active else "停用"
        logger.info(f"监控规则已{status_text}: {rule_id} - {rule.rule_name}")

        return {
            "message": f"监控规则已{status_text}",
            "rule_id": rule.id,
            "is_active": rule.is_active
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"切换规则状态失败 {rule_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/types", summary="获取规则类型列表")
async def get_rule_types():
    """获取所有支持的规则类型"""
    try:
        from ..services.rule_engine import RuleType

        rule_types = [
            {
                "value": RuleType.PRICE_CHANGE,
                "label": "涨跌幅监控",
                "description": "监控基金净值涨跌幅"
            },
            {
                "value": RuleType.THRESHOLD,
                "label": "阈值监控",
                "description": "监控基金净值是否超过设定阈值"
            },
            {
                "value": RuleType.TREND,
                "label": "趋势监控",
                "description": "监控基金净值变化趋势"
            },
            {
                "value": RuleType.ABNORMAL,
                "label": "异常监控",
                "description": "监控异常情况，如价格剧烈波动"
            }
        ]

        return {"data": rule_types}

    except Exception as e:
        logger.error(f"获取规则类型失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/operators", summary="获取操作符列表")
async def get_condition_operators():
    """获取所有支持的条件操作符"""
    try:
        from ..services.rule_engine import ConditionOperator

        operators = [
            {
                "value": ConditionOperator.GREATER_THAN,
                "label": "大于",
                "symbol": ">"
            },
            {
                "value": ConditionOperator.LESS_THAN,
                "label": "小于",
                "symbol": "<"
            },
            {
                "value": ConditionOperator.GREATER_EQUAL,
                "label": "大于等于",
                "symbol": ">="
            },
            {
                "value": ConditionOperator.LESS_EQUAL,
                "label": "小于等于",
                "symbol": "<="
            },
            {
                "value": ConditionOperator.EQUAL,
                "label": "等于",
                "symbol": "=="
            },
            {
                "value": ConditionOperator.NOT_EQUAL,
                "label": "不等于",
                "symbol": "!="
            }
        ]

        return {"data": operators}

    except Exception as e:
        logger.error(f"获取操作符列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/channels", summary="获取通知渠道列表")
async def get_notification_channels():
    """获取所有支持的通知渠道"""
    try:
        channels = [
            {
                "value": "wechat",
                "label": "微信",
                "description": "通过企业微信发送通知"
            },
            {
                "value": "email",
                "label": "邮件",
                "description": "通过邮件发送通知"
            },
            {
                "value": "sms",
                "label": "短信",
                "description": "通过短信发送通知"
            },
            {
                "value": "webhook",
                "label": "Webhook",
                "description": "通过自定义Webhook发送通知"
            }
        ]

        return {"data": channels}

    except Exception as e:
        logger.error(f"获取通知渠道失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics", summary="获取规则统计")
async def get_rules_statistics(
    days: int = Query(30, ge=1, le=365, description="统计天数"),
    db: AsyncSession = Depends(get_async_db)
):
    """获取监控规则统计信息"""
    try:
        from sqlalchemy import select, func
        from datetime import datetime, timedelta

        # 时间范围
        start_date = datetime.now() - timedelta(days=days)

        # 总规则数
        total_rules = await db.scalar(select(func.count(MonitorRule.id)))

        # 活跃规则数
        active_rules = await db.scalar(
            select(func.count(MonitorRule.id)).where(MonitorRule.is_active == True)
        )

        # 规则类型分布
        type_distribution = await db.execute(
            select(
                MonitorRule.rule_type,
                func.count(MonitorRule.id).label('count')
            ).group_by(MonitorRule.rule_type)
        )
        type_stats = {row.rule_type: row.count for row in type_distribution}

        # 最近创建的规则
        recent_rules = await db.execute(
            select(MonitorRule).order_by(MonitorRule.created_at.desc()).limit(5)
        )
        recent_rules_list = []
        for rule in recent_rules.scalars():
            recent_rules_list.append({
                "id": rule.id,
                "rule_name": rule.rule_name,
                "rule_type": rule.rule_type,
                "is_active": rule.is_active,
                "created_at": rule.created_at.isoformat()
            })

        return {
            "summary": {
                "total_rules": total_rules or 0,
                "active_rules": active_rules or 0,
                "inactive_rules": (total_rules or 0) - (active_rules or 0),
                "days": days
            },
            "type_distribution": type_stats,
            "recent_rules": recent_rules_list
        }

    except Exception as e:
        logger.error(f"获取规则统计失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _validate_rule_config(rule_type: str, condition_operator: str) -> bool:
    """验证规则配置"""
    try:
        from ..services.rule_engine import RuleType, ConditionOperator

        # 验证规则类型
        valid_types = [rt.value for rt in RuleType]
        if rule_type not in valid_types:
            return False

        # 验证操作符
        valid_operators = [co.value for co in ConditionOperator]
        if condition_operator not in valid_operators:
            return False

        return True

    except Exception:
        return False