# 数据持久化

Golden API Debug 的本地数据由配置中心统一管理。

## 配置中心

| 运行方式 | 配置文件目录               |
| -------- | -------------------------- |
| 安装版   | Electron `userData` 根目录 |
| portable | portable exe 所在目录      |
| 开发模式 | 项目根目录                 |

所有持久化配置文件都通过 `src/config/registry.ts` 登记，并由
`electron/config/configPaths.ts` 统一解析路径。旧版 `userData/data` 下的配置会在启动时迁移到新的配置中心目录。

## 主要文件

| 文件                       | 用途                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| `app.json`                 | 全局偏好：`darkMode`、`compactMode`、`showRowIndex`、`autoSave`、`sidebarVisible`、`activeModuleId` |
| `api-debug.env.json`       | API 调试偏好：`editorMode`、`kcxpEnvironments`、`activeKcxpEnvironmentId`                           |
| `project.json`             | API 调试接口数据：项目、接口、地址、入参、脚本、收藏                                                |
| `settings.json`            | API 调试导航状态：`activeProjectIndex`、`activeCaseIndex`、`expandedProjectIds`、`openCaseIds`      |
| `db.json`                  | SQL Server 连接配置                                                                                 |
| `param-suggest-rules.json` | 入参智能提示规则                                                                                    |
| `kcbp.env.json`            | KCBP 可执行文件、工作目录与启动参数                                                                 |

## 一次性迁移

当前仅保留以下历史迁移：

| 旧位置                                    | 新位置               |
| ----------------------------------------- | -------------------- |
| `settings.json.preferences`               | `app.json`           |
| `app.json` 中的 `editorMode` / KCXP 字段  | `api-debug.env.json` |
| `tracecode.env.json` 中的 KCBP 运行时字段 | `kcbp.env.json`      |

迁移时会写入备份文件，并从旧位置移除已迁移字段。

## 不持久化

- KCBP 响应缓存
- 运行日志
- 脚本 `console` 输出

## 相关代码

| 数据                             | 代码入口                                                    |
| -------------------------------- | ----------------------------------------------------------- |
| `app.json`                       | `src/store/appEnvData.ts`                                   |
| `api-debug.env.json`             | `src/modules/api-debug/store/apiDebugEnvData.ts`            |
| `project.json` / `settings.json` | `src/modules/api-debug/store/tabsData.ts`                   |
| `db.json` / 提示规则             | `src/modules/api-debug/store/paramSuggestData.ts`           |
| `kcbp.env.json`                  | `electron/services/kcbp/kcbpRuntimeConfigStore.ts`          |
| 配置中心路径                     | `src/config/registry.ts` / `electron/config/configPaths.ts` |
| 退出前 flush                     | `src/lib/persistFlush.ts`                                   |
