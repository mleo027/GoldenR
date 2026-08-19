# Golden API 深度修复交付报告

## 依赖方向

当前依赖流固定为：

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

`shared` 位于最底部，不再导入 `modules`、`components`、`store`、`platform` 或 `config`。

## IPC API 变化

- Renderer 统一通过 `getElectronAPI()` / `requireElectronAPI()` 访问命名空间 API：
  - `config`
  - `kcbp`
  - `database`
  - `importExport`
  - `window`
  - `app`
- 旧的 `readJsonFile`、`writeJsonFile`、`flushStorage` 等扁平方法已移除。
- 配置 IPC 只接受注册文件名；拒绝绝对路径、路径穿越、空名和未知文件。
- 主进程错误统一序列化为 `{ code, message }`，Renderer 侧转换为带 `code` 的 `Error`。
- 退出流程改为异步 flush 握手，最长等待 3 秒，超时后记录错误并退出。

## 配置兼容确认

以下文件名和字段结构保持兼容：

- `app.json`
- `api-debug.env.json`
- `project.json`
- `settings.json`
- `db.json`
- `param-suggest-rules.json`
- `kcbp.env.json`
- `app.api-debug.legacy-migrated.json`
- `settings.preferences.legacy-migrated.json`

Legacy 迁移、备份写入、重复迁移幂等行为均有测试覆盖。

## 测试与门禁

当前自动化门禁：

- `npm run check` 通过：84 个测试文件、386 个测试。
- `npm run test:api` 通过：KCBP 43、Import 9、Script 17、Suggest 65、Persist 15、Core 41。
- `npm run test:coverage` 通过，当前全局覆盖率约 Statements 61%、Lines 63%。
- `npx vite build` 通过。
- `npm run test:unit`、`test:integration`、`test:smoke`、`smoke:preview` 可运行。
- `npm run smoke:dev` 通过：Renderer 开发模式页面 HTTP 200。
- `npm run smoke:preview` 通过：打包产物页面 HTTP 200。

## 构建结果

`npx vite build` 成功生成：

- `dist/index.html`
- Renderer chunks
- `dist-electron/main.js`
- `dist-electron/preload.cjs`
- KCBPCli/adapter 等 Native 资源

`npm run smoke:preview` 验证打包产物可被 HTTP 访问，返回 200。

## 新增依赖

- `@types/mssql`
- `@testing-library/react`
- `@testing-library/dom`
- `@testing-library/user-event`
- `jsdom`
- `@vitest/coverage-v8`
- `eslint-plugin-react`
- `eslint-plugin-jsx-a11y`

## 未解决问题

- 第 8 节人工 GUI 冒烟尚未执行：Electron 窗口启动、KCBP mock/真实 adapter、数据库建议、窗口生命周期、portable 配置目录。
- 全局覆盖率尚未达到计划中“变更代码行覆盖率 90%”的目标。
- 复杂度基线仍有 45 个存量违规，尚未全部拆分到硬门限内。
- `plan.md` 仍为未跟踪文件，未纳入提交。

## 用户文件变更情况

未回退或覆盖用户已有改动。外部产生的 `no-floating-promises` 自动修复已作为独立提交纳入版本库；工作区当前仅剩未跟踪的 `plan.md`。
