# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

基于微服务架构的基金涨跌幅监控应用，支持基金数据收集、涨跌幅监控、多渠道通知和定投回测分析。

### 核心功能
- 🔄 **数据收集**: 自动同步基金信息和净值数据（支持 yfinance、akshare 数据源）
- 📊 **实时监控**: 涨跌幅阈值监控、自定义规则、Prometheus 指标
- 🔔 **智能通知**: 微信 Webhook、邮件等多渠道通知（基于 Celery 异步队列）
- 📈 **定投回测**: 策略回测、风险评估、收益分析（pandas + numpy）
- 🖥️ **管理界面**: 基于 NestJS + Angular 的响应式 Web 管理端

### 技术架构
- **后端**: Python 3.11+ + FastAPI（5 个独立微服务）
- **前端**: NestJS API 层 + Angular 17+ 前端应用
- **数据库**: PostgreSQL (主数据) + Redis (缓存/队列) + InfluxDB (时序数据)
- **任务队列**: Redis + Celery + Flower (任务监控)
- **容器化**: Docker + Docker Compose (多环境配置)

## 开发环境管理

### 环境要求
- Python 3.11+ (推荐使用 venv 虚拟环境)
- Node.js 18+ & npm
- PostgreSQL 14+
- Redis 7+
- Git

### 快速启动（推荐）
```bash
# 一键启动完整开发环境（包含依赖检查、安装、数据库初始化）
./start-dev-environment.sh

# 访问地址
# - Angular 前端: http://localhost:4200
# - NestJS API: http://localhost:3000
# - API 文档: http://localhost:8000/docs (认证服务)
```

### 手动启动
```bash
# 1. 安装 Python 依赖
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 2. 安装前端依赖
cd frontend/angular-app && npm install && cd ../..
cd frontend && npm install && cd ..

# 3. 启动数据库服务
docker-compose -f docker-compose.dev.yml up -d postgres redis influxdb

# 4. 运行后端微服务（每个终端一个服务）
python -m backend.services.auth.main              # 认证服务 (8000)
python -m backend.services.data_collector.main    # 数据收集服务 (8001)
python -m backend.services.monitor_engine.main    # 监控引擎服务 (8002)
python -m backend.services.notification.main      # 通知服务 (8003)
python -m backend.services.backtest.main          # 回测服务 (8004)

# 5. 启动前端服务
cd frontend && npm run start:dev                  # NestJS API (3000)
cd frontend/angular-app && npm start              # Angular 前端 (4200)
```

### 服务端口分配
- **8000**: 认证服务 (Auth Service) - FastAPI
- **8001**: 数据收集服务 (Data Collector) - FastAPI
- **8002**: 监控引擎服务 (Monitor Engine) - FastAPI
- **8003**: 通知服务 (Notification) - FastAPI
- **8004**: 回测服务 (Backtest) - FastAPI
- **3000**: NestJS API Gateway - 前后端 API 统一入口
- **4200**: Angular 前端应用
- **5432**: PostgreSQL 数据库
- **6379**: Redis (缓存/队列)
- **8086**: InfluxDB (时序数据)
- **5555**: Celery Flower (任务监控)

### 环境变量配置
```bash
# 复制环境变量模板
cp .env.example .env

# 核心配置说明
DATABASE_URL=postgresql://fund_user:fund_password@localhost:5432/fund_monitor
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-jwt-secret-key
```

### 停止服务
```bash
# 停止开发环境（推荐）
./stop-dev-environment.sh

# 或使用 Makefile
make stop-dev

# 或手动停止
docker-compose -f docker-compose.dev.yml down
```

## 前端开发

项目采用双层架构：
1. **NestJS API Gateway** (frontend/) - 前后端 API 统一入口，提供认证、代理等功能
2. **Angular 应用** (frontend/angular-app/) - 响应式前端管理界面

### NestJS API Gateway (端口 3000)
```bash
cd frontend/

# 安装依赖
npm install

# 开发模式（热重载）
npm run start:dev

# 调试模式
npm run start:debug

# 生产构建
npm run build
npm run start:prod

# 运行测试
npm test                    # 单元测试
npm run test:cov           # 覆盖率测试
npm run test:e2e           # 端到端测试

# 代码检查
npm run lint               # 检查并修复
```

