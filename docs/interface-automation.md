# 独立接口自动化

“接口自动化”是与“API 调试”并列的模块，按“项目 → 多级目录 → 场景”组织。每个场景保存一份受 DSL 约束的 JavaScript 脚本；脚本可通过 `t.step` 编排 SQL 查询、SQL 写操作、KCXP 接口调用、变量、日志、断言和逆序清理。

脚本在独立 Web Worker 中运行。报告根据 Worker 发出的结构化步骤和动作事件生成，不解析 JavaScript 源码，因此允许条件、循环和嵌套步骤。第一版支持单场景运行和当前目录串行运行；禁用场景会跳过，单场景失败后继续执行后续场景。

## DSL

- `scenario(metadata, handler)`：脚本唯一入口。
- `input.string/number/boolean/select()`：声明运行输入并生成表单。
- `t.input`、`t.vars.get/set/all`：读取输入和传递运行期变量。
- `t.step`、`t.cleanup`：记录步骤并在失败或取消后逆序清理。
- `t.sql.query`：仅允许 `SELECT`。
- `t.sql.execute`：仅允许单条参数化 DML 或静态 `EXEC`。
- `t.api.call`：按所选 KCXP 环境调用 KCBP、KGBP 或 KUAB。
- `t.expect` / `t.expect.soft`：硬断言与软断言。
- `t.log/info/warn`：写入结构化报告。

## 安全边界

自动化 SQL 写入默认关闭。环境必须设置为开发、测试或 UAT，并在“设置 → 请求”中显式开启写库；生产环境不能开启。Electron 主进程根据持久化环境 ID 重新读取环境和数据库配置，不接受 Renderer 传入写权限或连接信息。

写 SQL 拒绝 DDL、显式事务、`USE`、动态 `EXEC`、`sp_executesql` 和多语句批次。每次调用独立提交。敏感输入、常见密码字段及与敏感输入相同的值在报告显示和持久化前统一遮罩。

单场景默认限制为 5 分钟、200 个框架动作、50 次 API 和 100 次 SQL。同步死循环超时后强制终止 Worker，此时报告会注明清理未执行。

## 存储

项目、目录、场景脚本和最近报告只存入 SQLite。每个场景仅保留最近一次报告，每个目录仅保留最近一次批跑汇总；动态动作详情存为 SQLite TEXT 内部 JSON。SQL/API 报告结果最多保留前 100 行，并记录截断状态。

API 调试用例右键菜单中的“生成自动化场景”会生成一次性副本，不建立实时引用。
