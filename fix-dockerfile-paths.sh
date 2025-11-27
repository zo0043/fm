#!/bin/bash
# 修复 Dockerfile 中的 COPY 路径错误

echo "🔧 修复 Dockerfile 中的 COPY 路径错误..."
echo ""

# 备份所有 Dockerfile
echo "📋 备份所有 Dockerfile..."
cp Dockerfile.base Dockerfile.base.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
cp backend/services/*/Dockerfile backend/services/*/Dockerfile.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
echo "✅ 备份完成"
echo ""

# 修复 Dockerfile.base
echo "🔧 修复 Dockerfile.base..."
cat > Dockerfile.base <<'DOCKERFILE'
# Python基础镜像 Dockerfile - 本地构建版本
FROM fund-monitor-python:local AS fund-monitor-base

# 设置工作目录
WORKDIR /app

# 复制共享库和通用依赖
COPY shared /app/shared
COPY requirements.txt /app/

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
  CMD python -c "import requests; requests.get('http://localhost:\${PORT:-8000}/health', timeout=5)" || exit 1

# 默认启动命令（由具体服务覆盖）
CMD ["python", "main.py"]
DOCKERFILE

echo "✅ Dockerfile.base 已修复"
echo ""

# 修复所有服务 Dockerfile
for service in auth data_collector monitor_engine notification backtest; do
    if [ -f "backend/services/${service}/Dockerfile" ]; then
        echo "🔧 修复 backend/services/${service}/Dockerfile..."
        cat > "backend/services/${service}/Dockerfile" <<DOCKERFILE
# ${service}服务 Dockerfile - 本地镜像版本
FROM fund-monitor-python:local

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 复制服务代码
COPY services/${service} /app/
COPY shared /app/shared
COPY requirements.txt /app/

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
  CMD python -c "import requests; requests.get('http://localhost:\${PORT:-8000}/health', timeout=5)" || exit 1

# 启动命令
CMD ["python", "main.py"]
DOCKERFILE
        echo "✅ ${service} Dockerfile 已修复"
    fi
done

echo ""
echo "🎉 所有 Dockerfile 路径已修复！"
echo ""
echo "📋 修复内容："
echo "   COPY backend/shared → COPY shared"
echo "   COPY backend/requirements.txt → COPY requirements.txt"
echo ""
echo "🚀 下一步："
echo "   docker-compose build  # 重新构建"
echo "   docker-compose up -d  # 启动服务"
