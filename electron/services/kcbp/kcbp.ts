import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { fileURLToPath } from 'url';
import { app } from 'electron';
import { parseKcbpResult } from './response';
import type { KcbpResponseData } from './response';

export { normalizeResultSets } from './response';
export type { KcbpResponseData } from './response';

export interface KcbpConnectionOptions {
    ip?: string;
    port?: string;
    reqqueue?: string;
    ansqueue?: string;
    service?: string;
    apiid?: string;
    requesttimeout?: string;
    connecttimeout?: string;
}

export interface KcbpParamOptions {
    msgtype?: string;
    fields?: Record<string, string | Buffer | Uint8Array>;
    binaryFields?: Record<string, string>;
}

export interface KcbpRequestOptions {
    /** 协议类型：缺省 KCBP，向后兼容 */
    type?: 'KCBP' | 'KGBP';
    connection: KcbpConnectionOptions;
    param: KcbpParamOptions;
}

/** 边界归一化：结构化条目补齐缺省字段；平铺行/混合结构包装为单集。
 *  列名与列序一律以行对象的 key 为准（key=value），协议表头元数据已废弃。 */
interface NativeKcbpAdapter {
    callKCBP: (payload: KcbpRequestOptions) => unknown;
}

const DEFAULT_TIMEOUT = {
    connect: '10',
    request: '15',
};

const BINARY_FIELD_KEY = '__kcbpBinaryBase64';

function getWorkspaceDir() {
    if (app.isPackaged) return app.getPath('userData');

    const modulePath = fileURLToPath(import.meta.url);
    const moduleDir = path.dirname(modulePath);
    return path.basename(moduleDir) === 'dist-electron'
        ? path.resolve(moduleDir, '..')
        : path.resolve(moduleDir, '..');
}

function getAdapterCandidates() {
    const workspaceDir = getWorkspaceDir();
    return app.isPackaged
        ? [
              path.join(process.resourcesPath, 'adapter', 'index.cjs'),
              path.join(process.resourcesPath, 'adapter', 'index.js'),
              path.join(process.resourcesPath, 'adapter', 'adapter.node'),
          ]
        : [
              path.join(workspaceDir, 'electron', 'adapter', 'index.cjs'),
              path.join(workspaceDir, 'electron', 'adapter', 'index.js'),
              path.join(workspaceDir, 'electron', 'adapter', 'adapter.node'),
              path.join(process.cwd(), 'electron', 'adapter', 'index.cjs'),
              path.join(process.cwd(), 'electron', 'adapter', 'index.js'),
              path.join(process.cwd(), 'electron', 'adapter', 'adapter.node'),
          ];
}

export const KCBP_CANCELLED_MESSAGE = 'CALL_CANCELLED';

export function isKcbpCancelled(error: unknown): boolean {
    return error instanceof Error && error.message === KCBP_CANCELLED_MESSAGE;
}

/** asarUnpack 文件物理在 app.asar.unpacked，系统 Node 子进程无法读取 app.asar 虚拟路径。 */
function resolveUnpackedAsarPath(filePath: string): string {
    return filePath.includes('app.asar')
        ? filePath.replace('app.asar', 'app.asar.unpacked')
        : filePath;
}

function getBridgeScriptPath(): string {
    if (cachedBridgeScriptPath) return cachedBridgeScriptPath;

    const moduleDir = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
        path.join(process.cwd(), 'electron', 'kcbpBridge.cjs'),
        path.join(moduleDir, 'kcbpBridge.cjs'),
    ];

    for (const candidate of candidates) {
        const resolved = resolveUnpackedAsarPath(candidate);
        if (fs.existsSync(resolved)) {
            cachedBridgeScriptPath = resolved;
            return resolved;
        }
    }

    throw new Error(`KCBP bridge script not found: ${candidates.join(' | ')}`);
}

