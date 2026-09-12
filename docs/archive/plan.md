# Golden API 深度修复与架构优化计划

> 复审说明（2026-08-15）：本计划已按“单一 api-debug 模块、桌面端应用、现有功能优先、避免过度设计”重新收敛。以下内容中，P0/P1 是当前必须执行项；P2 仅在出现真实重复或缺陷后实施；标记为“暂缓”的平台化方案不作为本轮交付门槛。

## 1. 目标、边界与完成标准

### 目标

在不改变用户可见行为和现有配置格式的前提下，按风险和收益分阶段完成以下治理（不要求一次性全部抽象）：

- 让 `npm run typecheck` 真正覆盖 Renderer、Electron、preload 和 Vite 配置。
- 修复当前 Electron 源码中的 6 个类型错误。
- 消除 `shared → api-debug`、Store → UI、组件 → Electron 等反向或跨层依赖。
- 收紧 Renderer 到主进程的文件读写权限。
- 将分散的持久化、退出 flush、KCBP/TCD 编排收口为可测试服务。
- 拆分 400～500 行的大型服务、Reducer 和组件。
- 增加关键 Provider、持久化和 UI 集成测试。
- 把架构边界写进 ESLint 和 TypeScript，使后续提交无法再次破坏分层。

### 必须保持兼容

以下文件名称、字段结构、默认值和迁移结果保持不变：

- `app.json`
- `api-debug.env.json`
- `project.json`
- `settings.json`
- `db.json`
- `param-suggest-rules.json`
- `kcbp.env.json`
- `app.api-debug.legacy-migrated.json`
- `settings.preferences.legacy-migrated.json`

同时保持：

- API 调试 UI 布局、交互文案和快捷键不变。
- KCBP 请求、取消、缺失参数回填和响应显示行为不变。
- UI、脚本、TCD 三种执行模式行为不变。
- SQL 参数建议、规则导入导出、项目导入导出行为不变。
- Native adapter、DLL、worker/bridge CJS 文件不变。
- `D:\KSPB\own_tool\GoldenAPI` 全程只读。
- 不恢复原 GoldenAPI 的其他模块。

### 不在本轮引入

- 不迁移 Zustand、Redux 等新状态库。
- 不修改配置 JSON schema。
- 不新增后端服务或数据库表。
- 不重做 UI 视觉设计。
- 不修改 KCBP Native API。
- 不使用 Zod 等大型运行时 schema 依赖；采用类型守卫和小型校验函数。

### 完成标准

- `npm run typecheck` 覆盖 Electron 后零错误。
- 全仓库不存在 `shared` 导入 `modules`、`components`、`store` 或 `platform`。
- 除统一 Electron 客户端外，Renderer 不再出现 `window.electronAPI`。
- Store 和应用服务不再导入 Ant Design。
- 配置 IPC 不接受绝对路径、路径穿越或未注册文件名。
- 现有 319 个测试全部保留并通过，新增关键链路测试通过。
- `npm run check`、`npm run test:api`、`npm test`、`npx vite build` 全部通过。

## 2. 目标架构与依赖方向

最终依赖流固定为：

```text
React Component
    ↓
Controller Hook / Presentation Adapter
    ↓
Context + Reducer / Application Use Case
    ↓
Repository Port / KCBP Port / SQL Port
    ↓
Renderer Electron Client
    ↓
Preload Typed API
    ↓
Electron IPC Handler
    ↓
Filesystem / MSSQL / KCBP Native Adapter
```

共享层位于最底部：

```text
modules/api-debug ─┐
platform           ├──→ shared
electron           ┘

shared ─X→ modules/api-debug
shared ─X→ platform
shared ─X→ renderer store/components
```

目录职责明确为：

- `components/`：只负责展示、表单和交互事件。
- `hooks/`：组合 UI 状态和应用用例，作为组件控制器。
- `store/`：Context、Reducer、状态选择器和 actions。
- `services/`：应用用例、仓储接口、外部端口及其实现。
- `utils/`：无 React、无 Electron、无网络和文件副作用的纯函数。
- `shared/`：跨 Renderer/Electron 复用的中立类型和纯逻辑。
- `electron/ipc/`：参数校验、权限边界和 IPC 适配。
- `electron/services/`：文件、数据库、KCBP 等主进程能力。

## 3. 分阶段实施方案

## 阶段 0：实施前保护与基线

### 0.1 目录约束

当前 `开发\\plan` 不存在，且 `AGENTS.md` 规定改动只能位于该目录。本次仅授权保存计划文档，因此：

1. 在退出 Plan Mode 后，只能先创建：
   - `开发/plan/api-debug-deep-refactor-plan.md`
2. 不得立即修改根目录的 `src`、`electron`、配置或依赖。
3. 实际实施前必须由用户明确修改该规则或授权根目录源码变更。
4. 不在 `开发\\plan` 下复制整个仓库，避免形成嵌套源码和双重构建入口。

### 0.2 备份与基线记录

获得源码修改授权后：

1. 获取仓库绝对路径并确认是 `D:\\KSPB\\own_tool\\new_golden`。
2. 记录 `git status --short`、当前分支和提交号。
3. 不覆盖或回退用户已有变更。
4. 在批量移动或删除文件前，将待处理文件备份到工作树外的时间戳目录。
5. 备份范围仅限准备移动或删除的源码，不复制 `node_modules`、`dist` 和 Native DLL。
6. 基线执行并保存 lint、格式、编码、类型和全部测试结果。

现有基线应为：

- lint 通过。
- format 通过。
- encoding scan 通过。
- 当前 typecheck 通过，但未覆盖 Electron。
- `test:api`：24 个文件、187 个用例通过。
- 全量测试：60 个文件、319 个用例通过。

## 阶段 1：修复 TypeScript 与质量门禁

### 1.1 新增 Electron TypeScript 工程

新增 `tsconfig.electron.json`，配置原则：

- `target: ES2022`
- `lib: ["ES2023", "DOM"]`
- `module: ESNext`
- `moduleResolution: bundler`
- `noEmit: true`
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `erasableSyntaxOnly: true`
- `noFallthroughCasesInSwitch: true`
- `noUncheckedSideEffectImports: true`
- `skipLibCheck: true`
- `baseUrl: "."`
- `paths: { "@/*": ["src/*"] }`
- `types: ["node", "electron"]`
- `include: ["electron/**/*.ts"]`

根 `tsconfig.json` references 调整为 app、electron、node 三个工程。`npm run typecheck` 继续使用 `tsc -b`。

### 1.2 修复现有 Electron 类型问题

- Dialog 调用根据窗口是否存在，分别使用 Electron dialog 的单参数或双参数重载。
- 添加与当前 `mssql` 主版本兼容的类型依赖，消除隐式 `any`。
- 删除无效的 `COPYFILE_F_REPLACE_EXISTING`，使用 `copyFile` 默认覆盖行为。
- 保留原子写入的有限重试和临时文件清理，并增加已有目标文件替换测试。

### 1.3 ESLint 分环境和类型感知

ESLint 分为 Renderer、Electron/Vite、Scripts 三类配置，分别使用 browser 或 Node globals，并启用 TypeScript 类型感知检查。

新增边界规则：

- `src/shared/**` 禁止导入 modules、components、store、platform。
- `src/modules/api-debug/services/**` 禁止导入 components、layout、providers、store、antd。
- `src/modules/api-debug/store/**` 禁止导入 components、layout、antd。
- Renderer 除统一 Electron 客户端外，禁止直接访问 `window.electronAPI`。
- Electron 禁止导入 Renderer feature/store/UI/platform。

阶段退出条件：新的正式 `npm run typecheck` 能覆盖 Electron，六个现有诊断全部消除，且 lint、格式和现有测试通过。

## 阶段 2：整理共享契约并消除反向依赖

### 2.1 KCXP 契约下沉

将不依赖 UI 和工作区状态的 KCXP 环境、地址 overlay、环境变量等类型迁移到 shared。api-debug 只保留编辑状态、应用范围和 UI 模型。

### 2.2 测试和脚本契约下沉

将响应最小契约、SQL 查询函数、脚本测试 API、脚本测试结果和步骤类型集中到 `src/shared/test`。

`AssertScriptApi.ok` 只依赖响应状态最小接口，不再导入：

- `api-debug/types/workspace`
- `api-debug/types/scriptTest`
- `api-debug/utils/script/apiScript`

### 2.3 清理 shared 对应用 config 的依赖

KCBP、Suggest 默认值和持久化文件名的中立契约下沉到 shared；应用 config 反向引用 shared。shared 不再导入 `@/config/**`。

### 2.4 清理循环导出

减少宽泛的 `export *`，统一使用明确入口和 `import type`。只为旧路径存在的空壳文件，在确认零引用后删除。

阶段退出条件：shared 不再依赖 api-debug 或应用层，Renderer、Electron 和脚本执行共同使用同一份中立契约。

## 阶段 3：重建安全且类型一致的 Electron IPC

### 3.1 统一 Electron API 契约

将扁平 API 改为命名空间：

```ts
interface ElectronAPI {
  config: ConfigStorageApi;
  kcbp: KcbpApi;
  database: DatabaseApi;
  importExport: ImportExportApi;
  window: WindowApi;
  app: AppLifecycleApi;
}
```

配置存储接口使用固定文件名联合类型：

```ts
interface ConfigStorageApi {
  read(name: ConfigStorageFileName): Promise<unknown | null>;
  write(name: ConfigStorageFileName, data: unknown): Promise<void>;
  flush(entries: ConfigWriteEntry[]): Promise<void>;
}
```

旧的 `readJsonFile`、`writeJsonFile`、`flushStorage` 等扁平方法在全部迁移后删除。

### 3.2 配置路径限制

- 配置 IPC 只接受注册文件名。
- 拒绝绝对路径、`..`、空字符串和未知文件名。
- 使用 allowlist 后再拼接 config dir，并验证最终路径仍位于 config dir。
- 将两个 legacy backup 文件加入安全 allowlist，修复迁移写入未知文件名的问题。
- 用户选取的外部文件继续使用导入导出专用 IPC。

