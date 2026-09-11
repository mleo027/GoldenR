#!/usr/bin/env node
// KUABCli.dll 只从自身所在目录读取 KCBPCli.json 与 <AppID>.key。这两个文件是部署资产
// （已被 .gitignore 排除），打包时由 extraResources 整目录拷贝到 resources/adapter/kuab，
// 因此缺件不会让构建失败，只会产出 KUAB 连不上的包。此脚本在打包前显式校验它们的存在性。
//
// 默认只告警，保证在拿不到厂商凭据的机器上仍可构建；发布前用 --strict 或
// KUAB_CREDENTIALS_STRICT=1（npm run check:kuab）把它变成失败项。
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const KUAB_DIR = join(process.cwd(), 'electron', 'adapter', 'kuab');
const CONFIG_NAME = 'KCBPCli.json';
const STRICT = process.argv.includes('--strict') || process.env.KUAB_CREDENTIALS_STRICT === '1';

const problems = [];
const warnings = [];

function readConfig() {
    const configPath = join(KUAB_DIR, CONFIG_NAME);
    if (!existsSync(configPath)) {
        problems.push(`${CONFIG_NAME} 不存在：${configPath}`);
        return null;
    }
    try {
        const parsed = JSON.parse(readFileSync(configPath, 'utf8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            problems.push(`${CONFIG_NAME} 不是 JSON 对象`);
            return null;
        }
        return parsed;
    } catch (error) {
        problems.push(`${CONFIG_NAME} 无法解析：${error.message}`);
        return null;
    }
}

function readKeyFile(keyPath) {
    try {
        return readFileSync(keyPath, 'utf8');
    } catch (error) {
        warnings.push(`${keyPath} 无法读取：${error.message}`);
        return '';
    }
}

const config = readConfig();
let appId = '';
if (config) {
    appId = String(config.AppID ?? '').trim();
    if (!appId) problems.push(`${CONFIG_NAME} 缺少 AppID，无法定位同名私钥`);
    if (!String(config.AppSecret ?? '').trim()) problems.push(`${CONFIG_NAME} 缺少 AppSecret`);
}

if (appId) {
    const keyPath = join(KUAB_DIR, `${appId}.key`);
    if (!existsSync(keyPath)) {
        problems.push(`缺少 RSA 私钥 ${appId}.key（文件名必须与 AppID 一致）：${keyPath}`);
    } else if (!readKeyFile(keyPath).includes('-----BEGIN')) {
        warnings.push(`${appId}.key 内容不像 PEM 私钥，InitPrivateKeyString 可能失败`);
    }
}

const presentKeys = existsSync(KUAB_DIR)
    ? readdirSync(KUAB_DIR).filter((entry) => entry.toLowerCase().endsWith('.key'))
    : [];

for (const warning of warnings) console.warn(`[kuab-credentials] 提醒：${warning}`);

if (problems.length === 0) {
    console.log(`[kuab-credentials] KUAB 部署资产完整（AppID=${appId}）`);
} else {
    console.error('[kuab-credentials] KUAB 部署资产不完整，打包出的应用会无法连接 KUAB：');
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error(
        `  目录中现有私钥：${presentKeys.length > 0 ? presentKeys.join(', ') : '（无）'}`,
    );
    console.error(`  修复：把厂商提供的 ${CONFIG_NAME} 与 <AppID>.key 放入 ${KUAB_DIR}`);
    if (STRICT) {
        process.exitCode = 1;
    } else {
        console.error('[kuab-credentials] 当前仅告警；发布前请运行 npm run check:kuab 使其失败。');
    }
}
