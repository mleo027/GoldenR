# 公共参数（项目级挂载、执行时合并）实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 全局维护多套命名公共参数集，项目右键选择使用哪一套，KCBP 请求执行时自动合并进请求入参（case 覆盖同名），编辑器只读折叠展示，历史记录实际生效参数。

**架构：** 公共参数集持久化于独立配置文件 `common-params.json`（走 configStorage + DebounceWriter）；挂载关系存于 `ProjectData.commonParamSetId`（随 project.json）；合并在执行入口 `invokeKcbpCall` 完成，只影响实际发送的 fields，不回写 case 存储；`KcbpCallOutcome.effectiveParams` 携带实际生效参数供历史记录。

**技术栈：** React 19 + antd 5 + zustand 式 Context store（项目自研 TabsProvider 模式）+ vitest + @testing-library/react。

**规格：** `docs/superpowers/specs/2026-09-07-common-params-design.md`（本计划对规格的两处细化见「与规格的差异」节）。

**与规格的差异（已论证的细化）：**

1. 合并点：规格说"三个调用点前插入"。实际收敛为两处——`executeCase.ts`（UI 模式）与 `scriptRunner.ts`（脚本/TCD 模式的 fallbackPayload）。`apiScript.ts:330` 的 `splitParamsToKcbpFields` 是脚本内部转换函数，接收脚本调用方传入的参数，不注入公共参数。
2. 历史"记录合并后参数"细化为：`KcbpCallOutcome` 新增 `effectiveParams?: ParamItem[]`（实际用于构建发送字段的参数列表），`kcbpCallStore` 记录 `params: outcome.effectiveParams ?? tab.params`。这保证脚本模式下记录的是脚本真实产出的参数，且 `updateTab({ params: outcome.nextParams })` 回写链路（baseParams 保持 case-only）零污染。

---

## 文件结构

| 文件                                                                       | 操作 | 职责                                                                                |
| -------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------- |
| `src/shared/config/files.ts`                                               | 修改 | 注册 `COMMON_PARAMS_FILE = 'common-params.json'`                                    |
| `src/modules/api-debug/types/commonParams.ts`                              | 创建 | `CommonParamSet` / `CommonParamSetFile` 类型                                        |
| `src/modules/api-debug/utils/workspace/commonParams.ts`                    | 创建 | `mergeCommonParams` / `stripMountedCommonParams` / `resolveCommonParamsById` 纯函数 |
| `src/modules/api-debug/utils/workspace/commonParams.test.ts`               | 创建 | 纯函数单测                                                                          |
| `src/modules/api-debug/store/commonParamsData.ts`                          | 创建 | 文件读写 + 校验 + DebounceWriter                                                    |
| `src/modules/api-debug/store/commonParamsData.test.ts`                     | 创建 | 数据层单测                                                                          |
| `src/modules/api-debug/store/CommonParamsContext.ts`                       | 创建 | state/actions 两个 Context                                                          |
| `src/modules/api-debug/store/commonParamsStore.tsx`                        | 创建 | CommonParamsProvider（CRUD actions）                                                |
| `src/modules/api-debug/types/workspace.ts`                                 | 修改 | `ProjectData` / `PersistedProjectRecord` 加 `commonParamSetId?`                     |
| `src/modules/api-debug/store/tabsReducer/types.ts`                         | 修改 | `SET_PROJECT_COMMON_PARAM_SET` action                                               |
| `src/modules/api-debug/store/tabsReducer/projectReducers.ts`               | 修改 | reducer case                                                                        |
| `src/modules/api-debug/store/tabsStore.tsx`                                | 修改 | `setProjectCommonParamSet` action 暴露                                              |
| `src/modules/api-debug/store/tabsReducer.test.ts`                          | 修改 | reducer 单测                                                                        |
| `src/modules/api-debug/store/tabsData.ts`                                  | 修改 | project.json 持久化映射                                                             |
| `src/modules/api-debug/services/kcbp/types.ts`                             | 修改 | `InvokeKcbpCallOptions.commonParams` + `KcbpCallOutcome.effectiveParams`            |
| `src/modules/api-debug/services/kcbp/executeCase.ts`                       | 修改 | UI 模式合并                                                                         |
| `src/modules/api-debug/services/kcbp/scriptRunner.ts`                      | 修改 | fallback 合并 + effectiveParams                                                     |
| `src/modules/api-debug/store/kcbpCallStore.tsx`                            | 修改 | 注入 commonParams、历史记 effectiveParams                                           |
| `src/modules/api-debug/components/editor/ParamEdit.tsx`                    | 修改 | 导出 `ParamTable`、只读折叠区                                                       |
| `src/modules/api-debug/components/request/RequestPanel.tsx`                | 修改 | 传入 `commonParams`                                                                 |
| `src/modules/api-debug/components/settings/CommonParamsSettings.tsx`       | 创建 | 设置面板                                                                            |
| `src/modules/api-debug/index.tsx`                                          | 修改 | 注册 settingsSection                                                                |
| `src/platform/shell/SettingsModalContext.ts` / `SettingsModalProvider.tsx` | 修改 | `openSettings(sectionKey?)`                                                         |
| `src/components/layout/SettingsModal.tsx`                                  | 修改 | 支持 initialSectionKey                                                              |
| `src/modules/api-debug/components/workspace/CaseActionBar.tsx`             | 修改 | 「公共参数」按钮                                                                    |
| `src/modules/api-debug/components/workspace/CaseActionBar.test.tsx`        | 修改 | 测试更新                                                                            |
| `src/modules/api-debug/hooks/useCaseSidebarController.tsx`                 | 修改 | 「公共参数」右键子菜单                                                              |
| `src/modules/api-debug/components/history/useHistoryActions.ts`            | 修改 | 载入历史时 strip                                                                    |

---

### 任务 1：纯函数 mergeCommonParams / stripMountedCommonParams

**文件：**

- 创建：`src/modules/api-debug/utils/workspace/commonParams.ts`
- 测试：`src/modules/api-debug/utils/workspace/commonParams.test.ts`

- [ ] **步骤 1：编写失败的测试**

