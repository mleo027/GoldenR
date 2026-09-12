当前工作区干净，本次只制定计划，不修改代码。

# 迁移目标

将“业务状态”从 React Context + `useState` 迁移到 Zustand，同时保留真正承担组件生命周期、副作用协调或命令桥接职责的 Provider。

目标结构：

```text
Zustand store：保存状态、提供 actions、支持组件外访问
Data module：负责加载、校验、持久化
Runtime Provider：仅保留必要的 useEffect、初始化和跨 store 协调
Context：仅保留局部 UI/命令桥接状态
```

迁移完成后，`App.tsx` 和 `ApiDebugProviders.tsx` 不再堆叠大量状态 Provider。

---

# 一、先确定边界

## 应迁移到 Zustand 的状态

### 1. AppEnv

文件：

- `src/store/appEnvStore.tsx`
- `src/store/AppEnvContext.ts`
- `src/store/useAppEnv.ts`
- `src/store/appEnvData.ts`

包含：

```ts
env;
loaded;
updateEnv;
patchEnv;
```

这是平台级全局状态，最适合优先迁移。

建议目标：

```ts
export interface AppEnvStore {
  env: AppEnv;
  loaded: boolean;
  load: () => Promise<void>;
  updateEnv: <K extends keyof AppEnv>(key: K, value: AppEnv[K]) => void;
  patchEnv: (partial: Partial<AppEnv>) => void;
}
```

其中：

- `appEnvData.ts` 继续负责读写和 debounce 保存。
- `appEnvStore.ts` 负责 Zustand 状态。
- `preloadAppEnv()` 继续保留，供 `main.tsx` 提前加载。
- `loaded` 不应在数据加载完成前变成 `true`。
- `mergeAppEnv()` 继续作为统一默认值、字段校验和 `activeModuleId` 归一化入口。

迁移后可以删除：

```tsx
<AppEnvProvider>
```

并将所有：

```ts
const { env, updateEnv } = useAppEnv();
```

改为 Zustand selector。

---

### 2. ApiDebugEnv

文件：

- `src/modules/api-debug/store/apiDebugEnvStore.tsx`
- `src/modules/api-debug/store/ApiDebugEnvContext.ts`
- `src/modules/api-debug/store/useApiDebugEnv.ts`
- `src/modules/api-debug/store/apiDebugEnvData.ts`

这是 API 调试模块级的持久化环境状态，包括编辑器模式、KCXP 环境等。

建议迁移为：

```ts
export const useApiDebugEnvStore = create<ApiDebugEnvStore>(...)
```

重要事项：

- 保留 `apiDebugEnvData.ts` 的加载、持久化、legacy 字段处理逻辑。
- `ParamSuggestProvider` 当前依赖 `useApiDebugEnv`，迁移后改为直接订阅 Zustand。
- `TabsProvider`、`ApiCallProvider` 也需要改为读取 Zustand。
- `ApiDebugProviders` 中移除 `ApiDebugEnvProvider`。
- 由于 API 调试模块是懒加载模块，store 应保持模块级单例，但不能依赖某个 Provider 才初始化。

---

### 3. ParamSuggest

文件：

- `src/modules/api-debug/store/paramSuggestStore.tsx`
- `src/modules/api-debug/store/ParamSuggestContext.ts`
- `src/modules/api-debug/store/useParamSuggest.ts`
- `src/modules/api-debug/store/paramSuggestData.ts`

这是持久化的参数建议规则和数据库配置状态。

迁移重点：

- `load`、`loaded`、`dbConfig`、`rules` 进入 Zustand。
- 保留数据库配置加载与主进程同步逻辑。
- `updateDbConfig`、规则增删改、`syncRulesToMain` 等改为 Zustand actions。
- 不要把 Electron IPC 细节放进 UI 组件。
- 继续通过现有数据模块和 IPC 客户端完成持久化。

迁移后，`ApiDebugProviders` 不再需要 `ParamSuggestProvider`。

---

### 4. CommonParams

文件：

- `src/modules/api-debug/store/commonParamsStore.tsx`
- `src/modules/api-debug/store/CommonParamsContext.ts`
- `src/modules/api-debug/store/useCommonParams.ts`
- `src/modules/api-debug/store/commonParamsData.ts`

