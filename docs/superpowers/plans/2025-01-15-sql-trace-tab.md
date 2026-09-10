# SQL Trace Tab 展示实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 SQL Trace 结果从 ResponsePanel 底部移到新 tab 中展示，通过 Run 按钮旁的按钮触发。

**架构：** 扩展现有的 `RequestHistoryView` 视图系统，添加 `'trace'` 视图类型。trace 数据从 response store 获取，通过 navigation context 管理视图切换。

**技术栈：** React, TypeScript, Ant Design

---

## 文件结构

| 文件                                                             | 职责                                 |
| ---------------------------------------------------------------- | ------------------------------------ |
| `src/modules/api-debug/store/requestHistoryNavigationContext.ts` | 添加 `'trace'` 视图类型和 trace 状态 |
| `src/modules/api-debug/store/requestHistoryNavigationStore.tsx`  | 实现 trace 视图切换逻辑              |
| `src/modules/api-debug/components/trace/TraceView.tsx`           | 新建：全屏 trace 详情视图            |
| `src/modules/api-debug/components/editor/Path.tsx`               | 修改：添加 "查看 Trace" 按钮         |
| `src/modules/api-debug/components/response/ResponsePanel.tsx`    | 修改：移除 TracePanel                |
| `src/modules/api-debug/components/workspace/CaseTabBar.tsx`      | 修改：显示 trace tab                 |
| `src/modules/api-debug/layout/ApiDebugLayout.tsx`                | 修改：渲染 TraceView                 |

---

### 任务 1：扩展 RequestHistoryView 类型

**文件：**

- 修改：`src/modules/api-debug/store/requestHistoryNavigationContext.ts`

- [ ] **步骤 1：添加 `'trace'` 到 RequestHistoryView 类型**

```typescript
export type RequestHistoryView = 'editor' | 'history' | 'history-detail' | 'trace';
```

- [ ] **步骤 2：添加 trace 状态到 context value**

```typescript
import type { SqlTraceResult } from '@/shared/kcbp/types';

export interface RequestHistoryNavigationContextValue {
  view: RequestHistoryView;
  historyOpen: boolean;
  detailId?: string;
  traceData: SqlTraceResult | null;
  traceCaseName: string;
  openHistory: () => void;
  closeHistory: () => void;
  openHistoryDetail: (entryId: string) => void;
  closeHistoryDetail: () => void;
  closeAllHistory: () => void;
  showEditor: () => void;
  openTrace: (data: SqlTraceResult, caseName: string) => void;
  closeTrace: () => void;
}
```

- [ ] **步骤 3：Commit**

```bash
git add src/modules/api-debug/store/requestHistoryNavigationContext.ts
git commit -m "feat: add trace view type to RequestHistoryView"
```

---

### 任务 2：实现 trace 视图切换逻辑

**文件：**

- 修改：`src/modules/api-debug/store/requestHistoryNavigationStore.tsx`

- [ ] **步骤 1：添加 trace 状态**

```typescript
import type { SqlTraceResult } from '@/shared/kcbp/types';

export function RequestHistoryNavigationProvider({ children }: { children: ReactNode }) {
    const [view, setView] = useState<RequestHistoryView>('editor');
    const [historyOpen, setHistoryOpen] = useState(false);
    const [detailId, setDetailId] = useState<string>();
    const [traceData, setTraceData] = useState<SqlTraceResult | null>(null);
    const [traceCaseName, setTraceCaseName] = useState('');
    // ... existing callbacks
```

- [ ] **步骤 2：添加 openTrace 和 closeTrace 回调**

```typescript
const openTrace = useCallback((data: SqlTraceResult, caseName: string) => {
  setTraceData(data);
  setTraceCaseName(caseName);
  setView('trace');
}, []);

const closeTrace = useCallback(() => {
  setTraceData(null);
  setTraceCaseName('');
  setView('editor');
}, []);
```

- [ ] **步骤 3：更新 value 对象**

```typescript
const value = useMemo(
  () => ({
    view,
    historyOpen,
    detailId,
    traceData,
    traceCaseName,
    openHistory,
    closeHistory,
    openHistoryDetail,
    closeHistoryDetail,
    closeAllHistory,
    showEditor,
    openTrace,
    closeTrace,
  }),
  [
    // ... existing deps
    traceData,
    traceCaseName,
    openTrace,
    closeTrace,
  ],
);
```

- [ ] **步骤 4：Commit**

```bash
git add src/modules/api-debug/store/requestHistoryNavigationStore.tsx
git commit -m "feat: implement trace view navigation logic"
```

---

### 任务 3：创建 TraceView 组件

**文件：**

- 创建：`src/modules/api-debug/components/trace/TraceView.tsx`

