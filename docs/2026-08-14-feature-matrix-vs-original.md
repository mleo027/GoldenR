# Golden API 与原 GoldenAPI 功能矩阵对比

## 评估基准

- 原项目：`D:\KSPB\own_tool\GoldenAPI`，本次只读取，不修改。
- 当前独立应用：`D:\KSPB\own_tool\new_golden\开发\plan`。
- 核对时间：2026-08-14。

## 总览结论

- 当前应用只注册 1 个业务模块：`api-debug`；原项目注册 9 个业务模块。
- `api-debug` 核心目录中的 155 个共同文件里，154 个与原项目一致；唯一差异是 `index.tsx` 删除了 Agent Server、Golden/Tunnel、企业微信、DevOps、API 鉴权 5 个设置入口。
- `api-debug` 的 32 个测试文件与原项目完全一致。
- TCD、TCI、AutoQC、TraceCode、知识库、SQL Debugger、数据库环境、交易所文件模块整体移除。
- Agent Server、Agent Chat、LLM、RAG、Tunnel、Harness 及 `src/server`、`src/platform/agent` 整体移除。
- `src/shared/tcd`、`src/shared/test` 仍保留 `api-debug` 脚本引擎所需子集，不是完整 TCD/测试模块。

## 功能矩阵

| 功能域                                                                                 | 原 GoldenAPI                                                                                                                    | 当前 Golden API                                    | 结论                                              |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| 模块注册 / ActivityBar                                                                 | 9 个模块                                                                                                                        | 仅 `api-debug`                                     | 仅保留 API 调试                                   |
| API 调试：KCBP 调用 / 取消                                                             | 有                                                                                                                              | 有                                                 | 保留                                              |
| API 调试：KCBP 运行时配置                                                              | 有                                                                                                                              | 有                                                 | 保留                                              |
| API 调试：工程 / 用例树 / 多页签 / 草稿 / 撤销                                         | 有                                                                                                                              | 有                                                 | 保留                                              |
| API 调试：请求编辑、路径、参数、快捷填充                                               | 有                                                                                                                              | 有                                                 | 保留                                              |
| API 调试：脚本自动化 `call()`、`query()`、断言、变量、`runCase()`                      | 有                                                                                                                              | 有                                                 | 保留脚本引擎所需 `shared/tcd`、`shared/test` 子集 |
| API 调试：响应展示、全屏、指标                                                         | 有                                                                                                                              | 有                                                 | 保留                                              |
| API 调试：运行日志、脚本控制台                                                         | 有                                                                                                                              | 有                                                 | 保留                                              |
| API 调试：KUAB JSON / Config.ini 导入，CSV / HTML 导出                                 | 有                                                                                                                              | 有                                                 | 保留                                              |
| API 调试：SQL 参数提示、规则、数据库连接、脚本 SQL 查询                                | 有                                                                                                                              | 有                                                 | 保留                                              |
| API 调试：请求设置 / KCXP 环境                                                         | 有                                                                                                                              | 有                                                 | 保留                                              |
| API 调试：Agent Server 设置                                                            | 有                                                                                                                              | 无                                                 | 按“纯 API 调试”移除                               |
| API 调试：Golden / Cloudflare Tunnel 设置                                              | 有                                                                                                                              | 无                                                 | 移除                                              |
| API 调试：企业微信通知设置                                                             | 有                                                                                                                              | 无                                                 | 移除                                              |
| API 调试：DevOps 设置                                                                  | 有                                                                                                                              | 无                                                 | 移除                                              |
| API 调试：API 鉴权 / API Key 设置                                                      | 有                                                                                                                              | 无                                                 | 移除                                              |
| TCD 模块：套件编排、运行历史、JUnit 导出、独立入口                                     | 有                                                                                                                              | 无                                                 | 完整模块移除，仅保留脚本引擎依赖                  |
| TCI：SVN 监控、MSBuild/Client/SQL 构建、规则、历史                                     | 有                                                                                                                              | 无                                                 | 移除                                              |
| AutoQC：代码/SVN 质检规则、报告                                                        | 有                                                                                                                              | 无                                                 | 移除                                              |
| TraceCode：覆盖率采集、会话、Golden Trace                                              | 有                                                                                                                              | 无                                                 | 移除                                              |
| 知识库：项目文档、Vault、Markdown 编辑器、Agent 上下文                                 | 有                                                                                                                              | 无                                                 | 移除                                              |
| SQL Debugger：XEvent、CDC、表审计、备份/还原、PITR                                     | 有                                                                                                                              | 无                                                 | 移除                                              |
| 数据库环境：Manifest、环境切换、历史                                                   | 有                                                                                                                              | 无                                                 | 移除                                              |
| 交易所文件：DBF 编辑、Schema 库、字段备注字典、Diff                                    | 有                                                                                                                              | 无                                                 | 移除                                              |
| Agent Server：HTTP 服务、鉴权、OpenAPI、notify/devops/harness/knowledge/tracecode 路由 | 有                                                                                                                              | 无                                                 | 移除 `src/server`                                 |
| Agent Chat / 代码库 Agent / 工具执行                                                   | 有                                                                                                                              | 无                                                 | 移除 `src/platform/agent` 与相关 Electron service |
| LLM / Embedding / Ollama                                                               | 有                                                                                                                              | 无                                                 | 移除                                              |
| RAG：LanceDB、分块、检索、知识库来源                                                   | 有                                                                                                                              | 无                                                 | 移除                                              |
| Tunnel：本地穿透管理                                                                   | 有                                                                                                                              | 无                                                 | 移除                                              |
| 平台异步任务 runner                                                                    | 有                                                                                                                              | 无                                                 | 移除                                              |
| Electron IPC                                                                           | 17 组注册                                                                                                                       | 5 组：storage、importExport、kcbp、suggest、window | 仅保留 api-debug 所需 IPC                         |
| 主进程启动服务                                                                         | API Server、SQL Debugger、备份调度、DB Env、TCD CLI、golden-asset 协议等                                                        | 仅 KCBP、SQL 参数提示、导入导出、窗口、存储        | 移除无关后台服务                                  |
| 配置模块                                                                               | agent、api-debug、api-server、app、autoqc、files、kcbp、suggest、tracecode                                                      | api-debug、app、files、kcbp、suggest               | 移除 Agent/API Server/AutoQC/TraceCode 配置       |
| Electron services 目录                                                                 | 15 个：agent、apiServer、autoqc、dbEnv、docs、exchange、kcbp、platform、sqlDebugger、suggest、tcd、tci、test、tracecode、tunnel | 2 个：kcbp、suggest                                | 保留运行依赖                                      |
| 脚本入口                                                                               | server、tunnel、quality、opencppcoverage、schema 同步、TCD CLI 等 35 个 script                                                  | 20 个 script，聚焦 dev/build/lint/test/format/icon | 移除发布和工具链脚本                              |
| 生产依赖                                                                               | 18 个                                                                                                                           | 14 个                                              | 移除 LanceDB、LangChain、DBF、文档解析等          |
| 开发依赖                                                                               | 33 个                                                                                                                           | 23 个                                              | 移除 MUI、husky、lint-staged、commitlint 等       |