**核心功能模块：**
- `src/auth/` - JWT 认证、登录/登出
- `src/funds/` - 基金数据管理
- `src/monitor/` - 监控规则管理
- `src/notifications/` - 通知配置
- `src/backtest/` - 回测分析
- `src/dashboard/` - 仪表板数据

### Angular 应用 (端口 4200)
```bash
cd frontend/angular-app/

# 安装依赖
npm install

# 开发服务器
npm start                    # http://localhost:4200
npm run start:proxy          # 使用代理配置

# 生产构建
npm run build               # 开发环境构建
npm run build:prod          # 生产环境构建

# 代码检查与测试
npm run lint                # ESLint 检查
npm test                    # 单元测试 (Jasmine + Karma)
npm run e2e                 # 端到端测试 (Protractor)

# 依赖分析
npm run analyze             # bundle 分析
```

**关键目录：**
- `src/app/` - 应用组件和路由
- `src/app/components/` - 可复用组件
- `src/app/services/` - API 服务层
- `src/app/pages/` - 页面组件
- `src/environments/` - 环境配置

**主要页面：**
- 登录/注册页面
- 仪表板（基金总览、图表）
- 基金列表（搜索、筛选、详情）
- 监控规则管理（创建、编辑、启用/禁用）
- 通知配置（渠道、模板、测试）
- 回测分析（策略配置、报告查看）

## 后端开发

### 微服务架构概览
项目采用 **5 个独立的 FastAPI 微服务**，每个服务独立运行、独立部署：

```bash
# 认证服务 (端口 8000)
python -m backend.services.auth.main
# 功能：用户注册/登录、JWT 令牌管理、密码加密
# API 文档：http://localhost:8000/docs

# 数据收集服务 (端口 8001)
python -m backend.services.data_collector.main
# 功能：基金数据同步、净值数据获取、历史数据存储
# 数据源：yfinance、akshare

# 监控引擎服务 (端口 8002)
python -m backend.services.monitor_engine.main
# 功能：涨跌幅监控、规则引擎、告警触发
# 依赖：InfluxDB (时序数据)

# 通知服务 (端口 8003)
python -m backend.services.notification.main
# 功能：多渠道通知 (邮件、微信 Webhook)
# 队列：Celery + Redis 异步处理

# 回测服务 (端口 8004)
python -m backend.services.backtest.main
# 功能：定投策略回测、风险评估、收益分析
# 依赖：pandas + numpy 数据计算
```

### 共享库 (backend/shared/)
所有微服务共享以下资源：
- `shared/config/` - 环境配置、设置管理
- `shared/database/` - PostgreSQL 连接、SQLAlchemy 模型
- `shared/utils/` - 通用工具函数、日志配置
- 共享数据模型、类型定义

### 依赖管理
```bash
# 激活虚拟环境
source venv/bin/activate  # Linux/macOS
# 或 venv\Scripts\activate  # Windows

# 安装生产依赖
pip install -r requirements.txt

# 安装开发依赖（包含测试工具）
pip install -r requirements-dev.txt  # 如果存在

# 查看依赖树
pip freeze | grep -E "(fastapi|sqlalchemy|celery)"

# 升级依赖
pip install --upgrade -r requirements.txt
```

### 数据库管理
```bash
# 启动数据库容器
docker-compose -f docker-compose.dev.yml up -d postgres redis influxdb

# 数据库连接
psql postgresql://fund_user:fund_password@localhost:5432/fund_monitor

# Redis 缓存查看
redis-cli -h localhost -p 6379
> keys *  # 查看所有键
> get <key>  # 获取值

# InfluxDB 时序数据查看
# 访问 http://localhost:8086 (admin/admin123456)
# 数据库：fund_monitor，Bucket：fund_data

# 数据库迁移
cd backend/
alembic upgrade head  # 应用迁移
alembic downgrade -1  # 回滚一个版本
alembic history       # 查看迁移历史
```

### 任务队列 (Celery)
```bash
# 启动 Celery Worker
cd backend/services/notification
celery -A main worker --loglevel=info

# 启动 Celery Flower (监控界面)
celery -A main flower --port=5555
# 访问：http://localhost:5555

# 在代码中触发异步任务
from shared.celery_app import celery_app
celery_app.send_task('notifications.send_email', args=[...])
```

