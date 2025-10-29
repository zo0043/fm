# 基金监控应用 Makefile

.PHONY: help build dev prod clean test lint logs stop logs-dev logs-prod docker-clean docker-prune

# 默认目标
help: ## 显示帮助信息
	@echo "可用命令:"
	@echo ""
	@echo "开发环境:"
	@echo "  make dev           - 启动开发环境"
	@echo "  make build-dev     - 构建开发镜像"
	@echo "  make stop-dev      - 停止开发环境"
	@echo "  make logs-dev      - 查看开发环境日志"
	@echo ""
	@echo "生产环境:"
	@echo "  make prod          - 启动生产环境"
	@echo "  make build-prod    - 构建生产镜像"
	echo "  make stop-prod     - 停止生产环境"
	@echo "  make logs-prod     - 查看生产环境日志"
	@echo ""
	@echo "通用命令:"
	@echo "  make build         - 构建应用"
	@echo "  make test          - 运行测试"
	@echo "  make lint          - 代码检查"
	@echo "  make clean         - 清理构建文件"
	@echo "  make logs          - 查看所有日志"
	@echo "  make stop          - 停止所有服务"
	@echo ""
	@echo "Docker 命令:"
	@echo "  make docker-clean  - 清理 Docker 容器和镜像"
	@echo "  make docker-prune  - 清理未使用的 Docker 资源"

# ================================
# 开发环境命令
# ================================

dev: ## 启动开发环境
	@echo "🚀 启动开发环境..."
	@docker-compose -f docker-compose.dev.yml --profile dev up -d
	@echo "开发环境已启动!"
	@echo "前端应用: http://localhost:4200"
	@echo "API 服务: http://localhost:8000"
	@echo ""
	@echo "查看日志: make logs-dev"
	@echo "停止服务: make stop-dev"

build-dev: ## 构建开发镜像
	@echo "🔨 构建开发镜像..."
	@docker-compose -f docker-compose.dev.yml build --no-cache
	@echo "开发镜像构建完成!"

stop-dev: ## 停止开发环境
	@echo "🛑 停止开发环境..."
	@docker-compose -f docker-compose.dev.yml down
	@echo "开发环境已停止"

logs-dev: ## 查看开发环境日志
	@docker-compose -f docker-compose.dev.yml logs -f

# ================================
# 生产环境命令
# ================================

prod: ## 启动生产环境
	@echo "🚀 启动生产环境..."
	@if [ ! -f .env ]; then \
		echo "⚠️  未找到 .env 文件，复制 .env.example 到 .env"; \
		cp .env.example .env; \
		echo "请编辑 .env 文件设置生产环境配置，然后重新运行 make prod"; \
		exit 1; \
	fi
	@docker-compose -f docker-compose.prod.yml --profile prod up -d
	@echo "生产环境已启动!"
	@echo "应用地址: http://localhost"
	@echo ""
	@echo "查看日志: make logs-prod"
	@echo "停止服务: make stop-prod"

build-prod: ## 构建生产镜像
	@echo "🔨 构建生产镜像..."
	@docker-compose -f docker-compose.prod.yml build --no-cache
	@echo "生产镜像构建完成!"

stop-prod: ## 停止生产环境
	@echo "🛑 停止生产环境..."
	@docker-compose -f docker-compose.prod.yml down
	@echo "生产环境已停止"

logs-prod: ## 查看生产环境日志
	@docker-compose -f docker-compose.prod.yml logs -f

# ================================
# 通用命令
# ================================

build: ## 构建应用
	@echo "🔨 构建应用..."
	@cd frontend/angular-app && npm install && npm run build --prod
	@echo "应用构建完成!"

test: ## 运行测试
	@echo "🧪 运行测试..."
	@cd frontend/angular-app && npm run test -- --watch=false --browsers=ChromeHeadless --code-coverage
	@echo "测试完成!"

lint: ## 代码检查
	@echo "🔍 代码检查..."
	@cd frontend/angular-app && npm run lint
	@echo "代码检查完成!"

