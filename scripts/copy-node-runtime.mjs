import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = process.execPath;
const nodeName = process.platform === 'win32' ? 'node.exe' : path.basename(source);
const targetDir = path.join(rootDir, 'resources', 'node');
const target = path.join(targetDir, nodeName);

if (path.resolve(source) !== path.resolve(target)) {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(source, target);
}

console.log(`Prepared bundled Node ${process.version}: ${path.relative(rootDir, target)}`);