### 3.3 IPC 参数校验

为 Config、KCBP、SQL、导入导出和参数文件 handler 增加轻量类型守卫，校验对象、字符串、数组、批量数量、SQL 参数和文件名。

错误统一转换为 `{ code, message }`，Renderer client 再转换为 `Error`。

### 3.4 退出 flush 握手

替换固定 300ms 退出逻辑：

1. 主进程第一次收到 `before-quit` 时阻止退出并生成 request ID。
2. 向所有窗口发送 `app:flush-storage`。
3. Renderer 完成异步 flush 后发送 `app:flush-storage-complete`。
4. 主进程等待所有窗口确认。
5. 最长等待 3 秒，超时后记录错误并退出。
6. 重复退出事件不得重复创建 flush 请求。
7. 窗口销毁时从 pending 集合移除。

阶段退出条件：配置路径、IPC payload、legacy backup 和退出握手测试全部通过。

## 阶段 4：持久化仓储与 Store 解耦

### 4.1 引入仓储接口

建立 Workspace、ApiDebugEnv、ParamSuggest 和 AppEnv 仓储接口，统一负责 load、save、flush。Store 不再直接操作文件或 Electron API。

### 4.2 通用 debounce writer

实现可测试的 writer，保证：

- 多次 schedule 只写最新快照。
- 写入成功后才清空 pending。
- 写入失败保留 pending，下一次 flush 可重试。
- 同一时刻只有一个写入 Promise。
- flush 等待正在进行和待处理的写入。
- dispose 取消 timer 并完成最终写入。

### 4.3 Provider 职责收缩

Provider 只负责加载状态、dispatch、提供 Context 和调度 repository。文件名、JSON 序列化、timer、pending 状态全部移至仓储和持久化协调器。

### 4.4 统一持久化协调器

将 `flushAllPersistedState` 和模块 `flushPersistedState` 改为异步 Promise 接口：

1. flush tab drafts。
2. flush AppEnv。
3. 并行 flush 各模块仓储。
4. 用 `Promise.allSettled` 汇总错误。
5. 任一失败时将错误返回给退出握手。
6. 不因单个文件失败跳过其他文件。

### 4.5 配置迁移兼容

保持现有优先读取、legacy fallback、备份、写入新文件和删除旧字段的顺序；迁移必须幂等，任一步失败不得报告成功。

阶段退出条件：Store、Provider 和组件不存在直接 Electron 文件访问，持久化测试覆盖 debounce、flush、失败重试和迁移。

## 阶段 5：拆分 KCBP、脚本与 TCD 编排

### 5.1 外部端口

定义 `KcbpCallPort`、`KcbpControlPort`、`SqlQueryPort` 和 `ApiDebugExecutionPorts`。Electron 是生产实现，单测使用 fake ports。

### 5.2 拆分 KCBP 服务

将现有多职责服务拆为：

1. 请求映射。
2. 单次 KCBP 调用。
3. 脚本运行。
4. TCD 编排。
5. 反馈映射。
6. 顶层执行用例。

顶层接口为：

```ts
async function executeKcbpCase(
  input: ExecuteKcbpCaseInput,
  ports: ApiDebugExecutionPorts,
): Promise<KcbpCallOutcome>;
```

执行用例不得读取 `window.electronAPI`，nested TCD 调用必须复用同一份 ports。

### 5.3 运行控制器

KcbpCallProvider 只负责运行代次、取消、过期响应丢弃、结果提交和结构化反馈事件，不负责请求构建、SQL client、Electron 全局对象或 Ant Design message。

新增独立反馈同步组件，负责将 feedback event 映射为 UI 通知。

阶段退出条件：普通调用、脚本、TCD、nested call、取消、过期响应和 feedback 均通过 fake ports 测试。

## 阶段 6：Reducer 与大型组件拆分

### 6.1 Tabs Reducer

保留单一 reducer 入口，将项目、用例、导航、环境应用和加载转换分别提取为纯函数。ID 和时间通过工厂或参数注入，避免测试依赖真实时间。

### 6.2 CaseSidebar

拆分为 sidebar controller、drag controller、tree renderer，并继续复用现有 header、footer、project/case item 和虚拟列表。

保留搜索、收藏、分组、拖拽移动、右键菜单、inline rename 和 imperative focus 行为。

### 6.3 Path

拆分为运行按钮、编辑控制器、环境选择、溢出菜单和地址输入组件。

保留快捷运行、draft debounce、tab 切换 flush、撤销重做、KCXP overlay、参数复制、清空和脚本生成。

### 6.4 参数建议规则 UI

拆分表单模型 Hook、基础字段、SQL 区域、bindings 区域和测试区域。规则保存、导入导出和主进程 reload 统一通过 service/repository。

### 6.5 文件规模目标

已确认的多职责文件重构后目标控制在约 250～300 行以内，不对全仓库设置机械行数限制。

阶段退出条件：控制逻辑可单测或 Hook 集成测试，视觉 class 和用户交互行为保持兼容。

## 4. 测试计划

### 4.1 TypeScript 与架构测试

验证 Electron tsconfig 覆盖全部主进程和 preload；shared 无 feature 依赖；Electron 无 Renderer 依赖；组件和 Store 无直接 bridge；services/store 无 Ant Design；配置文件名来自统一 allowlist。

### 4.2 配置与文件系统测试

覆盖注册文件读写、批量 flush、未知文件名、绝对路径、路径穿越、空文件名、批量上限、原子替换、临时文件清理、legacy backup、无效 JSON 和不存在文件。

### 4.3 持久化测试

覆盖 debounce 合并、立即 flush、并发写入、失败重试、dispose、自动保存开关、工作区恢复、配置迁移和重复迁移。

### 4.4 IPC 退出测试

覆盖单窗口、多窗口、窗口销毁、flush reject、超时、重复 before-quit、错误 request ID 和重复 request ID。

### 4.5 KCBP 与脚本测试

覆盖请求映射、缺失 Msgtype、binary fields、正常/失败响应、取消、迟到响应、缺失参数、UI/script/TCD、SQL、console、assert、vars、lib、nested case、effective address 和 script test。

### 4.6 React 集成测试

引入 Testing Library、user-event 和 jsdom，覆盖：

- 运行、取消、反馈和过期响应。
- 项目/用例增删改、切换、导入和自动保存。
- Path 地址 debounce、环境应用、草稿 flush 和清空撤销。
- 参数建议规则加载、编辑、保存、reload、导入无效规则。

### 4.7 人工冒烟

构建后验证应用启动、工作区恢复、KCBP UI/script/TCD、取消、SQL 建议、数据库连接、JSON/INI 导入、CSV/HTML 导出、参数文件、重启持久化、portable 配置目录以及窗口控制。

最终命令：

```bash
npm run lint
npm run format:check
npm run scan:encoding
npm run typecheck
npm run test:api
npm test
npx vite build
```

## 5. 提交顺序、回滚点与交付

建议拆为六个可审查提交：

1. `chore: typecheck electron and strengthen lint boundaries`
2. `refactor: move neutral contracts into shared`
3. `refactor: harden typed electron ipc and quit flush`
4. `refactor: introduce persistence repositories`
5. `refactor: split kcbp execution and controllers`
6. `refactor: decompose workspace and suggest ui with integration tests`

每个提交不得混入无关格式化，不删除现有测试，不修改 Native adapter；阶段失败时只回退当前提交，不使用 `git reset --hard`，并保留用户已有未提交改动。

最终交付报告必须列出：依赖方向、IPC API 变化、配置兼容确认、测试数量、构建结果、未解决问题、新增依赖以及用户文件变更情况。

## 6. 已锁定的实施决定

- 采用一次性深度重构，不只修补高优先级错误。
- 允许内部接口破坏性调整。
- 用户行为和配置格式完全兼容。
- 保留 Context/Reducer。
- 引入关键链路 React 集成测试。
- Electron API 改为命名空间和类型化接口。
- 配置存储只允许固定文件名。
- 退出流程采用异步确认和 3 秒超时。
- KCBP/TCD 通过显式 ports 注入外部能力。
- shared 必须保持对 feature/application 层零依赖。
- 本文件按用户要求保存于仓库根目录；实际源码实施仍须遵守或另行授权覆盖 `AGENTS.md` 的目录限制。

## 7. 单元测试补充实施清单

本节作为对第 4 节测试计划的细化，目标是让新拆出的纯函数、应用服务、仓储和 IPC 校验都能在不启动 Electron、不连接数据库、不加载 Native DLL 的情况下独立验证。

### 7.1 测试工具和统一约定

- 继续使用 Vitest，不引入 Jest、Mocha 或第二套断言库。
- 需要 DOM 的少量用例使用 `jsdom` 和 Testing Library；纯函数、Store、Electron service 默认使用 `node` 环境。
- 新增 `@vitest/coverage-v8`，增加 `test:coverage` 命令；覆盖率只统计 `src/shared`、`src/modules/api-debug/services`、`src/modules/api-debug/store` 和 `electron/ipc`、`electron/services`，不统计 UI 样式、Native adapter 和生成文件。
- 每个测试文件只验证一个模块的公开行为，不测试私有实现细节、调用次数或函数排列顺序，除非该调用顺序是协议要求。
- 时间、随机 ID、debounce timer、Electron API、SQL client、KCBP client 和文件系统全部通过 fake 或 `vi.mock` 注入。
- 不读取仓库根目录的真实 `project.json`、`settings.json`、`db.json`；使用临时目录和内存 fixture。
- 不连接真实 MSSQL，不调用真实 KCBP DLL，不依赖网络和开发服务器。
- 测试数据使用固定时间戳、固定 ID、固定地址和固定响应，避免快照因时间或随机数变化而抖动。

### 7.2 测试工厂与测试夹具

新增共享测试工厂，避免每个测试重复构造大型对象：

