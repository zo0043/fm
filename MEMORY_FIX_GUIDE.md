# Docker内存不足问题修复指南

## 问题现象
```
failed to solve: ResourceExhausted: process "/bin/sh -c pip install ..." did not complete successfully: cannot allocate memory
```

## 解决方案

### 方案1：使用内存限制构建（推荐）
```bash
# 使用提供的优化脚本
./build-with-memory-limit.sh

# 或手动指定内存限制
docker build --memory=2g --memory-swap=2g -f Dockerfile.optimized -t fund-monitor-python:optimized .
```

### 方案2：使用轻量级Alpine镜像
```bash
# 构建超轻量版本
docker build -f Dockerfile.alpine -t fund-monitor-python:alpine .

# 更新Dockerfile.base
sed -i.bak 's/fund-monitor-python:local/fund-monitor-python:alpine/g' Dockerfile.base
```

### 方案3：分批安装依赖
```bash
# 创建分步构建脚本
cat > build-steps.sh << 'EOF'
#!/bin/bash
set -e

echo "步骤1: 基础依赖"
docker build --target fund-monitor-base-optimized -t fund-monitor:base .

echo "步骤2: 数据依赖"
docker build --target fund-monitor-data -t fund-monitor:data .

echo "步骤3: 服务依赖"
docker build --target fund-monitor-service -t fund-monitor:final .
EOF
chmod +x build-steps.sh
./build-steps.sh
```

### 方案4：外部安装依赖
```bash
# 在宿主机安装依赖，避免容器内存限制
python -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# 导出依赖到文件
pip freeze > requirements-frozen.txt

# 在Dockerfile中安装
COPY requirements-frozen.txt .
RUN pip install --no-cache-dir -r requirements-frozen.txt
```

## 系统资源优化

### 立即释放内存
```bash
# 清理Docker资源
docker system prune -f
docker builder prune -f

# 清理构建缓存
docker builder prune -a -f

# 关闭不必要的应用
# - 浏览器
# - IDE（如果不是当前使用）
# - 虚拟机
```

### 监控内存使用
```bash
# 实时监控内存
vm_stat | grep "Pages free"

# 监控Docker进程
docker stats

# 查看内存使用最高的进程
ps aux | head -20
```

## 构建配置优化

### 1. Docker Desktop设置
- 打开Docker Desktop
- Settings > Resources > Memory limit
- 设置为 4GB 或更高（推荐 6GB）

### 2. 使用BuildKit缓存
```bash
# 启用BuildKit
export DOCKER_BUILDKIT=1

# 使用缓存构建
docker build --cache-from=fund-monitor-python:local ...
```

### 3. 多阶段构建优化
```dockerfile
# Dockerfile.multi-stage
FROM python:3.11-slim AS deps
WORKDIR /build
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim AS runtime
WORKDIR /app
COPY --from=deps /root/.local /home/app/.local
COPY . .
USER app
```

## 永久解决方案

### 1. 升级硬件
- 增加物理内存到 16GB 或更高
- 使用 SSD 存储提升 I/O 性能

### 2. 优化依赖管理
- 使用 `pip-tools` 生成最小化依赖
- 移除未使用的包
- 使用轻量级替代方案（如 `requests` 替代 `httpx`）

### 3. 云构建
```bash
# 使用GitHub Actions在云端构建
# .github/workflows/build.yml
name: Build Docker Image
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and push
        run: |
          docker build -t registry/image:tag .
          docker push registry/image:tag
```

## 故障排除清单

- [ ] 清理Docker资源：`docker system prune -f`
- [ ] 重启Docker Desktop
- [ ] 关闭不必要的应用程序
- [ ] 检查可用内存：`vm_stat | grep "Pages free"`
- [ ] 调整Docker Desktop内存限制
- [ ] 使用轻量级镜像：`python:3.11-alpine`
- [ ] 分批安装依赖
- [ ] 使用外部虚拟环境

## 验证修复

构建成功后，应看到：
```bash
$ docker images | grep fund-monitor-python
fund-monitor-python  optimized  abc123  2 minutes ago  450MB
```

而不是构建失败的错误信息。
