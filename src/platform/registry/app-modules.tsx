import { ApiOutlined, ExperimentOutlined } from '@ant-design/icons';
import { API_DEBUG_MODULE_ID } from '../../modules/api-debug/constants/apiDebugEnv';
import { registerApiDebugCapabilities } from '../../modules/api-debug/capabilities';
import { registerAutomationCapabilities } from '../../modules/interface-automation/capabilities';
import { createLazyAppModule } from './lazyAppModule';

export const APP_MODULES = [
    createLazyAppModule({
        id: API_DEBUG_MODULE_ID,
        label: 'API 调试',
        icon: <ApiOutlined />,
        order: 10,
        group: 'dev',
        searchKeywords: ['api', 'kcbp', 'debug', '接口'],
        load: () => import('../../modules/api-debug').then((module) => module.apiDebugModule),
    }),
    createLazyAppModule({
        id: 'interface-automation',
        label: '接口自动化',
        icon: <ExperimentOutlined />,
        order: 20,
        group: 'quality',
        searchKeywords: ['automation', 'scenario', 'sql', '接口', '自动化'],
        load: () =>
            import('../../modules/interface-automation').then(
                (module) => module.interfaceAutomationModule,
            ),
    }),
].sort((a, b) => a.order - b.order);

/**
 * 组合根是唯一知道"有哪些模块"的地方：在这里把各模块的能力描述注入平台注册表。
 * 只注册描述（静态），实现仍由模块懒加载，因此模块从未被打开过也不影响能力清单。
 */
registerAutomationCapabilities();
registerApiDebugCapabilities();