```ts
createParamItem(overrides?)
createCaseTab(overrides?)
createProject(overrides?)
createWorkspace(overrides?)
createKcbpResponse(overrides?)
createKcbpRequest(overrides?)
createSuggestRule(overrides?)
createDbConfig(overrides?)
createKcxpEnvironment(overrides?)
```

新增 fake ports：

```ts
createFakeKcbpPort();
createFakeSqlQueryPort();
createFakeConfigRepository();
createFakeWorkspaceRepository();
createFakeAppLifecycle();
```

每个 fake 必须提供：

- 已调用的请求列表。
- 可配置的成功值。
- 可配置的异常。
- 可控制的延迟 Promise。
- `reset()` 方法。

不得在测试中直接重复定义匿名 `window.electronAPI` 大对象；统一通过 fake client 工厂提供最小接口。

### 7.3 shared 纯逻辑单元测试

为新拆分或现有高风险纯函数补充边界用例：

#### KCBP 地址、字段和响应

目标文件：`src/modules/api-debug/utils/kcbp/*.test.ts`

- Host 只有 IP、IP 加端口、域名加端口。
- Host 为空、端口为空、非法端口和多余分隔符。
- Queue、timeout、Msgtype 含空格时的 trim 行为。
- 文本字段、禁用字段、空字段和重复字段。
- binary field 路径存在、路径为空、多个 binary fields。
- 响应 code 为字符串和数字时均可识别成功/失败。
- data 为对象、基本值、空数组和 `null` 时的 grid row 转换。
- 缺失参数响应的名称和值提取。
- 取消响应和业务失败响应不得误判为成功。

#### Workspace 和 Tabs 纯函数

目标文件：`src/modules/api-debug/utils/workspace/*.test.ts` 和 reducer action helper 测试。

- 空项目自动创建默认 case。
- active project/case 越界时归一化。
- 删除当前项目或当前 case 后 active index 修正。
- openCaseIds 含未知 ID、重复 ID 和空 ID 时清理。
- 按 Msgtype 分组、排序和搜索的大小写行为。
- 项目内移动 case、跨项目移动 case、移动到自身和非法索引。
- tab draft 注册、覆盖、flush、注销和重复 flush。
- KCXP 环境应用到当前 case、当前 project 和全部 project。

#### 参数建议和 SQL

目标文件：`src/modules/api-debug/utils/suggest/*.test.ts`、`src/shared/suggest/*.test.ts`

- 字段名逗号、分号、换行分隔和大小写去重。
- 空规则、禁用规则、全局规则和带 `when` 的规则。
- SQL 必填占位符、可选占位符、重复占位符和大小写匹配。
- 缺失依赖、依赖值为空和依赖值为 `0` 的区别。
- 规则 specificity、priority、id 的稳定排序。
- 多字段规则的分组、展示文本和颜色层级。
- SQL 参数绑定中的字符串、数字、空值和非法名称。
- 规则归一化不修改原始输入数组。

#### 脚本、变量、断言和 TCD 基础逻辑

目标文件：`src/shared/test/**/*.test.ts`、`src/shared/tcd/**/*.test.ts`、`src/modules/api-debug/utils/script/**/*.test.ts`

- 变量作用域合并优先级：global、environment、suite、case。
- 未定义变量、空字符串、数字、布尔值、数组和对象插值。
- `assert.eq`、`assert.ok`、`amountDelta`、`reconcile` 的成功和失败。
- SQL exists 查询返回空数组、非空数组和异常。
- script test step pass/fail、显式 fail、异常中断和最终 result。
- script console 的 info、warn、error、重复输出和时间戳。
- FlowRuntime set/get、未知 case、nested case 返回和异常传播。
- JavaScript 格式化对字符串、注释、模板字符串和非法脚本的处理。

#### 平台和撤销

目标文件：`src/platform/**/*.test.ts`、`src/shared/platform/**/*.test.ts`

- undo/redo 初始状态。
- 连续 push、undo、redo、分支写入后 redo 清空。
- scope 隔离，不同 case 的历史互不影响。
- snapshot 相同、空更新和撤销失败。
- 快捷键在 input、textarea、contenteditable 和普通元素上的判断。

### 7.4 Store、Reducer 和仓储单元测试

#### Tabs reducer

为每个 action 类别至少提供一个正常、空数据和非法边界用例：

- `ADD_PROJECT`、`DELETE_PROJECT`、`RENAME_PROJECT`。
- `ADD_CASE`、`DUPLICATE_CASE`、`DELETE_CASE`、`RENAME_CASE`。
- `UPDATE_ACTIVE_CASE`、`TOGGLE_CASE_FAVORITE`、`MOVE_CASE`。
- `SELECT_CASE`、`CLOSE_CASE_TAB`、`SET_WORKSPACE`、`MARK_LOADED`。
- `APPLY_KCXP_ENVIRONMENT` 的三种 scope。
- 所有 action 都验证原 state 未被原地修改。
- 未知 action 必须返回同一 state 引用。

#### Persisted data/repository

为每个 repository 测试：

- 合法 JSON 加载和类型归一化。
- 缺失文件返回默认值。
- JSON 结构错误返回默认值或明确错误，不产生半结构状态。
- 缺失字段、未知字段和旧字段迁移。
- 保存时输出稳定的持久化结构，不包含运行时字段。
- 保存输入对象后再修改原对象不会改变待写入快照。
- auto-save 关闭时不会调度 project 写入。

#### Debounced writer

使用 fake timers 覆盖：

- 多次 schedule 合并为最后一次值。
- timer 到期触发一次写入。
- flush 立即写入并清理 timer。
- 写入中 schedule 新值，完成后继续写新值。
- 写入 reject 时 pending 保留。
- 下一次 flush 能重试。
- dispose 后不能再触发写入。
- 并发 flush 返回同一个完成状态，不重复写同一快照。

#### Context actions

不追求渲染树快照，重点测试 action 对外行为：

- Provider 初始化后可读取默认状态。
- load repository 成功后派发 SET_WORKSPACE。
- load repository 失败后仍进入可用空状态。
- action 更新后 state context 变化，actions context 引用保持稳定。
- 当前 active project/case 始终与索引和 ID 一致。
- response、run log、script console 删除 case 时同步清理。

### 7.5 KCBP 应用服务单元测试

目标文件：重构后的 KCBP service 各职责文件，以及现有 `kcbpCallService.test.ts` 的迁移版本。

#### 请求构建

- 地址解析结果正确映射到 connection。
- 空 queue/timeout 不生成无效字段。
- Msgtype 来源优先级正确。
- binary fields 为空时不生成空对象。
- 输入 tab 不被修改。

#### 单次执行

- fake KCBP port 返回成功响应。
- fake KCBP port 返回业务失败响应。
- fake KCBP port reject Error、字符串和未知值。
- 缺失参数时 nextParams 正确合并，不覆盖用户已有值。
- 生成 nextScript 时字段顺序稳定。
- response stats 缺失时使用安全默认值。

#### 取消和过期响应

- control port cancel 被调用。
- 取消错误转换为统一取消错误。
- generation 不匹配时不写入 response、tab、console 和 run log。
- 新调用开始时旧调用结果被忽略。

#### Script/TCD

- UI 模式不创建真实 assert/vars/flow。
- Script 模式注入 query、console、vars 和 lib。
- TCD 模式生成 call steps。
- nested case 使用相同 ports 和上下文。
- nested case 缺失时返回可读错误。
- response script 失败仍保留原始响应。
- script test 失败与 KCBP 业务失败分别记录。
- SQL 查询只通过 `SqlQueryPort`，不会直接访问 Electron。

#### Feedback

- success/info/warning/error level 映射稳定。
- 缺失 Msgtype、缺失参数、取消和脚本异常分别生成明确反馈。
- feedback 生成是纯函数，不依赖 Ant Design 或 React。

### 7.6 Electron IPC 与主进程服务单元测试

目标文件：`electron/ipc/*.test.ts`、`electron/config/*.test.ts`、`electron/utils/*.test.ts`、`electron/services/**/*.test.ts`

#### Config path

- 每个注册文件名解析到 config dir 下的固定路径。
- 两个迁移备份文件可写入。
- 绝对路径、相对穿越、空值、大小写变体和未知文件名均拒绝。
- config dir 变化时不会残留旧路径。

#### JSON storage

- 文件不存在返回 null。
- 合法 JSON 读取成功。
- 非法 JSON 抛出明确错误。
- 写入自动创建目录。
- 临时文件名包含进程和随机后缀。
- 正常 rename 后无临时文件残留。
- rename 失败后 copy fallback 成功。
- 最终失败时所有临时文件均清理。
- 重试只针对允许的 Windows 文件锁错误。

#### IPC handlers

- 每个 handler 接受合法 payload。
- 非法 payload 在进入 service 前被拒绝。
- handler 不直接暴露 Node 原始异常。
- 未注册 channel 不影响已注册 handler。
- 重复注册测试不会产生难以诊断的静默覆盖。

#### Quit flush

- 单窗口成功 ack。
- 多窗口全部 ack。
- 一个窗口失败，其他窗口仍完成 flush。
- 窗口销毁后 pending 正确移除。
- 超时后主进程退出。
- 重复 request ID 不重复执行 callback。
- ack 的 request ID 错误时不提前退出。

#### MSSQL service

使用 mock `mssql` 模块，覆盖：

- 连接成功。
- 连接失败。
- query 返回行。
- query 返回空结果。
- 参数值为字符串、数字、null 和空值。
- SQL 执行异常。
- pool/request 正确关闭或释放。
- 密码不会出现在错误消息和日志中。

### 7.7 React 关键链路测试

只增加高价值集成测试，不为每个纯展示组件创建快照：

#### 运行链路

1. 渲染 Providers 和最小 Path。
2. 点击运行。
3. fake KCBP port 保持 pending，验证 loading。
4. 点击取消，验证 cancel port。
5. resolve 成功，验证 response、tab、console 和 log。
6. resolve 旧请求，验证状态不被覆盖。

#### 持久化链路

