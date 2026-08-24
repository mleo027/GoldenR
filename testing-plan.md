# GoldenAPI 接口自动化 Case 模块迁移方案

## Summary

新增与“API 调试”同级的“接口自动化”平台模块，通过 ActivityBar 独立图标进入。参考 `aicli case` 的领域能力，但采用 GoldenAPI 自己的配置命名和交互模型：

- 组织结构：项目 → 用例 → 步骤。
- 首版步骤：KCBP、SQL、Mock。
- 支持项目变量、前序步骤输出引用、断言、失败跳过、批量运行。
- 用例内步骤失败后停止当前用例，其他用例继续执行。
- 独立持久化，并支持 GoldenAPI JSON 与 aicli JSON 导入。
- 导入 aicli 时发现不支持的步骤或字段，拒绝整个文件并展示诊断。
- 模块内展示步骤级结果、断言详情、耗时和运行历史。
- API 调试中的现有接口可直接生成自动化步骤。

## Implementation Changes

### 1. 新增平台模块与入口

- 新增 `src/modules/interface-automation` 模块，定义独立 module id、ActivityBar 图标、中文名称和命令面板关键词。
- 在 `src/platform/registry/app-modules.tsx` 注册懒加载模块，排序与 API 调试相邻。
- 使用现有 `AppModuleDefinition`、`PlatformModuleLayout`、Breadcrumb、TitleBarSlot 和 StatusBar 机制，不改变平台壳边界。
- 模块布局采用左侧项目/用例树、中央步骤编辑器、右侧或下方运行结果面板。

### 2. 领域模型与配置命名

内部模型使用 GoldenAPI 语义化字段，不直接暴露 aicli 字段：

- `AutomationProject`：`id`、`name`、`variables`、`cases`。
- `AutomationCase`：`id`、`name`、`description`、`tags`、`steps`、`enabled`。
- `AutomationStep`：`id`、`name`、`type`、`request`、`sql`、`mock`、`assertions`、`extract`、`enabled`。
- `StepType`：`kcbp | sql | mock`。
- `Assertion`：覆盖退出码、文本、字段、行数、相等/不等/数值比较等 aicli 已有断言语义。
- `RunResult`、`CaseRunResult`、`StepRunResult`：保存状态、耗时、输入快照、实际证据、断言错误和跳过原因。

新增纯逻辑 domain 层，负责：

- 配置归一化、默认值和稳定 id。
- 项目/用例/步骤校验及重复 id 检查。
- 变量模板解析：项目变量、系统变量预留接口、前序步骤输出路径。
- aicli JSON → GoldenAPI 模型转换。
- GoldenAPI 模型 → 导出 JSON 转换。
- 运行结果汇总、下一步状态和历史摘要。

### 3. 执行与适配器

新增 automation service 层，保持 UI 不直接调用 Electron/KCBP：

- `kcbp` 适配器复用 API 调试现有请求映射和 `kcbp.call` IPC。
- `sql` 适配器复用数据库查询能力，返回结构化 `resultSets`、行数、受影响行数和文本证据。
- `mock` 适配器支持固定文本、JSON 数据、退出码和延迟，供离线验证。
- 执行上下文保存项目变量、步骤输出和当前用例状态。
- 默认执行策略：当前用例任一步骤失败后跳过剩余步骤；批量执行继续下一个启用用例。
- 支持单步运行、单用例运行、项目运行，以及取消当前 KCBP 调用。
- 对不支持的步骤类型、变量未解析、请求为空、SQL 为空等情况返回结构化错误，不产生未声明调用。

### 4. UI 与 API 调试联动

新增模块界面能力：

- 项目树：创建、重命名、复制、删除、启停项目。
- 用例树：创建、重命名、复制、删除、标签和启用状态。
- 步骤编辑器：选择步骤类型并编辑 KCBP 请求、SQL、Mock 响应、变量提取和断言。
- 运行工具栏：运行当前步骤、当前用例、项目全部用例、停止运行。
- 结果面板：总览、用例状态、步骤状态、断言明细、实际证据、耗时和错误。
- 历史面板：保留最近运行记录，可重新查看结果。
- API 调试模块增加“生成自动化步骤”操作，将当前接口的地址、参数、脚本/运行输入转换为一个 KCBP 自动化步骤；生成后跳转或复制到指定自动化项目/用例。
- 不直接共享 API 调试的 Tab 实体，采用一次性转换，避免两个模块的生命周期和删除规则互相耦合。

### 5. 持久化、导入导出与 Electron 接口

- 新增独立配置文件，例如 `automation-cases.json`，保存项目、用例和变量。
- 扩展配置文件类型与存储白名单，使其可通过现有 config storage API 自动保存和 flush。
- 使用现有 JSON 打开能力；补充 JSON 保存能力或通用 JSON 导出 IPC，并在 preload 类型中公开最小接口。
- 导入流程：
  1. 读取 JSON；
  2. 识别 GoldenAPI 格式或 aicli 格式；
  3. 转换并完整校验；
  4. 任意不支持字段/步骤/结构错误时拒绝整个文件，显示路径级诊断；
  5. 校验通过后以新项目或追加方式导入。
- 导出流程默认输出 GoldenAPI JSON，并提供 aicli 兼容格式选项；不支持的内部能力在导出前阻止并提示。
- 不修改 `D:\KSPB\own_tool\GoldenAPI`，所有变更限制在当前仓库。

## Test Plan

- Domain 单元测试：
  - 默认值、稳定 id、重复项目/用例/步骤 id。
  - KCBP/SQL/Mock 配置校验。
  - 项目变量和步骤输出引用，包括未解析变量。
  - aicli 样例导入、字段转换和不支持项整体拒绝。
  - 断言比较、行数统计、结果汇总和失败跳过策略。
- 执行服务测试：
  - Mock 成功/失败、断言失败、步骤跳过。
  - KCBP/SQL 适配器调用参数和结构化证据。
  - 用例失败后继续下一用例。
  - 取消调用和适配器不可用错误。
- Store/持久化测试：
  - 自动保存、恢复、flush。
  - 导入后项目合并、覆盖和撤销边界。
- React 集成测试：
  - ActivityBar 模块切换。
  - 项目/用例/步骤 CRUD。
  - 单步、单用例、批量运行及结果展示。
  - API 调试接口生成自动化步骤。
- Electron IPC 测试：
  - 新配置文件读写。
  - JSON 导入/导出通道参数校验和错误传播。
- 验收命令：
  - `npm run typecheck`
  - `npm run test:api`
  - `npx vite build`

## Assumptions

- 首版不迁移 aicli 的 filesystem 步骤、HTML 报告、coverage/gate 命令和 CLI 命令注册体系。
- 首版变量使用项目级明文配置；敏感变量加密和系统变量扩展作为后续能力。
- SQL 步骤复用 GoldenAPI 已有数据库连接配置，不新增第二套数据库配置。
- aicli 导入以其现有 `cases[]/steps[]/assert` 结构为兼容输入，但内部持久化始终使用 GoldenAPI 新模型。
- API 调试联动采用“生成副本”，不建立跨模块实时引用关系。
