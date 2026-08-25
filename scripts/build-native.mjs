import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nativeDir = path.join(rootDir, 'electron', 'adapter', 'native');
const builtBinary = path.join(nativeDir, 'build', 'Release', 'adapter.node');
const targetBinary = path.join(rootDir, 'electron', 'adapter', 'adapter.node');

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        cwd: options.cwd ?? nativeDir,
    });
    if (result.status !== 0) {
        const reason = result.status !== null ? `code ${result.status}` : `signal ${result.signal}`;
        const detail = result.error?.message ? ` (${result.error.message})` : '';
        throw new Error(`${command} ${args.join(' ')} failed with ${reason}${detail}`);
    }
}

run('npm', ['install']);
run('cmd', ['/c', 'scripts\\build-native.cmd']);

if (!fs.existsSync(builtBinary)) {
    throw new Error(`Build did not produce ${builtBinary}`);
}
fs.copyFileSync(builtBinary, targetBinary);
console.log(
    `Copied ${path.relative(rootDir, builtBinary)} -> ${path.relative(rootDir, targetBinary)}`,
);
