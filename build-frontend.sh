#!/bin/bash

echo "🚀 开始构建前端应用..."

# 检查 Node.js 版本
echo "Node.js 版本: $(node --version)"

# 进入前端目录
cd frontend/angular-app

# 创建简单的dist目录用于复制构建结果
mkdir -p dist-simple

# 构建应用到临时目录
echo "📦 构建Angular应用..."
npm run build --prod --output-path=dist-simple --base-href /

# 检查构建结果
if [ -d "dist-simple" ]; then
    echo "✅ 构建成功！"
    echo "构建产物位置: frontend/angular-app/dist-simple/"
    echo "文件列表:"
    ls -la dist-simple/
else
    echo "❌ 构建失败"
    exit 1
fi

echo "🎉前端构建完成！"