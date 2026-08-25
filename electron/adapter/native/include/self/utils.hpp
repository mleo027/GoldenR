#pragma once

#include <string>
#include <json.hpp>
#include <vector>
#include <windows.h>
#include <algorithm>

typedef nlohmann::json NJSON;

using std::string;

std::vector<std::string> Split(const std::string &s, char delimiter)
{
    std::vector<std::string> tokens;
    std::string::size_type prev_pos = 0;
    std::string::size_type current_pos = s.find(delimiter);

    // Estimate initial capacity to reduce reallocations
    // This is a heuristic, adjust as needed or remove if token count is very unpredictable
    tokens.reserve(std::count(s.begin(), s.end(), delimiter) + 1);

    while (current_pos != std::string::npos)
    {
        tokens.push_back(s.substr(prev_pos, current_pos - prev_pos));
        prev_pos = current_pos + 1;
        current_pos = s.find(delimiter, prev_pos);
    }
    tokens.push_back(s.substr(prev_pos, s.length() - prev_pos)); // Add the last token

    return tokens;
}

bool isInteger(const std::string &s)
{
    if (s.empty())
    {
        return false;
    }

    size_t start_idx = 0;
    // 检查第一个字符是否为负号
    if (s[0] == '-')
    {
        start_idx = 1;
        // 如果只有一个负号，则不是有效数字
        if (s.length() == 1)
        {
            return false;
        }
    }

    // 遍历剩余字符，确保它们都是数字
    for (size_t i = start_idx; i < s.length(); ++i)
    {
        if (!std::isdigit(s[i]))
        { // std::isdigit 效率很高
            return false;
        }
    }

    return true;
}

bool checkIPV4Adress(const string &ip)
{
    try
    {
        std::vector<string> tokens = Split(ip, '.');
        if (tokens.size() != 4)
        {
            return false;
        }

        for (size_t i = 0; i < tokens.size(); i++)
        {
            int n = std::stoi(tokens[i]);
            if (n < 0 || n > 255)
            {
                return false;
            }
        }
    }
    catch (const std::exception &)
    {
        return false;
    }

    return true;
}

inline string toLower(const std::string &str)
{
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(),
                   [](unsigned char c)
                   { return std::tolower(c); });
    return result;
}

// 转换为大写
inline string toUpper(const std::string &str)
{
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(),
                   [](unsigned char c)
                   { return std::toupper(c); });
    return result;
}

std::string gbkToUtf8(const std::string &gbk_str)
{
    if (gbk_str.empty())
    {
        return "";
    }

    // 1. GBK -> UTF-16 (宽字符，即 wchar_t)
    // 首先获取转换后所需缓冲区大小
    int wchars_num = MultiByteToWideChar(CP_ACP, 0, gbk_str.c_str(), -1, NULL, 0);
    if (wchars_num == 0)
    {
        // 处理错误，例如 GetLastError()
        return "";
    }
    std::vector<wchar_t> wide_buf(wchars_num);
    MultiByteToWideChar(CP_ACP, 0, gbk_str.c_str(), -1, wide_buf.data(), wchars_num);
    std::wstring wide_string(wide_buf.data());

    // 2. UTF-16 -> UTF-8
    // 获取转换后所需缓冲区大小
    int utf8_num = WideCharToMultiByte(CP_UTF8, 0, wide_string.c_str(), -1, NULL, 0, NULL, NULL);
    if (utf8_num == 0)
    {
        // 处理错误
        return "";
    }
    std::vector<char> utf8_buf(utf8_num);
    WideCharToMultiByte(CP_UTF8, 0, wide_string.c_str(), -1, utf8_buf.data(), utf8_num, NULL, NULL);
    std::string utf8_string(utf8_buf.data());

    return utf8_string;
}

bool isValidKCBPInput(const NJSON &input, std::string &errmsg)
{
    if (!input.is_object())
    {
        errmsg = "请求参数必须是对象";
        return false;
    }

    if (!input.contains("connection") || !input["connection"].is_object())
    {
        errmsg = "connection 必须是对象";
        return false;
    }

    // check connection.ip,connection.port,connection.reqqueue,connection.ansqueue
    NJSON connection = input["connection"];
    if (!connection.contains("ip") || !connection["ip"].is_string())
    {
        errmsg = "connection.ip 必须是字符串";
        return false;
    }
    if (!connection.contains("port") || !connection["port"].is_string())
    {
        errmsg = "connection.port 必须是字符串";
        return false;
    }
    if (!connection.contains("reqqueue") || !connection["reqqueue"].is_string())
    {
        errmsg = "connection.reqqueue 必须是字符串";
        return false;
    }
    if (!connection.contains("ansqueue") || !connection["ansqueue"].is_string())
    {
        errmsg = "connection.ansqueue 必须是字符串";
        return false;
    }
   
    // check param.fields param.msgtype
    NJSON param = input["param"];
    if (!param.contains("fields") || !param["fields"].is_object())
    {
        errmsg = "param.fields 必须是对象";
        return false;
    }
    if (!param.contains("msgtype") || !param["msgtype"].is_string())
    {
        errmsg = "param.msgtype 必须是字符串";
        return false;
    }

    return true;    
}   
bool isValidKGBPInput(const NJSON &input, std::string &errmsg)
{
    if (!input.is_object())
    {
        errmsg = "请求参数必须是对象";
        return false;
    }
    if (!input.contains("connection") || !input["connection"].is_object())
    {
        errmsg = "connection 必须是对象";
        return false;
    }
    NJSON connection = input["connection"];
    if (!connection.contains("ip") || !connection["ip"].is_string())
    {
        errmsg = "connection.ip 必须是字符串";
        return false;
    }
    if (!connection.contains("port") || !connection["port"].is_string())
    {
        errmsg = "connection.port 必须是字符串";
        return false;
    }
    if (!connection.contains("connecttimeout") || !connection["connecttimeout"].is_string())
    {
        errmsg = "connection.connecttimeout 必须是字符串";
        return false;
    }
    if (!connection.contains("requesttimeout") || !connection["requesttimeout"].is_string())
    {
        errmsg = "connection.requesttimeout 必须是字符串";
        return false;
    }
    if (!input.contains("param") || !input["param"].is_object())
    {
        errmsg = "param 必须是对象";
        return false;
    }
    NJSON param = input["param"];
    if (!param.contains("msgtype") || !param["msgtype"].is_string() || param["msgtype"].get<std::string>().empty())
    {
        errmsg = "param.msgtype 必须是非空字符串";
        return false;
    }
    return true;
}
