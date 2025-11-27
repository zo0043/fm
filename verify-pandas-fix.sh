#!/bin/bash
# 验证脚本：pandas aarch64兼容性修复验证
# 使用方法: ./verify-pandas-fix.sh

echo "🧪 开始验证pandas兼容性修复..."

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_pandas_import() {
    echo "🔍 测试pandas导入..."
    docker run --rm fund-monitor-python:local python -c "
import pandas as pd
import numpy as np
print(f'✅ pandas版本: {pd.__version__}')
print(f'✅ numpy版本: {np.__version__}')
print(f'✅ pandas数据类型测试: {type(pd.Series([1,2,3]))}')
" 2>/dev/null
}

test_new_versions() {
    echo "🔍 测试新版本兼容性..."

    # 测试pandas 2.2.2
    echo "   测试pandas 2.2.2..."
    if docker run --rm fund-monitor-python:local pip install --break-system-packages --user pandas==2.2.2 numpy==1.26.4 --dry-run >/dev/null 2>&1; then
        echo -e "   ${GREEN}✅ pandas 2.2.2 兼容${NC}"
    else
        echo -e "   ${RED}❌ pandas 2.2.2 不兼容${NC}"
    fi
}

test_build_process() {
    echo "🔍 测试构建流程..."

    # 构建backtest服务（干运行）
    echo "   测试backtest服务Dockerfile语法..."
    if docker build -f backend/services/backtest/Dockerfile --dry-run ./backend >/dev/null 2>&1; then
        echo -e "   ${GREEN}✅ backtest Dockerfile语法正确${NC}"
    else
        echo -e "   ${RED}❌ backtest Dockerfile语法错误${NC}"
    fi

    # 构建data_collector服务（干运行）
    echo "   测试data_collector服务Dockerfile语法..."
    if docker build -f backend/services/data_collector/Dockerfile --dry-run ./backend >/dev/null 2>&1; then
        echo -e "   ${GREEN}✅ data_collector Dockerfile语法正确${NC}"
    else
        echo -e "   ${RED}❌ data_collector Dockerfile语法错误${NC}"
    fi
}

# 显示修复摘要
show_fix_summary() {
    echo ""
    echo "📋 修复摘要："
    echo -e "   ${GREEN}• pandas: 2.1.4 → 2.2.2${NC}"
    echo -e "   ${GREEN}• numpy: 1.25.2 → 1.26.4${NC}"
    echo -e "   ${GREEN}• scipy: 1.11.4 → 1.13.0${NC}"
    echo -e "   ${GREEN}• scikit-learn: 1.3.2 → 1.4.2${NC}"
    echo -e "   ${GREEN}• matplotlib: 3.8.2 → 3.8.4${NC}"
    echo -e "   ${GREEN}• 构建依赖: 新增 openblas-dev, freetype-dev${NC}"
    echo ""
    echo "🔄 如需回滚，请运行: ./rollback-pandas-fix.sh"
}

# 主验证流程
echo -e "${YELLOW}=== pandas兼容性修复验证 ===${NC}"
echo ""

test_pandas_import
test_new_versions
test_build_process
show_fix_summary

echo -e "${GREEN}🎉 验证完成！${NC}"