- [ ] **步骤 1：创建 TraceView 组件**

```tsx
import { Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useRequestHistoryNavigation } from '../../store/useRequestHistoryNavigation';

export default function TraceView() {
  const { traceData, traceCaseName, closeTrace } = useRequestHistoryNavigation();

  if (!traceData) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span className="font-medium">SQL Trace</span>
          <span className="text-xs opacity-60">— {traceCaseName}</span>
          <span className="text-xs opacity-60">({traceData.events.length} events)</span>
        </div>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={closeTrace}
          aria-label="关闭 Trace 视图"
        />
      </div>
      <div className="flex-1 overflow-auto p-4">
        {traceData.startError || traceData.readError || traceData.stopError ? (
          <div className="text-sm text-red-500 mb-4">
            {traceData.startError || traceData.readError || traceData.stopError}
          </div>
        ) : null}
        {traceData.events.length === 0 && !traceData.startError && !traceData.readError ? (
          <div className="text-sm opacity-60">Trace 已开启但未捕获 SQL</div>
        ) : null}
        {traceData.events.map((event, index) => (
          <details
            key={`${event.timestampUtc}-${index}`}
            className="mb-2 border border-slate-200 dark:border-slate-700 rounded"
          >
            <summary className="cursor-pointer px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
              <span className="mr-3">{new Date(event.timestampUtc).toLocaleTimeString()}</span>
              <span className="mr-3 font-medium">{event.eventType}</span>
              <span className="text-blue-600 dark:text-blue-400">
                {event.durationMs.toFixed(2)} ms
              </span>
              {event.objectName && <span className="ml-3 opacity-60">{event.objectName}</span>}
            </summary>
            <pre className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 whitespace-pre-wrap break-words overflow-x-auto text-sm bg-slate-50 dark:bg-slate-900">
              {event.sqlText || '—'}
            </pre>
          </details>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/modules/api-debug/components/trace/TraceView.tsx
git commit -m "feat: create TraceView component for full-screen trace display"
```

---

### 任务 4：添加 "查看 Trace" 按钮到 PathRunButton

**文件：**

- 修改：`src/modules/api-debug/components/editor/Path.tsx`

- [ ] **步骤 1：导入必要的 hooks 和类型**

```typescript
import { useResponse } from '../../store/useResponse';
import { useActiveTab } from '../../store/useTabs';
import { useRequestHistoryNavigation } from '../../store/useRequestHistoryNavigation';
import { EyeOutlined } from '@ant-design/icons';
import { getCaseLabel } from '../../utils/workspace/caseLabel';
```

- [ ] **步骤 2：在 PathRunButton 中添加 trace 按钮**

```typescript
export function PathRunButton() {
    const { loading, run, cancel, traceEnabled, setTraceEnabled } = useKcbpCall();
    const { activeTab, activeCaseIndex } = useActiveTab();
    const response = useResponse(activeTab.id);
    const { openTrace } = useRequestHistoryNavigation();
    const canRun = Boolean(getElectronAPI()?.kcbp.call);
    const [elapsedSec, setElapsedSec] = useState(0);

    const hasTraceData = Boolean(response?.trace?.events.length);
    const caseName = getCaseLabel(activeTab, activeCaseIndex);

    const handleViewTrace = () => {
        if (response?.trace) {
            openTrace(response.trace, caseName);
        }
    };

    // ... existing timer effect and handleClick

    return (
        <div className="flex items-center gap-2">
            <label className="text-xs" title="按次启用 SQL Server Extended Events">
                SQL Trace{' '}
                <Switch
                    size="small"
                    checked={traceEnabled}
                    onChange={setTraceEnabled}
                    disabled={loading}
                />
            </label>
            {hasTraceData && !loading && (
                <Tooltip title="查看 SQL Trace 详情">
                    <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={handleViewTrace}
                        className="path-trace-btn"
                    >
                        Trace
                    </Button>
                </Tooltip>
            )}
            <Button
                // ... existing Run button props
            >
                {/* ... existing button content */}
            </Button>
        </div>
    );
}
```

- [ ] **步骤 3：Commit**

```bash
git add src/modules/api-debug/components/editor/Path.tsx
git commit -m "feat: add View Trace button next to Run button"
```

---

### 任务 5：移除 ResponsePanel 底部的 TracePanel

**文件：**

- 修改：`src/modules/api-debug/components/response/ResponsePanel.tsx`

- [ ] **步骤 1：删除 TracePanel 组件定义**

删除 `TracePanel` 函数组件（约第 14-45 行）。

- [ ] **步骤 2：移除 ResponsePanel 中的 TracePanel 渲染**

