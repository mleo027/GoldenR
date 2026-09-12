# 用 MCP 客户端接入 GoldenR

GoldenR 把自身能力以 **MCP（Model Context Protocol）** 暴露给外部 Agent。
能力不由应用内置的模型驱动——**模型与凭据都在你选的客户端里**。

## 前置

1. 应用已启动（MCP 服务器随应用启动，绑定 `127.0.0.1` 的随机端口）；
2. 端点信息在配置目录的 `mcp-endpoint.json`：
   - 开发模式（`npm run dev`）：仓库根目录；
   - 安装版：Electron `userData` 目录（便携版为可执行文件所在目录）。

该文件含**本次启动有效**的 Bearer token，已被 `.gitignore` 忽略，请勿提交或外传。
应用退出时会删除它；若应用崩溃，该文件会残留，客户端会报连接失败——删掉后重启应用即可。

## 方式一：stdio 垫片（推荐，适用于只支持 stdio 的客户端）

垫片把 stdio 上的 JSON-RPC 转发到应用内的 HTTP 端点，因此客户端不需要知道端口与
token，应用重启轮换凭据后也能自愈。

```jsonc
{
  "mcpServers": {
    "goldenr": {
      "command": "node",
      "args": ["<仓库绝对路径>/scripts/mcp-stdio.mjs"],
    },
  },
}
```

- **Claude Desktop**：写入 `claude_desktop_config.json` 的 `mcpServers`。
- **Cursor**：写入 `.cursor/mcp.json`（或全局 `~/.cursor/mcp.json`）的 `mcpServers`。
- **其它**：任何支持 `command` + `args` 启动 stdio MCP 服务器的客户端同理。

若配置目录不是默认位置，用 `--endpoint=<绝对路径>` 或环境变量 `MCP_ENDPOINT_FILE` 指定：

```jsonc
{
  "mcpServers": {
    "goldenr": {
      "command": "node",
      "args": ["<仓库绝对路径>/scripts/mcp-stdio.mjs", "--endpoint=/path/to/mcp-endpoint.json"],
    },
  },
}
```

## 方式二：直接连 HTTP 端点

支持 Streamable HTTP 的客户端可以直接使用端点文件里的 `url` 与 `token`：

```
POST http://127.0.0.1:<port>/mcp
Authorization: Bearer <token>
Content-Type: application/json
```

**注意**：token 每次应用启动都会轮换，直接连 HTTP 的配置需要在应用重启后更新。

## 验证

```bash
# 应用运行中
node scripts/mcp-smoke.mjs
```

期望输出：

```
[mcp-smoke] ✓ initialize：goldenr <版本>（协议 2025-06-18）
[mcp-smoke] ✓ notifications/initialized
[mcp-smoke] ✓ tools/list：N 个工具
    - automation_list_scenarios
    ...
[mcp-smoke] ✓ tools/call automation_list_scenarios：...
[mcp-smoke] 通过
```

## 当前暴露的能力

| 工具                           | 说明                                    |
| ------------------------------ | --------------------------------------- |
| `automation_list_scenarios`    | 列出当前工作区的自动化场景              |
| `automation_read_scenario`     | 读取场景脚本                            |
| `automation_write_scenario`    | 写入/新建场景脚本（返回旧脚本以便回滚） |
| `automation_list_environments` | 列出 KCXP 运行环境                      |
| `automation_run_scenario`      | 运行场景并返回报告                      |
| `automation_read_report`       | 读取最近一次运行报告                    |

安全约束对外部调用**同样生效**：生产环境禁写、SQL 白名单校验、报告行数限制都在模块
运行时内部执行，与调用方是谁无关。

## 排障

| 现象               | 原因与处理                                                                      |
| ------------------ | ------------------------------------------------------------------------------- |
| `读不到端点文件`   | 应用没在运行；或客户端的工作目录不是仓库根，需用 `--endpoint` 指定绝对路径      |
| 连接失败 / 401     | 端点文件是崩溃残留，或应用重启后 token 已轮换——重启应用（stdio 方式会自动重读） |
| `tools/list` 为空  | 渲染层还没把能力清单推上来（应用刚启动的短暂窗口），稍后重试                    |
| 工具返回 `isError` | 这是**工具执行失败**（如场景不存在），不是协议错误；文本里是具体原因            |
