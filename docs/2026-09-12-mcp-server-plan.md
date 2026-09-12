# MCP 服务器规划（平台能力开放）

> 状态：**待评审**。本文只做规划，不含实现。
> 前置决策：**移除内置 Agent**；**能力开放是平台层共有设施，不属于任何子模块**，各子模块注册自己的接口。

## 1. 决策与目标

### 决策

1. **移除内置 Agent**：不再自持模型、网关凭据与 Agent 运行时。
2. **平台层提供能力开放设施**：注册表 + MCP 服务器由平台拥有，与任何子模块无关。
3. **各子模块注册自己的接口**：模块在自身契约里声明能力（描述 + 执行），平台负责聚合、暴露、鉴权与审计。

### 为什么平台化

- 若把暴露能力挂在某个模块里，第二个模块要开放能力时就得复制或反向依赖，最终变成模块互相知道。
- 平台化的目标是一个不变量：**「加一个模块 = 该模块注册自己的接口，平台零改动」**。
- 模型与凭据交给 MCP 客户端持有后，应用侧删除 `safeStorage` 密钥管理、网关配置 UI、sidecar 进程管理——净减复杂度。

### 目标形态

```
外部 Agent（Claude / Cursor / pi …）
   │  MCP
   ▼
平台层：MCP 服务器 + 能力注册表        ← 与模块无关
   │  按模块路由
   ▼
子模块能力提供方（api-debug / interface-automation / 未来模块…）
```

## 2. 关键前提（已核实的技术事实）

| 事实                                                                                                                                                                          | 影响                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 场景执行是 `new Worker(...)`，**跑在渲染进程**                                                                                                                                | MCP 服务器**必须由运行中的 app 提供**；独立进程直接读写 `golden.db` 跑不了场景                                    |
| IPC 经 `contextBridge.exposeInMainWorld` 挂在渲染层 window，主进程侧有 `assertTrustedRenderer` 校验来源                                                                       | IPC 是**进程内私有通道**，外部进程够不着，不能直接当"开放接口"                                                    |
| 模块经 `createLazyAppModule({ load: () => import(...) })` **懒加载**                                                                                                          | 模块加载前拿不到能力描述；而 `tools/list` 必须完整 → **描述必须静态提前，执行才可懒加载**                         |
| eslint 分层是白名单制（`partialMatch: false` + `default: 'disallow'`），但**未登记的层不受约束**（已用探针实测：`src/platform/capabilities` 反向 import 模块，lint `exit=0`） | 新增 `src/platform/capabilities` **必须显式登记，否则该层等于裸奔**；登记是「为了拿到约束」，不是「不登记会报错」 |
| 渲染层 store 是内存态 + 防抖落库                                                                                                                                              | 外部写入必须经 app，否则界面与数据分叉（**单一写入者**）                                                          |
| `electron/**` 只可依赖 `src/shared`、`src/types`、`src/constants`                                                                                                             | 主进程**无法** import 模块能力描述 → 描述必须由渲染层在启动时上报                                                 |

## 3. 平台契约：模块如何注册

### 3.1 模块侧（注册方）

模块新增一份**静态描述**与一份**执行实现**，两者分开是为了兼容懒加载：

```text
src/modules/<module>/
  capabilities/
    manifest.ts     ← 静态描述：name / description / inputSchema（随组合根提前加载）
    handlers.ts     ← 执行实现：name → (args) => Promise<unknown>（随模块懒加载）
```

模块在自身定义里声明注册：

```ts
// 模块 index 导出
export const apiDebugModule: AppModuleDefinition = {
  id: 'api-debug',
  // …既有字段
  capabilities: {
    manifest: apiDebugCapabilityManifest, // 静态，可被组合根提前收集
    loadHandlers: () => import('./capabilities/handlers'), // 懒加载
  },
};
```

未声明 `capabilities` 的模块 = 不开放任何能力，平台不感知其存在。

### 3.2 平台侧（设施方）

```text
src/platform/capabilities/
  types.ts        能力契约：CapabilityDescriptor / CapabilityHandler / 注册项
  registry.ts     模块无关的注册表：注册、校验、按模块聚合、按名路由
  syncToMain.ts   把清单与调用结果经 IPC 与主进程同步
```

**核心不变量（需测试守卫）**：

- `src/platform/capabilities/**` **不得 import 任何 `src/modules/**`\*\*——模块由组合根注入，平台不感知具体模块。
- 能力名全局唯一；重复注册直接报错（启动期暴露，而不是调用期）。
- 描述与实现的键集合必须一致：声明了却没实现 → 注册失败；实现了却没声明 → 注册失败。