1. 修改 tab。
2. 推进 fake timer。
3. 验证 repository 写入。
4. 触发 flush。
5. 验证 pending 被清空。
6. 模拟写入失败，验证下一次 flush 可重试。

#### 导入和规则链路

- fake import client 返回 JSON/INI。
- 验证项目导入后 reducer 状态。
- fake repository 保存规则。
- 验证 reload service 被调用。
- 无效数据不会覆盖当前规则。

### 7.8 测试数量与覆盖率门槛

在不删除现有测试的基础上，目标新增：

- shared 和纯 utils：不少于 35 个用例。
- reducer、Store 和仓储：不少于 30 个用例。
- KCBP、脚本和 TCD 应用服务：不少于 30 个用例。
- Electron IPC、路径和文件服务：不少于 25 个用例。
- React 关键链路：不少于 10 个用例。

预计新增不少于 130 个单元/集成用例，最终总数目标不低于 449 个。

覆盖率门槛针对变更代码：

- 行覆盖率不低于 90%。
- 分支覆盖率不低于 80%。
- KCBP、持久化、IPC 校验和 reducer 的关键分支必须逐项覆盖。
- 覆盖率不足时优先补边界测试，不通过降低阈值解决。

新增命令：

```bash
npm run test:unit
npm run test:integration
npm run test:coverage
```

其中：

- `test:unit` 运行 shared、utils、reducer、service、Electron service 测试。
- `test:integration` 运行 Provider、持久化和关键 UI 链路测试。
- `test:coverage` 运行全部测试并输出 text、json-summary 和 HTML 报告。

### 7.9 单元测试验收标准

- 测试不依赖真实 Electron、数据库、DLL、网络或仓库配置文件。
- 所有异步测试都有明确的 await、timeout 或 fake timer 控制，不使用固定 sleep。
- 所有 fake 在 `afterEach` 中 reset，避免跨测试污染。
- 测试失败信息包含输入场景和期望状态，不只断言 truthy。
- 关键错误路径至少验证错误类型、错误 code 和用户可见消息。
- 测试通过后再执行 `npm run lint`、`npm run typecheck` 和 `npx vite build`。

## 8. 冒烟测试补充实施清单

冒烟测试用于确认“应用能启动、核心链路能跑通、数据能保存、失败能恢复”，不替代单元测试和完整回归测试。每次涉及 Electron、preload、IPC、持久化、KCBP、数据库建议或构建配置的改动，都必须执行本节测试。

### 8.1 冒烟测试环境与数据准备

#### 环境矩阵

至少覆盖以下两种运行形态：

| 环境     | 启动方式                                               | 重点验证                                                     |
| -------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| 开发模式 | `npm run dev`                                          | Vite URL、preload、热更新、开发配置目录                      |
| 打包模式 | `npx vite build` 后启动 Electron/electron-builder 产物 | `dist`、`dist-electron`、adapter、userData/portable 配置目录 |

Windows 环境必须验证，因为当前文件替换、窗口生命周期和 Native adapter 依赖 Windows 行为。

#### 测试数据

准备独立的临时配置目录，不使用开发者真实配置：

- 一个包含 1 个项目、2 个 case 的 `project.json`。
- 一个包含 UI、Script 两种模式的 `api-debug.env.json`。
- 一个包含有效和无效规则的 `param-suggest-rules.json`。
- 一个包含数据库连接配置的 `db.json`，密码使用不可用的测试占位值。
- 一个包含旧字段的 legacy `app.json`/`settings.json`，用于迁移冒烟。
- 一个可被读取的 UTF-8 INI 文件和一个非 UTF-8 编码 INI 文件。
- 一个包含对象、数组、基本值和空数据的 KCBP mock 响应。

所有冒烟测试使用独立 `userData`/portable 目录；测试结束后只删除已确认的临时目录，不删除工作树和用户目录。

#### 外部依赖策略

- KCBP 冒烟默认使用可控 mock adapter；只有发布候选版本才增加一次真实 Native adapter 调用。
- 数据库建议默认使用可控 fake SQL service；具备测试库时再执行真实 MSSQL 连接项。
- 不把网络、真实生产地址、生产数据库和真实密码写入测试脚本或日志。

### 8.2 启动与窗口生命周期冒烟

#### 开发模式启动

1. 启动 `npm run dev`。
2. 确认 Vite 页面成功加载。
3. 确认 preload API 可用，Renderer 没有 `electronAPI undefined` 错误。
4. 确认 AppEnv 加载完成后显示平台壳和 API Debug 模块。
5. 确认控制台没有未处理 Promise rejection、IPC channel 错误或 React hydration/render 错误。
6. 修改一个 UI 状态，确认热更新不会清空工作区和配置。

预期结果：窗口在 10 秒内可交互，API Debug 模块可以打开，首屏无阻塞错误。

#### 打包模式启动

1. 执行 `npx vite build`。
2. 确认 `dist/index.html`、Renderer chunk、`dist-electron/main.js`、preload 和 worker/bridge 文件存在。
3. 启动打包应用。
4. 确认应用不依赖仓库根目录才能启动。
5. 确认 adapter 和资源路径指向打包后的资源目录。
6. 确认 portable 与安装模式的配置目录符合预期。

预期结果：打包应用可以独立启动、加载配置、打开 API Debug，并能执行至少一个 mock KCBP 请求。

#### 窗口操作

- 最小化窗口，恢复后内容和运行状态不丢失。
- 最大化、还原，布局无明显溢出。
- 关闭窗口，Renderer 收到 flush 请求。
- 快速连续点击关闭，不重复执行 flush，不弹出多个错误窗口。
- 在 flush 期间关闭窗口，等待成功确认或 3 秒超时后退出。
- 重新启动后，退出前修改的项目、设置和规则仍然存在。

### 8.3 配置与持久化冒烟

#### 首次启动

1. 使用空临时配置目录启动应用。
2. 确认默认项目、默认 case、默认环境和默认规则出现。
3. 确认不会创建未知格式或空内容文件。
4. 确认默认文件写入路径与当前运行模式一致。

#### 自动保存

1. 修改 case 名称、地址、参数和脚本。
2. 等待 debounce 时间超过一个周期。
3. 检查 `project.json` 内容已更新。
4. 修改 AppEnv、API Debug Env、数据库配置和规则。
5. 检查对应文件分别更新，互不覆盖。
6. 关闭自动保存，修改项目后确认 project 文件不立即写入。
7. 重新开启自动保存并手动 flush，确认最新状态写入。

#### 退出保存

1. 在 debounce 尚未到期时修改多个文件。
2. 立即关闭窗口。
3. 确认主进程等待 Renderer flush ack。
4. 检查所有 pending 文件都已写入。
5. 模拟某个文件写入失败，确认其他文件仍尝试写入。
6. 确认超时后应用仍能退出，且日志包含 request ID 和失败原因。

#### 重启恢复

1. 保存一个包含项目、case、展开状态、打开 tab 和 active case 的工作区。
2. 完整退出应用。
3. 再次启动。
4. 确认项目、case、参数、脚本、tab、active index 和展开状态恢复。
5. 删除一个已打开 case 后重启，确认无残留 openCaseId。

#### Legacy 迁移

1. 只提供旧格式 `app.json`/`settings.json`。
2. 启动应用并等待迁移完成。
3. 确认生成新格式文件和 legacy backup 文件。
4. 确认旧配置中的迁移字段被移除。
5. 重启应用，确认不会再次迁移或覆盖 backup。
6. 模拟 backup 写入失败，确认应用报告失败，不标记迁移成功。

### 8.4 工作区与编辑器冒烟

按顺序执行一遍典型工作流：

1. 新建项目。
2. 新建两个 case。
3. 重命名项目和 case。
4. 修改地址、Msgtype、Queue、timeout 和参数。
5. 在 UI 模式和 Script 模式之间切换。
6. 复制、删除、收藏和移动 case。
7. 使用搜索过滤项目和 case。
8. 展开/收起项目和 Msgtype 分组。
9. 拖拽 case 到另一个项目。
10. 打开多个 case tab 并切换。
11. 关闭当前 tab，再次选择 case。
12. 对地址和参数执行撤销、重做。
13. 切换 KCXP 环境，分别验证当前 case、当前 project 和全部 project scope。
14. 切换窗口焦点或最小化后恢复，确认 draft 不丢失。

预期结果：所有操作完成后，active project、active case、open tabs、参数和持久化文件保持一致，无重复 ID 和空 active 引用。

### 8.5 KCBP 调用冒烟

#### UI 模式成功调用

1. 配置可用的 mock KCBP port 或测试 adapter。
2. 打开带有 Msgtype 和必填参数的 case。
3. 点击 Run。
4. 确认按钮变为 loading/cancel 状态。
5. 确认收到响应后显示 code、message、stats 和 data 表格。
6. 确认 run log 记录 case、Msgtype、耗时、行数和成功状态。
7. 切换到其他 case，确认响应仍属于原 case。

#### 缺失参数

1. 使用返回缺失字段的 mock 响应。
2. 确认显示缺失参数提示。
3. 确认 nextParams 合并到当前 tab。
4. 确认生成的 nextScript 可再次执行。
5. 确认已有参数值不会被空缺失值覆盖。

#### 失败和取消

- Msgtype 为空时不能发起调用，并显示明确提示。
- adapter 返回业务失败时显示业务错误，不误报网络错误。
- adapter reject 时显示可读错误，不泄露内部堆栈或密码。
- 调用进行中点击 Cancel，确认主进程收到 cancel，UI 恢复可运行状态。
- 调用进行中切换 case，再返回时旧结果不会写入新 case。
- 连续快速点击 Run/Cancel 不会产生多个并发调用或错误 loading 状态。

#### Script 模式

1. 执行 request script 修改请求字段。
2. 验证 console 输出。
3. 执行 response script 修改或检查响应。
4. 脚本异常时保留原始响应并显示 script error。
5. 脚本产生 query、vars、lib 和 assert 调用时，确认调用顺序和结果正确。

#### TCD 模式

