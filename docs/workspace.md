# 用例集与工作区

API 调试模块左侧是用例集侧栏，负责管理项目、接口和顶部已打开页签。

工作区使用 SQLite `projects`、`case_folders`、`cases`、`case_params` 和 `workspace_state` 表持久化，不使用运行时 JSON 配置文件。

## 持久化范围

| SQLite 表                                             | 内容                                     |
| ----------------------------------------------------- | ---------------------------------------- |
| `projects` / `case_folders` / `cases` / `case_params` | 项目、目录、接口、地址、入参、脚本和收藏 |
| `workspace_state`                                     | 当前项目、当前接口、展开目录和打开页签   |

导入入口仍支持用户主动导入 JSON 和 INI 文件。

## 项目与接口

- 新建项目：侧栏顶部“项目”按钮或底部“新建项目”按钮
- 新建接口：项目行 hover 的 `+`，或项目右键“添加接口”
- 删除项目 / 接口：都需要二次确认
- 项目内至少保留一个接口；删到最后会补空占位接口

## 页签与选中

- 打开接口时会加入顶部页签
- 页签顺序和当前选中状态写入 `workspace_state`
- 关闭当前页签后会自动切到相邻页签

## 相关代码

| 模块              | 路径                                                         |
| ----------------- | ------------------------------------------------------------ |
| 侧栏 UI           | `src/modules/api-debug/components/workspace/CaseSidebar.tsx` |
| 页签栏            | `src/modules/api-debug/components/workspace/CaseTabBar.tsx`  |
| 工作区持久化      | `src/modules/api-debug/store/tabsData.ts`                    |
| 工作区 repository | `electron/database/repositories/configRepository.ts`         |
