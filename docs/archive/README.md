# 归档文档

此目录保存**已完成、已废弃或一次性**的历史文档，仅作追溯参考，**不代表当前实现**。

当前有效文档见 [`../README.md`](../README.md)。

## 归档清单与原因

| 文件                                           | 归档原因                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| `testing-plan.md`                              | 规划的 `interface-automation` 模块不存在，且超出"仅保留 api-debug"的范围 |
| `plan-zustand-migration.md`                    | React Context → Zustand 状态迁移计划，已在 `e62d96d` 完成                |
| `final-delivery-report.md`                     | 一次性交付报告，描述旧 `Context + Reducer` 架构与旧目录结构              |
| `golden-api-debug-call-flow.diagram.md`        | 无代码围栏的裸 mermaid 草图，无法渲染                                    |
| `golden-api-debug-operation-manual.diagram.md` | 同上；且持久化仍描述已废弃的 JSON 配置中心                               |
| `superpowers/plans/*`、`superpowers/specs/*`   | AI 代理执行计划与设计稿，无索引/无引用，复选框状态未维护                 |

## 待更新（未归档，内容已过期）

以下文档仍在 `docs/` 中，但持久化描述仍写作 JSON 配置中心；实际已迁移到 SQLite
（`golden.db`，见 `electron/database`）。后续应更新为 SQLite 描述：

- `docs/data-persistence.md`
- `docs/workspace.md`
- `docs/settings.md`
- `README.md`
