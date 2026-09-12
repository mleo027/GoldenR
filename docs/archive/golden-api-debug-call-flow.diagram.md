start[启动 Golden API]
start --> env[检查当前配置]
env --> workspace[打开工程与接口用例]
workspace --> edit[编辑请求地址与入参]
edit --> text[普通 Key/Value 入参]
edit --> file[输入 @file 自动选择文件]
text --> call[发起 KCBP 调用]
file --> call
call --> response[查看响应结果]
response --> log[查看运行日志/脚本控制台]
response --> export[导出 CSV/HTML]
response --> fix[失败时回填或修正入参]
fix --> call
