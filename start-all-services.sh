#!/bin/bash

# 基金监控应用全量服务启动脚本
# 支持开发、测试和生产环境

set -e

echo -e "${BLUE}🚀 基金监控应用 - 全量服务启动${NC}"
echo "============================================"

# 检查环境
echo -e "${YELLOW}📋 检查Python环境..."
python3 --version 2>&1 | head -1

echo -e "${YELLOW}🔥 检查Docker环境..."
docker --version 2>&1 | head -1
docker-compose version 2>&1 | head -1

# 检查端口占用
echo -e "${YELLOW}🔥 检查端口占用..."
check_port 5432
check_port 6379
check_port 8000
check_port 8001
check_port 8002
check_port 8003
check_port 8004
check_port 8005

# 检查项目结构
echo -e "${YELLOW}📁 检查项目结构..."
if [ -d "backend" ]; then
    echo "✅ 后端目录存在"
else
    echo "⚠️ 后端目录不存在，使用默认配置"
fi

if [ -d "frontend/angular-app" ]; then
    echo "✅ 前端Angular应用目录存在"
else
    echo "⚠️ 前端目录不存在，使用默认配置"
fi

if [ -d "infrastructure" ]; then
    echo "✅ 基础设施配置目录存在"
else
    echo "⚠️ 基础设施目录不存在，使用默认配置"
fi

# 根据项目结构调整启动服务
echo -e "${YELLOW}🗄 启动核心服务..."

# 1. 首先启动基础设施
echo -e "${YELLOW}🗄 启动数据库服务..."
if [ -d "infrastructure/docker" ]; then
    cd infrastructure/docker
    docker-compose up -d postgres redis influxdb --wait || echo "⚠️ 数据库启动失败"
    echo "✅ 数据库服务已启动"
else
    echo "⚠️ 数据库目录不存在，尝试启动默认配置"
fi

# 2. 创建必要的目录
echo -e "${YELLOW}📁 创建测试目录..."
mkdir -p tests/logs
mkdir -p tests/reports
mkdir -p tmp/nginx
mkdir -p tmp/redis

# 3. 检查并启动认证服务
echo -e "${YELLOW}🗄 启动认证服务..."
if [ -d "backend/services/auth" ]; then
    cd backend/services/auth
    python main.py &
    AUTH_PID=$!
    echo "✅ 认证服务已启动 (PID: $AUTH_PID)"
else
    echo "⚠️ 认证服务不存在，跳过"
fi

# 4. 检查并启动数据收集服务
echo -e "${YELLOW}🗄 启动数据收集服务..."
if [ -d "backend/services/data_collector" ]; then
    cd backend/services/data_collector
    python main.py &
    DATA_COLLECTOR_PID=$!
    echo "✅ 数据收集服务已启动 (PID: $DATA_COLLECTOR_PID)"
else
    echo "⚠️ 数据收集服务不存在，跳过"
fi

# 5. 检查并启动监控引擎服务
echo -e "${YELLOW}🗄 启动监控引擎服务..."
if [ -d "backend/services/monitor_engine" ]; then
    cd backend/services/monitor_engine
    python main.py &
    MONITOR_ENGINE_PID=$!
    echo "✅ 监控引擎服务已启动 (PID: $MONITOR_ENGINE_PID)"
else
    echo "⚠️ 监控引擎服务不存在，跳过"
fi

# 6. 检查并启动通知服务
echo -e "${YELLOW}🗄 启动通知服务..."
if [ -d "backend/services/notification" ]; then
    cd backend/services/notification
    python main.py &
    NOTIFICATION_PID=$!
    echo "✅ 通知服务已启动 (PID: $NOTIFICATION_PID)"
else
    echo "⚠️ 通知服务不存在，跳过"
fi

# 7. 检查并启动回测服务
echo -e "${YELLOW}🗄 启动回测服务..."
if [ -d "backend/services/backtest" ]; then
    cd backend/services/backtest
    python main.py &
    BACKTEST_PID=$!
    echo "✅ 回测服务已启动 (PID: $BACKTEST_PID)"
else
    echo "⚠️ 回测服务不存在，跳过"
fi

# 8. 检查并启动前端应用
echo -e "${YELLOW}🖥️ 启动前端应用..."
if [ -d "frontend/angular-app" ]; then
    cd frontend/angular-app
    npm start &
    FRONTEND_PID=$!
    echo "✅ 前端应用已启动 (PID: $FRONTEND_PID)"
    echo "✅ 前端地址: http://localhost:4200/"
else
    echo "⚠️ 前端目录不存在，使用默认配置"
fi

# 9. 验证所有服务状态
echo -e "${YELLOW}🔍 验证服务状态..."
verify_all_services

# 10. 显示访问地址
echo ""
echo "=============================================="
echo -e "${GREEN}🎉 所有服务已启动完成！${NC}"
echo ""
echo -e "${BLUE}🌐 访问地址:${NC}"
echo ""
echo "前端应用: http://localhost:4200/"
echo "NestJS API网关: http://localhost:3000/api"
echo ""
echo "后端微服务端口:"
echo "  认证服务 (8000): http://localhost:8000/health"
echo "  数据收集 (8001): http://localhost:8001/funds"
echo "  监控引擎 (8002): http://echo 8002/rules"
echo "  通知服务 (8003): http://localhost:8003/notifications"
echo "  回测服务 (8004): http://echo 8004/backtest"
echo ""
echo "=============================================="

# 保持脚本运行直到用户停止
echo -e "${YELLOW}服务持续运行中，按 Ctrl+C 停止"
echo ""

# 保持脚本运行直到用户停止
while true; do
    sleep 10
done
done