"""
调度管理路由
"""

from typing import List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel

from shared.utils import get_logger
from ..services.scheduler import DataCollectionScheduler

router = APIRouter()
logger = get_logger(__name__)


class JobCreateRequest(BaseModel):
    """创建任务请求"""
    job_id: str
    job_name: str
    cron_expression: str
    description: str = ""


class JobActionRequest(BaseModel):
    """任务操作请求"""
    job_id: str


# 全局调度器实例 (实际使用时应该从应用状态获取)
scheduler_instance = None


def get_scheduler() -> DataCollectionScheduler:
    """获取调度器实例"""
    global scheduler_instance
    if scheduler_instance is None:
        scheduler_instance = DataCollectionScheduler()
    return scheduler_instance


@router.get("/jobs", summary="获取所有任务")
async def get_all_jobs():
    """获取所有定时任务"""
    try:
        scheduler = get_scheduler()
        jobs = scheduler.get_jobs()

        return {
            "data": jobs,
            "count": len(jobs),
            "scheduler_running": scheduler.is_running
        }

    except Exception as e:
        logger.error(f"获取任务列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}", summary="获取任务详情")
async def get_job_detail(job_id: str):
    """获取指定任务的详细信息"""
    try:
        scheduler = get_scheduler()
        jobs = scheduler.get_jobs()

        for job in jobs:
            if job['id'] == job_id:
                return job

        raise HTTPException(status_code=404, detail=f"任务 {job_id} 不存在")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取任务详情失败 {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jobs/trigger", summary="手动触发任务")
async def trigger_job(
    background_tasks: BackgroundTasks,
    job_id: str
):
    """手动触发指定任务"""
    try:
        scheduler = get_scheduler()

        # 根据任务ID执行相应任务
        if job_id == 'fund_collection_daily':
            background_tasks.add_task(scheduler._scheduled_fund_collection)
        elif job_id == 'nav_collection_daily':
            background_tasks.add_task(scheduler._scheduled_nav_collection)
        elif job_id == 'data_integrity_check':
            background_tasks.add_task(scheduler._scheduled_data_integrity_check)
        elif job_id == 'data_cleanup_weekly':
            background_tasks.add_task(scheduler._scheduled_data_cleanup)
        else:
            raise HTTPException(status_code=404, detail=f"任务 {job_id} 不存在或不支持手动触发")

        return {
            "message": f"任务 {job_id} 已手动触发",
            "trigger_time": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"手动触发任务失败 {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jobs/{job_id}/pause", summary="暂停任务")
async def pause_job(job_id: str):
    """暂停指定任务"""
    try:
        scheduler = get_scheduler()
        await scheduler.pause_job(job_id)

        return {"message": f"任务 {job_id} 已暂停"}

    except Exception as e:
        logger.error(f"暂停任务失败 {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jobs/{job_id}/resume", summary="恢复任务")
async def resume_job(job_id: str):
    """恢复指定任务"""
    try:
        scheduler = get_scheduler()
        await scheduler.resume_job(job_id)

        return {"message": f"任务 {job_id} 已恢复"}

    except Exception as e:
        logger.error(f"恢复任务失败 {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/jobs/{job_id}", summary="删除任务")
async def remove_job(job_id: str):
    """删除指定任务"""
    try:
        scheduler = get_scheduler()
        await scheduler.remove_job(job_id)

        return {"message": f"任务 {job_id} 已删除"}

    except Exception as e:
        logger.error(f"删除任务失败 {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", summary="获取调度器状态")
async def get_scheduler_status():
    """获取调度器运行状态"""
    try:
        scheduler = get_scheduler()

        # 获取任务统计
        jobs = scheduler.get_jobs()
        total_jobs = len(jobs)

        # 获取下一次运行时间
        next_runs = []
        for job in jobs:
            if job.get('next_run'):
                next_runs.append({
                    'job_id': job['id'],
                    'job_name': job['name'],
                    'next_run': job['next_run']
                })

        # 按下次运行时间排序
        next_runs.sort(key=lambda x: x['next_run'])

        return {
            "scheduler_running": scheduler.is_running,
            "total_jobs": total_jobs,
            "next_runs": next_runs[:5],  # 只返回前5个
            "status": "healthy" if scheduler.is_running else "stopped"
        }

    except Exception as e:
        logger.error(f"获取调度器状态失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scheduler/start", summary="启动调度器")
async def start_scheduler():
    """启动调度器"""
    try:
        scheduler = get_scheduler()
        if scheduler.is_running:
            return {"message": "调度器已在运行"}

        await scheduler.start()
        return {"message": "调度器启动成功"}

    except Exception as e:
        logger.error(f"启动调度器失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scheduler/stop", summary="停止调度器")
async def stop_scheduler():
    """停止调度器"""
    try:
        scheduler = get_scheduler()
        if not scheduler.is_running:
            return {"message": "调度器未在运行"}

        await scheduler.stop()
        return {"message": "调度器停止成功"}

    except Exception as e:
        logger.error(f"停止调度器失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scheduler/restart", summary="重启调度器")
async def restart_scheduler():
    """重启调度器"""
    try:
        scheduler = get_scheduler()

        if scheduler.is_running:
            await scheduler.stop()

        await scheduler.start()
        return {"message": "调度器重启成功"}

    except Exception as e:
        logger.error(f"重启调度器失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs", summary="获取调度日志")
async def get_scheduler_logs(
    lines: int = 100,
    level: str = "INFO"
):
    """获取调度器日志"""
    try:
        # 这里应该从日志文件或日志系统中读取日志
        # 为了演示，返回模拟数据
        mock_logs = [
            {
                "timestamp": datetime.now().isoformat(),
                "level": "INFO",
                "message": "数据收集调度器启动成功"
            },
            {
                "timestamp": datetime.now().isoformat(),
                "level": "INFO",
                "message": "定时任务设置完成，共 4 个任务"
            },
            {
                "timestamp": datetime.now().isoformat(),
                "level": "INFO",
                "message": "开始执行定时净值数据收集任务"
            },
            {
                "timestamp": datetime.now().isoformat(),
                "level": "INFO",
                "message": "定时净值数据收集任务完成"
            }
        ]

        return {
            "data": mock_logs[-lines:],  # 返回最后几行
            "count": len(mock_logs[-lines:]),
            "level": level
        }

    except Exception as e:
        logger.error(f"获取调度日志失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", summary="调度器健康检查")
async def scheduler_health_check():
    """调度器健康检查"""
    try:
        scheduler = get_scheduler()

        health_status = {
            "status": "healthy" if scheduler.is_running else "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "scheduler_running": scheduler.is_running,
            "jobs_count": len(scheduler.get_jobs()),
            "checks": {
                "scheduler": scheduler.is_running,
                "jobs": len(scheduler.get_jobs()) > 0
            }
        }

        # 判断整体健康状态
        all_healthy = all(health_status["checks"].values())

        if all_healthy:
            return health_status
        else:
            raise HTTPException(status_code=503, detail=health_status)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"调度器健康检查失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))