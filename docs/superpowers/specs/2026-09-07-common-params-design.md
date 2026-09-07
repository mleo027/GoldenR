# 公共参数：项目级挂载、执行时合并 — 设计文档

日期：2026-09-07
状态：已确认

## 背景

KCBP 接口的入参大量重复（`funcid`、`orgid`、`brhid`、`bankflag` 等公共字段），每个 case 各自维护一份，改一处要逐个接口改。需要一个"公共参数"机制：全局维护多套命名参数集，项目右键菜单选择本项目使用哪一套，执行时自动合并进请求入参，编辑器中默认折叠、只读展示，用户日常无需关心。

已确认的关键决策：

| 决策点 | 结论 |
| --- | --- |
| 同名冲突 | **case 覆盖公共**（就近优先；case 参数表加同名行即 override） |
| 挂载数量 | **单套**：一个项目同一时刻只挂载一套（`commonParamSetId` 单值） |
| 折叠区交互 | **只读展示**：改值去设置页，case 覆盖靠同名行 |
| 菜单命名 | 子菜单叫 **「公共参数」**（不叫"挂载"） |

## 数据模型

```ts
// 全局配置文件 api-debug.common-params.json（走 configStorage + DebounceWriter 模式，
// 参照 paramSuggestData.ts；文件名注册进 @/shared/config/files）
interface CommonParamSetFile {
    sets: CommonParamSet[];
}
interface CommonParamSet {
    id: string;          // nanoid
    name: string;
    params: ParamItem[]; // 复用现有 ParamItem（name/value/type）
}

// ProjectData 新增字段（随 project.json 持久化，PersistedProjectRecord 同步）
interface ProjectData {
    ...
    commonParamSetId?: string; // undefined = 未挂载
}
```

## 合并语义（核心）

新增纯函数 `utils/workspace/commonParams.ts`：

```ts
/** common 在前、case 在后；同名时 case 覆盖；不修改两个入丽数组 */
function mergeCommonParams(common: ParamItem[], caseParams: ParamItem[]): ParamItem[];
```

在三个执行路径的 `buildKcbpFields(tab.params)` 调用点前插入合并（按 `commonParamSetId` 查出当前集，未挂载则原样透传）：

| # | 调用点 | 说明 |
| --- | --- | --- |
| 1 | `services/kcbp/executeCase.ts` | UI 执行 |
| 2 | `services/kcbp/scriptRunner.ts` | 脚本执行 |
| 3 | `utils/script/apiScript.ts` | 脚本内调用 |

合并只发生在执行时，**不回写任何存储**；`runInput`（TCD 运行参数）不参与合并。

## UI 变更

### ① 设置页（公共参数集 CRUD）

- `settingsSections` 新增 section：`key: 'api-common-params'`，`label: '公共参数'`，Panel 为 `components/settings/CommonParamsSettings.tsx`
- 功能：参数集列表（新增/重命名/删除）+ 每套的参数表编辑（从 `ParamEdit.tsx` 导出 `ParamTable` 复用，必要时抽为独立组件）
- 删除参数集时若有项目挂载：`modal.confirm` 提示「N 个项目正在使用」，确认后这些项目的 `commonParamSetId` 置空

### ② Action bar 入口

- `CaseActionBar` 新增「公共参数」icon 按钮
- 点击打开设置弹窗并定位到该 section：`SettingsModalContext.openSettings` 扩展可选参数 `openSettings(sectionKey?)`（平台层小改动，向后兼容）

### ③ 项目右键菜单

- `getProjectMenu` 新增子菜单 **「公共参数」**：radio 单选（全部参数集 + 「不挂载」），选中即写 `commonParamSetId`
- reducer 新增 action `SET_PROJECT_COMMON_PARAM_SET { projectIndex, setId | null }`

### ④ 编辑器折叠区（只读）

- `ParamEdit` 顶部新增折叠面板：标题「公共参数 (N)」，默认折叠，展开后灰色只读展示当前生效的公共参数（name + value）
- 仅当所在项目已挂载且该集非空时显示；数据经 props 传入（`commonParams?: ParamItem[]`），不引入新的 store 依赖

## 边界情况

- **历史记录**：`RequestHistoryEntry.request.params` 记录**合并后的实际生效参数**（真实发送内容）；「载入到编辑器」时调用 `stripMountedCommonParams` 剔除与所挂载集同名且同值的行，避免公共参数被复制进 case
- **导入接口**：不受影响（只写 case 自身 params）
- **切换挂载**：即时生效，无需刷新已打开的 case；下次执行按新集合并
- **未挂载项目**：执行路径零开销（透传原数组）

## 改造清单

| # | 位置 | 改法 |
| --- | --- | --- |
| 1 | `@/shared/config/files` | 注册 `COMMON_PARAMS_FILE` 文件名 |
| 2 | `types/workspace.ts` | `ProjectData`/`PersistedProjectRecord` 加 `commonParamSetId?` |
| 3 | `store/commonParamsData.ts` | 新建：读文件、DebounceWriter 保存、CRUD actions |
| 4 | `utils/workspace/commonParams.ts` | 新建：`mergeCommonParams` / `stripMountedCommonParams` 纯函数 |
| 5 | `tabsReducer` | `SET_PROJECT_COMMON_PARAM_SET` action + projectReducers |
| 6 | `executeCase.ts` / `scriptRunner.ts` / `apiScript.ts` | 执行前合并 |
| 7 | `components/settings/CommonParamsSettings.tsx` | 新建设置面板 |
| 8 | `index.tsx` | 注册 settingsSection |
| 9 | `CaseActionBar` / `SettingsModalContext` | 入口按钮 + `openSettings(sectionKey?)` |
| 10 | `useCaseSidebarController.getProjectMenu` | 「公共参数」子菜单 |
| 11 | `ParamEdit` | 只读折叠区 |
| 12 | 历史记录链路 | 记录合并后参数；载入时 strip |

## 测试

- `mergeCommonParams` / `stripMountedCommonParams` 单测：覆盖、顺序、空集、未挂载透传
- reducer 单测：挂载/卸载/切挂
- `CommonParamsSettings` 组件测试：CRUD、删除有挂载时的确认文案
- `ParamEdit` 折叠区渲染测试：挂载显示/未挂载不显示/默认折叠
- 三个执行路径的合并生效测试（scriptRunner/executeCase 现有用例扩展）
