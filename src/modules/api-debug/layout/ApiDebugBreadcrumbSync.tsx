import { useSetBreadcrumb } from '../../../platform/shell/useSetBreadcrumb';

/** 页签已提升至 TitleBar，不再占用 breadcrumb 区域 */
export default function ApiDebugBreadcrumbSync() {
    useSetBreadcrumb('');
    return null;
}
