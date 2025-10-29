# 基金监控应用端到端测试指南

本文档介绍了如何运行基金监控应用的端到端测试，验证前后端数据流的完整性和功能正确性。

## 测试架构

### 测试环境
- **前端**: Angular应用 (端口 4200)
- **认证服务**: FastAPI (端口 8000)
- **数据收集服务**: FastAPI (端口 8001)
- **监控引擎服务**: FastAPI (端口 8002)
- **通知服务**: FastAPI (端口 8003)
- **回测服务**: FastAPI (端口 8004)
- **数据库**: PostgreSQL
- **缓存**: Redis
- **时序数据**: InfluxDB

### 测试覆盖范围

#### 1. 健康检查测试
- ✅ 认证服务健康状态
- ✅ 数据收集服务可用性
- ✅ 监控引擎服务状态
- ✅ 通知服务连接性
- ✅ 回测服务响应性
- ✅ 前端应用加载

#### 2. 认证功能测试
- ✅ 用户登录功能
- ✅ JWT令牌生成和验证
- ✅ 用户信息获取
- ✅ 令牌刷新机制
- ✅ 用户登出功能

#### 3. 基金管理功能测试
- ✅ 基金列表查询
- ✅ 基金详情获取
- ✅ 基金类型查询
- ✅ 基金公司查询
- ✅ 净值数据获取
- ✅ 数据收集功能

#### 4. 监控功能测试
- ✅ 监控规则CRUD操作
- ✅ 规则类型和操作符查询
- ✅ 监控结果查询
- ✅ 监控任务执行
- ✅ 告警处理流程

#### 5. 通知功能测试
- ✅ 通知配置管理
- ✅ 消息模板系统
- ✅ 通知记录查询
- ✅ 多渠道通知发送

#### 6. 回测功能测试
- ✅ 回测策略管理
- ✅ 回测任务执行
- ✅ 回测报告生成
- ✅ 策略比较分析

#### 7. 前端功能测试
- ✅ 页面加载测试
- ✅ 静态资源加载
- ✅ API接口调用
- ✅ 数据展示功能

## 快速开始

### 1. 环境准备

确保系统已安装以下依赖：
- Python 3.11+
- Node.js 18+
- PostgreSQL
- Redis
- Git

```bash
# 检查Python版本
python3 --version

# 检查Node.js版本
node --version

# 检查数据库连接
psql -h localhost -U postgres -c "SELECT version();"
```

### 2. 启动开发环境

使用提供的启动脚本一键启动所有服务：

```bash
# 启动完整开发环境
./start-dev-environment.sh
```

脚本将自动执行以下操作：
1. 检查系统依赖
2. 安装Python和前端依赖
3. 启动数据库服务
4. 初始化数据库
5. 启动所有后端微服务
6. 启动前端应用
7. 运行基本健康检查

### 3. 运行端到端测试

在服务启动完成后，运行综合测试：

```bash
# 运行完整端到端测试
./run-e2e-tests.sh
```

测试脚本将执行：
1. 健康检查验证
2. 认证流程测试
3. 基金管理功能测试
4. 监控功能测试
5. 通知功能测试
6. 回测功能测试
7. 前端功能测试

### 4. 查看测试报告

测试完成后，报告将保存在 `test-results/` 目录：

```bash
# 查看最新测试报告
cat test-results/$(ls -t test-results/ | head -1)/test-report.md
```

## 手动测试

### 使用Docker Compose

如果使用Docker Compose：

```bash
# 启动所有服务
docker-compose up -d

# 等待服务启动
sleep 30

# 检查服务状态
docker-compose ps

# 运行测试
./run-e2e-tests.sh

# 停止服务
docker-compose down
```

### 单独测试各个组件

#### 测试认证服务

