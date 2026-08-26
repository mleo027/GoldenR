#pragma once
#include <vector>
#include <map>
#include <string>
#include <fstream>
#include "KCBPCli.h"
#include <stdexcept>
#include "utils.hpp"
using std::string;

#define DISCONNECT 0
#define CONNECTED 1
#define DEFAULT_CONNTIMEOUT 5
#define DEFAULT_REQTIMEOUT 15

struct KCBPCLientConfig
{

	KCBPCLientConfig()
	{
		sServerName = "KCBP01";
		sAddress = "";
		nPort = 21000;
		sReqQue = "";
		sAnsQue = "";
		nProtocal = 0;						   // 0: TCP, 1: UDP
		nReqTimeout = DEFAULT_REQTIMEOUT;	   // ����ʱʱ�䣬��λ��
		nConnectTimeout = DEFAULT_CONNTIMEOUT; // ���ӳ�ʱʱ�䣬��λ��
	}

	string sServerName;
	string sAddress;
	int nPort;
	string sReqQue;
	string sAnsQue;
	int nProtocal;		 // 0: TCP, 1: UDP
	int nReqTimeout;	 // ����ʱʱ�䣬��λ��
	int nConnectTimeout; // ���ӳ�ʱʱ�䣬��λ��
};

class KCBPClient
{
private:
	void *pHandle_;
	int nConnected_;
	int nReqTimeout_;
	int nConnTimeout_;
	int nPort_;
	int nProtocol_;
	string sAddress_;
	string sReqQue;
	string sAnsQue;
	string sServerName_;
	string sUserName_;
	string sPassword_;

public:
	bool isConnect() const
	{
		return nConnected_ == CONNECTED;
	}

	KCBPClient(const KCBPCLientConfig &config)
	{
		if (KCBPCLI_Init(&pHandle_) != 0)
		{
			throw std::runtime_error("Failed to initialize KCBP client.");
		}

		nConnected_ = DISCONNECT;

		nConnTimeout_ = config.nConnectTimeout;
		if (nConnTimeout_ <= 0)
		{
			nConnTimeout_ = DEFAULT_CONNTIMEOUT;
		}

		nReqTimeout_ = config.nReqTimeout;
		if (nReqTimeout_ <= 0)
		{
			nReqTimeout_ = DEFAULT_REQTIMEOUT;
		}

		nPort_ = config.nPort;
		if (nPort_ < 0 || nPort_ > 65536)
		{
			throw std::invalid_argument("Invalid port number.");
		}

		sAddress_ = config.sAddress;
		if (!checkIPV4Adress(sAddress_))
		{
			throw std::invalid_argument("Invalid IP address.");
		}

		sReqQue = config.sReqQue;
		sAnsQue = config.sAnsQue;
		if (sReqQue.size() < 1 || sAnsQue.size() < 1)
		{
			throw std::invalid_argument("Invalid queue name");
		}

		nProtocol_ = 0;
		sServerName_ = "KCBP01";
		sUserName_ = "KCXP00";
		sPassword_ = "888888";
	}

	bool connect(std::string &sErrMsg)
	{
		tagKCBPConnectOption stOption;

		strncpy_s(stOption.szAddress, sAddress_.c_str(), sizeof(sAddress_));
		strncpy_s(stOption.szSendQName, sReqQue.c_str(), sizeof(sReqQue));
		strncpy_s(stOption.szReceiveQName, sAnsQue.c_str(), sizeof(sAnsQue));
		strncpy_s(stOption.szServerName, sServerName_.c_str(), sizeof(sServerName_));
		stOption.nPort = nPort_;
		stOption.nProtocal = nProtocol_;

		if (0 != KCBPCLI_SetOptions(pHandle_, KCBP_OPTION_CONNECT, &stOption, sizeof(stOption)))
		{
			sErrMsg = "KCBPCLI_SetOptions failed";
			return false;
		}

		int temp = 0;
		KCBPCLI_SetOption(pHandle_, KCBP_OPTION_AUTHENTICATION, &temp);
		KCBPCLI_SetOption(pHandle_, KCBP_OPTION_COMPRESS, &temp);
		KCBPCLI_SetOption(pHandle_, KCBP_OPTION_CRYPT, &temp);
		KCBPCLI_SetOption(pHandle_, KCBP_OPTION_CONFIRM, &temp);
		KCBPCLI_SetOption(pHandle_, KCBP_OPTION_TIMEOUT, &nConnTimeout_);

		int nRetcode = KCBPCLI_ConnectServer(pHandle_, stOption.szServerName, (char *)sUserName_.c_str(), (char *)sPassword_.c_str());
		if (nRetcode != 0)
		{
			sErrMsg = "KCBPCLI_ConnectServer failed " + std::to_string(nRetcode);
			return false;
		}
		KCBPCLI_SetOption(pHandle_, KCBP_OPTION_TIMEOUT, &nReqTimeout_);

		nConnected_ = CONNECTED;
		return true;
	}

