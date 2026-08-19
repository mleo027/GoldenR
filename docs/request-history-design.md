# 请求历史页设计

## 1. 目标

在 Golden API 中提供可持久化的请求历史页，让用户能够：

- 查看每次 KCBP 调用的请求快照、响应快照和运行结果。
- 按时间、项目、Case、Msgtype、环境、执行模式、状态和耗时检索历史。
- 从历史载入请求、重新运行、比较和导出。
- 在应用重启后仍保留历史。

## 2. 范围

### 本阶段实现

- 新增 `request-history.json` 配置存储和 allowlist。
- 新增 RequestHistory store、data service 和持久化 writer。
- KCBP 调用完成后记录一条完整历史。
- 历史入口进入历史页。
- 历史列表、筛选、详情、载入当前请求、重新运行。

### 暂缓实现

- 复杂响应对比器。
- 请求收藏、标签和自定义分组。
- 多窗口历史同步。

## 3. 入口

不占用底部状态栏通知按钮。入口如下：

1. 主入口：API Debug 左侧 CaseSidebarHeader 的 History 按钮。
2. 次入口：命令面板命令“请求历史”。
3. 快捷入口：`Ctrl+H` 打开历史页。

底部状态栏保留为消息/通知入口。

## 4. 页面布局

历史页作为 API Debug 模块内的一级视图：

```text
┌────────────────────────────────────────────────────────┐
│ 返回工作区  请求历史                      载入/重跑操作 │
├──────────────┬──────────────────────┬──────────────────┤
│ 筛选区       │ 历史列表             │ 历史详情         │
│ 时间范围     │ 时间/Msgtype/Case/   │ 请求快照         │
│ 项目/Case    │ 状态/耗时/行数       │ 响应快照         │
│ Msgtype      │                      │ 运行细节         │
│ 环境/模式    │                      │ 错误信息         │
│ 结果/指标    │                      │                  │
└──────────────┴──────────────────────┴──────────────────┘
```

## 5. 数据模型

```ts
interface RequestHistoryEntry {
  id: string;
  timestamp: number;
  projectId?: string;
  projectName: string;
  caseId?: string;
  caseName: string;
  mode: 'ui' | 'script' | 'tcd';
  environmentId?: string;
  environmentName?: string;
  request: {
    address: string;
    msgtype: string;
    queue?: string;
    timeout?: string;
    params: ParamItem[];
    script?: string;
    runInput?: Record<string, unknown>;
  };
  response?: ResponseData;
  outcome: {
    success: boolean;
    rows?: number;
    timecost?: number;
    dataSize?: number;
    businessCode?: string;
    transportCode?: string;
    message?: string;
    scriptError?: string;
    scriptTest?: ScriptTestResult;
    callSteps?: KcbpCallStep[];
    console?: ScriptConsoleSnapshot;
  };
}
```

## 6. 持久化

- 文件：`request-history.json`
- 位置：现有配置存储目录。
- 容量：默认保留最近 500 条，超过后按时间清理。
- 写入：使用现有 `DebounceWriter`，退出 flush 时一并落盘。
- 设置：新增“自动保存历史”开关，默认开启。

## 7. 功能清单

### 列表

- 时间倒序。
- 状态、Msgtype、项目/Case、Host/Queue、模式、耗时、行数、大小、错误摘要。
- 按时间范围、项目、Case、Msgtype、环境、模式、成功/失败、耗时区间筛选。
- 关键字搜索请求参数、响应 message、错误文本。

### 详情

- 请求快照：地址、queue、timeout、msgtype、参数、脚本、runInput、环境。
- 响应快照：code、msg、data、stats、calledAt。
- 运行上下文：调用 ID、TCD call steps、脚本 console、脚本测试结果。
- 错误信息：主错误、业务错误、传输错误。

### 操作

- 载入当前请求：恢复地址、参数和脚本，不自动运行。
- 重新运行：使用历史快照直接重发。
- 编辑并运行：载入后再修改并运行。
- 复制请求 JSON。
- 导出 CSV / HTML / JSON。
- 单条删除、批量删除、清空全部。

## 8. 现有代码接入点

- `KcbpCallProvider`：在 `invokeKcbpCall` 返回后写入历史。
- `RunLogEntry`：可扩展或由历史记录替代展示。
- `ResponsePanel` / `Grid`：历史详情复用响应表格。
- `CaseSidebarHeader`：增加历史入口。
- `PlatformCommandPalette`：注册“请求历史”命令。
- `platformShortcuts`：增加 `Ctrl+H`。
- `configStorage` / `ConfigStorageFileName`：增加 `request-history.json`。
- `persist.ts`：退出 flush 增加历史 flush。

## 9. 实施顺序

1. 数据模型、allowlist、历史 store 和持久化 writer。
2. KCBP 调用后写入历史。
3. 历史页基础布局和列表。
4. 筛选、详情、载入当前请求、重新运行。
5. 命令面板、快捷键和入口按钮。
6. 测试、全量门禁和构建。

## 10. 验收标准

- `npm run check`、`npm run test:api`、`npx vite build` 通过。
- 重启后历史仍可查看。
- 历史载入不改变原请求自动运行行为。
- 通知按钮仍只承担通知，历史入口不依赖底部状态栏。
