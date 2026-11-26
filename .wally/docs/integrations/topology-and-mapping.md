---
kind: mapping
scope: inbound-to-outbound-mapping
status: draft
origin: generated
source_paths: [src/octop/api/routers/chat/models.py, src/octop/api/routers/chat/turn.py, src/octop/infra/gateway/process/processor.py, src/octop/infra/gateway/process/harness_request.py, src/octop/infra/agents/providers/probe.py, src/octop/infra/connectors/builder.py, src/octop/infra/knowledge/embed.py, src/octop/infra/connectors/gateway/adapters/tencent_ima.py]
symbols: [ChatTurnBody, build_dashboard_inbound, build_harness_request, _build_dashboard_request, fetch_openai_compatible_models, build_http_mcp_spec, embed_knowledge_texts]
upstream: [../contracts/api-reference.md, index.md]
downstream: [downstream/llm-provider.md, downstream/mcp-gateway.md, downstream/embedding-service.md, ../business/message-processing.md]
---

# 上下游参数组装与字段映射矩阵

专为「上游加字段透传/转换给下游、或下游返回字段回填给上游」需求设计，精确追踪字段在入向 DTO、中间转换函数与下游请求字典之间的变形规则。全仓 422 条入向端点见 [`../contracts/api-reference.md`](../contracts/api-reference.md)，本页聚焦三条高频组装链。

## 1. 上游入口 → 下游扇出编排顺序表（Fan-Out Sequence）

| 上游入口（Action / 路由 / 任务） | 主编排函数（路径:行号） | 按序调用的下游封装方法链（含条件分支） | 短路 / 聚合规则 |
|---|---|---|---|
| WS `user_turn` (`src/octop/api/routers/chat/ws.py:135`) | `build_dashboard_inbound`（`src/octop/api/routers/chat/turn.py:306`） | `1. build_content_from_message` → `2. _resolve_harness_model` → `3. _resolve_turn_mcp_servers` → `4. build_harness_request` → `5. agent_manager.stream` | `tenant_id` 空/斜杠命令命中即短路返回，不进模型 |
| `POST /api/providers/{id}/test` (`src/octop/api/routers/providers.py:311`) | `probe_provider_row`（`probe.py`） | `1. POST {base}/embeddings` → `2. GET {base}/models` | `status_code>=400` 立即以 `HTTP {code} POST {url}` 短路 |
| Connector probe (`src/octop/api/routers/connectors.py:944`) | `probe_connector`（`src/octop/infra/connectors/probe.py:422`） | `1. initialize` JSON-RPC → `2. tools/list` | `401/403` → `error_type:"auth"`，`status>=500` → 远端服务错误 |
| 知识文档上传 (`src/octop/api/routers/knowledge_bases.py`) | `enqueue_index_document`（`src/octop/infra/knowledge/jobs.py:63`） | `1. chunk_text` → `2. embed_knowledge_texts` → `3. KnowledgeIndex.replace_doc_chunks` | 任一阶段异常 → `status="failed"`，不切检索视图 |

---

## 2. 核心场景入向 → 出向字段级映射矩阵

### 场景 A：Dashboard 对话轮次 → harness 请求字典

#### A. 上游入参字段 → 下游请求字典键映射