## 测试

### 端到端测试 (E2E)
运行完整的前后端集成测试，验证系统完整数据流：

```bash
# 启动完整测试环境
./run-e2e-tests.sh

# 或手动运行
docker-compose -f docker-compose.test.yml up -d
pytest backend/tests/test_integration/ -v
```

**测试覆盖范围：**
1. **健康检查** - 验证所有服务启动状态
2. **认证流程** - 注册/登录/JWT 验证
3. **基金数据** - 数据收集、存储、查询
4. **监控规则** - CRUD 操作、规则执行
5. **通知系统** - 消息发送、模板渲染
6. **回测分析** - 策略计算、报告生成
7. **前端交互** - 页面加载、API 调用

### Python 单元测试
```bash
# 运行所有测试
cd backend/
pytest -v                          # 详细输出
pytest --cov=shared --cov=services # 生成覆盖率报告
pytest -k "test_auth"              # 运行特定测试

# 单个服务测试
pytest backend/services/auth/tests/ -v
pytest backend/services/data_collector/tests/ -v

# 生成 HTML 覆盖率报告
pytest --cov=shared --cov-report=html
open htmlcov/index.html  # 查看报告
```

### 前端测试
```bash
# NestJS 测试
cd frontend/
npm test                    # 单元测试
npm run test:cov           # 覆盖率
npm run test:e2e           # 端到端

# Angular 测试
cd frontend/angular-app/
npm test                    # 单元测试 (Jasmine + Karma)
npm run e2e                 # 端到端测试 (Protractor)
npm run test:headless       # 无头模式运行

# 持续监听模式
npm test -- --watch        # 文件变化时自动重测
```

### 测试配置
```bash
# Python 测试配置
backend/pytest.ini         # pytest 全局配置
backend/conftest.py        # 共享 fixtures

# 环境变量
export PYTEST_CURRENT_TEST=1  # 显示当前测试名称
export DEBUG=1                # 启用调试日志
```

## 数据库管理

### 数据库连接信息
- **PostgreSQL** (主数据)
  - 主机: `localhost:5432`
  - 数据库: `fund_monitor`
  - 用户: `fund_user` (开发) / `postgres` (管理)
  - 密码: `fund_password` (开发) / `postgres` (管理)

- **Redis** (缓存/队列)
  - 主机: `localhost:6379`
  - 密码: (无密码，用于开发)
  - 数据库: `0` (默认)

- **InfluxDB** (时序数据)
  - URL: `http://localhost:8086`
  - 组织: `fund_monitor`
  - Bucket: `fund_data`
  - 管理员: `admin` / `admin123456`

### 常用数据库操作
```bash
# 连接到 PostgreSQL
psql postgresql://fund_user:fund_password@localhost:5432/fund_monitor

# 查看所有表
\dt

# 查看表结构
\d+ table_name

# 执行 SQL 查询
SELECT * FROM funds LIMIT 10;

# 备份数据库
pg_dump -U fund_user -h localhost fund_monitor > backup.sql

# 恢复数据库
psql -U fund_user -h localhost fund_monitor < backup.sql

# 清理 Redis 缓存
redis-cli -h localhost -p 6379 FLUSHDB

# InfluxDB 数据查询
# 访问 http://localhost:8086，使用 Chronograf UI
# 或使用 CLI:
influx -host localhost -port 8086 -org fund_monitor -token fund_monitor_token
> use fund_data
> SELECT * FROM "fund_prices" LIMIT 10
```

### 数据库迁移
```bash
cd backend/

# 创建新迁移
alembic revision --autogenerate -m "描述信息"

# 应用迁移（升级到最新版本）
alembic upgrade head

# 回滚一个版本
alembic downgrade -1

# 查看迁移历史
alembic history

# 查看当前版本
alembic current

# 手动标记迁移
alembic stamp head
```

### 数据库初始化脚本
```bash
# 自动初始化（推荐）
./start-dev-environment.sh  # 包含数据库创建和初始数据

# 手动初始化
docker exec -it fund_monitor_postgres psql -U postgres -d fund_monitor -f /docker-entrypoint-initdb.d/init.sql

# 或使用基础设施脚本
ls infrastructure/postgres/init-*.sql
```

