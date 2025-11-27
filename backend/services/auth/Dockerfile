# auth服务 Dockerfile - 最终修复版
FROM fund-monitor-python:local

# 设置工作目录
WORKDIR /app

# 重置PATH环境变量（移除包含空格的路径以避免Docker解析错误）
ENV PATH=/usr/local/bin:/usr/bin:/bin:/sbin:/usr/local/games:/usr/games

# 设置环境变量
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 复制服务代码
COPY services/auth /app/

# 切换到非root用户
USER appuser

# 安装服务特定依赖（在非root用户下，使用 --user 标志）
RUN pip install --break-system-packages --user --no-cache-dir -r /app/requirements.txt

# 设置环境变量以包含用户本地 bin 目录
ENV PATH=/home/appuser/.local/bin:/usr/local/bin:/usr/bin:/bin

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:${PORT:-8000}/health', timeout=5)" || exit 1

# 启动命令
CMD ["python", "main.py"]
