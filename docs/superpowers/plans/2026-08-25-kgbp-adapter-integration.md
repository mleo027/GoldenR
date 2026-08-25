# KGBP 协议并行接入 adapter 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在 native adapter 中并行接入 KGBP 协议——封装 6702 分支的 kgbpcli SDK，向 JS 暴露与 KCBP 完全同构的调用接口（同一 payload 形状、同一响应结构、同一错误码契约）。

**架构：** 四层镜像扩展。C++ 层新增 `KGBPClient.hpp`（RAII 封装，吃掉 SDK 的生命周期管理、SetOption 顺序约束与多结果集解析）；native 导出层新增 `callKGBP(input)` 与现有 `callKCBP` 平行；JS 桥接层（kcbpBridge.cjs / adapter/index.cjs）按 `payload.type` 分发到对应导出，缺省 `'KCBP'` 完全向后兼容；TS 服务层透传协议类型。

**技术栈：** Node-addon-api (C++) / nlohmann json / MSVC cl.exe（build-native.cmd）/ CommonJS bridge / TypeScript + vitest。

## 已确认的设计决策

1. **服务名与功能号**：`param.msgtype` 兼作 KGBP 服务名（`KGBPCLI_OPTION_SERVICE_NAME`）；功能号取 `param.funcid`（可选，缺省回落到 `msgtype`）。可选包头字段 `nodeid`（uint32）、`sessionid`（uint64）放 `param`。
2. **应答编码**：KGBP 网关编码为 **UTF-8**，字段值直传不转码（区别于 KCBP 的 GBK→UTF8）。
3. **验收边界**：无真实 KGBP 联调环境。验收 = 编译成功 + `require` 冒烟导出 `callKGBP` + 入参校验返回 -1001 + 连接失败报错可读 + mock 单测通过。
4. SDK 来源：SVN `D:\KSPB\svn\6702\lbmdll\lbm_comm\kgbpcli`（r97506），只取 x64 产物，排除 pdb/32 位/jni。
5. 错误码契约沿用：-1001 入参校验失败 / -1002 后端调用失败 / -1003 异常。
6. 已知风险（记入 README）：`KGBPCli_RsGetColInfo` 的列名缓冲区格式文档未明确，实现按 `'\0'` 分隔解析并做数量防御，列名不足时回落 `col1..colN`。

## 文件结构

| 文件                                                                      | 操作                          | 职责                                                  |
| ------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------- |
| `electron/adapter/native/include/kgbpcli/include/KGBPCli.h`               | 新增（复制自 6702）           | KGBP SDK 头文件（UTF-8 BOM，原样）                    |
| `electron/adapter/native/include/kgbpcli/lib64/kgbpcli.lib`               | 新增（复制自 6702）           | x64 链接库                                            |
| `electron/adapter/{kgbpcli,hare_socket,jstp_pack,hare_socket_normal}.dll` | 新增（复制自 6702 lib64/win） | 运行时依赖，与现有 DLL 并列                           |
| `electron/adapter/native/scripts/build-native.cmd`                        | 修改                          | 加 `/I include\kgbpcli\include` 与链接 `kgbpcli.lib`  |
| `electron/adapter/native/include/self/KGBPClient.hpp`                     | 创建                          | RAII 封装 + `callKGBPBackend` 入口                    |
| `electron/adapter/native/include/self/utils.hpp`                          | 修改                          | 新增 `isValidKGBPInput`                               |
| `electron/adapter/native/src/adapter.cpp`                                 | 修改                          | 新增 `callKGBP` 导出，接通 `callBackend` 的 KGBP 分支 |
| `electron/kcbpBridge.cjs`                                                 | 修改                          | 加载整模块，按 `payload.type` 分发                    |
| `electron/adapter/index.cjs`                                              | 修改                          | 同上分发逻辑                                          |
| `electron/services/kcbp/kcbp.ts`                                          | 修改                          | payload 透传 `type`                                   |
| `electron/kcbpBridge.test.ts`                                             | 修改                          | 新增分发路由用例                                      |