> ⚠️ 这第一条**必须靠登记才能生效**：实测未登记的新层不受 `default: 'disallow'` 约束，
> 所以 Phase 2 要在 `boundaries/elements` 登记 `src/platform/capabilities`，
> 否则这条不变量只是口头约定（仅靠 `boundaries.test.ts` 文本扫描兵底）。

### 3.3 组合根（唯一的知情者）

`src/platform/registry/app-modules.tsx` 已经是"可依赖任意层"的组合根，由它把模块描述喂给注册表：

```ts
// 组合根：提前 import 各模块的 manifest（只加载静态描述，不加载模块实现）
registerModuleCapabilities(
  apiDebugModuleShell,
  () => import('../../modules/api-debug/capabilities/handlers'),
);
```

这样：**平台层模块无关**、**模块自己声明**、**只有组合根知道有哪些模块**——与现有 `APP_MODULES` 的组织方式一致。

## 4. 范围：删除 / 保留 / 新增

### 4.1 删除（内置 Agent 运行时与 UI）

来自提交 `08a594b`、`c7e94f8`、`05c1b1f`：

**sidecar 与引擎**

- `agent/` 整目录（`main.mjs`、`runs.mjs`、`engine.mjs`、`gateway.mjs`、`prompt.mjs`、`tools.mjs`、`protocol.mjs`、`smoke.mjs`、`package.json`）

**主进程**

- `electron/services/agent/` 全部（含 `agentService`、`agentProcess`、`agentClient`、`agentGateway`、`agentPaths` 及测试）
- `electron/ipc/agent.ts`；`electron/ipc/register.ts`、`register.test.ts` 中的登记
- `configRepository.ts` 的 `agentGateway` 读写
- `preload.ts` 的 `agent` 块

**共享与门面**

- `src/shared/agent/protocol.ts`、`src/shared/agent/gateway.ts`
- `src/shared/electron/api.ts` 的 `AgentApi` / `AgentEventPayload`
- `src/runtime/agentFacade.ts`

**渲染层 UI**

- `AutomationAgentPanel/Draft/Settings.tsx` 及面板测试
- `hooks/useAgentEnvironments|useAgentRunControl|useAgentToolDispatch|useAutomationAgent.ts`
- `store/agentStore.ts`
- `utils/scriptDiff.ts` 及测试（仅服务面板 diff，面板去掉即成死代码）
- `AutomationLayout.tsx` 的右侧栏嵌套（回退为「左栏 + 主区」）
- `automation-agent.css` 与 `src/index.css` 的对应 `@import`

**构建与文档**

- `package.json`：`extraResources` 的 `agent` 项、`prepare:agent` 脚本、`scripts/prepare-agent.mjs`
- `eslint.config.js`：`agent` 的 ignores 项
- `AGENTS.md`：`agent/` 边界例外段
- `docs/agent-integration.md` → 移入 `docs/archive/` 并在归档清单登记

### 4.2 保留并改造（**关键**）

> 这一层是 MCP 要暴露的实现，删掉就要重写。

| 保留                                                          | 改造为                                                                                                                                    |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `interface-automation/services/agentTools.ts` 的 6 个工具实现 | 该模块的 `capabilities/handlers.ts`                                                                                                       |
| `useAutomationRun.ts` 的 `sensitiveInputNames`                | 保留（已成通用工具函数）                                                                                                                  |
| `automationStore.createScenario`                              | 保留（`write_scenario` 需要）                                                                                                             |
| **`utils/scriptEditorTheme.ts`**                              | **原样保留**：同时服务 `api-debug/ScriptEditor.tsx` 与 `interface-automation/AutomationScriptEditor.tsx`，**与 Agent 无关**，不在删除范围 |
| 「主进程 → 渲染层执行 → 回填」往返链路                        | 泛化为 `capabilities:invoke` / `capabilities:result`                                                                                      |

### 4.3 新增

- `src/platform/capabilities/`（注册表与契约，模块无关）
- `src/shared/capabilities/types.ts`（主进程与渲染层共用的描述类型）
- `electron/mcp/`（MCP 服务器：Streamable HTTP、会话、错误映射）
- `electron/services/capabilities/`（主进程侧调用渲染层，含超时/取消/审计）
- `scripts/mcp-smoke.mjs`、`scripts/mcp-stdio.mjs`
- `eslint.config.js` + `src/architecture/boundaries.test.ts` 的平台层登记

## 5. 目标架构

