#!/bin/bash
# Docker 镜像拉取问题修复脚本

echo "=== Docker 镜像拉取问题修复 ==="
echo ""

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
  echo "❌ 错误：Docker 未运行，请启动 Docker Desktop"
  exit 1
fi

# 方案1：配置镜像加速器
echo "📦 配置 Docker 镜像加速器..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  echo "请手动配置 Docker Desktop:"
  echo "1. 打开 Docker Desktop"
  echo "2. Settings > Docker Engine"
  echo "3. 添加以下配置并点击 'Apply & Restart':"
  echo '  {'
  echo '    "registry-mirrors": ['
  echo '      "https://docker.mirrors.ustc.edu.cn",'
  echo '      "https://hub-mirror.c.163.com",'
  echo '      "https://mirror.baidubce.com"'
  echo '    ]'
  echo '  }'
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  sudo mkdir -p /etc/docker
  sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ]
}
EOF
  echo "✅ Linux 配置已保存到 /etc/docker/daemon.json"
  echo "请运行: sudo systemctl restart docker"
fi

echo ""
echo "🔄 方案2：批量替换 Dockerfile 中的镜像..."
# 备份原文件
echo "📋 备份原有 Dockerfile..."
for file in Dockerfile.base backend/services/*/Dockerfile; do
  if [ -f "$file" ]; then
    cp "$file" "${file}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "  ✅ 备份: $file"
  fi
done

# 替换镜像
echo ""
echo "🔧 替换 python:3.11-slim 为 python:3.11..."
sed -i.tmp 's/python:3.11-slim/python:3.11/g' Dockerfile.base backend/services/*/Dockerfile
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS 需要不同的 sed 语法
  sed -i '' 's/python:3.11-slim/python:3.11/g' Dockerfile.base backend/services/*/Dockerfile
fi

# 清理临时文件
find . -name "*.tmp" -delete

echo "✅ 镜像替换完成"
echo ""
echo "🚀 现在可以重新构建："
echo "  docker-compose build"
echo ""
echo "⚠️  注意：如果仍有网络问题，请："
echo "  1. 重启 Docker Desktop"
echo "  2. 检查网络连接"
echo "  3. 使用 VPN（如果需要）"
