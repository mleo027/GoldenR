# Golden API Agent Guide

本仓库是独立的 Golden API 接口调试桌面应用（Electron + React 18 + TypeScript + Vite），
只保留 `api-debug` 模块及运行 KCBP/KGBP 调用所需的 Electron/shared 代码。
不要把原 GoldenAPI 仓库的其他模块搬回来（TCD、TCI、AutoQC、TraceCode、知识库、
SQL Debugger、Agent Server 等）。

面向 agent 的详细规则拆分如下，本文件只做**命令与硬约束速查**：

- [`agents/rules/development.md`](agents/rules/development.md) — 开发、TypeScript/React、IPC、UI、测试规范
- [`agents/rules/architecture.md`](agents/rules/architecture.md) — 模块边界、ESLint 分层强制、SQLite、数据模型、生命周期
- [`agents/rules/commit.md`](agents/rules/commit.md) — 提交前检查、提交信息、hooks、禁止提交项

> 本文件与 rules 冲突时，以 rules 中的细则为准；架构改动前必须先读 `architecture.md`。

## 范围与安全（硬约束）

- 所有改动必须留在**当前仓库内**，用仓库相对路径描述，不要读写仓库外的路径。
- Renderer 不得直接访问文件系统、SQLite、原生模块或 `process` / `Buffer` / `require` /
  `__dirname`；仅 `src/lib/electron.ts` 可访问 `window.electronAPI`。
- 原生适配器源码只在 `electron/adapter/native` 维护，`electron/adapter` 只放构建产物与
  厂商 DLL；不要修改厂商 SDK 头文件的类型名或结构布局。
- 禁止 `git reset --hard`、`git checkout --`、批量递归删除等丢弃用户改动的操作。清理前先
  确认绝对目标，并在仓库外保留备份。
- 严禁 `git commit --no-verify` 绕过 hooks；hook 失败要定位并修复根因，不得降低校验强度。
- 禁止提交运行时数据与生成物：`golden.db`、`golden.db-*`、`legacy-config-backup/`、
  `dist/`、`dist-electron/`、coverage、日志、密钥/凭据/连接字符串。

## 常用命令

| 目的                    | 命令                                                  |
| ----------------------- | ----------------------------------------------------- |
| 开发（Vite + Electron） | `npm run dev`                                         |
| 类型检查                | `npm run typecheck`                                   |
| Lint（零警告）          | `npm run lint`                                        |
| 格式化 / 校验           | `npm run format` / `npm run format:check`             |
| 全部单测                | `npm run test`                                        |
| 单个测试文件            | `npx vitest run path/to/x.test.ts`                    |
| 仅相关测试              | `npm run test:related`                                |
| 保留测试集              | `npm run test:api`                                    |
| 组件 / 集成测试         | `npm run test:component` / `npm run test:integration` |
| IPC 一致性              | `npm run ipc:check`                                   |
| 构建（含打包）          | `npm run build`                                       |
| 编译原生适配器          | `npm run build:native`                                |

按域运行的目标 suite：`test:database`、`test:kcbp`、`test:import`、`test:script`、
`test:suggest`、`test:persist`、`test:core`。

## 质量门禁

pre-commit 钩子（`.githooks/pre-commit`，由 `npm run prepare` 安装）依次执行：

```text
verify-staged-guards → ipc:check → tsc -b → eslint .
```

分级检查：

| 命令                     | 内容                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| `npm run staged:check`   | staged guards + 颜色预算                                                                               |
| `npm run commit:check`   | staged:check + ipc:check + typecheck + lint                                                            |
| `npm run check`          | lint + ipc:check + format:check + scan:encoding + check:complexity + typecheck + test:component + test |
| `npm run check:delivery` | check + test:api + vite build                                                                          |

> **基线说明**：`npm run check` 目前会因两类**既有问题**失败，均非单次改动引入：
> `check:complexity` 的复杂度违规，以及 `format:check` 中约 19 个未格式化的既有文件。
> 不要为了"全绿"而降低阈值、删除测试或放宽规则；只格式化你实际改动的文件，
> 其余既有问题在汇报中单独列出。