function getBundledNodeExecutable(): string | null {
    if (!app.isPackaged) {
        console.log('[KCBP] app.isPackaged = false, skipping bundled node');
        return null;
    }

    const nodeName = process.platform === 'win32' ? 'node.exe' : 'node';
    const bundled = path.join(process.resourcesPath, 'node', nodeName);
    const exists = fs.existsSync(bundled);
    console.log(`[KCBP] bundled node check: ${bundled} -> exists=${exists}`);
    return exists ? bundled : null;
}

function getNodeExecutable(): string {
    if (process.env.KCBP_NODE_PATH?.trim()) {
        console.log(`[KCBP] using KCBP_NODE_PATH: ${process.env.KCBP_NODE_PATH}`);
        return process.env.KCBP_NODE_PATH.trim();
    }

    const bundledNode = getBundledNodeExecutable();
    if (bundledNode) {
        return bundledNode;
    }

    if (process.env.npm_node_execpath?.trim()) {
        console.log(`[KCBP] using npm_node_execpath: ${process.env.npm_node_execpath}`);
        return process.env.npm_node_execpath.trim();
    }

    console.log('[KCBP] fallback to system node');
    return 'node';
}

function getResolvedAdapterCandidates(): string[] {
    if (cachedAdapterCandidates) return cachedAdapterCandidates;

    cachedAdapterCandidates = getAdapterCandidates().filter((candidate) =>
        fs.existsSync(candidate),
    );
    return cachedAdapterCandidates;
}

function encodePayloadForBridge(payload: KcbpRequestOptions): KcbpRequestOptions {
    const fields: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload.param.fields ?? {})) {
        if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
            fields[key] = {
                [BINARY_FIELD_KEY]: Buffer.from(value).toString('base64'),
            };
            continue;
        }
        fields[key] = value;
    }

    return {
        ...payload,
        param: {
            ...payload.param,
            fields: fields as KcbpParamOptions['fields'],
        },
    };
}

interface ActiveKcbpCall {
    callId: number;
    cancelled: boolean;
    child: ChildProcessWithoutNullStreams;
    settled: boolean;
    settle: (action: () => unknown) => void;
}

let nextCallId = 0;
let activeCall: ActiveKcbpCall | null = null;
let bridgeChild: ChildProcessWithoutNullStreams | null = null;
let bridgeStdoutBuffer = '';
let bridgeStderr = '';
let cachedBridgeScriptPath: string | null = null;
let cachedAdapterCandidates: string[] | null = null;
const CANCEL_FORCE_MS = 3_000;

function killBridgeChildProcess(child: ChildProcessWithoutNullStreams): void {
    if (child.killed || child.exitCode != null) {
        return;
    }

    if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
            windowsHide: true,
            stdio: 'ignore',
        });
        return;
    }

    child.kill('SIGTERM');
}

function invalidateBridge(child: ChildProcessWithoutNullStreams): void {
    if (bridgeChild === child) {
        bridgeChild = null;
    }
    killBridgeChildProcess(child);
}

app.once?.('will-quit', () => {
    if (bridgeChild) invalidateBridge(bridgeChild);
});

function forceCancelIfStillActive(currentCall: ActiveKcbpCall | null): void {
    if (
        !currentCall ||
        activeCall !== currentCall ||
        !currentCall.cancelled ||
        currentCall.settled
    ) {
        return;
    }
    activeCall = null;
    currentCall.settle(() => {
        throw new Error(KCBP_CANCELLED_MESSAGE);
    });
}

