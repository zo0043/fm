# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

基金涨跌幅监控应用，支持基金数据收集、涨跌幅监控、多渠道通知和定投回测分析。

### 核心功能
- 🔄 **数据收集**: 自动同步基金信息和净值数据（支持 yfinance、akshare 数据源）
- 📊 **实时监控**: 涨跌幅阈值监控、自定义规则、Prometheus 指标
- 🔔 **智能通知**: 微信 Webhook、邮件等多渠道通知（基于 Celery 异步队列）
- 📈 **定投回测**: 策略回测、风险评估、收益分析（pandas + numpy）
- 🖥️ **管理界面**: 基于 Next.js 的响应式 Web 管理端

### 技术架构
- **后端**: Python 3.11+ + FastAPI（单体架构）
- **前端**: Next.js 13+ + React + Tailwind CSS
- **数据库**: PostgreSQL/SQLite (主数据) + Redis (缓存/队列)
- **容器化**: Docker + Docker Compose (多环境配置)

## 快速开发命令

### 后端 (FastAPI)
```bash
# 1. 进入项目根目录
cd /path/to/fund_monitor

# 2. 创建并激活虚拟环境
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate  # Windows

# 3. 安装依赖
pip install -r monolithic-backend/requirements.txt

# 4. 启动开发服务器
uvicorn monolithic-backend.main:app --reload --port 8000

# 5. 访问 API 文档
# http://localhost:8000/docs (Swagger UI)
# http://localhost:8000/redoc (Redoc)
```

### 前端 (Next.js)
```bash
# 1. 进入前端目录
cd next-frontend

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 访问前端
# http://localhost:3000

# 5. 生产构建
npm run build
npm run start
```

### 运行测试
```bash
# 后端测试
cd monolithic-backend
pytest

# 前端测试
cd next-frontend
npm test

# 代码检查
npm run lint
```

## 代码架构

### 后端 (monolithic-backend/)
```
monolithic-backend/
├── main.py                # FastAPI 应用入口
├── config.py              # 配置管理
├── database.py            # 数据库连接和初始化
├── utils.py               # 通用工具函数
├── routers/               # API 路由
│   ├── auth_router.py    # 认证路由
│   ├── data_router.py    # 数据收集和查询路由
│   ├── backtest_router.py# 回测分析路由
│   ├── monitor_router.py # 监控规则路由
│   └── notification_router.py # 通知配置路由
├── services/              # 业务逻辑层
│   ├── auth_service.py
│   ├── data_service.py
│   ├── backtest_service.py
│   ├── monitor_service.py
│   └── notification_service.py
```

### 前端 (next-frontend/)
```
next-frontend/
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── layout.tsx     # 根布局
│   │   ├── page.tsx       # 首页
│   │   ├── fund-history/  # 基金历史净值页面
│   │   ├── new-home/      # 新首页
│   │   └── _components/   # 通用组件
│   ├── services/          # API 服务
│   │   └── fundService.ts # 基金数据请求服务
│   └── types/             # TypeScript 类型定义
├── package.json
├── tailwind.config.js
└── next.config.js
```

## 环境配置

### 后端配置
```bash
# 复制环境变量模板
cp .env.example .env

# 核心配置项
DATABASE_URL=sqlite:///./fund_monitor.db  # 或 PostgreSQL 连接字符串
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key
CORS_ORIGINS=["http://localhost:3000", "http://localhost:4200"]
```

### 前端配置
```bash
# 在 next-frontend/.env.local 文件中配置
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 常见操作

### 数据库迁移
```bash
# 初始化数据库（已整合在 main.py 的 lifespan 中）
# 自动创建所有表结构
```

### 检查端口占用
```bash
# Linux/macOS
lsof -i :8000 -i :3000

# Windows
netstat -ano | findstr :8000 :3000
```

## Git 工作流

### 查看状态
```bash
git status
```

### 提交变更
```bash
git add .
git commit -m "fix: 修复XXX问题"
git push
```

### 分支管理
```bash
# 创建新分支
git checkout -b feature/new-feature

# 切换分支
git checkout main

# 合并分支
git merge feature/new-feature
```

## 日志查看

### 后端日志
```bash
tail -f monolithic-backend/backend.log
```

### 前端日志
```bash
tail -f next-frontend/frontend.log
```

## 项目特点
1. **单体架构**: 所有功能整合在一个 FastAPI 应用中，便于开发和部署
2. **Next.js 前端**: 使用 App Router 和 Tailwind CSS 构建现代化界面
3. **SQLite 默认支持**: 简化本地开发环境配置
4. **模块化设计**: 路由、服务、工具分层清晰
5. **类型安全**: 前端使用 TypeScript，后端使用 Python 类型提示
