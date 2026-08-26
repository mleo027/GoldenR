# KGBP `<lbm>` XML 模板快速填充入参 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 快速填充入参支持直接粘贴 KGBP `<lbm>` XML 模板：`<param>` 的 name/defaultvalue 变成入参，lbm 的 name/describe/node_id/service_name 分别写入地址栏功能号、接口标题、地址栏 nodeid/service。

**架构：** 在现有快速填充管线（`ParamQuickFillModal` → `parseQuickFillText` → `RequestPanel.handleQuickFillApply`）中新增第 4 种格式分支。解析为纯函数正则实现（不依赖 DOMParser），通过扩展 `ParseQuickFillResult`（新增 `service?`/`nodeId?`）把路由信息传给应用层合并进地址栏。UI 仅改提示文案。

**技术栈：** TypeScript + React + antd；vitest（node 环境）；设计规格见 `docs/superpowers/specs/2026-06-11-lbm-xml-quick-fill-design.md`。

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/modules/api-debug/utils/workspace/paramText.ts` | 修改 | 新增 lbm 格式检测与解析函数；扩展结果类型 |
| `src/modules/api-debug/utils/workspace/paramText.test.ts` | 修改 | lbm 解析单测（node 环境直测纯函数） |
| `src/modules/api-debug/components/request/ParamQuickFillModal.tsx` | 修改 | onApply 类型复用新 payload 类型；文案补充 lbm 支持 |
| `src/modules/api-debug/components/request/RequestPanel.tsx` | 修改 | handleQuickFillApply 把 service/nodeId 合并进地址栏 |

## 任务 1：解析层 — lbm XML 解析函数与类型扩展

**文件：**
- 修改：`src/modules/api-debug/utils/workspace/paramText.ts`
- 测试：`src/modules/api-debug/utils/workspace/paramText.test.ts`

- [ ] **步骤 1：编写失败的测试**

在 `paramText.test.ts` 文件末尾追加：

```ts
describe('parseQuickFillText with lbm xml template', () => {
    // 真实模板节选：保留 netaddr（含空格/分号/冒号）、缺省 defaultvalue、多余属性等边界
    const LBM_XML = `<lbm name="O100410512" describe="当日成交查询"  node_id="4" channel="300000000001">
        <param name="funcid"        datatype="C"   defaultvalue="O100410512"           InHareSocketDataType="S"       allownull="yes"/>
        <param name="custid"        datatype="L"   defaultvalue="300000000001"         InHareSocketDataType="S"       allownull="yes"/>
        <param name="netaddr"       datatype="C"   defaultvalue="PC;IIP:10.40.81.6;MAC:000C298A11DA;"            InHareSocketDataType="S"        allownull="yes"/>
        <param name="ticket"        datatype="C"   defaultvalue=""                     InHareSocketDataType="S"       allownull="yes"/>
        <param name="stkcode"       datatype="C"                                       allownull="yes"/>
</lbm>`;

    it('parses lbm template params and routing attributes', () => {
        const result = parseQuickFillText(LBM_XML);
        if (!result.ok) throw new Error(result.error);

        expect(result.msgtype).toBe('O100410512');
        expect(result.title).toBe('当日成交查询');
        expect(result.nodeId).toBe('4');
        expect(result.service).toBeUndefined();

        // 已有 funcid 参数时保留其 defaultvalue，不重复 unshift
        expect(result.params[0]).toEqual({ name: 'funcid', value: 'O100410512', type: 'string' });

        const names = result.params.map((p) => p.name);
        expect(names).toEqual(['funcid', 'custid', 'netaddr', 'ticket', 'stkcode']);

        const custid = result.params.find((p) => p.name === 'custid');
        expect(custid?.value).toBe('300000000001');

        // netaddr 的值含分号、冒号、空格，必须原样保留
        const netaddr = result.params.find((p) => p.name === 'netaddr');
        expect(netaddr?.value).toBe('PC;IIP:10.40.81.6;MAC:000C298A11DA;');
    });

    it('unshifts funcid from lbm name when param list lacks it', () => {
        const result = parseQuickFillText(`<lbm name="410511" node_id="7" service_name="gw.svc">
        <param name="custid" datatype="L" defaultvalue="6001"/>
</lbm>`);
        if (!result.ok) throw new Error(result.error);

        expect(result.params[0]).toEqual({ name: 'funcid', value: '410511', type: 'string' });
        expect(result.service).toBe('gw.svc');
        expect(result.nodeId).toBe('7');
        expect(result.title).toBeUndefined();
    });

    it('treats missing defaultvalue as empty string', () => {
        const result = parseQuickFillText(LBM_XML);
        if (!result.ok) throw new Error(result.error);
        expect(result.params.find((p) => p.name === 'stkcode')).toEqual({
            name: 'stkcode',
            value: '',
            type: 'string',
        });
    });

    it('tolerates single-quoted attributes', () => {
        const result = parseQuickFillText(
            `<lbm name='150501'><param name='custid' defaultvalue='6002'/></lbm>`,
        );
        if (!result.ok) throw new Error(result.error);
        expect(result.msgtype).toBe('150501');
        expect(result.params).toEqual([
            { name: 'funcid', value: '150501', type: 'string' },
            { name: 'custid', value: '6002', type: 'string' },
        ]);
    });

    it('returns error when lbm tag lacks name attribute', () => {
        const result = parseQuickFillText(
            `<lbm node_id="4"><param name="custid" defaultvalue="1"/></lbm>`,
        );
        expect(result.ok).toBe(false);
    });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run src/modules/api-debug/utils/workspace/paramText.test.ts`
预期：FAIL —— lbm 相关用例报错（如 `Cannot read properties of undefined` 或断言失败，因为 lbm 分支尚不存在，文本被当作其他格式解析）。

- [ ] **步骤 3：实现 lbm 解析**

修改 `paramText.ts`：

3a. 扩展结果类型（放在 `ParseQuickFillResult` 定义处）：

```ts
export interface ParseQuickFillResult {
    ok: true;
    params: ParamItem[];
    /** 从日志头或 funcid/g_funcid 入参中解析的功能号，用于更新地址栏 msgtype */
    msgtype?: string;
    /** 从「接口名=功能号;」格式或 lbm@describe 中提取的接口标题 */
    title?: string;
    /** lbm@service_name → 地址栏 ?service=（仅 lbm 格式提供） */
    service?: string;
    /** lbm@node_id → 地址栏 ?nodeid=（仅 lbm 格式提供） */
    nodeId?: string;
}

/** 快速填充成功后的应用载荷（Modal onApply 与 RequestPanel 共用） */
export type QuickFillPayload = Omit<ParseQuickFillResult, 'ok'>;
```

3b. 在文件中（`parseInlineCommaParams` 之后、`parseParamsText` 之前）新增：

```ts
/** 提取 XML 开标签属性串中的属性（兼容双引号/单引号），属性名统一小写 */
function extractXmlAttrs(tagBody: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const attrRe = /([A-Za-z_][\w.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let match: RegExpExecArray | null;
    while ((match = attrRe.exec(tagBody))) {
        attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
    }
    return attrs;
}

function isLbmXmlText(text: string): boolean {
    return /<\s*lbm[\s>]/i.test(text);
}

/** 解析 KGBP <lbm> 接口定义模板：<param> 的 name/defaultvalue 为入参，
 *  lbm 的 name/describe/node_id/service_name 分别映射到 msgtype/title/nodeId/service */
function parseLbmXmlParams(text: string): ParseQuickFillOutcome {
    const lbmMatch = text.match(/<\s*lbm\b([^>]*)>/i);
    if (!lbmMatch) {
        return { ok: false, error: '未找到有效的 <lbm> 标签，请检查粘贴的模板内容' };
    }

    const lbmAttrs = extractXmlAttrs(lbmMatch[1]);
    const msgtype = lbmAttrs.name?.trim();
    if (!msgtype) {
        return { ok: false, error: '<lbm> 标签缺少 name 属性，无法确定功能号' };
    }

    const params: ParamItem[] = [];
    const paramRe = /<\s*param\b([^>]*?)\/?>/gi;
    let paramMatch: RegExpExecArray | null;
    while ((paramMatch = paramRe.exec(text))) {
        const attrs = extractXmlAttrs(paramMatch[1]);
        const name = attrs.name?.trim();
        if (!name) continue;
        params.push({ name, value: attrs.defaultvalue?.trim() ?? '', type: 'string' });
    }

    if (params.length === 0) {
        return { ok: false, error: '未能识别有效入参，请检查文本格式' };
    }

    if (!params.some((p) => p.name === 'funcid')) {
        params.unshift({ name: 'funcid', value: msgtype, type: 'string' });
    }

    const service = lbmAttrs.service_name?.trim() || undefined;
    const nodeId = lbmAttrs.node_id?.trim() || undefined;
    const title = lbmAttrs.describe?.trim() || undefined;

    return {
        ok: true,
        params,
        msgtype,
        ...(service ? { service } : {}),
        ...(nodeId ? { nodeId } : {}),
        ...(title ? { title } : {}),
    };
}
```

3c. 在 `parseQuickFillText` 中接入分支（空文本校验之后、日志格式判断之前）：

```ts
    if (isLbmXmlText(trimmed)) {
        return parseLbmXmlParams(trimmed);
    }
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx vitest run src/modules/api-debug/utils/workspace/paramText.test.ts`
预期：PASS（含原有用例全部通过，无回归）。

- [ ] **步骤 5：Commit**

```bash
git add src/modules/api-debug/utils/workspace/paramText.ts src/modules/api-debug/utils/workspace/paramText.test.ts
git commit -m "feat(api-debug): 快速填充支持 KGBP lbm XML 模板解析"
```

---

## 任务 2：应用层 — 地址栏合并与 UI 文案

**文件：**
- 修改：`src/modules/api-debug/components/request/ParamQuickFillModal.tsx`
- 修改：`src/modules/api-debug/components/request/RequestPanel.tsx`

前置：任务 1 已完成（依赖 `QuickFillPayload` 类型）。

- [ ] **步骤 1：更新 Modal 的类型与文案**

修改 `ParamQuickFillModal.tsx`：

1a. 导入共享类型，替换内联 onApply 类型：

```ts
import type { QuickFillPayload } from '../../utils/workspace/paramText';
import { parseQuickFillText } from '../../utils/workspace/paramText';

interface ParamQuickFillModalProps {
    open: boolean;
    onClose: () => void;
    onApply: (result: QuickFillPayload) => void;
}
```

1b. 支持格式说明段落追加一句（`Typography.Paragraph` 两段之后新增一段）：

```tsx
<Typography.Paragraph type="secondary" className="text-xs mb-3">
    支持 KGBP <code>{'<lbm>'}</code> XML 模板：自动提取参数默认值及功能号、节点、服务名。
</Typography.Paragraph>
```

- [ ] **步骤 2：RequestPanel 合并 service/nodeId 进地址栏**

修改 `RequestPanel.tsx` 的 `handleQuickFillApply`（约 103-119 行）：

2a. 导入改为同时引入类型：

```ts
import { resolveMsgtypeFromParams } from '../../utils/workspace/caseLabel';
import type { QuickFillPayload } from '../../utils/workspace/paramText';
```

2b. 替换整个回调：

```ts
    const handleQuickFillApply = useCallback(
        (result: QuickFillPayload) => {
            flushPending();
            const patch: { params: ParamItem[]; address?: string; name?: string } = {
                params: result.params,
            };
            if (result.msgtype || result.service || result.nodeId) {
                const parts = parseKcbpAddress(activeTab.address);
                patch.address = serializeKcbpAddress({
                    ...parts,
                    ...(result.msgtype ? { msgtype: result.msgtype } : {}),
                    ...(result.service ? { service: result.service } : {}),
                    ...(result.nodeId ? { nodeId: result.nodeId } : {}),
                });
            }
            if (result.title) {
                patch.name = result.title;
            }
            updateTabUndoable(patch, '快速填充参数');
        },
        [activeTab.address, flushPending, updateTabUndoable],
    );
```

说明：`serializeKcbpAddress` 已支持序列化 `service`→`?service=`、`nodeId`→`?nodeid=`（见 `kcbpAddress.ts`），无需改动该文件。lbm 未提供的字段不覆盖地址栏原值。

- [ ] **步骤 3：全量验证**

运行：

```bash
npx vitest run src/modules/api-debug/utils/workspace/paramText.test.ts
npm run typecheck
```

预期：vitest PASS；typecheck 无错误。

- [ ] **步骤 4：Commit**

```bash
git add src/modules/api-debug/components/request/ParamQuickFillModal.tsx src/modules/api-debug/components/request/RequestPanel.tsx
git commit -m "feat(api-debug): lbm 模板填充时同步功能号/节点/服务名到地址栏"
```
