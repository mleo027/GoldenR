# 环境配置卡片 UI 重构 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。
>
> **设计依据：** [`docs/2026-09-14-env-settings-ui.md`](./2026-09-14-env-settings-ui.md)（规格已确认，D1/D2/D3 均不做）

**目标：** 修复环境配置卡片因缺失 CSS 导致的布局塌陷，让数据库字段有可见标签、按两列成对排布，开关与删除按钮回到正确位置。

**架构：** 把 `RequestSettings.tsx` 里的 `EnvironmentRow` 抽成独立组件（纯 props、无 store 依赖），内部用 `EnvField`（标签在上）与 `DbPair`（标签在左、成对网格）两个小组件统一「标签 + Tooltip + 控件」结构；`RequestSettings.tsx` 回归纯列表编排。样式层重写 `.kcxp-env-*` 段，零新增颜色 token。

**技术栈：** React 18 + TypeScript、antd 5（`Radio` / `Switch` / `Tooltip` / `Typography` / `Button`）、`@/components/ui/primitives`（`Input` / `Select`）、Vitest + jsdom + @testing-library/react、原生 CSS（`src/styles/shared/settings.css`）。

---

## 文件结构

| 文件                                                                      | 职责                                                                                      |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/modules/api-debug/components/layout/EnvironmentRow.tsx`（新建）      | 单个环境的全部表单 UI：头部（选中/标题/协议/删除）+ 连接参数区块 + 数据库区块。纯 props。 |
| `src/modules/api-debug/components/layout/EnvironmentRow.test.tsx`（新建） | 上述组件的 jsdom 组件测试，不依赖任何 store。                                             |
| `src/modules/api-debug/components/layout/RequestSettings.tsx`（修改）     | 只保留环境列表编排（增/删/选、`applyKcxpEnvironment`、草稿 flush）与自动保存开关。        |
| `src/styles/shared/settings.css`（修改）                                  | `.kcxp-env-*` 样式段重写（当前 677-735 行）。                                             |

**骨架顺序：** 任务 1 提交设计文档 → 任务 2 抽出组件并落地新结构（含测试）→ 任务 3 重建样式 → 任务 4 全量验证。

---

## 预备：解除阻塞（已完成）

`src/platform/registry/app-modules.tsx:1` 的 `ExperimentOutlined` 在用户注释掉接口自动化模块注册后成为未使用导入，`tsc -b` 报 TS6133，pre-commit 钩子无法通过。已移除该导入（`npm run typecheck` 已恢复绿色）。**此项属于用户在途改动，不纳入本计划的任何提交。**

---

## 任务 1：提交设计文档

**文件：**

- 修改：`docs/README.md`（已加入索引行）
- 创建：`docs/2026-09-14-env-settings-ui.md`（规格，已写入）
- 创建：`docs/2026-09-14-env-settings-ui-plan.md`（本计划）

- [ ] **步骤 1：只提交这三个文档路径，避免卷入在途改动**

仓库暂存区存在用户的在途改动（`electron/ipc/importExport.ts`、`electron/ipc/suggest.ts`、`electron/readIniText.ts` 等 11 个文件）。用路径限定提交，这些改动会继续留在暂存区。

```bash
git add docs/README.md docs/2026-09-14-env-settings-ui.md docs/2026-09-14-env-settings-ui-plan.md
git status --short   # 确认只有这三个 docs 路径处于暂存
git commit -- docs/README.md docs/2026-09-14-env-settings-ui.md docs/2026-09-14-env-settings-ui-plan.md -m "docs: spec the environment settings card UI redesign"
```

- [ ] **步骤 2：确认提交结果**

```bash
git log -1 --oneline
git status --short   # 用户的在途改动仍在暂存区未丢失
```

预期：新提交只含三个 docs 文件。

---

## 任务 2：抽出 EnvironmentRow 并落地新结构

**文件：**

- 创建：`src/modules/api-debug/components/layout/EnvironmentRow.test.tsx`
- 创建：`src/modules/api-debug/components/layout/EnvironmentRow.tsx`
- 修改：`src/modules/api-debug/components/layout/RequestSettings.tsx`

- [ ] **步骤 1：编写失败的测试**

创建 `src/modules/api-debug/components/layout/EnvironmentRow.test.tsx`：

```tsx
// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EnvironmentRow from './EnvironmentRow';
import { DEFAULT_DB_CONFIG } from '../../constants/paramSuggest';
import type { KcxpEnvironment } from '../../types/kcxp';