1. 执行包含两个 call step 的 TCD case。
2. 确认每个 step 的请求、响应、耗时和状态存在。
3. 验证变量从前一个 step 传递到后一个 step。
4. 验证 nested case 成功和不存在两种情况。
5. 验证 TCD assert 失败时结果为 fail，但原始 KCBP response 仍可查看。
6. 取消 TCD 后确认后续 step 不再启动。

### 8.6 SQL 参数建议冒烟

#### 配置与规则

1. 打开参数建议设置。
2. 填写数据库连接配置并保存。
3. 新增全局规则、带 when 依赖的规则和 SQL 占位符规则。
4. 修改 priority、enabled、fields 和 bindings。
5. 保存后确认 Renderer 和主进程规则都已 reload。
6. 重启应用，确认规则和数据库配置恢复。

#### 建议加载

1. 打开包含可建议字段的 case。
2. 输入关键字并等待 debounce。
3. 确认 pending dependency、loading、options 和错误状态正确显示。
4. 修改依赖参数，确认建议结果重新加载。
5. 清空关键字，确认回退到默认建议或空结果。
6. 快速连续输入，确认旧请求结果不会覆盖最新关键字。

#### 数据库异常

- 连接失败显示可读错误。
- SQL 语法错误不导致 Renderer 崩溃。
- 查询为空时显示空结果而不是异常。
- 缺少必填依赖时不执行 SQL，并显示 pending dependencies。
- 数据库密码不出现在 UI 日志、run log 或 IPC 错误中。

### 8.7 导入、导出和文件访问冒烟

#### 项目导入

1. 导入合法 JSON。
2. 确认项目、case、参数、脚本和地址正确出现。
3. 导入包含旧字段的 JSON，确认兼容转换。
4. 导入空项目、缺字段项目和非法 JSON，确认错误提示且当前工作区不被清空。
5. 导入 INI，确认编码识别和字段转换。

#### 参数文件

1. 通过 dialog 选择存在文件。
2. 确认 stat 返回文件大小和存在状态。
3. 选择目录或不存在文件时显示错误。
4. 取消选择不改变当前 case。
5. 传入绝对路径到配置 IPC，确认被拒绝；用户 dialog 选择的文件仍能通过专用接口工作。

#### 响应导出

1. 对含对象、数组、空值和特殊字符的响应导出 CSV。
2. 导出 HTML 报告并打开检查表格、转义和中文。
3. 取消保存 dialog 不产生错误或空文件。
4. 默认文件名没有扩展名时自动追加正确扩展名。
5. 写入失败时显示失败原因，不标记为成功。

### 8.8 更新、异常和恢复冒烟

每次发布候选版本至少执行一次以下故障注入：

- 配置目录只读。
- 单个 JSON 文件被占用。
- 临时文件残留。
- IPC handler 返回异常。
- KCBP adapter 超时。
- KCBP adapter 取消。
- SQL client 连接失败。
- preload API 缺失。
- Renderer 在 flush 前崩溃。
- 主进程在写入期间关闭。

检查要求：

- 应用不会进入永久 loading。
- 用户可以重新运行或重启恢复。
- 未损坏的其他配置文件仍可读取。
- 错误信息可定位 channel/request/file，但不泄露密码、绝对内部堆栈或 native 细节。
- 重试不会生成重复项目、重复 tab 或重复写入记录。

### 8.9 冒烟执行顺序和证据

每次执行按以下顺序，减少前置失败造成的误判：

1. 静态门禁：lint、format、encoding、typecheck。
2. 单元测试：`npm run test:unit`。
3. 构建：`npx vite build`。
4. 开发模式启动冒烟。
5. 打包模式启动冒烟。
6. 配置、持久化和重启恢复。
7. 工作区和编辑器操作。
8. KCBP UI/Script/TCD。
9. SQL 参数建议。
10. 导入导出和故障恢复。
11. 全量测试：`npm run test:api`、`npm test`。

每次冒烟保存以下证据到工作树外的测试报告目录：

- 执行日期、应用版本、Git commit、Node/Electron/Vite 版本。
- 操作系统和运行模式。
- 测试数据目录路径。
- 每个场景的通过/失败状态。
- 失败场景的截图、主进程日志、Renderer console 和 request ID。
- 失败时保留临时配置目录，成功后再清理。

### 8.10 冒烟测试通过门槛

- 启动、窗口操作、配置加载和退出 flush 全部通过。
- UI、Script、TCD 至少各完成一次成功调用和一次失败/取消场景。
- 至少完成一次项目导入、INI 导入、CSV 导出和 HTML 导出。
- SQL 建议至少完成一次命中、一次缺依赖和一次数据库失败。
- 重启后工作区、环境、规则和设置数据一致。
- 不允许有未处理 Promise rejection、永久 loading、数据丢失或配置越权读写。
- 任一 P0/P1 场景失败，发布候选版本不得标记为通过。

## 9. Framework-level frontend quality validation (added)

### 9.1 Goals and non-goals

The goal is to make invalid UI states, unsafe async behavior, accidental layer coupling, and untestable oversized components fail before release. ESLint is a fast static gate; it does not replace TypeScript, unit tests, integration tests, smoke tests, or runtime monitoring.

### 9.2 React and JSX rules

1. Add `eslint-plugin-react` and configure React 18 automatic runtime detection.
2. Add `eslint-plugin-jsx-a11y` and validate button/link semantics, labels, keyboard access, focus behavior, ARIA names, image alternatives, and modal accessibility.
3. Keep `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps` as errors.
4. Keep `react-refresh/only-export-components` as an error for renderer modules.
5. Require stable `key` values for lists; prohibit array-index keys except for explicitly static lists.
6. Require controlled input error/loading/disabled states for request, database, import, and rule-management forms.
7. Require every async panel to expose loading, empty, error, retry, and success states.
8. Add component tests for settings navigation, rule editor, rule table, suggestion input, response table, import/export dialogs, and window lifecycle UI.

### 9.3 TypeScript and async safety

1. Run type-aware ESLint separately for `src`, `src/shared`, and `electron`, each against its own tsconfig.
2. Keep `no-floating-promises` enabled. Every effect, event callback, timer, IPC call, and Electron lifecycle Promise must be awaited, returned, or explicitly handled with `void ... .catch(...)`.
3. Roll out `no-misused-promises` for JSX callbacks and DOM/EventEmitter handlers.
4. Roll out `no-unsafe-assignment`, `no-unsafe-member-access`, `no-unsafe-call`, and `no-unsafe-return` for IPC/database/import boundaries first.
5. Prohibit new `any`; existing exceptions require a local comment, an owner, and a removal issue.
6. Use `unknown` at all external boundaries, then validate with schema/type guards before state updates.
7. Require discriminated unions for IPC success/error/cancelled results and database suggestion responses.
8. Require abort/cancellation handling for requests that can outlive a component.
9. Add tests for rejected Promises, cancelled requests, stale responses, unmounted components, and retry behavior.

### 9.4 Complexity and file-size budgets

Enforce budgets for new and modified files; existing violations are tracked and reduced incrementally:

- File: target <= 400 lines, hard limit 600.
- Function/hook: target <= 60 lines, hard limit 100.
- Cyclomatic complexity: target <= 10, hard limit 15.
- Nesting depth: maximum 4.
- Parameters: maximum 5; use an options object beyond that.
- JSX nesting: maximum 6 meaningful levels; extract subcomponents beyond that.
- Store/provider value objects: split by domain when they exceed 10 actions or 8 state fields.

Priority refactors: `CaseSidebar`, `Path`, `ParamSuggestRuleFormModal`, `tabsReducer`, KCBP service, and large settings panels.

### 9.5 Imports, modules, and architecture

1. Add duplicate-import, unused-import, import-order, and type-import consistency checks.
2. Enforce dependency direction: UI -> hooks/store/services; services -> domain/ports; shared -> no renderer; Electron -> IPC/native adapters only.
3. Prohibit UI libraries in shared/domain/service modules.
4. Prohibit direct `window.electronAPI`; use the typed `getElectronAPI`/`requireElectronAPI` port.
5. Prefer aliases; prohibit new deep relative imports crossing module roots.
6. Keep each feature public entrypoint thin and prevent imports from another feature's internals.
7. Every boundary exception must have a test and an architecture comment.
8. Add a dependency-graph check to detect cycles and renderer/Electron reverse dependencies.

### 9.6 Security and correctness checks

1. Keep `no-eval`, `no-implied-eval`, `no-debugger`, `no-throw-literal`, and unsafe optional-chaining checks enabled.
2. Add a local rule to detect hardcoded passwords, tokens, connection strings, and private keys.
3. Forbid unsafe HTML injection unless the call site has an approved sanitizer and test.
4. Validate file paths and IPC payloads at the main-process boundary.
5. Ensure error messages do not expose credentials, absolute internal stacks, or native adapter details.

### 9.7 Test and coverage gate

1. Add `test:unit`, `test:component`, `test:integration`, `test:smoke`, and `test:coverage` scripts.
2. Set an initial coverage floor for statements, branches, functions, and lines; raise it each iteration.
3. Require tests for every new reducer, store action, provider, IPC handler, parser, and persistence adapter.
4. Component tests must cover render, interaction, loading, empty, error, retry, cancellation, and persistence states.
5. Smoke tests must cover startup, settings navigation, rule loading/saving, import/export, API request, database suggestion, and restart recovery.

### 9.8 Unified quality gate

The release gate runs in this order:

```bash
npm run lint
npm run format:check
npm run scan:encoding
npm run typecheck
npm run test:unit
npm run test:component
npm run test:integration
npm run test:smoke
npx vite build
```

Any failure blocks release. CI must publish machine-readable lint, typecheck, coverage, smoke, and build artifacts. New rules start in report mode, existing violations receive owners and deadlines, and only then are promoted to errors.

### 9.9 Rollout order and acceptance criteria

