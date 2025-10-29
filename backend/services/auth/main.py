"""
认证服务主程序
提供用户注册、登录、权限验证等功能
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager
import uvicorn

from shared.database import get_async_db, init_db
from shared.utils import get_logger
from .routers.auth_router import router as auth_router
from .routers.user_router import router as user_router
from .services.auth_service import AuthService

logger = get_logger(__name__)
security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("认证服务启动中...")

    # 初始化数据库
    await init_db()
    logger.info("数据库初始化完成")

    # 创建默认管理员用户
    await create_default_admin()

    logger.info("认证服务启动完成")
    yield

    logger.info("认证服务关闭中...")

app = FastAPI(
    title="基金监控认证服务",
    description="提供用户认证和权限管理功能",
    version="1.0.0",
    lifespan=lifespan
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境中应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由注册
app.include_router(auth_router, prefix="/api/v1/auth", tags=["认证"])
app.include_router(user_router, prefix="/api/v1/users", tags=["用户管理"])

@app.get("/")
async def root():
    """根路径，服务健康检查"""
    return {
        "service": "认证服务",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "service": "auth-service",
        "timestamp": "2024-01-01T00:00:00Z"
    }

async def create_default_admin():
    """创建默认管理员用户"""
    try:
        async with get_async_db() as db:
            auth_service = AuthService(db)
            await auth_service.create_default_admin()
            logger.info("默认管理员用户检查完成")
    except Exception as e:
        logger.error(f"创建默认管理员用户失败: {e}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )