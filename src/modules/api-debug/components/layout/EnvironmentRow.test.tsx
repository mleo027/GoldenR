// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EnvironmentRow from './EnvironmentRow';
import { DEFAULT_DB_CONFIG } from '../../constants/paramSuggest';
import type { KcxpEnvironment } from '../../types/kcxp';

const DB_LABELS = ['数据库地址', '端口', '数据库名', '账号', '密码', '查询超时 (ms)', '最大行数'];

// 口令字段不给固件值：staged-guards 会把「口令字段名赋值 + 引号字面量」判为疑似凭据而拦截提交，
// 本测试只需验证标签关联与其余字段的浅合并，沿用默认空口令即可。
const DB_VALUES = {
    server: '127.0.0.1',
    port: 1433,
    database: 'run',
    user: 'sa',
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

function inputValue(label: string): string {
    return (screen.getByLabelText(label) as HTMLInputElement).value;
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
        expect(inputValue('数据库地址')).toBe('127.0.0.1');
        expect(inputValue('端口')).toBe('1433');
        expect(inputValue('数据库名')).toBe('run');
        expect(inputValue('账号')).toBe('sa');
        expect(inputValue('查询超时 (ms)')).toBe('1000');
        expect(inputValue('最大行数')).toBe('500');
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
        const writeSwitch = screen.getByLabelText('允许自动化 SQL 写入') as HTMLButtonElement;
        expect(writeSwitch.disabled).toBe(true);
    });

    it('未设置环境类型时禁止开启自动化写库', () => {
        renderRow({ environmentType: undefined });
        const writeSwitch = screen.getByLabelText('允许自动化 SQL 写入') as HTMLButtonElement;
        expect(writeSwitch.disabled).toBe(true);
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
        const deleteButton = screen.getByRole('button', { name: '删除环境' }) as HTMLButtonElement;
        expect(deleteButton.disabled).toBe(true);
    });
});
