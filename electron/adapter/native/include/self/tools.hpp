#pragma once
#include <napi.h> // ���� Node-API ͷ�ļ�
#include <string>
#include <vector>
#include "json.hpp"
typedef nlohmann::ordered_json NJSON;

#define THROW_ERROR(env, msg) \
    Napi::TypeError::New(env, msg).ThrowAsJavaScriptException();
#define REGISTER_FUNCTION(name, func) \
    exports.Set(Napi::String::New(env, name), Napi::Function::New(env, func));

// get value from napi info override
bool getValFromInfo(const Napi::Env &env, const Napi::Value &value, std::string &str)
{
    if (!value.IsString())
    {
        THROW_ERROR(env, "Wrong arguments: expected string");
        return false;
    }

    str = value.As<Napi::String>().Utf8Value();

    return true;
}

// get number from napi info
bool getValFromInfo(const Napi::Env &env, const Napi::Value &value, double &num)
{
    if (!value.IsNumber())
    {
        THROW_ERROR(env, "Wrong arguments: expected number");
        return false;
    }

    num = value.As<Napi::Number>().DoubleValue();

    return true;
}

// get boolean from napi info
bool getValFromInfo(const Napi::Env &env, const Napi::Value &value, bool &boolVal)
{
    if (!value.IsBoolean())
    {
        THROW_ERROR(env, "Wrong arguments: expected boolean");
        return false;
    }

    boolVal = value.As<Napi::Boolean>().Value();

    return true;
}

//get object from napi info


//================================ array =========================================
// get string array from napi info
bool getValFromInfo(const Napi::Env &env, const Napi::Value &value, std::vector<std::string> &array)
{
    if (!value.IsArray())
    {
        THROW_ERROR(env, "Wrong arguments: expected array");
        return false;
    }

    Napi::Array array_value = value.As<Napi::Array>();
    for (size_t i = 0; i < array_value.Length(); i++)
    {
        array.push_back(array_value.Get(i).As<Napi::String>().Utf8Value());
    }

    return true;
}

// get number array from napi info
bool getValFromInfo(const Napi::Env &env, const Napi::Value &value, std::vector<double> &array)
{
    if (!value.IsArray())
    {
        THROW_ERROR(env, "Wrong arguments: expected array");
        return false;
    }

    Napi::Array array_value = value.As<Napi::Array>();
    for (size_t i = 0; i < array_value.Length(); i++)
    {
        Napi::Value element = array_value.Get(i);
        if (!element.IsNumber())
        {
            THROW_ERROR(env, "Array element is not a number");
            return false;
        }
        array.push_back(element.As<Napi::Number>().DoubleValue());
    }

    return true;
}

// get boolean array from napi info
bool getValFromInfo(const Napi::Env &env, const Napi::Value &value, std::vector<bool> &array)
{
    if (!value.IsArray())
    {
        THROW_ERROR(env, "Wrong arguments: expected array");
        return false;
    }

    Napi::Array array_value = value.As<Napi::Array>();
    for (size_t i = 0; i < array_value.Length(); i++)
    {
        Napi::Value element = array_value.Get(i);
        if (!element.IsBoolean())
        {
            THROW_ERROR(env, "Array element is not a boolean");
            return false;
        }
        array.push_back(element.As<Napi::Boolean>().Value());
    }

    return true;
}


// ����һ���������������ڵݹ�ת�� Napi::Value �� NJSON
NJSON ConvertNapiValueToJson(const Napi::Env &env, const Napi::Value &napiValue);

