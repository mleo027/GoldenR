import { constants as fsConstants } from 'fs';
import { randomBytes } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const ATOMIC_WRITE_RETRY_DELAYS_MS = [0, 25, 75];

function isRetryableWriteError(error: unknown): boolean {
    const code = (error as NodeJS.ErrnoException).code;
    return code === 'EPERM' || code === 'EBUSY' || code === 'EACCES' || code === 'EEXIST';
}

async function sleep(ms: number): Promise<void> {
    if (ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
}

async function replaceFileAtomically(tempPath: string, absPath: string): Promise<void> {
    try {
        await fs.rename(tempPath, absPath);
        return;
    } catch (error) {
        if (!isRetryableWriteError(error)) {
            throw error;
        }
    }

    // Windows 上 rename 覆盖已有文件可能 EPERM（目标被占用或 watcher 短暂锁定）
    await fs.copyFile(tempPath, absPath, fsConstants.COPYFILE_F_REPLACE_EXISTING);
    await fs.unlink(tempPath).catch(() => undefined);
}

export function resolveJsonPath(
    filePath: string,
    getAppRootDir: () => string,
    getLegacyDataDir: () => string,
    fromUserData = false,
): string {
    if (path.isAbsolute(filePath)) return filePath;
    const baseDir = fromUserData ? getLegacyDataDir() : getAppRootDir();
    return path.join(baseDir, filePath);
}

export async function readJsonFileAt(absPath: string): Promise<unknown | null> {
    try {
        const content = await fs.readFile(absPath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code === 'ENOENT') return null;
        throw error;
    }
}

export async function writeJsonFileAt(absPath: string, data: unknown): Promise<void> {
    const dir = path.dirname(absPath);
    await fs.mkdir(dir, { recursive: true });
    const payload = JSON.stringify(data);

    let lastError: unknown;
    for (let attempt = 0; attempt < ATOMIC_WRITE_RETRY_DELAYS_MS.length; attempt += 1) {
        await sleep(ATOMIC_WRITE_RETRY_DELAYS_MS[attempt] ?? 0);
        const tempPath = `${absPath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
        try {
            await fs.writeFile(tempPath, payload, 'utf-8');
            await replaceFileAtomically(tempPath, absPath);
            return;
        } catch (error) {
            lastError = error;
            await fs.unlink(tempPath).catch(() => undefined);
            if (
                !isRetryableWriteError(error) ||
                attempt === ATOMIC_WRITE_RETRY_DELAYS_MS.length - 1
            ) {
                throw error;
            }
        }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
