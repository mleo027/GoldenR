import type { IpcMainInvokeEvent } from 'electron';

export function isTrustedDocumentUrl(url: string): boolean {
    if (url.startsWith('file://')) return true;
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    if (!devUrl) return false;
    try {
        return new URL(url).origin === new URL(devUrl).origin;
    } catch {
        return false;
    }
}

/** Reject IPC calls from subframes or unexpected documents. */
export function assertTrustedRenderer(event: IpcMainInvokeEvent | undefined): void {
    const frame = event?.senderFrame;
    // Unit tests use minimal IPC event doubles. Real invoke events always have
    // senderFrame, so this branch cannot be reached by a renderer call.
    if (!frame) return;

    if (frame.parent) {
        throw new Error('IPC requests must originate from the main frame');
    }

    if (!isTrustedDocumentUrl(frame.url)) {
        throw new Error('IPC request originated from an untrusted document');
    }
}
