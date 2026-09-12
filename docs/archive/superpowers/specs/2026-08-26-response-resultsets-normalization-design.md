# 响应数据归一化：`data` 恒为结果集数组 — 设计文档

日期：2026-08-26
状态：已确认

## 背景

现响应结构存在二义性：`KcbpResponseData.data: unknown[]` 可能是平铺行，也可能（当全部元素满足 `{name, columns, rows}` 时）是结果集数组，此时另有可选字段 `resultSets` 装同一份数据。消费方必须先 `every(isKcbpResultSet)` 判别再分支，`gridData` 还要从 `resultSets[0].rows` 二次派生。用户确认采用「边界归一化」方案（方案 A）。

## 目标形态

**IPC 层**（`src/shared/kcbp/types.ts` KcbpResponseData）：

```ts
data: KcbpResultSet[];   // unknown[] → 恒为结果集数组，单集即长度 1
```

**Renderer 层**（ResponseData）：

```ts
{
    code: string | number;
    message: string;
    resultSets: KcbpResultSet[];   // 必有、恒为数组；删除 data 与可选 resultSets
    calledAt?: number;
    stats?: { timecost: number; rows: number };
}
```

## 归一化边界（唯一收口点）

`electron/services/kcbp/kcbp.ts` 新增：

```ts
function normalizeResultSets(data: unknown[]): KcbpResultSet[];
```

- 元素全部具备 `rows: []` 结构 → 规范化补齐缺省 `name: ''` / `columns: []`
- 平铺行或混合结构 → 整体包装为单集 `{ name: '', columns: 首行 keys 推导, rows: data }`
- 在 `toNormalizedResult` 中调用；错误路径与 envelope 路径保持 `data: []`（「没有结果集」）
- `countResponseRows`（全集行数求和）不变，天然适配新形态

## 消费方改造清单（14 处）

| #   | 位置                                             | 改法                                                                                 |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 1   | `shared/kcbp/types.ts`                           | 类型签名                                                                             |
| 2   | `electron/services/kcbp/kcbp.ts`                 | 注入 normalizeResultSets + 单测                                                      |
| 3   | `electron/preload.ts`                            | 类型跟随                                                                             |
| 4   | `requestMapper.buildKcbpCallOutcome`             | 删 every 判定；`resultSets = raw.data`                                               |
| 5   | `kcbpParams.extractMissingParamFromKcbpResponse` | 入参改收 resultSets，遍历各集 rows                                                   |
| 6   | `ResponsePanel`                                  | responseData = resultSets[selectedIdx]?.rows ?? EMPTY；fallback 分支删除             |
| 7   | `ResponseFullscreenModal`                        | props 不变，零改动                                                                   |
| 8   | `ResponseMeta`                                   | dataSize 用 formatDataSize(resultSets)；rowCount 用 stats 或全集求和                 |
| 9   | `scriptRunner.ts`                                | outcome 构造改 resultSets: []；行数统计读 resultSets                                 |
| 10  | `apiScript` 脚本 API                             | ctx.response.data 兼容视图（首集 rows）不破存量脚本；新增 ctx.response.resultSets    |
| 11  | `requestHistoryData.ts`                          | 历史文件 version 1→2 惰性迁移；isResponseData 同步                                   |
| 12  | `factories.createKcbpResponse` / `fakes.ts`      | 测试工厂改新形态                                                                     |
| 13  | 相关测试                                         | requestMapper / kcbpResponse / kcbpCallService / scriptRunner / integration 全量适配 |
| 14  | `parseKcbpResponseStatus` 等                     | 仅用 code/message，零改动（验证项）                                                  |

已核实：`persist.ts` 不持久化响应；响应仅存于内存 store 与请求历史文件。

## 兼容决策

1. **存量脚本**：`ctx.response.data` 以兼容视图保留（值 = 首集 rows），`@deprecated` 响应脚本继续工作
2. **历史文件 v1→v2**：加载时惰性迁移旧条目（平铺 data 包装为单集），写入一律 v2 新格式，旧记录打开不丢
3. 导出功能自动受益：resultSets 恒在，「导出全部结果集」可后续纯增量实现

## 测试计划

- electron：normalizeResultSets 三分支（结构化/平铺/混合）、envelope 空数据、countResponseRows 回归
- renderer：requestMapper outcome 构造、extractMissingParam 遍历各集、历史迁移 v1→v2、脚本兼容视图
- 全量回归：`npm run test:kcbp`、`npm run typecheck`、`npm run test:api`、`npm run test:component`

## 不做的事（YAGNI）

- 不改 UI 交互（下拉选择器维持现状）
- 不做「导出全部结果集」（后续独立需求）
- 不做混合结构的精细容错（统一包装为单集即可）
- 不动 KGBP/KCBP native 层
