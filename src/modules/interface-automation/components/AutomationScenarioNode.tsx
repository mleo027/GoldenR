import { useState } from 'react';
import {
    CodeOutlined,
    CopyOutlined,
    DeleteOutlined,
    EditOutlined,
    MoreOutlined,
    PauseCircleOutlined,
    PlayCircleOutlined,
} from '@ant-design/icons';
import { Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { Button, Input } from '@/components/ui/primitives';
import type { AutomationScenario } from '@/shared/automation/types';
import { useAutomationStore } from '../store/automationStore';

export default function AutomationScenarioNode({
    scenario,
    depth,
}: {
    scenario: AutomationScenario;
    depth: number;
}) {
    const state = useAutomationStore();
    const [renaming, setRenaming] = useState(false);
    const finishRename = (name: string) => {
        const trimmed = name.trim();
        if (trimmed && trimmed !== scenario.name)
            state.updateScenario(scenario.id, { name: trimmed });
        setRenaming(false);
    };
    const menu: MenuProps['items'] = [
        {
            key: 'run',
            icon: <PlayCircleOutlined />,
            label: '运行此脚本',
            onClick: () => state.requestRun(scenario.id),
        },
        {
            key: 'rename',
            icon: <EditOutlined />,
            label: '重命名',
            onClick: () => setRenaming(true),
        },
        {
            key: 'duplicate',
            icon: <CopyOutlined />,
            label: '复制副本',
            onClick: () => state.duplicateScenario(scenario.id),
        },
        {
            key: 'toggle',
            icon: scenario.enabled ? <PauseCircleOutlined /> : <PlayCircleOutlined />,
            label: scenario.enabled ? '禁用' : '启用',
            onClick: () => state.updateScenario(scenario.id, { enabled: !scenario.enabled }),
        },
        { type: 'divider' },
        {
            key: 'delete',
            danger: true,
            icon: <DeleteOutlined />,
            label: '删除脚本',
            onClick: () => state.removeScenario(scenario.id),
        },
    ];
    return (
        <Dropdown menu={{ items: menu }} trigger={['contextMenu']}>
            <div
                className={`automation-tree-row automation-scenario-row${state.selectedScenarioId === scenario.id ? ' is-active' : ''}`}
                style={{ paddingLeft: 28 + depth * 14 }}
                onClick={() => state.selectScenario(scenario.id)}
                onKeyDown={(event) => {
                    if (event.key === 'F2') {
                        event.preventDefault();
                        setRenaming(true);
                    }
                }}
                role="treeitem"
                tabIndex={0}
                aria-selected={state.selectedScenarioId === scenario.id}
            >
                <span
                    className={`automation-status-dot${scenario.enabled ? ' is-enabled' : ' is-disabled'}`}
                    aria-label={scenario.enabled ? '已启用' : '已禁用'}
                />
                <CodeOutlined className="automation-scenario-icon" />
                {renaming ? (
                    <Input
                        autoFocus
                        className="automation-tree-inline-input"
                        size="sm"
                        defaultValue={scenario.name}
                        onBlur={(event) => finishRename(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') finishRename(event.currentTarget.value);
                            if (event.key === 'Escape') setRenaming(false);
                        }}
                        onClick={(event) => event.stopPropagation()}
                    />
                ) : (
                    <span className="automation-scenario-label">{scenario.name}</span>
                )}
                <Tooltip title="更多操作">
                    <Button
                        className="automation-row-more"
                        variant="ghost"
                        size="sm"
                        icon={<MoreOutlined />}
                        onClick={(event) => event.stopPropagation()}
                    />
                </Tooltip>
            </div>
        </Dropdown>
    );
}
