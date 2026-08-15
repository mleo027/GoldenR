let allowClose = false;

export function allowWindowClose(): void {
    allowClose = true;
}

export function isWindowCloseAllowed(): boolean {
    return allowClose;
}
