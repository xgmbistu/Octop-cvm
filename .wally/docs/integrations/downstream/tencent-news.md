---
kind: downstream-contract
scope: tencent-news
status: draft
origin: generated
source_paths: [src/octop/infra/connectors/gateway/adapters/tencent_news.py, src/octop/infra/connectors/catalog.py, src/octop/infra/connectors/probe.py]
symbols: [list_tools, call_tool, search_news, _http_error_message, probe_credentials]
upstream: [../index.md, ../topology-and-mapping.md, connector-adapters.md]
downstream: []
---

# 下游出向接口契约：`tencent-news`（腾讯新闻资讯检索）

腾讯新闻适配器把自然语言 query 组装为分页检索请求，成功判定为 `payload["base_rsp"]["code"] ∈ {0, None, "0"}`；错误码 `4006` 或含 `apikey` 字样被识别为凭据失效。业务封装在 `src/octop/infra/connectors/gateway/adapters/tencent_news.py`。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（路径:行号） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/connectors/gateway/adapters/tencent_news.py` | 字典组装与返回解包层 |
| 底层传输 | `httpx` POST，超时 `30.0` | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:72-81` |
| 请求头 | `Skill-Request-Id`、`Caller-Skill` 等 | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:62-70` |
| 公共请求信封 | `{"page":1,"page_size":limit,"is_show_content":0,"query":{"query_id","search"},"article_types":[0]}` | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:72-81` |
| 下游成功判定 | `payload["base_rsp"]["code"]` 为 `0/None/"0"` | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:88-95` |
| 错误码翻译 | `code==4006` 或 `msg` 含 `apikey` → 凭据无效提示 | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:88-95` |

## 2. 本仓上游调用方反查表

| 本仓封装方法 | 上游调用模块与函数 | 所属业务流 | 调用点锚点（路径:行号） |
|---|---|---|---|
| `search_news(creds, query, limit)` | `call_tool` 分派 | Agent 工具调用 | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:34` |
| `probe_credentials(creds)` | `connectors/probe.py` | 连接器实例创建 | `src/octop/infra/connectors/probe.py:422` |
| `list_tools()` | `builder.py` 工具装配 | 对话轮次 MCP 注入 | `src/octop/infra/connectors/builder.py:574` |

## 3. 封装方法总清单

| 序号 | 封装函数 | 下游目标 | 读写 | 超时 | 定义锚点 |
|---|---|---|---|---|---|
| 1 | `search_news` | `POST {news_endpoint}` | 读 | `30.0s` | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:72-95` |
| 2 | `probe_credentials` | 同上（轻量探测） | 读 | `30.0s` | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:38` |

## 4. 逐方法请求字典与响应解包契约（Full Dict Schemas）

### 4.1 `search_news` → 新闻检索（`src/octop/infra/connectors/gateway/adapters/tencent_news.py:72-81`）

#### A. 发往下游的组装字典表

```json
{"page": 1, "page_size": 10, "is_show_content": 0, "query": {"query_id": "<id>", "search": "<query>"}, "article_types": [0]}
```

| 下游字典键路径 | 类型 | 必填 | 默认值 / 固定值 | 值来源与转换逻辑 | 组装行号 |
|---|---|---|---|---|---|
| `page` | `int` | 是 | `1` | 固定首页 | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:72` |
| `page_size` | `int` | 是 | — | 工具入参 `limit` | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:72` |
| `is_show_content` | `int` | 是 | `0` | 固定不返回正文 | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:72` |
| `query.query_id` | `str` | 是 | — | 检索请求 ID | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:72` |
| `query.search` | `str` | 是 | — | 用户 query | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:72` |
| `article_types` | `list[int]` | 是 | `[0]` | 固定数组 | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:72` |
| `Skill-Request-Id` / `Caller-Skill`（header） | `str` | 是 | 运行时生成 / 固定 | 调用链标识 | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:62-70` |

#### B. 下游返回字典与解包规则表

| 下游返回键路径 | 类型 | 本仓提取、判空兜底与转换规则 | 解包行号 |
|---|---|---|---|
| `payload["base_rsp"]["code"]` | `int` | `0/None/"0"` 为成功，其余抛错 | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:88` |
| `payload["base_rsp"]["msg"|"message"]` | `str` | 拼入 `ValueError(f"腾讯新闻接口错误 [{code}]: {msg}")` | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:95` |
| 成功正文 | `dict` | 序列化为工具结果文本返回 | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:88-95` |

#### C. 下游错误码拦截与翻译

| 下游错误码 / 条件 | 本仓转换 | 代码行号 |
|---|---|---|
| `code == 4006` 或 `msg` 含 `apikey` | 标记 API Key 无效（提示用户检查凭据） | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:88-95` |
| 其他非 `0` code | `ValueError(f"腾讯新闻接口错误 [{code}]: {msg}")` | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:95` |
| `HTTP 401/403` | `error_type:"auth"`（通用探测层） | `src/octop/infra/connectors/probe.py:129-153` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- **新增检索字段**：改 `src/octop/infra/connectors/gateway/adapters/tencent_news.py:72` 的 `body` 字典 → 核对 `call_tool`（`:34`）入参透传 → 更新 [`../topology-and-mapping.md`](../topology-and-mapping.md) 与 [`../index.md`](../index.md) → 跑 `uv run pytest tests/unit/connectors -q`。
- **特殊协议陷阱**：`is_show_content=0` 与 `article_types=[0]` 是协议固定值，不能当可配置分页参数随意改；成功码兼容 `0`/`"0"`/`None`；`base_rsp` 为嵌套对象，直接取顶层 `code` 会漏判。
- **凭据纪律**：`apikey` 走连接器凭据表，探测错误里的 `apikey` 字样只用于分类，不得把凭据值写入日志（[`../../contracts/configuration.md`](../../contracts/configuration.md)）。
- **核验锚点**：`src/octop/infra/connectors/catalog.py:1`（连接器目录注册表）。
