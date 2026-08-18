import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ClipboardEvent,
} from 'react';
import { Dropdown, Input, Spin, Typography } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { SearchOutlined } from '@ant-design/icons';
import type { ParamItem } from '../../types/workspace';
import type { DbSuggestOption } from '../../types/paramSuggest';
import { useParamSuggestions } from '../../hooks/useParamSuggestions';
import { getElectronAPI } from '../../../../lib/electron';
import { formatFileParamValue, isFilePickerTriggerValue } from '../../utils/kcbp/kcbpFields';
import { decodeSohMarkers, formatControlCharsForTitle } from '../../../../utils/controlCharDisplay';

interface ParamSuggestInputProps {
    fieldName: string;
    value: string;
    params: ParamItem[];
    disabled?: boolean;
    placeholder?: string;
    onChange: (value: string) => void;
}

const PARENT_COMMIT_MS = 150;
const BLUR_CLOSE_MS = 180;

function SuggestOptionItem({ item }: { item: DbSuggestOption }) {
    const showRemark = item.label.trim() !== '' && item.label !== item.value;

    return (
        <div className="param-suggest-option">
            <span className="param-suggest-option-code">{item.value}</span>
            {showRemark ? (
                <span className="param-suggest-option-desc" title={item.label}>
                    {item.label}
                </span>
            ) : null}
        </div>
    );
}

function SuggestDropdownPanel({
    loading,
    pendingDeps,
    placeholder,
    options,
    onPick,
}: {
    loading: boolean;
    pendingDeps: string[];
    placeholder: string;
    options: DbSuggestOption[];
    onPick: (value: string) => void;
}) {
    if (loading && options.length === 0) {
        return (
            <div className="param-suggest-dropdown param-suggest-empty">
                <Spin size="small" />
                <span>正在查询…</span>
            </div>
        );
    }

    if (pendingDeps.length > 0) {
        return (
            <div className="param-suggest-dropdown param-suggest-empty">
                <Typography.Text type="secondary">{placeholder}</Typography.Text>
            </div>
        );
    }

    if (options.length === 0) {
        return (
            <div className="param-suggest-dropdown param-suggest-empty">
                <SearchOutlined className="param-suggest-empty-icon" />
                <Typography.Text type="secondary">无匹配项，可继续手动输入</Typography.Text>
            </div>
        );
    }

    return (
        <div className="param-suggest-dropdown">
            {options.map((item) => (
                <button
                    key={item.value}
                    type="button"
                    className="param-suggest-dropdown-item"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onPick(item.value)}
                >
                    <SuggestOptionItem item={item} />
                </button>
            ))}
            {loading ? (
                <div className="param-suggest-dropdown-loading">
                    <Spin size="small" />
                </div>
            ) : null}
        </div>
    );
}

