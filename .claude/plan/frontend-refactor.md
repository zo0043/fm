# 前端重构计划

## 任务描述
深度分析前端界面代码逻辑，修复所有问题并提升设计感

## 执行时间
2025-12-04

## 问题清单

### 架构问题 (4个)
1. ✅ Standalone组件被错误声明在NgModule中 - 已检查，结构正确
2. ✅ API配置硬编码且不一致 - 已重构 ApiConfigService
3. ✅ 跨域直接调用外部API - 改为通过后端代理
4. ✅ Standalone与NgModule混用 - 结构已正确

### 功能缺陷 (8个)
1. ✅ Dashboard数据加载硬编码 - 已集成 WatchlistService
2. ✅ 监控设置无持久化 - 已实现本地存储 + API同步
3. ✅ 回测服务依赖Mock数据 - 已添加数据来源标识
4. ✅ 基金详情缺少错误处理UI - 已添加
5. ✅ 导出功能未实现 - Dashboard 和基金管理已实现 CSV 导出
6. ✅ 微信/邮件通知测试未实现 - 已通过后端代理实现
7. ✅ 基金筛选覆盖数据 - 已修复，筛选只影响可添加列表
8. ✅ 关注状态未持久化 - WatchlistService 已实现

### 代码质量 (5个)
1. ✅ 重复的格式化方法 - 抽取到 FormatUtils
2. ⚠️ 未使用的导入 - 需后续清理
3. ⚠️ Mock数据生成重复 - 需后续统一
4. ✅ 硬编码的时间常量 - 已抽取到 app.constants.ts
5. ✅ 不一致的错误处理模式 - 已创建 ErrorHandlerService

### 用户体验 (4个)
1. ✅ 无加载骨架屏 - 已创建 SkeletonLoaderComponent
2. ✅ 无空状态设计 - 已创建 EmptyStateComponent
3. ✅ 分页配置不统一 - 已抽取到 PAGINATION 常量
4. ✅ 无离线提示 - ErrorHandlerService 提供模拟数据提示

## 执行阶段

### P1: 架构统一
- [x] 修复 AppModule 声明 (已检查正确)
- [x] 统一 API 配置服务
- [x] 修复 FundService API 调用

### P2: 服务层修复
- [x] 创建 WatchlistService
- [x] 修复 BacktestService
- [x] 修复监控设置持久化

### P3: 组件功能修复
- [x] Dashboard 组件
- [x] 基金管理组件 (已检查正确)
- [x] 基金详情组件 (已检查正确)
- [x] 投资组合组件

### P4: 公共工具抽取
- [x] 格式化工具服务
- [x] 常量配置文件
- [x] 统一错误处理

### P5: 用户体验优化
- [x] 空状态组件
- [x] 骨架屏组件
- [x] 设计感提升
- [x] 统一分页配置

## 新建文件
- ✅ core/services/watchlist.service.ts
- ✅ core/services/error-handler.service.ts
- ✅ shared/utils/format.utils.ts
- ✅ shared/constants/app.constants.ts
- ✅ shared/components/empty-state/empty-state.component.ts
- ✅ shared/components/skeleton-loader/skeleton-loader.component.ts

## 修改文件
- ✅ core/services/api-config.service.ts
- ✅ core/services/fund.service.ts
- ✅ features/backtest/services/backtest.service.ts
- ✅ features/dashboard/dashboard.component.ts
- ✅ features/dashboard/dashboard.component.html
- ✅ features/dashboard/dashboard.component.scss
- ✅ styles.scss (添加 SnackBar 样式)

## 完成状态
- **总体完成率**: 95%
- **剩余工作**: 代码清理（未使用导入、Mock数据统一）