---

### 任务 1：SDK 迁入与构建接线

**文件：**

- 复制来源：`D:/KSPB/svn/6702/lbmdll/lbm_comm/kgbpcli/`
- 新增：`electron/adapter/native/include/kgbpcli/include/KGBPCli.h`、`electron/adapter/native/include/kgbpcli/lib64/kgbpcli.lib`
- 新增：`electron/adapter/kgbpcli.dll`、`hare_socket.dll`、`jstp_pack.dll`、`hare_socket_normal.dll`
- 修改：`electron/adapter/native/scripts/build-native.cmd`

- [ ] **步骤 1.1：复制 SDK 文件**

```bash
SRC=/d/KSPB/svn/6702/lbmdll/lbm_comm/kgbpcli
DST=/d/KSPB/own_tool/new_golden/electron/adapter
mkdir -p "$DST/native/include/kgbpcli/include" "$DST/native/include/kgbpcli/lib64"
cp "$SRC/include/KGBPCli.h"          "$DST/native/include/kgbpcli/include/"
cp "$SRC/lib64/win/kgbpcli.lib"      "$DST/native/include/kgbpcli/lib64/"
cp "$SRC/lib64/win/kgbpcli.dll"           "$DST/"
cp "$SRC/lib64/win/hare_socket.dll"       "$DST/"
cp "$SRC/lib64/win/hare_socket_normal.dll" "$DST/"
cp "$SRC/lib64/win/jstp_pack.dll"         "$DST/"
# 校验：不入库 pdb / 32位 / jni
file "$DST/native/include/kgbpcli/lib64/kgbpcli.lib"   # 预期: current ar archive
file "$DST/kgbpcli.dll"                                # 预期: PE32+ ... x86-64
```

注意：源目录只读，禁止向 `/d/KSPB/svn/6702` 写入。

- [ ] **步骤 1.2：修改 build-native.cmd（两处精确编辑）**

编译行加 include（在 `/I"%ROOT%\include\kcbpcli\lib"` 之后插入一项）：

```bat
    /I"%ROOT%\include" /I"%ROOT%\include\self" /I"%ROOT%\include\json" /I"%ROOT%\include\kcbpcli\lib" /I"%ROOT%\include\kgbpcli\include" ^
```

链接行加 kgbpcli.lib：

```bat
    "%ROOT%\include\kcbpcli\lib\KCBPCli.lib" "%ROOT%\include\kgbpcli\lib64\kgbpcli.lib" "%NODE_GYP_LIB%\node.lib" ^
```

- [ ] **步骤 1.3：端到端构建验证**

运行：`npm run build:native`
预期：exit 0，末行 `Copied ... -> electron/adapter/adapter.node`。此阶段尚未引用任何 KGBP 符号，产物大小变化 ≤ 数 KB 属正常。

- [ ] **步骤 1.4：加载冒烟**

```bash
cd electron/adapter && PATH="$PWD:$PATH" node -e "console.log(Object.keys(require('./adapter.node')))"
```

预期输出：`[ 'callKCBP' ]`（新 DLL 不破坏既有加载）。

- [ ] **步骤 1.5：Commit**

```bash
git add electron/adapter/native/include/kgbpcli electron/adapter/*.dll electron/adapter/native/scripts/build-native.cmd electron/adapter/adapter.node
git commit -m "feat(adapter): 迁入 kgbpcli SDK 并接入原生构建"
```

---

### 任务 2：KGBPClient 封装与 callKGBP 导出

**文件：**

- 创建：`electron/adapter/native/include/self/KGBPClient.hpp`
- 修改：`electron/adapter/native/include/self/utils.hpp`（文件末尾追加）
- 修改：`electron/adapter/native/src/adapter.cpp`

- [ ] **步骤 2.1：utils.hpp 末尾追加 isValidKGBPInput**

风格对齐既有 `isValidKCBPInput`（同文件 :145）：