	bool disConnect()
	{
		if (!isConnect())
		{
			return true;
		}

		if (KCBPCLI_DisConnect(pHandle_) != 0)
		{
			return false;
		}

		return true;
	}

	bool Call(const NJSON &param, NJSON &result, std::string &sErrMsg)
	{
		if (!isConnect())
		{
			sErrMsg = "KCBPClient not connect";
			return false;
		}

		if (KCBPCLI_BeginWrite(pHandle_) != 0)
		{
			sErrMsg = "KCBPCLI_BeginWrite failed";
			return false;
		}

		string msgtype = param["msgtype"];
		KCBPCLI_SetSystemParam(pHandle_, KCBP_PARAM_SERVICENAME, (char *)msgtype.c_str());

		auto &fields = param["fields"];
		for (auto &item : fields.items())
		{
			string key = item.key();
			const NJSON &fieldValue = item.value();

			// 二进制字段：使用 KCBPCLI_SetVal(szKeyName, pValue, nSize)
			if (fieldValue.is_binary())
			{
				const auto &bin = fieldValue.get_binary();
				if (KCBPCLI_SetVal(pHandle_, (char *)key.c_str(),
								   (unsigned char *)bin.data(), (long)bin.size()) != 0)
				{
					sErrMsg = "KCBPCLI_SetVal failed for field: " + key;
					return false;
				}
				continue;
			}

			string val;
			if (fieldValue.is_string())
			{
				val = fieldValue.get<string>();
			}
			else if (fieldValue.is_number_integer())
			{
				val = std::to_string(fieldValue.get<long long>());
			}
			else if (fieldValue.is_number_float())
			{
				val = std::to_string(fieldValue.get<double>());
			}
			else if (fieldValue.is_boolean())
			{
				val = fieldValue.get<bool>() ? "1" : "0";
			}
			else
			{
				sErrMsg = "unsupported field type for: " + key;
				return false;
			}

			// file(c://working/test.txt) — 从文件读取二进制后走 SetVal
			if (val.size() > 6 && val.compare(0, 5, "file(") == 0 && val.back() == ')')
			{
				string path = val.substr(5, val.size() - 6);
				std::ifstream file(path, std::ios::binary | std::ios::ate);
				if (!file.is_open())
				{
					sErrMsg = "failed to open file: " + path;
					return false;
				}
				std::streamsize size = file.tellg();
				file.seekg(0, std::ios::beg);
				std::vector<unsigned char> buf(static_cast<size_t>(size));
				if (!file.read(reinterpret_cast<char *>(buf.data()), size))
				{
					sErrMsg = "failed to read file: " + path;
					return false;
				}
				if (KCBPCLI_SetVal(pHandle_, (char *)key.c_str(), buf.data(), (long)buf.size()) != 0)
				{
					sErrMsg = "KCBPCLI_SetVal failed for file field: " + key;
					return false;
				}
				continue;
			}

			if (val.compare(0, 2, "0x") == 0)
			{
				val = val.substr(2);
			}

			// 文本字段：KCBPCLI_SetValue(szKeyName, char* Vlu)
			if (KCBPCLI_SetValue(pHandle_, (char *)key.c_str(), (char *)val.c_str()) != 0)
			{
				sErrMsg = "KCBPCLI_SetValue failed for field: " + key;
				return false;
			}
		}

		int retcode = KCBPCLI_CallProgram(pHandle_, (char *)msgtype.c_str());
		if (retcode != 0)
		{
			switch (retcode)
			{
			case 2011:
				sErrMsg = "应答超时 ";
				break;
			case 2044:
				sErrMsg = "连接繁忙 ";
				break;
			case 2054:
				sErrMsg = "与KCXP断连 ";
			default:
				sErrMsg = "KCBP调用错误 ";
			}

			char errmsg[1024];
			KCBPCLI_GetErrorMsg(pHandle_, errmsg);
			sErrMsg += std::string(errmsg) + " " + std::to_string(retcode);

			KCBPCLI_Exit(pHandle_);
			pHandle_ = NULL;
			nConnected_ = DISCONNECT;

			return false;
		}

		if (!getReply(result))
		{
			sErrMsg = "getReply failed";
			return false;
		}

		return true;
	}

