# adapter

## 在 new_golden 内构建

本目录已并入 Golden API 仓库（`electron/adapter/native/`）。常规情况下不要在本目录单独操作，而是在仓库根目录执行：

```bash
npm run build:native
```

该命令依次完成：`npm install`（安装 node-addon-api）→ `scripts\build-native.cmd`（MSVC 编译链接）→ 将 `build/Release/adapter.node` 覆盖拷贝到上级 `electron/adapter/adapter.node` 供 Electron 加载。

工具链要求不变：Windows + Node.js 18+ + MSVC（ScopeCppSDK vc15，可用环境变量 `VS_CPP_SDK` 覆盖路径）。

Node.js 原生扩展，用于在 JavaScript 中调用金证 KCBP 后台接口。通过 KCBPCli 与 KCXP 中间件通信，支持文本字段与二进制字段入参。

## 架构

```
Node.js (app.js)
    |
    v
adapter.node (C++ / node-addon-api)
    |
    v
KCBPCli.lib -> KCXP 中间件 (TCP, 默认端口 21000)
    |
    v
KCBP 后台服务
```

## 环境要求

| 依赖 | 说明 |
|------|------|
| Windows | 当前仅支持 Windows |
| Node.js | 建议 18+，编译与运行请使用同一版本 |
| MSVC | ScopeCppSDK vc15 或完整 Visual Studio C++ 工具链 |
| 金证 SDK | `KCBPCli.lib`（编译）+ `KCBPCli.dll` 等（运行） |

## 目录结构

```
adapter/
├── src/adapter.cpp              # Node 导出层，导出 callKCBP
├── include/
│   ├── self/
│   │   ├── KCBPClient.hpp       # KCBP 客户端封装
│   │   ├── tools.hpp            # NAPI 与 JSON 转换
│   │   └── utils.hpp            # 校验、编码转换
│   ├── kcbpcli/lib/
│   │   ├── KCBPCli.h            # 金证头文件
│   │   └── KCBPCli.lib          # 链接库（编译用）
│   └── json/                    # nlohmann/json
├── dll/                         # 运行时 DLL、证书、ini
├── scripts/build-native.cmd     # 默认编译脚本（cl + link）
├── binding.gyp                  # node-gyp 配置（可选）
├── app.js                       # 调用示例
└── package.json
```

## SDK 文件说明

| 目录 | 内容 | 用途 |
|------|------|------|
| `include/kcbpcli/lib/` | `KCBPCli.h` + `KCBPCli.lib` | 编译、链接 |
| `dll/` | `KCBPCli.dll`、`kcxpapi.dll` 等 | 运行时加载 |

运行前需将 `dll` 加入 `PATH`：

```javascript
const dllDir = './dll';
process.env.PATH = dllDir + ';' + process.env.PATH;
```

## 安装与编译

### 1. 安装依赖

```bash
npm install
```

### 2. 编译（推荐：原生脚本）

默认使用 `scripts/build-native.cmd`，直接调用 MSVC `cl.exe`，不依赖 node-gyp 识别 Visual Studio：

```bash
npm run build
```

编译产物：`build/Release/adapter.node`

首次编译若缺少 Node 头文件，脚本会自动执行 `node-gyp install` 下载。

#### 自定义 MSVC 路径

默认编译器路径：

```
E:\software\vs_studio\package\SDK\ScopeCppSDK\vc15
```

若路径不同，设置环境变量后编译：

```bat
set VS_CPP_SDK=E:\software\vs_studio\package\SDK\ScopeCppSDK\vc15
npm run build
```

### 3. 可选：node-gyp 编译

若本机已正确安装并注册 Visual Studio（含 C++ 工作负载）：

```bash
npm run build:gyp
```

## 运行

```bash
npm test
# 或编译并运行
npm run buildandrun
```

## API

### `callKCBP(param)`

同步调用 KCBP 接口，返回 JSON 对象。

```javascript
const adapter = require('./build/Release/adapter');
const result = adapter.callKCBP(param);
```

### 请求参数

