import { memo, useCallback, useState } from 'react';
import { App, Input, Modal, Typography } from 'antd';
import type { ParamItem } from '../../types/workspace';
import { parseQuickFillText } from '../../utils/workspace/paramText';

interface ParamQuickFillModalProps {
    open: boolean;
    onClose: () => void;
    onApply: (result: { params: ParamItem[]; msgtype?: string }) => void;
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
        onApply({ params: outcome.params, msgtype: outcome.msgtype });
        const msgtypeHint = outcome.msgtype ? `，功能号 ${outcome.msgtype}` : '';
        message.success(`已全量填充 ${filledCount} 个入参${msgtypeHint}`);
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
            <Input.TextArea
                rows={12}
                value={text}
                spellCheck={false}
                placeholder={`深圳普通买=410411;funcid:410411,custid:600100000570,netaddr:127.0.0.1  abcdefg,...\n\n或粘贴清算日志：\n[入参:clearflow ] [数值:A         ] [说明:清算流程]`}
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
