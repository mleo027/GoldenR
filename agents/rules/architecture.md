# 架构规则

## 模块边界

### Renderer

- 入口为 `src/main.tsx`、`src/App.tsx`，模块注册位于 `src/platform/registry/app-modules.tsx`。
- API 调试功能全部位于 `src/modules/api-debug`，按 UI、store、service、utils、导入导出和脚本职责组织。
- Renderer 通过 store/context 使用数据，不直接依赖 Electron 主进程实现细节。

### Electron

- 入口为 `electron/main.ts`，启动编排位于 `electron/app/bootstrap.ts`，IPC 注册位于 `electron/ipc/register.ts`。
- KCBP/KGBP 调用位于 `electron/services/kcbp`；响应归一化位于 `response.ts`。
- 参数建议位于 `electron/services/suggest`，数据库访问不得散落在 IPC handler 或 UI 中。
- 原生适配器源码只在 `electron/adapter/native` 维护，`electron/adapter` 保存构建所需产物。

### 原生适配器（`electron/adapter`）

- `adapter.node` 是编译产物，由 `npm run build:native` 从 `native/src/adapter.cpp` 生成；改动 `native/src/**` 或 `native/include/**` 后必须重新编译，否则运行时报 `Native <TYPE> adapter not loaded`。
- 该二进制必须导出 `callKCBP`、`callKGBP`、`callKUAB`，可用 `node -e "console.log(Object.keys(require('./electron/adapter/adapter.node')))"` 校验。编译前需关闭运行中的 app，否则覆盖产物会因文件占用报 `EBUSY`。
- 依赖 DLL（`KCBPCli.dll`、`KUABCli.dll` 等）与 `adapter.node` 同级或在 `adapter/kuab` 下；单独从 `native/build/Release/` 直接 `require` 会因找不到 DLL 报 `ERR_DLOPEN_FAILED`，校验时需把这两个目录加入 `PATH`。
- 厂商 SDK 头文件（`native/include/kuabcli.h`、`native/include/kcbpcli/**`、`native/include/kgbpcli/**`）视为只读，不要改动其类型名或结构布局。
- `kuabcli.h` 与 `kcbpcli/lib/KCBPCli.h` 都在全局命名空间定义 `tagCallCtrl` 且布局不同，不能出现在同一编译单元（MSVC C2371）。当前做法是在 `native/include/self/KUABClient.hpp` 中把 KUAB 侧类型宏改名后再包含 `kuabcli.h`；新增同时依赖两个 SDK 的代码需沿用该隔离方式或拆到独立编译单元。

### KUAB 运行时配置（部署资产，不走 GUI）

`KUABCli.dll` 通过 `GetModuleFileNameA` 从**自身所在目录**读取配置，与任何 IPC/数据库配置无关：

- 必需文件：`electron/adapter/kuab/KCBPCli.json`（含 `AppID`/`AppSecret`）与跟 AppID 同名的 `<AppID>.key`（RSA 私钥）。两者必须与 `KUABCli.dll` 同级。
- `KCBPCli.json` 必须是非空 JSON 对象；缺失时报 `-900204 config is empty`，缺 `.key` 时在同名 RSA 密钥环节报 `-901901 InitPrivateKeyString fail` 一类错误。
- 这些文件是**部署资产**：由 `.gitignore` 排除，不进版本库；打包依赖 `package.json` 的 `extraResources`（整目录拷贝 `electron/adapter` → `resources/adapter`），因此构建机上需存在这些文件。
- **禁止调用 `KUAB_OPTION_CONFIG_DIR`(108)**：实测在 `KUABCLI_Init` 之后调用它会把已加载的配置清空，导致连接失败。KUAB 的凭据不由环境/用例配置提供，环境只配 host、端口和队列。
- 排障入口：同级目录下由 DLL 生成的 `KCBPCli.log` 会打印 `parse config file [路径] fail:原因` 与 `Call CKUABCli::ConnectServer(...)` 的完整参数（GBK 编码）。

## Renderer 分层与依赖约束（ESLint 强制）

渲染进程的依赖方向由 `eslint.config.js` 强制，`npm run lint` / `npm run check` 失败即阻断；`src/architecture/boundaries.test.ts`（路径感知）作为补充守卫。相对路径与 `@/` 别名都会被解析后判定，不能靠改写法绕过。

### 分层（依赖只能单向向下）

