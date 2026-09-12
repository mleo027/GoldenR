import type { TabData, ParamItem } from '../types/workspace';
import type { QuickFillPayload } from './workspace/paramText';
import { parseKcbpAddress, serializeKcbpAddress } from './kcbp/kcbpAddress';

export function buildQuickFillCasePatch(
    tab: Pick<TabData, 'address'>,
    result: QuickFillPayload,
): Partial<Pick<TabData, 'params' | 'address' | 'name'>> {
    const patch: Partial<Pick<TabData, 'params' | 'address' | 'name'>> = {
        params: result.params as ParamItem[],
    };
    if (result.msgtype || result.service || result.nodeId) {
        const parts = parseKcbpAddress(tab.address);
        patch.address = serializeKcbpAddress({
            ...parts,
            ...(result.msgtype ? { msgtype: result.msgtype } : {}),
            ...(result.service ? { service: result.service } : {}),
            ...(result.nodeId ? { nodeId: result.nodeId } : {}),
        });
    }
    if (result.title) patch.name = result.title;
    return patch;
}
