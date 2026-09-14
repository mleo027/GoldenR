import type { ParamItem, TabData } from '../../types/workspace';
import type { KcbpCallOutcome } from './types';

export type ScriptCaseTab = Pick<
    TabData,
    'address' | 'name' | 'params' | 'protocol' | 'script' | 'requestScript' | 'responseScript'
>;

export interface ScriptExecutionState {
    lastOutcome: KcbpCallOutcome | null;
    activeParams: ParamItem[];
}
