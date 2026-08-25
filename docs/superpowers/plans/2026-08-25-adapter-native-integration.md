# adapter 原生工程并入 new_golden 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 `D:\KSPB\adapter\adapter` 的 KCBP 原生扩展源码复制到 `electron/adapter/native/`，纳入 new_golden git 管理，并保证在新位置可直接编译产出 `electron/adapter/adapter.node`。

**架构：** 源码作为自包含的 `native/` 子工程放在产物目录旁边，`scripts/build-native.cmd` 原样保留不改路径；根目录新增一个 Node 编排脚本 `scripts/build-native.mjs`（遵循仓库现有 scripts/\*.mjs 模式）负责 install → 编译 → 拷贝产物。

**技术栈：** C++17 / node-addon-api / MSVC (ScopeCppSDK vc15) / node-gyp headers 缓存；编排脚本为 Node ESM (.mjs)。

**规格：** `docs/superpowers/specs/2026-08-25-adapter-native-integration-design.md`

**硬性验收条件：**

1. `npm run build:native` 在新位置编译成功，产出 `electron/adapter/adapter.node`。
2. `npm run typecheck` 通过。
3. 原目录 `D:\KSPB\adapter\adapter` 不做任何写入（只读备份原则）。

---

## 文件结构

| 文件                                               | 操作                                                    | 职责                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `electron/adapter/native/**`                       | 创建（复制自 `D:\KSPB\adapter\adapter`，见任务 1 清单） | 原生扩展源码子工程                                                                    |
| `electron/adapter/native/.gitignore`               | 创建                                                    | 排除 `node_modules/`、`build/`                                                        |
| `electron/adapter/native/package.json`             | 复制后微调                                              | 仅保留依赖 `node-addon-api` 与构建相关 scripts                                        |
| `electron/adapter/native/scripts/build-native.cmd` | 复制（不改内容）                                        | MSVC 编译 + 链接，输出 `build/Release/adapter.node`                                   |
| `electron/adapter/native/README.md`                | 复制后追加一节                                          | 说明在 new_golden 内如何构建                                                          |
| `scripts/build-native.mjs`                         | 创建                                                    | 根编排脚本：npm install → build-native.cmd → 拷贝 adapter.node 到 `electron/adapter/` |
| `package.json`                                     | 修改                                                    | 新增 `"build:native"` 脚本                                                            |
| `AGENTS.md`                                        | 修改                                                    | 架构一节注明 native 源码位置                                                          |
| `CHANGELOG.md`                                     | 修改                                                    | `[Unreleased] > Added` 记录迁移                                                       |

---

### 任务 1：复制源码到 electron/adapter/native/

**文件：**

- 创建：`electron/adapter/native/{src,include,scripts}/**`
- 创建：`electron/adapter/native/binding.gyp`、`app.js`、`test-call.js`、`README.md`、`package.json`
- 创建：`electron/adapter/native/.gitignore`

- [ ] **步骤 1.1：执行复制**

在 bash（Git Bash）中执行：

```bash
SRC="/d/KSPB/adapter/adapter"
DST="/d/KSPB/own_tool/new_golden/electron/adapter/native"
mkdir -p "$DST"
mkdir -p "$DST/src" && cp "$SRC/src/adapter.cpp" "$DST/src/"
mkdir -p "$DST/include/self" && cp "$SRC"/include/self/*.hpp "$DST/include/self/"
mkdir -p "$DST/include/kcbpcli/lib" && cp "$SRC"/include/kcbpcli/lib/KCBPCli.h "$SRC"/include/kcbpcli/lib/KCBPCli.lib "$DST/include/kcbpcli/lib/"
mkdir -p "$DST/include/json" && cp "$SRC"/include/json/json.hpp "$DST/include/json/"
mkdir -p "$DST/scripts" && cp "$SRC/scripts/build-native.cmd" "$DST/scripts/"
cp "$SRC/binding.gyp" "$SRC/app.js" "$SRC/test-call.js" "$SRC/README.md" "$SRC/package.json" "$DST/"
```

明确**不复制**：`node_modules/`、`build/`、`main/`、`dll/`、`run.log`、`test.txt`、`test.cpp`、`test-call.js` 之外的任何临时文件。

- [ ] **步骤 1.2：创建 .gitignore**

`electron/adapter/native/.gitignore` 内容：

```
node_modules/
build/
```

