# 多阶段构建 Dockerfile for Angular 应用

# 阶段1: 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --legacy-peer-deps --only=production --no-optional && npm cache clean --force

# 复制源代码
COPY . .

# 构建生产版本
ARG NODE_ENV=production
ARG NG_CLI_ANALYZE=false

# 设置环境变量
ENV NODE_ENV=$NODE_ENV
ENV NG_CLI_ANALYZE=$NG_CLI_ANALYZE

# 构建应用
RUN npm run build -- --prod --output-path=/app/dist --configuration=production

# 阶段2: 生产阶段 - 使用 nginx 作为 Web 服务器
FROM nginx:alpine AS production

# 安装 curl 用于健康检查
RUN apk add --no-cache curl

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制环境配置脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 创建非 root 用户
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx

# 设置正确的权限
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# 创建 nginx 运行时需要的目录
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# 切换到非 root 用户
USER nginx

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# 启动 nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]

# 阶段3: 开发阶段 - 热重载支持
FROM node:18-alpine AS development

WORKDIR /app

# 复制 package.json
COPY package*.json ./

# 安装依赖（包括开发依赖）
RUN npm install --legacy-peer-deps

# 复制源代码
COPY . .

# 暴露开发服务器端口
EXPOSE 4200

# 使用Angular开发服务器
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "4200", "--disable-host-check", "--configuration=development"]

# 阶段4: 测试阶段
FROM node:18-alpine AS testing

WORKDIR /app

# 复制依赖
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# 复制源代码
COPY . .

# 运行测试
RUN npm run test:ci

# 阶段5: 代码分析阶段
FROM node:18-alpine AS analyze

WORKDIR /app

# 复制依赖
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# 复制源代码
COPY . .

# 运行代码分析和构建分析
ARG NG_CLI_ANALYZE=false
ENV NG_CLI_ANALYZE=$NG_CLI_ANALYZE

RUN npm run build -- --prod --stats-json
RUN npm run analyze -- --stats-json || true