| 上游入参字段路径（类型） | 转换/校验/默认值注入逻辑 | 目标下游与封装方法 | 下游请求字典精确 Key 路径（类型） | 组装源码锚点 |
|---|---|---|---|---|
| `ChatTurnBody.messages` (`list`) | 归一为 `HumanMessage` 或 `{"role":"user","content":...}`，图片受 `VISION_MAX_COUNT=4` 截断 | harness `build_harness_request` | `messages` (`list`) | `src/octop/infra/gateway/process/harness_request.py:255`、`:296` |
| `ChatTurnBody.thread_id` (`str`) | 缺失时 `ThreadRegistry.get_or_create_by_key` 生成 `thr_{ulid}` | 同上 | `thread_id` (`str`) | `src/octop/infra/gateway/threads.py:389`、`src/octop/infra/gateway/process/processor.py:639` |
| `ChatTurnBody.session_key` (`str`) | 从 WS metadata 注入 `configurable` | 同上 | `configurable["session_key"]` (`str`) | `src/octop/infra/gateway/process/processor.py:1114` |
| `ChatTurnBody.mcp_servers` (`list`) | `_resolve_turn_mcp_servers(apply_defaults=True, raise_on_failure=False)`；失败降级继续 | 同上 | `configurable["mcp_servers"]` | `src/octop/infra/gateway/process/processor.py:661`、`:1073` |
| `ChatTurnBody.knowledge_base_ids` (`list`) | `_attach_turn_knowledge_config` 注入 catalog | 同上 | `configurable["knowledge_base_ids"]`、`knowledge_base_catalog` | `src/octop/infra/gateway/process/processor.py:696`、`:1114-1119` |
| `ChatTurnBody.reasoning_mode` (`Literal["auto","enabled","disabled"]`) | `_resolve_reasoning_overrides` 归一 | 同上 | `configurable["octop_reasoning_overrides"]` | `src/octop/infra/gateway/process/processor.py:474`、`:497` |
| `ChatTurnBody.default_model` (`str`) | `_resolve_harness_model` 丢弃不可用引用后回退用户偏好 | 同上 | `model` (`str`) | `src/octop/infra/gateway/process/processor.py:423`、`:654` |
| `ChatTurnBody.skills` / `target_agent_ids` / `locale` | 上下文隐式注入 | 同上 | `configurable["skills"]`、`target_agent_ids`、`locale` | `src/octop/infra/gateway/process/processor.py:1075`、`:1092`、`:1119` |
| `metadata.user_is_admin` (`bool`) | 从鉴权上下文提取 | 同上 | `configurable["user_is_admin"]` | `src/octop/infra/gateway/process/processor.py:1114` |

#### B. 下游返回字典 → 本仓对象 / 上游出参回填映射

| 下游返回键路径（类型） | 判空 / 兜底 / 格式转换逻辑 | 回填目标字段路径（类型） | 解包源码锚点 |
|---|---|---|---|
| `stream` chunk `"token"` / `"delta"` (`str`) | 逐块 yield，异常转 `{"type":"error","message":...}` | WS `{"type":"token","content":...}` | `src/octop/infra/gateway/process/processor.py:856`、`:909` |
| `stream` chunk `"tool_result"` (`dict`) | `enrich_tool_result_with_backend` + `attachment_frames_from_tool_result` | `{"type":"tool_result",...}` | `src/octop/infra/gateway/process/processor.py:880` |
| `stream` chunk `"hitl_required"` (`dict`) | `register_from_request` 挂起，置 `hitl_paused` | `{"type":"hitl_required",...}` | `src/octop/infra/gateway/process/processor.py:865`、`src/octop/infra/gateway/process/stream_project.py:26` |
| `history` 消息 blocks (`list[dict]`) | `_serialize_history_message` 输出 `role`/`content`/`id`/`usage`/`timestamp` | `GET .../history` 的 `messages[]` | `src/octop/api/routers/chat/serialize.py:881`、`:956` |

### 场景 B：Provider 探测 → OpenAI 兼容端点

| 上游入参 / 配置 | 转换逻辑 | 下游请求字典精确 Key | 组装源码锚点 |
|---|---|---|---|
| `provider.base_url` + `model_id` | 拼 `{base}/embeddings` | `{"model": model_id, "input": ["ping"]}` | `src/octop/infra/agents/providers/probe.py:174` |
| `api_key` / `extra_json.headers` | `Authorization: Bearer` 与自定义头合并 | `headers` | `src/octop/infra/agents/providers/probe.py:165-168`、`:23` |
| 下游返回 | 解包 `data[0]["embedding"]` 非空 | `{"ok": True, "latency_ms": float}` | `src/octop/infra/agents/providers/probe.py:197-206` |
| `GET {base}/models` 返回 | `payload["data"]` → `item["id"]` | `{"id","name"}` 列表 | `src/octop/infra/agents/providers/probe.py:289-310` |