1. Baseline: record current violations and freeze new violations.
2. React/a11y: install plugins, fix settings and high-traffic components.
3. Async/type safety: enforce Promise handling and IPC boundary types.
4. Architecture: enforce imports, cycles, and feature boundaries.
5. Complexity: split oversized components/services and enforce budgets.
6. Tests: add component, integration, smoke, and coverage gates.
7. CI: make the unified gate required for merge and release.

Acceptance requires zero lint errors, successful typecheck and build, no unhandled Promise rejection in smoke tests, all P0/P1 scenarios passing, and published evidence for every gate.

## 10. 前端基础组件体系优化方案（新增）

### 10.1 当前状态评估

当前项目已经存在 `src/components/ui`，并提供 `Button`、`Card`、`Alert`、`Drawer`、`Empty`、`Input`、`Modal`、`TextArea` 等 primitives，以及 `Grid`、`PanelEmptyState`、`ResponseTableTools`、Skeleton、`TextHighlight` 等业务通用组件。

当前结论为“可用但未收口”：

1. primitives 已有统一导出，但业务代码仍大量直接依赖 antd。
2. 组件的 variant、尺寸、间距、错误态和 loading 态没有完全统一。
3. 缺少 Form、Select、Switch、Tooltip、Loading、Table、Result 等常用基础能力。
4. 组件测试覆盖不足，目前主要只有 className 纯函数测试。
5. 没有强制业务层优先使用项目 primitives 的 ESLint 规则。
6. 业务组件、基础组件和 antd 组件之间的职责边界仍不清晰。

### 10.2 目标架构

基础组件分为四层，禁止越层依赖：

1. `ui/primitives`：无业务语义的视觉和交互基础组件，只负责样式、可访问性、受控状态和原生属性透传。
2. `ui/patterns`：跨页面复用的交互模式，例如 `LoadingState`、`ErrorState`、`EmptyState`、`ConfirmAction`、`AsyncPanel`、`FormField`。
3. `ui/data-display`：表格、树、分页、代码、JSON、响应数据等通用展示组件。
4. `modules/api-debug/components`：只保留 API 调试领域语义，不将领域规则反向放入 primitives。

依赖方向必须保持：

```text
primitives -> theme/types
patterns -> primitives
data-display -> primitives/patterns
feature components -> primitives/patterns/data-display
services/stores -> no UI
shared -> no renderer UI
```

### 10.3 第一批基础组件收口

#### 现有组件标准化

统一以下组件的 API、尺寸、键盘行为、disabled/loading 状态和测试：

- `Button`：primary、secondary、ghost、danger、link、loading、icon-only。
- `Input`：size、error、prefix/suffix、clearable、label、help、disabled。
- `TextArea`：自动高度、最大长度、错误态、字数统计。
- `Card`：default、panel、flat、title、description、headerActions、accent。
- `Modal`：width、destroyOnClose、loading、confirm loading、键盘关闭策略。
- `Drawer`：宽度档位、移动端适配、关闭确认、滚动区域。
- `Alert`/`Empty`：info、success、warning、error、retry、action。

#### 需要新增的通用组件

按优先级补充：

1. `FormField`、`FormSection`、`FieldError`。
2. `Select`、`MultiSelect`、`Switch`、`Checkbox`、`RadioGroup`。
3. `LoadingState`、`SkeletonBlock`、`ErrorState`、`RetryButton`。
4. `ConfirmAction`、`ActionMenu`、`Tooltip`、`CopyButton`。
5. `DataTable`、`TableToolbar`、`Pagination`、`VirtualList`。
6. `CodeBlock`、`JsonViewer`、`KeyValueList`、`StatusBadge`。
7. `Tabs`、`ResizablePanel`、`SplitPane`、`ScrollArea`。

### 10.4 组件 API 规范

1. 所有组件使用 TypeScript 导出 Props 类型。
2. Props 优先继承底层 HTML/Ant Design 合理属性，但禁止把 antd 私有类型泄漏到业务层。
3. 状态类组件同时支持受控和非受控模式，明确 `value/onChange` 或 `open/onOpenChange` 契约。
4. 异步组件统一使用 `loading`、`error`、`onRetry`、`disabled` 约定。
5. 事件回调使用语义化命名，例如 `onConfirm`、`onCancel`、`onSearch`、`onRetry`。
6. 所有 className 使用合并工具或统一 helper，禁止业务代码拼接内部 class 名。
7. 不允许通过 `any` 绕过组件 Props 类型。
8. 对外导出只允许通过 `src/components/ui/index.ts` 或明确的 primitives/data-display barrel。
9. 组件内部可使用 antd，但业务模块不得依赖 antd 的实现细节。
10. 组件文档至少包含用途、Props、状态、示例和禁止用法。

### 10.5 状态和交互规范

每个数据型或异步型组件必须明确以下状态：

- initial：首次进入且尚未请求。
- loading：正在加载，禁止重复提交。
- success：数据或操作成功。
- empty：请求成功但没有数据。
- error：失败并提供可读原因。
- retrying：重试中并保留上下文。
- cancelled：用户取消或请求被替换。
- disabled：当前状态不可操作。

规则编辑、数据库连接、导入导出、参数建议和 KCBP 请求必须遵守同一套状态表现，不允许每个页面自定义一套 loading/error 文案和按钮行为。

### 10.6 可访问性要求

1. 所有交互组件支持键盘操作和可见 focus 状态。
2. Icon-only 按钮必须提供 `aria-label` 或 tooltip。
3. 表单控件必须关联 label、help 和 error message。
4. Modal/Drawer 打开时管理 focus，关闭后恢复触发元素 focus。
5. Alert、错误态和异步状态使用适当的 `role`/`aria-live`。
6. 颜色不能作为唯一状态表达方式。
7. 组件测试加入键盘、焦点和基本 axe/a11y 校验。

### 10.7 业务迁移计划

#### 阶段一：建立入口和规范

1. 增加统一 `src/components/ui/index.ts`。
2. 统一 primitives 的命名、Props 和主题 class。
3. 新代码禁止直接导入 antd 的 Button、Input、Modal、Drawer、Alert、Empty。
4. 建立 antd 直用白名单，仅允许复杂 Table、Form 或尚未封装能力暂时保留。

#### 阶段二：高频页面迁移

按风险和复用率优先迁移：

1. 设置页和提示规则页。
2. 请求编辑器和参数输入区。
3. 响应表格、详情 Modal 和导入导出对话框。
4. CaseSidebar、TabBar、项目树和运行日志。

每次迁移必须保持行为不变，并增加至少一个组件/页面回归测试。

#### 阶段三：复杂组件抽取

1. 从 `Grid` 抽取通用 `DataTable` 与响应数据专用适配器。
2. 从设置页抽取 `FormSection`、`FormField` 和统一错误显示。
3. 从多个页面抽取 `LoadingState`、`EmptyState`、`ErrorState`。
4. 从重复的确认/删除/导入逻辑抽取 `ConfirmAction` 和 `AsyncAction`。

### 10.8 测试矩阵

每个基础组件至少覆盖：

1. 默认渲染和主要 Props。
2. variant、size、className 和属性透传。
3. disabled、loading、error、empty 状态。
4. 点击、键盘、输入、提交、取消和重试行为。
5. 受控/非受控模式及状态切换。
6. 异步回调成功、失败、取消和重复触发。
7. 可访问性语义、label、aria、focus 和 tab 顺序。

重点组件最低要求：

- Button/Input/Modal/Drawer：组件单元测试 + 键盘测试。
- FormField/Select/Switch：表单集成测试。
- DataTable/Grid：空态、分页、排序、虚拟滚动和大数据测试。
- Loading/Error/Empty：页面状态组合测试。
- Settings 和规则编辑组件：真实用户流程测试。

### 10.9 ESLint 与代码门禁

1. 业务组件直接导入 antd 基础控件时报错，复杂组件走白名单。
2. 禁止 primitives 依赖 modules、store、services 和 Electron。
3. 禁止组件文件直接访问 `window.electronAPI`、文件系统或数据库。
4. 检查组件 Props 是否导出、是否存在未使用 Props 和隐式 any。
5. 对组件文件启用复杂度、文件长度和 JSX 嵌套预算。
6. 对异步组件启用 `no-floating-promises` 和 `no-misused-promises`。
7. 新增 antd 直用必须附带迁移原因、影响范围和后续替换任务。

### 10.10 验收标准

- 业务页面新增基础交互优先使用项目组件，不再复制粘贴 antd 配置。
- Button、Input、Modal、Drawer、Alert、Empty、Loading、Error、FormField 至少拥有完整测试。
- 关键页面不再出现自定义 loading/error/empty 的重复实现。
- `npm run lint` 能阻止跨层引用和未授权 antd 直用。
- 组件测试、类型检查、冒烟测试和 Vite 构建全部通过。
- 组件升级时不破坏 API debug 的请求、规则、数据库、导入导出和响应展示流程。

## 11. 可复用资产盘点与抽取方案

当前项目已经具备 `src/components/ui/primitives`、`src/styles/tokens.css`、`src/shared`、`src/utils` 等复用基础，但复用程度仍不均衡。后续抽取必须以“至少两个真实消费者、语义稳定、可独立测试”为准，避免把一次性业务细节过早做成通用组件。

### 11.1 样式层：优先复用设计令牌和语义模式

#### 已经可以复用的样式资产

1. `tokens.css` 中的颜色、边框、阴影、间距、圆角、焦点环和字号变量，统一作为唯一视觉来源。
2. `primitives.css` 中的滚动条、focus、按钮状态、文本截断和基础交互样式。
3. `feature-ui.css` 中的卡片、状态标记、表格行、提示区域和面板头部模式。
4. `module-skeleton.css`、`ResponseTableSkeleton`、`SettingsModalSkeleton` 中的骨架屏布局。
5. `ui-scroll`、`app-modal`、`ga-card`、`ga-empty`、状态颜色类等语义 class。

#### 建议新增的语义样式层