这是跨请求编辑器、设置页和调用流程共享的公共参数集合，属于典型业务全局状态。

迁移内容：

```ts
sets
loaded
load
addSet
updateSet
deleteSet
...
```

需要特别注意：

- `ApiCallProvider` 会读取 `sets`。
- `CommonParamsSettings` 需要状态和 actions。
- `usePathBarController`、`useCaseSidebarController`、`RequestPanel` 也依赖它。
- 当前 Context 已经拆成 state/actions 两组，迁移时可以保留相同的 hook API 形状，减少组件改动。

推荐先实现新的 Zustand hook，再让旧的 `useCommonParamsState()` / `useCommonParamsActions()` 暂时作为兼容包装，待所有调用点改完后删除 Context 文件。

---

### 5. RequestHistory

文件：

- `src/modules/api-debug/store/requestHistoryStore.tsx`
- `src/modules/api-debug/store/RequestHistoryContext.ts`
- `src/modules/api-debug/store/useRequestHistory.ts`
- `src/modules/api-debug/store/requestHistoryData.ts`

这是持久化业务数据，不应依赖 React Provider 生命周期。

迁移内容：

```ts
entries;
loaded;
addEntry;
deleteEntry;
clearHistory;
load;
```

需要保证：

- 首次加载只执行一次。
- `entriesRef` 目前用于避免异步保存闭包问题，迁移后改用 `get()` 获取最新状态。
- `RequestHistoryPage`、`HistoryDetailTab`、`CaseTabBar`、`ApiCallProvider` 的行为保持不变。
- 删除、清空、保存失败行为保留。
- 继续使用现有 `requestHistoryData.ts`，不要把持久化逻辑塞进组件。

---

### 6. Response

文件：

- `src/modules/api-debug/store/responseStore.tsx`
- `src/modules/api-debug/store/ResponseContext.ts`
- `src/modules/api-debug/store/useResponse.ts`

这是按 `caseId` 管理的运行时缓存，适合使用 Zustand。

目标状态：

```ts
{
    byCaseId: Record<string, ResponseData>;
    order: string[];
}
```

目标 actions：

```ts
setResponse(caseId, response);
clearResponse(caseId);
```

注意事项：

- 保留最大缓存数量限制。
- 保留按 case 清理逻辑。
- `ResponseLifecycleSync` 可以继续作为组件副作用同步器，但它读取和调用的对象改为 Zustand store。
- `ResponsePanel` 和 `CaseScriptPanel` 应使用 selector，避免所有响应变化导致无关组件刷新。

---

### 7. ScriptConsole

文件：

- `src/modules/api-debug/store/scriptConsoleStore.tsx`
- `src/modules/api-debug/store/ScriptConsoleContext.ts`
- `src/modules/api-debug/store/useScriptConsole.ts`

迁移方式与 Response 基本一致：

```ts
byCaseId;
order;
setScriptConsole;
clearScriptConsole;
```

保留：

- 最大缓存数量限制。
- 按 case 清理。
- `useScriptConsole(caseId)` 这个便捷 hook，但内部改为 Zustand selector。
- `ResponseLifecycleSync` 的清理行为。

---

### 8. RunLog

文件：

- `src/modules/api-debug/store/runLogStore.tsx`
- `src/modules/api-debug/store/RunLogContext.ts`
- `src/modules/api-debug/store/useRunLog.ts`

迁移内容：

```ts
logs;
pushLog;
clearLogs;
```

注意：

- 当前已经有 `useRunLogState()` 和 `useRunLogActions()`，可以保持这些公开 hook 名称。
- `useRunLog()` 已标记为 deprecated，迁移后仍可短期保留兼容包装。
- `MAX_LOGS = 50` 的限制必须保持。
- 由于日志是运行时状态，不需要持久化。

---

### 9. RequestHistoryNavigation

文件：

- `src/modules/api-debug/store/requestHistoryNavigationStore.tsx`
- `src/modules/api-debug/store/requestHistoryNavigationContext.ts`
- `src/modules/api-debug/store/useRequestHistoryNavigation.ts`

这是模块内导航状态：

```ts
view;
historyOpen;
detailId;
traceData;
traceCaseName;
```

