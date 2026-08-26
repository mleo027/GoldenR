#pragma once

#include <cstdio>
#include <string>
#include <vector>
#include <cstring>
#include <stdexcept>
#include <windows.h>
#include <KGBPCli.h>
#include "utils.hpp"

struct KGBPClientConfig
{
	static constexpr int CONNECT_TIMEOUT_MS = 5000;
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
		if (param.contains("nodeid") && param["nodeid"].is_number())
		{
			uint32_t nodeId = static_cast<uint32_t>(param["nodeid"].get<double>());
			setBinaryOption(KGBPCLI_OPTION_NODE_ID, &nodeId, sizeof(nodeId), "NODE_ID");
		}
		if (param.contains("clientsessionid") && param["clientsessionid"].is_number())
		{
			uint64_t clientSessionId = static_cast<uint64_t>(param["clientsessionid"].get<double>());
			setBinaryOption(KGBPCLI_OPTION_CLIENT_SESSION_ID, &clientSessionId,
							sizeof(clientSessionId), "CLIENT_SESSION_ID");
		}
		uint32_t headTimeout = static_cast<uint32_t>(config_.requestTimeoutMs);
		setBinaryOption(KGBPCLI_OPTION_HEAD_TIMEOUT, &headTimeout,
						sizeof(headTimeout), "HEAD_TIMEOUT");

		if (KGBPCli_BeginWrite(handle_) != KGBPCLI_OK)
		{
			throwBackendError("KGBPCli_BeginWrite failed");
		}

		writeFields(param);

		int callRet = KGBPCli_CallProgram(handle_, const_cast<char *>(funcId.c_str()),
										config_.requestTimeoutMs);
		if (callRet != KGBPCLI_OK)
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
		resultSetSequence_ = 1;
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

