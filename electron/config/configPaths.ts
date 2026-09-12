import { app } from 'electron';

/**
 * 配置中心目录：
 * - portable：跟随可执行文件目录，保持绿色便携
 * - 安装版：使用 Electron userData 根目录
 * - 开发：项目根目录，复用仓库里的样例配置
 */
export function getConfigDir(): string {
    if (app.isPackaged) {
        const portableExecutableDir = process.env.PORTABLE_EXECUTABLE_DIR?.trim();
        if (portableExecutableDir) {
            return portableExecutableDir;
        }
        return app.getPath('userData');
    }
    return process.cwd();
}