function ensureBridgeChild(): ChildProcessWithoutNullStreams {
    if (bridgeChild && bridgeChild.exitCode == null && !bridgeChild.killed) return bridgeChild;
    const child = spawn(getNodeExecutable(), [getBridgeScriptPath()], {
        cwd: getWorkspaceDir(),
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
    });
    bridgeChild = child;
    bridgeStdoutBuffer = '';
    bridgeStderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
        bridgeStdoutBuffer += chunk;
        let newline = bridgeStdoutBuffer.indexOf('\n');
        while (newline >= 0) {
            const line = bridgeStdoutBuffer.slice(0, newline).trim();
            bridgeStdoutBuffer = bridgeStdoutBuffer.slice(newline + 1);
            newline = bridgeStdoutBuffer.indexOf('\n');
            if (!line) continue;
            try {
                const message = JSON.parse(line) as {
                    callId?: number;
                    ok?: boolean;
                    raw?: unknown;
                    error?: string;
                };
                const current = activeCall;
                if (!current || current.child !== child) continue;
                if (message.callId !== current.callId) {
                    current.settle(() => {
                        throw new Error('KCBP bridge returned an unexpected call ID');
                    });
                    invalidateBridge(child);
                    continue;
                }
                if (message.ok) current.settle(() => message.raw);
                else
                    current.settle(() => {
                        throw new Error(message.error || 'KCBP bridge call failed');
                    });
            } catch {
                const current = activeCall;
                if (current?.child === child && !current.settled) {
                    current.settle(() => {
                        throw new Error('KCBP bridge returned invalid JSON');
                    });
                }
                invalidateBridge(child);
            }
        }
    });
    child.stderr.on('data', (chunk: string) => {
        bridgeStderr += chunk;
    });
    child.on('error', (error) => {
        if (bridgeChild === child) bridgeChild = null;
        if (bridgeChild === null && activeCall && !activeCall.settled) {
            activeCall.settle(() => {
                throw error;
            });
        }
    });
    child.on('close', (code) => {
        const isCurrentBridge = bridgeChild === child;
        if (isCurrentBridge) bridgeChild = null;
        if (isCurrentBridge && activeCall && !activeCall.settled) {
            const current = activeCall;
            current.settle(() => {
                throw new Error(
                    current.cancelled
                        ? KCBP_CANCELLED_MESSAGE
                        : bridgeStderr.trim() ||
                              `KCBP bridge exited with code ${code ?? 'unknown'}`,
                );
            });
        }
    });
    return child;
}

function invokeKcbpBridge(
    payload: KcbpRequestOptions,
    adapterCandidates: string[],
): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const callId = ++nextCallId;

        if (activeCall) {
            const previousCall = activeCall;
            previousCall.cancelled = true;
            invalidateBridge(previousCall.child);
            previousCall.settle(() => {
                throw new Error(KCBP_CANCELLED_MESSAGE);
            });
        }

        const child = ensureBridgeChild();
        const bridgeInput = JSON.stringify({
            callId,
            payload: encodePayloadForBridge(payload),
            adapterCandidates,
        });

        const currentCall: ActiveKcbpCall = {
            callId,
            cancelled: false,
            child,
            settled: false,
            settle: (action) => {
                if (currentCall.settled) return;
                currentCall.settled = true;
                if (activeCall === currentCall) activeCall = null;
                try {
                    resolve(action());
                } catch (error) {
                    reject(error);
                }
            },
        };

        activeCall = currentCall;

        child.stdin.write(`${bridgeInput}\n`);
    });
}

function normalizePayload(payload: KcbpRequestOptions): KcbpRequestOptions {
    const param = { ...payload.param };
    delete param.binaryFields;

    const isKGBP = payload.type === 'KGBP';
    const connection = {
        ip: payload.connection.ip || '127.0.0.1',
        port: payload.connection.port || '21000',
        apiid: payload.connection.apiid,
        requesttimeout: payload.connection.requesttimeout || DEFAULT_TIMEOUT.request,
        // KCBP 专属字段仅对 KCBP 协议注入，KGBP 不携带
        ...(!isKGBP && {
            reqqueue: payload.connection.reqqueue || 'req1',
            ansqueue: payload.connection.ansqueue || 'ans1',
            service: payload.connection.service || 'kspb',
        }),
        // KGBP 需要 connecttimeout（TS buildKcbpRequest 已处理）
        ...(isKGBP &&
            payload.connection.connecttimeout && {
                connecttimeout: payload.connection.connecttimeout,
            }),
    };

    return {
        type: payload.type || 'KCBP',
        connection,
        param: {
            ...param,
            msgtype: payload.param.msgtype || payload.connection.apiid,
            fields: payload.param.fields || {},
        },
    };
}

