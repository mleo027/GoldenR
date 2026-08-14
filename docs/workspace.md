# 用例集与工作区

API 调试模块左侧是用例集侧栏，负责管理项目、接口和顶部已打开页签。

当前工作区持久化只有两类文件：

- `project.json`：接口数据
- `settings.json`：导航与页签状态

`workspace.json` / `tabs.json` 已不再作为读取来源。

## 持久化范围

| 文件            | 内容                                                                         |
| --------------- | ---------------------------------------------------------------------------- |
| `project.json`  | 项目、接口、地址、入参、脚本、收藏                                           |
| `settings.json` | `activeProjectIndex`、`activeCaseIndex`、`expandedProjectIds`、`openCaseIds` |

## 项目与接口

- 新建项目：侧栏顶部“项目”按钮或底部“新建项目”按钮
- 新建接口：项目行 hover 的 `+`，或项目右键“添加接口”
- 删除项目 / 接口：都需要二次确认
- 项目内至少保留一个接口；删到最后会补空占位接口

## 页签与选中

- 打开接口时会加入顶部页签
- 页签顺序与 `settings.json.openCaseIds` 同步
- 关闭当前页签后会自动切到相邻页签
- 当前选中项目 / 接口写入 `settings.json`

## 排序规则

项目内接口会自动重排，规则是：

1. 收藏优先
2. `msgtype` 升序
3. 名称排序

加载、增删改、导入、改地址后都会重排，但会尽量保持当前选中接口 `id` 不变。

## 搜索与导入

- 搜索支持普通文本、`4101*` 这类功能号前缀，以及 `项目:核心` / `project:core`
- 导入入口在项目行 hover 的导入按钮
- 支持 JSON 和 INI
- 若项目里只有空占位接口，导入时会先替换占位接口

## 相关代码

| 模块         | 路径                                                         |
| ------------ | ------------------------------------------------------------ |
| 侧栏 UI      | `src/modules/api-debug/components/workspace/CaseSidebar.tsx` |
| 页签栏       | `src/modules/api-debug/components/workspace/CaseTabBar.tsx`  |
| 工作区持久化 | `src/modules/api-debug/store/tabsData.ts`                    |
| 工作区状态   | `src/modules/api-debug/store/tabsStore.tsx`                  |
| 排序逻辑     | `src/modules/api-debug/utils/workspace/caseLabel.ts`         |
