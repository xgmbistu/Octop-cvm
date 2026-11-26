---
kind: downstream-contract
scope: weknora
status: draft
origin: generated
source_paths: [src/octop/infra/connectors/gateway/adapters/weknora.py, src/octop/infra/connectors/catalog.py, src/octop/infra/connectors/probe.py]
symbols: [list_tools, call_tool, search, _headers, probe_credentials]
upstream: [../index.md, ../topology-and-mapping.md, connector-adapters.md]
downstream: []
---

# 下游出向接口契约：`weknora`（WeKnora 知识问答检索）

WeKnora 适配器把 query 与知识库 ID 列表组装为检索请求，用 `X-API-Key` / `X-Tenant-ID` 鉴权，成功判定为 `payload["success"]` 非 `False`；错误原因从 `message`/`error`/`data` 中提取。业务封装在 `src/octop/infra/connectors/gateway/adapters/weknora.py`。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（路径:行号） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/connectors/gateway/adapters/weknora.py` | 字典组装与返回解包层 |
| 底层传输 | `httpx` POST，请求头 `X-API-Key`、`X-Tenant-ID` | `src/octop/infra/connectors/gateway/adapters/weknora.py:187` |
| 公共请求信封 | `{"query": <query>, "knowledge_base_ids": [<ids>]}` | `src/octop/infra/connectors/gateway/adapters/weknora.py:187` |
| 下游成功判定 | `payload.get("success") is not False` | `src/octop/infra/connectors/gateway/adapters/weknora.py:112` |
| 错误翻译 | `ValueError(f"WeKnora request failed: {reason}")`，`reason` 取 `message`/`error`/`data` | `src/octop/infra/connectors/gateway/adapters/weknora.py:112-114` |
| 返回解包 | `payload["data"]` 序列化为工具结果 | `src/octop/infra/connectors/gateway/adapters/weknora.py:112-114` |

## 2. 本仓上游调用方反查表

| 本仓封装方法 | 上游调用模块与函数 | 所属业务流 | 调用点锚点（路径:行号） |
|---|---|---|---|
| `call_tool(creds, name, args)` | `connectors/gateway/registry.py` 工具分派 | Agent 工具调用 | `src/octop/infra/connectors/gateway/adapters/weknora.py:96` |
| `probe_credentials(creds)` | `connectors/probe.py` | 连接器实例创建 | `src/octop/infra/connectors/probe.py:422` |
| `list_tools()` | `builder.py` 工具装配 | 对话轮次 MCP 注入 | `src/octop/infra/connectors/builder.py:574` |

## 3. 封装方法总清单

| 序号 | 封装函数 | 下游目标 | 读写 | 定义锚点 |
|---|---|---|---|---|
| 1 | 知识检索 | `POST {weknora_endpoint}/knowledge-search` | 读 | `src/octop/infra/connectors/gateway/adapters/weknora.py:187` |
| 2 | `probe_credentials` | 同上（轻量探测） | 读 | `src/octop/infra/connectors/gateway/adapters/weknora.py:161` |

## 4. 逐方法请求字典与响应解包契约（Full Dict Schemas）

### 4.1 知识检索 → `POST {endpoint}`（`src/octop/infra/connectors/gateway/adapters/weknora.py:187`）

#### A. 发往下游的组装字典表

```json
{"query": "<自然语言问题>", "knowledge_base_ids": ["<kb_id_1>", "<kb_id_2>"]}
```

| 下游字典键路径 | 类型 | 必填 | 默认值 / 来源 | 组装行号 |
|---|---|---|---|---|
| `query` | `str` | 是 | 用户 query | `src/octop/infra/connectors/gateway/adapters/weknora.py:187` |
| `knowledge_base_ids` | `list[str]` | 是 | 工具入参 `ids` | `src/octop/infra/connectors/gateway/adapters/weknora.py:187` |
| `X-API-Key`（header） | `str` | 是 | 连接器凭据 `api_key` | `src/octop/infra/connectors/gateway/adapters/weknora.py:187` |
| `X-Tenant-ID`（header） | `str` | 是 | 租户 ID 凭据 | `src/octop/infra/connectors/gateway/adapters/weknora.py:187` |

#### B. 下游返回字典与解包规则表

| 下游返回键路径 | 类型 | 本仓提取、判空兜底与转换规则 | 解包行号 |
|---|---|---|---|
| `payload["success"]` | `bool` | `is False` 时抛错；缺失按成功处理 | `src/octop/infra/connectors/gateway/adapters/weknora.py:112` |
| `payload["data"]` | `dict/list` | 检索结果正文，序列化为工具结果 | `src/octop/infra/connectors/gateway/adapters/weknora.py:112-114` |
| `payload["message"]` / `payload["error"]` | `str` | 错误时作为 `reason` | `src/octop/infra/connectors/gateway/adapters/weknora.py:112-114` |

#### C. 下游错误码拦截与翻译

| 下游条件 | 本仓转换 | 代码行号 |
|---|---|---|
| `success is False` | `ValueError(f"WeKnora request failed: {reason}")` | `src/octop/infra/connectors/gateway/adapters/weknora.py:112-114` |
| `HTTP 401/403` | `error_type:"auth"`（通用探测层） | `src/octop/infra/connectors/probe.py:129-153` |
| `status>=500` | `"远端服务错误 HTTP {code}"` | `src/octop/infra/connectors/probe.py:445` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- **新增检索字段**：改 `src/octop/infra/connectors/gateway/adapters/weknora.py:187` 的 `body` 字典 → 核对 `call_tool`（`:96`）入参 → 更新 [`../index.md`](../index.md) 与 [`../topology-and-mapping.md`](../topology-and-mapping.md) → 跑 `uv run pytest tests/unit/connectors -q`。
- **特殊协议陷阱**：`success is False` 用 `is` 判定（缺失 `success` 键不报错）；鉴权头是 `X-API-Key`/`X-Tenant-ID` 而非 `Authorization`；`knowledge_base_ids` 必须是字符串列表，不能传逗号分隔串。
- **凭据纪律**：`api_key` 与租户 ID 走连接器凭据表，禁止写日志（[`../../contracts/configuration.md`](../../contracts/configuration.md)）。
- **核验锚点**：`src/octop/infra/connectors/catalog.py:1`（连接器目录注册表）。
