# 环境配置卡片 UI 重构（请求设置页）

> 状态：设计稿（待实现）
> 范围：`src/modules/api-debug/components/layout/RequestSettings.tsx` 中的「环境配置」卡片
> 影响面：纯展示层重构 + 缺失样式补齐，不改动数据结构、IPC、持久化与 KCBP 调用逻辑

## 1. 背景与根因

截图中的问题不是审美问题，而是**样式规则缺失**导致的布局塌陷。

**根因 A：数据库区块没有任何 CSS。**

`src/styles/shared/settings.css` 中 `.kcxp-env-*` 系列规则只覆盖到 `.kcxp-env-actions`，而
`kcxp-env-database-fields` / `kcxp-env-database-title` 这两个 class **只在 JSX 中被引用，全仓库无对应 CSS 规则**：

```text
$ grep -rn "kcxp-env-database" src/
src/modules/api-debug/components/layout/RequestSettings.tsx:160:  <div className="kcxp-env-database-fields">
src/modules/api-debug/components/layout/RequestSettings.tsx:161:    <Typography.Text className="kcxp-env-database-title">
```

而同级的容器 `.kcxp-env-row-fields` 是 `grid-template-columns: 2fr 1fr 1fr` 三列网格。
数据库区块作为**第 4 个网格项**被放进第一列，其 7 个输入框只能沿垂直方向堆叠，
形成截图里那根又高又窄、占满整卡高度的「柱子」。

**根因 B：开关被 flex 拉伸。**

`允许自动化 SQL 写入` 的 `Switch` 放在 `.kcxp-env-field`
（`display: flex; flex-direction: column`）里，flex 交叉轴默认 `align-items: stretch`；
antd `Switch` 只有 `min-width: 44px`、没有固定 `width`，于是被拉满整行——即截图中的超宽胶囊。

## 2. 目标 / 非目标

**目标**

1. 数据库区块拥有独立的视觉分区与明确标题，字段按「标签 + 控件」两列成对排布，消除纵向堆积。
2. 开关与「环境类型」一起收进区块标题行，不再打断表单流。
3. 每个字段有**稳定可见的文本标签**（当前仅靠 placeholder，一旦填值就无法辨认字段含义）+ 悬浮说明。
4. 环境名作为卡片标题加粗；删除按钮有 hover 红色反馈与说明文案。
5. 补齐缺失的 CSS，并让「同层对齐」在 3 列（连接参数）与 4 列（数据库成对）两种网格下都成立。

**非目标（明确不做，避免范围膨胀）**

- 不新增数据库区块的折叠/展开交互。
- 不改 `KcxpEnvironment` / `DbConnectionConfig` 数据结构与持久化格式。
- 不把数字字段从 `Input` 换成 `InputNumber`（详见 §7 待决项 D2）。
- 不改 KCBP/KGBP 调用、地址拼接与写库门禁逻辑（`environmentType === 'production'` 禁用写入等规则原样保留）。

## 3. 真实字段映射（已确认）

代码中 `DbConnectionConfig`（`src/shared/suggest/types.ts`）的真实字段为
`server / port / database / user / password / queryTimeoutMs / maxRows`，共 7 个。
截图末两位值 `1000` 与 `500` 分别是 **查询超时(ms)** 与 **最大行数**；不存在「重试间隔」与「备用参数」。

| 顺序 | 字段             | 标签          | Tooltip 文案                  |
| ---- | ---------------- | ------------- | ----------------------------- |
| 1    | `server`         | 数据库地址    | SQL Server 主机地址           |
| 2    | `port`           | 端口          | SQL Server 端口，默认 1433    |
| 3    | `database`       | 数据库名      | 目标数据库名称                |
| 4    | `user`           | 账号          | 数据库登录账号                |
| 5    | `password`       | 密码          | 数据库登录密码                |
| 6    | `queryTimeoutMs` | 查询超时 (ms) | 单条 SQL 查询超时时间（毫秒） |
| 7    | `maxRows`        | 最大行数      | 查询返回的最大行数上限        |

连接参数区（区块 1）Tooltip 文案：

