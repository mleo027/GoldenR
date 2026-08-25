const dllDir = './dll';
process.env.PATH = dllDir + ';' + process.env.PATH;
const  fs = require('fs')

const adapter = require('./build/Release/adapter');


const inputJson = `{\"connection\":{\"connecttimeout\":\"5\",\"port\":\"21000\",\"requesttimeout\":\"15\",\"ip\":\"127.0.0.1\",\"reqqueue\":\"req1\",\"ansqueue\":\"ans1\"},\"param\":{\"msgtype\":\"220400\",\"fields\":{\"g_serverid\":\"1\",\"g_funcid\":\"22400\",\"g_operid\":\"8888\",\"g_operpwd\":\"\",\"g_operway\":\"\",\"g_stationaddr\":\"\",\"g_checksno\":\"\",\"flag\":\"2\",\"patchflag\":\"0\"}}}`

const param = {
    "connection": {
        "connecttimeout": "5",
        "port": "21000",
        "requesttimeout": "65",
        "ip": "127.0.0.1",
        "reqqueue": "req1",
        "ansqueue": "ans1"
    },
    "param": {
        "msgtype": "856065",
        "fields": {
            "g_serverid": "1",
            "g_funcid": "856065",
            "g_operid": "8888",
            "g_operpwd": "",
            "g_operway": "",
            "g_stationaddr": "",
            "g_checksno": "",
            "moneytype": "0",
            "trdpwd": "abc",
            "datasize": "226",
            "datacount": "4",
            "databody": "100145878",
            "custorgid": "0100",
            "netaddr":"",
            "operway":"",
            "ext":"",
            "fundid":"10000030547",
            "iscompress":"1",
            "custcert":"1hr4BQAAAABhYmMA/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v4AAAAA4KBraAAAAACgjAAA"
        }
    }
}

// 二进制入参请传 Buffer（底层走 KCBPCLI_SetVal）
const content = fs.readFileSync('./1.zip');

param.param.fields.databody = content;

console.log(content)


// 调用 C++ 导出的函数
const result = adapter.callKCBP(param);

console.log(result); 