```ts
// src/modules/api-debug/utils/workspace/commonParams.test.ts
import { describe, expect, it } from 'vitest';
import type { ParamItem } from '../../types/workspace';
import {
  mergeCommonParams,
  resolveCommonParamsById,
  stripMountedCommonParams,
} from './commonParams';

const p = (name: string, value: string): ParamItem => ({ name, value, type: 'string' });

describe('mergeCommonParams', () => {
  it('公共在前、case 在后，case 同名覆盖公共', () => {
    const merged = mergeCommonParams([p('orgid', '0101'), p('brhid', '1')], [p('orgid', '0202')]);
    expect(merged).toEqual([p('orgid', '0202'), p('brhid', '1')]);
  });

  it('case 独有参数追加在公共参数之后', () => {
    const merged = mergeCommonParams([p('orgid', '0101')], [p('custid', '-1')]);
    expect(merged).toEqual([p('orgid', '0101'), p('custid', '-1')]);
  });

  it('公共为空时返回等价 case 参数', () => {
    const caseParams = [p('orgid', '0101')];
    expect(mergeCommonParams([], caseParams)).toEqual(caseParams);
  });

  it('不修改两个入参数组', () => {
    const common = [p('orgid', '0101')];
    const caseParams = [p('orgid', '0202')];
    mergeCommonParams(common, caseParams);
    expect(common).toEqual([p('orgid', '0101')]);
    expect(caseParams).toEqual([p('orgid', '0202')]);
  });
});

describe('stripMountedCommonParams', () => {
  it('剔除与公共参数同名且同值的行，保留覆盖行与 case 独有行', () => {
    const params = [p('orgid', '0101'), p('orgid', '0202'), p('custid', '-1')];
    expect(stripMountedCommonParams(params, [p('orgid', '0101')])).toEqual([
      p('orgid', '0202'),
      p('custid', '-1'),
    ]);
  });

  it('公共为空时原样返回', () => {
    const params = [p('orgid', '0101')];
    expect(stripMountedCommonParams(params, [])).toEqual(params);
  });
});

describe('resolveCommonParamsById', () => {
  const sets = [
    { id: 'a', name: 'A', params: [p('orgid', '0101')] },
    { id: 'b', name: 'B', params: [] },
  ];

  it('按 id 返回对应参数集的 params', () => {
    expect(resolveCommonParamsById(sets, 'a')).toEqual([p('orgid', '0101')]);
  });

  it('id 为空或集合不存在时返回空数组', () => {
    expect(resolveCommonParamsById(sets, undefined)).toEqual([]);
    expect(resolveCommonParamsById(sets, 'missing')).toEqual([]);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run src/modules/api-debug/utils/workspace/commonParams.test.ts`
预期：FAIL，报错 "Cannot find module './commonParams'"

- [ ] **步骤 3：编写实现**

```ts
// src/modules/api-debug/utils/workspace/commonParams.ts
import type { CommonParamSet } from '../../types/commonParams';
import type { ParamItem } from '../../types/workspace';

/**
 * 合并公共参数与 case 参数：公共在前、case 在后，同名时 case 覆盖。
 * 纯函数，不修改入参数组。
 */
export function mergeCommonParams(
  common: readonly ParamItem[],
  caseParams: readonly ParamItem[],
): ParamItem[] {
  const caseNames = new Set(caseParams.map((param) => param.name));
  const effectiveCommon = common.filter((param) => !caseNames.has(param.name));
  return [...effectiveCommon, ...caseParams];
}

/** 剔除与公共参数同名且同值的行（用于载入历史时避免公共参数复制进 case）。 */
export function stripMountedCommonParams(
  params: readonly ParamItem[],
  common: readonly ParamItem[],
): ParamItem[] {
  if (common.length === 0) return [...params];
  const commonKeys = new Set(common.map((param) => `${param.name}\u0000${param.value}`));
  return params.filter((param) => !commonKeys.has(`${param.name}\u0000${param.value}`));
}

/** 按挂载 id 解析公共参数；id 为空或集合不存在时返回空数组（未挂载零开销）。 */
export function resolveCommonParamsById(
  sets: readonly CommonParamSet[],
  setId: string | undefined,
): ParamItem[] {
  if (!setId) return [];
  return sets.find((set) => set.id === setId)?.params ?? [];
}
```

同时创建类型文件：

```ts
// src/modules/api-debug/types/commonParams.ts
import type { ParamItem } from './workspace';

/** 一套命名的公共参数集（全局配置，供项目挂载）。 */
export interface CommonParamSet {
  id: string;
  name: string;
  params: ParamItem[];
}

/** common-params.json 文件结构。 */
export interface CommonParamSetFile {
  sets: CommonParamSet[];
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx vitest run src/modules/api-debug/utils/workspace/commonParams.test.ts`
预期：PASS（9 个用例）

- [ ] **步骤 5：Commit**

```bash
git add src/modules/api-debug/types/commonParams.ts src/modules/api-debug/utils/workspace/commonParams.ts src/modules/api-debug/utils/workspace/commonParams.test.ts
git commit -m "feat(common-params): 合并/剥离/解析纯函数"
```

---

### 任务 2：配置文件注册 + 数据层

**文件：**

- 修改：`src/shared/config/files.ts`
- 创建：`src/modules/api-debug/store/commonParamsData.ts`
- 测试：`src/modules/api-debug/store/commonParamsData.test.ts`

- [ ] **步骤 1：注册配置文件名**

`src/shared/config/files.ts` 两处修改：

```ts
export const DB_CONFIG_FILE = 'db.json';
export const PARAM_SUGGEST_RULES_FILE = 'param-suggest-rules.json';
export const COMMON_PARAMS_FILE = 'common-params.json';
```

`PERSISTED_CONFIG_FILES` 数组中 `param-suggest-rules.json` 之后加入 `'common-params.json'`。

- [ ] **步骤 2：编写失败的测试**

```ts
// src/modules/api-debug/store/commonParamsData.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isCommonParamSetFile } from './commonParamsData';

describe('isCommonParamSetFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('接受合法的参数集文件结构', () => {
    expect(
      isCommonParamSetFile({
        sets: [
          { id: 'a', name: '交易公共', params: [{ name: 'orgid', value: '0101', type: 'string' }] },
        ],
      }),
    ).toBe(true);
  });

  it('拒绝缺 sets 数组的结构', () => {
    expect(isCommonParamSetFile({})).toBe(false);
    expect(isCommonParamSetFile({ sets: 'no' })).toBe(false);
  });

  it('拒绝参数集字段缺失的结构', () => {
    expect(isCommonParamSetFile({ sets: [{ id: 'a' }] })).toBe(false);
    expect(isCommonParamSetFile({ sets: [{ id: 'a', name: 'A', params: 'no' }] })).toBe(false);
  });
});
```

- [ ] **步骤 3：运行测试验证失败**

运行：`npx vitest run src/modules/api-debug/store/commonParamsData.test.ts`
预期：FAIL，"Cannot find module './commonParamsData'"

- [ ] **步骤 4：编写数据层**

