#!/bin/bash
# 更新所有 Dockerfile 使用本地镜像

echo "🔄 更新所有 Dockerfile 使用本地 Python 镜像..."
echo ""

# 备份所有 Dockerfile
echo "📋 备份现有 Dockerfile..."
cp Dockerfile.base Dockerfile.base.backup.$(date +%Y%m%d_%H%M%S)
cp backend/services/*/Dockerfile backend/services/*/Dockerfile.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
echo "✅ 备份完成"
echo ""

# 更新 Dockerfile.base
echo "🔧 更新 Dockerfile.base..."
cat > Dockerfile.base <<'DOCKERFILE'
# Python基础镜像 Dockerfile - 本地构建版本
FROM fund-monitor-python:local AS fund-monitor-base

# 设置工作目录
WORKDIR /app

# 复制共享库和通用依赖
COPY backend/shared /app/shared
COPY backend/requirements.txt /app/

# 安装通用Python依赖（已在基础镜像中安装）
# RUN pip install --break-system-packages --no-cache-dir -r /app/requirements.txt

# 设置环境变量
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 创建非root用户（已在基础镜像中创建）
# USER appuser

# 暴露健康检查端口（由具体服务覆盖）
EXPOSE 8000

# 健康检查模板（由具体服务覆盖）
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:${PORT:-8000}/health', timeout=5)" || exit 1

# 默认启动命令（由具体服务覆盖）
CMD ["python", "main.py"]
DOCKERFILE

echo "✅ Dockerfile.base 已更新"
echo ""

# 更新所有服务 Dockerfile
for service in auth data_collector monitor_engine notification backtest; do
    if [ -f "backend/services/${service}/Dockerfile" ]; then
        echo "🔧 更新 backend/services/${service}/Dockerfile..."
        cat > "backend/services/${service}/Dockerfile" <<DOCKERFILE
# ${service^}服务 Dockerfile - 本地镜像版本
FROM fund-monitor-python:local

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 复制服务代码
COPY services/${service} /app/
COPY backend/shared /app/shared
COPY backend/requirements.txt /app/

# 安装服务特定依赖
RUN pip install --break-system-packages --no-cache-dir -r /app/requirements.txt

# 设置文件权限
RUN chown -R appuser:appuser /app

# 切换到非root用户
USER appuser

# 暴露端口
EXPOSE 800${service: -1}

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:${PORT:-8000}/health', timeout=5)" || exit 1

# 启动命令
CMD ["python", "main.py"]
DOCKERFILE
        echo "✅ ${service} Dockerfile 已更新"
    fi
done

echo ""
echo "🎉 所有 Dockerfile 更新完成！"
echo ""
echo "📋 下一步操作："
echo "1. 重新构建基础镜像（如果需要）："
echo "   docker build -f Dockerfile.base -t fund-monitor-base ."
echo ""
echo "2. 构建所有服务："
echo "   docker-compose build"
echo ""
echo "3. 启动所有服务："
echo "   docker-compose up -d"
echo ""
echo "⚠️  注意：请确保 fund-monitor-python:local 镜像可用"
echo "   如果不存在，运行：docker build -f Dockerfile.local-fixed -t fund-monitor-python:local ."