## 代码规模对照

| 维度                 | 原 GoldenAPI | 当前 Golden API |
| -------------------- | -----------: | --------------: |
| `src` 非测试文件     |          813 |             269 |
| `src` 非测试行数     |       80,888 |          22,426 |
| `src` 测试文件       |          189 |              55 |
| `src` 测试行数       |       10,879 |           3,426 |
| `electron` 文本文件  |          200 |              31 |
| `electron` 文本行数  |       24,878 |           1,838 |
| `api-debug` 测试文件 |           32 |              32 |

## 体积与打包现状

- 当前 `app.asar`：约 4.4 MB。
- 当前 renderer 主 chunk：约 1.29 MB；antd vendor chunk：约 0.83 MB。
- 当前 Portable：约 87.8 MB；Setup：约 88.0 MB。
- 原项目未重新构建，避免写入原仓库；因此不提供原项目构建产物做同机体积对比。
- Electron 仍是 NSIS/Portable 目标；MS Store 尚未配置 MSIX/APPX、证书和 Publisher。

## 关键边界提醒

1. 当前目录存在 `src/shared/tcd` 和 `src/shared/test`，但只包含 API 调试脚本运行所需能力，不代表 TCD/测试模块入口仍存在。
2. 原 `api-debug` 模块设置页里的 Agent Server 相关 5 个入口已删除；如果后续需要把这些能力并入独立应用，需要单独决策。
3. 原仓库当前工作区有未提交改动；本次评估只读取其工作区现状，未对原仓库做任何写入。
