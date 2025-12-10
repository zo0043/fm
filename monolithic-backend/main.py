"""
基金监控系统 - 单体后端应用
整合了认证、数据收集、回测、监控引擎和通知功能
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager
import uvicorn

from config import settings
from database import get_async_db, init_db
from routers import auth_router, data_router, backtest_router, monitor_router, notification_router
from utils import get_logger

logger = get_logger(__name__)
security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("启动应用")
    await init_db()
    yield
    logger.info("关闭应用")

app = FastAPI(
    title="基金监控系统 API",
    description="基金数据收集、分析、监控和回测系统",
    version="1.0.0",
    lifespan=lifespan
)

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth_router, prefix="/api/auth", tags=["认证"])
app.include_router(data_router, prefix="/api/data", tags=["数据"])
app.include_router(backtest_router, prefix="/api/backtest", tags=["回测"])
app.include_router(monitor_router, prefix="/api/monitor", tags=["监控"])
app.include_router(notification_router, prefix="/api/notification", tags=["通知"])

@app.get("/")
async def root():
    return {"message": "基金监控系统 API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )