import type { EditorMode } from './types/workspace';
import type { KcxpEnvironment } from './types/kcxp';

export interface ApiDebugEnv {
    editorMode: EditorMode;
    kcxpEnvironments: KcxpEnvironment[];
    activeKcxpEnvironmentId: string;
}
