---
kind: downstream-contract
scope: tencent-ima
status: draft
origin: generated
source_paths: [src/octop/infra/connectors/gateway/adapters/tencent_ima.py, src/octop/infra/connectors/probe.py, src/octop/infra/connectors/catalog.py]
symbols: [list_tools, call_tool, _post, _headers, _http_error_message, probe_credentials]
upstream: [../index.md, ../topology-and-mapping.md, mcp-gateway.md]
downstream: []
---

# 下游出向接口契约：`tencent-ima`（腾讯 IMA 笔记/知识库）

腾讯 IMA 适配器提供知识库列表、笔记读取、检索、新建笔记与媒体入库能力。业务封装在 `src/octop/infra/connectors/gateway/adapters/tencent_ima.py`，统一用 `httpx.Client(timeout=60.0)` POST `https://ima.qq.com/{path}`，成功判定为 `data["code"] ∈ {0, None, "0"}`。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（路径:行号） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py` | 字典组装与返回解包层 |
| 底层传输 | `httpx.Client(timeout=60.0)`，固定 4 个请求头 | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:459-469`、`:474` |
| 请求头 | `ima-openapi-clientid`、`ima-openapi-apikey`、`Content-Type`、`User-Agent` | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:459-469` |
| 公共成功判定 | `data.get("code")` 为 `0/None/"0"` 视为成功，否则抛 `ValueError(f"[{code}] {msg}")` | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:480-483` |
| HTTP 错误 | `≥400` 取 `msg|message`；`401` 转 `"IMA 认证失败…"` | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:488-499` |
| 上游注册 | 适配器由 `connectors/catalog.py` 登记，工具列表由 `list_tools()` 暴露 | `src/octop/infra/connectors/catalog.py` |

## 2. 本仓上游调用方反查表

| 本仓封装方法 | 上游调用模块与函数 | 所属业务流 | 调用点锚点（路径:行号） |
|---|---|---|---|
| `call_tool(creds, name, args)` | `connectors/gateway/registry.py` 工具分派 | Agent 工具调用（`WF-01`） | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:34` |
| `probe_credentials(creds)` | `connectors/probe.py` 凭据探测 | 连接器实例创建 | `src/octop/infra/connectors/probe.py:422` |
| `list_tools()` | `builder.py` 工具装配 | 对话轮次 MCP 注入 | `src/octop/infra/connectors/builder.py:574` |

## 3. 封装方法总清单（按目标命令字）

| 序号 | 工具 / 方法 | 请求字典骨架 | 读写 | 定义锚点 |
|---|---|---|---|---|
| 1 | 知识库/笔记本列表 | `{"cursor": cursor, "limit": limit}` | 读 | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:272` |
| 2 | 笔记详情 | `{"note_id": note_id, "target_content_format": 0}` | 读 | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:289` |
| 3 | 搜索 | `{"search_type":…, "query_info": {"title"|"content": query}, "start":…, "end":…}` | 读 | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:300-309` |
| 4 | 新建笔记 | `{"content_format": 1, "content": …}` + 条件 `folder_id` | 写 | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:315-318` |
| 5 | 媒体入库 | `{"media_type": 11, "title":…, "knowledge_base_id":…, "note_info": {"content_id":…}}` | 写 | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:421-426` |

## 4. 逐方法请求字典与响应解包契约（Full Dict Schemas）

### 4.1 列表 → `POST {base}/{list_path}`（`src/octop/infra/connectors/gateway/adapters/tencent_ima.py:272`）

| 下游字典键 | 类型 | 必填 | 值来源 | 行号 |
|---|---|---|---|---|
| `cursor` | `str` | 是 | 分页游标（上游 `args`） | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:272` |
| `limit` | `int` | 是 | 单页条数 | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:272` |
| 返回 `data["code"]` | `int` | — | `0/None/"0"` 成功 | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:480` |
| 返回 `data["msg"|"message"]` | `str` | — | 错误时拼入 `ValueError` | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:483` |

### 4.2 笔记详情（`src/octop/infra/connectors/gateway/adapters/tencent_ima.py:289`）

```json
{"note_id": "<note_id>", "target_content_format": 0}
```

| 键 | 类型 | 固定值 / 来源 | 行号 |
|---|---|---|---|
| `note_id` | `str` | 工具入参 | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:289` |
| `target_content_format` | `int` | 固定 `0` | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:289` |

### 4.3 搜索（`src/octop/infra/connectors/gateway/adapters/tencent_ima.py:300-309`）

| 键 | 类型 | 条件 / 来源 | 行号 |
|---|---|---|---|
| `search_type` | `int` | `1` 时 `query_info={"content":query}`，否则 `{"title":query}` | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:300` |
| `query_info.title` / `query_info.content` | `str` | 二选一 | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:300` |
| `start` / `end` | `int` | 检索区间 | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:300-309` |

### 4.4 新建 / 媒体入库（`src/octop/infra/connectors/gateway/adapters/tencent_ima.py:315-426`）

| 键 | 类型 | 条件 / 固定值 | 行号 |
|---|---|---|---|
| `content_format` | `int` | 固定 `1` | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:315` |
| `content` | `str` | 笔记正文 | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:315` |
| `folder_id` | `str` | 条件写入（有值时才塞入） | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:318` |
| `media_type` | `int` | 固定 `11` | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:421-426` |
| `title` / `knowledge_base_id` | `str` | 工具入参 | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:421` |
| `note_info.content_id` | `str` | 关联笔记 ID | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:421` |

### 4.5 下游错误码拦截与翻译

| 下游条件 | 本仓翻译 | 行号 |
|---|---|---|
| `data["code"]` 非 `0/None/"0"` | `ValueError(f"[{code}] {msg}")` | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:480-483` |
| `HTTP >= 400` | `_http_error_message` 取 `msg|message` | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:488-499` |
| `HTTP 401` | `"IMA 认证失败…"` + 固定 `HTTP {status_code}` 兜底 | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:488-499` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- **新增 IMA 工具/键**：改 `tencent_ima.py` 的 `TOOLS` 与对应 `body` 字典 → 核对 `call_tool` 分派（`src/octop/infra/connectors/gateway/adapters/tencent_ima.py:34`）与 `src/octop/infra/connectors/probe.py:422` 探测 → 更新 [`../index.md`](../index.md) 下游表与 [`mcp-gateway.md`](mcp-gateway.md) 工具装配 → 跑 `uv run pytest tests/unit/connectors -q`。
- **特殊协议陷阱**：`code` 接受整数 `0`、字符串 `"0"` 与 `None` 三种成功形态，判空须用 `in (0, "0", None)` 而非 `== 0`；`target_content_format=0` 与 `media_type=11` 为协议固定值；请求头是 `ima-openapi-*` 而非 `Authorization: Bearer`。
- **凭据纪律**：`clientid` / `apikey` 来自连接器凭据表，禁止写日志（[`../../contracts/configuration.md`](../../contracts/configuration.md)）。