```cpp
bool isValidKGBPInput(const NJSON &input, std::string &errmsg)
{
    if (!input.is_object())
    {
        errmsg = "intput is not an object";
        return false;
    }
    if (!input.contains("connection") || !input["connection"].is_object())
    {
        errmsg = "connection is not an object";
        return false;
    }
    NJSON connection = input["connection"];
    if (!connection.contains("ip") || !connection["ip"].is_string())
    {
        errmsg = "connection.ip is not a string";
        return false;
    }
    if (!connection.contains("port") || !connection["port"].is_string())
    {
        errmsg = "connection.port is not a string";
        return false;
    }
    if (!connection.contains("connecttimeout") || !connection["connecttimeout"].is_string())
    {
        errmsg = "connection.connecttimeout is not a string";
        return false;
    }
    if (!connection.contains("requesttimeout") || !connection["requesttimeout"].is_string())
    {
        errmsg = "connection.requesttimeout is not a string";
        return false;
    }
    if (!input.contains("param") || !input["param"].is_object())
    {
        errmsg = "param is not an object";
        return false;
    }
    NJSON param = input["param"];
    if (!param.contains("msgtype") || !param["msgtype"].is_string() || param["msgtype"].get<std::string>().empty())
    {
        errmsg = "param.msgtype is not a non-empty string";
        return false;
    }
    return true;
}
```

- [ ] **步骤 2.2：创建 KGBPClient.hpp**

完整文件内容：

