## 修复HTML嵌套错误

### 问题分析
错误信息：`In HTML, <div> cannot be a descendant of <p>.`

问题根源：
- `ListItemText` 组件的 `secondary` 属性默认通过 `Typography` 渲染为 `<p>` 标签
- 在 `secondary` 属性中嵌套了 `Box` 组件（渲染为 `<div>`）
- `Box` 组件内部包含 `Chip` 组件（渲染为 `<div>`）
- 最终结构：`<p>` -> `<div>` -> `<div>`，违反HTML规范

### 解决方案
通过设置 `secondaryTypographyProps={{ component: 'div' }}`，将 `secondary` 属性的渲染方式从 `<p>` 改为 `<div>`，这样内部的 `<div>` 嵌套就合法了。

### 修复位置
1. **涨幅榜**：`src/app/page.tsx` 第307行左右的 `ListItemText` 组件
2. **跌幅榜**：`src/app/page.tsx` 第375行左右的 `ListItemText` 组件

### 修复步骤
1. 为涨幅榜中的 `ListItemText` 添加 `secondaryTypographyProps={{ component: 'div' }}`
2. 为跌幅榜中的 `ListItemText` 添加 `secondaryTypographyProps={{ component: 'div' }}`
3. 验证修复效果，确保没有其他类似问题

### 预期效果
修复后，HTML结构将变为：`<div>` -> `<div>` -> `<div>`，符合HTML规范，不再出现hydration错误。