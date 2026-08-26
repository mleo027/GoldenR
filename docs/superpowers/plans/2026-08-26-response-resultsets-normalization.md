# 响应数据归一化：`data` 恒为结果集数组 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 消除响应 JSON 的二义性——IPC 层 `KcbpResponseData.data` 与 renderer 层 `ResponseData.resultSets` 恒为结果集数组，归一化只在 Electron 边界收口一次，下游全部消费方面对单一形态。

**架构：** Electron `kcbp.ts` 新增 `normalizeResultSets()` 作为唯一收口点；renderer 删除 `every(isKcbpResultSet)` 判定与派生逻辑；存量脚本通过 `ctx.response.data` 兼容视图（值=首集 rows）保持不破；请求历史文件 v1→v2 惰性迁移。规格见 `docs/superpowers/specs/2026-08-26-response-resultsets-normalization-design.md`。

**技术栈：** TypeScript；Electron IPC；vitest。

---

## 文件结构

| 文件 | 操作 | 任务 |
|------|------|------|
| `src/shared/kcbp/types.ts` | 修改：data 类型 | 1 |
| `electron/services/kcbp/kcbp.ts` | 修改：normalizeResultSets | 1 |
| `electron/services/kcbp/kcbp.test.ts` | 修改：归一化用例 | 1 |
| `electron/preload.ts` | 类型跟随 | 1 |
| `src/shared/test/response.ts` | ResponseData 重构 | 2 |
| `src/modules/api-debug/services/kcbp/requestMapper.ts` (+test) | 修改 | 2 |
| `src/modules/api-debug/utils/kcbp/kcbpParams.ts` (+test) | 修改签名 | 2 |
| `src/modules/api-debug/utils/kcbp/kcbpResponse.ts` (+test) | 新增 sumResultSetRows | 2 |
| `src/test/factories.ts`、`src/test/fakes.ts` | 工厂新形态 | 2 |
| `src/modules/api-debug/components/response/ResponsePanel.tsx` (+test) | 修改 | 3 |
| `src/modules/api-debug/components/response/ResponseMeta.tsx` | 修改 | 3 |
| `src/modules/api-debug/services/kcbp/scriptRunner.ts` (+test) | 修改+兼容视图 | 3 |
| `src/modules/api-debug/store/requestHistoryData.ts` (+test)、`types/requestHistory.ts` | v1→v2 迁移 | 3 |
| 集成/组件测试 | 全量适配 | 4 |

## 任务 1：类型 + Electron 归一化收口

**文件：** `src/shared/kcbp/types.ts`、`electron/services/kcbp/kcbp.ts`、`electron/services/kcbp/kcbp.test.ts`（若测试文件名不同以实际为准）、`electron/preload.ts`

- [ ] **步骤 1：编写失败的测试**

在 electron kcbp 服务测试中追加：

```ts
describe('normalizeResultSets', () => {
    it('normalizes structured items filling default name and columns', () => {
        expect(
            normalizeResultSets([
                { name: '持仓', columns: ['fundid'], rows: [{ fundid: '6001' }] },
                { rows: [{}] },
            ]),
        ).toEqual([
            { name: '持仓', columns: ['fundid'], rows: [{ fundid: '6001' }] },
            { name: '', columns: [], rows: [{}] },
        ]);
    });

    it('wraps flat rows into a single set with columns from first row', () => {
        expect(normalizeResultSets([{ custid: '1' }, { custid: '2' }])).toEqual([
            { name: '', columns: ['custid'], rows: [{ custid: '1' }, { custid: '2' }] },
        ]);
    });

    it('wraps mixed structures as a single flat set', () => {
        const mixed = [{ rows: [] }, { custid: '9' }];
        expect(normalizeResultSets(mixed)).toEqual([
            { name: '', columns: ['custid', 'rows'], rows: mixed },
        ]);
    });

    it('returns empty array for empty data', () => {
        expect(normalizeResultSets([])).toEqual([]);
    });
});
```

运行：`npm run test:kcbp` —— 预期 FAIL（`normalizeResultSets` 未导出）。

- [ ] **步骤 2：实现**

2a. `src/shared/kcbp/types.ts:33` 的 KcbpResponseData：

```ts
export interface KcbpResponseData {
    code: string;
    msg: string;
    /** 恒为结果集数组（边界已归一化），单结果集即长度 1 */
    data: KcbpResultSet[];
    level?: string;
    stats: {
        timecost: number;
        rows: number;
    };
}
```

2b. `electron/services/kcbp/kcbp.ts`：导入 `KcbpResultSet` 类型，新增并接入：

