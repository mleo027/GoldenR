import type { EditorMode } from './types/workspace';
import type { KcxpEnvironment } from './types/kcxp';

export interface ApiDebugEnv {
    editorMode: EditorMode;
    kcxpEnvironments: KcxpEnvironment[];
    activeKcxpEnvironmentId: string;
    /** 入参展示模式：false 表格，true raw 文本（KCBP=INI / KGBP=XML） */
    paramsRawMode: boolean;
}
