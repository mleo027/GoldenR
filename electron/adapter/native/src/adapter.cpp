#pragma once
#include <napi.h>
#include "tools.hpp"
#include "KCBPClient.hpp"
#include "self/KGBPClient.hpp"
#include "self/adapterErrors.hpp"
#include <string>
#include <fstream>
using std::string;

// 创建文件并写出日志
void writeLogToFile(const std::string content, const std::string filename = "./run.log")
{
    std::ofstream file(filename, std::ios::app);
    if (file.is_open())
    {
        file << content << std::endl;
        file.close();
    }
}

Napi::Object errResp(long long code, const std::string &protocol,
                     const std::string &detail, Napi::Env env)
{
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("code", Napi::Number::New(env, code));
    obj.Set("msg", Napi::String::New(env, adapter_errors::format(code, protocol, detail)));
    obj.Set("level", Napi::String::New(env, std::string("888")));
    return obj;
}

bool callBackend(const NJSON &inputJson, NJSON &outputJson, const std::string &type, std::string &errmsg)
{
    try
    {
        if (type == "KCBP")
        {
            callKCBPBackend(inputJson, outputJson);
        }
        else if (type == "KGBP")
        {
            callKGBPBackend(inputJson, outputJson);
        }
        else
        {
            errmsg = "暂不支持的后端类型：" + type;
            return false;
        }
        return true;
    }
    catch (const std::exception &e)
    {
        errmsg = e.what();
        return false;
    }
    catch (...)
    {
        errmsg = "后端调用抛出未知异常";
        return false;
    }
}

Napi::Object callKCBP(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env(); // 获取当前环境
    std::string errmsg;

    try
    {
        NJSON inputJson;
        getValFromInfo(env, info[0], inputJson);

        if (!isValidKCBPInput(inputJson, errmsg))
        {
            return errResp(adapter_errors::INVALID_ARGUMENT, "KCBP", errmsg, env);
        }

        NJSON outputJson;
        if (!callBackend(inputJson, outputJson, "KCBP", errmsg))
        {
            return errResp(adapter_errors::BACKEND_CALL, "KCBP", errmsg, env);
        }

        Napi::Value napiOutput = ConvertJsonToNapiValue(env, outputJson);

        return napiOutput.As<Napi::Object>();
    }
    catch (const std::exception &e)
    {
        return errResp(adapter_errors::INTERNAL, "KCBP", e.what(), env);
    }
    catch (...)
    {
        return errResp(adapter_errors::INTERNAL, "KCBP", "Native 抛出未知异常", env);
    }

    return Napi::Object::New(env);
}

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
            return errResp(adapter_errors::INVALID_ARGUMENT, "KGBP", topErrmsg, env);
        }

        NJSON outputJson;
        string backendErrmsg;
        if (!callBackend(inputJson, outputJson, "KGBP", backendErrmsg))
        {
            return errResp(adapter_errors::BACKEND_CALL, "KGBP", backendErrmsg, env);
        }

        Napi::Value napiOutput = ConvertJsonToNapiValue(env, outputJson);

        return napiOutput.As<Napi::Object>();
    }
    catch (const std::exception &e)
    {
        return errResp(adapter_errors::INTERNAL, "KGBP", e.what(), env);
    }
    catch (...)
    {
        return errResp(adapter_errors::INTERNAL, "KGBP", "Native 抛出未知异常", env);
    }
}

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
    REGISTER_FUNCTION("callKCBP", callKCBP);
    REGISTER_FUNCTION("callKGBP", callKGBP);
    return exports;
}

NODE_API_MODULE(adapter, Init)
