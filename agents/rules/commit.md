# 提交规则

## 提交前检查

提交前必须：

1. 查看 `git status`，确认没有把 `golden.db`、WAL 文件、备份目录、`dist` 或其他生成物加入暂存区。
2. 阅读 staged diff，确认修改范围与需求一致。
3. 执行 `git diff --cached --check`。
4. 根据改动运行目标测试；涉及通用逻辑时运行完整检查：

```bash
npm run typecheck
npm run test:api
npx vite build
npm run lint
npm run ipc:check
```

5. 修改 SQL、Markdown 或代码后运行对应的 Prettier 检查。

## 提交信息

- 使用 Conventional Commits 格式，例如 `feat: ...`、`fix: ...`、`refactor: ...`、`test: ...`、`docs: ...`、`chore: ...`。
- 一次提交只表达一个完整意图；数据库 schema、migration、repository 和测试应作为同一功能提交。
- 提交信息使用简洁、明确的英文动词短语，必要时在正文说明迁移兼容性和验证结果。
- 不把无关格式化、临时调试和用户数据混入功能提交。

## Hooks 与失败处理

- 必须使用正常 `git commit`，严禁使用 `--no-verify` 绕过 hooks。
- hook 失败时定位并修复原因；如果是已有问题，记录具体文件、命令和影响范围。
- 不通过删除测试、降低校验强度或修改规则来制造“通过”。只有确认规则本身误报时，才做最小、可测试的规则修复。
- 提交后再次检查 `git status` 和 `git log -1 --oneline`，并向用户报告提交号和验证结果。

## 禁止提交

- `golden.db`、`golden.db-*`、`legacy-config-backup/`。
- `dist/`、`dist-electron/`、coverage、日志、临时文件和本机环境文件。
- 密钥、密码、token、连接字符串及包含真实用户数据的配置。
- 从只读备份目录复制回来的无关模块或未经验证的原生二进制文件。
