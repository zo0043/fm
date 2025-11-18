# NestJS 前端应用 Dockerfile - 多阶段构建优化

# 阶段1: 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装构建依赖
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++

# 复制package文件并安装依赖
COPY frontend/package*.json ./
RUN npm install --include=dev

# 复制源代码
COPY frontend/ .

# 构建应用
RUN npm run build

# 阶段2: 生产运行阶段
FROM node:18-alpine AS production

# 设置工作目录
WORKDIR /app

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# 只安装生产依赖
COPY frontend/package*.json ./
RUN npm install --production && npm cache clean --force

# 复制构建结果
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# 设置文件权限
RUN chown -R nodejs:nodejs /app

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动应用
CMD ["node", "dist/main"]