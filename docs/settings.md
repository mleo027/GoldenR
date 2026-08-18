# 设置与偏好

点击标题栏设置图标打开设置窗口。设置区分为平台设置和 API 调试模块设置。

## 平台设置

| 设置     | 说明                           | 存储                        |
| -------- | ------------------------------ | --------------------------- |
| 深色模式 | 切换亮色 / 深色主题            | `app.json` → `darkMode`     |
| 紧凑模式 | 缩小间距，显示更多内容         | `app.json` → `compactMode`  |
| 显示行号 | 响应表格左侧显示行序号         | `app.json` → `showRowIndex` |
| KCBP     | 可执行文件、工作目录、启动参数 | `kcbp.env.json`             |
| 关于     | 应用名称、版本与快捷键         | -                           |

## 请求设置

管理 KCBP 连接环境：

| 字段     | 说明                   |
| -------- | ---------------------- |
| 环境名称 | 显示名称               |
| Host     | 例如 `127.0.0.1:21000` |
| Queue    | 请求队列名             |
| Timeout  | 超时秒数               |

选中环境后会自动应用到全部接口；也可以直接在请求界面的环境下拉框中切换。

存储：`api-debug.env.json` → `kcxpEnvironments`、`activeKcxpEnvironmentId`。

## 数据库设置

配置 SQL Server 连接，供入参智能提示规则 SQL 和脚本模式 `query()` 使用。

存储：`db.json`。

## 提示规则

管理 `param-suggest-rules.json` 中的入参下拉规则，包括规则 SQL、触发时机、优先级、依赖条件和规则测试。

## 相关代码

- 设置窗口：`src/components/layout/SettingsModal.tsx`
- 平台注册：`src/platform/registry/platformSettings.tsx`
- API 调试模块设置：`src/modules/api-debug/index.tsx`
- 提示规则：`src/modules/api-debug/components/settings/ParamSuggestRulesSettings.tsx`
- 数据库连接：`src/modules/api-debug/components/settings/DbConnectionSettings.tsx`
