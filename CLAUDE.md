# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于微服务架构的基金涨跌幅监控应用，支持数据收集、实时监控、通知和定投回测功能。

### 技术架构
- **后端**: Python + FastAPI 微服务架构
- **前端**: NestJS 后端 + Angular 前端（混合架构）
- **数据库**: PostgreSQL + Redis + InfluxDB
- **消息队列**: Redis + Celery
- **容器化**: Docker + Docker Compose

## 开发环境管理

### 启动服务
```bash
# 启动完整开发环境（推荐）
./start-dev-environment.sh

# 或使用 Makefile
make dev

# Docker Compose 方式
docker-compose -f docker-compose.dev.yml --profile dev up -d
```

### 停止服务
```bash
# 停止开发环境
./stop-dev-environment.sh

# 或使用 Makefile
make stop-dev
```

### 服务端口分配
- **认证服务**: 8000
- **数据收集服务**: 8001
- **监控引擎服务**: 8002
- **通知服务**: 8003
- **回测服务**: 8004
- **NestJS 后端**: 3000
- **Angular 前端**: 4200

## 前端开发

### Angular 应用 (主前端)
```bash
cd frontend/angular-app
npm install
npm start                    # 开发服务器 (http://localhost:4200)
npm run build               # 生产构建
npm run test                # 运行测试
npm run lint                # 代码检查
```

### NestJS 应用 (前端后端)
```bash
cd frontend/
npm install
npm run start:dev          # 开发模式
npm run build              # 构建
npm run start:prod         # 生产模式
npm run test               # 运行测试
npm run lint               # 代码检查
```

## 后端开发

### 微服务架构
项目采用微服务架构，每个服务独立运行：

```bash
# 运行单个服务
python -m backend.services.auth.main           # 认证服务 (8000)
python -m backend.services.data_collector.main # 数据收集服务 (8001)
python -m backend.services.monitor_engine.main # 监控引擎服务 (8002)
python -m backend.services.notification.main   # 通知服务 (8003)
python -m backend.services.backtest.main       # 回测服务 (8004)
```

### 共享库
```bash
# 共享数据库连接、工具函数、数据模型等
backend/shared/
```

### Python 依赖管理
```bash
pip install -r requirements.txt
```

## 测试

### 端到端测试
```bash
# 运行完整 E2E 测试套件
./run-e2e-tests.sh

# 测试覆盖：
# - 健康检查测试
# - 认证功能测试
# - 基金管理功能测试
# - 监控功能测试
# - 通知功能测试
# - 回测功能测试
# - 前端功能测试
```

### 单元测试
```bash
# Angular 测试
cd frontend/angular-app && npm run test

# NestJS 测试
cd frontend && npm run test

# Python 测试
pytest backend/
```

## 数据库管理

### 数据库连接
- **PostgreSQL**: localhost:5432 (用户: postgres, 密码: postgres, 数据库: fund_monitor)
- **Redis**: localhost:6379
- **InfluxDB**: localhost:8086

### 数据库初始化
```bash
# 自动初始化（推荐）
./start-dev-environment.sh  # 包含数据库初始化

# 手动初始化
docker exec fund_monitor_postgres psql -U postgres -c "SELECT version();"
```

## 常用开发命令

### 环境检查
```bash
make status          # 查看服务状态
make health          # 检查服务健康状态
make logs            # 查看所有日志
make logs-dev        # 查看开发环境日志
```

### 代码质量
```bash
make lint            # 代码检查
make test            # 运行测试
make clean           # 清理构建文件
```

### Docker 管理
```bash
make docker-clean    # 清理容器和镜像
make docker-prune    # 清理未使用的 Docker 资源
```

## 项目结构

```
fund_monitor/
├── backend/                    # 后端微服务
│   ├── services/              # 微服务
│   │   ├── auth/             # 认证服务 (8000)
│   │   ├── data_collector/   # 数据收集服务 (8001)
│   │   ├── monitor_engine/   # 监控引擎服务 (8002)
│   │   ├── notification/     # 通知服务 (8003)
│   │   └── backtest/        # 回测服务 (8004)
│   └── shared/              # 共享库
├── frontend/                 # 前端应用
│   ├── angular-app/         # Angular 前端 (4200)
│   └── src/                 # NestJS 后端 (3000)
├── infrastructure/          # 基础设施配置
├── docker-compose.*.yml     # Docker Compose 配置
├── Makefile                # 开发命令集合
├── start-dev-environment.sh # 开发环境启动脚本
├── run-e2e-tests.sh        # E2E 测试脚本
└── E2E_TESTING.md          # 测试指南
```

## 开发注意事项

### 环境变量配置
- 复制 `.env.example` 到 `.env` 并配置相应环境变量
- 开发环境使用默认配置通常可以正常工作

### 服务依赖关系
- 认证服务为其他服务提供身份验证
- 数据收集服务为核心业务数据源
- 监控引擎依赖数据收集服务的数据
- 通知服务通过 Celery 异步处理
- 回测服务独立运行，依赖历史数据

### 调试技巧
- 启用详细日志：`export DEBUG=true`
- 查看实时日志：`tail -f logs/*.log`
- 数据库调试：连接 PostgreSQL 直接查询

### 常见问题排查
1. **端口冲突**: 检查 8000-8004, 3000, 4200 端口占用
2. **数据库连接**: 确保 PostgreSQL 服务正常运行
3. **依赖安装**: 删除 node_modules 和 package-lock.json 后重新安装
4. **服务启动**: 查看服务日志排查具体错误