# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- 从 GoldenAPI 拆分出独立 Golden API Debug 应用。
- 模块注册只保留 `api-debug`。
- Electron 主进程只保留 KCBP、SQL 参数提示、导入导出、窗口和存储 IPC。
- 精简依赖、构建配置、docs 与 scripts。
