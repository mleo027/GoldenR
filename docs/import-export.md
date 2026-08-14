# 接口导入与导出

## 接口导入

导入目标为**指定项目**，入口：

- 项目行 hover → **导入** 图标
- 右键项目 → **导入接口 JSON**（实际支持 JSON 与 INI，见格式选择弹窗）

### 格式选择

| 格式     | 文件类型       | 说明                            |
| -------- | -------------- | ------------------------------- |
| **JSON** | KUAB 导出 JSON | UTF-8；字段映射见下表           |
| **INI**  | Config.ini     | 主进程自动检测 UTF-8 / GBK 编码 |

### JSON（KUAB）字段映射

| JSON 字段           | 接口属性                        |
| ------------------- | ------------------------------- |
| `msgtype_src`       | 地址功能号（可剥 `KSPB.` 前缀） |
| `remark`            | 接口名                          |
| `req[].tag_dest`    | 入参 Key                        |
| `req[].type`        | 入参类型                        |
| `req[].default_val` | 入参默认值                      |

Host 优先沿用该项目已有接口的 host 模板。

### INI（Config.ini）行格式

```
title=msgtype;key:value,key:value,...
```

- 跳过空行与 `[节名]` 行
- 参数类型均为 `string`
- Host 优先从 `[连接参数]` 的 `IPAddress` + `IPPort` 解析，否则沿用项目 host 模板

### 导入后行为

- 若项目仅有空占位接口，先替换再导入
- 导入后按 msgtype 升序重排（收藏仍优先）
- 保持当前选中接口 `id` 不变（若仍存在）

## 响应导出

响应表格工具栏 **导出 CSV**：

- 通过系统对话框选择保存路径
- 大数据量时可能有行数警告阈值提示

## 规则 JSON 导入导出

在设置 → **提示规则** 面板：

| 操作 | 说明                                                                       |
| ---- | -------------------------------------------------------------------------- |
| 导出 | Electron 环境写入 `param-suggest-rules.json`；浏览器环境复制 JSON 到剪贴板 |
| 导入 | 粘贴 `{ "rules": [ ... ] }` 或纯数组，校验后**覆盖**当前全部规则           |

有效规则须含 `field`、`type: "select"` 及 `datasource.sql`。

## 相关源码

| 模块                 | 路径                                                                      |
| -------------------- | ------------------------------------------------------------------------- |
| JSON 解析            | `src/modules/api-debug/utils/import/kuabImport.ts`                        |
| INI 解析             | `src/modules/api-debug/utils/import/configIniImport.ts`                   |
| INI 编码检测         | `electron/readIniText.ts`（主进程）                                       |
| 导入 UI / 写入 store | `src/modules/api-debug/hooks/useProjectImport.tsx`、`store/tabsStore.tsx` |
| CSV 导出             | `src/utils/exportTable.ts`                                                |

## 相关文档

- [用例集与工作区](./workspace.md)
- [入参智能提示](./param-suggest-rules.md)
- [设置与偏好](./settings.md)
