#pragma once

#include <string>

namespace adapter_errors
{
constexpr long long INVALID_ARGUMENT = -1001;
constexpr long long BACKEND_CALL = -1002;
constexpr long long INTERNAL = -1003;

inline std::string format(long long code, const std::string &protocol,
                          const std::string &detail)
{
    const char *category = "适配器内部异常";
    if (code == INVALID_ARGUMENT)
    {
        category = "参数校验失败";
    }
    else if (code == BACKEND_CALL)
    {
        category = "后端调用失败";
    }

    const std::string safeDetail = detail.empty() ? "未提供详细信息" : detail;
    return std::string(category) + " [" + protocol + "]：" + safeDetail;
}
}