建议迁移到 Zustand，原因是它被多个页面和布局组件共同使用：

- `ApiDebugLayout`
- `CaseTabBar`
- `RequestHistoryPage`
- `HistoryDetailTab`
- `TraceView`
- `ResponsePanel`

迁移后删除 `RequestHistoryNavigationProvider`，保留同名 hook 作为 Zustand selector 封装。

---

# 二、保留但重新定义职责的模块

## TabsProvider

文件：

- `src/modules/api-debug/store/tabsStore.tsx`
- `src/modules/api-debug/store/tabsZustand.ts`

`Tabs` 已经使用 Zustand，不需要重复迁移。

但 `TabsProvider` 目前名字容易造成误解。它实际上负责：

- store reset
- workspace 持久化
- AppEnv 和 ApiDebugEnv 联动
- Undo/Redo 接入
- 初始化 active KCXP environment
- 配置 tabs action runtime

后续建议：

```text
TabsProvider -> TabsRuntime
```

或者：

```text
WorkspaceRuntime
```

它仍然可以作为 Provider 形式存在，但不再是状态容器。

---

## ApiCallProvider

文件：

- `src/modules/api-debug/store/apiCallStore.ts`
- `src/modules/api-debug/store/apiCallProvider.tsx`
- `src/modules/api-debug/store/ApiCallContext.ts`

当前已经部分使用 Zustand：

```ts
runningCaseId;
traceEnabled;
```

但 `run/cancel` 依赖多个 store 和运行时 coordinator，因此仍使用 Context。

建议拆分为：

```text
apiCallStore.ts       Zustand：runningCaseId、traceEnabled、actions
callExecutionCoordinator.ts 业务执行协调
apiCallRuntime.ts     React 生命周期绑定
```

`ApiCallProvider` 可以最终改成一个轻量的 runtime 组件，或者直接改名为 `ApiCallRuntime`。

`ApiCallContext` 是否删除取决于是否希望 `useApiCall()` 也直接调用 coordinator。第一阶段不建议强行删除，避免把复杂的执行依赖一次性全部重构。

---

# 三、可以继续使用 Context 的模块

这些不是本次业务状态迁移的重点：

## BreadcrumbProvider

文件：

- `src/platform/shell/BreadcrumbProvider.tsx`

只管理当前页面面包屑字符串，作用域明确、状态简单。可以保留 Context。

## SettingsModalProvider

文件：

- `src/platform/shell/SettingsModalProvider.tsx`

管理设置弹窗打开状态和初始 section。属于局部 UI 状态，可以保留。

## UndoRedoProvider

文件：

- `src/platform/undo/UndoRedoProvider.tsx`

它包含 undo scope、命令栈、生命周期和组件树作用域，不建议简单改成全局 Zustand。可以后续单独评估。

## PlatformShellContext

文件：

- `src/platform/shell/PlatformShellContext.ts`
- `src/platform/shell/PlatformShell.tsx`

用于 shell 内部协调，不是业务数据存储，可以保留。

## KcbpFeedbackBridgeContext / ApiCallContext

这是命令或回调桥接，不是普通状态容器。可以保留到 API 调用 runtime 重构完成。

---

# 四、推荐迁移顺序

建议按依赖关系分批进行，而不是一次性改完。

## 阶段 0：建立统一 Zustand 规范

新增或统一以下约定：

- store 文件命名为 `xxxStore.ts`
- 状态使用 `useXxxStore`
- 数据读写放在 `xxxData.ts`
- selector 优先返回最小字段
- actions 使用稳定函数
- 需要组件外访问时使用：
  ```ts
  useXxxStore.getState();
  ```
- 异步 load 使用 store action，但不能让组件重复触发加载
- 所有持久化状态必须有加载成功、失败和默认值路径

同时明确不再新建：

```text
xxxContext.ts
xxxStore.tsx + xxxProvider
```

除非它确实是组件树作用域或生命周期 runtime。

---

## 阶段 1：迁移 AppEnv

原因：

- 平台级状态。
- 调用点较多但数据模型简单。
- 其他模块的 Provider 可能依赖它。
- 迁移后能直接验证全局状态模式。

步骤：