- 组合根：`src/main.tsx`、`src/App.tsx`、`src/platform/registry` 可依赖任意层。
- 平台与共享：`src/platform/{shell,undo}`、`src/components`、`src/hooks`、`src/store`。
- 门面与基础设施：`src/runtime`（Electron 门面）、`src/services`（持久化/导出等副作用）、`src/lib`、`src/utils`、`src/types`、`src/constants`。
- 叶子层：`src/shared`（含 `src/config` 再导出壳），不得依赖业务模块、UI、store、platform、runtime、services、lib、hooks。
- `electron/**` 只可依赖 `src/shared`、`src/types`、`src/constants`。

### api-debug 模块内部

`src/modules/api-debug` 细分为 `store / services / components / layout / providers / hooks / utils / types / constants`：

- `services` 与 `utils` 不得依赖 `store`、`components`、`hooks`（避免状态实现与 UI 耦合）。
- `utils` 不得依赖 `runtime`；副作用下沉到 `services`。
- `components` 只能通过 `store/use*` hook 或 `*Context` 读取状态，禁止直连 `*Store` / `*Data` / `tabsReducer`。
- `types` / `constants` 保持纯类型与常量。

### 业务约束（no-restricted-imports）

- 基础表单控件（`Input` / `Select` / `TextArea` / `Password`）必须使用 `@/components/ui/primitives`，禁止直连 antd。
- 配置读写只允许出现在 `*Data.ts` 或 `src/services/persistence`。
- KCBP 调用细节（`services/kcbp/electronClient`、`services/call/executors`）只允许 service 层引用。
- 仅 `src/lib/electron.ts` 可访问 `window.electronAPI`；渲染进程禁止 `process` / `Buffer` / `require` / `__dirname`。
- 类型导入由 `@typescript-eslint/consistent-type-imports` 强制显式 `import type`。

> flat config 中多个配置块设置同一规则会相互覆盖。`no-restricted-imports` 已按「导入方文件」切成互斥分区，新增规则时需确保目标文件只命中一个分区。

### 新增层或规则

1. 在 `eslint.config.js` 的 `boundaries/elements` 登记新元素：使用 `partialMatch: false` + 完整路径，避免 `components/*` 误匹配同名目录。
2. 在 `dependencyPolicies` 增加允许方向，或为要禁止的方向补充策略。
3. 业务约束加入对应的互斥 `no-restricted-imports` 分区。
4. 同步更新 `src/architecture/boundaries.test.ts` 的核心不变量。

## SQLite 持久化

- `golden.db` 是唯一运行时配置来源，位置遵循开发、便携版和安装版的既有目录策略。
- 连接管理：`electron/database/connection.ts`。
- 启动初始化：`electron/database/initializeDatabase.ts`。
- 完整建表脚本：`electron/database/schema/schema.sql`。
- 结构迁移：`electron/database/schema/migrations.ts`，每次结构变化递增版本并保证幂等。
- 读写入口：`electron/database/repositories`。
- 旧数据导入：`electron/database/legacy-import`，由 `data_migrations` 标记控制且只执行一次。

## 数据模型约束

- 项目通过 `projects` 关联用例；用例通过 `cases.project_id` 关联项目。
- 多级目录通过 `case_folders.parent_id` 自关联；用例通过 `cases.folder_id` 关联目录。
- 目录和用例必须保留 `project_id`，防止跨项目关联。
- 请求历史必须包含 `project_id`、`case_id` 等过滤字段，并维护对应索引。
- 公共参数使用 `common_param_sets` 与 `common_params` 父子表，外键启用级联删除。
- 动态 KCBP、规则和请求历史内容使用 TEXT 序列化保存，JSON 合法性由应用层负责。

## 迁移与生命周期

- 启动顺序：打开连接、执行 schema migration、执行未完成的旧数据导入、加载运行时配置、注册 IPC、创建窗口。
- Schema migration 与 legacy data import 分离管理。
- 旧 JSON 导入必须在一个事务中完成；失败回滚且不写完成标记，允许下次启动重试。
- 导入成功后将旧文件移动到 `legacy-config-backup`，数据库存在且迁移完成后禁止再读写旧 JSON。
- 退出前等待待写事务和 flush 完成，再关闭数据库连接。
- 新增 repository 时补充内存数据库 CRUD、事务一致性、迁移升级和错误回滚测试。
