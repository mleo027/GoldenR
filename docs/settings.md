# 设置与偏好

设置窗口管理平台设置和 API 调试模块设置，运行时数据均保存在 SQLite `golden.db`。

## 平台设置

| 设置     | 说明                           | 存储                  |
| -------- | ------------------------------ | --------------------- |
| 深色模式 | 切换亮色 / 深色主题            | `app_preferences`     |
| 紧凑模式 | 缩小间距，显示更多内容         | `app_preferences`     |
| 显示行号 | 响应表格左侧显示行序号         | `app_preferences`     |
| KCBP     | 可执行文件、工作目录、启动参数 | `kcbp_runtime_config` |

## 请求设置

管理 KCBP 连接环境，数据保存在 `api_debug_environments` 与 `api_debug_environment_vars`。

## 数据库设置

配置 SQL Server 连接，供入参智能提示规则 SQL 和脚本模式 `query()` 使用，数据保存在 `db_connections`。

## 提示规则

入参下拉规则保存在 `param_suggest_rules`。规则仍支持通过用户主动导入/导出 JSON 文件交换。

## 相关代码

- 设置窗口：`src/components/layout/SettingsModal.tsx`
- API 调试设置：`src/modules/api-debug/components/settings`
- 持久化 repository：`electron/database/repositories/configRepository.ts`
