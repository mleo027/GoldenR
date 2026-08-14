export interface KcbpRuntimeConfig {
    executable: string;
    workingDir: string;
    args: string[];
}

export interface KcbpPickPathResult {
    canceled: boolean;
    path?: string;
}
