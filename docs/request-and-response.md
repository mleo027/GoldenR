# 请求与响应

选中接口后，主工作区分为**请求区**（上）与**响应区**（下），均可拖拽调整高度。请求区支持 **UI 模式**与**脚本模式**切换。

## 编辑器模式

在请求区（UI 模式）或脚本区（脚本模式）的 **SectionHeader** 右侧点击 **「脚本模式」** / **「UI 模式」** 切换。

| 模式     | 主编辑区   | 说明                                                       |
| -------- | ---------- | ---------------------------------------------------------- |
| UI 模式  | 入参表格   | 可视化编辑 Key/Value                                       |
| 脚本模式 | 脚本编辑器 | JavaScript 自动化，见 [脚本自动化](./script-automation.md) |

模式偏好保存在 `api-debug.env.json` 的 `editorMode` 字段。

## 地址栏（Path）

位于请求/脚本分区顶部，用于配置 KCBP 调用地址。

### 字段

| 字段      | 说明                                                          |
| --------- | ------------------------------------------------------------- |
| KCXP 环境 | 下拉切换预设环境，立即应用到当前接口地址的 Host/Queue/Timeout |
| Host      | 服务地址，如 `127.0.0.1:21000`                                |
| Msgtype   | 功能号                                                        |
| Queue     | 队列名                                                        |
| Timeout   | 超时（秒）                                                    |

地址串格式：`host/msgtype?queue=…&timeout=…`。编辑经防抖写入工作区；Run 或切换接口前会自动 flush 草稿。

### 辅助按钮

| 按钮         | 模式 | 说明                                                                |
| ------------ | ---- | ------------------------------------------------------------------- |
| Run / Cancel | 通用 | 发起或取消 KCBP 调用；快捷键 `Ctrl+Enter`                           |
| 生成测试脚本 | UI   | 最近一次 Run 业务成功后可用，生成带 `test` 断言的脚本并切到脚本模式 |
| 格式化       | 脚本 | Prettier 格式化脚本，`Ctrl+Shift+F`                                 |
| 复制         | 通用 | 复制地址与入参表 JSON                                               |
| 清空         | 通用 | 清空 UI 入参表（不影响 `script` 字段）                              |

## 请求参数表（UI 模式）

| 能力        | 说明                                                                            |
| ----------- | ------------------------------------------------------------------------------- |
| 启用/禁用   | 勾选列控制字段是否参与 Run                                                      |
| 增删行      | 添加或删除入参行                                                                |
| Key / Value | 行内编辑；Value 支持智能下拉提示（见 [入参智能提示](./param-suggest-rules.md)） |
| 缺参回填    | Run 前若响应区有缺参提示，可一键写入入参表                                      |

入参智能提示：聚焦或输入时按规则查询 SQL Server；依赖入参未齐时会提示 pendingDeps；同一上下文多条规则按顺序尝试，前一条无数据时自动 fallback 下一条（详见 [入参智能提示](./param-suggest-rules.md#空结果顺序-fallback)）。

## 脚本编辑器（脚本模式）

- 编辑 `async function main(ctx) { ... }`
- 下方 **控制台** 显示 `console` 与 `test` 输出
- 详见 [脚本自动化](./script-automation.md)

## 响应区

KCBP 返回结果按接口 `caseId` 缓存在内存，不写入 `project.json`。切换接口可查看各自最近一次响应。

### 表格工具

| 功能     | 说明                   |
| -------- | ---------------------- |
| 搜索     | 过滤响应行             |
| 排序     | 点击列头排序           |
| 分页     | 大数据量分页浏览       |
| 行号     | 受设置「显示行号」控制 |
| 行详情   | 双击行打开详情弹窗     |
| 全屏     | 全屏查看响应表         |
| 导出 CSV | 保存为 CSV 文件        |

### 业务消息

响应底栏展示业务码与 **msg 全文**。若 msg 含可解析键值，可点击 **「提取到入参」** 写入请求参数表。

## 状态栏

底栏展示当前接口最近一次 Run 的摘要（约 26px 高）：

| 项   | 说明                                      |
| ---- | ----------------------------------------- |
| 状态 | 绿/红指示点（成功/失败），无 Success 文案 |
| Rows | 响应数据行数                              |
| 耗时 | 请求耗时                                  |
| 时间 | 完成时间戳                                |
| 历史 | 最近运行记录（最多 50 条，内存）          |

响应表格底栏（ResponseMeta）另展示业务码、msg、数据体积等，与状态栏互补不重复。

## 相关源码

| 模块            | 路径                                                                          |
| --------------- | ----------------------------------------------------------------------------- |
| 地址栏 / 入参表 | `modules/api-debug/components/editor/Path.tsx`、`ParamEdit.tsx`               |
| Run 编排        | `modules/api-debug/services/kcbpCallService.ts`                               |
| 响应缓存        | `modules/api-debug/store/responseStore.tsx`                                   |
| 响应 UI         | `modules/api-debug/components/response/ResponsePanel.tsx`、`ResponseMeta.tsx` |
| 共享表格 / 导出 | `components/ui/Grid.tsx`、`utils/exportTable.ts`                              |
| 草稿 flush      | `modules/api-debug/utils/workspace/tabDraftRegistry.ts`                       |

## 相关文档

- [脚本自动化](./script-automation.md)
- [入参智能提示](./param-suggest-rules.md)
- [设置与偏好](./settings.md) — KCXP 环境、自动保存
- [用例集与工作区](./workspace.md) — 接口页签、侧栏搜索