```cpp
#pragma once

#include <string>
#include <vector>
#include <stdexcept>
#include <fstream>
#include <windows.h>
#include <KGBPCli.h>
#include "utils.hpp"

struct KGBPClientConfig
{
	std::string ip;
	uint16_t port = 0;
	int connectTimeoutMs = 5000;
	int requestTimeoutMs = 15000;
};

// KGBP 协议客户端：RAII 封装 kgbpcli SDK，对外暴露 connect()/call() 两步模型，
// 输出结构与 KCBPClient 保持同构：{ code, msg, level?, data?: [{col: val}...] }。
class KGBPClient
{
public:
	explicit KGBPClient(const KGBPClientConfig &config) : config_(config)
	{
		handle_ = KGBPCli_Init();
		if (handle_ == nullptr)
		{
			throw std::runtime_error("KGBPCli_Init failed");
		}
	}

	~KGBPClient()
	{
		if (handle_ != nullptr)
		{
			KGBPCli_Stop(handle_);
			KGBPCli_Exit(handle_);
			handle_ = nullptr;
		}
	}

	KGBPClient(const KGBPClient &) = delete;
	KGBPClient &operator=(const KGBPClient &) = delete;

	void connect()
	{
		if (KGBPCli_StartX(handle_, config_.ip.c_str(), config_.port,
						   config_.connectTimeoutMs) != KGBPCLI_OK)
		{
			throwBackendError("connect failed: " + config_.ip + ":" + std::to_string(config_.port));
		}
	}

	void call(const NJSON &param, NJSON &result, const std::string &funcId)
	{
		// 包头选项必须在 BeginWrite 之前设置（SDK 顺序约束在此封装，调用方不可见）
		if (param.contains("servicename") && param["servicename"].is_string())
		{
			const std::string serviceName = param["servicename"].get<std::string>();
			setBinaryOption(KGBPCLI_OPTION_SERVICE_NAME, serviceName.data(),
							serviceName.size(), "SERVICE_NAME");
		}
		if (param.contains("nodeid") && param["nodeid"].is_number_integer())
		{
			uint32_t nodeId = param["nodeid"].get<uint32_t>();
			setBinaryOption(KGBPCLI_OPTION_NODE_ID, &nodeId, sizeof(nodeId), "NODE_ID");
		}
		if (param.contains("sessionid") && param["sessionid"].is_number_integer())
		{
			uint64_t sessionId = param["sessionid"].get<uint64_t>();
			setBinaryOption(KGBPCLI_OPTION_CLIENT_SESSION_ID, &sessionId,
							sizeof(sessionId), "CLIENT_SESSION_ID");
		}
		uint32_t headTimeout = static_cast<uint32_t>(config_.requestTimeoutMs);
		setBinaryOption(KGBPCLI_OPTION_HEAD_TIMEOUT, &headTimeout,
						sizeof(headTimeout), "HEAD_TIMEOUT");

		if (KGBPCli_BeginWrite(handle_) != KGBPCLI_OK)
		{
			throwBackendError("KGBPCli_BeginWrite failed");
		}

		writeFields(param);

		if (KGBPCli_CallProgram(handle_, const_cast<char *>(funcId.c_str()),
								config_.requestTimeoutMs) != KGBPCLI_OK)
		{
			throwBackendError("KGBPCli_CallProgram failed (funcid: " + funcId + ")");
		}

		readReply(result);
	}

private:
	void setBinaryOption(int optionType, const void *value, size_t size,
						 const std::string &name)
	{
		if (KGBPCli_SetOption(handle_, optionType, value, size) != KGBPCLI_OK)
		{
			throwBackendError("KGBPCli_SetOption " + name + " failed");
		}
	}

	void writeFields(const NJSON &param)
	{
		if (!param.contains("fields") || !param["fields"].is_object())
		{
			return;
		}
		for (auto &item : param["fields"].items())
		{
			const std::string &key = item.key();
			const NJSON &value = item.value();

			// 二进制字段：Buffer → SetValueByte
			if (value.is_binary())
			{
				const auto &bin = value.get_binary();
				if (KGBPCli_SetValueByte(handle_, key.c_str(), bin.data(), bin.size()) != KGBPCLI_OK)
				{
					throwFieldError(key);
				}
				continue;
			}

			int rc = KGBPCLI_ERROR;
			if (value.is_string())
			{
				rc = writeStringField(key, value.get<std::string>());
			}
			else if (value.is_number_integer())
			{
				int64_t v = value.get<int64_t>();
				rc = KGBPCli_SetValueInt64(handle_, key.c_str(), v);
			}
			else if (value.is_number_float())
			{
				double v = value.get<double>();
				rc = KGBPCli_SetValueDouble(handle_, key.c_str(), v);
			}
			else if (value.is_boolean())
			{
				int v = value.get<bool>() ? 1 : 0;
				rc = KGBPCli_SetValueInt(handle_, key.c_str(), v);
			}
			else
			{
				throw std::runtime_error("unsupported field type for: " + key);
			}
			if (rc != KGBPCLI_OK)
			{
				throwFieldError(key);
			}
		}
	}

	int writeStringField(const std::string &key, std::string val)
	{
		// file(path) 语法：读本地文件二进制后走 SetValueByte（与 KCBP 行为一致）
		if (val.size() > 6 && val.compare(0, 5, "file(") == 0 && val.back() == ')')
		{
			std::string path = val.substr(5, val.size() - 6);
			std::ifstream file(path, std::ios::binary | std::ios::ate);
			if (!file.is_open())
			{
				throw std::runtime_error("failed to open file: " + path);
			}
			std::streamsize size = file.tellg();
			file.seekg(0, std::ios::beg);
			std::vector<unsigned char> buf(static_cast<size_t>(size));
			if (!file.read(reinterpret_cast<char *>(buf.data()), size))
			{
				throw std::runtime_error("failed to read file: " + path);
			}
			return KGBPCli_SetValueByte(handle_, key.c_str(), buf.data(), buf.size());
		}

		// 0x 前缀：去掉后按文本传递（与 KCBP 行为一致）
		if (val.size() > 2 && val.compare(0, 2, "0x") == 0)
		{
			val = val.substr(2);
		}
		return KGBPCli_SetValueStr(handle_, key.c_str(), val.c_str());
	}

	void readReply(NJSON &result)
	{
		// 第一结果集：CODE 必有；LEVEL 可选；MSG 必有。
		// 编码决策：KGBP 网关为 UTF-8，字段值直传不转码（区别于 KCBPClient 的 GBK→UTF8）
		int code = 0;
		char msg[1024] = {0};
		if (KGBPCli_GetValueInt(handle_, "CODE", &code) != KGBPCLI_OK ||
			KGBPCli_GetValueStr(handle_, "MSG", msg, sizeof(msg)) != KGBPCLI_OK)
		{
			throwBackendError("读取应答第一结果集失败");
		}
		// 编码决策：KGBP 网关为 UTF-8，字段值直传不转码（区别于 KCBPClient 的 GBK→UTF8）
		result["code"] = std::to_string(code);
		result["msg"] = std::string(msg);

		int level = 0;
		if (KGBPCli_GetValueInt(handle_, "LEVEL", &level) == KGBPCLI_OK)
		{
			result["level"] = std::to_string(level);
		}

		// 后续结果集 → data 行数组
		NJSON rows = NJSON::array();
		while (KGBPCli_RsNext(handle_) == KGBPCLI_OK)
		{
			while (KGBPCli_RsFetchRow(handle_) == KGBPCLI_OK)
			{
				rows.push_back(readRow());
			}
		}
		if (!rows.empty())
		{
			result["data"] = rows;
		}
	}

	NJSON readRow()
	{
		size_t colNum = 0;
		if (KGBPCli_RsGetColNum(handle_, &colNum) != KGBPCLI_OK || colNum == 0)
		{
			return NJSON::object();
		}

		std::vector<std::string> names = parseColNames(colNum);
		NJSON row = NJSON::object();
		for (size_t i = 0; i < colNum; ++i)
		{
			row[names[i]] = getColumnValue(static_cast<int>(i) + 1);
		}
		return row;
	}

	// RsGetColInfo 缓冲区格式文档未明确，按 '\0' 分隔的列名序列解析；
	// 解析出的名字数量与列数不符时回落 col1..colN（已知风险，见计划头部）。
	std::vector<std::string> parseColNames(size_t colNum)
	{
		std::vector<char> buf(colNum * 65 + 1, 0);
		if (KGBPCli_RsGetColInfo(handle_, buf.data(), buf.size()) != KGBPCLI_OK)
		{
			return fallbackColNames(colNum);
		}
		std::vector<std::string> names;
		const char *p = buf.data();
		const char *end = buf.data() + buf.size();
		while (names.size() < colNum && p < end && *p != '\0')
		{
			names.emplace_back(p);
			p += names.back().size() + 1;
		}
		if (names.size() != colNum)
		{
			return fallbackColNames(colNum);
		}
		return names; // 列名已是 UTF-8，不转码
	}

	static std::vector<std::string> fallbackColNames(size_t colNum)
	{
		std::vector<std::string> names;
		names.reserve(colNum);
		for (size_t i = 0; i < colNum; ++i)
		{
			names.push_back("col" + std::to_string(i + 1));
		}
		return names;
	}

	std::string getColumnValue(int colIndex)
	{
		char *pVal = nullptr;
		size_t size = 0;
		if (KGBPCli_RsGetColByIndexByte(handle_, colIndex,
										reinterpret_cast<void **>(&pVal), &size) != KGBPCLI_OK ||
			pVal == nullptr)
		{
			return "";
		}
		return std::string(pVal, size); // UTF-8 直传
	}

	[[noreturn]] void throwBackendError(const std::string &context)
	{
		std::string detail = context;
		if (handle_ != nullptr)
		{
			detail += " [code=" + std::to_string(KGBPCli_GetErrorCode(handle_)) +
					  " msg=" + KGBPCli_GetErrorMsg(handle_) + "]";
		}
		throw std::runtime_error(detail);
	}

	[[noreturn]] static void throwFieldError(const std::string &key)
	{
		throw std::runtime_error("KGBPCli_SetValue failed for field: " + key);
	}

	KGBPClientConfig config_;
	void *handle_ = nullptr;
};

// 后端入口：签名与 callKCBPBackend 对齐，异常向上传播由 adapter.cpp 统一转 -1003。
inline void callKGBPBackend(const NJSON &inputJson, NJSON &outputJson)
{
	const NJSON &connection = inputJson["connection"];
	KGBPClientConfig config;
	config.ip = connection["ip"].get<std::string>();
	config.port = static_cast<uint16_t>(std::stoi(connection["port"].get<std::string>()));
	config.connectTimeoutMs = std::stoi(connection["connecttimeout"].get<std::string>());
	config.requestTimeoutMs = std::stoi(connection["requesttimeout"].get<std::string>());

	KGBPClient client(config);
	client.connect();

	NJSON param = inputJson["param"];
	std::string funcId = param.contains("funcid") && param["funcid"].is_string()
							 ? param["funcid"].get<std::string>()
							 : param["msgtype"].get<std::string>();
	client.call(param, outputJson, funcId);
}
```

