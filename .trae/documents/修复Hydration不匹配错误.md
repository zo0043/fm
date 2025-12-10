## 修复Hydration不匹配错误

### 问题分析
错误信息：`Hydration failed because the server rendered HTML didn't match the client`

问题根源：
1. **主题处理不一致**：ThemeWrapper在客户端创建主题，服务器端无主题信息
2. **Box组件样式差异**：服务器渲染`<style>`标签，客户端期望`<div>`标签
3. **动态样式生成**：使用`theme.zIndex.drawer + 1`等动态值
4. **字体加载差异**：Geist字体在服务器和客户端的加载状态不同

### 解决方案
通过统一服务器和客户端的主题处理、简化动态样式和优化字体加载，确保两端渲染结果一致。

### 修复步骤

1. **简化主题配置**
   - 将ThemeWrapper中的主题创建提取到独立文件，确保服务器和客户端使用相同配置
   - 移除动态字体配置，使用静态字体定义

2. **修改LayoutContent组件**
   - 替换动态`theme.zIndex.drawer + 1`为静态值
   - 简化Box组件的sx属性，减少动态样式

3. **优化字体加载**
   - 确保字体在服务器和客户端的加载方式一致
   - 避免使用可能导致布局偏移的字体加载策略

4. **确保组件渲染一致性**
   - 检查所有客户端组件，确保没有服务器/客户端分支逻辑
   - 避免在渲染过程中使用动态值（如Date.now()、Math.random()）

### 修复位置
1. **主题配置**：`src/app/_components/ThemeWrapper.tsx`
2. **布局组件**：`src/app/_components/LayoutContent.tsx`
3. **主题提取**：创建`src/app/_utils/theme.ts`

### 预期效果
修复后，服务器和客户端将生成一致的HTML结构和样式，Hydration过程将成功完成，不再出现恢复性错误。

### 额外优化
- 考虑使用CSS Modules或Tailwind CSS减少CSS-in-JS的Hydration问题
- 优化主题配置，减少不必要的动态样式
- 确保所有组件遵循服务器组件和客户端组件的最佳实践