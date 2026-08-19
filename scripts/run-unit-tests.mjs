#!/usr/bin/env node
/**
 * 按模块批量跑 Vitest，便于维护常用功能回归。
 *
 * 用法：
 *   node scripts/run-unit-tests.mjs           # 全量
 *   node scripts/run-unit-tests.mjs kcbp      # 地址/参数/响应/KCBP 编排
 *   node scripts/run-unit-tests.mjs import    # JSON/INI 导入
 *   node scripts/run-unit-tests.mjs script    # 脚本自动化
 *   node scripts/run-unit-tests.mjs suggest   # 入参提示规则
 *   node scripts/run-unit-tests.mjs persist   # 持久化 merge
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const suites = {
    kcbp: [
        'electron/services/kcbp/kcbp.test.ts',
        'src/modules/api-debug/utils/kcbp/kcbpAddress.test.ts',
        'src/modules/api-debug/utils/kcbp/kcbpParams.test.ts',
        'src/modules/api-debug/utils/kcbp/kcbpResponse.test.ts',
        'src/modules/api-debug/services/kcbpCallService.test.ts',
    ],
    import: [
        'src/modules/api-debug/utils/import/kuabImport.test.ts',
        'src/modules/api-debug/utils/import/configIniImport.test.ts',
        'src/modules/api-debug/utils/import/configIniExport.test.ts',
        'src/modules/api-debug/utils/import/readIniText.test.ts',
    ],
    script: [
        'src/modules/api-debug/utils/script/apiScript.test.ts',
        'src/modules/api-debug/utils/script/scriptTest.test.ts',
        'src/modules/api-debug/utils/script/scriptConsole.test.ts',
        'src/modules/api-debug/utils/script/formatJavaScript.test.ts',
    ],
    suggest: [
        'electron/services/suggest/suggestRuleEngine.test.ts',
        'src/modules/api-debug/utils/suggest/paramSuggestResolve.test.ts',
        'src/modules/api-debug/utils/suggest/paramSuggestSql.test.ts',
        'src/modules/api-debug/utils/suggest/paramSuggestRuleDisplay.test.ts',
    ],
    persist: [
        'src/store/appEnvData.test.ts',
        'src/modules/api-debug/store/apiDebugEnvData.test.ts',
        'src/modules/api-debug/store/paramSuggestData.test.ts',
    ],
    core: [
        'src/modules/api-debug/utils/workspace/caseLabel.test.ts',
        'src/modules/api-debug/utils/workspace/paramText.test.ts',
        'src/utils/table.test.ts',
        'src/utils/formatDateTime.test.ts',
        'src/utils/exportTable.test.ts',
        'src/modules/api-debug/utils/workspace/tabDraftRegistry.test.ts',
        'src/modules/api-debug/utils/workspace/caseSidebarVirtualList.test.ts',
        'src/modules/api-debug/utils/workspace/kcxpEnvironment.test.ts',
    ],
};

function runVitest(files) {
    const args = ['vitest', 'run', ...files];
    const result = spawnSync('npx', args, {
        cwd: root,
        stdio: 'inherit',
        shell: process.platform === 'win32',
    });
    process.exit(result.status ?? 1);
}

const target = process.argv[2];

if (!target || target === 'all') {
    runVitest([]);
} else {
    const files = suites[target];
    if (!files) {
        console.error(`未知套件: ${target}`);
        console.error(`可用: all, ${Object.keys(suites).join(', ')}`);
        process.exit(1);
    }

    console.log(`Running suite "${target}" (${files.length} files)...`);
    runVitest(files);
}