## 常用开发命令

### Makefile 快捷命令
```bash
# 查看所有可用命令
make help

# ============= 开发环境 =============
make dev              # 启动开发环境 (Docker Compose)
make build-dev        # 构建开发环境镜像
make stop-dev         # 停止开发环境
make logs-dev         # 查看开发环境日志 (实时)

# ============= 生产环境 =============
make prod             # 启动生产环境
make build-prod       # 构建生产环境镜像
make stop-prod        # 停止生产环境
make logs-prod        # 查看生产环境日志

# ============= 通用操作 =============
make build            # 构建前端应用
make test             # 运行所有测试
make lint             # 代码检查和修复
make clean            # 清理构建文件
make logs             # 查看所有服务日志
make stop             # 停止所有服务

# ============= Docker 管理 =============
make docker-clean     # 清理容器和镜像
make docker-prune     # 清理未使用的 Docker 资源
```

### 手动环境检查
```bash
# 检查端口占用
lsof -i :8000-8004,3000,4200,5432,6379,8086

# 检查 Docker 容器状态
docker ps
docker-compose -f docker-compose.dev.yml ps

# 检查服务健康
curl http://localhost:8000/health  # 认证服务
curl http://localhost:3000/health  # NestJS API
curl http://localhost:4200         # Angular 前端

# 查看服务日志
tail -f logs/backend.log           # 后端日志
docker-compose -f docker-compose.dev.yml logs -f auth
```

### 代码质量检查
```bash
# Python 代码格式化
cd backend/
black .                    # 自动格式化
isort .                    # 排序 import
flake8 .                   # 代码风格检查
mypy .                     # 类型检查

# 前端代码检查
cd frontend/angular-app/
npm run lint               # ESLint 检查并修复

cd frontend/
npm run lint               # NestJS ESLint
```

### 日志管理
```bash
# 实时查看日志
tail -f logs/app.log
tail -f logs/auth.log
tail -f logs/error.log

# 查看最近 100 行日志
tail -100 logs/app.log

# 搜索日志
grep "ERROR" logs/app.log
grep -i "fund" logs/app.log

# 清空日志
> logs/app.log
```

### 数据管理
```bash
# 重置开发数据库
docker-compose -f docker-compose.dev.yml stop postgres
docker volume rm fund_monitor_postgres_data
docker-compose -f docker-compose.dev.yml up -d postgres

# 导入测试数据
psql postgresql://fund_user:fund_password@localhost:5432/fund_monitor < test_data.sql

# 清理所有数据（慎用！）
docker-compose -f docker-compose.dev.yml down -v
```

## 项目结构

