#!/bin/sh

# Docker 入口点脚本

set -e

# 函数：替换环境变量
envsubst() {
    python -c 'import sys, os; [sys.argv[1] in os.environ] and print(os.environ[sys.argv[1]]) or print(sys.argv[2])' "$@"
}

# 函数：替换配置文件中的环境变量
substitute_env_vars() {
    echo "替换配置文件中的环境变量..."

    # 替换 nginx.conf 中的环境变量
    if [ -f /etc/nginx/nginx.conf ]; then
        sed -i "s|\\${API_BASE_URL:-http://backend:8000}|$(envsubst API_BASE_URL http://backend:8000)|g" /etc/nginx/nginx.conf
        sed -i "s|\\${WS_URL:-ws://backend:8000}|$(envsubst WS_URL ws://backend:8000)|g" /etc/nginx/nginx.conf
        echo "环境变量替换完成"
    else
        echo "警告: nginx.conf 文件不存在"
    fi
}

# 函数：验证配置
validate_config() {
    echo "验证 nginx 配置..."
    nginx -t
}

# 函数：启动 nginx
start_nginx() {
    echo "启动 nginx..."
    exec nginx -g "daemon off;"
}

# 主执行流程
echo "=== Angular 应用 Docker 入口点 ==="
echo "容器启动时间: $(date)"
echo "NODE_ENV: ${NODE_ENV:-development}"
echo "用户: $(whoami)"
echo "工作目录: $(pwd)"

# 显示容器信息
echo "=== 容器信息 ==="
echo "主机名: $(hostname)"
echo "IP 地址: $(hostname -I | awk '{print $1}')"
echo "操作系统: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '"')"
echo "内核版本: $(uname -r)"

# 显示磁盘空间
echo "=== 磁盘空间 ==="
df -h

# 显示内存使用
echo "=== 内存使用 ==="
free -h

# 检查必要文件
echo "=== 文件检查 ==="
if [ -f /usr/share/nginx/html/index.html ]; then
    echo "✓ index.html 存在"
    echo "文件大小: $(du -h /usr/share/nginx/html/index.html)"
else
    echo "✗ index.html 不存在"
    exit 1
fi

if [ -f /etc/nginx/nginx.conf ]; then
    echo "✓ nginx.conf 存在"
else
    echo "✗ nginx.conf 不存在"
    exit 1
fi

# 列出应用文件
echo "=== 应用文件 ==="
ls -la /usr/share/nginx/html/

# 显示端口信息
echo "=== 端口信息 ==="
echo "监听端口: $(netstat -tlnp | grep nginx || echo '未找到 nginx 进程')"

# 设置权限
echo "=== 设置权限 ==="
chown -R nginx:nginx /usr/share/nginx/html
chown -R nginx:nginx /var/cache/nginx
chown -R nginx:nginx /var/log/nginx
chown -R nginx:nginx /var/run

# 创建必要的目录
echo "=== 创建目录 ==="
mkdir -p /var/cache/nginx /var/log/nginx /var/run/nginx.pid
chown -R nginx:nginx /var/cache/nginx /var/log/nginx /var/run

# 替换环境变量
substitute_env_vars

# 验证配置
validate_config

# 显示 nginx 版本
echo "=== Nginx 版本 ==="
nginx -v

# 显示启动命令
echo "=== 启动命令 ==="
echo "nginx -g 'daemon off;'"

# 启动应用
echo "=== 启动应用 ==="
echo "应用将在 http://localhost:8080 上运行"
echo "按 Ctrl+C 停止应用"

# 捕获退出信号
trap 'echo "收到退出信号，正在关闭..."; exit 0' SIGTERM SIGINT

# 启动 nginx
start_nginx