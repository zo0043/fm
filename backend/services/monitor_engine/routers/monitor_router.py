"""
监控任务路由
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_async_db
from shared.utils import get_logger, log_performance
from shared.database.models import MonitorResult, MonitorRule

router = APIRouter()
logger = get_logger(__name__)


@router.get("/status", summary="获取监控状态")
async def get_monitor_status():
    """获取监控引擎当前状态"""
    try:
        # 这里应该从实际运行的监控引擎获取状态
        # 为了演示，返回模拟状态
        status = {
            "engine_running": True,
            "scheduler_running": True,
            "current_time": datetime.now().isoformat(),
            "active_jobs": 4,
            "last_check": "2024-01-15T15:30:00",
            "next_check": "2024-01-15T15:45:00",
            "stats": {
                "total_checks": 1250,
                "rules_triggered": 45,
                "notifications_sent": 38,
                "success_rate": 0.96
            }
        }

        return status

    except Exception as e:
        logger.error(f"获取监控状态失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run", summary="执行监控任务")
async def run_monitor_task(
    background_tasks: BackgroundTasks,
    rule_ids: Optional[List[int]] = Query(None, description="指定规则ID列表"),
    fund_codes: Optional[List[str]] = Query(None, description="指定基金代码列表"),
    target_date: Optional[str] = Query(None, description="目标日期 (YYYY-MM-DD)")
):
    """
    手动触发监控任务

    Args:
        rule_ids: 指定规则ID列表，为空则使用所有活跃规则
        fund_codes: 指定基金代码列表，为空则监控所有基金
        target_date: 目标日期，为空则使用最新交易日
    """
    try:
        # 验证日期格式
        if target_date:
            try:
                datetime.strptime(target_date, '%Y-%m-%d')
            except ValueError:
                raise HTTPException(status_code=400, detail="日期格式错误，请使用 YYYY-MM-DD")

        background_tasks.add_task(
            _run_monitor_background,
            rule_ids=rule_ids,
            fund_codes=fund_codes,
            target_date=target_date
        )

        return {
            "message": "监控任务已启动",
            "rule_ids": rule_ids,
            "fund_codes": fund_codes,
            "target_date": target_date,
            "task_id": f"monitor_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"启动监控任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results", summary="获取监控结果")
async def get_monitor_results(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    rule_id: Optional[int] = Query(None, description="规则ID"),
    fund_code: Optional[str] = Query(None, description="基金代码"),
    start_date: Optional[str] = Query(None, description="开始日期 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="结束日期 (YYYY-MM-DD)"),
    notification_status: Optional[str] = Query(None, description="通知状态 (sent/pending)"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    获取监控结果列表，支持分页和多维度筛选
    """
    try:
        from sqlalchemy import select, func, and_
        from sqlalchemy.orm import selectinload

        # 构建查询
        query = select(MonitorResult).options(
            selectinload(MonitorResult.rule)
        )
        count_query = select(func.count(MonitorResult.id))

        # 添加筛选条件
        conditions = []

        if rule_id:
            conditions.append(MonitorResult.rule_id == rule_id)

        if fund_code:
            conditions.append(MonitorResult.fund_code == fund_code)

        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
                conditions.append(MonitorResult.trigger_time >= start_date_obj)
            except ValueError:
                raise HTTPException(status_code=400, detail="开始日期格式错误")

        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
                conditions.append(MonitorResult.trigger_time <= end_date_obj)
            except ValueError:
                raise HTTPException(status_code=400, detail="结束日期格式错误")

        if notification_status:
            if notification_status == 'sent':
                conditions.append(MonitorResult.notification_sent == True)
            elif notification_status == 'pending':
                conditions.append(MonitorResult.notification_sent == False)

        if conditions:
            query = query.where(and_(*conditions))
            count_query = count_query.where(and_(*conditions))

        # 获取总数
        total_count = await db.scalar(count_query)

        # 分页查询
        offset = (page - 1) * size
        query = query.offset(offset).limit(size).order_by(MonitorResult.trigger_time.desc())

        result = await db.execute(query)
        results = result.scalars().all()

        # 转换为字典
        results_list = []
        for item in results:
            result_dict = {
                "id": item.id,
                "rule_id": item.rule_id,
                "rule_name": item.rule.rule_name if item.rule else "Unknown",
                "rule_type": item.rule.rule_type if item.rule else "Unknown",
                "fund_code": item.fund_code,
                "trigger_time": item.trigger_time.isoformat(),
                "trigger_value": float(item.trigger_value),
                "threshold_value": float(item.threshold_value),
                "notification_sent": item.notification_sent,
                "notification_sent_at": item.notification_sent_at.isoformat() if item.notification_sent_at else None,
                "created_at": item.created_at.isoformat(),
            }
            results_list.append(result_dict)

        return {
            "data": results_list,
            "pagination": {
                "page": page,
                "size": size,
                "total": total_count,
                "pages": (total_count + size - 1) // size
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取监控结果失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results/{result_id}", summary="获取监控结果详情")
async def get_monitor_result_detail(
    result_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """获取指定监控结果的详细信息"""
    try:
        from sqlalchemy.orm import selectinload

        result = await db.get(
            MonitorResult, result_id,
            options=[selectinload(MonitorResult.rule)]
        )

        if not result:
            raise HTTPException(status_code=404, detail=f"监控结果 {result_id} 不存在")

        # 获取基金信息
        from shared.database.models import Fund
        fund = await db.get(Fund, result.fund_code)

        # 构建详细响应
        detail = {
            "id": result.id,
            "rule": {
                "id": result.rule.id,
                "name": result.rule.rule_name,
                "type": result.rule.rule_type,
                "condition_operator": result.rule.condition_operator,
                "threshold_value": str(result.rule.threshold_value) if result.rule.threshold_value else None,
                "notification_channels": result.rule.notification_channels or [],
            } if result.rule else None,
            "fund": {
                "code": fund.fund_code if fund else result.fund_code,
                "name": fund.fund_name if fund else "Unknown",
                "type": fund.fund_type if fund else "Unknown",
                "company": fund.fund_company if fund else "Unknown",
            } if fund else {
                "code": result.fund_code,
                "name": "Unknown",
                "type": "Unknown",
                "company": "Unknown",
            },
            "trigger_time": result.trigger_time.isoformat(),
            "trigger_value": float(result.trigger_value),
            "threshold_value": float(result.threshold_value),
            "notification_sent": result.notification_sent,
            "notification_sent_at": result.notification_sent_at.isoformat() if result.notification_sent_at else None,
            "created_at": result.created_at.isoformat(),
        }

        return detail

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取监控结果详情失败 {result_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts", summary="获取监控告警")
async def get_monitor_alerts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
    severity: Optional[str] = Query(None, description="告警级别"),
    status: Optional[str] = Query(None, description="处理状态"),
    hours: int = Query(24, ge=1, le=168, description="时间范围（小时）")
):
    """获取监控告警列表"""
    try:
        # 这里应该从实际的监控引擎获取告警数据
        # 为了演示，返回模拟数据
        alerts = [
            {
                "id": 1,
                "fund_code": "000001",
                "fund_name": "华夏成长混合",
                "rule_name": "涨跌幅超过5%",
                "severity": "high",
                "message": "基金净值下跌5.2%，超过设定的5%阈值",
                "trigger_time": "2024-01-15T14:30:00",
                "status": "pending",
                "acknowledged": False
            },
            {
                "id": 2,
                "fund_code": "110022",
                "fund_name": "易方达消费行业股票",
                "rule_name": "连续下跌3天",
                "severity": "medium",
                "message": "基金净值连续3天下跌",
                "trigger_time": "2024-01-15T15:00:00",
                "status": "acknowledged",
                "acknowledged": True,
                "acknowledged_by": "admin",
                "acknowledged_at": "2024-01-15T15:30:00"
            }
        ]

        # 应用筛选
        filtered_alerts = alerts
        if severity:
            filtered_alerts = [a for a in filtered_alerts if a.get('severity') == severity]
        if status:
            filtered_alerts = [a for a in filtered_alerts if a.get('status') == status]

        # 分页
        start = (page - 1) * size
        end = start + size
        paginated_alerts = filtered_alerts[start:end]

        return {
            "data": paginated_alerts,
            "pagination": {
                "page": page,
                "size": size,
                "total": len(filtered_alerts),
                "pages": (len(filtered_alerts) + size - 1) // size
            },
            "filters": {
                "severity": severity,
                "status": status,
                "hours": hours
            }
        }

    except Exception as e:
        logger.error(f"获取监控告警失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/{alert_id}/acknowledge", summary="确认告警")
async def acknowledge_alert(
    alert_id: int,
    acknowledged_by: str = Query(..., description="确认人"),
    note: str = Query("", description="确认备注")
):
    """确认监控告警"""
    try:
        # 这里应该更新实际的告警状态
        logger.info(f"告警 {alert_id} 已被 {acknowledged_by} 确认: {note}")

        return {
            "message": "告警已确认",
            "alert_id": alert_id,
            "acknowledged_by": acknowledged_by,
            "acknowledged_at": datetime.now().isoformat(),
            "note": note
        }

    except Exception as e:
        logger.error(f"确认告警失败 {alert_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics", summary="获取监控统计")
async def get_monitor_statistics(
    days: int = Query(7, ge=1, le=90, description="统计天数")
):
    """获取监控统计信息"""
    try:
        from sqlalchemy import select, func
        from datetime import datetime, timedelta

        async with get_async_db().__aenter__() as session:
            start_date = datetime.now() - timedelta(days=days)

            # 总监控结果数
            total_results = await session.scalar(
                select(func.count(MonitorResult.id)).where(
                    MonitorResult.trigger_time >= start_date
                )
            )

            # 触发规则数
            triggered_rules = await session.scalar(
                select(func.count(func.distinct(MonitorResult.rule_id))).where(
                    MonitorResult.trigger_time >= start_date
                )
            )

            # 通知发送数
            sent_notifications = await session.scalar(
                select(func.count(MonitorResult.id)).where(
                    MonitorResult.trigger_time >= start_date,
                    MonitorResult.notification_sent == True
                )
            )

            # 每日统计
            daily_stats = await session.execute(
                select(
                    func.date(MonitorResult.trigger_time).label('date'),
                    func.count(MonitorResult.id).label('count')
                ).where(
                    MonitorResult.trigger_time >= start_date
                ).group_by(func.date(MonitorResult.trigger_time))
                .order_by(func.date(MonitorResult.trigger_time).desc())
            )

            daily_data = [
                {
                    "date": row.date.isoformat(),
                    "count": row.count
                }
                for row in daily_stats
            ]

            # TOP触发规则
            top_rules = await session.execute(
                select(
                    MonitorResult.rule_id,
                    MonitorRule.rule_name,
                    func.count(MonitorResult.id).label('count')
                ).join(
                    MonitorRule, MonitorResult.rule_id == MonitorRule.id
                ).where(
                    MonitorResult.trigger_time >= start_date
                ).group_by(
                    MonitorResult.rule_id,
                    MonitorRule.rule_name
                ).order_by(func.count(MonitorResult.id).desc())
                .limit(10)
            )

            top_rules_data = [
                {
                    "rule_id": row.rule_id,
                    "rule_name": row.rule_name,
                    "count": row.count
                }
                for row in top_rules
            ]

        return {
            "summary": {
                "days": days,
                "total_results": total_results or 0,
                "triggered_rules": triggered_rules or 0,
                "sent_notifications": sent_notifications or 0,
                "notification_success_rate": (sent_notifications / total_results) if total_results > 0 else 0
            },
            "daily_stats": daily_data,
            "top_rules": top_rules_data
        }

    except Exception as e:
        logger.error(f"获取监控统计失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard", summary="获取监控仪表板数据")
async def get_monitor_dashboard():
    """获取监控仪表板数据"""
    try:
        dashboard_data = {
            "real_time_status": {
                "engine_running": True,
                "active_rules": 25,
                "monitored_funds": 1850,
                "last_check": "2024-01-15T15:30:00",
                "next_check": "2024-01-15T15:45:00"
            },
            "today_summary": {
                "total_checks": 2450,
                "rules_triggered": 12,
                "notifications_sent": 10,
                "success_rate": 0.98
            },
            "recent_alerts": [
                {
                    "id": 1,
                    "fund_code": "000001",
                    "fund_name": "华夏成长混合",
                    "message": "净值下跌超过5%",
                    "time": "2024-01-15T14:30:00",
                    "severity": "high"
                },
                {
                    "id": 2,
                    "fund_code": "110022",
                    "fund_name": "易方达消费行业股票",
                    "message": "连续下跌3天",
                    "time": "2024-01-15T15:00:00",
                    "severity": "medium"
                }
            ],
            "performance_trends": [
                {"date": "2024-01-09", "checks": 2300, "triggers": 8},
                {"date": "2024-01-10", "checks": 2350, "triggers": 10},
                {"date": "2024-01-11", "checks": 2400, "triggers": 15},
                {"date": "2024-01-12", "checks": 2380, "triggers": 12},
                {"date": "2024-01-15", "checks": 2450, "triggers": 12}
            ]
        }

        return dashboard_data

    except Exception as e:
        logger.error(f"获取监控仪表板数据失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@log_performance
async def _run_monitor_background(
    rule_ids: Optional[List[int]] = None,
    fund_codes: Optional[List[str]] = None,
    target_date: Optional[str] = None
):
    """后台监控任务"""
    try:
        logger.info(f"开始执行后台监控任务 - 规则: {rule_ids}, 基金: {fund_codes}, 日期: {target_date}")

        # 这里应该调用实际的监控引擎
        # result = await monitor_engine.run_monitor(
        #     rule_ids=rule_ids,
        #     fund_codes=fund_codes,
        #     target_date=datetime.strptime(target_date, '%Y-%m-%d').date() if target_date else None
        # )

        # 模拟执行结果
        await asyncio.sleep(2)  # 模拟处理时间

        result = {
            "success": True,
            "summary": {
                "total_funds": fund_codes and len(fund_codes) or 50,
                "total_checks": fund_codes and len(fund_codes) or 50,
                "rules_triggered": 3,
                "notifications_sent": 3,
                "success_rate": 1.0
            },
            "duration_seconds": 2.1
        }

        logger.info(f"后台监控任务完成: {result}")

    except Exception as e:
        logger.error(f"后台监控任务失败: {e}")