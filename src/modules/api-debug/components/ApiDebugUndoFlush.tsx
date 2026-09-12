import { useEffect } from 'react';
import { useUndoRedoStore } from '@/platform/undo';
import { flushAllTabDrafts } from '../utils/workspace/tabDraftRegistry';

/** API 调试：撤销前刷入参数/地址等草稿，避免栈与输入框不一致 */
export default function ApiDebugUndoFlush() {
    const registerFlush = useUndoRedoStore((state) => state.registerFlush);

    useEffect(() => registerFlush(flushAllTabDrafts), [registerFlush]);

    return null;
}