## 架构地图

```text
src/
  main.tsx, App.tsx              Renderer 入口
  platform/registry              模块注册（组合根）
  platform/{shell,undo}          平台壳层与撤销
  components/{ui,layout,theme}   通用 UI、布局、主题
  modules/api-debug              API 调试模块
    components store services hooks layout providers types constants utils
    utils/{import,kcbp,script,sql,suggest,workspace}
  runtime                        Electron 门面（apiCall/config/kcbp/importExport/suggest）
  services/{persistence,export}  持久化、导出等副作用
  shared                         叶子层：跨端共享类型与纯逻辑
  config                         shared 的再导出壳
  architecture                   分层不变量测试
electron/
  main.ts                        主进程入口
  app/                           启动编排与生命周期
  ipc/                           IPC 注册（按域拆分）
  services/{kcbp,suggest}        KCBP/KGBP 调用与参数提示
  database/                      SQLite 连接、schema、migration、repository、legacy-import
  adapter/                       原生适配器产物；native/ 为源码
```

- Renderer 的分层依赖方向由 `eslint.config.js` 强制，`src/architecture/boundaries.test.ts`
  作为补充守卫；相对路径与 `@/` 别名都会被解析后判定，改写法无法绕过。
- `golden.db` 是唯一运行时配置与项目数据后端；旧 JSON 只用于一次性迁移与用户主动导入/导出。
- KCBP 响应归一化在 `electron/services/kcbp/response.ts`。

## 常见改动的必需动作

| 改动类型              | 必须同时完成                                                                  |
| --------------------- | ----------------------------------------------------------------------------- |
| 新增/修改 IPC channel | shared 类型 + `electron/preload.ts` + 主进程 handler + 测试                   |
| 修改数据库结构        | 更新 `schema.sql` + 幂等 `migrations.ts`（递增版本）+ repository + 数据库测试 |
| 新增 repository       | 内存库 CRUD、事务一致性、迁移升级、错误回滚测试                               |
| 新增共享逻辑          | 放 `src/shared`（纯逻辑）或对应领域 `types`，避免 Renderer/Electron 各存一份  |
| 改动 `native/src/**`  | 运行 `npm run build:native` 重新编译（先关闭运行中的 app，否则 `EBUSY`）      |

## 开发约定（摘要）

- 严格类型，避免 `any`；边界输入用类型守卫或显式校验，外部协议与导入文件均视为不可信。
- 组件只负责展示与交互；持久化、协议转换、业务计算放 store/service/utils。
- 基础表单控件必须用 `@/components/ui/primitives`，不要直连 antd。
- 配置读写只出现在 `*Data.ts` 或 `src/services/persistence`。
- 数据库写入必须经过 repository，跨表修改使用事务；动态内容序列化进 TEXT 并在应用层校验。
- 修复 bug 先补可复现的回归测试；持久化、IPC、迁移、导入导出需覆盖成功与失败路径。
- 使用 Prettier 格式化 TS/TSX/CSS/JSON/SQL/Markdown 及 `AGENTS.md` 自身。

完整规范见 [`development.md`](agents/rules/development.md)。

## 提交

- 使用 Conventional Commits：`feat:`、`fix:`、`refactor:`、`test:`、`docs:`、`chore:` 等，
  信息用简洁明确的英文动词短语。
- 一次提交只表达一个完整意图；schema、migration、repository 与测试应作为同一提交。
- 提交前执行 `npm run commit:check` 并 `git diff --cached --check` 复核暂存内容。
- 提交后再次确认 `git status` 与 `git log -1 --oneline`，并向用户报告提交号与验证结果。

完整规则见 [`commit.md`](agents/rules/commit.md)。

## 文档索引

- 当前有效文档：[`docs/README.md`](docs/README.md)
- 历史/废弃文档：[`docs/archive/README.md`](docs/archive/README.md)（仅作追溯，不代表当前实现）
