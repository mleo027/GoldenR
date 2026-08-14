import path from 'path';
import { assertConfigStorageFileName } from '../../src/config/registry';

export function resolveConfigStoragePath(configDir: string, fileName: string): string {
    const safeFileName = assertConfigStorageFileName(fileName);
    const resolvedDir = path.resolve(configDir);
    const absPath = path.resolve(resolvedDir, safeFileName);
    const relativePath = path.relative(resolvedDir, absPath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        throw new Error(`Config path escapes config dir: ${fileName}`);
    }
    return absPath;
}
