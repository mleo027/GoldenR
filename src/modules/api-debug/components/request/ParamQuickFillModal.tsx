import { memo, useCallback, useState } from 'react';
import {App, Modal, Typography} from 'antd';
import { parseQuickFillText, type QuickFillPayload } from '../../utils/workspace/paramText';
import { TextArea } from '../../../../components/ui/primitives';

interface ParamQuickFillModalProps {
    open: boolean;
    onClose: () => void;
    onApply: (result: QuickFillPayload) => void;
}

function ParamQuickFillModal({ open, onClose, onApply }: ParamQuickFillModalProps) {
    const { message } = App.useApp();
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleClose = useCallback(() => {
        setText('');
        setError(null);
        onClose();
    }, [onClose]);

    const handleApply = useCallback(() => {
        const outcome = parseQuickFillText(text);
        if (!outcome.ok) {
            setError(outcome.error);
            return;
        }

        const filledCount = outcome.params.length;
        onApply(outcome);
        const titleHint = outcome.title ? `「${outcome.title}」` : '';
        const msgtypeHint = outcome.msgtype ? `，功能号 ${outcome.msgtype}` : '';
        message.success(`已全量填充${titleHint} ${filledCount} 个入参${msgtypeHint}`);
        handleClose();
    }, [handleClose, message, onApply, text]);

    return (
        <Modal
            open={open}
            title="快速填充入参"
            centered
            destroyOnClose
            className="app-modal"
            width={640}
            okText="填充"
            onCancel={handleClose}
            onOk={handleApply}
        >
            <Typography.Paragraph type="secondary" className="text-xs mb-3">
                粘贴日志或调试文本，自动识别入参并替换当前接口的全部参数。
            </Typography.Paragraph>
            <Typography.Paragraph type="secondary" className="text-xs mb-3">
                支持：<code>接口名=功能号;key:value,key:value</code> 与{' '}
                <code>[入参:key] [数值:value] [说明:...]</code> 两种格式。
            </Typography.Paragraph>
            <Typography.Paragraph type="secondary" className="text-xs mb-3">
                支持 KGBP <code>{'<lbm>'}</code> XML
                模板：自动提取参数默认值及功能号、节点、服务名。
            </Typography.Paragraph>
            <TextArea
                rows={12}
                value={text}
                spellCheck={false}
                placeholder={`深圳普通买=410411;funcid:410411,custid:600100000570,netaddr:127.0.0.1  abcdefg,...\n\n或粘贴日志：\n[入参:clearflow ] [数值:A         ] [说明:清算流程]`}
                className={error ? 'param-text-textarea-error' : undefined}
                onChange={(event) => {
                    setText(event.target.value);
                    if (error) setError(null);
                }}
            />
            {error ? <div className="param-text-error mt-2">{error}</div> : null}
        </Modal>
    );
}

export default memo(ParamQuickFillModal);
