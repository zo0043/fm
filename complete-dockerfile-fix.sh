#!/bin/bash
# 完整的 Dockerfile 修复脚本 - 最终版本

echo "🔧 完整的 Dockerfile 修复脚本"
echo "=================================="
echo ""

echo "📋 修复所有服务的 Dockerfile..."
echo ""

# 修复 auth 服务
echo "🔧 修复 auth 服务..."
cat > backend/services/auth/Dockerfile <<'DOCKERFILE'
# auth服务 Dockerfile - 最终修复版
FROM fund-monitor-python:local

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 复制服务代码
COPY services/auth /app/

# 切换到非root用户
USER appuser

# 安装服务特定依赖（在非root用户下，使用 --user 标志）
RUN pip install --break-system-packages --user --no-cache-dir -r /app/requirements.txt

# 设置环境变量以包含用户本地 bin 目录
ENV PATH=/home/appuser/.local/bin:$PATH

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:${PORT:-8000}/health', timeout=5)" || exit 1

# 启动命令
CMD ["python", "main.py"]
DOCKERFILE

echo "✅ auth 服务已修复"
echo ""

# 修复其他服务
for service in data_collector monitor_engine notification backtest; do
    if [ -f "backend/services/${service}/requirements.txt" ]; then
        echo "🔧 修复 ${service} 服务..."
        cat > "backend/services/${service}/Dockerfile" <<DOCKERFILE
# ${service}服务 Dockerfile - 最终修复版
FROM fund-monitor-python:local

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 复制服务代码
COPY services/${service} /app/

# 切换到非root用户
USER appuser

# 安装服务特定依赖（在非root用户下）
RUN pip install --break-system-packages --user --no-cache-dir -r /app/requirements.txt

# 设置环境变量
ENV PATH=/home/appuser/.local/bin:$PATH

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:\${PORT:-8000}/health', timeout=5)" || exit 1

# 启动命令
CMD ["python", "main.py"]
DOCKERFILE
        echo "✅ ${service} 服务已修复"
    fi
done

echo ""
echo "🎉 所有 Dockerfile 修复完成！"
echo ""
echo "📋 修复内容总结："
echo "✅ 1. 修复文件路径错误 (backend/shared → shared)"
echo "✅ 2. 使用服务特定依赖而非主 requirements.txt"
echo "✅ 3. 修复权限问题 (使用 --user 标志安装)"
echo "✅ 4. 正确的用户切换顺序"
echo ""
echo "🚀 下一步："
echo "   docker-compose build         # 构建所有服务"
echo "   docker-compose up -d         # 启动所有服务"
echo ""
echo "🧪 验证命令："
echo "   docker images | grep fund-monitor"
echo "   docker-compose ps"
echo ""
