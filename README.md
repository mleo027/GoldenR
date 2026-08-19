# Golden API

Golden API 是从 GoldenAPI 中拆分出的独立桌面应用，只保留 `api-debug` 模块：KCBP 接口调用、入参编辑、脚本自动化、响应查看、JSON/INI 导入导出、SQL 参数提示与脚本 `query()`。

原 GoldenAPI 仓库保持只读，本目录不再包含 TCD、TCI、AutoQC、TraceCode、知识库、SQL Debugger、数据库环境、交易所文件、Agent Server 等模块。

## 快速开始

```bash
npm install
npm run dev
```

常用命令：

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 与 Electron |
| `npm run typecheck` | TypeScript 检查 |
| `npm run test:api` | 运行 api-debug 保留测试 |
| `npm run build` | 生成图标、构建并打包 Windows NSIS/Portable |
| `npm run scan:encoding` | 检查中文乱码文本 |

## 功能边界

- KCBP 调用：`rpc:call`、取消、运行时配置。
- 脚本自动化：`call()`、`query()`、断言、变量、流式 `runCase` 所需的最小共享引擎。
- 导入导出：KUAB JSON、Config.ini、CSV、HTML。
- 参数提示：SQL Server 连接、规则文件 `param-suggest-rules.json`、`db.json`。
- 持久化：`app.json`、`settings.json`、`project.json`、`api-debug.env.json`。

## 目录结构

```text
src/
  modules/api-debug/       API 调试模块
  platform/                模块注册、平台壳层
  shared/                  KCBP/SQL 参数提示/脚本引擎等共享逻辑
electron/
  services/kcbp/           KCBP 主进程服务
  services/suggest/        SQL 参数提示主进程服务
  adapter/                 KCBP native adapter
scripts/
  run-unit-tests.mjs       测试分组
  generate-icon.mjs        图标生成
  scan-garbled-strings.mjs 编码检查
```

## 打包说明

Electron/V8 的 JIT 是运行时优化，Vite 构建不会关闭或预编译它；体积优化来自删除无关模块、tree-shaking 和压缩。Electron 应用无法做成真正单文件 exe，当前打包目标是体积可控的 NSIS/Portable；MS Store 发布需要后续单独配置 MSIX/APPX、证书与 Publisher。

详细拆分记录见 [docs/2026-08-14-goldenapi-api-module-split.md](./docs/2026-08-14-goldenapi-api-module-split.md)。