clean: ## 清理构建文件
	@echo "🧹 清理构建文件..."
	@cd frontend/angular-app && rm -rf dist node_modules/.angular
	@echo "构建文件已清理!"

logs: ## 查看所有日志
	@echo "📋 查看所有服务日志..."
	@docker-compose -f docker-compose.dev.yml logs -f 2>/dev/null || \
	@docker-compose -f docker-compose.prod.yml logs -f 2>/dev/null || \
	@echo "没有运行的服务"

stop: ## 停止所有服务
	@echo "🛑 停止所有服务..."
	@docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
	@docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
	@echo "所有服务已停止"

# ================================
# Docker 管理命令
# ================================

docker-clean: ## 清理 Docker 容器和镜像
	@echo "🧹 清理 Docker 容器和镜像..."
	@docker-compose -f docker-compose.dev.yml down --volumes 2>/dev/null || true
	@docker-compose -f docker-compose.prod.yml down --volumes 2>/dev/null || true
	@echo "Docker 容器已清理"

docker-prune: ## 清理未使用的 Docker 资源
	@echo "🧹 清理未使用的 Docker 资源..."
	@docker system prune -f
	@echo "Docker 资源已清理"

# ================================
# 开发工具命令
# ================================

install: ## 安装依赖
	@echo "📦 安装依赖..."
	@cd frontend/angular-app && npm install
	@echo "依赖安装完成!"

dev-server: ## 启动开发服务器
	@echo "🚀 启动开发服务器..."
	@cd frontend/angular-app && npm start

prod-build: ## 生产构建
	@echo "🔨 生产构建..."
	@cd frontend/angular-app && npm run build --prod

analyze: ## 分析构建结果
	@echo "📊 分析构建结果..."
	@cd frontend/angular-app && npm run build --prod --stats-json
	@echo "分析完成，请查看 dist/stats.json 文件"

# ================================
# 部署命令
# ================================

deploy-dev: ## 部署到开发环境
	@echo "🚀 部署到开发环境..."
	@make build-dev
	@make dev

deploy-prod: ## 部署到生产环境
	@echo "🚀 部署到生产环境..."
	@make build-prod
	@make prod

# ================================
# 监控命令
# ================================

status: ## 查看服务状态
	@echo "📊 查看服务状态..."
	@docker-compose -f docker-compose.dev.yml ps 2>/dev/null || \
	@docker-compose -f docker-compose.prod.yml ps 2>/dev/null || \
	@echo "没有运行的服务"

health: ## 检查服务健康状态
	@echo "🏥 检查服务健康状态..."
	@docker-compose -f docker-compose.dev.yml exec frontend-dev curl -f http://localhost:4200/health 2>/dev/null || \
	@echo "前端服务未运行或不健康"
	@docker-compose -f docker-compose.prod.yml exec frontend-prod curl -f http://localhost/health 2>/dev/null || \
	@echo "前端服务未运行或不健康"

# ================================
# 备份命令
# ================================

backup: ## 备份数据
	@echo "💾 备份数据..."
	@mkdir -p ./backups
	@docker exec fund-monitor-postgres-prod pg_dump -U postgres fund_monitor > ./backups/postgres-$(shell date +%Y%m%d-%H%M%S).sql
	@echo "数据备份完成!"

# ================================
# 初始化命令
# ================================

init: ## 初始化项目
	@echo "🚀 初始化项目..."
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✅ 已创建 .env 文件，请根据需要修改配置"; \
	fi
	@mkdir -p logs backups infrastructure/{nginx,postgres,redis,influxdb,traefik,fluentd,prometheus,grafana}/{dashboards,datasources}
	@echo "✅ 项目初始化完成!"
	@echo ""
	@echo "下一步:"
	@echo "1. 编辑 .env 文件配置环境变量"
	@echo "2. 运行 'make dev' 启动开发环境"
	@echo "3. 运行 'make prod' 启动生产环境"