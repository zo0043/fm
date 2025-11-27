# backtest服务 Dockerfile - aarch64兼容修复版
FROM fund-monitor-python:local

# 设置工作目录
WORKDIR /app

# 重置PATH环境变量
ENV PATH=/usr/local/bin:/usr/bin:/bin:/sbin:/usr/local/games:/usr/games

# 复制服务代码
COPY services/backtest /app/

# 安装构建依赖（使用Debian兼容性更好的方法）
USER root
RUN apk add --no-cache \
    gcc \
    g++ \
    musl-dev \
    python3-dev \
    linux-headers \
    pkgconfig \
    openblas-dev \
    freetype-dev

# 升级构建工具
RUN pip3 install --break-system-packages --upgrade setuptools wheel pip

USER appuser

# 设置环境变量
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
# 设置OpenBLAS路径优化性能
ENV OPENBLAS_NUM_THREADS=1

# 分层安装依赖（内存优化）
RUN pip install --break-system-packages --user --no-cache-dir \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    sqlalchemy==2.0.23 \
    asyncpg==0.29.0 \
    redis==5.0.1 \
    influxdb-client==1.38.0 \
    httpx==0.25.2 \
    pydantic==2.5.0 \
    loguru==0.7.2

# 安装核心计算库（最新版本，更好的aarch64支持）
RUN pip install --break-system-packages --user --no-cache-dir \
    numpy==1.26.4 \
    pandas==2.2.2

# 安装其他依赖
RUN pip install --break-system-packages --user --no-cache-dir \
    scipy==1.13.0 \
    scikit-learn==1.4.2 \
    empyrical==0.5.5 \
    matplotlib==3.8.4 \
    seaborn==0.13.2 \
    plotly==5.22.0 \
    python-dateutil==2.8.2 \
    apscheduler==3.10.4 \
    pytz==2023.3 \
    aiofiles==23.2.1

# 设置环境变量
ENV PATH=/home/appuser/.local/bin:/usr/local/bin:/usr/bin:/bin

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:${PORT:-8000}/health', timeout=5)" || exit 1

# 启动命令
CMD ["python", "main.py"]