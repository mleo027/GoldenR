# 设计：将 KCBP 原生 adapter 源码工程并入 new_golden

日期：2026-08-25
状态：已批准（用户确认方案 1）

## 背景

`D:\KSPB\own_tool\new_golden` 仓库的 `electron/adapter/` 目前只包含构建产物：
`adapter.node`、KCBP/KCXP 运行时 DLL、加载器 `index.cjs` 和 README。
原生扩展的**源码工程**游离在仓库之外，位于 `D:\KSPB\adapter\adapter`
（非 git 仓库）：`src/adapter.cpp`、`include/self/*.hpp` 自研封装、券商 SDK
（`include/kcbpcli/` 头文件 + `KCBPCli.lib`）、nlohmann/json 单头文件、
`binding.gyp`、`scripts/build-native.cmd`、示例脚本等。产物是手工拷贝到
`electron/adapter/` 的，源码无版本管理，存在丢失与脱节风险。

目标：将源码并入 new_golden 统一 git 管理，且保证新位置可以直接编译，
产出可替换的 `electron/adapter/adapter.node`。

## 方案选择

| 方案                           | 说明                                                                                     | 结论                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1. 独立原生子工程 + 根目录编排 | 源码复制到 `electron/adapter/native/`，保留自身 package.json；根 package.json 加编排脚本 | **采纳**                                                                  |
| 2. 并入主工程 package.json     | node-addon-api 提升为根 devDependency，改写编译脚本路径                                  | 否决：需改写 build-native.cmd 路径，根包混入 C++ 构建依赖                 |
| 3. 标准 node-gyp 构建          | 只留 binding.gyp，走 node-gyp rebuild                                                    | 否决：工具链为独立 ScopeCppSDK vc15（非完整 VS），node-gyp 默认探测风险高 |

采纳方案 1 的理由：`build-native.cmd` 全部使用相对项目根的路径并自行
`cd` 到脚本上级目录，原样复制即可编译，改动最小；native 子工程自包含，
符合 AGENTS.md 的模块边界要求。

## 目录结构

```
electron/adapter/
├── adapter.node          # 构建产物（现有，构建后覆盖）
├── index.cjs             # 加载器（不动）
├── *.dll                 # 运行时 DLL（不动）
└── native/               # ★ 新增：原生源码子工程
    ├── src/adapter.cpp
    ├── include/self/     # KCBPClient.hpp、tools.hpp、utils.hpp
    ├── include/kcbpcli/  # 券商 SDK：KCBPCli.h + KCBPCli.lib（不可再生）
    ├── include/json/     # nlohmann/json 单头文件
    ├── binding.gyp       # 保留备查（当前以 build-native.cmd 为准）
    ├── scripts/build-native.cmd   # 原样复制，不改路径
    ├── package.json      # 仅依赖 node-addon-api，scripts 指向 build-native.cmd
    ├── app.js / test-call.js      # 独立调试示例
    ├── README.md         # 原 README + "在 new_golden 内如何构建"一节
    └── .gitignore        # node_modules/、build/
```

不纳入：`node_modules/`、`build/`、`main/`（VS 工程，与 gyp 重复）、
`dll/`（运行时 DLL 已在 `electron/adapter/`）、`run.log`、`test.txt`、
`test.cpp`。

## 构建流程与编排

- `native/scripts/build-native.cmd` 原样保留：脚本内部
  `cd /d "%~dp0.."` 后以相对路径引用 `src/`、`include/`、
  `node_modules/node-addon-api`，复制后无需修改即可工作。
- 根 `package.json` 新增脚本 `build:native`：
  在 `electron/adapter/native` 内执行 `npm install` →
  `scripts\build-native.cmd` → 将 `build/Release/adapter.node`
  复制覆盖到 `electron/adapter/adapter.node`。
- 工具链依赖不变：`VS_CPP_SDK` 缺省指向
  `E:\software\vs_studio\package\SDK\ScopeCppSDK\vc15`；
  Node headers 经 node-gyp 缓存（`%LOCALAPPDATA%\node-gyp\Cache`）。

## 编译保证（验收硬性条件）

1. 复制完成后在新位置执行 `npm run build:native`，必须成功产出
   `electron/adapter/adapter.node`。
2. 用新产物替换后，应用内 callKCBP 可正常加载（现有冒烟验证）。
3. `npm run typecheck` 不受影响。

## git 管理

- `electron/adapter/native/.gitignore` 排除 `node_modules/` 与 `build/`。
- `adapter.node` 与运行时 DLL 维持现状（继续入库），本次不改变该策略。
- 一次性 commit：新增源码 + 根 package.json 脚本 + README 补充 +
  文档同步。

## 原目录处理

按 AGENTS.md 要求，`D:\KSPB\adapter\adapter` 保持只读、原样保留作为
备份，不做任何写入（包括不放迁移说明文件）。迁移事实只在 new_golden
侧记录。

## 文档同步

- 更新 `AGENTS.md` 架构一节：注明 KCBP native adapter 源码位于
  `electron/adapter/native/`。
- 更新 `CHANGELOG.md`。