### 场景 C：Connector 配置 → MCP spec 字典

| 上游入参 | 转换逻辑 | 下游/本仓字典 Key | 组装源码锚点 |
|---|---|---|---|
| `kind=http|sse`、`url`、`headers` | `build_http_mcp_spec` 生成 spec（本仓保存，交 harness 连接） | `{"transport":"http"|"sse","url":…,"headers":{…}}` + 条件 `allowed_tools`、`tool_arg_aliases` | `src/octop/infra/connectors/builder.py:88-181` |
| 远端 MCP 探测 | `initialize` / `tools/list` JSON-RPC 2.0 | `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{...}}` | `src/octop/infra/connectors/probe.py:422-431`、`:457` |
| 工具名 + 清洗后参数 | `tools/call` 组装 | `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":…,"arguments":…}}` | `src/octop/infra/connectors/gateway/langchain.py:37-43` |

---

## 3. 通用字典拼装模式与公共信封构造器

- **公共信封构造器**：`build_harness_request`（`src/octop/infra/gateway/process/harness_request.py:255`）固定骨架 `{"messages", "thread_id", "user", "source", "agent_id", "configurable", "model"}`；MCP 固定 `{"jsonrpc":"2.0","id":N,"method":...,"params":{...}}`（`src/octop/infra/connectors/probe.py:422`）。
- **分批拉取 / 并发汇聚器**：`embed_knowledge_texts` 单批上限 `20`（`src/octop/infra/knowledge/embed.py:13`）；知识索引并发度 `INDEX_CONCURRENCY=2`（`src/octop/infra/knowledge/jobs.py:17`）。
- **新增透传字段标准改动链**：
  1. 入向 Schema 新增字段与校验：`src/octop/api/routers/chat/models.py:16`；
  2. 中间转换函数提取并映射键名/类型：`src/octop/api/routers/chat/turn.py:306` 与 `src/octop/infra/gateway/process/processor.py:964`；
  3. 下游封装方法写入请求 `dict`：`src/octop/infra/gateway/process/harness_request.py:255`（详见 [`downstream/llm-provider.md`](downstream/llm-provider.md) 与 [`downstream/mcp-gateway.md`](downstream/mcp-gateway.md)）；
  4. 如需回显，更新 `src/octop/api/routers/chat/serialize.py:881` 的序列化函数；
  5. 更新下游 Mock 夹具并运行 `uv run pytest tests/unit/gateway tests/unit/api -q`。

## 4. 共变耦合与修改清单（Co-Change Playbook）

- **字段透传主链**：入向 DTO（`src/octop/api/routers/chat/models.py:16`）→ 转换函数（`src/octop/api/routers/chat/turn.py:306`、`src/octop/infra/gateway/process/processor.py:964`）→ 请求字典（`src/octop/infra/gateway/process/harness_request.py:255`）→ 响应序列化（`src/octop/api/routers/chat/serialize.py:881`）→ 单测夹具，五段必须同步修改。
- **MCP 字段**：`src/octop/infra/connectors/builder.py` 的 spec 与 `src/octop/infra/connectors/probe.py` 的 JSON-RPC 字典分属两侧，新增 `allowed_tools` / `tool_arg_aliases` 须同时更新 [`downstream/mcp-gateway.md`](downstream/mcp-gateway.md) 与 `tests/unit/connectors/`。
- **必跑回归**：`uv run pytest tests/unit/gateway tests/unit/connectors tests/unit/api -q`；改 SSE/WS 帧另跑前端类型检查（见 [`../operations/dev-and-test.md`](../operations/dev-and-test.md)）。
- **核验锚点**：`src/octop/infra/connectors/gateway/adapters/tencent_ima.py:1`（腾讯 IMA 适配器）。
