# 响应导出支持纯文本（对齐表格样式）— 设计文档

日期：2026-08-26
状态：已确认

## 背景

响应数据表格的导出目前只支持 CSV（`src/components/ui/ResponseTableTools.tsx` → `src/utils/exportTable.ts` 的 `exportTableToCsv`，Electron 下经 `export:saveCsv` IPC 保存，浏览器下降级为 Blob 下载）。需要新增纯文本导出：内容为无分隔符的 `.txt`，但以列对齐的文本表格呈现，便于在记事本等编辑器中阅读。

## 需求映射（用户已确认）

1. **表格样式 A——对齐空格式**：列宽按内容自动补齐（CJK 全角字符记 2 个显示宽度），列间两个空格分隔；无分隔线、无边框。
2. **入口**：保持单个导出按钮，点击后弹出格式选择对话框（CSV / 纯文本），确认后再进入对应保存流程。
3. 现有 CSV 导出行为完全不变。

## 设计

### 1. 文本表格构建 — `src/utils/exportTable.ts`

新增纯函数：

- `displayWidth(text: string): number` — CJK 全角字符（中文、全角标点、韩文等）计 2，其余计 1。
- `buildAlignedTextTable(data: Record<string, unknown>[]): string` — 列宽取每列所有单元格（含表头）的最大显示宽度；单元格按显示宽度右侧补空格；列间两个空格；首行表头；`\n` 连接。值的字符串化复用 CSV 的规则（null→空串，对象→JSON）。不带 BOM。

示例输出：

```
fundid   stkcode  businessflag
6001001  000001   买入
6001002  600519   卖出
```

### 2. 导出函数

`exportTableToText(data, filename)` 镜像 `exportTableToCsv` 结构：

- 空数据 → `{ saved: false, reason: 'empty' }`
- Electron → 新通道 `importExport.saveTxt(content, filename)`
- 浏览器降级 → Blob 下载（`text/plain;charset=utf-8`，自动补 `.txt` 后缀）
- 编码 UTF-8 不带 BOM（BOM 仅服务 Excel 识别 CSV）

### 3. Electron 通道

新增 `export:saveTxt` IPC（preload 暴露 `importExport.saveTxt`）。实现上把 saveCsv 的「payload 校验 → showSaveDialog → writeFile」抽成共享内部函数，CSV/TXT 两通道分别传入标题（`导出 CSV` / `导出纯文本`）、默认扩展名与文件过滤器。已有 `export:saveCsv` 行为不变。

### 4. UI — `src/components/ui/ResponseTableTools.tsx`

保持单个导出按钮。点击弹出格式选择对话框（antd Modal + Radio.Group：「CSV 文件」「纯文本（对齐表格）」，默认选 CSV），确认后调用对应导出函数；成功弹窗文案按格式显示「CSV 文件已保存至 / TXT 文件已保存至」。大行量警告沿用现有逻辑。响应面板与全屏弹窗共用此组件，一处改动两边生效。调用方 `exportFilename` 不变，后缀由导出函数处理。

### 5. 测试

- `src/utils/exportTable.test.ts`：`buildAlignedTextTable` 基本对齐、中文宽度补齐、空值/对象值序列化；`buildCsvContent` 回归
- `electron/ipc/importExport.test.ts`：`export:saveTxt` 成功保存、用户取消、非法参数
- 验证命令：`npm run test:api` + `npm run typecheck`

## 不做的事（YAGNI）

- 不改 CSV 导出的任何行为与文案语义（仅成功弹窗文案按格式区分）
- 不支持自定义分隔线/边框样式、不导出多个结果集合并文件
- 不做剪贴板复制等其他出口
