import { useEffect, useMemo, useState } from 'react';
import { CaretRightOutlined, FolderOpenOutlined, StopOutlined } from '@ant-design/icons';
import { Button, Switch } from 'antd';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Input, Select } from '@/components/ui/primitives';
import type { KcxpEnvironment } from '@/shared/kcxp/types';
import { loadAutomationEnvironments } from '../services/automationEnvironmentData';
import { collectFolderScenarios } from '../utils/folderScenarios';
import { useAutomationStore } from '../store/automationStore';
import { useScenarioMetadata } from '../hooks/useScenarioMetadata';
import { useAutomationRun } from '../hooks/useAutomationRun';
import AutomationReportPanel from './AutomationReportPanel';
import AutomationScriptEditor from './AutomationScriptEditor';
import ScenarioInputs from './ScenarioInputs';
import AutomationEnvironmentWarning from './AutomationEnvironmentWarning';

export default function AutomationWorkspace() {
    const state = useAutomationStore();
    const scenario = state.workspace.scenarios.find((item) => item.id === state.selectedScenarioId);
    const folder = state.workspace.folders.find((item) => item.id === scenario?.folderId);
    const folderScenarios = useMemo(
        () => (folder ? collectFolderScenarios(state.workspace, folder.id) : []),
        [folder, state.workspace],
    );
    const [environments, setEnvironments] = useState<KcxpEnvironment[]>([]);
    const [environmentId, setEnvironmentId] = useState('');
    const { metadata, inputs, changeInput } = useScenarioMetadata(scenario);
    const execution = useAutomationRun();

    useEffect(() => {
        void loadAutomationEnvironments().then((items) => {
            setEnvironments(items);
            setEnvironmentId((current) => current || items[0]?.id || '');
        });
    }, []);
    const environment = environments.find((item) => item.id === environmentId);
    if (!scenario) return <div className="automation-empty">请在左侧新建或选择场景</div>;
    return (
        <div className="automation-workspace">
            <div className="automation-toolbar">
                <Input
                    className="automation-scenario-name"
                    value={scenario.name}
                    onChange={(event) =>
                        state.updateScenario(scenario.id, { name: event.target.value })
                    }
                />
                <Select
                    className="automation-environment-select"
                    value={environmentId || undefined}
                    placeholder="选择 KCXP 环境"
                    options={environments.map((item) => ({ label: item.name, value: item.id }))}
                    onChange={(value) => setEnvironmentId(String(value))}
                />
                <Switch
                    checked={scenario.enabled}
                    checkedChildren="启用"
                    unCheckedChildren="禁用"
                    onChange={(enabled) => state.updateScenario(scenario.id, { enabled })}
                />
                <Button
                    type="primary"
                    icon={<CaretRightOutlined />}
                    disabled={execution.running}
                    onClick={() => void execution.runOne(scenario, environment, metadata, inputs)}
                >
                    运行
                </Button>
                <Button
                    icon={<FolderOpenOutlined />}
                    disabled={execution.running || !folder}
                    onClick={() =>
                        folder &&
                        environment &&
                        void execution.runFolder(
                            folder,
                            folderScenarios,
                            environment,
                            scenario.id,
                            inputs,
                        )
                    }
                >
                    运行当前目录
                </Button>
                <Button
                    danger
                    icon={<StopOutlined />}
                    disabled={!execution.running}
                    onClick={() => void execution.cancel()}
                >
                    停止
                </Button>
            </div>
            <AutomationEnvironmentWarning environment={environment} />
            <ScenarioInputs metadata={metadata} values={inputs} onChange={changeInput} />
            <PanelGroup direction="vertical" className="automation-editor-report">
                <Panel defaultSize={62} minSize={25}>
                    <AutomationScriptEditor
                        value={scenario.script}
                        onChange={(script) => state.updateScenario(scenario.id, { script })}
                    />
                </Panel>
                <PanelResizeHandle className="panel-resize-handle panel-resize-handle-vertical" />
                <Panel defaultSize={38} minSize={18}>
                    <AutomationReportPanel
                        report={state.scenarioReports[scenario.id]}
                        folderReport={folder ? state.folderReports[folder.id] : undefined}
                    />
                </Panel>
            </PanelGroup>
        </div>
    );
}
