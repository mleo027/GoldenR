# 接口自动化 Agent 集成

「接口自动化」的场景脚本受 DSL 约束，但对业务人员仍有 JavaScript 门槛。本方案在模块内引入一个可对话的 Agent：业务人员用自然语言描述意图，Agent 生成／修改脚本、运行场景，并依据报告自修复。

## 设计目标

1. **业务人员不写 JavaScript**：以可视化步骤编排为主路径，AI 作为复杂逻辑与失败诊断的补充。
2. **Agent 部分可整体替换**：Pi 生态迭代快，升级时必须只替换 `agent/` 目录，不改动主仓库构建产物。
3. **数据主权留在主进程**：Agent 不直接访问 SQLite、文件系统或网络，只能申请白名单能力。
4. **凭据集中管理**：模型网关地址与密钥由管理员配置，存于主进程 `safeStorage`，业务人员零配置。

## 架构

```text
Renderer（src/modules/interface-automation）
  └─ Agent 侧边栏（自建 React 面板）
        │  IPC: agent:send / agent:cancel / agent:event(stream)
        ▼
Electron 主进程 —— 稳定层（本仓库维护）
  ├─ ipc/agent.ts                channel 校验 + 事件转发
  ├─ services/agent/
  │    ├─ agentProcess.ts        spawn / 版本握手 / 重启 / 超时
  │    ├─ agentClient.ts         HTTP + SSE 客户端
  │    └─ agentHost.ts           工具白名单的宿主实现（读写场景、跑场景、读报告）
  └─ src/shared/agent/protocol.ts   ★ 冻结契约 v1（唯一耦合面）
        │  HTTP + SSE（127.0.0.1 随机端口，Bearer token）
        ▼
resources/agent/ —— 可整体替换层（独立维护）
  ├─ main.mjs        协议层（随契约稳定）
  ├─ engine.mjs      ★ 真正接入 Pi 时的替换点
  ├─ runs.mjs        运行状态与工具回调
  └─ package.json    自有依赖树（@earendil-works/pi-*），不进主仓库依赖
```

Agent 以独立进程运行在**打包自带的 Node**（`resources/node`）上，避免 Electron ABI 问题，也避免把 Pi 的依赖树打进 `dist-electron/main.js`。

## 冻结契约 v1

契约定义在 [`src/shared/agent/protocol.ts`](../src/shared/agent/protocol.ts)。sidecar 侧对应常量为 `agent/protocol.mjs`，两者的一致性由 `electron/services/agent/agentContract.test.ts` 在每次测试时校验。

### 握手

sidecar 启动后向 stdout 写入单行 JSON：

```json
{ "type": "ready", "protocolVersion": 1, "agentVersion": "0.0.0-stub", "port": 41273 }
```

主进程据此获得端口。`protocolVersion` 与 `AGENT_PROTOCOL_VERSION` 不一致时，主进程**拒绝启动**并明确报错，不静默降级。

### 端点

所有请求需携带 `Authorization: Bearer <token>`，token 由主进程生成并经环境变量注入。

| 方法   | 路径                        | 说明                               |
| ------ | --------------------------- | ---------------------------------- |
| `GET`  | `/hello`                    | 返回协议版本、Agent 版本与能力列表 |
| `POST` | `/runs`                     | 建运行，返回 `{ runId }`           |
| `GET`  | `/runs/:runId/events`       | SSE 事件流                         |
| `POST` | `/runs/:runId/tool-results` | 回填宿主对工具调用的执行结果       |
| `POST` | `/runs/:runId/cancel`       | 取消运行                           |

### 事件

`run.started`、`message.delta`、`tool.call`、`script.proposed`、`run.finished`、`run.error`。
事件先写缓冲再广播，因此客户端晚连接也能补齐历史。

### 工具白名单

Agent **没有**文件系统、网络或数据库工具，只能在 `tool.call` 中请求以下能力，由主进程执行：

| 工具                | 用途                           |
| ------------------- | ------------------------------ |
| `list_scenarios`    | 列出可选场景                   |
| `read_scenario`     | 读取既有脚本                   |
| `write_scenario`    | 写入脚本（保留旧版本以便回滚） |
| `list_environments` | 列出 KCXP 环境                 |
| `run_scenario`      | 运行场景并返回报告             |
| `read_report`       | 读取最近报告                   |

契约同时提供 `AGENT_CAPABILITIES` 常量，Agent 用它自报能力；宿主据此决定放行范围。

## 可替换性：升级 SOP

升级 Pi 或替换 Agent 实现时：

1. 替换整个 `agent/` 目录（含其 `package.json` 与依赖）。
2. 运行 `npm run prepare:agent` 安装 sidecar 自有依赖。
3. 运行 `node agent/smoke.mjs` 做 sidecar 自检。
4. 运行 `npx vitest run electron/services/agent/agentContract.test.ts` 校验契约一致性。

`agent/` 刻意**不受主仓库 lint、分层与复杂度棘轮约束**（见 `eslint.config.js` 的 `ignores`），以保证它可以独立替换。它与宿主的一致性由上面的契约测试守卫，而不是由主仓库的代码规范守卫。

契约发生不兼容变更时，必须同步递增 `AGENT_PROTOCOL_VERSION` 与 `agent/protocol.mjs` 的 `PROTOCOL_VERSION`。

## 安全边界

- **凭据**：模型网关地址与密钥存于主进程 `safeStorage`，不进渲染进程、不进日志、不进版本库。
- **能力最小化**：Agent 只持有工具白名单，写库与执行仍由主进程按现有策略裁决。
- **SQL 策略不变**：`write_scenario` 与 `run_scenario` 触发的写库仍走 `validateAutomationWriteSql`；生产环境禁写继续生效。
- **审计**：Agent 每次工具调用与脚本写入记录来源为 Agent，便于追溯。

### 自动写入与自修复的护栏

在 Agent 可自动写入并依报告自修复的前提下，必须同时具备：

- 写入保留旧脚本版本，支持一键回滚；
- 单次会话的运行次数、总时长与写入次数上限；
- 连续自修复失败后停止并把控制权交还用户，而不是无限重试；
- 全量审计日志。

## 打包

`agent/` 经 `extraResources` 打包到 `resources/agent`，与既有 `electron/adapter`、`resources/node` 同一机制。开发模式下主进程从仓库根目录解析 `agent/main.mjs`；打包后从 `process.resourcesPath/agent/` 解析。

## 实施阶段

| 阶段 | 内容                                                         | 状态   |
| ---- | ------------------------------------------------------------ | ------ |
| 1    | 冻结契约、sidecar 骨架、契约守卫测试、打包接线               | 已完成 |
| 2    | 工具白名单的主进程实现（`agentHost`）与 IPC 通道             | 进行中 |
| 3    | `agent/engine.mjs` 接入 Pi 与公司网关                        | 待开始 |
| 4    | 侧边栏 React 面板（消息流、工具卡片、脚本 diff、运行与回滚） | 待开始 |
| 5    | 可视化步骤编排器（主路径）                                   | 待开始 |

> 侧边栏交互参考 `@earendil-works/pi-web-ui`（官方 scope，MIT）的信息架构，但**不作为依赖引入**：该包停在 0.75.3，落后当前 pi 10 个 minor，且以浏览器侧 IndexedDB 存密钥、依赖非 registry 的 `xlsx` tarball，与本方案的凭据与供应链约束冲突。

## 相关文档

- [独立接口自动化](./interface-automation.md)
- [设置](./settings.md)
