type ScriptFormatHandler = () => void | Promise<void>;

let formatHandler: ScriptFormatHandler | null = null;

export function registerScriptFormatHandler(handler: ScriptFormatHandler): () => void {
    formatHandler = handler;
    return () => {
        if (formatHandler === handler) {
            formatHandler = null;
        }
    };
}

export function formatActiveScript(): void {
    void formatHandler?.();
}
