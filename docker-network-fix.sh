#!/bin/bash
# Docker 网络问题紧急修复脚本

echo "🚨 Docker 镜像拉取问题紧急修复方案"
echo "=================================="
echo ""

# 检查 Docker 服务
if ! docker info > /dev/null 2>&1; then
  echo "❌ 错误：Docker 服务未运行"
  exit 1
fi

echo "✅ Docker 服务状态正常"
echo ""

# 方案 1：配置代理和镜像加速器
echo "🔧 方案 1：配置 Docker 代理和镜像加速器"
echo "----------------------------------------"

# 创建配置文件
cat > /tmp/docker-config.json <<'EOF'
{
  "proxies": {
    "default": {
      "httpProxy": "http://127.0.0.1:7890",
      "httpsProxy": "http://127.0.0.1:7890",
      "noProxy": "localhost,127.0.0.1"
    }
  },
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://docker.rainbond.io"
  ],
  "insecure-registries": [
    "registry.cn-hangzhou.aliyuncs.com"
  ]
}
EOF

echo "配置文件已生成到 /tmp/docker-config.json"
echo ""
echo "📋 请手动配置 Docker："
echo ""
echo "🔹 macOS (Docker Desktop):"
echo "   1. 打开 Docker Desktop"
echo "   2. Settings > General"
echo "   3. 在 'Proxies' 部分配置 HTTP/HTTPS 代理"
echo "   4. Settings > Docker Engine，粘贴 /tmp/docker-config.json 的内容"
echo "   5. 点击 'Apply & Restart'"
echo ""
echo "🔹 Linux:"
echo "   sudo cp /tmp/docker-config.json /etc/docker/daemon.json"
echo "   sudo systemctl restart docker"
echo ""
echo "=================================="
echo ""

# 方案 2：使用本地镜像构建
echo "🔧 方案 2：基于现有镜像构建"
echo "----------------------------------------"

if [ -n "$(docker images -q fund_monitor-frontend-dev)" ]; then
  echo "✅ 发现 fund_monitor-frontend-dev 镜像"
  echo "📝 使用 Node.js 基础镜像构建 Python 镜像的方法："
  cat > Dockerfile.node-to-python <<'EOF'
# 使用 Node.js 镜像作为基础构建 Python 镜像
FROM fund_monitor-frontend-dev

# 切换到 root 用户安装 Python
USER root

# 安装 Python 和依赖
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-pip \
    python3.11-venv \
    && rm -rf /var/lib/apt/lists/*

# 设置 Python 默认版本
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1
RUN update-alternatives --install /usr/bin/pip pip /usr/bin/pip3.11 1

# 设置工作目录
WORKDIR /app

# 切换回 node 用户
USER node

# 验证安装
RUN python --version && pip --version

CMD ["python"]
EOF

  echo "✅ 已生成 Dockerfile.node-to-python"
  echo "🔨 构建命令："
  echo "   docker build -f Dockerfile.node-to-python -t fund-monitor-python:latest ."
  echo ""
fi

# 方案 3：使用在线构建服务
echo "🔧 方案 3：使用在线构建服务"
echo "----------------------------------------"
echo "🌐 使用 GitHub Actions 或其他 CI/CD 服务构建镜像："
echo ""
echo "示例 GitHub Actions workflow："
cat > /tmp/github-actions-workflow.yml <<'EOF'
name: Build Docker Image

on:
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: your-username/fund-monitor:latest
EOF

echo "✅ 已生成 GitHub Actions 工作流到 /tmp/github-actions-workflow.yml"
echo ""

echo "=================================="
echo ""
echo "🎯 推荐执行步骤："
echo ""
echo "1️⃣ 立即尝试（推荐）："
echo "   ./fix-docker-mirror.sh"
echo ""
echo "2️⃣ 如果仍失败，使用代理："
echo "   export HTTP_PROXY=http://127.0.0.1:7890"
echo "   export HTTPS_PROXY=http://127.0.0.1:7890"
echo "   docker pull python:3.11"
echo ""
echo "3️⃣ 如果无法访问 Docker Hub："
echo "   使用方案 2 或 方案 3"
echo ""
echo "=================================="