```ts
// src/modules/api-debug/store/commonParamsData.ts
import type { CommonParamSet, CommonParamSetFile } from '../types/commonParams';
import { COMMON_PARAMS_FILE } from '@/shared/config/files';
import { getElectronAPI } from '../../lib/electron';
import { configStorage } from '../../services/persistence/configStorage';
import { DebounceWriter } from '../../services/persistence/debounceWriter';
import { UI_DEBOUNCE_MS } from '../../../constants/ui';

const SAVE_DEBOUNCE_MS = UI_DEBOUNCE_MS.save;

const setsWriter = new DebounceWriter<CommonParamSet[]>({
  write: (sets) => configStorage.write(COMMON_PARAMS_FILE, { sets } satisfies CommonParamSetFile),
  delayMs: SAVE_DEBOUNCE_MS,
  onError: console.error,
});

function isParamItem(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { name?: unknown }).name === 'string' &&
    typeof (value as { value?: unknown }).value === 'string'
  );
}

function isCommonParamSet(value: unknown): value is CommonParamSet {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { name?: unknown }).name === 'string' &&
    Array.isArray((value as { params?: unknown }).params) &&
    ((value as { params: unknown[] }).params as unknown[]).every(isParamItem)
  );
}

export function isCommonParamSetFile(value: unknown): value is CommonParamSetFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { sets?: unknown }).sets) &&
    ((value as { sets: unknown[] }).sets as unknown[]).every(isCommonParamSet)
  );
}

export async function loadCommonParams(): Promise<CommonParamSet[]> {
  const raw: unknown = await configStorage.read(COMMON_PARAMS_FILE, false);
  return isCommonParamSetFile(raw) ? raw.sets : [];
}

export function saveCommonParams(sets: CommonParamSet[]): void {
  setsWriter.schedule(sets);
}
```

数据层只暴露 `loadCommonParams` / `saveCommonParams` / `isCommonParamSetFile`；读取方式与 `paramSuggestData.ts` 的 `readJson` 一致（`configStorage.read(fileName, false)`），顶部 import 相应删去未用的 `getElectronAPI`。

- [ ] **步骤 5：运行测试验证通过**

运行：`npx vitest run src/modules/api-debug/store/commonParamsData.test.ts`
预期：PASS

- [ ] **步骤 6：Commit**

```bash
git add src/shared/config/files.ts src/modules/api-debug/store/commonParamsData.ts src/modules/api-debug/store/commonParamsData.test.ts
git commit -m "feat(common-params): common-params.json 配置文件与数据层"
```

---

### 任务 3：CommonParamsProvider（CRUD store）

**文件：**

- 创建：`src/modules/api-debug/store/CommonParamsContext.ts`
- 创建：`src/modules/api-debug/store/commonParamsStore.tsx`
- 修改：`src/modules/api-debug/providers/ApiDebugProviders.tsx`

- [ ] **步骤 1：创建 Context**

```ts
// src/modules/api-debug/store/CommonParamsContext.ts
import { createContext } from 'react';
import type { CommonParamSet } from '../types/commonParams';

export interface CommonParamsStateContextValue {
  sets: CommonParamSet[];
  loaded: boolean;
}

export interface CommonParamsActionsContextValue {
  addSet: (name: string) => CommonParamSet;
  renameSet: (setId: string, name: string) => void;
  deleteSet: (setId: string) => void;
  updateSetParams: (setId: string, params: CommonParamSet['params']) => void;
}

export const CommonParamsStateContext = createContext<CommonParamsStateContextValue | null>(null);
export const CommonParamsActionsContext = createContext<CommonParamsActionsContextValue | null>(
  null,
);
```

- [ ] **步骤 2：创建 Provider**

```tsx
// src/modules/api-debug/store/commonParamsStore.tsx
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CommonParamSet } from '../types/commonParams';
import { loadCommonParams, saveCommonParams } from './commonParamsData';
import {
  CommonParamsActionsContext,
  CommonParamsStateContext,
  type CommonParamsActionsContextValue,
  type CommonParamsStateContextValue,
} from './CommonParamsContext';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function CommonParamsProvider({ children }: { children: ReactNode }) {
  const [sets, setSets] = useState<CommonParamSet[]>([]);
  const [loaded, setLoaded] = useState(false);
  const setsRef = useRef(sets);
  setsRef.current = sets;

  useEffect(() => {
    void loadCommonParams()
      .then((cached) => {
        setSets(cached);
        setLoaded(true);
      })
      .catch((error) => {
        console.error('Failed to load common params:', error);
        setLoaded(true);
      });
  }, []);

  const persist = useCallback((next: CommonParamSet[]) => {
    setsRef.current = next;
    setSets(next);
    saveCommonParams(next);
  }, []);

  const addSet = useCallback(
    (name: string) => {
      const set: CommonParamSet = { id: generateId(), name, params: [] };
      persist([...setsRef.current, set]);
      return set;
    },
    [persist],
  );

  const renameSet = useCallback(
    (setId: string, name: string) => {
      persist(setsRef.current.map((set) => (set.id === setId ? { ...set, name } : set)));
    },
    [persist],
  );

  const deleteSet = useCallback(
    (setId: string) => {
      persist(setsRef.current.filter((set) => set.id !== setId));
    },
    [persist],
  );

  const updateSetParams = useCallback(
    (setId: string, params: CommonParamSet['params']) => {
      persist(setsRef.current.map((set) => (set.id === setId ? { ...set, params } : set)));
    },
    [persist],
  );

  const stateValue = useMemo(() => ({ sets, loaded }), [sets, loaded]);
  const actionsValue = useMemo(
    () => ({ addSet, renameSet, deleteSet, updateSetParams }),
    [addSet, deleteSet, renameSet, updateSetParams],
  );

  return (
    <CommonParamsStateContext.Provider value={stateValue}>
      <CommonParamsActionsContext.Provider value={actionsValue}>
        {children}
      </CommonParamsActionsContext.Provider>
    </CommonParamsStateContext.Provider>
  );
}
```

- [ ] **步骤 3：创建 hooks 文件**

```ts
// src/modules/api-debug/store/useCommonParams.ts
import { useContext } from 'react';
import { CommonParamsActionsContext, CommonParamsStateContext } from './CommonParamsContext';

export function useCommonParamsState() {
  const context = useContext(CommonParamsStateContext);
  if (!context) throw new Error('useCommonParamsState must be used within CommonParamsProvider');
  return context;
}

export function useCommonParamsActions() {
  const context = useContext(CommonParamsActionsContext);
  if (!context) throw new Error('useCommonParamsActions must be used within CommonParamsProvider');
  return context;
}
```

- [ ] **步骤 4：挂进 Provider 栈**

