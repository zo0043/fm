#!/bin/bash
# 快速修复Docker内存不足问题

set -e

echo "=================================================="
echo "  Docker内存不足问题 - 快速修复脚本"
echo "=================================================="
echo ""

# 检查系统内存
echo "步骤1: 检查系统资源..."
FREE_PAGES=$(vm_stat | grep "Pages free:" | awk '{print $3}' | tr -d '.')
FREE_MB=$((FREE_PAGES * 16 / 1024))
echo "可用内存: ${FREE_MB}MB"

if [ $FREE_MB -lt 500 ]; then
    echo "⚠️  可用内存严重不足！建议："
    echo "   - 关闭不必要的应用程序"
    echo "   - 重启Docker Desktop"
    echo "   - 调整Docker Desktop内存到6GB"
    echo ""
    read -p "是否继续尝试修复？ (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 清理Docker资源
echo ""
echo "步骤2: 清理Docker资源..."
docker system prune -f
docker builder prune -f
echo "✅ 清理完成"

# 备份原Dockerfile
echo ""
echo "步骤3: 备份原Dockerfile..."
if [ ! -f "Dockerfile.base.backup" ]; then
    cp Dockerfile.base Dockerfile.base.backup
    echo "✅ 备份保存为 Dockerfile.base.backup"
else
    echo "ℹ️  备份文件已存在"
fi

# 使用优化版本
echo ""
echo "步骤4: 应用内存优化方案..."
if [ -f "Dockerfile.base.memory-optimized" ]; then
    cp Dockerfile.base.memory-optimized Dockerfile.base
    echo "✅ 已应用分批安装优化"
else
    echo "❌ 优化文件不存在"
    exit 1
fi

# 提示用户设置
echo ""
echo "=================================================="
echo "  修复应用成功！"
echo "=================================================="
echo ""
echo "请执行以下步骤："
echo ""
echo "1. 设置Docker Desktop内存限制:"
echo "   - 打开Docker Desktop"
echo "   - Settings > Resources > Memory"
echo "   - 设置为 6GB 或更高"
echo ""
echo "2. 重启Docker Desktop"
echo ""
echo "3. 构建镜像:"
echo "   docker build -f Dockerfile.base.memory-optimized \\"
echo "       -t fund-monitor-python:optimized ."
echo ""
echo "4. 或使用快速构建脚本:"
echo "   ./build-with-memory-limit.sh"
echo ""
echo "=================================================="
echo ""
echo "如遇问题，请参考: DOCKER_MEMORY_FIX_SUMMARY.md"
echo ""
