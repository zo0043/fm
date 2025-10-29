#!/bin/bash

# 基金监控应用开发环境启动脚本
# 用于端到端联调测试

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."

    # 检查Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python3 未安装，请先安装Python 3.11+"
        exit 1
    fi

    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装Node.js 18+"
        exit 1
    fi

    # 检查npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装，请先安装npm"
        exit 1
    fi

    # 检查PostgreSQL
    if ! command -v psql &> /dev/null; then
        log_warning "PostgreSQL 未安装，请确保PostgreSQL正在运行"
    fi

    # 检查Redis
    if ! command -v redis-cli &> /dev/null; then
        log_warning "Redis 未安装，请确保Redis正在运行"
    fi

    log_success "依赖检查完成"
}

# 安装Python依赖
install_python_deps() {
    log_info "安装Python依赖..."

    if [ ! -f "requirements.txt" ]; then
        log_warning "requirements.txt 不存在，跳过Python依赖安装"
        return
    fi

    # 创建虚拟环境（如果不存在）
    if [ ! -d "venv" ]; then
        log_info "创建Python虚拟环境..."
        python3 -m venv venv
    fi

    # 激活虚拟环境并安装依赖
    source venv/bin/activate
    pip install -r requirements.txt

    log_success "Python依赖安装完成"
}

# 安装前端依赖
install_frontend_deps() {
    log_info "安装前端依赖..."

    if [ ! -d "frontend/angular-app" ]; then
        log_error "前端目录不存在"
        exit 1
    fi

    cd frontend/angular-app
    npm install
    cd ../..

    log_success "前端依赖安装完成"
}

# 启动数据库服务
start_databases() {
    log_info "启动数据库服务..."

    # 启动PostgreSQL (如果通过brew安装)
    if command -v brew &> /dev/null && brew services list | grep postgresql &> /dev/null; then
        brew services start postgresql || log_warning "PostgreSQL 启动失败"
    fi

    # 启动Redis (如果通过brew安装)
    if command -v brew &> /dev/null && brew services list | redis &> /dev/null; then
        brew services start redis || log_warning "Redis 启动失败"
    fi

    log_success "数据库服务启动完成"
}

# 初始化数据库
init_database() {
    log_info "初始化数据库..."

    # 检查数据库连接
    if ! psql -h localhost -U postgres -d fund_monitor -c "SELECT 1;" &> /dev/null; then
        log_warning "数据库连接失败，尝试创建数据库..."
        createdb -h localhost -U postgres fund_monitor || log_warning "数据库创建失败"
    fi

    # 运行数据库迁移
    source venv/bin/activate
    python -c "
from shared.database import init_db
import asyncio

async def init():
    await init_db()
    print('数据库初始化完成')

asyncio.run(init())
" || log_warning "数据库初始化失败"

    log_success "数据库初始化完成"
}

# 启动后端服务
start_backend_services() {
    log_info "启动后端服务..."

    # 创建日志目录
    mkdir -p logs

    # 启动认证服务 (端口 8000)
    source venv/bin/activate
    nohup python -m backend.services.auth.main > logs/auth.log 2>&1 &
    echo $! > logs/auth.pid
    log_info "认证服务启动在端口 8000"

    # 启动数据收集服务 (端口 8001)
    nohup python -m backend.services.data_collector.main > logs/data_collector.log 2>&1 &
    echo $! > logs/data_collector.pid
    log_info "数据收集服务启动在端口 8001"

    # 启动监控引擎服务 (端口 8002)
    nohup python -m backend.services.monitor_engine.main > logs/monitor_engine.log 2>&1 &
    echo $! > logs/monitor_engine.pid
    log_info "监控引擎服务启动在端口 8002"

    # 启动通知服务 (端口 8003)
    nohup python -m backend.services.notification.main > logs/notification.log 2>&1 &
    echo $! > logs/notification.pid
    log_info "通知服务启动在端口 8003"

    # 启动回测服务 (端口 8004)
    nohup python -m backend.services.backtest.main > logs/backtest.log 2>&1 &
    echo $! > logs/backtest.pid
    log_info "回测服务启动在端口 8004"

    log_success "后端服务启动完成"
}