- [ ] **步骤 1.3：精简 native/package.json**

将 `electron/adapter/native/package.json` 改为（去掉与 new_golden 无关的 config32/config64/buildandrun 等脚本，保留核心链路）：

```json
{
  "name": "kcbp-native-adapter",
  "version": "1.0.0",
  "private": true,
  "description": "KCBP native adapter source project (built via scripts/build-native.cmd)",
  "main": "app.js",
  "scripts": {
    "build": "cmd /c scripts\\build-native.cmd",
    "test": "node app.js",
    "test:call": "node test-call.js"
  },
  "dependencies": {
    "node-addon-api": "^8.4.0"
  }
}
```

- [ ] **步骤 1.4：验证复制结果**

```bash
cd /d/KSPB/own_tool/new_golden/electron/adapter/native
find . -type f | sort
```

预期文件清单（共 10 个）：

```
./README.md
./app.js
./binding.gyp
./include/json/json.hpp
./include/kcbpcli/lib/KCBPCli.h
./include/kcbpcli/lib/KCBPCli.lib
./include/self/KCBPClient.hpp
./include/self/tools.hpp
./include/self/utils.hpp
./package.json
./scripts/build-native.cmd
./src/adapter.cpp
./test-call.js
```

（13 个文件；`.gitignore` 另算。）确认 `KCBPCli.lib` 大于 0 字节（约几百 KB），这是不可再生的券商 SDK 静态库。

- [ ] **步骤 1.5：Commit**

```bash
cd /d/KSPB/own_tool/new_golden
git add electron/adapter/native
git commit -m "feat(adapter): 迁入 KCBP 原生扩展源码子工程"
```

---

### 任务 2：安装 native 子工程依赖并原样验证编译

**文件：** 无新增（验证性任务）

- [ ] **步骤 2.1：安装 node-addon-api**

```bash
cd /d/KSPB/own_tool/new_golden/electron/adapter/native
npm install
ls node_modules/node-addon-api   # 预期存在（build-native.cmd 引用 %ROOT%\node_modules\node-addon-api）
```

- [ ] **步骤 2.2：原样运行 build-native.cmd**

```bash
cmd //c "scripts\\build-native.cmd"
```

预期末行输出 `[build-native] 完成: ...adapter.node` 且 exit code 为 0。若报找不到 cl.exe，检查环境变量 `VS_CPP_SDK` 是否指向 `E:\software\vs_studio\package\SDK\ScopeCppSDK\vc15`（脚本的缺省值）。

- [ ] **步骤 2.3：确认产物存在**

```bash
ls -la build/Release/adapter.node
```

预期：文件存在且大小与 `electron/adapter/adapter.node` 相近（约 400KB 级）。此步骤证明"新位置可编译"，是规格的硬性要求。

---

### 任务 3：根编排脚本 scripts/build-native.mjs

**文件：**

- 创建：`scripts/build-native.mjs`
- 修改：`package.json`（scripts 段）

- [ ] **步骤 3.1：编写 scripts/build-native.mjs**

遵循仓库 `scripts/copy-node-runtime.mjs` 的风格（ESM、4 空格缩进）：

```js
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nativeDir = path.join(rootDir, 'electron', 'adapter', 'native');
const builtBinary = path.join(nativeDir, 'build', 'Release', 'adapter.node');
const targetBinary = path.join(rootDir, 'electron', 'adapter', 'adapter.node');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    cwd: options.cwd ?? nativeDir,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with code ${result.status}`);
  }
}

run('npm', ['install']);
run('cmd', ['/c', 'scripts\\build-native.cmd']);

if (!fs.existsSync(builtBinary)) {
  throw new Error(`Build did not produce ${builtBinary}`);
}
fs.copyFileSync(builtBinary, targetBinary);
console.log(
  `Copied ${path.relative(rootDir, builtBinary)} -> ${path.relative(rootDir, targetBinary)}`,
);
```

- [ ] **步骤 3.2：在 package.json 增加 build:native 脚本**

在 `"scripts"` 段中、`"smoke:dev"` 之后插入一行（注意上一行行尾补逗号）：

```json
    "smoke:dev": "node scripts/smoke-dev.mjs",
    "build:native": "node scripts/build-native.mjs",