```
MCP 客户端（外部 Agent）
   │  ① stdio（多数桌面端）            ② Streamable HTTP
   ▼
scripts/mcp-stdio.mjs  ──转发──┐
                              ▼
Electron 主进程  http://127.0.0.1:<随机端口>/mcp  （Bearer token）
   ├─ mcp/server.ts        JSON-RPC：initialize / tools/list / tools/call / ping
   ├─ mcp/session.ts       会话与并发
   ├─ capabilities/        清单缓存 + 调用路由 + 审计
   └─ 只认「能力名 → 模块」映射，不解释业务语义
          │  IPC: capabilities:register / capabilities:invoke / capabilities:result
          ▼
   渲染层 平台注册表（src/platform/capabilities）
          │  按模块路由
          ▼
   模块处理器（src/modules/<mod>/capabilities/handlers.ts）
          └─ 复用各模块既有 store / 运行器（唯一权威状态）
```

要点：

- `tools/list` **不经过模块实现**（描述静态提前，由组合根注入注册表并同步到主进程），因此与用户是否打开过某个模块无关。
- `tools/call` 才下沉，必要时按需加载模块实现。
- 主进程只做协议、鉴权、审计与转发。

## 6. MCP 协议设计

### 6.1 传输

| 传输                | 用途                  | 说明                                                                               |
| ------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| **Streamable HTTP** | app 内建，主通道      | 单一端点 `/mcp`；`POST` 承载 JSON-RPC，响应为 JSON 或 SSE；会话经 `Mcp-Session-Id` |
| **stdio**           | 只支持 stdio 的客户端 | `scripts/mcp-stdio.mjs` 瘦代理，转发到上面的 HTTP 端点                             |

### 6.2 端点发现（回答"他们怎么知道"）

客户端无法猜端口与 token，因此 app 监听成功后写运行时描述文件：

```json
// <userData>/mcp-endpoint.json
{
  "url": "http://127.0.0.1:48123/mcp",
  "credential": "<每次启动轮换>",
  "pid": 12345,
  "startedAt": 1757600000000
}
```

- 仅 `127.0.0.1`；token 每次启动轮换，退出时删除文件
- 文件位于用户 profile 目录（本身即用户隔离），不写日志
- stdio shim 读该文件定位 app；**app 未运行**时返回明确错误（不自动拉起 app）

### 6.3 实现的方法子集

本期只声明 `tools` 能力：

| 方法                        | 说明                                                                |
| --------------------------- | ------------------------------------------------------------------- |
| `initialize`                | 协商协议版本，声明 `capabilities: { tools: { listChanged: true } }` |
| `notifications/initialized` | 客户端确认                                                          |
| `tools/list`                | 由主进程缓存的清单生成；注册表变更时推送                            |
| `tools/call`                | 路由到对应模块执行                                                  |
| `ping`                      | 存活探测                                                            |

错误映射：协议错误用 JSON-RPC error；**工具自身失败**用 `result.isError = true`（MCP 语义），不要把工具失败混进协议错误。

> `listChanged: true`：模块懒加载完成后清单可能补全，此时推送 `notifications/tools/list_changed`。若描述完全静态，也可声明 `false`——**待定决策**，见 §9。

### 6.4 描述格式迁移

现有 `agent/tools.mjs` 已是 `{ name, description, parameters(JSON Schema) }`，与 MCP 的 `{ name, description, inputSchema }` **只差字段改名**。迁移进各模块 `capabilities/manifest.ts` 后在注册表里统一规范化，主进程直接序列化输出。

## 7. 能力集规划

### 7.1 Phase A：interface-automation 迁移（现有 6 个）

**已定：统一加域前缀**（格式 `<模块命名空间>_<能力名>`，由平台注册表强制校验）：

| 工具                           | 说明           |
| ------------------------------ | -------------- |
| `automation_list_scenarios`    | 列出场景       |
| `automation_read_scenario`     | 读取脚本       |
| `automation_write_scenario`    | 写入脚本       |
| `automation_list_environments` | 列出环境       |
| `automation_run_scenario`      | 运行并返回报告 |
| `automation_read_report`       | 读取最近报告   |

理由：现在无外部使用者，改名零成本；模块增加后（api-debug 用 `apidebug_*`）不会冲突。

### 7.2 Phase B：api-debug 注册（对应最初诉求）

"写用例 / 新增接口 / 调用 / 看结果"属于 api-debug 模块，需新建：

| 工具            | 说明                           |
| --------------- | ------------------------------ |
| `list_projects` | 列出项目                       |
| `list_cases`    | 列出用例（可按项目/目录过滤）  |
| `read_case`     | 读取用例地址、协议、参数       |
| `create_case`   | 新增用例（"新增接口"）         |
| `update_case`   | 修改用例                       |
| **`call_case`** | **直接调用并返回响应（核心）** |
| `read_history`  | 读取请求历史                   |

