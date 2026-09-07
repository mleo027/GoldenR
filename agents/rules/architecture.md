# 架构规则

## 模块边界

### Renderer

- 入口为 `src/main.tsx`、`src/App.tsx`，模块注册位于 `src/platform/registry/app-modules.tsx`。
- API 调试功能全部位于 `src/modules/api-debug`，按 UI、store、service、utils、导入导出和脚本职责组织。
- Renderer 通过 store/context 使用数据，不直接依赖 Electron 主进程实现细节。

### Electron

- 入口为 `electron/main.ts`，启动编排位于 `electron/app/bootstrap.ts`，IPC 注册位于 `electron/ipc/register.ts`。
- KCBP/KGBP 调用位于 `electron/services/kcbp`；响应归一化位于 `response.ts`。
- 参数建议位于 `electron/services/suggest`，数据库访问不得散落在 IPC handler 或 UI 中。
- 原生适配器源码只在 `electron/adapter/native` 维护，`electron/adapter` 保存构建所需产物。

## SQLite 持久化

- `golden.db` 是唯一运行时配置来源，位置遵循开发、便携版和安装版的既有目录策略。
- 连接管理：`electron/database/connection.ts`。
- 启动初始化：`electron/database/initializeDatabase.ts`。
- 完整建表脚本：`electron/database/schema/schema.sql`。
- 结构迁移：`electron/database/schema/migrations.ts`，每次结构变化递增版本并保证幂等。
- 读写入口：`electron/database/repositories`。
- 旧数据导入：`electron/database/legacy-import`，由 `data_migrations` 标记控制且只执行一次。

## 数据模型约束

- 项目通过 `projects` 关联用例；用例通过 `cases.project_id` 关联项目。
- 多级目录通过 `case_folders.parent_id` 自关联；用例通过 `cases.folder_id` 关联目录。
- 目录和用例必须保留 `project_id`，防止跨项目关联。
- 请求历史必须包含 `project_id`、`case_id` 等过滤字段，并维护对应索引。
- 公共参数使用 `common_param_sets` 与 `common_params` 父子表，外键启用级联删除。
- 动态 KCBP、规则和请求历史内容使用 TEXT 序列化保存，JSON 合法性由应用层负责。

## 迁移与生命周期

- 启动顺序：打开连接、执行 schema migration、执行未完成的旧数据导入、加载运行时配置、注册 IPC、创建窗口。
- Schema migration 与 legacy data import 分离管理。
- 旧 JSON 导入必须在一个事务中完成；失败回滚且不写完成标记，允许下次启动重试。
- 导入成功后将旧文件移动到 `legacy-config-backup`，数据库存在且迁移完成后禁止再读写旧 JSON。
- 退出前等待待写事务和 flush 完成，再关闭数据库连接。
- 新增 repository 时补充内存数据库 CRUD、事务一致性、迁移升级和错误回滚测试。
