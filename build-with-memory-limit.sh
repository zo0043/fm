#!/bin/bash
# 内存优化的Docker构建脚本

set -e

echo "================================"
echo "  内存优化Docker构建脚本"
echo "================================"

# 检查可用内存
echo "检查系统内存状态..."
FREE_PAGES=$(vm_stat | grep "Pages free:" | awk '{print $3}' | tr -d '.')
FREE_MB=$((FREE_PAGES * 16 / 1024))  # 16KB per page -> MB

echo "可用内存: ${FREE_MB}MB"

# 建议的内存限制
if [ $FREE_MB -lt 1000 ]; then
    MEMORY_LIMIT="1g"
    echo "⚠️  内存严重不足，建议限制Docker内存使用"
elif [ $FREE_MB -lt 2000 ]; then
    MEMORY_LIMIT="1.5g"
    echo "⚠️  内存不足，建议限制Docker内存使用"
elif [ $FREE_MB -lt 4000 ]; then
    MEMORY_LIMIT="2g"
    echo "💡  内存偏低，建议适当限制"
else
    MEMORY_LIMIT="3g"
    echo "✅  内存充足"
fi

# 清理Docker资源
echo "清理Docker资源..."
docker system prune -f > /dev/null 2>&1 || true
docker builder prune -f > /dev/null 2>&1 || true

# 构建优化版本
echo "使用内存限制 ${MEMORY_LIMIT} 构建镜像..."
docker build \
    --memory=${MEMORY_LIMIT} \
    --memory-swap=${MEMORY_LIMIT} \
    --cpus=2.0 \
    -f Dockerfile.optimized \
    -t fund-monitor-python:optimized \
    .

if [ $? -eq 0 ]; then
    echo "✅ 构建成功！"
    echo "镜像: fund-monitor-python:optimized"
else
    echo "❌ 构建失败！"
    echo ""
    echo "尝试以下解决方案:"
    echo "1. 关闭不必要的应用程序释放内存"
    echo "2. 重启Docker Desktop"
    echo "3. 使用更轻量级的镜像: python:3.11-alpine"
    echo "4. 手动分批安装依赖:"
    echo "   - 基础依赖: pip install fastapi uvicorn sqlalchemy"
    echo "   - 数据依赖: pip install pandas numpy"
    echo "   - 服务依赖: pip install redis celery"
    exit 1
fi

echo ""
echo "================================"
echo "  构建完成"
echo "================================"
echo "使用新镜像更新Dockerfile.base中的FROM指令："
echo "FROM fund-monitor-python:optimized AS fund-monitor-base"