const DB_LABELS = ['数据库地址', '端口', '数据库名', '账号', '密码', '查询超时 (ms)', '最大行数'];

const DB_VALUES = {
  server: '127.0.0.1',
  port: 1433,
  database: 'run',
  user: 'sa',
  password: 'root',
  queryTimeoutMs: 1000,
  maxRows: 500,
};

function createEnvironment(overrides: Partial<KcxpEnvironment> = {}): KcxpEnvironment {
  return {
    id: 'env-1',
    name: 'WIN柜台直连',
    protocol: 'KCBP',
    host: '127.0.0.1:21000',
    queue: 'req1',
    timeout: '15',
    environmentType: 'test',
    allowAutomationSqlWrite: true,
    database: { ...DEFAULT_DB_CONFIG, ...DB_VALUES },
    ...overrides,
  };
}

function renderRow(overrides: Partial<KcxpEnvironment> = {}, canDelete = true) {
  const onChange = vi.fn();
  render(
    <EnvironmentRow
      environment={createEnvironment(overrides)}
      active
      canDelete={canDelete}
      onChange={onChange}
      onSelect={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
  return { onChange };
}

describe('EnvironmentRow', () => {
  afterEach(cleanup);

  it('为每个数据库字段提供可访问名称，而不是只靠 placeholder', () => {
    renderRow();
    for (const label of DB_LABELS) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it('回显数据库字段当前值', () => {
    renderRow();
    expect((screen.getByLabelText('数据库地址') as HTMLInputElement).value).toBe('127.0.0.1');
    expect((screen.getByLabelText('端口') as HTMLInputElement).value).toBe('1433');
    expect((screen.getByLabelText('数据库名') as HTMLInputElement).value).toBe('run');
    expect((screen.getByLabelText('账号') as HTMLInputElement).value).toBe('sa');
    expect((screen.getByLabelText('密码') as HTMLInputElement).value).toBe('root');
    expect((screen.getByLabelText('查询超时 (ms)') as HTMLInputElement).value).toBe('1000');
    expect((screen.getByLabelText('最大行数') as HTMLInputElement).value).toBe('500');
  });

  it('编辑单个数据库字段时保留其余字段', () => {
    const { onChange } = renderRow();
    fireEvent.change(screen.getByLabelText('账号'), { target: { value: 'sa2' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as KcxpEnvironment;
    expect(next.database).toEqual({ ...DEFAULT_DB_CONFIG, ...DB_VALUES, user: 'sa2' });
    expect(next.host).toBe('127.0.0.1:21000');
  });

  it('环境类型为生产时禁止开启自动化写库', () => {
    renderRow({ environmentType: 'production' });
    expect(screen.getByLabelText('允许自动化 SQL 写入')).toBeDisabled();
  });

  it('未设置环境类型时禁止开启自动化写库', () => {
    renderRow({ environmentType: undefined });
    expect(screen.getByLabelText('允许自动化 SQL 写入')).toBeDisabled();
  });

  it('KGBP 协议渲染 ServiceName/NodeId，且不再渲染 KCBP 的 Queue', () => {
    renderRow({ protocol: 'KGBP' });
    expect(screen.getByLabelText(/^ServiceName/)).toBeTruthy();
    expect(screen.getByLabelText(/^NodeId/)).toBeTruthy();
    expect(screen.queryByLabelText('Queue')).toBeNull();
  });

  it('KCBP 协议渲染 Queue 与 Timeout', () => {
    renderRow();
    expect(screen.getByLabelText('Queue')).toBeTruthy();
    expect(screen.getByLabelText('Timeout')).toBeTruthy();
  });

  it('仅剩一个环境时删除按钮禁用', () => {
    renderRow({}, false);
    expect(screen.getByRole('button', { name: '删除环境' })).toBeDisabled();
  });
});
```

**测试设计说明（刻意的取舍）：** 不测试协议 `Select` 的点击切换。antd 5 的 `Select` 依赖 `rc-virtual-list`，在 jsdom 下需要 `fireEvent.mouseDown` + 弹层查询的组合技巧，断言脆弱；而「切换协议」在实现里只是 `updateField('protocol', value)` 的一行透传，其分支渲染已由 KGBP/KCBP 两个用例覆盖。

- [ ] **步骤 2：运行测试验证失败**

```bash
npx vitest run src/modules/api-debug/components/layout/EnvironmentRow.test.tsx
```

预期：FAIL，报 `Failed to resolve import "./EnvironmentRow"`（模块尚不存在）。

- [ ] **步骤 3：创建 EnvironmentRow.tsx**

创建 `src/modules/api-debug/components/layout/EnvironmentRow.tsx`：

```tsx
import type { ReactNode } from 'react';
import { Button, Radio, Switch, Tooltip } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { Input, Select } from '../../../../components/ui/primitives';
import type { KcxpEnvironment, KcxpEnvironmentType, KcxpProtocol } from '../../types/kcxp';
import { DEFAULT_KCBP_TIMEOUT } from '../../utils/kcbp/kcbpAddress';
import { DEFAULT_DB_CONFIG } from '../../constants/paramSuggest';

const PROTOCOL_SELECT_OPTIONS = [
  { value: 'KCBP', label: 'KCBP' },
  { value: 'KGBP', label: 'KGBP' },
  { value: 'KUAB', label: 'KUAB' },
];

const ENVIRONMENT_TYPE_OPTIONS = [
  { value: 'development', label: '开发' },
  { value: 'test', label: '测试' },
  { value: 'uat', label: 'UAT' },
  { value: 'production', label: '生产' },
];

/** 连接参数区字段：标签在控件上方，三列网格内等宽。 */
function EnvField({
  label,
  tip,
  fieldId,
  required,
  children,
}: {
  label: string;
  tip: string;
  fieldId: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="kcxp-env-field">
      <Tooltip title={tip}>
        <label className="kcxp-env-field-label" htmlFor={fieldId}>
          {label}
          {required ? <span className="kcxp-env-field-required">*</span> : null}
        </label>
      </Tooltip>
      {children}
    </div>
  );
}

/** 数据库区字段：标签在控件左侧；成对网格保证跨行标签与控件左缘对齐。 */
function DbPair({
  label,
  tip,
  fieldId,
  children,
}: {
  label: string;
  tip: string;
  fieldId: string;
  children: ReactNode;
}) {
  return (
    <div className="kcxp-env-pair">
      <Tooltip title={tip}>
        <label className="kcxp-env-pair-label" htmlFor={fieldId}>
          {label}
        </label>
      </Tooltip>
      {children}
    </div>
  );
}

export interface EnvironmentRowProps {
  environment: KcxpEnvironment;
  active: boolean;
  canDelete: boolean;
  onChange: (next: KcxpEnvironment) => void;
  onSelect: () => void;
  onDelete: () => void;
}

export default function EnvironmentRow({
  environment,
  active,
  canDelete,
  onChange,
  onSelect,
  onDelete,
}: EnvironmentRowProps) {
  const updateField = <K extends keyof KcxpEnvironment>(field: K, value: KcxpEnvironment[K]) => {
    onChange({ ...environment, [field]: value });
  };

  const isKGBP = (environment.protocol ?? 'KCBP') === 'KGBP';
  const database = environment.database ?? DEFAULT_DB_CONFIG;
  const fieldId = (suffix: string) => `${environment.id}-${suffix}`;

  return (
    <div className={`kcxp-env-row${active ? ' kcxp-env-row-active' : ''}`}>
      <div className="kcxp-env-row-header">
        <Radio checked={active} onChange={onSelect}>
          <Input
            value={environment.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="环境名称"
            size="sm"
            className="kcxp-env-name-input"
            onClick={(e) => e.stopPropagation()}
          />
        </Radio>
        <div className="kcxp-env-row-actions">
          <Select
            value={environment.protocol ?? 'KCBP'}
            options={PROTOCOL_SELECT_OPTIONS}
            onChange={(value) => updateField('protocol', value as KcxpProtocol)}
            size="sm"
            variant="borderless"
            aria-label="协议类型"
          />
          <Tooltip title="删除该环境">
            <span className="inline-flex">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={!canDelete}
                onClick={onDelete}
                className="kcxp-env-delete"
                aria-label="删除环境"
              />
            </span>
          </Tooltip>
        </div>
      </div>

      <div className="kcxp-env-row-fields">
        <section className="kcxp-env-section">
          <div className="kcxp-env-section-head">
            <span className="kcxp-env-section-title">连接配置</span>
          </div>
          <div className="kcxp-env-field-grid">
            <EnvField
              label="Host"
              tip="服务地址与端口，如 127.0.0.1:21000"
              fieldId={fieldId('host')}
            >
              <Input
                id={fieldId('host')}
                value={environment.host}
                onChange={(e) => updateField('host', e.target.value)}
                placeholder="127.0.0.1:21000"
                size="sm"
              />
            </EnvField>
            {isKGBP ? (
              <>
                <EnvField
                  label="ServiceName"
                  tip="网关服务名（必填）"
                  fieldId={fieldId('service')}
                  required
                >
                  <Input
                    id={fieldId('service')}
                    value={environment.service ?? ''}
                    onChange={(e) => updateField('service', e.target.value)}
                    placeholder="网关服务名（必填）"
                    size="sm"
                    status={!environment.service?.trim() ? 'error' : undefined}
                  />
                </EnvField>
                <EnvField label="NodeId" tip="节点 ID（必填）" fieldId={fieldId('nodeId')} required>
                  <Input
                    id={fieldId('nodeId')}
                    value={environment.nodeId ?? ''}
                    onChange={(e) => updateField('nodeId', e.target.value)}
                    placeholder="节点 ID（必填）"
                    size="sm"
                    status={!environment.nodeId?.trim() ? 'error' : undefined}
                  />
                </EnvField>
                <EnvField
                  label="ClientSessionId"
                  tip="会话标识，可留空"
                  fieldId={fieldId('clientSessionId')}
                >
                  <Input
                    id={fieldId('clientSessionId')}
                    value={environment.clientSessionId ?? ''}
                    onChange={(e) => updateField('clientSessionId', e.target.value)}
                    placeholder="可选"
                    size="sm"
                  />
                </EnvField>
                <EnvField
                  label="RequestTimeout"
                  tip="请求超时时间（秒）"
                  fieldId={fieldId('requestTimeout')}
                >
                  <Input
                    id={fieldId('requestTimeout')}
                    value={environment.timeout}
                    onChange={(e) => updateField('timeout', e.target.value)}
                    placeholder={DEFAULT_KCBP_TIMEOUT}
                    size="sm"
                  />
                </EnvField>
              </>
            ) : (
              <>
                <EnvField
                  label="Queue"
                  tip="KCBP 请求队列名称，需与柜台配置一致"
                  fieldId={fieldId('queue')}
                >
                  <Input
                    id={fieldId('queue')}
                    value={environment.queue}
                    onChange={(e) => updateField('queue', e.target.value)}
                    placeholder="req1"
                    size="sm"
                  />
                </EnvField>
                <EnvField label="Timeout" tip="请求超时时间（秒）" fieldId={fieldId('timeout')}>
                  <Input
                    id={fieldId('timeout')}
                    value={environment.timeout}
                    onChange={(e) => updateField('timeout', e.target.value)}
                    placeholder={DEFAULT_KCBP_TIMEOUT}
                    size="sm"
                  />
                </EnvField>
              </>
            )}
          </div>
        </section>

        <section className="kcxp-env-section kcxp-env-database-fields">
          <div className="kcxp-env-section-head">
            <span className="kcxp-env-section-title">数据库配置</span>
            <div className="kcxp-env-section-head-actions">
              {/* Select 自身拦鼠标事件，Tooltip 直接包它可能不弹；用 span 承接悬浮 */}
              <Tooltip title="决定是否允许自动化写库；生产环境强制禁止写入">
                <span className="inline-flex">
                  <Select
                    value={environment.environmentType}
                    options={ENVIRONMENT_TYPE_OPTIONS}
                    placeholder="环境类型（未设置时禁止写库）"
                    size="sm"
                    aria-label="环境类型"
                    onChange={(value) => {
                      const environmentType = value as KcxpEnvironmentType;
                      onChange({
                        ...environment,
                        environmentType,
                        allowAutomationSqlWrite:
                          environmentType === 'production'
                            ? false
                            : environment.allowAutomationSqlWrite,
                      });
                    }}
                  />
                </span>
              </Tooltip>
              <Tooltip title="仅在已设置非生产环境类型时可开启">
                <label className="kcxp-env-write-toggle" htmlFor={fieldId('allow-write')}>
                  允许自动化 SQL 写入
                  <Switch
                    id={fieldId('allow-write')}
                    size="small"
                    checked={environment.allowAutomationSqlWrite === true}
                    disabled={
                      !environment.environmentType || environment.environmentType === 'production'
                    }
                    onChange={(value) => updateField('allowAutomationSqlWrite', value)}
                  />
                </label>
              </Tooltip>
            </div>
          </div>

          <div className="kcxp-env-pairs">
            <DbPair label="数据库地址" tip="SQL Server 主机地址" fieldId={fieldId('db-server')}>
              <Input
                id={fieldId('db-server')}
                value={database.server}
                onChange={(e) =>
                  updateField('database', {
                    ...database,
                    server: e.target.value,
                  })
                }
                placeholder="127.0.0.1"
                size="sm"
              />
            </DbPair>
            <DbPair label="端口" tip="SQL Server 端口，默认 1433" fieldId={fieldId('db-port')}>
              <Input
                id={fieldId('db-port')}
                className="kcxp-env-control-narrow"
                value={String(database.port ?? '')}
                onChange={(e) =>
                  updateField('database', {
                    ...database,
                    port: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="1433"
                size="sm"
              />
            </DbPair>
            <DbPair label="数据库名" tip="目标数据库名称" fieldId={fieldId('db-name')}>
              <Input
                id={fieldId('db-name')}
                value={database.database}
                onChange={(e) =>
                  updateField('database', {
                    ...database,
                    database: e.target.value,
                  })
                }
                placeholder="数据库名"
                size="sm"
              />
            </DbPair>
            <DbPair label="账号" tip="数据库登录账号" fieldId={fieldId('db-user')}>
              <Input
                id={fieldId('db-user')}
                value={database.user}
                onChange={(e) =>
                  updateField('database', {
                    ...database,
                    user: e.target.value,
                  })
                }
                placeholder="用户名"
                size="sm"
              />
            </DbPair>
            <DbPair label="密码" tip="数据库登录密码" fieldId={fieldId('db-password')}>
              <Input
                id={fieldId('db-password')}
                value={database.password}
                onChange={(e) =>
                  updateField('database', {
                    ...database,
                    password: e.target.value,
                  })
                }
                placeholder="密码"
                size="sm"
              />
            </DbPair>
            <DbPair
              label="查询超时 (ms)"
              tip="单条 SQL 查询超时时间（毫秒）"
              fieldId={fieldId('db-timeout')}
            >
              <Input
                id={fieldId('db-timeout')}
                className="kcxp-env-control-narrow"
                value={String(database.queryTimeoutMs ?? '')}
                onChange={(e) =>
                  updateField('database', {
                    ...database,
                    queryTimeoutMs: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="查询超时(ms)"
                size="sm"
              />
            </DbPair>
            <DbPair label="最大行数" tip="查询返回的最大行数上限" fieldId={fieldId('db-max-rows')}>
              <Input
                id={fieldId('db-max-rows')}
                className="kcxp-env-control-narrow"
                value={String(database.maxRows ?? '')}
                onChange={(e) =>
                  updateField('database', {
                    ...database,
                    maxRows: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="最大行数"
                size="sm"
              />
            </DbPair>
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **步骤 4：运行测试验证通过**

```bash
npx vitest run src/modules/api-debug/components/layout/EnvironmentRow.test.tsx
```

预期：PASS，8 个用例全绿。

- [ ] **步骤 5：改造 RequestSettings.tsx 使用抽出的组件**

修改 `src/modules/api-debug/components/layout/RequestSettings.tsx`：

1. 删除文件内整段 `EnvironmentRow` 定义（含 `PROTOCOL_SELECT_OPTIONS`、`ENVIRONMENT_TYPE_OPTIONS` 两个常量）与文件末尾的 `import { DEFAULT_DB_CONFIG } from '../../constants/paramSuggest';`。
2. 导入语句收敛为：

```tsx
import { useCallback } from 'react';
import { Button, Switch, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAppEnv } from '../../../../store/useAppEnv';
import { useApiDebugEnv } from '../../store/useApiDebugEnv';
import { useTabsActions } from '../../store/useTabs';
import type { KcxpEnvironment } from '../../types/kcxp';
import {
  createKcxpEnvironment,
  removeKcxpEnvironment,
  replaceKcxpEnvironmentAtIndex,
} from '../../utils/workspace/kcxpEnvironment';
import { flushAllTabDrafts } from '../../utils/workspace/tabDraftRegistry';
import EnvironmentRow from './EnvironmentRow';
```

（移除 `Radio`、`Input`、`Select`、`KcxpEnvironmentType`、`KcxpProtocol`、`DEFAULT_KCBP_TIMEOUT`、`DEFAULT_DB_CONFIG`；`Switch` 保留给「自动保存」。）

3. `RequestSettings` 组件体与其 `useCallback` 全部保持不变（`handleEnvironmentChange` / `handleAddEnvironment` / `handleDeleteEnvironment` / `handleSelectEnvironment` 逐字不动），只把渲染处的 `<EnvironmentRow ... />` 指向新导入的组件。

- [ ] **步骤 6：类型检查与 lint 确认无未使用导入**

```bash
npm run typecheck
npm run lint
```

预期：两者均无输出错误。若 `tsc` 报 TS6133（未使用导入），说明步骤 5 的导入清单有遗漏，按提示删除。

- [ ] **步骤 7：Commit**

```bash
git add src/modules/api-debug/components/layout/EnvironmentRow.tsx \
        src/modules/api-debug/components/layout/EnvironmentRow.test.tsx \
        src/modules/api-debug/components/layout/RequestSettings.tsx
git commit -- src/modules/api-debug/components/layout/EnvironmentRow.tsx \
              src/modules/api-debug/components/layout/EnvironmentRow.test.tsx \
              src/modules/api-debug/components/layout/RequestSettings.tsx \
              -m "refactor(api-debug): extract the environment row and label every field"
```

---

## 任务 3：重建环境卡片样式

**文件：**

- 修改：`src/styles/shared/settings.css:677-735`（现有 `.kcxp-env-*` 整段）

- [ ] **步骤 1：替换整段 `.kcxp-env-*` 规则**

把 `settings.css` 中从 `.kcxp-env-list {` 到 `.kcxp-env-actions { margin-top: 4px; }` 的整段（当前 677-735 行）替换为：

```css
.kcxp-env-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.kcxp-env-row {
  padding: 14px 16px;
  border-radius: var(--radius-control);
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-row-even);
  transition: border-color var(--transition-fast);
}

.kcxp-env-row-active {
  border-color: var(--color-primary);
  background: var(--color-primary-subtle);
}

.kcxp-env-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.kcxp-env-name-input {
  width: 160px;
  font-weight: 600;
}

.kcxp-env-row-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.kcxp-env-delete.ant-btn:hover:not(:disabled) {
  color: var(--color-error);
  background: var(--color-error-bg);
}

/* 卡片内分区块：连接参数 / 数据库配置，用细分隔线区分，避免数据库表单被挤成窄栏 */
.kcxp-env-row-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.kcxp-env-section + .kcxp-env-section {
  padding-top: 14px;
  border-top: 1px solid var(--color-border-light);
}

.kcxp-env-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 12px;
  min-height: var(--control-height-sm);
  margin-bottom: 10px;
}

.kcxp-env-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-title);
}

.kcxp-env-section-head-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

/* 开关贴着文字，且作为 flex 项不参与拉伸——否则会被拉成整行宽的胶囊 */
.kcxp-env-write-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  cursor: pointer;
}

.kcxp-env-write-toggle .ant-switch {
  flex: 0 0 auto;
}

/* 连接参数：三列 */
.kcxp-env-field-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 12px;
}

.kcxp-env-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

/* 标签虚线 + help 光标提示可悬浮查看说明；align-self 防止被纵向 flex 拉满导致虚线贯穿整行 */
.kcxp-env-field-label {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  align-self: flex-start;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 1px dashed var(--color-border);
  cursor: help;
}

.kcxp-env-field-required {
  margin-left: 2px;
  color: var(--color-error);
}

/* 数据库字段：两个「标签 + 控件」成对一行，标签固定 88px 保证跨行对齐 */
.kcxp-env-pairs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 20px;
}

.kcxp-env-pair {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.kcxp-env-pair-label {
  justify-self: start;
  font-size: 12px;
  color: var(--color-text-secondary);
  border-bottom: 1px dashed var(--color-border);
  white-space: nowrap;
  cursor: help;
}

/* 数字类控件收窄：地址类输入更长，端口/超时/行数更短 */
.kcxp-env-control-narrow {
  max-width: 140px;
}

.kcxp-env-actions {
  margin-top: 4px;
}
```

**两处刻意修正（与旧规则不同，属于本次立即可见的修 bug）：**

1. `--color-danger` **在 `tokens.css` 中并不存在**（只有 `--color-error` / `--color-error-bg`），旧的 `.kcxp-env-field-required` 颜色一直静默失效（回退为继承色）。这里改为 `var(--color-error)`。
2. `.kcxp-env-name-input` 增加 `font-weight: 600`，让环境名作为卡片标题与普通文本区分（对应规格要点 5）。

- [ ] **步骤 2：类名死代码棘轮校验**

```bash
npm run style:check
```

预期：输出死类总数 ≤ 基线 83，无 `✖` 行。若报某个 `.kcxp-env-*` 类无人消费，说明该 class 在 `EnvironmentRow.tsx` 中拼写不一致，回到任务 2 步骤 3 修正，**不要**用提高基线的方式绕过。

- [ ] **步骤 3：颜色预算校验**

```bash
npm run color:check
```

预期：`[color-budget] 36 unique non-token colors within budget (40)`（本任务零新增色值，数字应保持不变）。

- [ ] **步骤 4：格式与 lint**

```bash
npx prettier --write src/styles/shared/settings.css src/modules/api-debug/components/layout/EnvironmentRow.tsx src/modules/api-debug/components/layout/EnvironmentRow.test.tsx src/modules/api-debug/components/layout/RequestSettings.tsx
npm run lint
```

预期：prettier 重排缩进；eslint 无错误。（只格式化本次改动的文件，不要跑仓库级 `npm run format`，避免卷入 19 个既有未格式化文件。）

- [ ] **步骤 5：Commit**

```bash
git add src/styles/shared/settings.css
git commit -- src/styles/shared/settings.css -m "style(api-debug): rebuild the environment card layout and fix the token typo"
```

---

## 任务 4：全量验证与视觉确认

- [ ] **步骤 1：组件测试全量**

```bash
npm run test:component
```

预期：PASS，含新增的 8 个用例。

- [ ] **步骤 2：完整单测**

```bash
npm run test
```

预期：PASS（基线 700 个用例 + 新增 8 个）。

- [ ] **步骤 3：质量门禁（提交前）**

```bash
git diff --cached --check
npm run commit:check
```

预期：`staged:check`（staged guards + 颜色预算）、`ipc:check`、`tsc -b`、`eslint .` 全部通过。

- [ ] **步骤 4：手动视觉确认**

```bash
npm run dev
```

打开「设置 → 请求」核对（这是本任务唯一无法自动断言的部分，CSS 在 jsdom 中不可验证）：

- [ ] 数据库配置区不再是一根竖柱，字段按「标签 + 控件」两列成对排布，标签左缘严格对齐；
- [ ] 「允许自动化 SQL 写入」开关是一个正常尺寸的小开关，不再被拉满整行；
- [ ] 环境类型下拉与写入开关位于「数据库配置」标题行右侧，与标题左右分布；
- [ ] 连接参数区（Host / Queue / Timeout）仍是横向三列；
- [ ] 删除按钮 hover 出现红色底与「删除该环境」提示；
- [ ] 环境名输入框加粗显示；
- [ ] 悬浮任一字段标签出现虚线并弹出说明文案；
- [ ] 把协议切到 KGBP，连接参数区变为 ServiceName / NodeId / ClientSessionId / RequestTimeout（3+2 折行），带 `*` 必填标记；
- [ ] 深色主题下分隔线、虚线标签、开关对比度正常；
- [ ] **已知既有问题，本次不修**：`Select` 原语的 `ga-select--sm` / `ga-select--md` 在 `primitives.css` 中没有任何规则，`size="sm"` 实际只落到 antd 的 24px，而同卡片 `Input size="sm"` 是 28px（`--control-height-sm`）。若视觉确认时发现环境类型下拉相对相邻控件偏矮约 4px，记录为既有问题，不在本次修复范围（修它要动 primitives 层，影响所有 Select 调用方）。
- [ ] 多环境（≥2 个）时卡片间距与选中态边框正常。

- [ ] **步骤 5：记录并汇报**

汇报内容：提交号、`npm run commit:check` 结果、`npm run test:component` 通过用例数、以及视觉确认清单的逐项结论。若某项视觉确认不通过，回到任务 3 调整 CSS 后重新走本任务。

---

## 自检记录

**1. 规格覆盖度**

| 规格条目                                          | 对应任务/步骤                                                                     |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| §2 目标 1（数据库区块独立分区、成对排布）         | 任务 2 步骤 3（`kcxp-env-pairs`）+ 任务 3 步骤 1                                  |
| §2 目标 2（开关与环境类型收进标题行）             | 任务 2 步骤 3（`kcxp-env-section-head-actions`）                                  |
| §2 目标 3（字段可见标签 + 悬浮说明）              | 任务 2 步骤 3（`EnvField`/`DbPair`）+ 任务 2 步骤 1 用例 1                        |
| §2 目标 4（标题加粗、删除按钮 hover 红）          | 任务 3 步骤 1（`font-weight`、`.kcxp-env-delete`）                                |
| §2 目标 5（补齐缺失 CSS、两种网格对齐）           | 任务 3 步骤 1                                                                     |
| §3 真实字段映射（7 个字段 + 标签 + tooltip 文案） | 任务 2 步骤 3 + 任务 2 步骤 1 用例 2、3                                           |
| §4.2 数字控件收窄                                 | 任务 3 步骤 1（`.kcxp-env-control-narrow`）                                       |
| §4.3 Tooltip 触发方式（无图标、虚线标签）         | 任务 3 步骤 1 + 任务 2 步骤 3                                                     |
| §4.4 可访问性（id/htmlFor 关联）                  | 任务 2 步骤 3 + 任务 2 步骤 1 用例 1                                              |
| §5 测试策略 5 条                                  | 任务 2 步骤 1（8 个用例）                                                         |
| §6 验证命令                                       | 任务 3 步骤 2-4 + 任务 4 步骤 1-4                                                 |
| §7 D1/D2/D3 不做                                  | 任务 2 步骤 3 保留明文密码 `Input`、保留 `Radio` 包裹输入框、不使用 `InputNumber` |
| §8 风险（死类棘轮 / 颜色预算 / 抽取保语义）       | 任务 3 步骤 2-3、任务 2 步骤 5 第 3 点                                            |

**2. 占位符扫描：** 无「待定 / TODO / 后续实现 / 类似任务 N」；每个步骤都含可执行命令或完整代码。

**3. 类型一致性：**

- 组件对外契约只在任务 2 步骤 3 定义一次：`EnvironmentRowProps { environment, active, canDelete, onChange, onSelect, onDelete }`；任务 2 步骤 5 要求 `RequestSettings` 的回调逐字不变，两侧签名一致。
- 类型名 `KcxpEnvironment` / `KcxpEnvironmentType` / `KcxpProtocol` 均来自 `../../types/kcxp`（再导出 `@/shared/kcxp/types`），任务 2 步骤 3 与步骤 5 引用同一路径。
- CSS 类名在任务 2 步骤 3（TSX）与任务 3 步骤 1（CSS）中逐一对应：`kcxp-env-row-actions`、`kcxp-env-delete`、`kcxp-env-section`、`kcxp-env-section-head`、`kcxp-env-section-title`、`kcxp-env-section-head-actions`、`kcxp-env-write-toggle`、`kcxp-env-field-grid`、`kcxp-env-pairs`、`kcxp-env-pair`、`kcxp-env-pair-label`、`kcxp-env-control-narrow`、`kcxp-env-database-fields`。
- `inline-flex` 为 Tailwind 工具类（v4，已由 `@tailwindcss/vite` 接入，`DbConnectionSettings.tsx` 已有 `grid grid-cols-2 gap-x-4` 先例），不进 `settings.css`，故不参与死类统计。
