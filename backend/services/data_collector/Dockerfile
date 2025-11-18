# data_collector服务 Dockerfile - 最终修复版
FROM fund-monitor-python:local

# 设置工作目录
WORKDIR /app

# 重置PATH环境变量（移除包含空格的路径以避免Docker解析错误）
ENV PATH=/usr/local/bin:/usr/bin:/bin:/sbin:/usr/local/games:/usr/games

# 复制服务代码
COPY services/data_collector /app/

# 切换到非root用户
USER appuser

# 安装C++编译工具（用于pandas等包编译）- 需要在非root下使用sudo或切换回root
USER root
RUN apk add --no-cache g++ libc-dev python3-dev
# 升级setuptools以支持Python 3.12
RUN pip3 install --break-system-packages --upgrade setuptools wheel
USER appuser

# 设置环境变量
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 安装服务特定依赖（在非root用户下）
RUN pip install --break-system-packages --user --no-cache-dir -r /app/requirements.txt

# 设置环境变量
ENV PATH=/home/appuser/.local/bin:/usr/local/bin:/usr/bin:/bin

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3   CMD python -c "import requests; requests.get('http://localhost:${PORT:-8000}/health', timeout=5)" || exit 1

# 启动命令
CMD ["python", "main.py"]