```ts
function isResultSetLike(item: unknown): boolean {
    return Boolean(
        item &&
            typeof item === 'object' &&
            !Array.isArray(item) &&
            Array.isArray((item as { rows?: unknown }).rows),
    );
}

function toResultSet(item: unknown): KcbpResultSet {
    const source = (item ?? {}) as Record<string, unknown>;
    return {
        name: typeof source.name === 'string' ? source.name : '',
        columns: Array.isArray(source.columns)
            ? source.columns.filter((column): column is string => typeof column === 'string')
            : [],
        rows: source.rows as Record<string, unknown>[],
    };
}

/** 边界归一化：结构化条目补齐缺省字段；平铺行/混合结构包装为单集 */
function normalizeResultSets(data: unknown[]): KcbpResultSet[] {
    if (data.length === 0) return [];
    if (data.every(isResultSetLike)) {
        return data.map(toResultSet);
    }
    const firstRow = data.find(
        (item): item is Record<string, unknown> =>
            Boolean(item && typeof item === 'object' && !Array.isArray(item)),
    );
    return [
        {
            name: '',
            columns: firstRow ? Object.keys(firstRow) : [],
            rows: data as Record<string, unknown>[],
        },
    ];
}

function toNormalizedResult(raw: RawKcbpResponseData, timecost: number): KcbpResponseData {
    return {
        ...raw,
        code: String(raw.code),
        data: normalizeResultSets(raw.data),
        stats: {
            timecost,
            rows: countResponseRows(raw.data),
        },
    };
}
```

注意：`normalizeResultSets` 用 `export function` 导出以供测试；错误/envelope 路径的 `data: []` 不动。

2c. `electron/preload.ts:42-47` 仅类型跟随，无代码变化（编译器校验）。

- [ ] **步骤 3：运行测试验证通过**

运行：`npm run test:kcbp`
预期：renderer 侧可能因类型未改出现编译失败——本任务只要求 electron 套件 PASS；若 vitest 因 TS 类型报错阻塞，先完成任务 2 步骤 1-2 的类型部分再跑。**推荐顺序：先完成任务 2 的类型改动（response.ts / factories / fakes），再统一跑测试。**

- [ ] **步骤 4：Commit**

```bash
git add src/shared/kcbp/types.ts electron/services/kcbp electron/preload.ts src/shared/test/response.ts src/test/factories.ts src/test/fakes.ts
git commit -m "refactor(kcbp): 响应 data 归一化为结果集数组（1/4）"
```

## 任务 2：Renderer 核心类型与派发层

**文件：** `src/shared/test/response.ts`、`requestMapper.ts`(+test)、`kcbpParams.ts`(+test)、`kcbpResponse.ts`(+test)、`factories.ts`、`fakes.ts`

前置：任务 1 类型已就位。

- [ ] **步骤 1：更新测试（先写失败测试）**

1a. `src/test/factories.ts` createKcbpResponse：

```ts
export function createKcbpResponse(overrides: Partial<KcbpResponseData> = {}): KcbpResponseData {
    return {
        code: '0',
        msg: 'ok',
        data: [{ name: '', columns: ['custid'], rows: [{ custid: '1' }] }],
        stats: { timecost: 12, rows: 1 },
        ...overrides,
    };
}
```

1b. `requestMapper.test.ts`：所有 mock 响应按工厂新形态改写；断言从 `expect(outcome.response.data).toEqual([...])` 改为：

```ts
expect(outcome.response.resultSets).toEqual([
    { name: '', columns: ['custid'], rows: [{ custid: '1' }] },
]);
```

多结果集用例：`createKcbpResponse({ data: [setA, setB] })` 断言 `resultSets` 原样保留两个集合。

1c. `kcbpParams.test.ts`：`extractMissingParamFromKcbpResponse` 调用处第三个参数从平铺行改为结果集数组：

```ts
// 旧: extractMissingParamFromKcbpResponse(code, msg, [{ msg: '缺少参数 stkcode', code: '-1' }])
// 新:
extractMissingParamFromKcbpResponse(code, msg, [
    { name: '', columns: ['msg'], rows: [{ msg: '缺少参数 stkcode', code: '-1' }] },
]);
```

并新增跨集遍历用例：

```ts
it('scans every result set rows for missing param hints', () => {
    const found = extractMissingParamFromKcbpResponse('-1', 'fail', [
        { name: 'a', columns: [], rows: [{ foo: 1 }] },
        { name: 'b', columns: [], rows: [{ msg: '资金不足', code: '1001' }] },
    ]);
    expect(found).toEqual({ name: 'stkcode', value: '' }); // 以 tryExtractMissingParam 实际规则为准对齐现有用例期望
});
```

