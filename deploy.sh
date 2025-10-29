#!/bin/bash

# 基金监控应用部署脚本

set -e

# 颜色输出
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
    log_info "检查依赖..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi

    if ! command -v make &> /dev/null; then
        log_error "Make 未安装，请先安装 Make"
        exit 1
    fi

    log_success "依赖检查通过"
}

# 初始化项目
init_project() {
    log_info "初始化项目..."

    # 创建必要的目录
    mkdir -p logs backups
    mkdir -p infrastructure/{nginx,postgres,redis,influxdb,traefik}

    # 复制环境变量文件
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            log_info "已复制 .env.example 到 .env"
            log_warning "请编辑 .env 文件配置环境变量"
        else
            log_error ".env.example 文件不存在"
            exit 1
        fi
    fi

    # 创建 SSL 目录（生产环境需要）
    if [ "$ENVIRONMENT" = "production" ]; then
        mkdir -p infrastructure/ssl
        log_warning "生产环境需要 SSL 证书，请将证书文件放在 infrastructure/ssl/ 目录下"
    fi

    log_success "项目初始化完成"
}

# 构建镜像
build_images() {
    log_info "构建 Docker 镜像..."

    if [ "$ENVIRONMENT" = "development" ]; then
        make build-dev
    else
        make build-prod
    fi

    log_success "镜像构建完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."

    if [ "$ENVIRONMENT" = "development" ]; then
        make dev
        log_success "开发环境已启动"
        log_info "前端应用: http://localhost:4200"
        log_info "API 服务: http://localhost:8000"
    else
        make prod
        log_success "生产环境已启动"
        log_info "应用地址: http://localhost"
    fi
}

# 停止服务
stop_services() {
    log_info "停止服务..."

    if [ "$ENVIRONMENT" = "development" ]; then
        make stop-dev
    else
        make stop-prod
    fi

    log_success "服务已停止"
}

# 查看日志
show_logs() {
    log_info "显示服务日志..."

    if [ "$ENVIRONMENT" = "development" ]; then
        make logs-dev
    else
        make logs-prod
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."

    # 检查容器状态
    if [ "$ENVIRONMENT" = "development" ]; then
        FRONTEND_CONTAINER="fund-monitor-frontend-dev"
    else
        FRONTEND_CONTAINER="fund-monitor-frontend-prod"
    fi

    if docker ps --filter "name=$FRONTEND_CONTAINER" --format "table {{.Names}}" | grep -q "$FRONTEND_CONTAINER"; then
        log_success "前端容器运行正常"

        # 检查服务响应
        if [ "$ENVIRONMENT" = "development" ]; then
            if curl -f http://localhost:4200/health >/dev/null 2>&1; then
                log_success "前端服务健康检查通过"
            else
                log_warning "前端服务健康检查失败"
            fi
        else
            if curl -f http://localhost/health >/dev/null 2>&1; then
                log_success "前端服务健康检查通过"
            else
                log_warning "前端服务健康检查失败"
            fi
        fi
    else
        log_error "前端容器未运行"
        exit 1
    fi
}

# 主函数
main() {
    # 设置默认环境
    ENVIRONMENT=${ENVIRONMENT:-development}

    # 解析命令行参数
    case "${1:-help}" in
        "help"|"-h"|"--help")
            echo "基金监控应用部署脚本"
            echo ""
            echo "用法: $0 [命令] [选项]"
            echo ""
            echo "命令:"
            echo "  init      初始化项目"
            echo "  build     构建镜像"
            "  start     启动服务"
            "  stop      停止服务"
            "  restart   重启服务"
            "  logs      查看日志"
            "  health    健康检查"
            "  status    查看状态"
            "  clean     清理资源"
            ""
            echo "选项:"
            "  --prod    使用生产环境配置 (默认: 开发环境)"
            "  --dev     使用开发环境配置"
            ""
            echo "示例:"
            echo "  $0 init --dev     # 开发环境初始化"
            "  $0 build --prod    # 生产环境构建"
            "  $0 start --prod    # 生产环境启动"
            echo ""
            exit 0
            ;;
        "init")
            check_dependencies
            init_project
            ;;
        "build")
            check_dependencies
            build_images
            ;;
        "start")
            check_dependencies
            init_project
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            stop_services
            sleep 2
            start_services
            ;;
        "logs")
            show_logs
            ;;
        "health")
            health_check
            ;;
        "status")
            make status
            ;;
        "clean")
            make clean
            docker-clean
            ;;
        "--prod")
            export ENVIRONMENT=production
            log_info "切换到生产环境"
            ;;
        "--dev")
            export ENVIRONMENT=development
            log_info "切换到开发环境"
            ;;
        *)
            log_error "未知命令: $1"
            echo "使用 '$0 --help' 查看帮助信息"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"