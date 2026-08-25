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