```json
{
  "connection": {
    "ip": "127.0.0.1",
    "port": "21000",
    "connecttimeout": "5",
    "requesttimeout": "65",
    "reqqueue": "req1",
    "ansqueue": "ans1"
  },
  "param": {
    "msgtype": "856065",
    "fields": {
      "g_serverid": "1",
      "g_funcid": "856065",
      "g_operid": "8888",
      "fundid": "10000030547",
      "databody": "<Buffer>",
      "datasize": "226"
    }
  }
}
```

#### connection 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `ip` | string | KCXP 服务 IP |
| `port` | string | 端口，默认 `21000` |
| `connecttimeout` | string | 连接超时（秒），默认 `5` |
| `requesttimeout` | string | 请求超时（秒），默认 `15` |
| `reqqueue` | string | 请求队列名 |
| `ansqueue` | string | 应答队列名 |

#### param 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `msgtype` | string | 服务名 / 消息类型 |
| `fields` | object | 业务入参字段 |

### 响应格式

成功时典型结构：

```json
{
  "level": "0",
  "code": "0",
  "msg": "成功",
  "data": [{ "...": "..." }]
}
```

失败时：

```json
{
  "code": -1001,
  "msg": "错误描述",
  "level": "888"
}
```

| code | 含义 |
|------|------|
| `-1001` | 入参校验失败 |
| `-1002` | 后端调用失败 |
| `-1003` | 异常（连接失败、调用异常等） |

应答文本字段经 GBK 转 UTF-8 后返回。

## 二进制入参

`databody` 等二进制字段需走底层 `KCBPCLI_SetVal(key, data, size)`，不能使用普通字符串的 `KCBPCLI_SetValue`。

### 方式一：传 Buffer（推荐）

```javascript
const fs = require('fs');
const content = fs.readFileSync('./1.zip');

param.param.fields.databody = content;
param.param.fields.datasize = String(content.length);
```

`Buffer` 或 `Uint8Array` 在 C++ 层自动识别为二进制并调用 `KCBPCLI_SetVal`。

### 方式二：文件路径

C++ 层支持 `file(...)` 语法，由本地读取文件：

```javascript
"databody": "file(D:/data/1.zip)"
```

### 文本字段

普通字符串、数字走 `KCBPCLI_SetValue`。以 `0x` 开头的字符串会去掉前缀后传递。

注意：不要使用 `readFileSync(path, 'binary')`，请直接传 `Buffer`。

## 调用示例

```javascript
const dllDir = './dll';
process.env.PATH = dllDir + ';' + process.env.PATH;

const fs = require('fs');
const adapter = require('./build/Release/adapter');

const param = {
  connection: {
    connecttimeout: '5',
    port: '21000',
    requesttimeout: '65',
    ip: '127.0.0.1',
    reqqueue: 'req1',
    ansqueue: 'ans1',
  },
  param: {
    msgtype: '856065',
    fields: {
      g_serverid: '1',
      g_funcid: '856065',
      g_operid: '8888',
      fundid: '10000030547',
    },
  },
};

const zipData = fs.readFileSync('./1.zip');
param.param.fields.databody = zipData;
param.param.fields.datasize = String(zipData.length);

const result = adapter.callKCBP(param);
console.log(result);
```

完整示例见 `app.js`。

## npm 脚本

| 命令 | 说明 |
|------|------|
| `npm run build` | 使用 `build-native.cmd` 编译（默认） |
| `npm run build:gyp` | 使用 node-gyp 编译 |
| `npm run buildandrun` | 编译后运行 `app.js` |
| `npm test` | 运行 `app.js` |
| `npm run config64` | node-gyp 配置 x64 |
| `npm run config32` | node-gyp 配置 ia32 |

## 独立 C++ 测试

可用 Visual Studio 打开 `main/main.sln` 编译 `main.cpp`，不依赖 Node 环境。

## 日志

运行日志写入项目根目录 `run.log`（追加模式）。

## 注意事项

1. 当前仅实现 KCBP，KGBP、KMID 等类型尚未实现。
2. 默认编译依赖 ScopeCppSDK vc15 中的 x64 `cl.exe`；若换机器请调整 `VS_CPP_SDK`。
3. 编译绑定的 Node 版本应与运行时一致。
4. 应答解析目前将字段作为 GBK 文本返回；若后台返回二进制字段需额外处理。

## License

ISC
