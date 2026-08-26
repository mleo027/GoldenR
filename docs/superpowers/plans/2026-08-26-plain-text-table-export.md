# 响应导出支持纯文本（对齐表格样式） 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 响应表格导出在 CSV 之外新增纯文本格式：点击现有导出按钮先弹格式选择对话框，选「纯文本」后导出列对齐的 `.txt` 表格文件。

**架构：** 纯函数层（`buildAlignedTextTable` 按显示宽度补齐列宽）→ 导出函数层（`exportTableToText` 镜像 `exportTableToCsv`）→ Electron 通道（把 saveCsv/saveHtml/saveIni 三份相同的「校验→弹框→写文件」抽成共享 helper 并新增 `export:saveTxt`）→ UI 层（`ResponseTableTools` 单按钮 + 格式选择 Modal）。规格见 `docs/superpowers/specs/2026-08-26-plain-text-table-export-design.md`。

**技术栈：** TypeScript + React + antd；Electron IPC；vitest。

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/utils/exportTable.ts` | 修改 | 新增显示宽度计算、对齐文本表格构建、`exportTableToText`；抽取浏览器下载通用函数 |
| `src/utils/exportTable.test.ts` | 修改 | 新增纯函数与导出函数单测 |
| `electron/ipc/importExport.ts` | 修改 | 抽取共享保存 helper；新增 `export:saveTxt` |
| `electron/ipc/importExport.test.ts` | 修改 | `export:saveTxt` 用例 |
| `electron/preload.ts` | 修改 | 暴露 `importExport.saveTxt` |
| `src/shared/electron/api.ts` | 修改 | `ImportExportApi` 增加 `saveTxt` 类型 |
| `src/components/ui/ResponseTableTools.tsx` | 修改 | 导出按钮改为弹出格式选择对话框，按格式分发 |

## 任务 1：纯函数与导出函数 — `exportTable.ts`

**文件：**
- 修改：`src/utils/exportTable.ts`
- 测试：`src/utils/exportTable.test.ts`

- [ ] **步骤 1：编写失败的测试**

1a. 修改 mock，增加 `saveTxt`：

```ts
const mockSaveCsvFile = vi.fn();
const mockSaveTxtFile = vi.fn();

vi.mock('../lib/electron', () => ({
    getElectronAPI: () => ({
        importExport: {
            saveCsv: mockSaveCsvFile,
            saveTxt: mockSaveTxtFile,
        },
    }),
}));
```

1b. 更新顶部导入（`exportTableToText` 及其测试留待任务 2）：

```ts
import {
    buildAlignedTextTable,
    buildCsvContent,
    estimateDataSize,
    exportTableToCsv,
    formatDataSize,
} from './exportTable';
```

1c. 在文件末尾追加（仅 `buildAlignedTextTable`；mock 中预留的 `saveTxt: mockSaveTxtFile` 本任务一并加上，供任务 2 直接使用）：

```ts
describe('buildAlignedTextTable', () => {
    it('aligns columns by max display width with two-space gaps', () => {
        const table = buildAlignedTextTable([
            { fundid: '6001001', stkcode: '000001', flag: '买入' },
            { fundid: '6001002', stkcode: '600519', flag: '卖出' },
        ]);
        expect(table).toBe(
            ['fundid   stkcode  flag', '6001001  000001  买入 ', '6001002  600519  卖出 '].join('\n'),
        );
    });

    it('pads cells wider than header including CJK width', () => {
        const table = buildAlignedTextTable([{ name: '长长长的中文名称', qty: 5 }]);
        expect(table).toBe('name            qty\n长长长的中文名称  5  ');
    });

    it('serializes null as empty string and objects as JSON', () => {
        const table = buildAlignedTextTable([{ a: null, b: { x: 1 } }]);
        expect(table).toBe('a  b\n   {"x":1}');
    });
});

