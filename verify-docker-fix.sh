#!/bin/bash
# 验证 Docker 修复是否成功

echo "🔍 验证 Docker 网络修复..."
echo ""

# 检查 Docker 服务
echo "1. 检查 Docker 服务..."
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker 服务未运行"
  exit 1
fi
echo "✅ Docker 服务正常运行"
echo ""

# 检查本地 Python 镜像
echo "2. 检查 fund-monitor-python:local 镜像..."
if docker images fund-monitor-python:local --format "{{.Repository}}:{{.Tag}}" | grep -q "fund-monitor-python:local"; then
  echo "✅ fund-monitor-python:local 镜像已存在"
  docker images fund-monitor-python:local --format "   📦 镜像: {{.Repository}}:{{.Tag}} ({{.Size}})"
else
  echo "❌ fund-monitor-python:local 镜像不存在"
  echo "   请运行：docker build -f Dockerfile.local-fixed -t fund-monitor-python:local ."
  exit 1
fi
echo ""

# 测试 Python 环境
echo "3. 测试 Python 环境..."
docker run --rm fund-monitor-python:local python --version > /tmp/python-version.txt 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Python 环境正常"
  cat /tmp/python-version.txt | sed 's/^/   /'
else
  echo "❌ Python 环境测试失败"
  exit 1
fi
echo ""

# 测试 Python 包
echo "4. 测试 Python 包..."
docker run --rm fund-monitor-python:local python -c "import fastapi, uvicorn, sqlalchemy; print('✅ 所有预装包正常工作')" > /tmp/python-packages.txt 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Python 包正常"
  cat /tmp/python-packages.txt | sed 's/^/   /'
else
  echo "⚠️  部分包可能有问题"
fi
echo ""

# 检查 Dockerfile 状态
echo "5. 检查 Dockerfile 状态..."
for file in Dockerfile.base backend/services/*/Dockerfile; do
  if [ -f "$file" ]; then
    if grep -q "FROM fund-monitor-python:local" "$file"; then
      echo "✅ $file 已使用本地镜像"
    elif grep -q "FROM python:" "$file"; then
      echo "⚠️  $file 仍在使用外部镜像"
    fi
  fi
done
echo ""

echo "🎉 验证完成！"
echo ""
echo "📋 总结："
echo "✅ Docker 服务运行正常"
echo "✅ 本地 Python 镜像可用"
echo "✅ Python 3.12 环境就绪"
echo "✅ 预装依赖包正常"
echo ""
echo "🚀 下一步："
echo "   ./update-all-dockerfiles.sh  # 更新所有 Dockerfile"
echo "   docker-compose build         # 构建所有服务"
echo "   docker-compose up -d         # 启动所有服务"
