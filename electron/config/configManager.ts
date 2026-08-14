import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { PERSISTED_CONFIG_FILES } from '../../src/config/registry';
import { getBundledConfigDir, getConfigDir } from './configPaths';

async function exists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function copyMissingFile(sourcePath: string, targetPath: string): Promise<boolean> {
    try {
        await fs.copyFile(sourcePath, targetPath);
        return true;
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') return false;
        throw error;
    }
}

async function migrateLegacyConfigFiles(targetDir: string): Promise<string[]> {
    const legacyDir = path.join(app.getPath('userData'), 'data');
    if (path.resolve(legacyDir) === path.resolve(targetDir)) return [];

    const copied: string[] = [];
    for (const fileName of PERSISTED_CONFIG_FILES) {
        const targetPath = path.join(targetDir, fileName);
        if (await exists(targetPath)) continue;

        if (await copyMissingFile(path.join(legacyDir, fileName), targetPath)) {
            copied.push(fileName);
        }
    }
    return copied;
}

/** 启动时统一初始化配置目录，优先使用打包默认值，再回退迁移旧 userData/data 配置。 */
export async function ensureConfigFiles(): Promise<string[]> {
    const targetDir = getConfigDir();
    await fs.mkdir(targetDir, { recursive: true });

    const copied: string[] = [];
    const bundledDir = getBundledConfigDir();
    if (path.resolve(bundledDir) !== path.resolve(targetDir)) {
        for (const fileName of PERSISTED_CONFIG_FILES) {
            const targetPath = path.join(targetDir, fileName);
            if (await exists(targetPath)) continue;
            if (await copyMissingFile(path.join(bundledDir, fileName), targetPath)) {
                copied.push(fileName);
            }
        }
    }

    copied.push(...(await migrateLegacyConfigFiles(targetDir)));
    return copied;
}
