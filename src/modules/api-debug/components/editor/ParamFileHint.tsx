import { useEffect, useState } from 'react';
import { WarningOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { UI_DEBOUNCE_MS } from '../../../../constants/ui';
import { getElectronAPI } from '../../../../lib/electron';
import { formatByteSize } from '../../../../utils/exportTable';
import { parseFileParamPath } from '../../utils/kcbp/kcbpFields';

interface ParamFileHintProps {
    value: string;
    disabled?: boolean;
}

function basename(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    const index = normalized.lastIndexOf('/');
    return index >= 0 ? normalized.slice(index + 1) : normalized;
}

export default function ParamFileHint({ value, disabled = false }: ParamFileHintProps) {
    const filePath = parseFileParamPath(value);
    const [checking, setChecking] = useState(false);
    const [exists, setExists] = useState<boolean | null>(null);
    const [size, setSize] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (disabled || !filePath) {
            setChecking(false);
            setExists(null);
            setSize(null);
            setError(null);
            return;
        }

        const api = getElectronAPI();
        if (!api?.statParamFile) {
            setChecking(false);
            setExists(null);
            setSize(null);
            setError(null);
            return;
        }

        let cancelled = false;
        setChecking(true);
        setExists(null);
        setSize(null);
        setError(null);

        const timer = window.setTimeout(() => {
            void api
                .statParamFile(filePath)
                .then((result) => {
                    if (cancelled) return;
                    if (result.exists) {
                        setExists(true);
                        setSize(result.size);
                        setError(null);
                    } else {
                        setExists(false);
                        setSize(null);
                        setError(result.error);
                    }
                })
                .catch((statError: unknown) => {
                    if (cancelled) return;
                    setExists(false);
                    setSize(null);
                    setError(statError instanceof Error ? statError.message : String(statError));
                })
                .finally(() => {
                    if (!cancelled) {
                        setChecking(false);
                    }
                });
        }, UI_DEBOUNCE_MS.edit);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [disabled, filePath]);

    if (disabled || !filePath) {
        return null;
    }

    if (checking) {
        return (
            <div className="param-file-hint param-file-hint-pending" title="检测文件中">
                <Spin size="small" />
            </div>
        );
    }

    if (exists && size != null) {
        return (
            <div
                className="param-file-hint param-file-hint-ok"
                title={`${basename(filePath)} · ${filePath}`}
            >
                <span className="param-file-size">{formatByteSize(size)}</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="param-file-hint param-file-hint-error" title={`${error} · ${filePath}`}>
                <WarningOutlined className="param-file-icon" />
                <span className="param-file-error-text">{error}</span>
            </div>
        );
    }

    return null;
}