		// 第一个结果集是状态信息；RsNext 从第一个业务结果集开始遍历。
		result["data"] = NJSON::array();
		while (KGBPCli_RsNext(handle_) == KGBPCLI_OK)
		{
			result["data"].push_back(readResultSet());
		}
	}

	NJSON readResultSet()
	{
		// TODO: parseColNames 内部已调 RsGetColInfo，移到 RsFetchRow 后需重构。
		// 先在行循环外按「ColNum + ColInfo」取列名（数量正确即可），行内只取值。
		size_t colNum = 0;
		if (KGBPCli_RsGetColNum(handle_, &colNum) != KGBPCLI_OK || colNum == 0)
		{
			throwBackendError("读取 KGBP 结果集列数失败");
		}

		char resultSetName[256] = {0};
		std::string name = "result" + std::to_string(resultSetSequence_++);
		if (KGBPCli_RsGetName(handle_, resultSetName, sizeof(resultSetName)) == KGBPCLI_OK && resultSetName[0] != '\0')
		{
			name = resultSetName;
		}

		std::vector<std::string> names = parseColNames(colNum);
		NJSON table = NJSON::object();

		NJSON rows = NJSON::array();
		while (KGBPCli_RsFetchRow(handle_) == KGBPCLI_OK)
		{
			NJSON row = NJSON::object();
			for (size_t i = 1; i <= colNum; ++i)
			{
				row[names[i]] = getColumnValue(static_cast<int>(i));
			}
			rows.push_back(row);
		}

		table["name"] = name;
		table["rows"] = rows;
		return table;
	}

	// 使用手册 6.38：RsGetColInfo 的 apColInfo 为「列名,列名,…」逗号隔开无空格的单个字符串。
	// 解析顺序：① 逗号分隔（文档权威格式）；② '\0' 分隔序列（兼容旧网关）；③ col1..colN 兑底。
	// 非首选路径触发时向 stderr 输出诊断（桥接进程透传），不再静默兑底。
	std::vector<std::string> parseColNames(size_t colNum)
	{
		if (colNum == 0)
		{
			return {};
		}
		// 容量放宽到 256 字节/列，避免超长列名被截断导致数量不符
		std::vector<char> buf(colNum * 256 + 16, 0);
		if (KGBPCli_RsGetColInfo(handle_, buf.data(), buf.size() - 1) != KGBPCLI_OK)
		{
			reportColInfoFallback("RsGetColInfo failed", buf.data());
			return fallbackColNames(colNum);
		}

		auto names = splitColNamesByComma(buf.data(), colNum);
		if (names.size() == colNum)
		{
			for (auto &name : names)
			{
				name = ensureUtf8(name);
			}
			return names; // 文档权威格式命中
		}

		// 兼容旧网关：'\0' 分隔的字符串序列
		names = splitColNamesByNul(buf.data(), buf.size(), colNum);
		if (names.size() == colNum)
		{
			for (auto &name : names)
			{
				name = ensureUtf8(name);
			}
			reportColInfoFallback("matched nul-separated (non-canonical)", buf.data());
			return names;
		}

		reportColInfoFallback("unrecognized format", buf.data());
		return fallbackColNames(colNum);
	}

	// 整个缓冲区按 '\0' 分隔切分，数量须恰好等于 colNum 才有效。
	static std::vector<std::string> splitColNamesByNul(const char *buf, size_t bufSize, size_t colNum)
	{
		std::vector<std::string> names;
		if (buf == nullptr || colNum == 0 || *buf == '\0')
		{
			return names;
		}
		names.reserve(colNum);
		const char *p = buf;
		const char *end = buf + bufSize;
		while (names.size() < colNum && p < end && *p != '\0')
		{
			names.emplace_back(p);
			p += names.back().size() + 1;
		}
		return names; // 数量由调用方校验
	}

	// 列名解析失败时的诊断输出；stderr 由 kcbp 桥接进程透传到主进程日志
	void reportColInfoFallback(const std::string &reason, const char *buf)
	{
		std::fprintf(stderr, "[KGBPClient] ColInfo fallback (%s) raw=", reason.c_str());
		const unsigned char *bytes = reinterpret_cast<const unsigned char *>(buf);
		for (size_t i = 0; i < 128 && bytes[i] != 0 || i < 32; ++i)
		{
			std::fprintf(stderr, "%02X ", bytes[i]);
		}
		std::fprintf(stderr, "\n");
	}

	// 整个缓冲区按逗号切分，每项 trim 后数量须恰好等于 colNum 才有效。
	static std::vector<std::string> splitColNamesByComma(const char *buf, size_t colNum)
	{
		std::vector<std::string> names;
		if (buf == nullptr || colNum == 0 || *buf == '\0')
		{
			return names;
		}
		names.reserve(colNum);
		const char *p = buf;
		while (names.size() < colNum)
		{
			const char *comma = std::strchr(p, ',');
			size_t len = (comma != nullptr ? static_cast<size_t>(comma - p) : std::strlen(p));
			size_t begin = 0;
			while (begin < len && (p[begin] == ' ' || p[begin] == '\t'))
			{
				++begin;
			}
			size_t last = len;
			while (last > begin && (p[last - 1] == ' ' || p[last - 1] == '\t'))
			{
				--last;
			}
			if (last == begin)
			{
				return {}; // 空列名视为格式不匹配
			}
			names.emplace_back(p + begin, last - begin);
			if (comma == nullptr)
			{
				break;
			}
			p = comma + 1;
		}
		if (names.size() != colNum)
		{
			return {};
		}
		return names;
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
		// 用 RsGetColByIndexStr（按列索引取字符串字段值）替代 RsGetColByIndexByte：
		// 后者返回 SDK 内部指针，游标推进后可能失效；前者拷贝到调用方缓冲区更可靠。
		char buf[8192] = {0};
		if (KGBPCli_RsGetColByIndexStr(handle_, colIndex, buf, sizeof(buf)) != KGBPCLI_OK)
		{
			return "";
		}
		return std::string(buf); // KGBP 网关 UTF-8 直传，不转码
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
	size_t resultSetSequence_ = 1;
};

// 后端入口：签名与 callKCBPBackend 对齐，异常向上传播由 adapter.cpp 统一转 -1003。
inline void callKGBPBackend(const NJSON &inputJson, NJSON &outputJson)
{
	const NJSON &connection = inputJson["connection"];
	KGBPClientConfig config;
	config.ip = connection["ip"].get<std::string>();
	config.port = static_cast<uint16_t>(std::stoi(connection["port"].get<std::string>()));
	config.connectTimeoutMs = KGBPClientConfig::CONNECT_TIMEOUT_MS;
	config.requestTimeoutMs = std::stoi(connection["requesttimeout"].get<std::string>()) * 1000;

	KGBPClient client(config);
	client.connect();

	NJSON param = inputJson["param"];
	std::string funcId = param.contains("funcid") && param["funcid"].is_string()
							 ? param["funcid"].get<std::string>()
							 : param["msgtype"].get<std::string>();
	client.call(param, outputJson, funcId);
}
