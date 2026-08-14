import fs from 'fs/promises';
import path from 'path';
import { PERSISTED_CONFIG_FILES } from '../../src/config/registry';

export const PORTABLE_CONFIG_FILES = PERSISTED_CONFIG_FILES;

export async function seedPortableConfigs(
    bundledDir: string,
    targetDir: string,
    files: readonly string[] = PORTABLE_CONFIG_FILES,
): Promise<string[]> {
    const copied: string[] = [];

    if (path.resolve(bundledDir) === path.resolve(targetDir)) {
        return copied;
    }

    await fs.mkdir(targetDir, { recursive: true });

    for (const fileName of files) {
        const sourcePath = path.join(bundledDir, fileName);
        const targetPath = path.join(targetDir, fileName);

        try {
            await fs.copyFile(sourcePath, targetPath, fs.constants.COPYFILE_EXCL);
            copied.push(fileName);
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code === 'EEXIST' || code === 'ENOENT') {
                continue;
            }
            throw error;
        }
    }

    return copied;
}
