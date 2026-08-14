import { Modal } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import type { ResponseData } from '../../types/workspace';
import Grid from '../../../../components/ui/Grid';
import ResponseTableTools from '../../../../components/ui/ResponseTableTools';
import ResponseMeta from './ResponseMeta';

interface ResponseFullscreenModalProps {
    open: boolean;
    data: Record<string, unknown>[];
    response?: ResponseData | null;
    searchKeyword: string;
    showRowIndex?: boolean;
    onSearchKeywordChange: (value: string) => void;
    onClose: () => void;
}

export default function ResponseFullscreenModal({
    open,
    data,
    response,
    searchKeyword,
    showRowIndex = true,
    onSearchKeywordChange,
    onClose,
}: ResponseFullscreenModalProps) {
    const hasData = data.length > 0;

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width="100%"
            centered={false}
            destroyOnClose
            className="response-fullscreen-modal"
            title={
                <div className="response-fullscreen-header">
                    <div className="response-fullscreen-title">
                        <AppstoreOutlined className="text-emerald-500" />
                        <span>响应数据</span>
                    </div>
                    <ResponseTableTools
                        disabled={!hasData}
                        searchKeyword={searchKeyword}
                        onSearchKeywordChange={onSearchKeywordChange}
                        onFullscreen={onClose}
                        fullscreenActive
                        exportData={data}
                        exportFilename="response-fullscreen.csv"
                    />
                </div>
            }
            styles={{
                body: {
                    height: 'calc(100vh - 110px)',
                    overflow: 'hidden',
                    padding: '12px 16px 16px',
                },
            }}
        >
            <div className="response-fullscreen-body">
                <Grid
                    data={data}
                    searchKeyword={searchKeyword}
                    showRowIndex={showRowIndex}
                    footerStart={response ? <ResponseMeta response={response} /> : undefined}
                />
            </div>
        </Modal>
    );
}
