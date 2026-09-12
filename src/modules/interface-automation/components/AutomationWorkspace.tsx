import { useEffect, useMemo, useRef, useState } from 'react';
import {
    CaretRightOutlined,
    EditOutlined,
    FolderOpenOutlined,
    PlayCircleFilled,
    StopOutlined,
} from '@ant-design/icons';
import { Tabs, Tooltip } from 'antd';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Button, Input, Select } from '@/components/ui/primitives';
import type { InputRef } from '@/components/ui/primitives';
import type { KcxpEnvironment } from '@/shared/kcxp/types';
import type {
    AutomationFolder,
    AutomationProject,
    AutomationScenario,
} from '@/shared/automation/types';
import { loadAutomationEnvironments } from '../services/automationEnvironmentData';
import { collectFolderScenarios } from '../utils/folderScenarios';
import { useAutomationStore } from '../store/automationStore';
import { useScenarioMetadata } from '../hooks/useScenarioMetadata';
import { useAutomationRun } from '../hooks/useAutomationRun';
import AutomationReportPanel from './AutomationReportPanel';
import AutomationScriptEditor from './AutomationScriptEditor';
import ScenarioInputs from './ScenarioInputs';
import AutomationEnvironmentWarning from './AutomationEnvironmentWarning';

const environmentTone: Record<NonNullable<KcxpEnvironment['environmentType']>, string> = {
    development: 'is-development',
    test: 'is-test',
    uat: 'is-uat',
    production: 'is-production',
};

function WorkspaceTitle({
    scenario,
    editingTitle,
    setEditingTitle,
    titleInput,
    commitTitle,
}: {
    scenario: AutomationScenario;
    editingTitle: boolean;
    setEditingTitle: (v: boolean) => void;
    titleInput: React.Ref<InputRef>;
    commitTitle: (value: string) => void;
}) {
    return (
        <div className="automation-title-row">
            <PlayCircleFilled className="automation-title-icon" />
            {editingTitle ? (
                <Input
                    ref={titleInput}
                    className="automation-title-input"
                    defaultValue={scenario.name}
                    onBlur={(event) => commitTitle(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') commitTitle(event.currentTarget.value);
                        if (event.key === 'Escape') setEditingTitle(false);
                    }}
                />
            ) : (
                <>
                    <h2>{scenario.name}</h2>
                    <Tooltip title="重命名">
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={<EditOutlined />}
                            onClick={() => setEditingTitle(true)}
                        />
                    </Tooltip>
                </>
            )}
        </div>
    );
}

function WorkspaceToolbar({
    environments,
    environmentId,
    onEnvironmentChange,
    execution,
    onRunCurrent,
    onRunFolder,
}: {
    environments: KcxpEnvironment[];
    environmentId: string;
    onEnvironmentChange: (id: string) => void;
    execution: ReturnType<typeof useAutomationRun>;
    onRunCurrent: () => void;
    onRunFolder: () => void;
}) {
    return (
        <div className="automation-toolbar">
            <Select
                className="automation-environment-select"
                value={environmentId || undefined}
                placeholder="选择 KCXP 环境"
                options={environments.map((item) => ({
                    label: (
                        <span className="automation-environment-option">
                            <i className={environmentTone[item.environmentType ?? 'development']} />
                            {item.name}
                        </span>
                    ),
                    value: item.id,
                }))}
                onChange={(value) => onEnvironmentChange(String(value))}
            />
            <Button
                className="automation-run-button"
                variant="primary"
                icon={<CaretRightOutlined />}
                disabled={execution.running}
                onClick={onRunCurrent}
            >
                运行 <kbd>Ctrl + Enter</kbd>
            </Button>
            <Button
                icon={<FolderOpenOutlined />}
                disabled={execution.running || !environmentId}
                onClick={onRunFolder}
            >
                运行目录
            </Button>
            <Button
                className="automation-stop-button"
                variant="danger"
                icon={<StopOutlined />}
                disabled={!execution.running}
                onClick={() => void execution.cancel()}
            >
                停止
            </Button>
        </div>
    );
}