	~KCBPClient()
	{
		if (pHandle_ != nullptr)
		{
			KCBPCLI_Exit(pHandle_);
			pHandle_ = nullptr;
		}
	}

private:
	bool getSingleField(void *handle, int &index, string &val)
	{
		unsigned char *pVal = nullptr;
		long lSize = 0;
		KCBPCLI_RsGetVal(handle, index, &pVal, &lSize);
		val = gbkToUtf8((string((char *)pVal, lSize)));
		return true;
	}

	bool getSingleColName(void *handle, int index, string &key)
	{
		char col_name[64];
		KCBPCLI_RsGetColName(pHandle_, index, col_name, sizeof(col_name));
		key = gbkToUtf8(string(col_name));
		return true;
	}

	bool readCurrentResultSet(NJSON &table, int fallbackIndex)
	{
		int col_num = 0;
		if (KCBPCLI_RsGetColNum(pHandle_, &col_num) != 0 || col_num < 0)
		{
			return false;
		}

		char cursor_name[256] = {0};
		string table_name = "result" + std::to_string(fallbackIndex);
		if (KCBPCLI_RsGetCursorName(pHandle_, cursor_name, sizeof(cursor_name)) == 0 && cursor_name[0] != '\0')
		{
			table_name = gbkToUtf8(string(cursor_name));
		}

		std::vector<string> col_names;
		col_names.reserve(static_cast<size_t>(col_num));
		for (int i = 1; i <= col_num; i++)
		{
			string col_name;
			getSingleColName(pHandle_, i, col_name);
			col_names.push_back(col_name);
		}

		NJSON rows = NJSON::array();
		while (KCBPCLI_RsFetchRow(pHandle_) == 0)
		{
			NJSON row = NJSON::object();
			for (int i = 1; i <= col_num; i++)
			{
				string val;
				getSingleField(pHandle_, i, val);
				row[col_names[static_cast<size_t>(i - 1)]] = val;
			}
			rows.push_back(row);
		}

		table["name"] = table_name;
		table["rows"] = rows;
		return true;
	}

	void readMessageResult(const NJSON &messageTable, NJSON &result)
	{
		if (!messageTable.contains("rows") || !messageTable["rows"].is_array() || messageTable["rows"].empty())
		{
			return;
		}

		const NJSON &message = messageTable["rows"][0];
		for (auto &item : message.items())
		{
			const string key = toLower(item.key());
			if (key == "level" || key == "code" || key == "msg")
			{
				result[key] = item.value();
			}
		}
	}

	bool getReply(NJSON &result)
	{
		bool opened = false;
		try
		{
			if (KCBPCLI_RsOpen(pHandle_) != 0)
			{
				throw std::runtime_error("Failed to open result set.");
			}
			opened = true;
			// data 统一承载业务结果集数组；MESSAGE 不进入 data。
			result["data"] = NJSON::array();

			// 后端约定：第一个结果集 MESSAGE 只承载 LEVEL/CODE/MSG。
			NJSON message_table;
			if (!readCurrentResultSet(message_table, 1))
			{
				throw std::runtime_error("Failed to read MESSAGE result set.");
			}
			readMessageResult(message_table, result);

			int result_index = 1;
			// RsMore 返回 0 表示存在下一个结果集，非 0 表示已经结束。
			while (KCBPCLI_RsMore(pHandle_) == 0)
			{
				NJSON table;
				++result_index;
				if (!readCurrentResultSet(table, result_index))
				{
					throw std::runtime_error("Failed to read business result set.");
				}

				result["data"].push_back(table);
			}

			if (KCBPCLI_RsClose(pHandle_) != 0)
			{
				return false;
			}
			opened = false;
		}
		catch (const std::exception &e)
		{
			if (opened)
			{
				KCBPCLI_RsClose(pHandle_);
			}
			return false;
		}

		return true;
	}
};

void callKCBPBackend(const NJSON &inputJson, NJSON &outputJson)
{
	KCBPCLientConfig config;
	NJSON connection = inputJson["connection"];
 string port = connection["port"].get<string>();
	string reqtimeout = connection["requesttimeout"].get<string>();
	string ip = connection["ip"].get<string>();
	string ansqueue = connection["ansqueue"].get<string>();
	string reqqueue = connection["reqqueue"].get<string>();

 config.nConnectTimeout = DEFAULT_CONNTIMEOUT;
	config.nPort = std::stoi(port);
	config.nReqTimeout = std::stoi(reqtimeout);
	config.sAddress = ip;
	config.sAnsQue = ansqueue;
	config.sReqQue = reqqueue;

	KCBPClient c(config);
	string sErrMsg;

	if (!c.connect(sErrMsg))
	{
		throw std::runtime_error("connect failed: " + ip + port + reqqueue + ansqueue);
	}

	if (!c.Call(inputJson["param"], outputJson, sErrMsg))
	{
		throw std::runtime_error("call reomte backend failed:" + sErrMsg);
	}
}