`call_case` 工作量最大：参数解析、公共参数合并、环境解析。主进程 `rpc:call` 可复用，但意图级封装必须做。

### 7.3 明确不暴露

| 不暴露                               | 原因                                           |
| ------------------------------------ | ---------------------------------------------- |
| `automation:sqlExecute` 等机制级 IPC | 等于给 agent 一把没有护栏的枪，绕过 SQL 白名单 |
| `rpc:call` 原始报文调用              | 无校验、无策略                                 |
| `window:*`、`capabilities:result` 等 | 与能力无关，只会污染工具列表                   |
| 主题/颜色写入                        | 改用户界面，价值低、干扰高。如需，只做只读     |
| UI 自动化（点按钮）                  | 极脆，成本高于收益                             |

## 8. 安全与治理

- **网络**：仅绑 `127.0.0.1`；token 每次启动轮换；不接受非本机连接。
- **策略不下放**：生产环境禁写、`validateAutomationWriteSql`、报告行数限制**继续在模块运行器/主进程生效**，与调用方是谁无关。
- **单一写入者**：外部写入经 app → store → 落库，避免与界面分叉。
- **审计**：记录 `{ 时间, 模块, 工具, 参数摘要, 结果状态, 耗时 }`；敏感输入沿用既有遮罩逻辑，不落明文。
- **可见性**：外部调用总开关与审计入口位于平台设置的 MCP 分区，详见下文。
- **破坏性操作**：不做逐次人工确认（会破坏 MCP 自动化语义），改为**审计 + 可回滚**（`write_scenario` 返回旧脚本）。

### 设置入口（已定）

外部调用开关放在**平台设置**里（`PLATFORM_SETTINGS_SECTIONS`）——能力开放是平台设施，不属于任何模块：

| 项       | 内容                                                                                    |
| -------- | --------------------------------------------------------------------------------------- |
| 设置分区 | `key: 'mcp'`、`label: 'MCP'`、`category: 'core'`（与「KCBP」同级）、`placement: 'main'` |
| 总开关   | 「允许外部调用」——**默认关闭**，由用户显式开启；开启动作本身就是一次显式授权            |
| 只读信息 | 当前端点 URL、`tools/list` 工具数量、最近一次调用时间                                   |
| 审计入口 | 最近的工具调用记录（模块 / 工具 / 结果状态 / 耗时）                                     |

仍待定：是否要求 app 在前台。**建议不要求**，但 app 未运行时明确报错。

## 9. 执行顺序与阶段

### 采用绞杀者模式（strangler）

**先建平台与 MCP，最后删内置 Agent。** 每一步都保持可运行，避免出现"面板已删、MCP 未上线"的空窗期；也让并行开发不被打断。

```text
① 平台注册表 + 能力契约   → agentTools 迁入；面板改走注册表，照常可用
② 泛化调用通道 + 分层登记
③ MCP 服务器              → 外部 Agent 此时已可用
④ stdio shim + 真实客户端验证
⑤ 授权与审计 + 设置分区
⑥ 移除内置 Agent          → 此时已无风险（§4.1）
⑦ api-debug 能力集
```

代价：`agent/` 与 MCP 在 ③–⑥ 之间功能重叠，属**有意保留的临时冗余**。

### 阶段与验收

| 阶段 | 内容                                                                                | 估时   | 验收                                                                                                               |
| ---- | ----------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| 1    | 平台注册表 + 模块契约扩展 + 组合根注入；`agentTools` 迁入为模块能力；面板改走注册表 | 1.5 天 | 注册表单测通过；**不变量测试**：`src/platform/capabilities/**` 无 `@/modules/**` 依赖；描述/实现键集合不一致时报错 |
| 2a   | **已完成**：能力上下文工厂（不依赖 React）+ 按需 hydrate + `dispatch`               | 0.5 天 | 外部调用不再需要模块界面挂载；空工作区问题有回归测试                                                               |
| 2b   | 泛化调用通道（`capabilities:invoke` / `result`）+ 超时与取消                        | 0.5 天 | 主进程能调用渲染层能力；超时与取消有测试                                                                           |
| 2c   | eslint 分层登记（**须先拆分 interface-automation 的 exclusive 元素**，见下）        | 0.5 天 | 探针文件（platform → module）被 lint 拦住                                                                          |
| 3    | MCP 服务器（Streamable HTTP）                                                       | 1 天   | `node scripts/mcp-smoke.mjs`：`initialize` → `tools/list` 含预期工具 → `tools/call` 返回 `isError=false`           |
| 4    | stdio shim + 真实客户端接入                                                         | 0.5 天 | 在 pi / Claude / Cursor 任一客户端中看到工具列表并成功调用一次                                                     |
| 5    | 授权与审计 + **平台设置里的 MCP 分区**（总开关、端点信息、审计入口）                | 1 天   | 总开关关闭时 `tools/call` 被拒；审计可查且无敏感明文                                                               |
| 6    | **移除内置 Agent**（§4.1）——此时 MCP 已验证可用                                     | 0.5 天 | `npm run check` 全绿；`src`/`electron` 搜不到 `agentRuntime`、`AutomationAgentPanel`、`AgentApi`                   |
| 7    | api-debug 注册（Phase B 能力集）                                                    | 2–3 天 | 每个工具有单测；`call_case` 返回真实响应                                                                           |