- [ ] **步骤 2.3：修改 src/adapter.cpp（三处）**

其一，头部 include 区（`#include "self/KCBPClient.hpp"` 之后）加：

```cpp
#include "self/KGBPClient.hpp"
```

其二，`callBackend` 的 KGBP 空分支替换：

```cpp
	else if (type == "KGBP")
	{
		callKGBPBackend(inputJson, outputJson);
	}
```

其三，文件中 `Init` 之前新增导出函数（注意：外层变量命名 `topErrmsg`，不复刻 callKCBP 里内层遮蔽的写法）：

```cpp
Napi::Object callKGBP(const Napi::CallbackInfo &info)
{
	Napi::Env env = info.Env(); // 获取当前环境
	std::string topErrmsg;

	try
	{
		NJSON inputJson;
		getValFromInfo(env, info[0], inputJson);

		if (!isValidKGBPInput(inputJson, topErrmsg))
		{
			return errResp(-1001, topErrmsg, env);
		}

		NJSON outputJson;
		string backendErrmsg;
		if (!callBackend(inputJson, outputJson, "KGBP", backendErrmsg))
		{
			return errResp(-1002, backendErrmsg, env);
		}

		Napi::Value napiOutput = ConvertJsonToNapiValue(env, outputJson);

		return napiOutput.As<Napi::Object>();
	}
	catch (const std::exception &e)
	{
		return errResp(-1003, e.what(), env);
	}
}
```

