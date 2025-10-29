# 基金涨跌幅监控应用

基于微服务架构的基金涨跌幅监控应用，支持数据收集、实时监控、通知和定投回测功能。

## 功能特性

- 🔄 **数据收集**: 自动同步基金信息和净值数据
- 📊 **实时监控**: 涨跌幅监控和自定义规则
- 🔔 **智能通知**: 微信Webhook、邮件等多渠道通知
- 📈 **回测分析**: 定投策略回测和风险评估
- 🖥️ **管理界面**: 基于NestJS + Angular的Web管理端

## 技术架构

- **后端**: Python + FastAPI (微服务)
- **前端**: NestJS + Angular
- **数据库**: PostgreSQL + Redis + InfluxDB
- **消息队列**: Redis + Celery
- **容器化**: Docker + Docker Compose

## 项目结构

```
fund_monitor/
├── backend/                    # 后端服务
│   ├── services/              # 微服务
│   │   ├── data_collector/    # 数据收集服务
│   │   ├── monitor_engine/    # 监控引擎服务
│   │   ├── notification/      # 通知服务
│   │   └── backtest/         # 回测服务
│   ├── shared/               # 共享库
│   └── gateway/              # API网关
├── frontend/                 # 前端应用
├── infrastructure/           # 基础设施配置
└── docs/                    # 项目文档
```

## 快速开始

### 环境要求

- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- PostgreSQL
- Redis

### 启动开发环境

```bash
# 克隆项目
git clone <repository-url>
cd fund_monitor

# 启动开发环境
docker-compose up -d

# 安装依赖
pip install -r requirements.txt
npm install

# 运行服务
python -m backend.services.data_collector.main
python -m backend.services.monitor_engine.main
# ... 其他服务
```

## 开发指南

详细的开发指南请参考 [docs/](./docs/) 目录。

## 许可证

MIT License