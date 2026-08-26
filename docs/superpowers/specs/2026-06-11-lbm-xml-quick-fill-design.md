# KGBP `<lbm>` XML 模板快速填充入参 — 设计文档

日期：2026-06-11
状态：已确认

## 背景

api-debug 模块的「快速填充入参」目前支持三种文本格式（日志格式、行内 `key:value` 格式、纯文本行格式）。KGBP 协议调试时，用户手上常见的是 `<lbm>` XML 接口定义模板，需要能直接粘贴并自动填充。

模板示例结构：

```xml
<lbm name="O100410512" describe="当日成交查询" node_id="4" channel="300000000001">
    <param name="funcid" datatype="C" defaultvalue="O100410512" InHareSocketDataType="S" allownull="yes"/>
    ...
</lbm>
```

## 需求映射

| 来源 | 去向 |
|------|------|
| `<lbm>` 的 `name` 属性 | funcid（→ 入参 + 地址栏 msgtype） |
| `<lbm>` 的 `node_id` 属性 | 地址栏 query `nodeid=` |
| `<lbm>` 的 `service_name` 属性 | 地址栏 query `service=` |
| `<lbm>` 的 `describe` 属性 | 接口标题（title） |
| 每个 `<param>` 的 `name` / `defaultvalue` | 入参 key / value |
| 其他属性（datatype、InHareSocketDataType、allownull、channel 等） | 忽略 |

关键决策（用户已确认）：

1. **node_id / service_name 填地址栏**，不作为普通入参——与现有 KGBP 请求构建逻辑（`requestMapper.ts` 从 `parseKcbpAddress` 取 service/nodeId）一致。
2. **describe → 接口名称**，复用现有 title 通道。
3. 实现采用**方案 1**：扩展 `parseQuickFillText`，正则解析（不依赖 DOMParser，node 测试环境可直测）。

## 设计

### 1. 解析层 — `src/modules/api-debug/utils/workspace/paramText.ts`

**格式检测**：`parseQuickFillText` 分支最前面新增 `isLbmXmlText(text)`（`/<\s*lbm[\s>]/.test(trimmed)`），命中走 `parseLbmXmlParams(text)`。

**结果类型扩展**：

```ts
// ParseQuickFillResult 新增可选字段（其他格式恒为 undefined）
service?: string;   // lbm@service_name → 地址栏 ?service=
nodeId?: string;    // lbm@node_id     → 地址栏 ?nodeid=
```

**解析函数**（纯函数）：

- 取 `<lbm ...>` 开标签属性串，用属性正则 `(\w+)\s*=\s*"([^"]*)"` 提取：
  - `name` → `msgtype`
  - `describe` → `title`
  - `service_name` → `service`（空串视为未提供）
  - `node_id` → `nodeId`（同上）
- `<param\b[^>]*>` 全局遍历，每个标签提取 `name` 与 `defaultvalue`（缺省按空串），生成 `ParamItem { name, value, type: 'string' }`
- **funcid 规则**：若结果中无 `funcid` 参数且 `msgtype` 存在，`unshift({ name: 'funcid', value: msgtype })`；已有则保留其 defaultvalue
- 找不到任何 `<param>` 或 lbm 缺 `name` 属性时返回 `{ ok: false, error }`（沿用现有错误文案风格）

### 2. 应用层 — `RequestPanel.handleQuickFillApply`

result 携带 `service` / `nodeId` 时合并进地址栏 parts 再序列化；未提供的字段保留地址栏原值：

```ts
const parts = parseKcbpAddress(activeTab.address);
patch.address = serializeKcbpAddress({
    ...parts,
    ...(result.msgtype ? { msgtype: result.msgtype } : {}),
    ...(result.service ? { service: result.service } : {}),
    ...(result.nodeId ? { nodeId: result.nodeId } : {}),
});
```

UI：`ParamQuickFillModal` 文案与 placeholder 补一句「支持 KGBP `<lbm>` XML 模板」，其余 UI 不动。

### 3. 默认行为约定

- 空 `defaultvalue` 保留为空值参数（与其他格式一致，便于看到全量参数清单）
- 只取第一个 `<lbm>` 标签，不支持多 lbm
- 属性值容错：以双引号为主，单引号做兼容匹配

### 4. 测试与验证

`paramText.test.ts` 新增用例（node 环境，纯函数直测）：

- 真实 lbm XML fixture：params 数量/顺序、funcid=O100410512、msgtype/title/service/nodeId 提取正确
- 无 `service_name` 属性 → service 为 undefined
- param 缺 defaultvalue → 空串；含 datatype 等多余属性 → 忽略
- 单引号属性容错
- 非 XML 文本不误入 lbm 分支（回归）

验证命令：`npm run test:kcbp`、`npm run typecheck`

## 不做的事（YAGNI）

- 不改请求构建侧（requestMapper / kcbpCallService）
- 不加新 UI 入口或独立弹窗
- 不支持文件导入