1. `styles/layout-primitives.css`：`stack`、`cluster`、`split`、`inset`、`scroll-area`、`full-height-panel`，统一纵向间距和面板布局。
2. `styles/form-patterns.css`：表单行、标签、帮助文字、错误文字、必填标记、字段分组和紧凑模式。
3. `styles/feedback-patterns.css`：loading、empty、error、success、warning、retry 和取消状态。
4. `styles/data-display.css`：状态徽标、键值列表、代码块、表格工具栏、分页栏和行详情。
5. `styles/interactive-patterns.css`：可点击列表项、树节点、tab、拖拽手柄、选中态和 hover/focus 态。

#### 样式抽取规则

- 同一组声明在两个以上页面出现，且表达的是同一语义，才提升为公共 class 或 CSS mixin。
- 页面特有尺寸、颜色和业务状态保留在 feature 样式中，不把业务 class 塞进 primitives。
- 禁止新增硬编码颜色、阴影和 z-index；必须使用 token 或集中式层级表。
- 禁止通过 Tailwind/inline style 重新定义已有公共语义；确有例外时记录原因。
- 每个公共样式至少有一个组件使用示例和一个视觉回归场景。

### 11.2 基础组件和交互模式：优先抽取高频重复行为

#### 立即可抽取

1. `FormField` / `FormSection` / `FieldError`：统一设置页、数据库连接、提示规则和请求参数表单的 label、help、error、required 和布局。
2. `AsyncAction` / `ConfirmAction`：统一导入、导出、删除、保存、执行请求的 loading、防重复提交、成功/失败提示和取消。
3. `LoadingState`、`EmptyState`、`ErrorState`、`RetryButton`：统一首屏加载、无数据、请求失败和重试文案。
4. `CopyButton`、`IconAction`、`HotkeyHint`：统一复制路径、复制 SQL、窗口控制和带快捷键的图标按钮的 tooltip、aria-label 与反馈。
5. `SearchInput` / `FilterBar`：统一设置导航、响应表格、Case 树和规则表的搜索值、清空、快捷键和高亮。
6. `StatusBadge` / `StatusDot`：统一 KCBP 状态、连接状态、脚本执行状态和规则启用状态的颜色、文字和 aria 语义。
7. `KeyValueList` / `CodeBlock` / `JsonViewer`：复用响应详情、请求元数据、脚本输出和错误详情展示。
8. `TableToolbar` / `Pagination` / `DataTable` 适配层：把 `Grid` 的搜索、导出、列宽、空态、分页和行详情能力拆成可组合能力。
9. `SplitPane` / `ResizablePanel` / `PanelHeader`：复用请求区、响应区、编辑器、侧栏和 SQL 抽屉的分栏与调整大小行为。
10. `ModalShell` / `DrawerShell`：在现有 `Modal`、`Drawer` primitive 之上统一标题、描述、footer、危险操作确认、异步关闭和 focus 恢复。

#### 可组合但不应做成“大一统组件”的模式

- 规则编辑器、请求编辑器、脚本编辑器应复用字段、工具栏、错误展示和异步动作，不应合并成一个“万能编辑器”。
- Case 树、项目树、规则表应复用 `TreeItem` 的键盘/选中/拖拽协议，但保留各自领域数据和 reducer。
- 响应表格和规则表应共用 DataTable 基础能力，但列定义、单元格渲染和行操作由业务模块提供。
- 设置页应共用 `SettingsSection`、导航高亮和表单状态，不应让设置项依赖彼此的 store。

### 11.3 纯函数和领域工具：可进一步集中到 shared/utils

#### 推荐提升为跨模块共享的纯函数

1. 文本：`normalizeWhitespace`、`truncateText`、`highlightText`、控制字符展示、大小写不敏感搜索。
2. 时间和大小：日期、相对时间、字节数、响应耗时和数量格式化。
3. 数据状态：`toAsyncState`、`isAbortError`、错误归一化、状态标签和可读错误消息。
4. 表格：列宽计算、分页边界、排序/过滤、空值显示、CSV 导出和大数据量摘要。
5. URL/路径：KCBP 地址解析与规范化、文件路径展示、环境地址拼接和安全路径比较。
6. 参数：参数项规范化、启用项筛选、文本序列化/反序列化、字段映射和稳定排序。
7. SQL/规则：SQL 空白规范化、占位符解析、绑定校验、规则匹配摘要和缓存 key 生成。
8. 工作区：case 标签、msgtype 推导、tab 关闭目标、拖拽 payload 校验、项目/用例索引。
9. 脚本：脚本结果规范化、console 参数格式化、输出截断、脚本测试结果汇总。
10. 持久化：版本迁移、默认值合并、未知字段清理、读写失败分类和 debounce 策略。

#### 纯函数抽取标准

- 函数只接收参数并返回结果，不访问 React、store、Electron、DOM、时间全局变量或网络。
- 对非法输入采用明确策略：返回 `Result`/联合类型、空值或抛出领域错误，不能静默吞错。
- 输出必须稳定、可序列化；涉及排序时明确是否稳定排序和大小写规则。
- 每个共享函数同时补充边界测试：空输入、超长输入、非法格式、Unicode、重复项、取消和异常。
- 领域专用函数先留在 `modules/api-debug/utils`；至少被两个模块使用后再上移 `shared`。

### 11.4 Hooks、状态和服务的复用边界

1. 抽取 `useAsyncTask`、`useDebouncedValue`、`useLatest`、`useAbortableRequest`、`useKeyboardShortcut` 等无业务语义 hooks。
2. 抽取统一的异步任务状态机，但请求参数、缓存 key、成功结果和错误文案由调用方注入。
3. store 继续按领域拆分；只复用 selector、action creator、持久化 middleware，不合并 tabs、response、runLog 等领域状态。
4. KCBP、参数建议、导入导出和脚本执行服务只复用 transport、错误映射、取消和重试基础设施，不能共享业务 DTO。
5. 所有可复用 hooks/services 必须能在无 Electron 环境的单元测试中运行；Electron 适配放在边界层。

### 11.5 不建议抽取的内容

- 只有一个消费者且变化频繁的业务组件。
- 仅为减少几行 JSX 而创建的 wrapper。
- 同时包含 UI、store、IPC 和领域规则的“万能 hook”。
- 把所有 antd 控件包一层但没有统一行为的空壳组件。
- 依赖具体页面 class、具体 store 字段或固定文案的伪通用组件。

### 11.6 实施顺序和验收

1. 第一步盘点重复实现，建立组件/样式/纯函数清单和消费者数量。
2. 第二步先抽取 `FormField`、异步状态、反馈状态、搜索输入、状态徽标、CopyButton 等低风险高复用资产。
3. 第三步抽取 DataTable、SplitPane、ModalShell 等结构型能力，并迁移设置页和响应区。
4. 第四步合并跨模块纯函数，补齐共享测试和架构依赖规则。
5. 每次抽取都必须保留旧行为、减少重复代码、增加测试，并记录迁移前后消费者。
6. 验收以 `npm run lint`、`npm run typecheck`、单元/集成测试、冒烟测试和 `npx vite build` 全部通过为准。

## 12. 右键菜单注册制设计

右键菜单适合采用注册制。当前 `ProjectTreeItem`、`CaseTreeItem` 等组件通过 props 接收 antd `MenuProps['items']`，菜单生成逻辑主要集中在 `useCaseSidebarController`，已经具备迁移到注册模型的条件。

### 12.1 推荐分层

1. `ContextMenuRegistry`：维护菜单贡献者注册表，不负责渲染。
2. `ContextMenuResolver`：根据 `scope`、目标对象、权限和当前状态筛选、排序、分组菜单项。
3. `ContextMenuRenderer`：统一使用项目 `Dropdown/Menu` 封装，负责键盘、焦点、关闭和定位。
4. `ContextMenuAction`：封装命令执行、loading、防重复、错误提示和菜单关闭。

业务模块只注册菜单项，不直接依赖 antd `MenuProps`，避免 UI 库类型泄漏。

### 12.2 注册项模型

```ts
type ContextMenuScope = 'project' | 'case' | 'tab' | 'param' | 'response' | 'editor';

interface ContextMenuContext<T = unknown> {
  scope: ContextMenuScope;
  target: T;
  selection?: unknown;
  readonly?: boolean;
  platform?: 'windows' | 'macos' | 'linux';
}

interface ContextMenuRegistration<T = unknown> {
  id: string;
  scope: ContextMenuScope | ContextMenuScope[];
  order?: number;
  group?: string;
  label: string | ((ctx: ContextMenuContext<T>) => string);
  icon?: React.ReactNode | ((ctx: ContextMenuContext<T>) => React.ReactNode);
  shortcut?: string;
  visible?: boolean | ((ctx: ContextMenuContext<T>) => boolean);
  disabled?: boolean | ((ctx: ContextMenuContext<T>) => boolean);
  danger?: boolean;
  separatorBefore?: boolean;
  execute: (ctx: ContextMenuContext<T>) => void | Promise<void>;
}
```

注册项的 `id` 必须稳定且全局唯一；`visible` 用于不适用场景，`disabled` 用于适用但暂不可执行场景，不能混用。

### 12.3 适合注册的菜单来源

- Project：新建 Case、导入、导出、重命名、删除、刷新。
- Case：打开、复制、重命名、移动、运行、复制地址、删除。
- Tab：关闭、关闭其他、关闭右侧、重新运行、复制请求地址。
- Param：启用/禁用、复制名称、复制值、删除、恢复默认。
- Response：复制单元格、复制行、查看详情、导出 CSV、重新请求。
- Editor：格式化、复制、粘贴、运行选中内容、插入变量。

### 12.4 生命周期和安全规则

1. 注册表在模块初始化时注册，在模块卸载时注销，避免热更新或懒加载重复注册。
2. Resolver 每次打开菜单时重新计算可见性和禁用状态，不能缓存过期的 target 或 store 快照。
3. `execute` 执行前再次校验目标是否仍存在，防止异步期间对象已被删除。
4. 菜单动作必须经过领域 action/service，不能在注册回调中直接修改深层 store 或访问 Electron。
5. 异步动作统一支持 loading、取消、错误提示和关闭菜单；失败不能静默吞掉。
6. 危险操作必须设置 `danger` 并经过 `ConfirmAction`，删除和批量操作必须明确影响数量。
7. 不允许通过右键菜单绕过只读、权限、环境和当前 tab 状态限制。