1. 新建 Zustand `useAppEnvStore`。
2. 把加载、更新、patch、loaded 状态迁入。
3. 保留 `appEnvData.ts` 的 persistence 行为。
4. 将 `useAppEnv()` 改成 selector 包装。
5. 修改 `App.tsx`，移除 `AppEnvProvider`。
6. 修改所有 AppEnv 使用方。
7. 删除 `AppEnvContext.ts` 和旧 Provider。
8. 更新 AppEnv 相关测试和集成测试。

验收：

- 启动后主题、活动模块、侧边栏状态正确恢复。
- 修改设置后仍能保存。
- 刷新或重新启动后配置不丢失。
- `loaded` 之前不渲染主工作区。
- 不再存在 `AppEnvContext`、`AppEnvProvider` 引用。

---

## 阶段 2：迁移 ApiDebugEnv

原因：

- 被多个 API 调试 store 和组件依赖。
- 是后续 ParamSuggest、Tabs、ApiCall 迁移的基础。

步骤：

1. 新建 `useApiDebugEnvStore`。
2. 将 `env`、`loaded`、update/patch actions 迁移。
3. 保留 `apiDebugEnvData.ts` 的数据迁移逻辑。
4. 修改 `useApiDebugEnv()` 为兼容性 selector hook。
5. 修改 `ParamSuggestStore`、`TabsRuntime`、`ApiCallProvider`。
6. 修改所有 API 调试组件。
7. 从 `ApiDebugProviders` 移除 `ApiDebugEnvProvider`。
8. 删除 Context 文件和旧 Provider。

验收：

- editor mode、KCXP environment 等配置行为不变。
- legacy 配置只迁移一次。
- 无 API 调试页面出现 Provider 缺失错误。

---

## 阶段 3：迁移 CommonParams 与 ParamSuggest

这两个模块都属于配置型状态，且存在相互依赖。

建议顺序：

```text
CommonParams -> ParamSuggest
```

步骤：

1. 先迁移 CommonParams。
2. 保留旧的 `useCommonParamsState/actions` 作为短期兼容包装。
3. 修改设置页、RequestPanel、PathBar、ApiCall 等调用方。
4. 删除 `CommonParamsProvider`。
5. 再迁移 ParamSuggest。
6. 把数据库配置、规则加载和 IPC 同步封装进 Zustand actions。
7. 修改 `useParamSuggestRulesSettings`、设置页和参数建议 hook。
8. 删除 `ParamSuggestProvider`。
9. 从 `ApiDebugProviders` 移除两个 Provider。

验收：

- 公共参数增删改仍能保存。
- 参数建议规则加载和刷新仍正常。
- SQL 编辑器使用的配置仍与当前环境同步。
- IPC 失败时仍有日志或错误反馈。

---

## 阶段 4：迁移 Response、ScriptConsole、RunLog

这三个主要是运行时缓存，互相存在生命周期清理关系。

建议顺序：

```text
Response -> ScriptConsole -> RunLog
```

步骤：

1. 将 Response state/actions 转为 Zustand。
2. 修改 `useResponse()` 使用 selector。
3. 保留 `ResponseLifecycleSync`，仅改其数据来源。
4. 迁移 ScriptConsole。
5. 迁移 RunLog。
6. 保留 deprecated hook 的兼容实现。
7. 从 `ApiDebugProviders` 移除三个 Provider。
8. 更新 `ApiCallProvider` 对应依赖。

验收：

- 执行接口后 response、console、日志均正常显示。
- 删除 case 后三类缓存都能清除。
- 最大缓存数量限制保持不变。
- 多个 case 之间数据不串扰。

---

## 阶段 5：迁移 RequestHistory 与 Navigation

步骤：

1. 迁移 RequestHistory 数据状态。
2. 使用 Zustand `get()` 替代原来的 `entriesRef` 闭包方案。
3. 保留持久化 debounce 和 flush 机制。
4. 修改历史页、历史详情页、CaseTabBar、ApiCall。
5. 迁移 RequestHistoryNavigation。
6. 修改 `ApiDebugLayout`、`TraceView`、`ResponsePanel`。
7. 从 `ApiDebugProviders` 移除两个 Provider。
8. 删除 Context 文件和旧 hook 实现。

验收：

- 历史记录加载、添加、删除、清空正常。
- 关闭历史详情后导航状态正确。
- trace 数据和详情 tab 行为不变。
- 应用退出时待保存历史仍能 flush。