function ParamSuggestInput({
    fieldName,
    value,
    params,
    disabled = false,
    placeholder: placeholderProp,
    onChange,
}: ParamSuggestInputProps) {
    const inputRef = useRef<TextAreaRef>(null);
    const focusedRef = useRef(false);
    const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const filePickerInFlightRef = useRef(false);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const [localValue, setLocalValue] = useState(value);
    const [keyword, setKeyword] = useState(value);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(false);

    const { options, loading, pendingDeps, hasRule, hasFieldRule } = useParamSuggestions({
        fieldName,
        params,
        keyword,
        enabled: !disabled && active,
    });

    useEffect(() => {
        if (!focusedRef.current) {
            setLocalValue(value);
            setKeyword(value);
        }
    }, [value]);

    useEffect(
        () => () => {
            if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
            if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
        },
        [],
    );

    const commitToParent = useCallback((next: string, immediate = false) => {
        if (commitTimerRef.current) {
            clearTimeout(commitTimerRef.current);
            commitTimerRef.current = null;
        }
        if (immediate) {
            onChangeRef.current(next);
            return;
        }
        commitTimerRef.current = setTimeout(() => {
            onChangeRef.current(next);
            commitTimerRef.current = null;
        }, PARENT_COMMIT_MS);
    }, []);

    const openFilePickerForValue = useCallback(
        (triggerValue: string) => {
            if (filePickerInFlightRef.current || !isFilePickerTriggerValue(triggerValue)) return;

            const api = getElectronAPI();
            if (!api?.importExport.openParamFile) return;

            filePickerInFlightRef.current = true;
            void api.importExport
                .openParamFile()
                .then((result) => {
                    if (!result.opened) return;
                    const next = formatFileParamValue(result.filePath);
                    setLocalValue(next);
                    setKeyword(next);
                    commitToParent(next, true);
                    setOpen(false);
                })
                .catch(() => undefined)
                .finally(() => {
                    filePickerInFlightRef.current = false;
                });
        },
        [commitToParent],
    );

    const placeholder = useMemo(() => {
        if (placeholderProp !== undefined) return placeholderProp;
        if (!hasRule) return '';
        if (pendingDeps.length > 0) {
            return pendingDeps.join(', ');
        }
        return '';
    }, [hasRule, pendingDeps, placeholderProp]);

    const handleFocus = useCallback(() => {
        if (blurTimerRef.current) {
            clearTimeout(blurTimerRef.current);
            blurTimerRef.current = null;
        }
        focusedRef.current = true;
        setActive(true);
        setOpen(true);
    }, []);

    const handleBlur = useCallback(() => {
        blurTimerRef.current = setTimeout(() => {
            focusedRef.current = false;
            setActive(false);
            setOpen(false);
            commitToParent(localValue, true);
        }, BLUR_CLOSE_MS);
    }, [commitToParent, localValue]);

    const handleInputChange = useCallback(
        (next: string) => {
            const raw = decodeSohMarkers(next);
            setLocalValue(raw);
            setKeyword(raw);
            commitToParent(raw);
            setOpen(true);
            openFilePickerForValue(raw);
        },
        [commitToParent, openFilePickerForValue],
    );

    const handlePick = useCallback(
        (picked: string) => {
            setLocalValue(picked);
            setKeyword(picked);
            commitToParent(picked, true);
            setOpen(false);
            inputRef.current?.focus();
        },
        [commitToParent],
    );

    const handleCopy = useCallback((event: ClipboardEvent<HTMLTextAreaElement>) => {
        const target = event.currentTarget;
        const selected = target.value.slice(target.selectionStart ?? 0, target.selectionEnd ?? 0);
        const raw = decodeSohMarkers(selected);
        if (raw === selected) return;

        if (navigator.clipboard) {
            event.preventDefault();
            void navigator.clipboard.writeText(raw).catch(() => undefined);
        }
    }, []);

    if (!hasFieldRule) {
        return (
            <Input.TextArea
                ref={inputRef}
                value={formatControlCharsForTitle(localValue)}
                placeholder={placeholder}
                size="small"
                autoSize={{ minRows: 1, maxRows: 5 }}
                spellCheck={false}
                className="param-input"
                disabled={disabled}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onChange={(event) => handleInputChange(event.target.value)}
                onCopy={handleCopy}
            />
        );
    }

    return (
        <Dropdown
            open={open && active}
            trigger={[]}
            destroyOnHidden={false}
            placement="bottomLeft"
            overlayClassName="param-suggest-dropdown-overlay"
            popupRender={() => (
                <SuggestDropdownPanel
                    loading={loading}
                    pendingDeps={pendingDeps}
                    placeholder={placeholder}
                    options={options}
                    onPick={handlePick}
                />
            )}
        >
            <Input.TextArea
                ref={inputRef}
                value={formatControlCharsForTitle(localValue)}
                placeholder={placeholder}
                size="small"
                autoSize={{ minRows: 1, maxRows: 5 }}
                spellCheck={false}
                className="param-input param-suggest-input"
                disabled={disabled}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onChange={(event) => handleInputChange(event.target.value)}
                onCopy={handleCopy}
            />
        </Dropdown>
    );
}

export default memo(ParamSuggestInput);
