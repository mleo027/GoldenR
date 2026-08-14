export interface KcxpEnvironment {
    id: string;
    name: string;
    host: string;
    queue: string;
    timeout: string;
}

export type KcxpApplyScope = 'active' | 'project' | 'all';