```
fund_monitor/
├── backend/                          # 后端 Python 微服务
│   ├── services/                     # 5 个独立微服务
│   │   ├── auth/                     # 认证服务 (FastAPI, 8000)
│   │   │   ├── main.py              # 服务入口点
│   │   │   ├── api/                 # API 路由
│   │   │   ├── models/              # 数据模型
│   │   │   └── services/            # 业务逻辑
│   │   ├── data_collector/          # 数据收集服务 (8001)
│   │   │   ├── collectors/          # 数据源收集器 (yfinance, akshare)
│   │   │   └── sync.py              # 数据同步任务
│   │   ├── monitor_engine/          # 监控引擎服务 (8002)
│   │   │   ├── rules/               # 监控规则
│   │   │   ├── engine.py            # 规则引擎
│   │   │   └── triggers/            # 告警触发器
│   │   ├── notification/            # 通知服务 (8003)
│   │   │   ├── channels/            # 通知渠道 (邮件、微信)
│   │   │   ├── templates/           # 消息模板
│   │   │   └── celery_tasks.py      # Celery 异步任务
│   │   └── backtest/               # 回测服务 (8004)
│   │       ├── strategies/          # 回测策略
│   │       ├── calculators/         # 收益计算
│   │       └── reports/             # 回测报告
│   ├── shared/                      # 共享库
│   │   ├── config/                  # 配置管理
│   │   ├── database/                # 数据库连接、模型
│   │   ├── utils/                   # 通用工具
│   │   └── celery_app.py            # Celery 应用实例
│   ├── tests/                       # 后端测试
│   │   ├── test_auth/
│   │   ├── test_data_collector/
│   │   └── test_integration/        # 集成测试
│   ├── conftest.py                  # pytest 配置
│   ├── alembic.ini                  # 数据库迁移配置
│   └── requirements.txt             # Python 依赖
│
├── frontend/                        # 前端应用 (NestJS + Angular)
│   ├── src/                         # NestJS API 网关 (3000)
│   │   ├── main.ts                  # 应用入口
│   │   ├── app.module.ts            # 根模块
│   │   ├── auth/                    # 认证模块 (JWT)
│   │   ├── users/                   # 用户管理
│   │   ├── funds/                   # 基金数据代理
│   │   ├── monitor/                 # 监控规则代理
│   │   ├── notifications/           # 通知配置代理
│   │   ├── backtest/                # 回测分析代理
│   │   ├── dashboard/               # 仪表板数据聚合
│   │   ├── health/                  # 健康检查
│   │   └── proxy/                   # API 代理配置
│   ├── package.json                 # NestJS 依赖
│   └── Dockerfile
│
│   └── angular-app/                 # Angular 前端 (4200)
│       ├── src/
│       │   ├── app/                 # 应用组件
│       │   │   ├── pages/           # 页面组件 (仪表板、基金、监控等)
│       │   │   ├── components/      # 可复用组件
│       │   │   ├── services/        # API 服务
│       │   │   ├── guards/          # 路由守卫
│       │   │   └── interceptors/    # HTTP 拦截器
│       │   ├── assets/              # 静态资源
│       │   └── environments/        # 环境配置
│       ├── angular.json             # Angular 配置
│       ├── package.json             # Angular 依赖
│       └── Dockerfile
│
├── infrastructure/                  # 基础设施配置
│   ├── docker/                      # Docker 相关配置
│   │   └── init-scripts/           # 容器初始化脚本
│   ├── nginx/                       # Nginx 配置
│   │   ├── dev.conf                # 开发环境
│   │   └── nginx/                  # 生产环境
│   ├── postgres/                   # PostgreSQL 配置
│   │   └── init-dev.sql           # 初始化脚本
│   ├── redis/                      # Redis 配置
│   └── traefik/                    # 反向代理配置
│
├── logs/                            # 应用日志目录
├── backups/                         # 数据库备份
├── fund_monitor/                    # 文档目录 (旧版)
├── .env                             # 环境变量
├── .env.example                     # 环境变量模板
├── docker-compose.yml               # 生产环境 (主)
├── docker-compose.dev.yml           # 开发环境
├── docker-compose.test.yml          # 测试环境
├── docker-compose.minimal.yml       # 最小化配置
├── docker-compose.frontend.yml      # 前端专用
├── Makefile                         # 开发命令
├── start-dev-environment.sh         # 开发环境启动脚本
├── stop-dev-environment.sh          # 开发环境停止脚本
├── start-all-services.sh           # 启动所有服务
├── build-frontend.sh               # 前端构建脚本
├── run-e2e-tests.sh                # E2E 测试脚本
├── deploy.sh                       # 部署脚本
├── DOCKER_README.md                 # Docker 使用指南
├── E2E_TESTING.md                  # E2E 测试指南
├── requirements.txt                # Python 依赖 (根目录)
└── README.md                       # 项目说明
```

## 开发注意事项

### 环境变量配置
```bash
# 必须配置的环境变量
cp .env.example .env

# 核心配置项
NODE_ENV=production|development
DATABASE_URL=postgresql://fund_user:fund_password@localhost:5432/fund_monitor
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-secret-key  # 生产环境请使用强密码
INFLUXDB_TOKEN=your-influxdb-token
```

**敏感信息管理：**
- 绝对不要将 `.env` 文件提交到 Git
- 生产环境使用密钥管理服务 (如 AWS Secrets Manager)
- JWT 密钥应定期轮换
- 数据库密码应使用强密码

### 服务依赖关系与启动顺序
```
1. 基础设施服务 (必须首先启动)
   ├── PostgreSQL (5432) - 主数据存储
   ├── Redis (6379) - 缓存 + 消息队列
   └── InfluxDB (8086) - 时序数据

2. 后端微服务 (并行启动)
   ├── Auth (8000) - 认证服务 *必须先启动*
   ├── Data Collector (8001) - 数据收集
   ├── Monitor Engine (8002) - 监控引擎 *依赖 InfluxDB*
   ├── Notification (8003) - 通知服务 *依赖 Redis*
   └── Backtest (8004) - 回测服务

3. 前端服务
   ├── NestJS API Gateway (3000) - 前后端 API 统一入口
   └── Angular App (4200) - 前端管理界面
```