| 字段                        | 适用协议 | Tooltip 文案                        |
| --------------------------- | -------- | ----------------------------------- |
| `host`                      | 全部     | 服务地址与端口，如 127.0.0.1:21000  |
| `queue`                     | KCBP     | KCBP 请求队列名称，需与柜台配置一致 |
| `timeout`                   | KCBP     | 请求超时时间（秒）                  |
| `service`                   | KGBP     | 网关服务名（必填）                  |
| `nodeId`                    | KGBP     | 节点 ID（必填）                     |
| `clientSessionId`           | KGBP     | 会话标识，可留空                    |
| `timeout`（RequestTimeout） | KGBP     | 请求超时时间（秒）                  |

新增的区块级 Tooltip：

| 控件                | Tooltip 文案                                 |
| ------------------- | -------------------------------------------- |
| 环境类型下拉        | 决定是否允许自动化写库；生产环境强制禁止写入 |
| 允许自动化 SQL 写入 | 仅在已设置非生产环境类型时可开启             |
| 删除按钮            | 删除该环境                                   |

## 4. 设计

### 4.1 DOM 结构

```text
.kcxp-env-row[.kcxp-env-row-active]
├── .kcxp-env-row-header                       flex, space-between
│   ├── .kcxp-env-row-ident                    Radio + 环境名输入（标题）
│   └── .kcxp-env-row-actions                  协议 Select（borderless） + 删除按钮
└── .kcxp-env-row-fields                       flex column, gap 14px
    ├── section.kcxp-env-section               区块 1
    │   ├── .kcxp-env-section-head → .kcxp-env-section-title  「连接配置」
    │   └── .kcxp-env-field-grid               grid 3 列（2fr 1fr 1fr）
    │       └── .kcxp-env-field × N            label + Input
    └── section.kcxp-env-section.kcxp-env-database-fields   区块 2（数据库配置）
        ├── .kcxp-env-section-head             flex, space-between
        │   ├── .kcxp-env-section-title        「数据库配置」
        │   └── .kcxp-env-section-head-actions 环境类型 Select + .kcxp-env-write-toggle
        └── .kcxp-env-pairs                    grid 4 列：84px | 1fr | 84px | 1fr
            └── .kcxp-env-pair × 7             .kcxp-env-pair-label + .kcxp-env-pair-control
```

区块之间用 `.kcxp-env-section + .kcxp-env-section` 的 `border-top: 1px solid var(--color-border-light)`

- `padding-top` 分隔，不使用新色值。

### 4.2 网格与尺寸

- **区块 1** 保持 `grid-template-columns: 2fr 1fr 1fr`（KCBP 三字段一行；KGBP 五字段自然折行为 3+2，与现状一致）。
- **区块 2** 用「标签 + 控件」四列网格 `84px minmax(0, 1fr) 84px minmax(0, 1fr)`，
  标签与控件恒定 `10px` 列间距，四行标签左缘严格对齐、输入框左缘与右缘对齐：

  ```text
  数据库地址  127.0.0.1       端口        1433
  数据库名    run             账号        sa
  密码        ••••••••        查询超时    1000
  最大行数    500
  ```

- 数字类控件（端口 / 查询超时 / 最大行数）加 `.kcxp-env-field-narrow`（`max-width: 140px`），
  地址类控件占满列宽 → 满足「地址类更长、数字类缩短」。
  **代价**：数字控件右缘不再与同列文本控件对齐，这是「数字缩短」的必然取舍。
- 标签左对齐（照 `要点 1` 的原话）。若要改为右对齐紧贴输入框，只需给 `.kcxp-env-pair-label`
  加 `justify-content: flex-end`，是单行改动。
- 开关不再处于纵向 flex 容器内，并显式 `flex: 0 0 auto`，从根上消除被拉伸的可能。

### 4.3 Tooltip 触发方式

标签文本用 `border-bottom: 1px dashed var(--color-border)` + `cursor: help` 表示可悬浮，
外层包 antd `Tooltip`，**不额外加图标**（12 个字段都挂图标会造成明显视觉噪声）。

### 4.4 可访问性

每个控件通过 `id` / `htmlFor` 与标签关联（id 由 `environment.id` + 字段名派生，保证多环境不冲突），
使「每个字段都有稳定可读名称」，同时让测试可以用 `getByLabelText` 稳定断言。

### 4.5 代码改动清单

