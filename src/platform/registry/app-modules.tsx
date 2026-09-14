import { ApiOutlined } from '@ant-design/icons';
import { API_DEBUG_MODULE_ID } from '../../modules/api-debug/constants/apiDebugEnv';
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
    // createLazyAppModule({
    //     id: 'interface-automation',
    //     label: '接口自动化',
    //     icon: <ExperimentOutlined />,
    //     order: 20,
    //     group: 'quality',
    //     searchKeywords: ['automation', 'scenario', 'sql', '接口', '自动化'],
    //     load: () =>
    //         import('../../modules/interface-automation').then(
    //             (module) => module.interfaceAutomationModule,
    //         ),
    // }),
].sort((a, b) => a.order - b.order);
