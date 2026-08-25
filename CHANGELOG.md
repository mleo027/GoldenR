# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- 从 GoldenAPI 拆分出独立 Golden API 应用。
- 模块注册只保留 `api-debug`。
- Electron 主进程只保留 KCBP、SQL 参数提示、导入导出、窗口和存储 IPC。
- 精简依赖、构建配置、docs 与 scripts。
- KCBP 原生 adapter 源码迁入 `electron/adapter/native`，新增 `npm run build:native` 一键编译。
- native 源码统一为 UTF-8 编码，`build-native.cmd` 增加 `/utf-8` 编译选项。
