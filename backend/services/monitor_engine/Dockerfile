# 监控引擎服务 Dockerfile - 优化版本
FROM fund-monitor-base AS monitor-engine

# 复制服务特定的依赖和代码
COPY backend/services/monitor_engine/requirements.txt /app/service-requirements.txt
RUN pip install --no-cache-dir -r service-requirements.txt

# 复制服务代码（最后复制以最大化层缓存）
COPY backend/services/monitor_engine /app/

# 创建日志目录
RUN mkdir -p /app/logs

# 暴露端口（覆盖基础镜像）
EXPOSE 8002

# 健康检查（覆盖基础镜像）
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8002/health || exit 1

# 启动命令
CMD ["python", "main.py"]