```bash
# 登录测试
curl -X POST "http://localhost:8000/api/v1/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "admin123456"}'

# 获取用户信息
curl -X GET "http://localhost:8000/api/v1/auth/me" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 测试基金服务

```bash
# 获取基金列表
curl -X GET "http://localhost:8001/funds?page=1&size=10" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 获取基金类型
curl -X GET "http://localhost:8001/funds/types" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 测试监控服务

```bash
# 创建监控规则
curl -X POST "http://localhost:8002/rules" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "rule_name": "测试规则",
       "rule_type": "price_threshold",
       "condition_operator": ">",
       "threshold_value": 1.0,
       "notification_channels": ["email"]
     }'

# 获取监控结果
curl -X GET "http://localhost:8002/monitor/results" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 故障排除

### 常见问题

#### 1. 服务启动失败

**问题**: 服务无法启动或连接失败
**解决方案**:
```bash
# 检查端口占用
lsof -i :8000
lsof -i :4200

# 检查数据库连接
psql -h localhost -U postgres -d fund_monitor

# 查看服务日志
tail -f logs/auth.log
tail -f logs/data_collector.log
```

#### 2. 认证失败

**问题**: 登录或令牌验证失败
**解决方案**:
```bash
# 检查认证服务状态
curl http://localhost:8000/health

# 重置管理员密码
python -c "
from backend.services.auth.services.auth_service import AuthService
import asyncio
import os

async def reset_admin():
    # 创建新的管理员用户
    pass

asyncio.run(reset_admin())
"
```

#### 3. 数据库连接问题

**问题**: 无法连接到数据库
**解决方案**:
```bash
# 重启PostgreSQL服务
brew services restart postgresql
# 或
sudo systemctl restart postgresql

# 检查数据库是否存在
psql -h localhost -U postgres -l

# 创建数据库
createdb -h localhost -U postgres fund_monitor
```

#### 4. 前端加载失败

**问题**: 前端页面无法加载
**解决方案**:
```bash
# 重新安装前端依赖
cd frontend/angular-app
rm -rf node_modules package-lock.json
npm install

# 重新构建
npm run build

# 启动开发服务器
npm start
```

### 调试技巧

#### 1. 启用详细日志

```bash
# 设置环境变量启用调试模式
export DEBUG=true
export LOG_LEVEL=DEBUG

# 重新启动服务
./stop-dev-environment.sh
./start-dev-environment.sh
```

#### 2. 查看实时日志

```bash
# 查看所有服务日志
tail -f logs/*.log

# 查看特定服务日志
tail -f logs/auth.log
tail -f logs/data_collector.log
```

#### 3. 数据库调试

```bash
# 连接数据库
psql -h localhost -U postgres -d fund_monitor

# 查看表结构
\dt
\df

# 查询数据
SELECT * FROM users LIMIT 5;
SELECT * FROM funds LIMIT 5;
SELECT * FROM monitor_rules LIMIT 5;
```

## 性能测试

### 负载测试

使用Apache Bench进行简单负载测试：

```bash
# 测试认证服务
ab -n 1000 -c 10 http://localhost:8000/health

# 测试基金服务
ab -n 1000 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
   http://localhost:8001/funds
```

### 数据库性能测试

```bash
# 查询性能分析
EXPLAIN ANALYZE SELECT * FROM funds WHERE fund_type = '股票型';

# 检查数据库连接数
SELECT count(*) FROM pg_stat_activity;
```

## 持续集成

### GitHub Actions配置

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Start services
        run: ./start-dev-environment.sh
      - name: Run E2E tests
        run: ./run-e2e-tests.sh
      - name: Upload test results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: test-results/
```

## 总结

端到端测试确保了基金监控应用各个组件之间的正确集成和数据流。通过自动化测试脚本，可以快速验证：

1. **服务可用性**: 所有微服务正常运行
2. **API功能**: 接口响应正确
3. **数据一致性**: 前后端数据同步
4. **业务流程**: 完整的用户操作流程
5. **错误处理**: 异常情况的处理能力

定期运行这些测试有助于确保应用的稳定性和可靠性，为用户提供良好的使用体验。