```

- [ ] **步骤 3.3：端到端验证**

```bash
cd /d/KSPB/own_tool/new_golden
npm run build:native
```

预期：先输出 npm install 日志，再输出 build-native.cmd 编译日志，最后输出 `Copied electron/adapter/native/build/Release/adapter.node -> electron/adapter/adapter.node`，exit code 0。

- [ ] **步骤 3.4：Commit**

```bash
cd /d/KSPB/own_tool/new_golden
git add scripts/build-native.mjs package.json package-lock.json
git commit -m "build(adapter): 根编排脚本 build:native 一键编译原生扩展"
```

---

### 任务 4：文档同步

**文件：**

- 修改：`electron/adapter/native/README.md`
- 修改：`AGENTS.md`
- 修改：`CHANGELOG.md`

- [ ] **步骤 4.1：native README 追加构建说明**

在 `electron/adapter/native/README.md` 顶部（架构图之前）插入以下章节：

````markdown
## 在 new_golden 内构建

本目录已并入 Golden API 仓库（`electron/adapter/native/`）。常规情况下不要在本目录单独操作，而是在仓库根目录执行：

​`bash
npm run build:native
​`

该命令依次完成：`npm install`（安装 node-addon-api）→ `scripts\build-native.cmd`（MSVC 编译链接）→ 将 `build/Release/adapter.node` 覆盖拷贝到上级 `electron/adapter/adapter.node` 供 Electron 加载。

工具链要求不变：Windows + Node.js 18+ + MSVC（ScopeCppSDK vc15，可用环境变量 `VS_CPP_SDK` 覆盖路径）。
````

（注：插入时把 `​```bash` 还原为正常的 ```bash 围栏——上文为避免嵌套围栏加了零宽字符，实际写入时不要带。）

- [ ] **步骤 4.2：更新 AGENTS.md 架构一节**

将 `AGENTS.md` 中这一行：

```markdown
- KCBP native adapter: `electron/adapter`.
```

改为：

```markdown
- KCBP native adapter: artifacts in `electron/adapter`, sources in `electron/adapter/native` (build with `npm run build:native`). Original standalone copy at `D:\KSPB\adapter\adapter` is a read-only backup.
```

同时在 Rules 段落追加一条：

```markdown
- `D:\KSPB\adapter\adapter` is a read-only backup of the native adapter sources; all adapter changes happen in `electron/adapter/native`.
```

- [ ] **步骤 4.3：更新 CHANGELOG.md**

在 `## [Unreleased]` 的 `### Added` 列表末尾追加：

```markdown
- KCBP 原生 adapter 源码迁入 `electron/adapter/native`，新增 `npm run build:native` 一键编译。
```

- [ ] **步骤 4.4：Commit**

```bash
cd /d/KSPB/own_tool/new_golden
git add AGENTS.md CHANGELOG.md electron/adapter/native/README.md
git commit -m "docs: 同步 adapter 原生源码迁入说明"
```

---

### 任务 5：回归验证

**文件：** 无新增

- [ ] **步骤 5.1：类型检查**

```bash
cd /d/KSPB/own_tool/new_golden
npm run typecheck
```

预期：无错误退出（exit code 0）。

- [ ] **步骤 5.2：API 单元测试**

```bash
npm run test:api
```

预期：全部通过。特别注意 `kcbp` 相关用例不受影响（它们 mock 了 callKCBP，不加载 .node）。

- [ ] **步骤 5.3：确认原目录未被修改**

```bash
cd /d/KSPB/adapter/adapter && ls -la src include/self scripts | head -20
```

预期：与任务 1 开始前一致（只读校验，未产生新文件）。

- [ ] **步骤 5.4：最终状态确认**

```bash
git status
```

预期：工作区干净，仅剩 `node_modules/`、`build/` 等 gitignore 内容不显示。

---

## 自检记录

- 规格覆盖度：目录结构（任务 1）、.gitignore（1.2）、package.json 微调（1.3）、编排脚本（任务 3）、编译保证（任务 2/3/5）、git 管理（各 commit 步骤）、原目录只读（5.3 + AGENTS.md 注记）、文档同步（任务 4）——全部有对应任务。
- 占位符扫描：无 TODO/待定；所有代码块均为最终内容。
- 类型一致性：`scripts/build-native.mjs` 内部引用的路径（`native/build/Release/adapter.node` → `electron/adapter/adapter.node`）与 build-native.cmd 的实际输出位置（`%ROOT%\build\Release\adapter.node`，其中 ROOT=native/）一致。
