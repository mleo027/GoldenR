import { useEffect, useMemo, useState, lazy, Suspense, memo } from 'react';
import { Spin } from 'antd';
import { AppstoreOutlined, CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import Grid from '../../../../components/ui/Grid';
import ResponseIdleMetrics from './ResponseIdleMetrics';
import ResponseMeta from './ResponseMeta';
import ResponseTableTools from '../../../../components/ui/ResponseTableTools';
import type { ResponseData } from '../../types/workspace';
import { useActiveTab } from '../../store/useTabs';
import { useAppEnv } from '../../../../store/useAppEnv';
import { useKcbpCall } from '../../hooks/useKcbpCall';
import { useResponse } from '../../store/useResponse';
import { parseMsgtypeFromAddress } from '../../utils/workspace/caseLabel';

const ResponseFullscreenModal = lazy(() => import('./ResponseFullscreenModal'));

const EMPTY_RESPONSE_ROWS: Record<string, unknown>[] = [];

interface ResponsePanelProps {
    responseCollapsed?: boolean;
    onToggleResponseCollapse?: () => void;
}

interface ResponseBodyProps {
    response: ResponseData | undefined;
    responseData: Record<string, unknown>[];
    searchKeyword: string;
    showRowIndex: boolean;
    loading: boolean;
    activeTabAddress: string;
    activeTabName: string;
    responseCollapsed: boolean;
    onToggleResponseCollapse?: () => void;
    onSearchKeywordChange: (value: string) => void;
    onFullscreen: () => void;
}

const ResponseBody = memo(function ResponseBody({
    response,
    responseData,
    searchKeyword,
    showRowIndex,
    loading,
    activeTabAddress,
    activeTabName,
    responseCollapsed,
    onToggleResponseCollapse,
    onSearchKeywordChange,
    onFullscreen,
}: ResponseBodyProps) {
    const hasResponseData = responseData.length > 0;
    const showIdleMetrics = !hasResponseData;

    const footerStart = useMemo(
        () => (response ? <ResponseMeta response={response} variant="footer" /> : undefined),
        [response],
    );

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="response-section-header">
                <button
                    type="button"
                    className="param-section-toggle response-section-toggle"
                    onClick={onToggleResponseCollapse}
                    aria-expanded={!responseCollapsed}
                >
                    {responseCollapsed ? <CaretRightOutlined /> : <CaretDownOutlined />}
                    <AppstoreOutlined className="param-section-toggle-icon" />
                    <span>响应</span>
                    <span className="param-section-toggle-count">{responseData.length}</span>
                </button>
                {!responseCollapsed && (
                    <div className="response-section-actions">
                        <ResponseTableTools
                            disabled={!hasResponseData}
                            searchKeyword={searchKeyword}
                            onSearchKeywordChange={onSearchKeywordChange}
                            onFullscreen={onFullscreen}
                            exportData={responseData}
                            exportFilename={`${parseMsgtypeFromAddress(activeTabAddress) || activeTabName || 'response'}.csv`}
                        />
                    </div>
                )}
            </div>
            <div
                className={`param-section-body flex flex-col min-h-0${
                    responseCollapsed ? ' param-section-body-collapsed' : ''
                }`}
            >
                {loading && !responseCollapsed ? (
                    <div className="response-loading-bar">
                        <Spin size="small" />
                        <span>请求进行中…</span>
                    </div>
                ) : null}
                <div className="flex-1 overflow-hidden min-w-0 min-h-0">
                    {showIdleMetrics ? (
                        <ResponseIdleMetrics response={response} loading={loading} />
                    ) : (
                        <Grid
                            data={responseData}
                            searchKeyword={searchKeyword}
                            showRowIndex={showRowIndex}
                            loading={loading}
                            footerStart={footerStart}
                        />
                    )}
                </div>
            </div>
        </div>
    );
});

export default function ResponsePanel({
    responseCollapsed = false,
    onToggleResponseCollapse,
}: ResponsePanelProps) {
    const { activeTab } = useActiveTab();
    const { env } = useAppEnv();
    const { loading } = useKcbpCall();
    const { showRowIndex } = env;
    const response = useResponse(activeTab.id);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [fullscreenOpen, setFullscreenOpen] = useState(false);

    const responseData = response?.data ?? EMPTY_RESPONSE_ROWS;

    useEffect(() => {
        setSearchKeyword('');
        setFullscreenOpen(false);
    }, [activeTab.id, response?.calledAt]);

    return (
        <>
            <ResponseBody
                response={response}
                responseData={responseData}
                searchKeyword={searchKeyword}
                showRowIndex={showRowIndex}
                loading={loading}
                activeTabAddress={activeTab.address}
                activeTabName={activeTab.name}
                responseCollapsed={responseCollapsed}
                onToggleResponseCollapse={onToggleResponseCollapse}
                onSearchKeywordChange={setSearchKeyword}
                onFullscreen={() => setFullscreenOpen(true)}
            />
            {fullscreenOpen && (
                <Suspense fallback={null}>
                    <ResponseFullscreenModal
                        open={fullscreenOpen}
                        data={responseData}
                        response={response}
                        searchKeyword={searchKeyword}
                        showRowIndex={showRowIndex}
                        onSearchKeywordChange={setSearchKeyword}
                        onClose={() => setFullscreenOpen(false)}
                    />
                </Suspense>
            )}
        </>
    );
}
