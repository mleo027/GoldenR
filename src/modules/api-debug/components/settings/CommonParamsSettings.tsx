import { useMemo, useState } from 'react';
import { Button, Input, Modal, Space, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { CommonParamSet } from '../../types/commonParams';
import type { ParamItem } from '../../types/workspace';
import { ParamTable } from '../editor/ParamEdit';
import { useCommonParamsActions, useCommonParamsState } from '../../store/useCommonParams';
import { useTabsState } from '../../store/useTabs';
import { createParamItem } from '../../utils/workspace/paramItem';

export interface CommonParamsSettingsProps {
    sets: CommonParamSet[];
    loaded: boolean;
    mountedCountBySet?: Record<string, number>;
    onAdd: (name: string) => void;
    onRename: (setId: string, name: string) => void;
    onDelete: (setId: string) => void;
    onUpdateParams: (setId: string, params: ParamItem[]) => void;
}

export default function CommonParamsSettings({
    sets,
    loaded,
    mountedCountBySet = {},
    onAdd,
    onRename,
    onDelete,
    onUpdateParams,
}: CommonParamsSettingsProps) {
    const [activeId, setActiveId] = useState<string | null>(sets[0]?.id ?? null);
    const active = sets.find((set) => set.id === activeId) ?? sets[0] ?? null;

    if (!loaded) return <div className="settings-panel">加载中...</div>;

    const confirmDelete = (set: CommonParamSet) => {
        const count = mountedCountBySet[set.id] ?? 0;
        Modal.confirm({
            title: '删除公共参数集',
            content: count > 0
                ? `确定要删除「${set.name}」吗？${count} 个项目正在使用，删除后这些项目将不再注入公共参数。`
                : `确定要删除「${set.name}」吗？`,
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: () => {
                onDelete(set.id);
                setActiveId(null);
            },
        });
    };

    return (
        <div className="settings-panel">
            <Typography.Title level={5} className="settings-panel-title">公共参数</Typography.Title>
            <Typography.Paragraph type="secondary">维护可被项目挂载的公共请求参数集。</Typography.Paragraph>
            <div className="flex gap-4 h-full min-h-0">
                <div className="w-56 shrink-0 flex flex-col gap-2">
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => onAdd(`公共参数 ${sets.length + 1}`)}>
                        新建参数集
                    </Button>
                    <div className="flex flex-col gap-1 overflow-y-auto ui-scroll">
                        {sets.map((set) => (
                            <Space key={set.id} className={set.id === active?.id ? 'font-medium' : ''}>
                                <button type="button" onClick={() => setActiveId(set.id)}>{set.name}</button>
                                <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label={`删除 ${set.name}`} onClick={() => confirmDelete(set)} />
                            </Space>
                        ))}
                    </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    {active ? <>
                        <Input value={active.name} onChange={(event) => onRename(active.id, event.target.value)} />
                        <ParamTable params={active.params} onChange={(params) => onUpdateParams(active.id, params)} />
                        <Button
                            type="dashed"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => onUpdateParams(active.id, [...active.params, createParamItem('')])}
                        >
                            添加参数
                        </Button>
                    </> : <div className="p-8 text-center text-[var(--color-text-muted)]">暂无公共参数集，点击左侧「新建参数集」创建</div>}
                </div>
            </div>
        </div>
    );
}

export function CommonParamsSettingsWrapper() {
    const { sets, loaded } = useCommonParamsState();
    const actions = useCommonParamsActions();
    const { state } = useTabsState();
    const mountedCountBySet = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const project of state.projects) {
            if (project.commonParamSetId) counts[project.commonParamSetId] = (counts[project.commonParamSetId] ?? 0) + 1;
        }
        return counts;
    }, [state.projects]);
    return <CommonParamsSettings sets={sets} loaded={loaded} mountedCountBySet={mountedCountBySet} onAdd={actions.addSet} onRename={actions.renameSet} onDelete={actions.deleteSet} onUpdateParams={actions.updateSetParams} />;
}
