# GoldenAPI API 调试模块独立拆分方案

## 结论与假设

本目录是独立的 Golden API Debug 应用，目标只保留 `api-debug` 模块及其运行依赖。原始 GoldenAPI 仓库不修改、不删除，作为只读参考源。

按用户确认的“纯 API 调试”档执行：移除 TCD、TCI、AutoQC、TraceCode、知识库、SQL Debugger、数据库环境、交易所文件、Agent Server、Agent Chat、LLM、RAG 与 Tunnel 等无关能力。

## 保留边界

- 渲染端：`src/modules/api-debug`，模块注册只含 `api-debug`。
- 主进程：KCBP 调用、KCBP 运行时配置、SQL 参数提示、脚本 SQL 查询、JSON/INI 导入、CSV/HTML 导出、窗口控制、通用 JSON 持久化。
- 共享代码：`shared/kcbp`、`shared/suggest`、`shared/tcd` 中脚本引擎所需子集、`shared/test` 中脚本 API 所需子集、`shared/platform/undo`、`shared/utils/textHighlight`。
- Native 资源：`electron/adapter`、`kcbpWorker.cjs`、`kcbpBridge.cjs`。

## 清理策略

- 删除其他业务模块、全局 Agent UI、Agent Server/LLM/RAG 后端及对应依赖。
- 精简 Electron preload 与类型声明，只暴露 api-debug 使用的 IPC。
- 精简 electron-builder 配置，只打包 `dist`、`dist-electron` 和 `electron/adapter`。
- 删除无关 docs、scripts、根数据文件和资源目录。
- 执行删除前先备份当前目录，并只操作 `new_golden` 内已校验路径。

## 验收标准

- `npm run typecheck` 通过。
- `npm run test:api` 通过。
- `npx vite build` 通过。
- 应用启动后只显示 API 调试模块，无 Agent/Server/Tunnel 入口。
- 构建产物中不出现 `lancedb`、`apiServer`、`sqlDebugger` 等残留业务代码。

## 打包与发布

Electron/V8 的 JIT 是运行时优化，构建期无法“开启”或预编译 JIT。体积优化依靠删除未用代码、tree-shaking 与压缩。Electron 不能打成真正单文件 exe；当前目标是 NSIS/Portable，MS Store 发布需后续单独规划 MSIX/APPX、签名证书与 Publisher 身份。