1d. `kcbpResponse.test.ts`：新增 sumResultSetRows 用例：

```ts
import { parseKcbpResponseStatus, sumResultSetRows } from './kcbpResponse';

describe('sumResultSetRows', () => {
    it('sums rows across all sets', () => {
        expect(
            sumResultSetRows([
                { name: 'a', columns: [], rows: [{}, {}] },
                { name: 'b', columns: [], rows: [{}] },
            ]),
        ).toBe(3);
    });
    it('returns 0 for empty sets', () => {
        expect(sumResultSetRows([])).toBe(0);
    });
});
```

- [ ] **步骤 2：实现**

2a. `src/shared/test/response.ts`：

```ts
export interface ResponseData {
    code: string | number;
    message: string;
    /** 恒为结果集数组（IPC 层已归一化） */
    resultSets: KcbpResultSet[];
    calledAt?: number;
    stats?: {
        timecost: number;
        rows: number;
    };
}
```

2b. `requestMapper.ts` buildKcbpCallOutcome（删除 isKcbpResultSet 与 every 判定）：

```ts
export function buildKcbpCallOutcome(
    tab: Pick<TabData, 'params'>,
    address: string,
    fallbackName: string,
    raw: KcbpResponseData,
): KcbpCallOutcome {
    const msgtype = parseKcbpAddress(address).msgtype.trim() || fallbackName;
    const response: KcbpCallOutcome['response'] = {
        code: raw.code,
        message: raw.msg,
        resultSets: raw.data,
        stats: raw.stats,
        calledAt: Date.now(),
    };

    const missingParam = extractMissingParamFromKcbpResponse(raw.code, raw.msg, raw.data);
    const nextParams = missingParam
        ? mergeParamIntoList(tab.params, missingParam.name, missingParam.value)
        : tab.params;

    return {
        response,
        nextParams,
        status: parseKcbpResponseStatus(response),
        missingParam,
        msgtype,
    };
}
```

同步清理：`toGridRows`/`isKcbpResultSet` 若不再被本文件使用则删除（grep 确认无其他引用后）。

2c. `kcbpParams.ts`：

```ts
export function extractMissingParamFromKcbpResponse(
    code: string | number,
    msg: string,
    resultSets: KcbpResultSet[] = [],
): { name: string; value: string } | null {
    const fromTop = tryExtractMissingParam(code, msg);
    if (fromTop) return fromTop;

    for (const set of resultSets) {
        for (const row of set.rows) {
            const rowMsg = (row as Record<string, unknown> | null)?.msg;
            if (rowMsg == null) continue;
            const rowCode = (row as Record<string, unknown>).code ?? '';
            const extracted = tryExtractMissingParam(String(rowCode), String(rowMsg));
            if (extracted) return extracted;
        }
    }
    return null;
}
```

2d. `kcbpResponse.ts` 新增：

```ts
export function sumResultSetRows(resultSets: KcbpResultSet[]): number {
    return resultSets.reduce((total, set) => total + set.rows.length, 0);
}
```

- [ ] **步骤 3：运行验证**

运行：`npx vitest run src/modules/api-debug/services src/modules/api-debug/utils src/test`
预期：requestMapper/kcbpParams/kcbpResponse 相关 PASS；scriptRunner/integration 因后续任务未完成仍 FAIL——属预期，任务 3/4 收口。

- [ ] **步骤 4：Commit**

```bash
git add src/shared/test/response.ts src/modules/api-debug/services src/modules/api-debug/utils src/test
git commit -m "refactor(api-debug): renderer 响应模型归一化为 resultSets（2/4）"
```

## 任务 3：UI + 脚本兼容 + 历史迁移

**文件：** `ResponsePanel.tsx`(+test)、`ResponseMeta.tsx`、`scriptRunner.ts`(+test)、`requestHistoryData.ts`(+test)、`types/requestHistory.ts`

- [ ] **步骤 1：实现**

1a. `ResponsePanel.tsx:162-165`：

```tsx
    const resultSets = response?.resultSets ?? [];
    const selectedResultSet = resultSets[selectedResultSetIndex];
    const responseData = selectedResultSet?.rows ?? EMPTY_RESPONSE_ROWS;
```

（删除 `?? response?.data` fallback 分支）

1b. `ResponseMeta.tsx` 两处（Footer 约 L107、Details 约 L102-104）：

