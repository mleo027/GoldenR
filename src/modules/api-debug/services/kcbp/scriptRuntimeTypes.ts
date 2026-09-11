import type { ParamItem, TabData } from '../../types/workspace';
import type { KcbpCallOutcome } from './types';

export type ScriptCaseTab = Pick<
    TabData,
    | 'address'
    | 'name'
    | 'params'
    | 'protocol'
    | 'script'
    | 'requestScript'
    | 'responseScript'
    | 'runInput'
>;

export interface ScriptExecutionState {
    lastOutcome: KcbpCallOutcome | null;
    activeParams: ParamItem[];
    callSteps: NonNullable<KcbpCallOutcome['callSteps']>;
    callCounter: number;
}