export async function resolveBinaryFields(
    payload: KcbpRequestOptions,
): Promise<{ payload: KcbpRequestOptions; error?: string }> {
    const binaryFields = payload.param.binaryFields;
    if (!binaryFields || Object.keys(binaryFields).length === 0) {
        return { payload: normalizePayload(payload) };
    }

    const fields: Record<string, string | Buffer | Uint8Array> = {
        ...(payload.param.fields || {}),
    };
    const binaryKeys = Object.keys(binaryFields);

    for (const [key, filePath] of Object.entries(binaryFields)) {
        const trimmedPath = filePath.trim();
        if (!trimmedPath) {
            return { payload, error: `二进制字段 ${key} 未指定文件路径` };
        }

        try {
            const buffer = await fsPromises.readFile(trimmedPath);
            fields[key] = buffer;

            const datasizeValue = fields.datasize;
            if (typeof datasizeValue === 'string' && !datasizeValue.trim()) {
                if (key === 'databody' || binaryKeys.length === 1) {
                    fields.datasize = String(buffer.length);
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { payload, error: `读取文件失败 (${key}): ${trimmedPath} - ${message}` };
        }
    }

    return {
        payload: normalizePayload({
            ...payload,
            param: {
                ...payload.param,
                fields,
                binaryFields: undefined,
            },
        }),
    };
}

export class KcbpClient {
    private adapter: NativeKcbpAdapter | null = null;

    constructor(adapter?: NativeKcbpAdapter) {
        if (adapter) {
            this.adapter = adapter;
        }
        // adapter.node 在系统 Node 子进程（kcbpBridge.cjs）中加载，避免 Electron ABI 崩溃。
    }

    isAvailable() {
        if (this.adapter) return true;
        return getResolvedAdapterCandidates().length > 0;
    }

    cancel(): boolean {
        const callToCancel = activeCall;
        if (!callToCancel) {
            return false;
        }

        callToCancel.cancelled = true;
        invalidateBridge(callToCancel.child);
        callToCancel.settle(() => {
            throw new Error(KCBP_CANCELLED_MESSAGE);
        });
        setTimeout(() => forceCancelIfStillActive(callToCancel), CANCEL_FORCE_MS);
        return true;
    }

    async call(payload: KcbpRequestOptions): Promise<KcbpResponseData> {
        const startedAt = Date.now();
        const resolved = await resolveBinaryFields(payload);

        if (resolved.error) {
            return {
                code: '-1',
                msg: resolved.error,
                data: [],
                stats: {
                    timecost: Date.now() - startedAt,
                    rows: 0,
                },
            };
        }

        const normalized = resolved.payload;
        const adapterCandidates = getResolvedAdapterCandidates();

        if (!this.adapter && adapterCandidates.length === 0) {
            const missing = getAdapterCandidates()
                .filter((candidate) => !fs.existsSync(candidate))
                .map((candidate) => `not found: ${candidate}`);
            return {
                code: '-1',
                msg: `Adapter not loaded. ${missing.join(' | ')}`,
                data: [],
                stats: {
                    timecost: Date.now() - startedAt,
                    rows: 0,
                },
            };
        }

        if (this.adapter) {
            try {
                const raw = this.adapter.callKCBP(normalized);
                return parseKcbpResult(raw, startedAt);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return {
                    code: '-1',
                    msg: message,
                    data: [],
                    stats: {
                        timecost: Date.now() - startedAt,
                        rows: 0,
                    },
                };
            }
        }

        try {
            const result = await invokeKcbpBridge(normalized, adapterCandidates);
            return parseKcbpResult(result, startedAt);
        } catch (error) {
            if (isKcbpCancelled(error)) {
                throw error;
            }

            const message = error instanceof Error ? error.message : String(error);
            return {
                code: '-1',
                msg: message,
                data: [],
                stats: {
                    timecost: Date.now() - startedAt,
                    rows: 0,
                },
            };
        }
    }
}