// ʵ�ָ�������
NJSON ConvertNapiValueToJson(const Napi::Env &env, const Napi::Value &napiValue) {
    if (napiValue.IsBuffer()) {
        Napi::Buffer<uint8_t> buf = napiValue.As<Napi::Buffer<uint8_t>>();
        std::vector<std::uint8_t> data(buf.Data(), buf.Data() + buf.Length());
        return NJSON::binary(data);
    } else if (napiValue.IsTypedArray()) {
        Napi::TypedArray typedArray = napiValue.As<Napi::TypedArray>();
        if (typedArray.TypedArrayType() != napi_uint8_array)
        {
            THROW_ERROR(env, "TypedArray must be Uint8Array for binary field values.");
            return NJSON();
        }
        Napi::Uint8Array bytes = napiValue.As<Napi::Uint8Array>();
        std::vector<std::uint8_t> data(bytes.Data(), bytes.Data() + bytes.ByteLength());
        return NJSON::binary(data);
    } else if (napiValue.IsArray()) {
        Napi::Array napiArray = napiValue.As<Napi::Array>();
        NJSON jsonArray = NJSON::array();

        for (uint32_t i = 0; i < napiArray.Length(); ++i) {
            Napi::Value elementValue = napiArray.Get(i);
            jsonArray.push_back(ConvertNapiValueToJson(env, elementValue));
        }
        return jsonArray;
    } else if (napiValue.IsObject()) {
        Napi::Object napiObject = napiValue.As<Napi::Object>();
        NJSON jsonObject = NJSON::object();

        Napi::Array propertyNames = napiObject.GetPropertyNames();
        // ����������������
        for (uint32_t i = 0; i < propertyNames.Length(); ++i) {
            Napi::Value propertyNameValue = propertyNames.Get(i); // ��ȡ�������ƣ�Napi::String��
            std::string propertyName = propertyNameValue.As<Napi::String>().Utf8Value(); // ת��Ϊ C++ �ַ���

            Napi::Value propertyValue = napiObject.Get(propertyName); // **�ؼ����裺ͨ�����ƻ�ȡ����ֵ**

            // �ݹ�ת������ֵ����ӵ� JSON ������
            jsonObject[propertyName] = ConvertNapiValueToJson(env, propertyValue);
        }
        return jsonObject;
    } else if (napiValue.IsString()) {
        return napiValue.As<Napi::String>().Utf8Value();
    } else if (napiValue.IsNumber()) {
        return napiValue.As<Napi::Number>().DoubleValue(); // ���� Int32Value()/Int64Value()
    } else if (napiValue.IsBoolean()) {
        return napiValue.As<Napi::Boolean>().Value();
    } else if (napiValue.IsNull() || napiValue.IsUndefined()) {
        return nullptr; // ��Ӧ JSON �� null
    }
    // ���������֧�ֵ� N-API ���ͣ������׳�����򷵻�Ĭ��ֵ
    THROW_ERROR(env, "Unsupported Napi::Value type for JSON conversion.");
    return NJSON(); // Ĭ�Ϸ���һ���յ� JSON ���󣬻���ֱ���ô������������
}

bool getValFromInfo(const Napi::Env &env, const Napi::Value &value, NJSON &outputJson) {
    if (!value.IsObject()) {
        THROW_ERROR(env, "Wrong arguments: expected object");
        return false;
    }

    try {
        outputJson = ConvertNapiValueToJson(env, value);
        return true;
    } catch (const Napi::Error& e) {
        // THROW_ERROR Ӧ���Ѿ������˴���������Բ��񲢼�¼
        return false;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return false;
    }
}


// Forward declaration
Napi::Value ConvertJsonToNapiValue(const Napi::Env &env, const NJSON &jsonObject);

// Implement the helper function
Napi::Value ConvertJsonToNapiValue(const Napi::Env &env, const NJSON &jsonObject) {
    if (jsonObject.is_object()) {
        Napi::Object napiObject = Napi::Object::New(env);
        for (NJSON::const_iterator it = jsonObject.begin(); it != jsonObject.end(); ++it) {
            // Key is always a string in JSON objects
            std::string key = it.key();
            // Value can be any JSON type, so recursively convert it
            Napi::Value napiValue = ConvertJsonToNapiValue(env, it.value());
            napiObject.Set(key, napiValue);
        }
        return napiObject;
    } else if (jsonObject.is_array()) {
        Napi::Array napiArray = Napi::Array::New(env, jsonObject.size());
        for (uint32_t i = 0; i < jsonObject.size(); ++i) {
            // Recursively convert each array element
            Napi::Value napiElement = ConvertJsonToNapiValue(env, jsonObject.at(i));
            napiArray.Set(i, napiElement);
        }
        return napiArray;
    } else if (jsonObject.is_string()) {
        return Napi::String::New(env, jsonObject.get<std::string>());
    } else if (jsonObject.is_number_integer()) {
        // Use Napi::Number for all numbers. JavaScript numbers are float64.
        // If you need BigInt for very large integers, that's a separate conversion.
        return Napi::Number::New(env, jsonObject.get<long long>()); // or int, double based on your needs
    } else if (jsonObject.is_number_float()) {
        return Napi::Number::New(env, jsonObject.get<double>());
    } else if (jsonObject.is_boolean()) {
        return Napi::Boolean::New(env, jsonObject.get<bool>());
    } else if (jsonObject.is_null()) {
        return env.Null();
    } else {
        // Handle other types if necessary, or throw an error
        Napi::Error::New(env, "Unsupported NJSON type encountered during conversion to Napi::Value.")
            .ThrowAsJavaScriptException();
        return env.Undefined(); // Or some other appropriate default
    }
}