| 文件                                                                    | 改动                                                                                                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/modules/api-debug/components/layout/EnvironmentRow.tsx`（新）      | 从 `RequestSettings.tsx` 抽出 `EnvironmentRow`（368 行 → 目标 ≈180 行）+ 内部 `EnvField` / `DbField` 小组件，纯 props、无 store 依赖 |
| `src/modules/api-debug/components/layout/RequestSettings.tsx`           | 只保留列表编排（增删选、`applyKcxpEnvironment`、草稿 flush），改为消费抽出的 `EnvironmentRow`                                        |
| `src/styles/shared/settings.css`                                        | 重写 `.kcxp-env-*` 段：补齐区块/成对网格/开关行/删除按钮样式，移除失效规则                                                           |
| `src/modules/api-debug/components/layout/EnvironmentRow.test.tsx`（新） | 组件测试，见 §5                                                                                                                      |
| `docs/README.md`                                                        | 文档索引新增本文档                                                                                                                   |

**抽取 `EnvironmentRow` 的理由**：它是本次改动的全部 UI 主体，抽出后可脱离 3 个 store
（`useAppEnv` / `useApiDebugEnv` / `useTabsActions`）单独渲染测试；`RequestSettings` 回归为列表编排职责。

## 5. 测试策略

`EnvironmentRow.test.tsx`（jsdom，纯 props，无需 mock store）：

1. KCBP 下渲染 7 个数据库字段，且每个都能通过 `getByLabelText` 找到 → 回归「字段只有 placeholder、没有标签」的缺陷。
2. `environmentType === 'production'` 时「允许自动化 SQL 写入」开关为 disabled；未设置环境类型时同样 disabled。
3. 切换到 KGBP 协议后渲染 `ServiceName` / `NodeId` 且带必填标记，KCBP 的 `Queue` 消失。
4. 编辑某字段时 `onChange` 收到的对象仅该字段变化、其余字段保持不变（`database` 浅合并不丢字段）。
5. 只有一个环境时删除按钮 disabled。

现有测试未引用任何 `kcxp-env-*` class（已 grep 确认），故不涉及既有断言迁移。

## 6. 验证命令

```bash
npx vitest run src/modules/api-debug/components/layout/EnvironmentRow.test.tsx
npm run test:component
npm run typecheck
npm run lint
npm run style:check     # 类名死代码棘轮（DEAD_CLASS_BASELINE=83），新增 class 必须在 TSX 中被引用
npm run color:check     # 颜色预算，只能复用 tokens.css 语义变量
npm run format          # 仅格式化本次改动的文件
```

手动视觉确认（`npm run dev`）：KCBP 与 KGBP 两种协议、深色主题、卡内滚动、多环境折叠状态。

## 7. 待决项（需用户点头才做，默认不做）

| 编号 | 事项                                        | 默认     | 说明                                                                                                                                                                                                                |
| ---- | ------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1   | 数据库密码改掩码输入                        | **不做** | 当前用明文 `Input`（截图可见 `root`），设置页另一处 `DbConnectionSettings` 用掩码 `Password`。改需同时给 `Password` 原语补 `size` 支持（现仅硬编码 `ga-input--md`），会触及共享原语与 interface-automation 的调用方 |
| D2   | 端口/超时/行数改 `InputNumber`（校验+步进） | **不做** | 现为纯文本 `Input`，非数字输入会得到 `NaN` 并降级为 `null`。改需额外 CSS 对齐高度（antd small 高度 24px ≠ `--control-height-sm` 28px），属逻辑与样式双重扩张                                                        |
| D3   | 拆分 Radio 与标题输入框                     | **不做** | 现为 `<Radio><Input/></Radio>`，点击标题输入框可能连带触发选中（浏览器 label 激活行为），进而触发 `applyKcxpEnvironment` 的草稿 flush 与应用。修复方式是把 Radio 独立成控件，会改变「点标题即选中」的现有交互       |

## 8. 风险与回滚

- **风险**：`style:check` 的死类棘轮。新增 CSS 类若未被 TSX 引用会使死类数超过 83 基线 → 因此本次所有新增 class 都同步落地在 JSX 中。
- **风险**：颜色预算（`MAX_UNIQUE_COLORS=40`，当前 36）。本设计零新增色值，全部复用 `--color-border-light` / `--color-border` / `--color-error` / `--color-error-bg` 等既有 token。
- **风险**：抽取 `EnvironmentRow` 需保证 `RequestSettings` 的 props 与回调语义完全不变（`onChange` / `onSelect` / `onDelete` / `canDelete` / `active`）。
- **回滚**：改动集中在 3 个文件（CSS + 2 个 TSX）+ 1 个新测试，`git revert` 单个提交即可完全回退，无数据迁移。
