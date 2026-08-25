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
- adapter 并行接入 KGBP 协议：封装 kgbpcli SDK，新增 `callKGBP` 导出与 JS 层按 type 统一分发。
- api-debug 单调用页新增协议选择器，KGBP 可从界面直接发起。
