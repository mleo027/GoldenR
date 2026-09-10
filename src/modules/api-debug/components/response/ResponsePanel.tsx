import { useEffect, useMemo, useState, lazy, Suspense, memo } from 'react';
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
import { getCaseLabel, parseMsgtypeFromAddress } from '../../utils/workspace/caseLabel';
import { useRequestHistoryNavigation } from '../../store/useRequestHistoryNavigation';

const ResponseFullscreenModal = lazy(() => import('./ResponseFullscreenModal'));

const EMPTY_RESPONSE_ROWS: Record<string, unknown>[] = [];

interface ResponsePanelProps {
    responseCollapsed?: boolean;
    onToggleResponseCollapse?: () => void;
}

interface ResponseBodyProps {
    response: ResponseData | undefined;
    responseData: Record<string, unknown>[];
    responseColumns?: string[];
    searchKeyword: string;
    showRowIndex: boolean;
    loading: boolean;
    activeTabAddress: string;
    activeTabName: string;
    responseCollapsed: boolean;
    onToggleResponseCollapse?: () => void;
    onSearchKeywordChange: (value: string) => void;
    onFullscreen: () => void;
    resultSets: NonNullable<ResponseData['resultSets']>;
    selectedResultSetIndex: number;
    onResultSetChange: (index: number) => void;
    traceAvailable: boolean;
    onViewTrace: () => void;
}

const ResponseBody = memo(function ResponseBody({
    response,
    responseData,
    responseColumns,
    searchKeyword,
    showRowIndex,
    loading,
    activeTabAddress,
    activeTabName,
    responseCollapsed,
    onToggleResponseCollapse,
    onSearchKeywordChange,
    onFullscreen,
    resultSets,
    selectedResultSetIndex,
    onResultSetChange,
    traceAvailable,
    onViewTrace,
}: ResponseBodyProps) {
    const hasResponseData = responseData.length > 0;
    const hasSelectedResultSet = resultSets[selectedResultSetIndex] != null;
    const showIdleMetrics = !hasSelectedResultSet;

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
                    aria-label={responseCollapsed ? '展开响应' : '折叠响应'}
                >
                    {responseCollapsed ? <CaretRightOutlined /> : <CaretDownOutlined />}
                    <AppstoreOutlined className="param-section-toggle-icon" />
                    <span>响应</span>
                    {response ? (
                        <span className="param-section-toggle-count">{responseData.length}</span>
                    ) : null}
                </button>
                {resultSets.length > 1 && (
                    <div className="response-result-tabs" role="tablist" aria-label="响应结果集">
                        {resultSets.map((resultSet, index) => {
                            const baseLabel = resultSet.name || `结果集 ${index + 1}`;
                            const duplicateName =
                                resultSets.filter(
                                    (candidate) =>
                                        (candidate.name || `结果集 ${index + 1}`) === baseLabel,
                                ).length > 1;
                            const label = duplicateName ? `${baseLabel} ${index + 1}` : baseLabel;
                            const rowCount = resultSet.rows?.length ?? 0;
                            const selected = selectedResultSetIndex === index;
                            return (
                                <button
                                    key={`${resultSet.name}-${index}`}
                                    type="button"
                                    role="tab"
                                    aria-selected={selected}
                                    className={`response-result-tab${selected ? ' response-result-tab-active' : ''}`}
                                    onClick={() => onResultSetChange(index)}
                                >
                                    <span>{label}</span>
                                    <span className="response-result-tab-count">{rowCount}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
                {!responseCollapsed && (
                    <div className="response-section-actions">
                        <ResponseTableTools
                            disabled={!hasResponseData}
                            searchKeyword={searchKeyword}
                            onSearchKeywordChange={onSearchKeywordChange}
                            onFullscreen={onFullscreen}
                            exportData={responseData}
                            exportFilename={`${parseMsgtypeFromAddress(activeTabAddress) || activeTabName || 'response'}.csv`}
                            traceAvailable={traceAvailable}
                            onViewTrace={onViewTrace}
                        />
                    </div>
                )}
            </div>
            <div
                className={`param-section-body flex flex-col min-h-0${
                    responseCollapsed ? ' param-section-body-collapsed' : ''
                }`}
            >
                <div className="flex-1 overflow-hidden min-w-0 min-h-0">
                    {showIdleMetrics ? (
                        <ResponseIdleMetrics response={response} loading={loading} />
                    ) : (
                        <Grid
                            data={responseData}
                            columnKeys={responseColumns}
                            searchKeyword={searchKeyword}
                            showRowIndex={showRowIndex}
                            loading={loading}
                            footerStart={footerStart}
                        />
                    )}
                </div>
            </div>
            {responseCollapsed && response ? (
                <div className="response-footer">
                    <div className="response-footer-meta">
                        <ResponseMeta response={response} variant="footer" />
                    </div>
                </div>
            ) : null}
        </div>
    );
});

export default function ResponsePanel({
    responseCollapsed = false,
    onToggleResponseCollapse,
}: ResponsePanelProps) {
    const { activeTab, activeCaseIndex } = useActiveTab();
    const { env } = useAppEnv();
    const { loading } = useKcbpCall();
    const { showRowIndex } = env;
    const response = useResponse(activeTab.id);
    const { openTrace } = useRequestHistoryNavigation();
    const [searchKeyword, setSearchKeyword] = useState('');
    const [fullscreenOpen, setFullscreenOpen] = useState(false);
    const [selectedResultSetIndex, setSelectedResultSetIndex] = useState(0);

    const resultSets = response?.resultSets ?? [];
    const selectedResultSet = resultSets[selectedResultSetIndex];
    const responseData = selectedResultSet?.rows ?? EMPTY_RESPONSE_ROWS;
    const responseColumns = selectedResultSet?.columns;
    const traceAvailable = Boolean(response?.trace?.events.length) && !loading;

    useEffect(() => {
        setSearchKeyword('');
        setFullscreenOpen(false);
        setSelectedResultSetIndex(0);
    }, [activeTab.id, response?.calledAt]);

    return (
        <>
            <ResponseBody
                response={response}
                responseData={responseData}
                responseColumns={responseColumns}
                searchKeyword={searchKeyword}
                showRowIndex={showRowIndex}
                loading={loading}
                activeTabAddress={activeTab.address}
                activeTabName={activeTab.name}
                responseCollapsed={responseCollapsed}
                onToggleResponseCollapse={onToggleResponseCollapse}
                onSearchKeywordChange={setSearchKeyword}
                onFullscreen={() => setFullscreenOpen(true)}
                resultSets={resultSets}
                selectedResultSetIndex={selectedResultSetIndex}
                onResultSetChange={(index) => {
                    setSelectedResultSetIndex(index);
                    setSearchKeyword('');
                }}
                traceAvailable={traceAvailable}
                onViewTrace={() => {
                    if (response?.trace) {
                        openTrace(response.trace, getCaseLabel(activeTab, activeCaseIndex));
                    }
                }}
            />
            {fullscreenOpen && (
                <Suspense fallback={null}>
                    <ResponseFullscreenModal
                        open={fullscreenOpen}
                        data={responseData}
                        columnKeys={responseColumns}
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