`ApiDebugProviders.tsx`：`<TabsProvider>` 之前（`<ParamSuggestProvider>` 之后）包一层 `<CommonParamsProvider>`（KcbpCallProvider 在内层，能读到 state）。

- [ ] **步骤 5：typecheck**

运行：`npm run typecheck`
预期：0 error

- [ ] **步骤 5：Commit**

```bash
git add src/modules/api-debug/store/CommonParamsContext.ts src/modules/api-debug/store/commonParamsStore.tsx src/modules/api-debug/store/useCommonParams.ts src/modules/api-debug/providers/ApiDebugProviders.tsx
git commit -m "feat(common-params): CommonParamsProvider 与 CRUD actions"
```

---

### 任务 4：项目挂载字段（类型 + reducer + 持久化）

**文件：**

- 修改：`src/modules/api-debug/types/workspace.ts`
- 修改：`src/modules/api-debug/store/tabsReducer/types.ts`
- 修改：`src/modules/api-debug/store/tabsReducer/projectReducers.ts`
- 修改：`src/modules/api-debug/store/tabsStore.tsx`
- 修改：`src/modules/api-debug/store/tabsData.ts`
- 测试：`src/modules/api-debug/store/tabsReducer.test.ts`

- [ ] **步骤 1：类型**

`types/workspace.ts`：`ProjectData` 与 `PersistedProjectRecord` 各加一行：

```ts
    /** 挂载的公共参数集 id（undefined = 未挂载） */
    commonParamSetId?: string;
```

- [ ] **步骤 2：编写失败的 reducer 测试**

在 `tabsReducer.test.ts` 追加（沿用该文件现有构造 state 的辅助方式；若文件用 reducer 函数直接调用，则按现有用例风格）：

```ts
describe('SET_PROJECT_COMMON_PARAM_SET', () => {
  it('设置与清除项目挂载的公共参数集 id', () => {
    const state = withLoadedState();
    const mounted = tabsReducer(state, {
      type: 'SET_PROJECT_COMMON_PARAM_SET',
      projectIndex: 0,
      setId: 'set-1',
    });
    expect(mounted.projects[0].commonParamSetId).toBe('set-1');
    expect(mounted.projects[1].commonParamSetId).toBeUndefined();

    const cleared = tabsReducer(mounted, {
      type: 'SET_PROJECT_COMMON_PARAM_SET',
      projectIndex: 0,
      setId: null,
    });
    expect(cleared.projects[0].commonParamSetId).toBeUndefined();
  });

  it('projectIndex 越界时返回原 state', () => {
    const state = withLoadedState();
    const next = tabsReducer(state, {
      type: 'SET_PROJECT_COMMON_PARAM_SET',
      projectIndex: 99,
      setId: 'set-1',
    });
    expect(next).toBe(state);
  });
});
```

（`tabsReducer` / `withLoadedState` 均为该测试文件现有 helper，直接沿用；`describe` 块按文件现有风格放进顶层 `tabsReducer` describe 内或平级均可。）

- [ ] **步骤 3：运行测试验证失败**

运行：`npx vitest run src/modules/api-debug/store/tabsReducer.test.ts`
预期：FAIL（action 类型不存在 / 未处理）

- [ ] **步骤 4：实现 reducer**

`tabsReducer/types.ts` 的 `TabsAction` 联合中 `TOGGLE_PROJECT_EXPAND` 之后加：

```ts
    | { type: 'SET_PROJECT_COMMON_PARAM_SET'; projectIndex: number; setId: string | null }
```

`projectReducers.ts`：`ProjectAction` 的 Extract 联合加入 `'SET_PROJECT_COMMON_PARAM_SET'`，switch 中 `TOGGLE_PROJECT_EXPAND` case 之后加：

```ts
        case 'SET_PROJECT_COMMON_PARAM_SET': {
            const project = state.projects[action.projectIndex];
            if (!project) return state;
            const nextProjects = state.projects.map((item, index) =>
                index === action.projectIndex
                    ? {
                          ...item,
                          ...(action.setId === null
                              ? { commonParamSetId: undefined }
                              : { commonParamSetId: action.setId }),
                          updatedAt: Date.now(),
                      }
                    : item,
            );
            return { ...state, projects: nextProjects };
        }
```

`tabsStore.tsx`：仿照 `renameProject` 增加：

```ts
const setProjectCommonParamSet = useCallback(
  (projectIndex: number, setId: string | null) =>
    dispatch({ type: 'SET_PROJECT_COMMON_PARAM_SET', projectIndex, setId }),
  [],
);
```

并加入 `actionsValue` 对象与依赖数组。`TabsContext.ts` 的 actions 接口加 `setProjectCommonParamSet: (projectIndex: number, setId: string | null) => void;`。

- [ ] **步骤 5：持久化映射**

`tabsData.ts`：

- `toProjectFileData` 的 project 映射对象加 `...(project.commonParamSetId ? { commonParamSetId: project.commonParamSetId } : {})`
- `hydrateProjectsFromFile` 的 project 映射加 `...(project.commonParamSetId ? { commonParamSetId: project.commonParamSetId } : {})`
- `isPersistedProjectRecord` 加可选校验 `(project.commonParamSetId === undefined || typeof project.commonParamSetId === 'string')`

- [ ] **步骤 6：运行测试验证通过**

运行：`npx vitest run src/modules/api-debug/store/tabsReducer.test.ts && npm run typecheck`
预期：PASS / 0 error

- [ ] **步骤 7：Commit**

```bash
git add src/modules/api-debug/types/workspace.ts src/modules/api-debug/store/tabsReducer/types.ts src/modules/api-debug/store/tabsReducer/projectReducers.ts src/modules/api-debug/store/tabsStore.tsx src/modules/api-debug/store/TabsContext.ts src/modules/api-debug/store/tabsData.ts src/modules/api-debug/store/tabsReducer.test.ts
git commit -m "feat(common-params): 项目挂载字段 SET_PROJECT_COMMON_PARAM_SET 与持久化"
```

---

### 任务 5：执行链路合并（executeCase / scriptRunner / kcbpCallStore）

**文件：**

- 修改：`src/modules/api-debug/services/kcbp/types.ts`
- 修改：`src/modules/api-debug/services/kcbp/executeCase.ts`
- 修改：`src/modules/api-debug/services/kcbp/scriptRunner.ts`
- 修改：`src/modules/api-debug/store/kcbpCallStore.tsx`
- 测试：`src/modules/api-debug/services/kcbp/requestMapper.test.ts` 相邻新增 `executeCase.commonParams.test.ts`

- [ ] **步骤 1：编写失败的测试**

