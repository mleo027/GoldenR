#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (existsSync('.git')) {
    try {
        execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' });
        console.log('[git-hooks] core.hooksPath=.githooks');
    } catch {
        console.warn('[git-hooks] 无法写入当前仓库 Git 配置，请手动执行：git config core.hooksPath .githooks');
    }
}
