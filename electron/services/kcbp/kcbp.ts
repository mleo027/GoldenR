import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { fileURLToPath } from 'url';
import { app } from 'electron';

export interface KcbpConnectionOptions {
    ip?: string;
    port?: string;
    reqqueue?: string;
    ansqueue?: string;
    service?: string;
    apiid?: string;
    connecttimeout?: string;
    requesttimeout?: string;
}

export interface KcbpParamOptions {
    msgtype?: string;
    fields?: Record<string, string | Buffer | Uint8Array>;
    binaryFields?: Record<string, string>;
}

export interface KcbpRequestOptions {
    connection: KcbpConnectionOptions;
    param: KcbpParamOptions;
}

export interface KcbpResponseData {
    code: string;
    msg: string;
    data: unknown[];
    level?: string;
    stats: {
        timecost: number;
        rows: number;
    };
}

interface RawKcbpResponseData {
    code: string | number;
    msg: string;
    data: unknown[];
    level?: string;
}

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
    if (!app.isPackaged) return null;

    const nodeName = process.platform === 'win32' ? 'node.exe' : 'node';
    const bundled = path.join(process.resourcesPath, 'node', nodeName);
    return fs.existsSync(bundled) ? bundled : null;
}

function getNodeExecutable(): string {
    if (process.env.KCBP_NODE_PATH?.trim()) {
        return process.env.KCBP_NODE_PATH.trim();
    }

    const bundledNode = getBundledNodeExecutable();
    if (bundledNode) {
        return bundledNode;
    }

    if (process.env.npm_node_execpath?.trim()) {
        return process.env.npm_node_execpath.trim();
    }
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
    cancelled: boolean;
    child: ChildProcessWithoutNullStreams;
    settled: boolean;
    settle: (action: () => unknown) => void;
}

let nextCallId = 0;
let activeCall: ActiveKcbpCall | null = null;
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

function invokeKcbpBridge(
    payload: KcbpRequestOptions,
    adapterCandidates: string[],
): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const callId = ++nextCallId;

        if (activeCall) {
            activeCall.cancelled = true;
            killBridgeChildProcess(activeCall.child);
        }

        const bridgeScript = getBridgeScriptPath();
        const nodeExecutable = getNodeExecutable();
        const bridgeInput = JSON.stringify({
            payload: encodePayloadForBridge(payload),
            adapterCandidates,
        });

        const child = spawn(nodeExecutable, [bridgeScript], {
            cwd: getWorkspaceDir(),
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true,
        });

        let stdout = '';
        let stderr = '';

        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', (chunk) => {
            stdout += chunk;
        });
        child.stderr.on('data', (chunk) => {
            stderr += chunk;
        });

        const currentCall: ActiveKcbpCall = {
            cancelled: false,
            child,
            settled: false,
            settle: (action) => {
                if (currentCall.settled) return;
                currentCall.settled = true;
                try {
                    resolve(action());
                } catch (error) {
                    reject(error);
                }
            },
        };

        activeCall = currentCall;

        child.on('error', (error) => {
            if (activeCall === currentCall) {
                activeCall = null;
            }
            reject(error);
        });

        child.on('close', (code) => {
            if (activeCall === currentCall) {
                activeCall = null;
            }

            if (currentCall.cancelled) {
                currentCall.settle(() => {
                    throw new Error(KCBP_CANCELLED_MESSAGE);
                });
                return;
            }

            if (!stdout.trim()) {
                currentCall.settle(() => {
                    throw new Error(
                        stderr.trim() || `KCBP bridge exited with code ${code ?? 'unknown'}`,
                    );
                });
                return;
            }

            try {
                const message = JSON.parse(stdout.trim()) as {
                    ok?: boolean;
                    raw?: unknown;
                    error?: string;
                };

                if (message.ok) {
                    currentCall.settle(() => message.raw);
                    return;
                }

                currentCall.settle(() => {
                    throw new Error(message.error || 'KCBP bridge call failed');
                });
            } catch (error) {
                currentCall.settle(() => {
                    if (error instanceof Error && error.message === KCBP_CANCELLED_MESSAGE) {
                        throw error;
                    }
                    throw new Error(
                        stderr.trim() || `KCBP bridge returned invalid JSON (call ${callId})`,
                    );
                });
            }
        });

        child.stdin.write(bridgeInput);
        child.stdin.end();
    });
}

function normalizePayload(payload: KcbpRequestOptions): KcbpRequestOptions {
    const param = { ...payload.param };
    delete param.binaryFields;

    return {
        connection: {
            ip: payload.connection.ip || '127.0.0.1',
            port: payload.connection.port || '21000',
            reqqueue: payload.connection.reqqueue || 'req1',
            ansqueue: payload.connection.ansqueue || 'ans1',
            service: payload.connection.service || 'kspb',
            apiid: payload.connection.apiid,
            connecttimeout: payload.connection.connecttimeout || DEFAULT_TIMEOUT.connect,
            requesttimeout: payload.connection.requesttimeout || DEFAULT_TIMEOUT.request,
        },
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

function isValidResult(value: unknown): value is RawKcbpResponseData {
    if (!value || typeof value !== 'object') return false;
    const data = value as Record<string, unknown>;
    return (
        'code' in data &&
        (typeof data.code === 'string' || typeof data.code === 'number') &&
        'msg' in data &&
        typeof data.msg === 'string' &&
        'data' in data &&
        Array.isArray(data.data)
    );
}

function parseValidResult(raw: unknown): RawKcbpResponseData | null {
    if (isValidResult(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw) as unknown;
            return isValidResult(parsed) ? parsed : null;
        } catch {
            // ignore malformed string payload
        }
    }
    return null;
}

function toNormalizedResult(raw: RawKcbpResponseData, timecost: number): KcbpResponseData {
    return {
        ...raw,
        code: String(raw.code),
        stats: {
            timecost,
            rows: raw.data.length,
        },
    };
}

function toEnvelopeResult(raw: unknown, timecost: number): KcbpResponseData {
    const envelope =
        raw && typeof raw === 'object' && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : null;
    const code =
        envelope && (typeof envelope.code === 'string' || typeof envelope.code === 'number')
            ? String(envelope.code)
            : '0';
    const msg = envelope && typeof envelope.msg === 'string' ? envelope.msg : 'Success';
    const level = envelope && typeof envelope.level === 'string' ? envelope.level : undefined;

    return {
        code,
        msg,
        ...(level ? { level } : {}),
        data: [],
        stats: {
            timecost,
            rows: 0,
        },
    };
}

function parseResult(raw: unknown, startedAt: number): KcbpResponseData {
    const timecost = Date.now() - startedAt;
    const valid = parseValidResult(raw);
    return valid ? toNormalizedResult(valid, timecost) : toEnvelopeResult(raw, timecost);
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
        killBridgeChildProcess(callToCancel.child);
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
                return parseResult(raw, startedAt);
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
            return parseResult(result, startedAt);
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