```ts
// src/modules/api-debug/services/kcbp/executeCase.commonParams.test.ts
import { describe, expect, it, vi } from 'vitest';
import type { ParamItem } from '../../types/workspace';
import { invokeKcbpCall } from './executeCase';

const p = (name: string, value: string): ParamItem => ({ name, value, type: 'string' });

function makeTab(params: ParamItem[]) {
  return {
    id: 't1',
    name: 'case',
    protocol: 'KCBP',
    address: '127.0.0.1:21000/851502?queue=req1&timeout=300',
    params,
    createdAt: 0,
    updatedAt: 0,
  } as const;
}

const electronDeps = {
  callKcbp: vi.fn(async (payload: { param: { fields: Record<string, string> } }) => ({
    code: '000000',
    msg: 'ok',
    data: [],
    stats: { timecost: 1, rows: 0 },
  })),
  queryScriptSql: vi.fn(),
} as never;

describe('invokeKcbpCall 公共参数合并（UI 模式）', () => {
  it('发送的 fields 含公共参数，case 同名覆盖；nextParams 保持 case-only', async () => {
    const outcome = await invokeKcbpCall(makeTab([p('orgid', '0202')]), 'ui', {
      electronDeps,
      commonParams: [p('orgid', '0101'), p('brhid', '1')],
    });
    const callPayload = vi.mocked(electronDeps.callKcbp).mock.calls[0][0];
    expect(callPayload.param.fields.orgid).toBe('0202');
    expect(callPayload.param.fields.brhid).toBe('1');
    expect(outcome.nextParams).toEqual([p('orgid', '0202')]);
    expect(outcome.effectiveParams).toEqual([p('brhid', '1'), p('orgid', '0202')]);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run src/modules/api-debug/services/kcbp/executeCase.commonParams.test.ts`
预期：FAIL（`commonParams` 不在 options 类型 / `effectiveParams` 不存在）

- [ ] **步骤 3：扩展类型**

`services/kcbp/types.ts`：

- `InvokeKcbpCallOptions` 加 `commonParams?: ParamItem[];`（注释：执行时合并进发送字段的公共参数）
- `KcbpCallOutcome` 加 `effectiveParams?: ParamItem[];`（注释：实际用于构建发送字段的参数列表，供历史记录）

- [ ] **步骤 4：executeCase.ts UI 模式合并**

`executeCase.ts` 顶部加 `import { mergeCommonParams } from '../../utils/workspace/commonParams';`，UI 分支改为：

```ts
if (editorMode === 'ui') {
  const effectiveParams = options.commonParams
    ? mergeCommonParams(options.commonParams, tab.params)
    : tab.params;
  const { fields, binaryFields } = buildKcbpFields(effectiveParams);
  const outcome = await invokeKcbpWithFields({
    tab,
    msgtype,
    fields,
    binaryFields,
    baseParams: tab.params, // 保持 case-only：nextParams/nextScript 不被公共参数污染
    electronDeps,
    addressOverride: effectiveAddress,
  });
  return {
    ...outcome,
    effectiveParams,
    nextScript: outcome.missingParam
      ? paramsToCaseScript(outcome.nextParams, outcome.msgtype)
      : undefined,
  };
}
```

- [ ] **步骤 5：scriptRunner.ts fallback 合并 + effectiveParams**

`scriptRunner.ts`：

- `runScriptOrTcdCase` 增加 `commonParams` 入参（从 `options.commonParams` 读取），`invokeKcbpCall` 末尾把它传下去
- 第 56 行 `const fallbackPayload = buildKcbpFields(tab.params);` 改为：

```ts
const effectiveParams =
  options.commonParams && options.commonParams.length > 0
    ? mergeCommonParams(options.commonParams, tab.params)
    : tab.params;
const fallbackPayload = buildKcbpFields(effectiveParams);
```

- `let activeParams: ParamItem[] = tab.params;` 保持不变（脚本产出回写语义不变）
- 最终 `attachCallSteps({ ... })` 的两处返回对象加 `effectiveParams: activeParams`（脚本未调用 call() 的 fallback outcome 也加 `effectiveParams`）

- [ ] **步骤 6：kcbpCallStore 注入与历史**

`kcbpCallStore.tsx`：

- 顶部 `import { useCommonParamsState } from './useCommonParams';`（Provider 的 state hook，从 `CommonParamsContext` 派生：`export function useCommonParamsState()` 返回 `{ sets, loaded }`，放进 `commonParamsStore.tsx` 或单独 hook 文件均可，与 `useRequestHistoryState` 模式一致）
- Provider 组件内 `const { sets: commonSets } = useCommonParamsState();` + `const commonSetsRef = useRef(commonSets); commonSetsRef.current = commonSets;`
- `run()` 内构造 `tab` 之后：

```ts
const project = activeProjectRef.current;
const commonParams = resolveCommonParamsById(commonSetsRef.current, project?.commonParamSetId);
```

- `invokeKcbpCall(tab, editorMode)` 改为 `invokeKcbpCall(tab, editorMode, { commonParams: commonParams.length > 0 ? commonParams : undefined })`
- 两处 `addEntry({ ... request: { ... params: tab.params, ...` 改为 `params: outcome.effectiveParams ?? tab.params`

- [ ] **步骤 7：运行测试验证通过**

运行：`npx vitest run src/modules/api-debug/services/kcbp/ && npm run typecheck`
预期：PASS（含既有 kcbp 服务测试不回归）/ 0 error

- [ ] **步骤 8：Commit**

```bash
git add src/modules/api-debug/services/kcbp/ src/modules/api-debug/store/kcbpCallStore.tsx
git commit -m "feat(common-params): 执行链路合并公共参数并记录实际生效参数"
```

---

### 任务 6：项目右键「公共参数」子菜单

**文件：**

- 修改：`src/modules/api-debug/hooks/useCaseSidebarController.tsx`

- [ ] **步骤 1：子菜单实现**

`useCaseSidebarController.tsx`：

- `useTabsActions()` 解构加 `setProjectCommonParamSet`
- hook 顶部加：

```ts
const { sets: commonSets } = useCommonParamsState();
```

- `getProjectMenu` 开头取当前项目对象（插在 `useCallback` 体内第一行）：

```ts
const project = state.projects[projectIndex];
```

- `{ type: 'divider' }` 与 `delete` 之间插入：

