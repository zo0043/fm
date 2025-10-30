#!/bin/bash

# 后端服务测试运行脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 基金监控应用 - 后端服务测试${NC}"
echo "============================================"

# 检查测试环境
echo -e "${YELLOW}📋 检查测试环境...${NC}"

# 检查Python版本
python_version=$(python3 --version 2>&1)
echo "Python版本: $python_version"

# 检查pytest是否安装
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}❌ pytest 未安装，正在安装...${NC}"
    pip install pytest pytest-asyncio pytest-cov httpx
else
    echo -e "${GREEN}✅ pytest 已安装${NC}"
fi

# 检查依赖
echo -e "${YELLOW}📦 安装测试依赖...${NC}"
pip install -r requirements.txt > /dev/null 2>&1 || {
    echo -e "${RED}❌ 安装依赖失败${NC}"
    exit 1
}

# 检查服务是否运行
echo -e "${YELLOW}🔍 检查服务状态...${NC}"

services=("8000:auth-service" "8001:data-collector-service" "8002:monitor-engine-service" "8003:notification-service" "8004:backtest-service")
running_services=0

for service_info in "${services[@]}"; do
    port=$(echo $service_info | cut -d: -f1)
    name=$(echo $service_info | cut -d: -f2)

    if curl -s -f "http://localhost:${port}/health" > /dev/null; then
        echo -e "${GREEN}✅ $name (${port})${NC}"
        running_services=$((running_services + 1))
    else
        echo -e "${RED}❌ $name (${port}) - 服务未运行${NC}"
    fi
done

if [ $running_services -eq 0 ]; then
    echo -e "${RED}❌ 没有服务在运行，请先启动服务${NC}"
    echo "使用命令: ./start-dev-environment.sh"
    exit 1
fi

echo -e "${GREEN}✅ 发现 $running_services 个服务正在运行${NC}"
echo ""

# 创建测试目录
echo -e "${YELLOW}📁 创建测试目录...${NC}"
mkdir -p tests/reports

# 运行测试套件
echo -e "${BLUE}🧪 运行测试套件...${NC}"

# 设置测试环境变量
export PYTHONPATH="$PYTHONPATH:$(pwd)"
export TEST_DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/test_fund_monitor"

# 运行单元测试
echo -e "${YELLOW}🔬 运行单元测试...${NC}"
pytest tests/ -m unit --cov=backend --cov-report=html --cov-report=term-missing --tb=short -v || {
    echo -e "${RED}❌ 单元测试失败${NC}"
    unit_failed=true
}

# 如果服务在运行，运行集成测试
if [ $running_services -gt 0 ]; then
    echo -e "${YELLOW}🔗 运行集成测试...${NC}"
    pytest tests/test_integration/ -m integration --tb=short -v || {
        echo -e "${RED}❌ 集成测试失败${NC}"
        integration_failed=true
    }
fi

# 生成测试报告
echo -e "${YELLOW}📊 生成测试报告...${NC}"

if [ -d "htmlcov" ]; then
    echo -e "${GREEN}✅ HTML覆盖率报告已生成: htmlcov/index.html${NC}"
fi

# 测试总结
echo ""
echo "============================================"
echo -e "${BLUE}📊 测试总结${NC}"

if [ -n "${unit_failed}" ]; then
    echo -e "${RED}❌ 单元测试: 失败${NC}"
elif [ -n "${integration_failed}" ]; then
    echo -e "${RED}❌ 集成测试: 失败${NC}"
else
    echo -e "${GREEN}✅ 所有测试: 通过${NC}"
fi

echo -e "${BLUE}📁 测试报告位置: tests/reports/${NC}"
echo "============================================"

# 显示覆盖率统计
if [ -f ".coverage" ]; then
    echo -e "${YELLOW}📈 代码覆盖率统计:${NC}"
    coverage report --show-missing | tail -n 5
    echo ""
fi

# 返回适当的退出码
if [ -n "${unit_failed}" ] || [ -n "${integration_failed}" ]; then
    exit 1
else
    exit 0
fi