function WorkspaceHeader({
    scenario,
    project,
    folder,
    environments,
    environmentId,
    onEnvironmentChange,
    editingTitle,
    setEditingTitle,
    titleInput,
    commitTitle,
    execution,
    onRunCurrent,
    onRunFolder,
}: {
    scenario: AutomationScenario;
    project?: AutomationProject;
    folder?: AutomationFolder;
    environments: KcxpEnvironment[];
    environmentId: string;
    onEnvironmentChange: (id: string) => void;
    editingTitle: boolean;
    setEditingTitle: (v: boolean) => void;
    titleInput: React.Ref<InputRef>;
    commitTitle: (value: string) => void;
    execution: ReturnType<typeof useAutomationRun>;
    onRunCurrent: () => void;
    onRunFolder: () => void;
}) {
    const breadcrumb = [project?.name, folder?.name, scenario.name].filter(Boolean).join(' / ');
    return (
        <header className="automation-workspace-header">
            <div className="automation-breadcrumb">接口自动化 / {breadcrumb}</div>
            <WorkspaceTitle
                scenario={scenario}
                editingTitle={editingTitle}
                setEditingTitle={setEditingTitle}
                titleInput={titleInput}
                commitTitle={commitTitle}
            />
            <WorkspaceToolbar
                environments={environments}
                environmentId={environmentId}
                onEnvironmentChange={onEnvironmentChange}
                execution={execution}
                onRunCurrent={onRunCurrent}
                onRunFolder={onRunFolder}
            />
        </header>
    );
}

function WorkspaceEditor({
    scenario,
    metadata,
    inputs,
    changeInput,
    activeEditorTab,
    setActiveEditorTab,
    highlightedLine,
    onUpdateScript,
    report,
    folderReport,
    onGoToLine,
    onRerun,
}: {
    scenario: AutomationScenario;
    metadata: ReturnType<typeof useScenarioMetadata>['metadata'];
    inputs: ReturnType<typeof useScenarioMetadata>['inputs'];
    changeInput: ReturnType<typeof useScenarioMetadata>['changeInput'];
    activeEditorTab: string;
    setActiveEditorTab: (key: string) => void;
    highlightedLine?: number;
    onUpdateScript: (script: string) => void;
    report?: Parameters<typeof AutomationReportPanel>[0]['report'];
    folderReport?: Parameters<typeof AutomationReportPanel>[0]['folderReport'];
    onGoToLine: (line: number) => void;
    onRerun: () => void;
}) {
    return (
        <PanelGroup direction="vertical" className="automation-editor-report">
            <Panel defaultSize={60} minSize={28}>
                <section className="automation-editor-card">
                    <Tabs
                        className="automation-editor-tabs"
                        activeKey={activeEditorTab}
                        onChange={setActiveEditorTab}
                        items={[
                            {
                                key: 'script',
                                label: '脚本代码',
                                children: (
                                    <AutomationScriptEditor
                                        value={scenario.script}
                                        highlightedLine={highlightedLine}
                                        onChange={onUpdateScript}
                                    />
                                ),
                            },
                            {
                                key: 'params',
                                label: `运行时参数 (${Object.keys(metadata?.inputs ?? {}).length})`,
                                children: (
                                    <ScenarioInputs
                                        metadata={metadata}
                                        values={inputs}
                                        onChange={changeInput}
                                    />
                                ),
                            },
                        ]}
                    />
                </section>
            </Panel>
            <PanelResizeHandle className="panel-resize-handle panel-resize-handle-vertical automation-resize-handle" />
            <Panel defaultSize={40} minSize={20}>
                <section
                    className={`automation-report-card${report?.status === 'failed' ? ' is-failed' : ''}`}
                >
                    <AutomationReportPanel
                        report={report}
                        folderReport={folderReport}
                        onGoToLine={onGoToLine}
                        onRerun={onRerun}
                    />
                </section>
            </Panel>
        </PanelGroup>
    );
}