# 启动前端服务
start_frontend_service() {
    log_info "启动前端服务..."

    cd frontend/angular-app

    # 构建前端
    npm run build --prod || log_warning "前端构建失败"

    # 启动开发服务器
    nohup npm start > ../logs/frontend.log 2>&1 &
    echo $! > ../logs/frontend.pid

    cd ../..

    log_success "前端服务启动完成 (端口 4200)"
}

# 等待服务启动
wait_for_services() {
    log_info "等待服务启动..."

    # 等待后端服务启动
    local services=(
        "http://localhost:8000/health:认证服务"
        "http://localhost:8001/:数据收集服务"
        "http://localhost:8002/:监控引擎服务"
        "http://localhost:8003/api/v1/status:通知服务"
        "http://localhost:8004/:回测服务"
    )

    for service in "${services[@]}"; do
        local url=$(echo $service | cut -d: -f1)
        local name=$(echo $service | cut -d: -f2)

        log_info "等待 $name 启动..."
        local count=0
        while ! curl -s "$url" > /dev/null && [ $count -lt 30 ]; do
            sleep 2
            count=$((count + 1))
        done

        if [ $count -eq 30 ]; then
            log_error "$name 启动超时"
        else
            log_success "$name 已启动"
        fi
    done

    # 等待前端服务启动
    log_info "等待前端服务启动..."
    local count=0
    while ! curl -s "http://localhost:4200" > /dev/null && [ $count -lt 60 ]; do
        sleep 2
        count=$((count + 1))
    done

    if [ $count -eq 60 ]; then
        log_warning "前端服务启动超时"
    else
        log_success "前端服务已启动"
    fi
}

# 运行基本测试
run_basic_tests() {
    log_info "运行基本联调测试..."

    # 测试认证服务
    log_info "测试认证服务..."
    curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
         -H "Content-Type: application/json" \
         -d '{"username": "admin", "password": "admin123456"}' \
         > /tmp/auth_test.json

    if grep -q "access_token" /tmp/auth_test.json; then
        log_success "认证服务测试通过"
    else
        log_error "认证服务测试失败"
        cat /tmp/auth_test.json
    fi

    # 测试基金服务
    log_info "测试基金服务..."
    curl -s "http://localhost:8001/funds?page=1&size=5" \
         -H "Authorization: Bearer $(cat /tmp/auth_test.json | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)" \
         > /tmp/fund_test.json

    if grep -q "data" /tmp/fund_test.json; then
        log_success "基金服务测试通过"
    else
        log_error "基金服务测试失败"
        cat /tmp/fund_test.json
    fi

    # 清理测试文件
    rm -f /tmp/auth_test.json /tmp/fund_test.json
}

# 显示服务状态
show_status() {
    log_info "服务状态："
    echo ""
    echo "后端服务："
    echo "  认证服务:     http://localhost:8000"
    echo "  数据收集服务:  http://localhost:8001"
    echo "  监控引擎服务:  http://localhost:8002"
    echo "  通知服务:     http://localhost:8003"
    echo "  回测服务:     http://localhost:8004"
    echo ""
    echo "前端服务："
    echo "  Web应用:      http://localhost:4200"
    echo ""
    echo "默认管理员账户："
    echo "  用户名: admin"
    echo "  密码:   admin123456"
    echo ""
    echo "日志文件："
    echo "  后端日志: logs/"
    echo "  前端日志: logs/frontend.log"
    echo ""
    echo "停止服务命令："
    echo "  ./stop-dev-environment.sh"
}

# 主函数
main() {
    log_info "启动基金监控应用开发环境..."

    check_dependencies
    install_python_deps
    install_frontend_deps
    start_databases
    init_database
    start_backend_services
    start_frontend_service
    wait_for_services
    run_basic_tests
    show_status

    log_success "开发环境启动完成！"
    log_info "按 Ctrl+C 停止所有服务"

    # 等待用户中断
    trap 'log_info "正在停止服务..."; ./stop-dev-environment.sh; exit 0' INT
    while true; do
        sleep 1
    done
}

# 运行主函数
main "$@"