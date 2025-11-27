#!/bin/bash
# 回滚脚本：pandas aarch64兼容性修复回滚方案
# 使用方法: ./rollback-pandas-fix.sh

echo "🔄 开始回滚pandas兼容性修复..."

# 备份当前文件
echo "📦 备份当前文件..."
cp backend/services/backtest/requirements.txt backend/services/backtest/requirements.txt.backup.$(date +%Y%m%d_%H%M%S)
cp backend/services/data_collector/requirements.txt backend/services/data_collector/requirements.txt.backup.$(date +%Y%m%d_%H%M%S)
cp Dockerfile.base Dockerfile.base.backup.$(date +%Y%m%d_%H%M%S)

# 回滚到原始版本
echo "⏪ 回滚依赖版本..."

# 回滚backtest服务requirements.txt
cat > backend/services/backtest/requirements.txt << 'EOF'
# 回测服务依赖
# 基础依赖继承自共享库
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
asyncpg==0.29.0
redis==5.0.1
influxdb-client==1.38.0
httpx==0.25.2
pydantic==2.5.0
loguru==0.7.2

# 数据处理和分析
pandas==2.1.4
numpy==1.25.2
scipy==1.11.4
scikit-learn==1.3.2

# 财经计算
empyrical==0.5.5
pyfolio==0.9.2

# 可视化
matplotlib==3.8.2
seaborn==0.13.0
plotly==5.17.0

# 日期处理
python-dateutil==2.8.2

# 异步任务
apscheduler==3.10.4

# 工具库
pytz==2023.3
aiofiles==23.2.1
EOF

# 回滚data_collector服务requirements.txt
cat > backend/services/data_collector/requirements.txt << 'EOF'
# 数据收集服务依赖
# 基础依赖继承自共享库
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
asyncpg==0.29.0
redis==5.0.1
influxdb-client==1.38.0
httpx==0.25.2
pydantic==2.5.0
loguru==0.7.2

# 调度任务
apscheduler==3.10.4
celery==5.3.4

# 数据处理
pandas==2.1.4
numpy==1.25.2
beautifulsoup4==4.12.2
lxml==4.9.3

# 财经数据源
akshare==1.17.83
yfinance==0.2.28

# 工具库
python-dateutil==2.8.2
pytz==2023.3
EOF

# 回滚基础镜像pandas版本
sed -i '' 's/pandas==2.2.2/pandas==2.1.4/g' Dockerfile.base
sed -i '' 's/numpy==1.26.4/numpy==1.25.2/g' Dockerfile.base

echo "✅ 回滚完成！"
echo "📋 回滚内容："
echo "   - pandas: 2.2.2 → 2.1.4"
echo "   - numpy: 1.26.4 → 1.25.2"
echo "   - scipy: 1.13.0 → 1.11.4"
echo "   - scikit-learn: 1.4.2 → 1.3.2"
echo ""
echo "🚀 如需重新构建，请运行："
echo "   docker-compose build --no-cache backtest_service data_collector"