### 已核实：eslint 分层登记的真实成本（2026-09-12 实测）

规划原以为"把 `src/platform/capabilities` 登记进 `boundaries/elements` 就能拦住 platform → module"。实测**不成立**，有两个机制：

1. **目标未登记就没有可判定的对象。** 只登记 `src/platform/capabilities` 时，探针文件反向 import 模块，eslint **exit 0**——因为 `src/modules/interface-automation` 没有任何元素类型，规则无从判定。要让禁令生效，**目标侧也必须被登记**。
2. **一旦源文件被赋予元素类型，它的全部 import 都要有策略。** 因此给 modules 加兜底类型后，interface-automation 的 **93 个 import 立刻全部违规**（默认 disallow）；补一条宽松的 `module` 策略后降到 21 个，剩余错误来自兜底类型把 api-debug 也标成了 `module`，与它既有的 `mod-*` 子元素冲突——正是原注释警告的"父元素污染子元素"。

**结论**：eslint 登记不是"加两行"，而是要先**像 api-debug 那样把 interface-automation 拆成 exclusive 子元素并定义其依赖白名单**。那是一次独立的、值得做的分层改造（顺带给 interface-automation 补上它目前完全没有的分层约束），不应塞进 MCP 迁移里。

**当前状态**：`src/platform/capabilities` 的模块无关性由 `src/architecture/boundaries.test.ts` 的分区守卫（解析别名与相对路径），eslint 登记留作 2c。

每阶段一个提交。

既有门禁全程保持：`typecheck`、`lint`、`check:complexity`（24/24 基线）、`style:check`、`color:budget`、`ipc:check`、`format:check`、全量 `test`。

## 10. 风险与取舍

| 风险                  | 等级 | 应对                                                                                                                         |
| --------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| **与并行开发冲突**    | 高   | 你正在改 `AutomationAgentPanel.tsx` 等文件；删除会覆盖这些改动。**执行 Phase 0 前需确认可丢弃**                              |
| 平台层被模块反向污染  | 中   | 用不变量测试守卫：`platform/capabilities` 不得依赖 `modules/**`                                                              |
| 懒加载导致清单不全    | 中   | 描述静态提前（组合根注入），执行懒加载；必要时用 `list_changed` 通知                                                         |
| eslint 分层登记遗漏   | 中   | 实测未登记=无约束；Phase 2 显式登记 `globalElements` + `dependencyPolicies` + `boundaries.test.ts`，并用探针验证关卡真的生效 |
| 外部 Agent 误改工作区 | 中   | 总开关默认关 + 审计 + 可回滚                                                                                                 |
| MCP 规范演进          | 中   | 只实现 `tools` 子集，边界小；协议版本写入 `initialize` 响应                                                                  |

### 取舍说明

- **不做 OAuth**：本机回环 + 用户专属目录 token 已与风险相称，OAuth 属过度设计。
- **不做远程暴露**：仅 `127.0.0.1`；如需局域网/远程，另行设计（TLS、鉴权、多用户）。
- **不保留 sidecar 协议**：MCP 取代它；保留两套只会增加维护面。

## 11. 明确不做

1. 把能力开放挂在任一子模块里（必须是平台共有设施，模块只注册自己的接口）。
2. UI 自动化（让 agent 点按钮）。
3. 主题/颜色写入。
4. 暴露机制级 IPC（SQL 执行、原始报文调用）。
5. 独立进程读写 `golden.db` 的"无 app"版本（跑不了场景且会造成状态分叉）。
6. 自行维护模型/凭据/网关配置。

## 相关文档

- [独立接口自动化](./interface-automation.md)
- [接口调试](./request-and-response.md)
- 将废弃：[接口自动化 Agent 集成](./agent-integration.md)（Phase 0 执行后移入 `archive/`）