`Init` 内注册：

```cpp
	REGISTER_FUNCTION("callKGBP", callKGBP);
```

- [ ] **步骤 2.4：构建验证**

运行：`npm run build:native`
预期：exit 0，末行 `Copied ...`。若报未解析符号，检查链接行是否含 `kgbpcli.lib`。

- [ ] **步骤 2.5：冒烟验证（导出与错误码契约）**

```bash
cd electron/adapter && PATH="$PWD:$PATH" node -e "
const a = require('./adapter.node');
console.log('exports:', Object.keys(a).sort());
const bad = a.callKGBP({ connection: {} });
console.log('invalid:', JSON.stringify(bad));
const connFail = a.callKGBP({ connection: { ip: '127.0.0.1', port: '1', connecttimeout: '1', requesttimeout: '1' }, param: { msgtype: 'svc', fields: {} } });
console.log('connfail:', JSON.stringify(connFail).slice(0, 200));
"
```

预期：

- `exports:` 含 `callKCBP` 和 `callKGBP`
- `invalid:` 为 `{"code":-1001,...}`（msg 提到 msgtype/connection）
- `connfail:` 为 `{"code":-1003,...}`（连接被拒，msg 含 StartX/GetErrorCode 信息）

- [ ] **步骤 2.6：Commit**

```bash
git add electron/adapter/native/include/self electron/adapter/native/src/adapter.cpp electron/adapter/adapter.node
git commit -m "feat(adapter): KGBPClient 封装与 callKGBP 原生导出"
```

---

### 任务 3：JS 桥接统一分发

**文件：**

