/**
 * API 调试模块入口（module id: api-debug）。
 *
 * 职责：KCBP 接口调试、入参编辑、脚本自动化、响应展示与运行日志。
 * 目录：components/ UI；store/ 工作区与响应状态；utils/kcbp/ 调用逻辑。
 * 持久化：SQLite 中的 projects、workspace_state 与 api_debug_environments 表。
 * IPC：KCBP rpc:call、入参提示 suggest、数据库脚本 query。
 */
import {
    ApiOutlined,
    SendOutlined,
    UnorderedListOutlined,
    SolutionOutlined,
} from '@ant-design/icons';
import type { AppModuleDefinition } from '../../platform/registry/types';
import { API_DEBUG_MODULE_ID } from './constants/apiDebugEnv';
import { ApiDebugProviders } from './providers/ApiDebugProviders';
import ApiDebugLayout from './layout/ApiDebugLayout';
import ApiDebugBreadcrumbSync from './layout/ApiDebugBreadcrumbSync';
import ApiDebugTitleBarTabs from './layout/ApiDebugTitleBarTabs';
import RequestSettings from './components/layout/RequestSettings';
import ParamSuggestRulesSettings from './components/settings/ParamSuggestRulesSettings';
import { CommonParamsSettingsWrapper } from './components/settings/CommonParamsSettings';
import { flushApiDebugPersistedState } from './persist';

export const apiDebugModule: AppModuleDefinition = {
    id: API_DEBUG_MODULE_ID,
    label: 'API 调试',
    icon: <ApiOutlined />,
    order: 10,
    RootProviders: ApiDebugProviders,
    Layout: ApiDebugLayout,
    BreadcrumbSync: ApiDebugBreadcrumbSync,
    TitleBarSlot: ApiDebugTitleBarTabs,
    flushPersistedState: flushApiDebugPersistedState,
    settingsSections: [
        {
            key: 'api-request',
            label: '请求',
            icon: <SendOutlined />,
            Panel: RequestSettings,
            category: 'core',
            searchKeywords: ['KCXP', '环境', '自动保存', 'Host', 'Queue'],
        },
        {
            key: 'api-rules',
            label: '提示规则',
            icon: <UnorderedListOutlined />,
            Panel: ParamSuggestRulesSettings,
            category: 'general',
            layout: 'wide',
            searchKeywords: ['入参', '智能提示', 'SQL', 'param'],
        },
        {
            key: 'api-common-params',
            label: '公共参数',
            icon: <SolutionOutlined />,
            Panel: CommonParamsSettingsWrapper,
            category: 'general',
            searchKeywords: ['公共参数', '入参', 'orgid', 'funcid'],
        },
    ],
};
