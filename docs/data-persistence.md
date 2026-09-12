# 数据持久化

应用自身的运行时配置和 API 调试数据只保存在 SQLite `golden.db` 中。运行时不会读取、创建或复制 `*.json` 配置文件，也不再执行旧 JSON 配置迁移。

## 主要存储

| SQLite 表                                               | 内容                                |
| ------------------------------------------------------- | ----------------------------------- |
| `app_preferences`                                       | 主题、紧凑模式、行号等应用偏好      |
| `workspace_state`                                       | 工作区导航、页签和 API 调试偏好     |
| `projects` / `case_folders` / `cases` / `case_params`   | 项目、目录、接口和参数              |
| `api_debug_environments` / `api_debug_environment_vars` | KCXP/KCBP 请求环境                  |
| `db_connections`                                        | SQL Server 连接配置                 |
| `param_suggest_rules`                                   | 入参智能提示规则                    |
| `common_param_sets` / `common_params`                   | 公共参数集                          |
| `kcbp_runtime_config`                                   | KCBP 可执行文件、工作目录和启动参数 |
| `request_history`                                       | 请求历史                            |

复杂结构会在 SQLite TEXT 字段中序列化为 JSON，这是数据库内部表示，不是运行时 JSON 文件。

## 用户文件

JSON/INI 只用于用户主动执行的导入、导出和参数文件操作，不参与运行时配置初始化。

## 相关代码

- 数据库连接与初始化：`electron/database/connection.ts`、`electron/database/initializeDatabase.ts`
- schema：`electron/database/schema/schema.sql`
- 结构迁移：`electron/database/schema/migrations.ts`
- 读写 repository：`electron/database/repositories/configRepository.ts`
- renderer 持久化：`src/services/persistence` 与各领域 `*Data.ts`