```typescript
export default function ResponsePanel({
    responseCollapsed = false,
    onToggleResponseCollapse,
}: ResponsePanelProps) {
    // ... existing hooks and state

    return (
        <>
            <ResponseBody
                // ... existing props
            />
            {/* 移除: <TracePanel response={response} /> */}
            {fullscreenOpen && (
                // ... existing fullscreen modal
            )}
        </>
    );
}
```

- [ ] **步骤 3：移除未使用的 import**

移除 `parseMsgtypeFromAddress` 如果不再使用。

- [ ] **步骤 4：Commit**

```bash
git add src/modules/api-debug/components/response/ResponsePanel.tsx
git commit -m "refactor: remove TracePanel from ResponsePanel bottom"
```

---

### 任务 6：在 CaseTabBar 中显示 trace tab

**文件：**

- 修改：`src/modules/api-debug/components/workspace/CaseTabBar.tsx`

- [ ] **步骤 1：添加 trace tab 构建函数**

```typescript
function buildTraceTabItems({
  view,
  traceCaseName,
  openTrace,
  closeTrace,
}: {
  view: RequestHistoryView;
  traceCaseName: string;
  openTrace: () => void;
  closeTrace: () => void;
}) {
  if (view !== 'trace') return [];

  return [
    {
      key: 'sql-trace',
      label: `SQL Trace — ${traceCaseName}`,
      active: true,
      onSelect: openTrace,
      onClose: closeTrace,
    },
  ];
}
```

- [ ] **步骤 2：在 CaseTabBar 中集成 trace tab**

```typescript
function CaseTabBar({ variant = 'default' }: CaseTabBarProps) {
  // ... existing hooks
  const {
    view,
    traceCaseName,
    historyOpen,
    detailId,
    openHistory,
    closeHistory,
    openHistoryDetail,
    closeHistoryDetail,
    showEditor,
    closeTrace,
  } = useRequestHistoryNavigation();

  // ... existing items computation
  const items = useMemo(() => {
    // ... existing case and history items
    const traceItems = buildTraceTabItems({
      view,
      traceCaseName,
      openTrace: () => {}, // no-op, view is already trace
      closeTrace,
    });

    return [...caseItems, ...historyItems, ...traceItems];
  }, [, /* ... existing deps */ view, traceCaseName, closeTrace]);

  // ... rest of component
}
```

- [ ] **步骤 3：Commit**

```bash
git add src/modules/api-debug/components/workspace/CaseTabBar.tsx
git commit -m "feat: display trace tab in CaseTabBar"
```

---

### 任务 7：在 ApiDebugLayout 中渲染 TraceView

**文件：**

- 修改：`src/modules/api-debug/layout/ApiDebugLayout.tsx`

- [ ] **步骤 1：导入 TraceView**

```typescript
import TraceView from '../components/trace/TraceView';
```

- [ ] **步骤 2：添加 trace 视图渲染**

```typescript
export default function ApiDebugLayout() {
    const sidebarRef = useRef<CaseSidebarHandle>(null);
    const { view, detailId, traceData, openHistory, closeHistory } = useRequestHistoryNavigation();
    const historyOpen = view !== 'editor' && view !== 'trace';
    // ... existing code

    return (
        <PlatformModuleLayout
            // ... existing props
            main={
                view === 'trace' && traceData ? (
                    <TraceView />
                ) : view === 'history-detail' && detailId ? (
                    <HistoryDetailTab entryId={detailId} />
                ) : historyOpen ? (
                    <RequestHistoryPage onClose={closeHistory} />
                ) : (
                    <Tab />
                )
            }
            // ... rest of props
        />
    );
}
```

- [ ] **步骤 3：Commit**

```bash
git add src/modules/api-debug/layout/ApiDebugLayout.tsx
git commit -m "feat: render TraceView in ApiDebugLayout"
```

---

### 任务 8：运行验证

- [ ] **步骤 1：运行类型检查**

```bash
npm run typecheck
```

预期：无错误

- [ ] **步骤 2：运行测试**

```bash
npm run test:api
```

预期：所有测试通过

- [ ] **步骤 3：运行构建**

```bash
npx vite build
```

预期：构建成功

- [ ] **步骤 4：运行 lint**

```bash
npm run lint
```

预期：无新错误

---

### 任务 9：最终 Commit

- [ ] **步骤 1：提交所有更改**

```bash
git add -A
git commit -m "feat: move SQL Trace display to dedicated tab

- Add 'trace' view type to RequestHistoryView
- Create TraceView component for full-screen trace display
- Add View Trace button next to Run button
- Remove TracePanel from ResponsePanel bottom
- Display trace tab in CaseTabBar
- Render TraceView in ApiDebugLayout"
```