```tsx
const dataSize = formatDataSize(response.resultSets);
// Details 中：
const rowCount = response.stats?.rows ?? sumResultSetRows(response.resultSets);
// 数据大小 Tag 的条件：
{response.resultSets.length > 0 && (...)}
```

顶部导入 `sumResultSetRows`。`formatDataSize` 签名 `Record<string, unknown>[]` 与 `KcbpResultSet[]` 结构兼容，直接传入即可（如 TS 报错则把 `formatDataSize`/`estimateDataSize` 泛型放宽为 `unknown[]`）。

1c. `scriptRunner.ts`：

- L246、L308 两处构造：`data: []` → `resultSets: []`
- L128 行数统计：

```ts
const rows =
    lastOutcome.response.stats?.rows ??
    lastOutcome.response.resultSets.reduce((total, set) => total + set.rows.length, 0);
```

- **脚本兼容视图**：`call()` 返回前包装（L123 附近）：

```ts
        const response = lastOutcome.response;
        callSteps.push({
            index: callCounter,
            msgtype: callMsgtype,
            fields: { ...normalized.fields },
            response,
            durationMs: Date.now() - startedAt,
        });
        if (editorMode === 'tcd') {
            const rows = response.stats?.rows ?? response.resultSets.reduce((t, s) => t + s.rows.length, 0);
            consoleCapture.append('log', `[call #${step.index}] ...`);
        }
        // 兼容视图：存量脚本依赖 ctx.call()/ctx.response.data 为平铺行
        return { ...response, data: response.resultSets[0]?.rows ?? [] };
```

同文件内若有其他向脚本暴露 `response` 的 ctx 构造点（grep `response:` 于 executeCase/scriptRunner），一律套用 `{ ...response, data: firstRows }` 视图。

1d. `types/requestHistory.ts`：`RequestHistoryFile.version: 1` → `version: 2`。

1e. `requestHistoryData.ts`：

```ts
/** v1 条目迁移：旧 response.data（平铺行）包装为单集 resultSets */
function migrateResponse(value: unknown): Record<string, unknown> {
    const response = { ...(value as Record<string, unknown>) };
    if (!Array.isArray(response.resultSets)) {
        const legacyRows = Array.isArray(response.data) ? response.data : [];
        const firstRow = legacyRows.find(
            (item): item is Record<string, unknown> =>
                Boolean(item && typeof item === 'object' && !Array.isArray(item)),
        );
        response.resultSets = [
            { name: '', columns: firstRow ? Object.keys(firstRow) : [], rows: legacyRows },
        ];
    }
    delete response.data;
    return response;
}

function migrateEntry(entry: RequestHistoryEntry): RequestHistoryEntry {
    return { ...entry, response: migrateResponse(entry.response) as RequestHistoryEntry['response'] };
}
```

`loadRequestHistory` 接受 version 1 或 2，v1 条目逐个 `migrateEntry` 后返回；`isResponseData` 改为校验 `resultSets` 数组（v2 形态），v1 判定走 `Array.isArray(response.data)` 分支再迁移；`saveRequestHistory` 写 `version: 2`。新增测试：写入后读回 round-trip；手工构造 v1 JSON 读回得到迁移后的 resultSets。

- [ ] **步骤 2：运行组件与服务测试**

运行：`npm run test:kcbp && npm run test:component`
预期：PASS（ResponsePanel.test.tsx 若引用了 `data` 字段构造 response，按新形态改写 fixture——只留 `resultSets`）。

- [ ] **步骤 3：Commit**

```bash
git add src/modules/api-debug
git commit -m "refactor(api-debug): UI/脚本/历史适配归一化响应模型（3/4）"
```

## 任务 4：集成回归与收尾

- [ ] **步骤 1：修复集成测试**

运行 `npm run test:integration`，将 `kcbpCallProvider.integration.test.tsx` 等 fixture 按工厂新形态改写（`createKcbpResponse` 已是新形态，多数断言只需跟随类型）。

- [ ] **步骤 2：全量验证**

```bash
npm run typecheck
npm run test:api
npm run test:component
npm run test:integration
```

全部 PASS 后执行残留检查：`grep -rn "isKcbpResultSet" src/` 应无生产代码引用；`grep -rn "\.data" src/modules/api-debug/components/response src/modules/api-debug/store --include="*.tsx" --include="*.ts"` 逐一确认剩余 `.data` 引用均为脚本兼容视图或无关字段。

- [ ] **步骤 3：Commit**

```bash
git add -A
git commit -m "refactor(api-debug): 响应数据归一化收尾与全量回归（4/4）"
```
