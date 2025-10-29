#!/bin/bash

# 基金监控应用开发环境停止脚本

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

# 停止服务
stop_service() {
    local pid_file=$1
    local service_name=$2

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            log_info "停止 $service_name (PID: $pid)..."
            kill -TERM $pid

            # 等待进程正常退出
            local count=0
            while ps -p $pid > /dev/null 2>&1 && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done

            # 如果进程仍在运行，强制杀死
            if ps -p $pid > /dev/null 2>&1; then
                log_warning "强制停止 $service_name"
                kill -KILL $pid
            fi

            log_success "$service_name 已停止"
        else
            log_warning "$service_name 进程不存在"
        fi

        rm -f "$pid_file"
    else
        log_warning "$service_name PID文件不存在"
    fi
}

# 停止所有后端服务
stop_backend_services() {
    log_info "停止后端服务..."

    stop_service "logs/auth.pid" "认证服务"
    stop_service "logs/data_collector.pid" "数据收集服务"
    stop_service "logs/monitor_engine.pid" "监控引擎服务"
    stop_service "logs/notification.pid" "通知服务"
    stop_service "logs/backtest.pid" "回测服务"

    log_success "后端服务停止完成"
}

# 停止前端服务
stop_frontend_service() {
    log_info "停止前端服务..."

    # 查找并停止Angular开发服务器
    local angular_pids=$(ps aux | grep "ng serve" | grep -v grep | awk '{print $2}')
    if [ -n "$angular_pids" ]; then
        log_info "停止Angular开发服务器..."
        echo "$angular_pids" | xargs kill -TERM 2>/dev/null || true
        log_success "Angular开发服务器已停止"
    fi

    # 查找并停止Node.js进程（4200端口）
    local node_pids=$(lsof -ti:4200 2>/dev/null)
    if [ -n "$node_pids" ]; then
        log_info "停止端口4200上的Node.js进程..."
        echo "$node_pids" | xargs kill -TERM 2>/dev/null || true
        log_success "Node.js进程已停止"
    fi

    # 清理PID文件
    rm -f "logs/frontend.pid"
}

# 清理资源
cleanup_resources() {
    log_info "清理资源..."

    # 清理临时文件
    rm -f /tmp/auth_test.json /tmp/fund_test.json

    # 清理可能的Python缓存
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find . -name "*.pyc" -delete 2>/dev/null || true

    log_success "资源清理完成"
}

# 显示停止状态
show_stop_status() {
    log_info "所有服务已停止"
    echo ""
    echo "如需重新启动，请运行："
    echo "  ./start-dev-environment.sh"
    echo ""
    echo "查看日志文件："
    echo "  tail -f logs/auth.log"
    echo "  tail -f logs/data_collector.log"
    echo "  tail -f logs/monitor_engine.log"
    echo "  tail -f logs/notification.log"
    echo "  tail -f logs/backtest.log"
    echo "  tail -f logs/frontend.log"
}

# 主函数
main() {
    log_info "停止基金监控应用开发环境..."

    stop_backend_services
    stop_frontend_service
    cleanup_resources
    show_stop_status

    log_success "开发环境已完全停止！"
}

# 运行主函数
main "$@"