describe('exportTableToText', () => {
    beforeEach(() => {
        mockSaveTxtFile.mockReset();
    });

    it('returns empty when data is empty', async () => {
        await expect(exportTableToText([])).resolves.toEqual({ saved: false, reason: 'empty' });
    });

    it('delegates to electron saveTxt when available', async () => {
        mockSaveTxtFile.mockResolvedValue({ saved: true, filePath: 'D:/out.txt' });
        const result = await exportTableToText([{ custid: '1' }], 'response.txt');
        expect(result).toEqual({ saved: true, filePath: 'D:/out.txt' });
        expect(mockSaveTxtFile).toHaveBeenCalledOnce();
    });

    it('returns cancelled when user dismisses dialog', async () => {
        mockSaveTxtFile.mockResolvedValue({ saved: false });
        await expect(exportTableToText([{ custid: '1' }])).resolves.toEqual({
            saved: false,
            reason: 'cancelled',
        });
    });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run src/utils/exportTable.test.ts`
预期：FAIL —— `buildAlignedTextTable` / `exportTableToText` 未导出，用例报错。

- [ ] **步骤 3：实现**

修改 `src/utils/exportTable.ts`：

3a. 把 `escapeCsvCell` 的字符串化逻辑抽为共享函数，并在其上方新增宽度工具：

```ts
function stringifyExportValue(value: unknown): string {
    return value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** CJK 全角字符（汉字、全角标点、韩文等）按 2 个显示宽度计 */
const WIDE_CHAR_RE = /[\u2E80-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF]/;

export function displayWidth(text: string): number {
    let width = 0;
    for (const char of text) {
        width += WIDE_CHAR_RE.test(char) ? 2 : 1;
    }
    return width;
}

function padToWidth(text: string, width: number): string {
    return text + ' '.repeat(Math.max(0, width - displayWidth(text)));
}
```

3b. `escapeCsvCell` 改为复用：

```ts
function escapeCsvCell(value: unknown): string {
    const text = stringifyExportValue(value);
    if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}
```

3c. 在 `buildCsvContent` 之后新增：

```ts
/** 构建列对齐的纯文本表格：列宽取各列最大显示宽度，右侧补空格，列间两个空格 */
export function buildAlignedTextTable(data: Record<string, unknown>[]): string {
    const keys = Object.keys(data[0]);
    const rows = data.map((row) => keys.map((key) => stringifyExportValue(row[key])));
    const widths = keys.map((key, col) =>
        Math.max(displayWidth(key), ...rows.map((row) => displayWidth(row[col]))),
    );
    const lines = [
        keys.map((key, col) => padToWidth(key, widths[col])).join('  '),
        ...rows.map((row) => row.map((cell, col) => padToWidth(cell, widths[col])).join('  ')),
    ];
    return lines.join('\n');
}

export type ExportTextResult =
    | { saved: true; filePath: string }
    | { saved: false; reason: 'empty' | 'cancelled' };
```

3d. **移入任务 2**：`downloadInBrowser` 通用化与 `exportTableToText` 实现依赖 `saveTxt` 类型定义，统一在任务 2 完成。

参考实现（任务 2 使用）——把 `downloadCsvInBrowser` 改名为通用的 `downloadInBrowser(content, mime, filename)`，CSV/TXT 各自调用（txt 自动补 `.txt` 后缀）：

```ts
function downloadInBrowser(content: string, mime: string, filename: string): string {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return anchor.download;
}
```

`downloadCsvInBrowser` 原逻辑改为一行调用：

```ts
    anchor.download 由调用方处理：
    const savedFilename = downloadInBrowser(
        content,
        'text/csv;charset=utf-8',
        filename.endsWith('.csv') ? filename : `${filename}.csv`,
    );
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx vitest run src/utils/exportTable.test.ts`
预期：PASS（buildAlignedTextTable 3 个用例通过，原有用例回归通过）。

- [ ] **步骤 5：Commit**

```bash
git add src/utils/exportTable.ts src/utils/exportTable.test.ts
git commit -m "feat(export): 新增对齐文本表格构建函数（任务 1/3）"
```

---

## 任务 2：导出函数 + Electron 通道 — `exportTableToText` 与 `export:saveTxt`

**文件：**
- 修改：`src/utils/exportTable.ts`、`src/utils/exportTable.test.ts`
- 修改：`electron/ipc/importExport.ts`
- 修改：`electron/ipc/importExport.test.ts`
- 修改：`electron/preload.ts`
- 修改：`src/shared/electron/api.ts`

前置：任务 1 已完成。

- [ ] **步骤 1：编写失败的测试**

1a. `src/utils/exportTable.test.ts`：加入任务 1 步骤 1 中缓着的 mock `saveTxt`、导入 `exportTableToText`，并追加 `exportTableToText` describe 块（代码见任务 1 步骤 1c，此处不再重复）。

1b. `electron/ipc/importExport.test.ts` 的「saves CSV and HTML exports」用例后追加一个用例：

```ts
    it('saves TXT exports through export:saveTxt', async () => {
        mock.showSaveDialog.mockResolvedValueOnce({
            canceled: false,
            filePath: 'C:/data/out.txt',
        });
        const txt = await invoke('export:saveTxt', {
            content: 'a  b\n1  2',
            defaultFilename: 'out',
        });
        expect(txt).toEqual({ saved: true, filePath: 'C:/data/out.txt' });
        expect(mock.writeFile).toHaveBeenCalledWith('C:/data/out.txt', 'a  b\n1  2', 'utf-8');

        mock.showSaveDialog.mockResolvedValueOnce({ canceled: true });
        await expect(
            invoke('export:saveTxt', { content: 'x', defaultFilename: 'out.txt' }),
        ).resolves.toEqual({ saved: false });
        await expect(invoke('export:saveTxt', { content: 1 })).rejects.toThrow();
    });
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run src/utils/exportTable.test.ts electron/ipc/importExport.test.ts`
预期：FAIL —— renderer 侧缺 `exportTableToText`/`saveTxt` mock，IPC 侧报 `Missing handler export:saveTxt`。

- [ ] **步骤 3：实现**

3a. `src/shared/electron/api.ts` 的 `ImportExportApi` 增加：

```ts
    saveTxt(content: string, defaultFilename: string): Promise<SaveFileResult>;
```

3b. `electron/preload.ts` 的 `importExport` 对象中 `saveHtml` 之后增加：

```ts
        saveTxt: (content: string, defaultFilename: string) =>
            invoke('export:saveTxt', { content, defaultFilename }),
```

3c. `electron/ipc/importExport.ts`：把 `registerImportExportIpc` 内 saveCsv/saveHtml/saveIni 三段重复的 handler 体替换为共享 helper。在 `showSaveDialog` 函数之后新增：

```ts
interface SaveFileOptions {
    /** invalidIpcArgument 错误信息中的格式名，如 'CSV export' */
    errorLabel: string;
    dialogTitle: string;
    /** 用户未填扩展名时的兜底默认文件名，如 'response.csv' */
    fallbackFilename: string;
    filterName: string;
    extension: string;
}

async function saveTextFileViaDialog(
    event: Electron.IpcMainInvokeEvent,
    payload: unknown,
    options: SaveFileOptions,
): Promise<{ saved: false } | { saved: true; filePath: string } | { saved: false; error: string }> {
    if (
        !payload ||
        typeof payload !== 'object' ||
        typeof (payload as { content?: unknown }).content !== 'string' ||
        typeof (payload as { defaultFilename?: unknown }).defaultFilename !== 'string'
    ) {
        throw invalidIpcArgument(`Invalid ${options.errorLabel} payload`);
    }
    const typedPayload = payload as { content: string; defaultFilename: string };
    const win = BrowserWindow.fromWebContents(event.sender);
    const ext = options.extension;
    const defaultFilename = typedPayload.defaultFilename.trim() || options.fallbackFilename;
    const defaultPath = defaultFilename.endsWith(`.${ext}`) ? defaultFilename : `${defaultFilename}.${ext}`;

    const result = await showSaveDialog(win, {
        title: options.dialogTitle,
        defaultPath,
        filters: [{ name: options.filterName, extensions: [ext] }],
    });

    if (result.canceled || !result.filePath) {
        return { saved: false as const };
    }

    try {
        await writeFile(result.filePath, typedPayload.content, 'utf-8');
        return { saved: true as const, filePath: result.filePath };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { saved: false as const, error: message };
    }
}
```

四个通道全部改为薄封装（保持原 channel 名、标题、默认名、过滤器不变）：

```ts
    ipcMain.handle('export:saveCsv', withIpcError((event, payload: unknown) =>
        saveTextFileViaDialog(event, payload, {
            errorLabel: 'CSV export',
            dialogTitle: '导出 CSV',
            fallbackFilename: 'response.csv',
            filterName: 'CSV',
            extension: 'csv',
        }),
    ));

    ipcMain.handle('export:saveTxt', withIpcError((event, payload: unknown) =>
        saveTextFileViaDialog(event, payload, {
            errorLabel: 'TXT export',
            dialogTitle: '导出纯文本',
            fallbackFilename: 'response.txt',
            filterName: 'TXT',
            extension: 'txt',
        }),
    ));

    // export:saveHtml、export:saveIni 同样模式：
    // html → errorLabel 'HTML export' / '导出 HTML 报告' / 'report.html' / 'HTML' / 'html'
    // ini  → errorLabel 'INI export' / '导出 INI' / 'project.ini' / 'INI' / 'ini'
```

3d. `src/utils/exportTable.ts`：完成任务 1 步骤 3d（`downloadInBrowser` 通用化）与 3e（`exportTableToText`，此时 `importExport.saveTxt` 类型已存在，直接正式访问）。

- [ ] **步骤 4：运行测试验证通过**

运行：`npx vitest run src/utils/exportTable.test.ts electron/ipc/importExport.test.ts`
预期：PASS（含原有 CSV/HTML/INI IPC 回归用例）。

- [ ] **步骤 5：Commit**

```bash
git add src/utils/exportTable.ts src/utils/exportTable.test.ts electron/ipc/importExport.ts electron/ipc/importExport.test.ts electron/preload.ts src/shared/electron/api.ts
git commit -m "feat(export): 纯文本导出函数与 export:saveTxt 通道（任务 2/3）"
```

---

## 任务 3：UI — 格式选择对话框

**文件：**
- 修改：`src/components/ui/ResponseTableTools.tsx`

前置：任务 2 已完成。

- [ ] **步骤 1：实现格式选择对话框**

修改 `ResponseTableTools.tsx`：

1a. 调整导入：

```ts
import { Button, Input, Modal, Radio, Space, Tooltip, message } from 'antd';
import { exportTableToCsv, exportTableToText } from '../../utils/exportTable';
```

1b. `ExportSuccessDialog` 增加格式标签参数：

```tsx
function ExportSuccessDialog({ filePath, formatLabel }: { filePath: string; formatLabel: string }) {
    Modal.success({
        title: '导出成功',
        centered: true,
        mousePosition: null,
        content: (
            <div className="export-success-modal">
                <p className="export-success-desc">{formatLabel} 文件已保存至：</p>
                <p className="export-success-path">{filePath}</p>
            </div>
        ),
        okText: '知道了',
        width: 520,
    });
}
```

1c. 替换 `exportResponseTable` 为按格式分发（大行量警告共用）：

```tsx
type ExportFormat = 'csv' | 'text';

async function exportResponseTable(
    exportData: Record<string, unknown>[],
    exportFilename: string,
    format: ExportFormat,
): Promise<void> {
    if (exportData.length >= PERFORMANCE_THRESHOLDS.largeExportRows) {
        message.warning(
            `将导出 ${exportData.length} 行数据，文件可能较大，导出过程可能略有延迟`,
            3,
        );
    }

    const result =
        format === 'text'
            ? await exportTableToText(exportData, toTxtFilename(exportFilename))
            : await exportTableToCsv(exportData, exportFilename);
    if (result.saved) {
        ExportSuccessDialog({ filePath: result.filePath, formatLabel: format === 'text' ? 'TXT' : 'CSV' });
    } else if (result.reason === 'empty') {
        message.warning('暂无数据可导出');
    }
}

function toTxtFilename(filename: string): string {
    return `${filename.replace(/\.csv$/i, '')}.txt`;
}
```

1d. 组件内新增状态并把 `handleExport` 改为先弹对话框：

```tsx
    const [formatModalOpen, setFormatModalOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');

    const handleExport = () => {
        setFormatModalOpen(true);
    };

    const handleExportConfirm = async () => {
        setFormatModalOpen(false);
        await exportResponseTable(exportData, exportFilename, exportFormat);
    };
```

1e. JSX：导出按钮 Tooltip 文案改为「导出」，组件返回片段末尾（`</div>` 前）追加对话框：

```tsx
            <Modal
                open={formatModalOpen}
                title="选择导出格式"
                okText="导出"
                cancelText="取消"
                width={380}
                onOk={handleExportConfirm}
                onCancel={() => setFormatModalOpen(false)}
            >
                <Radio.Group
                    value={exportFormat}
                    onChange={(event) => setExportFormat(event.target.value)}
                >
                    <Space direction="vertical">
                        <Radio value="csv">CSV 文件（逗号分隔）</Radio>
                        <Radio value="text">纯文本（对齐表格）</Radio>
                    </Space>
                </Radio.Group>
            </Modal>
```

- [ ] **步骤 2：全量验证**

运行：

```bash
npm run typecheck
npm run test:api
```

预期：typecheck 无错误；6 个套件全部 PASS。另建议手工冒烟：启动应用发起一次查询，分别用两种格式各导出一次，记事本打开 txt 确认列对齐。

- [ ] **步骤 3：Commit**

```bash
git add src/components/ui/ResponseTableTools.tsx
git commit -m "feat(api-debug): 响应导出支持纯文本对齐表格格式（任务 3/3）"
```