---

## 阶段 6：整理 Tabs 与 ApiCall Runtime

### Tabs

- 保留 `tabsZustand.ts`。
- 将 `tabsStore.tsx` 改为 `TabsRuntime.tsx`。
- 清理其中旧 Provider 语义。
- 保留持久化、Undo/Redo、环境初始化逻辑。

### ApiCall

- 保留 `apiCallStore.ts`。
- 将 `ApiCallProvider` 中的状态读取全部改为 Zustand selector。
- 评估 `run/cancel` 是否可以通过独立 runtime hook 暴露。
- 暂时保留 `ApiCallContext`，直到 coordinator 不再依赖 React 组件树。

---

# 五、最终 Provider 结构

迁移前：

```tsx
<AppEnvProvider>
  <AppContent>
    <ApiDebugEnvProvider>
      <ParamSuggestProvider>
        <CommonParamsProvider>
          <TabsProvider>
            <RequestHistoryProvider>
              <RequestHistoryNavigationProvider>
                <ResponseProvider>
                  <ScriptConsoleProvider>
                    <RunLogProvider>
                      <ApiCallProvider>
```

迁移后的理想结构：

```tsx
<AppContent>
  <AppThemeProvider>
    <UndoRedoProvider>
      <BreadcrumbProvider>
        <PlatformShell>
          <ApiDebugRuntime>
            <TabsRuntime>
              <ApiCallRuntime>
```

其中 Zustand store 本身不需要 Provider。

---

# 六、测试计划

每个迁移模块都需要覆盖以下测试。

## Store 单元测试

- 默认状态。
- 同步 action。
- 异步加载成功。
- 加载失败后的默认值。
- 多次 load 不重复执行。
- 持久化调用参数。
- 状态更新后的数据归一化。
- reset 行为。

## 组件测试

- 原有组件不再依赖 Provider。
- selector 只读取所需字段。
- 设置页能够更新 store。
- loading 状态正确显示或阻止渲染。

## 集成测试

需要重点修改：

- `src/modules/api-debug/providers/*.integration.test.tsx`
- `src/modules/api-debug/components/editor/path.integration.test.tsx`
- `src/modules/api-debug/components/settings/paramSuggestRulesSettings.integration.test.tsx`
- `src/modules/api-debug/store/*Data.test.ts`
- `src/modules/api-debug/store/tabsZustand.test.ts`

测试组件时直接清理 Zustand store，避免测试之间相互污染：

```ts
beforeEach(() => {
  useSomeStore.setState(createInitialState());
});
```

---

# 七、每阶段验证命令

每迁移一批后运行：

```bash
npm run typecheck
npm run test:component
npm run test:core
npm run test:persist
```

API 调试核心迁移完成后运行：

```bash
npm run test:api
npm run test:integration
npm run ipc:check
npx vite build
npm run lint
git diff --check
```

最终还要确认：

```bash
rg -n "createContext|useContext|Context\\.Provider" src/store src/modules/api-debug/store
```

结果中只能剩下明确保留的 Context，例如：

- ApiCall 命令桥
- KCBP feedback bridge
- 非业务 UI Provider

不应再出现：

- `AppEnvProvider`
- `ApiDebugEnvProvider`
- `CommonParamsProvider`
- `ParamSuggestProvider`
- `RequestHistoryProvider`
- `RequestHistoryNavigationProvider`
- `ResponseProvider`
- `ScriptConsoleProvider`
- `RunLogProvider`

---

# 八、建议的实施顺序总结

```text
1. Zustand 规范和测试工具
2. AppEnv
3. ApiDebugEnv
4. CommonParams
5. ParamSuggest
6. Response
7. ScriptConsole
8. RunLog
9. RequestHistory
10. RequestHistoryNavigation
11. TabsRuntime 重命名和整理
12. ApiCallRuntime 整理
13. 删除兼容 Context、清理 Provider 栈
14. 全量验证
```

这次迁移的关键不是简单地把每个 `useState` 换成 `create`，而是把“状态存储”和“生命周期副作用”拆开。否则只是把 Context 换成 Zustand，持久化和运行时耦合仍然会继续留在 Provider 里。
