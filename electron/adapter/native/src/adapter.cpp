#pragma once
#include <napi.h>
#include "tools.hpp"
#include "KCBPClient.hpp"
#include "self/KGBPClient.hpp"
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

Napi::Object errResp(long long code, const std::string &msg, Napi::Env env)
{
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("code", Napi::Number::New(env, code));
    obj.Set("msg", Napi::String::New(env, msg));
    obj.Set("level", Napi::String::New(env, std::string("888")));
    return obj;
}

bool callBackend(const NJSON &inputJson, NJSON &outputJson, const std::string &type, std::string &errmsg)
{

    if (type == "KCBP")
    {
        callKCBPBackend(inputJson, outputJson);
    }
    else if (type == "KGBP")
    {
        callKGBPBackend(inputJson, outputJson);
    }
    else if (type == "KMID")
    {
        /* code */
        return false;
    }
    else if (type == "KGDP")
    {
        /* code */
        return false;
    }
    else if (type == "KJDP")
    {
        /* code */
        return false;
    }
    else if (type == "KOCA")
    {
        /* code */
        return false;
    }
    else
    {
        errmsg = "type not supported";
        return false;
    }

    return true;
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
            return errResp(-1001, errmsg, env);
        }

        NJSON outputJson;
        string errmsg;
        if (!callBackend(inputJson, outputJson, "KCBP", errmsg))
        {
            return errResp(-1002, errmsg, env);
        }

        Napi::Value napiOutput = ConvertJsonToNapiValue(env, outputJson);

        return napiOutput.As<Napi::Object>();
    }
    catch (const std::exception &e)
    {
        return errResp(-1003, e.what(), env);
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

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
    REGISTER_FUNCTION("callKCBP", callKCBP);
  REGISTER_FUNCTION("callKGBP", callKGBP);
    return exports;
}

NODE_API_MODULE(adapter, Init)