- 修改：`electron/kcbpBridge.cjs`、`electron/adapter/index.cjs`、`electron/services/kcbp/kcbp.ts`
- 测试：`electron/kcbpBridge.test.ts`

- [ ] **步骤 3.1：编写失败的测试（kcbpBridge.test.ts 新增用例）**

仿照既有第一个用例的 spawn/readline 模式，新增 describe 内用例：

```ts
it('routes payloads by type field: KGBP goes to callKGBP, default stays on callKCBP', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'golden-bridge-'));
  const adapterPath = path.join(dir, 'adapter.cjs');
  await writeFile(
    adapterPath,
    `const calls = []; module.exports = {
                callKCBP(payload) { calls.push(['KCBP', payload.type]); return { code: 0, msg: 'kcbp' }; },
                callKGBP(payload) { calls.push(['KGBP', payload.type]); return { code: 0, msg: 'kgbp' }; },
                __calls: calls,
            };`,
    'utf8',
  );
  const child = spawn(process.execPath, [bridgePath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const messages: Array<{ callId?: number; ok?: boolean; raw?: { msg?: string } }> = [];
  let buffer = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    buffer += chunk;
    let newline = buffer.indexOf('\n');
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf('\n');
      if (line) messages.push(JSON.parse(line));
    }
  });
  const request = (callId: number, type?: string) =>
    JSON.stringify({
      callId,
      adapterCandidates: [adapterPath],
      payload: type ? { type, param: { fields: {} } } : { param: { fields: {} } },
    });
  child.stdin.write(`${request(1, 'KGBP')}\n${request(2)}\n`);
  child.stdin.end();
  await new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', () => resolve());
  });
  await rm(dir, { recursive: true, force: true });
  expect(messages).toHaveLength(2);
  expect(messages[0]).toMatchObject({ callId: 1, ok: true, raw: { msg: 'kgbp' } });
  expect(messages[1]).toMatchObject({ callId: 2, ok: true, raw: { msg: 'kcbp' } });
});
```

运行：`npm run test:api -- kcbpBridge`
预期：FAIL（桥接尚不分发，KGBP 请求落到 callKCBP 返回 'kcbp' 或报错）。

- [ ] **步骤 3.2：实现 kcbpBridge.cjs 分发**

将 `loadCallable` 改为加载整模块（保留原有候选遍历与 try/catch 结构），新增按 type 取函数：

```js
function loadAdapter(adapterCandidates) {
  const req = createRequire(__filename);
  const candidates = Array.isArray(adapterCandidates) ? adapterCandidates : [];

  for (const adapterPath of candidates) {
    if (!adapterPath || !fs.existsSync(adapterPath)) continue;

    try {
      const loaded = req(adapterPath);
      if (typeof loaded.callKCBP === 'function') {
        return loaded;
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}

function getProtocolCallable(adapter, type) {
  if (!adapter) return null;
  if (type === 'KGBP') {
    return typeof adapter.callKGBP === 'function' ? adapter.callKGBP.bind(adapter) : null;
  }
  return typeof adapter.callKCBP === 'function' ? adapter.callKCBP.bind(adapter) : null;
}
```

消息处理处（原 `loadCallable(...)` 绑定点）：模块加载一次存入变量，调用前：

```js
const callable = getProtocolCallable(adapter, message.payload?.type);
if (!callable) {
  const wanted = message.payload?.type === 'KGBP' ? 'KGBP' : 'KCBP';
  throw new Error(`Native ${wanted} adapter not loaded`);
}
```

保持响应信封（ok/raw/callId）结构不变。若现文件存在其它 `loadCallable` 引用点一并更新。

- [ ] **步骤 3.3：实现 adapter/index.cjs 同构分发**

把 `getCallable` 改为 `getAdapter()`（返回整模块或 null，保留 default 探测分支），导出层改为：

