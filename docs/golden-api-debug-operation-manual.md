# Golden API 操作手册

## 查看图示

- 功能点总览（Mindmap）：[golden-api-debug-operation-manual.html](./golden-api-debug-operation-manual.html)
- 功能点总览（SVG）：[golden-api-debug-operation-manual.svg](./golden-api-debug-operation-manual.svg)
- 调用操作流程（Flow）：[golden-api-debug-call-flow.html](./golden-api-debug-call-flow.html)
- 调用操作流程（SVG）：[golden-api-debug-call-flow.svg](./golden-api-debug-call-flow.svg)

## 快速流程

1. 启动 Golden API ，安装版或便携版均可。
2. 打开工程，选择接口用例。
3. 编辑地址、功能号与入参。
4. 文件入参时输入 `@file`，应用自动打开文件选择器并回填 `@file:绝对路径`。
5. 发起 KCBP 调用，查看响应、运行日志或脚本控制台。
6. 按需导出 CSV/HTML，或在失败后修正入参重新调用。

## 功能点

| 功能域     | 主要操作                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| 启动与部署 | Setup 安装版、Portable 便携版、当前配置随包带入、便携版配置持久化                                        |
| 工作区管理 | 项目管理、用例树、多页签、草稿与撤销                                                                     |
| 请求调用   | Host/Queue/功能号、Key/Value 入参、快速填充、KCBP 调用/取消                                              |
| 文件入参   | 输入 `@file` 自动选择文件、回填绝对路径、文件大小提示、自动填写 `datasize`                               |
| 脚本自动化 | UI 模式生成脚本、`call()`/`query()`、断言与变量、脚本控制台与运行日志                                    |
| 响应查看   | 数据表格、全屏查看、导出 CSV/HTML                                                                        |
| 导入导出   | KUAB JSON、Config.ini、CSV、HTML                                                                         |
| 参数提示   | SQL Server 连接、`param-suggest-rules.json`、字段规则与 SQL 分析                                         |
| 设置       | 外观/深色模式、KCBP 运行时、请求环境、数据库/提示规则                                                    |
| 配置持久化 | `app.json`、`settings.json`、`project.json`、`db.json`、`api-debug.env.json`、`param-suggest-rules.json` |

## 便携版注意

便携版运行时会把配置保存到 exe 所在目录，不写入临时解压目录。首次启动时，如果 exe 旁边没有配置文件，会把随包带入的配置复制到 exe 旁边；如果已有同名配置，不会覆盖。