export default function AutomationWorkspace() {
    const state = useAutomationStore();
    const scenario = state.workspace.scenarios.find((item) => item.id === state.selectedScenarioId);
    const folder = state.workspace.folders.find((item) => item.id === scenario?.folderId);
    const project = state.workspace.projects.find((item) => item.id === scenario?.projectId);
    const folderScenarios = useMemo(
        () => (folder ? collectFolderScenarios(state.workspace, folder.id) : []),
        [folder, state.workspace],
    );
    const [environments, setEnvironments] = useState<KcxpEnvironment[]>([]);
    const [environmentId, setEnvironmentId] = useState('');
    const [activeEditorTab, setActiveEditorTab] = useState('script');
    const [editingTitle, setEditingTitle] = useState(false);
    const [highlightedLine, setHighlightedLine] = useState<number>();
    const titleInput = useRef<InputRef>(null);
    const { metadata, inputs, changeInput } = useScenarioMetadata(scenario);
    const execution = useAutomationRun();
    const environment = environments.find((item) => item.id === environmentId);

    useEffect(() => {
        void loadAutomationEnvironments().then((items) => {
            setEnvironments(items);
            setEnvironmentId((current) => current || items[0]?.id || '');
        });
    }, []);
    useEffect(() => {
        if (editingTitle) titleInput.current?.input?.select();
    }, [editingTitle]);
    useEffect(() => {
        if (!state.requestedRunScenarioId || state.requestedRunScenarioId !== scenario?.id) return;
        state.clearRunRequest();
        void execution.runOne(scenario, environment, metadata, inputs);
    }, [environment, execution, inputs, metadata, scenario, state]);
    useEffect(() => {
        const onShortcut = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !execution.running) {
                event.preventDefault();
                void execution.runOne(scenario, environment, metadata, inputs);
            }
        };
        window.addEventListener('keydown', onShortcut);
        return () => window.removeEventListener('keydown', onShortcut);
    }, [environment, execution, inputs, metadata, scenario]);
    if (!scenario) return <div className="automation-empty">请在左侧新建或选择场景</div>;
    const commitTitle = (value: string) => {
        const name = value.trim();
        if (name) state.updateScenario(scenario.id, { name });
        setEditingTitle(false);
    };
    const updateScript = (script: string) => {
        setHighlightedLine(undefined);
        state.updateScenario(scenario.id, { script });
    };
    const runCurrent = () => void execution.runOne(scenario, environment, metadata, inputs);
    const runFolder = () => {
        if (folder && environment) {
            void execution.runFolder(folder, folderScenarios, environment, scenario.id, inputs);
        }
    };
    return (
        <div className="automation-workspace">
            <WorkspaceHeader
                scenario={scenario}
                project={project}
                folder={folder}
                environments={environments}
                environmentId={environmentId}
                onEnvironmentChange={setEnvironmentId}
                editingTitle={editingTitle}
                setEditingTitle={setEditingTitle}
                titleInput={titleInput}
                commitTitle={commitTitle}
                execution={execution}
                onRunCurrent={runCurrent}
                onRunFolder={runFolder}
            />
            <AutomationEnvironmentWarning environment={environment} />
            <WorkspaceEditor
                scenario={scenario}
                metadata={metadata}
                inputs={inputs}
                changeInput={changeInput}
                activeEditorTab={activeEditorTab}
                setActiveEditorTab={setActiveEditorTab}
                highlightedLine={highlightedLine}
                onUpdateScript={updateScript}
                report={state.scenarioReports[scenario.id]}
                folderReport={folder ? state.folderReports[folder.id] : undefined}
                onGoToLine={(line) => {
                    setHighlightedLine(line);
                    setActiveEditorTab('script');
                }}
                onRerun={runCurrent}
            />
        </div>
    );
}