### 12.5 迁移步骤

1. 先建立 registry、resolver、renderer 和类型，不改变现有交互。
2. 将 `useCaseSidebarController` 中 project/case 菜单迁移为注册项。
3. 迁移 tab、参数、响应和编辑器菜单，删除组件内重复的 `MenuProps` 拼装。
4. 增加统一菜单快捷键、分组、分隔线和 icon 规范。
5. 最后禁止业务组件直接使用 `Dropdown trigger={['contextMenu']}`，统一改用 `ContextMenu` 组件。

### 12.6 测试和验收

- resolver：scope、排序、分组、visible、disabled、危险项和快捷键。
- renderer：右键打开、点击外部关闭、键盘导航、Escape、焦点恢复和定位边界。
- action：同步成功、异步成功、失败、取消、重复点击和目标失效。
- 集成流程：项目、Case、Tab、参数、响应五类对象均至少覆盖一个真实菜单流程。
- 验收标准：新增菜单只需新增注册项；业务组件不再拼接 antd 菜单类型；`npm run lint`、类型检查、单元测试和冒烟测试通过。

### 12.7 点击后的标准命令载荷

右键菜单点击后，框架接收的不是原始 DOM/React 事件，而是标准化的命令调用对象：

```ts
interface ContextMenuInvocation<TTarget = unknown> {
  commandId: string;
  scope: ContextMenuScope;
  target: TTarget;
  targetId?: string;
  selection?: {
    ids: string[];
    count: number;
  };
  source: 'context-menu' | 'command-palette' | 'shortcut' | 'toolbar';
  anchor?: {
    x: number;
    y: number;
  };
  modifiers?: {
    alt: boolean;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
  };
  signal: AbortSignal;
  closeMenu: () => void;
}
```

#### 各字段职责

- `commandId`：稳定的命令标识，例如 `case.run`、`tab.closeOthers`，用于日志、快捷键和埋点。
- `scope`：目标领域，避免 action 根据对象结构猜测业务类型。
- `target`：当前操作对象的最小领域快照；优先传 `id`、名称、状态等必要字段，不传整个 React props 或 store。
- `targetId`：用于异步执行前重新从 store 查询最新对象，避免使用过期快照。
- `selection`：多选对象的 id 列表和数量；批量操作不依赖 UI 组件内部选中状态。
- `source`：同一命令可以被右键菜单、命令面板、快捷键和工具栏复用。
- `anchor`：仅用于定位二级菜单、弹出面板或操作反馈，不参与领域业务判断。
- `modifiers`：保留 Ctrl/Shift 等辅助键语义，例如“在新 Tab 打开”。
- `signal`：关闭菜单、切换 Tab 或组件卸载时取消未完成的异步动作。
- `closeMenu`：动作成功、失败或需要打开 Modal 时由 action 决定何时关闭，不由业务组件自行查找菜单实例。

#### 推荐调用链

```text
用户点击菜单
  → ContextMenuRenderer 组装 Invocation
  → ContextMenuCommandBus.dispatch(invocation)
  → command handler 根据 targetId 读取最新状态
  → domain action/service 执行
  → 统一处理 loading / success / error / cancelled
  → renderer 关闭菜单并刷新相关视图
```

#### 传递边界

1. Renderer 内部可以传递函数、`AbortSignal` 和临时 UI 引用，但跨 IPC 时必须转换为纯 JSON DTO。
2. 不允许把 `MouseEvent`、React SyntheticEvent、组件 ref、完整 store、Electron API 或数据库连接放进命令载荷。
3. `target` 只作为打开菜单时的展示快照；真正执行前必须用 `targetId` 校验对象仍存在、未被删除且权限未变化。
4. 失败统一返回领域错误或 `Result`，由 command bus 转换为用户可读提示；禁止每个菜单项自行调用 `message.error` 形成重复文案。
5. 命令 handler 应保持可测试：给定同一 Invocation 和 fake store，结果应可预测；UI 只验证是否正确 dispatch。

#### 示例

```ts
await commandBus.dispatch({
  commandId: 'case.run',
  scope: 'case',
  target: { id: caseId, name: caseName, status: 'idle' },
  targetId: caseId,
  source: 'context-menu',
  selection: { ids: [caseId], count: 1 },
  signal,
  closeMenu,
});
```

这样同一个 `case.run` 可以被右键菜单、快捷键和命令面板复用，菜单本身只负责触发命令，不承载业务逻辑。

## 13. 当前前后端框架约束强度评估

### 13.1 当前已具备的强约束

- TypeScript `strict`、未使用变量/参数、未检查副作用导入和 switch fallthrough 已开启。
- ESLint 已覆盖 React、Hooks、JSX 可访问性、Promise 未处理、危险语法和 `window.electronAPI` 直访限制。
- `src/shared`、api-debug services/store、Electron 与 renderer 之间已有 import 边界规则和架构测试。
- Electron 使用最小化 `contextBridge` API，renderer 不能直接使用 `ipcRenderer`。
- IPC 按 storage、KCBP、suggest、window、import/export 分域注册，并有错误转换和取消协议。
- 单元、组件、集成、冒烟、类型检查、编码扫描、复杂度检查和构建脚本已经具备，基础门禁较完整。

### 13.2 当前仍偏弱的部分

1. TypeScript 类型主要是编译期约束，IPC、配置文件、导入文件和数据库响应的运行时 schema 校验还不够集中。
2. Electron IPC channel 名称和 payload 仍以字符串/手写类型为主，存在声明与实现漂移风险。
3. ESLint 当前主要约束 import 路径，尚未全面约束模块依赖方向、文件大小、复杂度、公共 API 和 antd 直用白名单。
4. 前端组件虽然有 primitives，但业务代码仍可直接使用 antd，视觉和交互一致性依赖 code review。
5. 取消、重试、超时、幂等和 stale response 规则尚未形成所有服务共享的运行时协议。
6. 测试命令已分层，但 CI 发布门禁、覆盖率阈值、架构违规报告和构建产物审计仍需固定化。

### 13.3 结论

当前属于“中上强度”：代码结构和编译期约束较强，足以控制单体项目继续增长；但还不是框架级强约束，尤其在运行时数据契约、IPC 类型安全、组件使用白名单和 CI 阻断方面仍有缺口。建议优先补运行时 schema、typed IPC、依赖方向检查和 CI 门禁，再扩大组件封装范围。

## 14. 过度设计复审与收敛版执行范围

### 14.1 本轮只保留的 P0 项

1. 保持现有目录边界，修复已经发现的类型、Promise 和 Electron 生命周期问题。
2. 保持当前 `contextBridge` API，不重新设计 IPC 总线；只补关键入口的参数校验和错误归一化。
3. 保持现有 Context/Reducer/store，不引入 Zustand、Redux、CQRS 或事件溯源。
4. 保留现有 primitives，优先统一 Button、Input、Modal、Drawer、Empty、Alert 的使用方式；不做全量 antd 重写。
5. 为关键链路补测试：配置读写、KCBP 请求/取消、参数建议、导入导出、规则编辑和核心工作区操作。
6. 将 lint、typecheck、测试和构建接入现有 `npm run check`，不新增复杂发布平台。

### 14.2 P1 项：只有出现重复或缺陷才做

- `FormField`、`LoadingState`、`ErrorState`、`CopyButton`、`StatusBadge` 等高频小组件。
- `ContextMenu` 轻量封装：先使用 `items + target + onAction`，只在 Project/Case 至少两处重复后再抽取。
- 纯函数上移 `shared`：必须满足至少两个消费者且没有 api-debug 专属语义。
- IPC typed channel：只覆盖新增或经常变更的 channel，不一次性重写全部历史 channel。
- 运行时校验：优先配置文件、导入文件和 IPC 外部输入；不为内部纯函数逐层增加 schema。

### 14.3 明确暂缓的方案

以下内容不再作为本计划的交付要求，除非后续有明确需求、性能问题或多人并行开发的证据：

- 全局 `ContextMenuRegistry + Resolver + CommandBus` 平台。
- 跨模块通用 `AsyncAction` 状态机、全局事件总线和命令溯源。
- 完整 `DataTable`、`SplitPane`、`ModalShell` 组件平台化改造。
- 全量 antd 禁用和一次性迁移所有表单、表格、弹窗。
- 统一 schema 代码生成、运行时协议版本系统和跨进程 DTO 自动生成。
- 全仓库文件长度、圈复杂度和依赖图硬阈值；先对新增代码和高风险目录报告模式检查。
- 覆盖率为了数字达标而补充低价值测试；只对关键路径设最低阈值。
- 插件化、热插拔注册、权限中心、多窗口状态同步和后端服务拆分。

### 14.4 简化后的优先级和验收

| 优先级 | 范围                                          | 结果                         |
| ------ | --------------------------------------------- | ---------------------------- |
| P0     | 现有 lint/typecheck、边界、错误处理、关键测试 | 降低当前缺陷和回归风险       |
| P1     | 少量高频组件、轻量 ContextMenu、外部输入校验  | 减少明确重复，不改变架构形态 |
| P2     | 复杂组件平台化、全量 typed IPC、统一命令系统  | 仅在真实需求出现后评估       |

本轮完成标准调整为：`npm run lint`、`npm run typecheck`、`npm run test:api`、关键集成/冒烟测试和 `npx vite build` 通过；不要求一次完成所有 P1/P2 抽象，不以新增目录数量、抽象层数量或覆盖率数字作为完成标准。

### 14.5 复审原则

每新增一个抽象，必须回答三个问题：

1. 当前是否已有两个以上真实消费者？
2. 抽象是否减少了重复行为，而不只是减少 JSX 行数？
3. 删除该抽象是否会让业务代码更清晰？

任一问题答案为“否”，保留局部实现，等待证据后再抽取。
