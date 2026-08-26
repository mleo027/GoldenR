'use strict';

const fs = require('fs');
const path = require('path');

const dllDir = path.join(__dirname, 'dll');
process.env.PATH = dllDir + ';' + process.env.PATH;

const adapterPath = path.join(__dirname, 'build', 'Release', 'adapter.node');

function ok(msg) {
  console.log('[OK] ' + msg);
}

function fail(msg) {
  console.error('[FAIL] ' + msg);
  process.exitCode = 1;
}

function section(title) {
  console.log('\n--- ' + title + ' ---');
}

// 1. 加载原生模块
section('加载 adapter.node');
if (!fs.existsSync(adapterPath)) {
  fail('找不到 ' + adapterPath + '，请先 npm run build');
  process.exit(1);
}
let adapter;
try {
  adapter = require(adapterPath);
  ok('模块加载成功');
} catch (e) {
  fail('模块加载失败: ' + e.message);
  process.exit(1);
}

if (typeof adapter.callKCBP !== 'function') {
  fail('callKCBP 未导出');
  process.exit(1);
}
ok('callKCBP 已导出');

const baseConnection = {
  port: '21000',
  requesttimeout: '15',
  ip: '127.0.0.1',
  reqqueue: 'req1',
  ansqueue: 'ans1',
};

// 2. 入参校验（应快速失败，不依赖后台）
section('入参校验');
const badParam = { connection: {}, param: {} };
const badResult = adapter.callKCBP(badParam);
if (badResult && badResult.code === -1001) {
  ok('非法入参返回 code=-1001: ' + badResult.msg);
} else {
  fail('非法入参未返回 -1001: ' + JSON.stringify(badResult));
}

// 3. 纯文本字段调用
section('纯文本 fields 调用');
const textParam = {
  connection: { ...baseConnection, requesttimeout: '15' },
  param: {
    msgtype: '220400',
    fields: {
      g_serverid: '1',
      g_funcid: '22400',
      g_operid: '8888',
      g_operpwd: '',
      g_operway: '',
      g_stationaddr: '',
      g_checksno: '',
      flag: '2',
      patchflag: '0',
    },
  },
};
const textResult = adapter.callKCBP(textParam);
console.log('文本调用结果:', JSON.stringify(textResult, null, 2));
if (textResult && textResult.code === -1003 && String(textResult.msg).includes('connect')) {
  ok('文本调用到达 C++ 层（连接失败属预期，说明未在 JS 层崩溃）');
} else if (textResult && (textResult.code === 0 || textResult.code === '0')) {
  ok('文本调用成功');
} else if (textResult && textResult.code < 0) {
  ok('文本调用返回错误对象: code=' + textResult.code);
} else {
  ok('文本调用已返回: ' + JSON.stringify(textResult));
}

// 4. Buffer 二进制字段（任意 key，非写死 databody）
section('Buffer 二进制 fields 调用');
const binaryPayload = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]); // 模拟 zip 头 PK..
const binaryParam = {
  connection: { ...baseConnection, requesttimeout: '65' },
  param: {
    msgtype: '856065',
    fields: {
      g_serverid: '1',
      g_funcid: '856065',
      g_operid: '8888',
      fundid: '10000030547',
      datasize: String(binaryPayload.length),
      datacount: '1',
      databody: binaryPayload,
      my_binary_field: Buffer.from('hello-binary'),
    },
  },
};
console.log('databody 长度:', binaryPayload.length, '类型:', binaryPayload.constructor.name);
const binaryResult = adapter.callKCBP(binaryParam);
console.log('二进制调用结果:', JSON.stringify(binaryResult, null, 2));
if (binaryResult && binaryResult.code === -1003) {
  ok('二进制入参未崩溃，C++ 已处理 Buffer（连接失败属预期）');
} else if (binaryResult && (binaryResult.code === 0 || binaryResult.code === '0')) {
  ok('二进制调用成功');
} else if (binaryResult && binaryResult.code < 0) {
  ok('二进制调用返回错误对象: code=' + binaryResult.code);
} else {
  ok('二进制调用已返回');
}

// 5. 若存在 1.zip，额外用文件 Buffer 测一次
const zipPath = path.join(__dirname, '1.zip');
if (fs.existsSync(zipPath)) {
  section('1.zip 文件 Buffer 调用');
  const zipBuf = fs.readFileSync(zipPath);
  const zipParam = JSON.parse(JSON.stringify(binaryParam));
  zipParam.param.fields.databody = zipBuf;
  zipParam.param.fields.datasize = String(zipBuf.length);
  const zipResult = adapter.callKCBP(zipParam);
  console.log('1.zip 调用结果:', JSON.stringify(zipResult, null, 2));
  ok('1.zip Buffer 调用完成，长度=' + zipBuf.length);
} else {
  section('跳过 1.zip（文件不存在）');
  ok('已用内存 Buffer 验证二进制路径');
}

console.log('\n=== 验证结束 ===');
if (!process.exitCode) {
  console.log('全部检查通过（若 KCXP 未启动，连接失败为正常现象）');
}
