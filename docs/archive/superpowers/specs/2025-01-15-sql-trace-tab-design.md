# SQL Trace Tab 展示设计

## 背景

当前 SQL Trace 结果在 `ResponsePanel` 底部直接渲染，占用响应区域空间。需要改为通过按钮点击后在新 tab 中展示。

## 目标

1. 移除 `ResponsePanel` 底部的 `TracePanel` 组件
2. 在 Run 按钮旁添加 "查看 Trace" 按钮（仅当有 trace 数据时显示）
3. 点击按钮后在 tab 栏打开一个新 tab，全屏展示 SQL Trace 结果
4. 复用现有的 `RequestHistoryView` 视图切换机制

## 设计

### 类型扩展

`requestHistoryNavigationContext.ts`:

- `RequestHistoryView` 添加 `'trace'` 类型
- 新增 `traceData: SqlTraceResult | null` 状态
- 新增 `openTrace(data: SqlTraceResult)` 和 `closeTrace()` 方法

### 状态管理

`requestHistoryNavigationStore.tsx`:

- 使用 `useState` 管理 `traceData`
- `openTrace`: 设置 traceData 并切换 view 到 `'trace'`
- `closeTrace`: 清空 traceData 并切换 view 到 `'editor'`

### UI 组件

**PathRunButton (Path.tsx)**:

- 从 `useKcbpCall()` 获取 `lastTraceData`
- 在 Run 按钮左侧添加 "查看 Trace" 按钮
- 仅当 `lastTraceData?.events.length > 0` 时显示
- 点击调用 `openTrace(lastTraceData)`

**TraceView (新建)**:

- 全屏展示 SQL Trace 事件列表
- 复用现有 `TracePanel` 的渲染逻辑
- 顶部显示关闭按钮，点击调用 `closeTrace()`

**CaseTabBar**:

- 当 view 为 `'trace'` 时，显示 "SQL Trace" tab
- 标签格式: `SQL Trace - {caseName}`
- 关闭 tab 调用 `closeTrace()`

**ApiDebugLayout**:

- 当 view 为 `'trace'` 且 `traceData` 存在时，渲染 `TraceView`

**ResponsePanel**:

- 移除 `<TracePanel response={response} />` 组件

### 数据流

```
Run 完成 → response.trace 存储到 useKcbpCall
         → PathRunButton 检测到 trace 数据，显示按钮
         → 用户点击按钮
         → openTrace(traceData) 存储到 navigation context
         → view 切换到 'trace'
         → CaseTabBar 显示 trace tab
         → ApiDebugLayout 渲染 TraceView
         → 用户关闭 tab → closeTrace() → 回到 editor
```

## 验证

1. 勾选 SQL Trace → Run → 响应返回后按钮出现
2. 点击按钮 → tab 栏出现 trace tab → 主区域显示 trace 详情
3. 关闭 tab → 回到 editor 视图
4. 不勾选 SQL Trace → Run → 按钮不出现
5. 响应区域底部不再显示 trace 面板
