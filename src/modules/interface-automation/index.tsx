import { ExperimentOutlined } from '@ant-design/icons';
import type { AppModuleDefinition } from '@/platform/registry/types';
import AutomationLayout from './layout/AutomationLayout';
import { flushAutomationWorkspace } from './services/automationData';
import AutomationProviders from './providers/AutomationProviders';

export const interfaceAutomationModule: AppModuleDefinition = {
    id: 'interface-automation',
    label: '接口自动化',
    icon: <ExperimentOutlined />,
    order: 20,
    group: 'quality',
    searchKeywords: ['automation', 'scenario', 'sql', '接口', '自动化'],
    RootProviders: AutomationProviders,
    Layout: AutomationLayout,
    flushPersistedState: flushAutomationWorkspace,
};