**启动顺序建议：**
```bash
# 1. 启动基础设施
docker-compose -f docker-compose.dev.yml up -d postgres redis influxdb

# 2. 等待数据库就绪 (约 10 秒)
sleep 10

# 3. 启动认证服务
python -m backend.services.auth.main &

# 4. 等待认证服务就绪
sleep 5

# 5. 启动其他服务
python -m backend.services.data_collector.main &
python -m backend.services.monitor_engine.main &
python -m backend.services.notification.main &
python -m backend.services.backtest.main &

# 6. 启动前端
cd frontend && npm run start:dev &
cd frontend/angular-app && npm start &
```

### 调试技巧

**Python 后端调试：**
```python
# 启用详细日志
import logging
logging.basicConfig(level=logging.DEBUG)

# 使用 pdb 调试
import pdb; pdb.set_trace()

# FastAPI 调试模式
uvicorn main:app --reload --log-level debug
```

**前端调试：**
```javascript
// Chrome DevTools
// Angular: 启用生产模式调试
ng serve --configuration development

// NestJS: 启用调试模式
npm run start:debug
```

**数据库调试：**
```sql
-- 查看活动连接
SELECT * FROM pg_stat_activity;

-- 查看慢查询
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC;

-- 监控 InfluxDB 写入
SHOW TAG KEYS FROM "fund_prices"
```

### 常见问题排查

#### 1. 端口冲突
```bash
# 检查端口占用
lsof -i :8000
lsof -i :3000
lsof -i :4200

# 杀死占用进程
kill -9 <PID>

# 或修改 docker-compose.yml 中的端口映射
```

#### 2. 数据库连接失败
```bash
# 检查 PostgreSQL 状态
docker-compose -f docker-compose.dev.yml ps postgres

# 查看数据库日志
docker-compose -f docker-compose.dev.yml logs postgres

# 测试连接
psql postgresql://fund_user:fund_password@localhost:5432/fund_monitor -c "SELECT 1"
```

#### 3. Redis 连接问题
```bash
# 检查 Redis 状态
docker-compose -f docker-compose.dev.yml ps redis

# 测试 Redis 连接
redis-cli -h localhost -p 6379 ping
# 应返回: PONG

# 查看 Redis 日志
docker-compose -f docker-compose.dev.yml logs redis
```

#### 4. 依赖安装失败
```bash
# Python 依赖
rm -rf venv/
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Node.js 依赖
rm -rf frontend/node_modules frontend/angular-app/node_modules
rm frontend/package-lock.json frontend/angular-app/package-lock.json
npm install
```

#### 5. Docker 相关问题
```bash
# 清理未使用资源
docker system prune -a

# 重启 Docker 服务
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d

# 查看容器日志
docker-compose -f docker-compose.dev.yml logs -f --tail=100
```

#### 6. 微服务通信问题
```bash
# 检查服务健康
curl http://localhost:8000/health  # Auth
curl http://localhost:8001/health  # Data Collector
curl http://localhost:8002/health  # Monitor Engine
curl http://localhost:8003/health  # Notification
curl http://localhost:8004/health  # Backtest

# 检查 NestJS API Gateway
curl http://localhost:3000/health
```

### 性能优化建议
- **数据库**: 为常用查询字段添加索引 (fund_code, date)
- **缓存**: 使用 Redis 缓存基金数据 (TTL: 5-10 分钟)
- **监控**: 查看 InfluxDB 指标，识别性能瓶颈
- **前端**: 启用 Angular 生产模式构建 (`npm run build:prod`)
- **API**: 使用 Redis 连接池和异步请求

### 安全注意事项
- 生产环境必须启用 HTTPS
- 定期更新依赖包 (`pip-audit`, `npm audit`)
- 使用强密码和 JWT 密钥
- 启用 CORS 白名单
- 数据库启用 SSL 连接
- 定期备份数据 (每日自动备份脚本)