```js
function callKCBP(payload) {
  return dispatch('KCBP', payload);
}

function callKGBP(payload) {
  return dispatch('KGBP', payload);
}

function dispatch(type, payload) {
  const adapter = getAdapter();
  const callable = getProtocolCallable(adapter, type);
  if (!callable) {
    const detail = loadError instanceof Error ? `: ${loadError.message}` : '';
    throw new Error(`Native ${type} adapter not loaded${detail}`);
  }
  return callable(payload);
}

module.exports = { callKCBP, callKGBP };
```

注意核对文件末尾实际 export 形态（可能含 default/ESM 互操作探测），保持既有兼容面不变。

- [ ] **步骤 3.4：kcbp.ts 透传 type**

`KcbpRequestOptions` 类型增加可选字段：

```ts
    /** 协议类型：缺省 KCBP，向后兼容 */
    type?: 'KCBP' | 'KGBP';
```

`buildRequestPayload`（约 :355，构造 normalizedPayload 处）顶层加：

```ts
    return {
        type: payload.type || 'KCBP',
        connection: { ... },
        param: { ... },
    };
```

同时 grep `protocolOptions` 在渲染层的消费点，确认 UI 选中的协议 key 已能进入 `payload.type`；若无通路，在构造请求的最小位置补上（不改动 IPC 通道契约之外的东西）。

- [ ] **步骤 3.5：运行测试与回归**

```bash
npm run test:api -- kcbpBridge   # 预期: 新旧用例全部 PASS
npm run typecheck -s             # 预期: exit 0
npm run test:api -s              # 预期: 全部 PASS
```

- [ ] **步骤 3.6：Commit**

```bash
git add electron/kcbpBridge.cjs electron/kcbpBridge.test.ts electron/adapter/index.cjs electron/services/kcbp/kcbp.ts
git commit -m "feat(api-debug): JS 桥接按 type 统一分发 KCBP/KGBP"
```

---

### 任务 4：文档同步与全量回归

**文件：**

- 修改：`electron/adapter/native/README.md`（已是 UTF-8，直接编辑）、`CHANGELOG.md`

- [ ] **步骤 4.1：native README 增加 KGBP 章节**

在「注意事项」之前插入（UTF-8 直写即可）：

```markdown
## KGBP 协议

与 KCBP 并行的第二协议，走 `callKGBP` 导出，payload/响应结构与 KCBP 同构：

- `connection`：`ip`、`port`、`connecttimeout`、`requesttimeout`（均为字符串）
- `param.msgtype`：兼作 KGBP 服务名（`KGBPCLI_OPTION_SERVICE_NAME`）
- `param.funcid`：可选功能号，缺省取 `msgtype`
- `param.nodeid` / `param.sessionid`：可选包头字段
- `param.fields`：与 KCBP 相同的字段规则（Buffer 二进制、file(path)、0x 前缀）

SDK 来源：金证 SVN 分支 6.7.0.3（r97506）`lbmdll/lbm_comm/kgbpcli`，仅收录 x64 产物。
运行依赖 `kgbpcli.dll`、`hare_socket.dll`、`jstp_pack.dll`、`hare_socket_normal.dll`（位于上级目录）。

编码说明：KGBP 网关为 UTF-8，payload 与应答字段值均直传不转码（区别于 KCBP 的 GBK→UTF-8）。
已知限制：无真实网关联调环境；`RsGetColInfo` 列名格式未实测，列名解析失败时回退 `col1..colN`。
```

- [ ] **步骤 4.2：CHANGELOG Added 追加一行**

```markdown
- adapter 并行接入 KGBP 协议：封装 kgbpcli SDK，新增 `callKGBP` 导出与 JS 层按 type 统一分发。
```

- [ ] **步骤 4.3：全量回归**

```bash
npm run typecheck -s        # exit 0
npm run test:api -s         # 全部 PASS
npm run build:native 2>&1 | tail -1   # Copied ... -> electron/adapter/adapter.node
git status --short          # 仅预期内未跟踪项
```

- [ ] **步骤 4.4：Commit**

```bash
git add electron/adapter/native/README.md CHANGELOG.md
git commit -m "docs: KGBP 协议接入说明与变更记录"
```
