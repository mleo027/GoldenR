import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ClipboardEvent,
    type MutableRefObject,
    type RefObject,
} from 'react';
import { App, Dropdown, Input, Spin, Tooltip, Typography } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { SearchOutlined } from '@ant-design/icons';
import type { ParamItem } from '../../types/workspace';
import type { DbSuggestOption } from '../../types/paramSuggest';
import { useParamSuggestions } from '../../hooks/useParamSuggestions';
import { getElectronAPI } from '../../../../lib/electron';
import { UI_DEBOUNCE_MS } from '../../../../constants/ui';
import {
    formatFileParamValue,
    isFileParamValue,
    isFilePickerTriggerValue,
    isWindowsFilePath,
    trimPathQuotes,
} from '../../utils/kcbp/kcbpFields';
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
                <Tooltip title={item.label}>
                    <span className="param-suggest-option-desc">{item.label}</span>
                </Tooltip>
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

function ParamSuggestTextArea({
    inputRef,
    value,
    placeholder,
    disabled,
    className,
    onFocus,
    onBlur,
    onChange,
    onCopy,
}: {
    inputRef: RefObject<TextAreaRef>;
    value: string;
    placeholder: string;
    disabled: boolean;
    className: string;
    onFocus: () => void;
    onBlur: () => void;
    onChange: (value: string) => void;
    onCopy: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
}) {
    return (
        <Input.TextArea
            ref={inputRef}
            value={value}
            placeholder={placeholder}
            size="small"
            autoSize={{ minRows: 1, maxRows: 5 }}
            spellCheck={false}
            className={className}
            disabled={disabled}
            onFocus={onFocus}
            onBlur={onBlur}
            onChange={(event) => onChange(event.target.value)}
            onCopy={onCopy}
        />
    );
}

function useFileParamHandlers({
    inputRef,
    commitToParent,
    modal,
    setLocalValue,
    setKeyword,
    setOpen,
}: {
    inputRef: RefObject<TextAreaRef>;
    commitToParent: (value: string, immediate?: boolean) => void;
    modal: ReturnType<typeof App.useApp>['modal'];
    setLocalValue: (value: string) => void;
    setKeyword: (value: string) => void;
    setOpen: (open: boolean) => void;
}) {
    const filePickerInFlightRef = useRef(false);
    const filePromptTimerRef = useRef<number | null>(null);
    const promptedPathsRef = useRef<Set<string>>(new Set());
    const latestRawRef = useRef('');

    useEffect(
        () => () => {
            if (filePromptTimerRef.current) window.clearTimeout(filePromptTimerRef.current);
        },
        [],
    );

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
                    latestRawRef.current = next;
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
        [commitToParent, setKeyword, setLocalValue, setOpen],
    );

    const openFileContentConfirm = useCallback(
        (filePath: string, fileLength: number) => {
            modal.confirm({
                title: '是否使用文件内容作为入参？',
                content: `检测到 Windows 文件路径：${filePath}\nlength: ${fileLength}`,
                okText: '使用文件内容',
                cancelText: '作为文本',
                centered: true,
                mousePosition: null,
                onOk: () => {
                    const next = formatFileParamValue(filePath);
                    latestRawRef.current = next;
                    setLocalValue(next);
                    setKeyword(next);
                    commitToParent(next, true);
                    setOpen(false);
                    inputRef.current?.focus();
                },
            });
        },
        [commitToParent, inputRef, modal, setKeyword, setLocalValue, setOpen],
    );

    const scheduleWindowsFilePrompt = useCallback(
        (raw: string) => {
            latestRawRef.current = raw;
            if (isFileParamValue(raw)) return;

            const filePath = trimPathQuotes(raw);
            if (!isWindowsFilePath(filePath) || promptedPathsRef.current.has(filePath)) return;
            promptedPathsRef.current.add(filePath);

            if (filePromptTimerRef.current) {
                window.clearTimeout(filePromptTimerRef.current);
            }
            filePromptTimerRef.current = window.setTimeout(() => {
                const api = getElectronAPI();
                if (!api?.importExport.statParamFile) return;

                void api.importExport
                    .statParamFile(filePath)
                    .then((result) => {
                        if (!result.exists || trimPathQuotes(latestRawRef.current) !== filePath)
                            return;
                        openFileContentConfirm(filePath, result.size);
                    })
                    .catch(() => undefined);
            }, UI_DEBOUNCE_MS.edit);
        },
        [openFileContentConfirm],
    );

    return { openFilePickerForValue, scheduleWindowsFilePrompt };
}

