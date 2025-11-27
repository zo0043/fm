#!/bin/bash
# 修复服务依赖安装问题

echo "🔧 修复服务依赖安装问题..."
echo ""

# 修复 auth 服务
echo "🔧 修复 auth 服务..."
cat > backend/services/auth/Dockerfile <<'DOCKERFILE'
# auth服务 Dockerfile - 本地镜像版本
FROM fund-monitor-python:local

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 复制服务代码
COPY services/auth /app/

# 安装服务特定依赖
RUN pip install --break-system-packages --no-cache-dir -r /app/requirements.txt

# 设置文件权限
RUN chown -R appuser:appuser /app

# 切换到非root用户
USER appuser

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:${PORT:-8000}/health', timeout=5)" || exit 1

# 启动命令
CMD ["python", "main.py"]
DOCKERFILE

echo "✅ auth 服务已修复"