```ts
            {
                key: 'common-params',
                label: '公共参数',
                icon: <SolutionOutlined />,
                children: [
                    {
                        key: 'common-params-none',
                        label: '不挂载',
                        icon: project?.commonParamSetId === undefined ? <CheckOutlined /> : undefined,
                        onClick: () => setProjectCommonParamSet(projectIndex, null),
                    },
                    ...commonSets.map((set) => ({
                        key: `common-params-${set.id}`,
                        label: set.name,
                        icon: project?.commonParamSetId === set.id ? <CheckOutlined /> : undefined,
                        onClick: () => setProjectCommonParamSet(projectIndex, set.id),
                    })),
                ],
            },
```

- `getProjectMenu` 的 `useCallback` 依赖数组加 `state.projects`、`commonSets`、`setProjectCommonParamSet`；顶部 import 加 `CheckOutlined`、`SolutionOutlined` 与 `useCommonParamsState`

- [ ] **步骤 2：typecheck + 手工验证**

运行：`npm run typecheck`
手工验证（`npx vite dev`）：右键项目 → 「公共参数」→ 选择一套 → 再次右键可见选中项带 ✓；选「不挂载」清除。

- [ ] **步骤 3：Commit**

```bash
git add src/modules/api-debug/hooks/useCaseSidebarController.tsx
git commit -m "feat(common-params): 项目右键菜单公共参数子菜单"
```

---

### 任务 7：设置面板 CommonParamsSettings

**文件：**

- 修改：`src/modules/api-debug/components/editor/ParamEdit.tsx`（导出 ParamTable）
- 创建：`src/modules/api-debug/components/settings/CommonParamsSettings.tsx`
- 修改：`src/modules/api-debug/index.tsx`
- 测试：`src/modules/api-debug/components/settings/CommonParamsSettings.test.tsx`

- [ ] **步骤 1：导出 ParamTable**

`ParamEdit.tsx`：`function ParamTable(...)` 前加 `export`，文件底部 `export { ParamTable };`（若组件声明为 const 则直接改 export 声明）。

- [ ] **步骤 2：编写失败的测试**

```tsx
// src/modules/api-debug/components/settings/CommonParamsSettings.test.tsx
// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CommonParamSet } from '../../types/commonParams';
import CommonParamsSettings from './CommonParamsSettings';

function renderWith(
  sets: CommonParamSet[],
  actions: Record<string, ReturnType<typeof vi.fn>>,
  mountedCountBySet: Record<string, number> = {},
) {
  return render(
    <CommonParamsSettings
      sets={sets}
      loaded
      mountedCountBySet={mountedCountBySet}
      onAdd={actions.onAdd}
      onRename={actions.onRename}
      onDelete={actions.onDelete}
      onUpdateParams={actions.onUpdateParams}
    />,
  );
}

describe('CommonParamsSettings', () => {
  afterEach(cleanup);

  it('展示参数集并支持新增', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    renderWith([{ id: 'a', name: '交易公共', params: [] }], { onAdd });

    expect(screen.getByText('交易公共')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '新建参数集' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('编辑参数行触发 onUpdateParams', async () => {
    const user = userEvent.setup();
    const onUpdateParams = vi.fn();
    renderWith(
      [{ id: 'a', name: '交易公共', params: [{ name: 'orgid', value: '0101', type: 'string' }] }],
      { onUpdateParams, onAdd: vi.fn(), onRename: vi.fn(), onDelete: vi.fn() },
    );

    const nameInput = screen.getByDisplayValue('orgid');
    await user.clear(nameInput);
    await user.type(nameInput, 'brhid');
    expect(onUpdateParams).toHaveBeenCalled();
  });

  it('删除参数集弹确认框，有项目使用时提示数量', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderWith([{ id: 'a', name: '交易公共', params: [] }], { onDelete }, { a: 2 });

    await user.click(screen.getByRole('button', { name: /删除/ }));
    expect(screen.getByText(/删除公共参数集/)).toBeTruthy();
    expect(screen.getByText(/2 个项目/)).toBeTruthy();
  });
});
```

- [ ] **步骤 3：运行测试验证失败**

运行：`npx vitest run src/modules/api-debug/components/settings/CommonParamsSettings.test.tsx --environment jsdom`
预期：FAIL（组件不存在）

- [ ] **步骤 4：实现设置面板**

组件设计（受控 props 注入而非直接用 context，便于测试；`index.tsx` 注册处用一个小包装从 context 取值传入）：

```tsx
// src/modules/api-debug/components/settings/CommonParamsSettings.tsx
import { useState } from 'react';
import { App, Button, Input, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { CommonParamSet } from '../../types/commonParams';
import type { ParamItem } from '../../types/workspace';
import { ParamTable } from '../editor/ParamEdit';
import { useCommonParamsState, useCommonParamsActions } from '../../store/useCommonParams';

export interface CommonParamsSettingsProps {
  sets: CommonParamSet[];
  loaded: boolean;
  /** 各参数集被多少个项目挂载（由包装组件从 tabs state 统计） */
  mountedCountBySet?: Record<string, number>;
  onAdd: (name: string) => void;
  onRename: (setId: string, name: string) => void;
  onDelete: (setId: string) => void;
  onUpdateParams: (setId: string, params: ParamItem[]) => void;
}

export default function CommonParamsSettings({
  sets,
  loaded,
  mountedCountBySet = {},
  onAdd,
  onRename,
  onDelete,
  onUpdateParams,
}: CommonParamsSettingsProps) {
  const { modal } = App.useApp();
  const [activeId, setActiveId] = useState<string | null>(sets[0]?.id ?? null);
  const active = sets.find((set) => set.id === activeId) ?? sets[0] ?? null;

  const confirmDelete = (set: CommonParamSet) => {
    const mountedCount = mountedCountBySet[set.id] ?? 0;
    modal.confirm({
      title: '删除公共参数集',
      content:
        mountedCount > 0
          ? `确定要删除「${set.name}」吗？${mountedCount} 个项目正在使用，删除后这些项目将不再注入公共参数。`
          : `确定要删除「${set.name}」吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        onDelete(set.id);
        setActiveId(null);
      },
    });
  };

  if (!loaded) {
    return <div className="p-8 text-center text-[var(--color-text-muted)]">加载中...</div>;
  }

  return (
    <div className="flex gap-4 h-full min-h-0">
      <div className="w-56 shrink-0 flex flex-col gap-2">
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => onAdd(`公共参数 ${sets.length + 1}`)}
        >
          新建参数集
        </Button>
        <div className="flex flex-col gap-1 overflow-y-auto ui-scroll">
          {sets.map((set) => (
            <Space key={set.id} className={set.id === active?.id ? 'font-medium' : ''}>
              <button type="button" onClick={() => setActiveId(set.id)}>
                {set.name}
              </button>
              <Button size="small" type="text" onClick={() => confirmDelete(set)}>
                删除
              </Button>
            </Space>
          ))}
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {active ? (
          <>
            <Input
              value={active.name}
              onChange={(event) => onRename(active.id, event.target.value)}
            />
            <ParamTable
              params={active.params}
              onChange={(params) => onUpdateParams(active.id, params)}
            />
          </>
        ) : (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            暂无公共参数集，点击左侧「新建参数集」创建
          </div>
        )}
      </div>
    </div>
  );
}
```

注意：实现时若 `ParamTable` 的 props/内部状态与上述用法不符（如依赖 `paramsRef`），以导出后的真实签名为准微调；样式类按项目现有 settings 面板风格（对照 `ParamSuggestRulesSettings.tsx`）落地，不引入新 CSS 文件。

- [ ] **步骤 5：注册 settingsSection**

`index.tsx` 的 `settingsSections` 数组 `api-rules` 之后加：

```tsx
        {
            key: 'api-common-params',
            label: '公共参数',
            icon: <SolutionOutlined />,
            Panel: CommonParamsSettingsWrapper,
            category: 'general',
            searchKeywords: ['公共参数', '入参', 'orgid', 'funcid'],
        },