function useParamSuggestInputEvents({
    inputRef,
    localValue,
    placeholderProp,
    hasRule,
    pendingDeps,
    focusedRef,
    blurTimerRef,
    setActive,
    setOpen,
    commitToParent,
    setLocalValue,
    setKeyword,
    openFilePickerForValue,
    scheduleWindowsFilePrompt,
}: {
    inputRef: RefObject<TextAreaRef>;
    localValue: string;
    placeholderProp?: string;
    hasRule: boolean;
    pendingDeps: string[];
    focusedRef: MutableRefObject<boolean>;
    blurTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
    setActive: (value: boolean) => void;
    setOpen: (value: boolean) => void;
    commitToParent: (value: string, immediate?: boolean) => void;
    setLocalValue: (value: string) => void;
    setKeyword: (value: string) => void;
    openFilePickerForValue: (value: string) => void;
    scheduleWindowsFilePrompt: (value: string) => void;
}) {
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
        scheduleWindowsFilePrompt(localValue);
    }, [blurTimerRef, focusedRef, localValue, scheduleWindowsFilePrompt, setActive, setOpen]);

    const handleBlur = useCallback(() => {
        blurTimerRef.current = setTimeout(() => {
            focusedRef.current = false;
            setActive(false);
            setOpen(false);
            commitToParent(localValue, true);
        }, BLUR_CLOSE_MS);
    }, [blurTimerRef, commitToParent, focusedRef, localValue, setActive, setOpen]);

    const handleInputChange = useCallback(
        (next: string) => {
            const raw = decodeSohMarkers(next);
            setLocalValue(raw);
            setKeyword(raw);
            commitToParent(raw);
            setOpen(true);
            openFilePickerForValue(raw);
            scheduleWindowsFilePrompt(raw);
        },
        [
            commitToParent,
            openFilePickerForValue,
            scheduleWindowsFilePrompt,
            setKeyword,
            setLocalValue,
            setOpen,
        ],
    );

    const handlePick = useCallback(
        (picked: string) => {
            setLocalValue(picked);
            setKeyword(picked);
            commitToParent(picked, true);
            setOpen(false);
            inputRef.current?.focus();
        },
        [commitToParent, inputRef, setKeyword, setLocalValue, setOpen],
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

    return { placeholder, handleFocus, handleBlur, handleInputChange, handlePick, handleCopy };
}

function ParamSuggestInput({
    fieldName,
    value,
    params,
    disabled = false,
    placeholder: placeholderProp,
    onChange,
}: ParamSuggestInputProps) {
    const { modal } = App.useApp();
    const inputRef = useRef<TextAreaRef>(null);
    const focusedRef = useRef(false);
    const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

    const { openFilePickerForValue, scheduleWindowsFilePrompt } = useFileParamHandlers({
        inputRef,
        commitToParent,
        modal,
        setLocalValue,
        setKeyword,
        setOpen,
    });

    const { placeholder, handleFocus, handleBlur, handleInputChange, handlePick, handleCopy } =
        useParamSuggestInputEvents({
            inputRef,
            localValue,
            placeholderProp,
            hasRule,
            pendingDeps,
            focusedRef,
            blurTimerRef,
            setActive,
            setOpen,
            commitToParent,
            setLocalValue,
            setKeyword,
            openFilePickerForValue,
            scheduleWindowsFilePrompt,
        });

    if (!hasFieldRule) {
        return (
            <ParamSuggestTextArea
                inputRef={inputRef}
                value={formatControlCharsForTitle(localValue)}
                placeholder={placeholder}
                disabled={disabled}
                className="param-input"
                onFocus={handleFocus}
                onBlur={handleBlur}
                onChange={handleInputChange}
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
            <ParamSuggestTextArea
                inputRef={inputRef}
                value={formatControlCharsForTitle(localValue)}
                placeholder={placeholder}
                disabled={disabled}
                className="param-input param-suggest-input"
                onFocus={handleFocus}
                onBlur={handleBlur}
                onChange={handleInputChange}
                onCopy={handleCopy}
            />
        </Dropdown>
    );
}

export default memo(ParamSuggestInput);