```

`CommonParamsSettingsWrapper`（写在 `CommonParamsSettings.tsx` 内一并导出）：从 context 取数据并统计挂载计数：

```tsx
export function CommonParamsSettingsWrapper() {
  const { sets, loaded } = useCommonParamsState();
  const actions = useCommonParamsActions();
  const { state } = useTabsState();
  const mountedCountBySet = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const project of state.projects) {
      if (project.commonParamSetId) {
        counts[project.commonParamSetId] = (counts[project.commonParamSetId] ?? 0) + 1;
      }
    }
    return counts;
  }, [state.projects]);

  return (
    <CommonParamsSettings
      sets={sets}
      loaded={loaded}
      mountedCountBySet={mountedCountBySet}
      onAdd={actions.addSet}
      onRename={actions.renameSet}
      onDelete={actions.deleteSet}
      onUpdateParams={actions.updateSetParams}
    />
  );
}
```

- [ ] **步骤 6：运行测试验证通过**

运行：`npx vitest run src/modules/api-debug/components/settings/ --exclude "**/*.integration.test.tsx" --environment jsdom && npm run typecheck`
预期：PASS / 0 error

- [ ] **步骤 7：Commit**

```bash
git add src/modules/api-debug/components/editor/ParamEdit.tsx src/modules/api-debug/components/settings/CommonParamsSettings.tsx src/modules/api-debug/components/settings/CommonParamsSettings.test.tsx src/modules/api-debug/index.tsx
git commit -m "feat(common-params): 公共参数设置面板与 settingsSection 注册"
```

---

### 任务 8：openSettings(sectionKey) + Action bar 入口

**文件：**

- 修改：`src/platform/shell/SettingsModalContext.ts`
- 修改：`src/platform/shell/SettingsModalProvider.tsx`
- 修改：`src/platform/shell/SettingsModalGate.tsx`
- 修改：`src/components/layout/SettingsModal.tsx`
- 修改：`src/modules/api-debug/components/workspace/CaseActionBar.tsx`
- 测试：`src/modules/api-debug/components/workspace/CaseActionBar.test.tsx`

- [ ] **步骤 1：扩展 Context 与 Provider**

```ts
// SettingsModalContext.ts
export interface SettingsModalContextValue {
  open: boolean;
  /** 打开设置弹窗；传入 sectionKey 可直达指定 section（如 'api-common-params'） */
  openSettings: (sectionKey?: string) => void;
  closeSettings: () => void;
}
```

```tsx
// SettingsModalProvider.tsx
export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialSectionKey, setInitialSectionKey] = useState<string | undefined>(undefined);

  const openSettings = useCallback((sectionKey?: string) => {
    setInitialSectionKey(sectionKey);
    setOpen(true);
  }, []);
  const closeSettings = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, initialSectionKey, openSettings, closeSettings }),
    [closeSettings, initialSectionKey, open, openSettings],
  );

  return <SettingsModalContext.Provider value={value}>{children}</SettingsModalContext.Provider>;
}
```

- [ ] **步骤 2：SettingsModal 接收 initialSectionKey**

`SettingsModalGate.tsx`：`<SettingsModal open={open} onClose={closeSettings} initialSectionKey={initialSectionKey} />`（从 `useSettingsModal()` 解构）。

`SettingsModal.tsx`：props 加 `initialSectionKey?: string`；`useState` 初始值改为 `initialSectionKey ?? DEFAULT_SETTINGS_SECTION_KEY`；现有 `useEffect(!open)` 重置分支加 `setActiveSection(initialSectionKey ?? DEFAULT_SETTINGS_SECTION_KEY)`，并在依赖数组加 `initialSectionKey`。

- [ ] **步骤 3：CaseActionBar 加按钮**

`CaseActionBar.tsx`（不新增 prop——组件内部调 `useSettingsModal()`）：

```tsx
import { useSettingsModal } from '../../../../platform/shell/useSettingsModal';
import { SettingOutlined } from '@ant-design/icons';

// 组件内：
const { openSettings } = useSettingsModal();

// 「请求历史」按钮之后：
<Tooltip title="公共参数">
  <Button
    type="text"
    size="small"
    icon={<SettingOutlined />}
    onClick={() => openSettings('api-common-params')}
    className="case-actionbar-btn"
    aria-label="公共参数"
  />
</Tooltip>;
```

- [ ] **步骤 4：更新 CaseActionBar 测试**

现有测试的 `render(<CaseActionBar .../>)` 需要包 Provider：新建测试用 wrapper（自定义 context value 直接构造 `SettingsModalContext.Provider`），断言点击「公共参数」按钮以 `'api-common-params'` 调用了 `openSettings`。

- [ ] **步骤 5：运行测试验证通过**

运行：`npx vitest run src/modules/api-debug/components/workspace/CaseActionBar.test.tsx --environment jsdom && npm run typecheck`
预期：PASS / 0 error

- [ ] **步骤 6：Commit**

```bash
git add src/platform/shell/SettingsModalContext.ts src/platform/shell/SettingsModalProvider.tsx src/platform/shell/SettingsModalGate.tsx src/components/layout/SettingsModal.tsx src/modules/api-debug/components/workspace/CaseActionBar.tsx src/modules/api-debug/components/workspace/CaseActionBar.test.tsx
git commit -m "feat(common-params): action bar 公共参数入口与 openSettings 定位 section"
```

---

### 任务 9：编辑器只读折叠区

**文件：**

- 修改：`src/modules/api-debug/components/editor/ParamEdit.tsx`
- 修改：`src/modules/api-debug/components/request/RequestPanel.tsx`
- 测试：`src/modules/api-debug/components/editor/ParamEdit.test.tsx`（新建或按现有测试文件追加）

- [ ] **步骤 1：编写失败的测试**

```tsx
it('有 commonParams 时显示只读折叠区，默认折叠，展开后展示参数', async () => {
  const user = userEvent.setup();
  const { container } = render(
    <ParamEdit
      params={[]}
      onChange={vi.fn()}
      commonParams={[
        { name: 'orgid', value: '0101', type: 'string' },
        { name: 'brhid', value: '1', type: 'string' },
      ]}
    />,
  );

  const toggle = screen.getByRole('button', { name: /公共参数/ });
  expect(toggle.textContent).toContain('2');
  expect(container.textContent).not.toContain('0101'); // 默认折叠

  await user.click(toggle);
  expect(container.textContent).toContain('0101');
});

it('无 commonParams 时不渲染折叠区', () => {
  render(<ParamEdit params={[]} onChange={vi.fn()} />);
  expect(screen.queryByRole('button', { name: /公共参数/ })).toBeNull();
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run src/modules/api-debug/components/editor/ParamEdit.test.tsx --environment jsdom`
预期：FAIL（`commonParams` prop 不存在）

- [ ] **步骤 3：实现折叠区**

`ParamEdit.tsx`：

```tsx
function CommonParamsPanel({ commonParams }: { commonParams: ParamItem[] }) {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div className="common-params-panel">
      <button
        type="button"
        className="common-params-toggle"
        onClick={() => setCollapsed((value) => !value)}
        aria-expanded={!collapsed}
      >
        {collapsed ? <CaretRightOutlined /> : <CaretDownOutlined />}
        公共参数 ({commonParams.length})
      </button>
      {!collapsed && (
        <div className="common-params-list">
          {commonParams.map((param) => (
            <div key={param.name} className="common-params-row">
              <span className="common-params-name">{param.name}</span>
              <span className="common-params-value">{param.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- `ParamEditProps` 加 `commonParams?: ParamItem[]`
- `ParamEdit` 渲染：`commonParams && commonParams.length > 0` 时在参数表上方渲染 `<CommonParamsPanel commonParams={commonParams} />`（需要 `CaretRightOutlined` / `CaretDownOutlined`，从 `@ant-design/icons` 引入）
- 样式：`src/styles/param.css` 追加 `.common-params-*` 规则——灰色小字（`var(--color-text-secondary)`）、行距紧凑，对照现有 `.param-section-toggle` 风格

- [ ] **步骤 4：RequestPanel 传入 commonParams**

`RequestPanel.tsx`：`ParamsSection` 与 `RequestPanel` 增加 `commonParams` 透传；`RequestPanel` 内用 `useCommonParamsState()` + `useActiveTab()`（已有 activeProject）解析：

```tsx
const { sets } = useCommonParamsState();
const commonParams = useMemo(
  () => resolveCommonParamsById(sets, activeProject?.commonParamSetId),
  [sets, activeProject?.commonParamSetId],
);
// <ParamEdit params={params} onChange={onChange} commonParams={commonParams} />
```

- [ ] **步骤 5：运行测试验证通过**

运行：`npx vitest run src/modules/api-debug/components/editor/ --exclude "**/*.integration.test.tsx" --environment jsdom && npm run typecheck`
预期：PASS / 0 error

- [ ] **步骤 6：Commit**

```bash
git add src/modules/api-debug/components/editor/ParamEdit.tsx src/modules/api-debug/components/editor/ParamEdit.test.tsx src/modules/api-debug/components/request/RequestPanel.tsx src/styles/param.css
git commit -m "feat(common-params): 编辑器公共参数只读折叠区"
```

---

### 任务 10：历史载入剥离公共参数

**文件：**

- 修改：`src/modules/api-debug/components/history/useHistoryActions.ts`

- [ ] **步骤 1：实现 strip**

`useHistoryActions.ts`：

```ts
import { useCommonParamsState } from '../../store/useCommonParams';
import { resolveCommonParamsById, stripMountedCommonParams } from '../../utils/workspace/commonParams';

export function useHistoryActions(onClose: () => void) {
    const { updateTabUndoable } = useTabsActions();
    const { activeProject } = useActiveTab();
    const { sets } = useCommonParamsState();
    // ...
    const loadEntry = (entry: RequestHistoryEntry) => {
        const commonParams = resolveCommonParamsById(sets, activeProject?.commonParamSetId);
        updateTabUndoable(
            {
                address: entry.request.address,
                params: stripMountedCommonParams(entry.request.params ?? [], commonParams),
                // ...script / runInput 不变
            },
            '载入历史请求',
        );
        updateEnv('editorMode', entry.mode === 'ui' ? 'ui' : 'script');
    };
```

（`useActiveTab` 是否已在文件中引入按现状补；`entry.request.params` 已有运行时校验为数组。）

- [ ] **步骤 2：typecheck + 手工验证**

运行：`npm run typecheck`
手工验证：挂载公共参数集的项目执行一次请求 → 打开历史详情确认参数含公共字段 → 「载入到编辑器」→ case 参数表不含与公共集同名同值的行。

- [ ] **步骤 3：Commit**

```bash
git add src/modules/api-debug/components/history/useHistoryActions.ts
git commit -m "feat(common-params): 载入历史时剥离已挂载公共参数"
```

---

### 任务 11：全量验证收尾

- [ ] **步骤 1：全量检查**

```bash
npm run typecheck
npx vitest run src/modules/api-debug/components --exclude "**/*.integration.test.tsx" --environment jsdom
npm run test:api
npx vite build
```

预期：全部通过、构建成功。

- [ ] **步骤 2：端到端手工验证**

1. Action bar「公共参数」→ 打开设置弹窗并定位「公共参数」section
2. 新建参数集「交易公共」，添加 `orgid=0101`、`brhid=1`
3. 项目右键 →「公共参数」→ 选「交易公共」
4. 编辑器参数区出现「公共参数 (2)」折叠区，展开为只读
5. 执行请求 → KCBP 报文 fields 含 `orgid=0101`、`brhid=1`
6. case 加同名 `orgid=0202` → 执行 → 发送 `orgid=0202`（case 覆盖）
7. 历史 → 记录含公共字段；载入到编辑器 → case 参数表干净
8. 删除参数集 → 确认框出现；确认后右键菜单中该项目等效「不挂载」

- [ ] **步骤 3：Commit（如有零散修正）**

```bash
git add -A
git commit -m "chore(common-params): 全量验证收尾"
```
