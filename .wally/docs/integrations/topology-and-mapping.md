---
kind: mapping
scope: inbound-to-outbound-mapping
status: draft
origin: generated
source_paths: [src/octop/api/routers/chat/turn.py, src/octop/infra/gateway/process/harness_request.py, src/octop/infra/gateway/process/message_keys.py, src/octop/infra/connectors/gateway/protocol.py, src/octop/infra/connectors/gateway/langchain.py, src/octop/infra/cron/delivery.py]
symbols: [build_dashboard_inbound, build_harness_request, build_composer_context, handle_mcp_request, build_gateway_langchain_tools, _build_agent_request]
upstream: [contracts/api-reference.md, integrations/index.md]
downstream: [integrations/downstream/llm-providers.md, integrations/downstream/connectors-mcp.md]
---

# 上下游参数组装与字段映射矩阵

本页服务「上游加字段透传给下游、或下游返回回填上游」类改动：精确追踪字段在入向 DTO、中间转换函数与下游请求字典之间的变形规则，覆盖对话、MCP 工具与 Cron 三大扇出场景。

## 1. 上游入口 → 下游扇出编排顺序表

| 上游入口 | 主编排函数（`路径:行号`） | 按序调用的下游封装方法链（含条件） | 短路 / 聚合规则 |
|---|---|---|---|
| `WS /api/agents/{aid}/chat/ws` 的 `user_turn` | `turn.py:226 prepare_dashboard_turn` → `processor.py:517 __call__` | `1. prepare_chat_mcp`（失败短路）→ `2. resolve_thread_id` → `3. update_composer` → `4. build_composer_context` → `5. build_dashboard_inbound` → `6. build_harness_request` → `7. AgentManager.stream` | MCP/skills 校验失败立即返回错误帧；空内容 `ws.py:142` 拒绝 |
| `POST /api/internal/mcp/{kind}/{id}` | `protocol.py:21 handle_mcp_request` | `1. 剥 arguments.kwargs` → `2. registry.call_gateway_tool` → `3. adapter 组装请求` → `4. _ok/_err 信封` | 未注册 kind → `_err(-32601)` |
| `CronJob.run` (`task_type=agent`) | `delivery.py:66 deliver` | `1. Gateway.run_in_session` → `2. _build_agent_request` → `3. AgentManager.stream` → `4. usage(source="cron")` | `hitl_required`/空输出 → RuntimeError（`delivery.py:146-153`） |

## 2. 场景 A：Dashboard 对话 → Harness 请求字典

### A.1 上游入参 → 下游请求字典键映射

| 上游入参字段路径（类型） | 转换 / 校验 / 默认值 | 目标下游与封装方法 | 下游字典精确 Key 路径（类型） | 组装源码锚点 |
|---|---|---|---|---|
| WS 帧 `content` (`str`) | `UserTurnWsFrame` 校验；空内容拒绝 | `build_content_from_message` | `messages[].content`（`HumanMessage`，无 kwargs 退化 `{"role":"user","content":…}`） | `harness_request.py:96-164`、`:255-322` |
| WS 帧 `thread_id` (`str`) | `resolve_thread_id` 校验归属并 rebind | `build_harness_request` | `thread_id` (`str`) | `turn.py:60-86`、`harness_request.py:255-322` |
| URL `agent_id` | WS close 4404 校验 | `prepare_stream_request` | `agent_id` (`str`) | `ws.py:47-63`、`manager.py:2401` |
| `metadata.mcp_servers` (`list[str]`) | `prepare_chat_mcp` 校验；`[]` 表示显式清空 | `_resolve_turn_mcp_servers` | `mcp_server_configs` (`dict`) | `turn.py:245`、`processor.py:661`、`manager.py:2586-2601` |
| `metadata.knowledge_base_ids` (`list[str]`) | 含 `[]` 语义 | KnowledgeSearchHintMiddleware | `configurable` 中的知识提示 | `turn.py:306-349`、`manager.py:2545-2556` |
| `metadata.model/reasoning_mode/reasoning_effort` | `turn.py:267` 校验 ref；`processor.py:474` 归一 | `reasoning_request_parameters` | `configurable["octop_reasoning_overrides"]`、`model` | `reasoning.py:160-227`、`harness_request.py:255-322` |
| `metadata.octop_composer_context` (`dict`) | `build_composer_context` 产键 `connectors/skills/targetAgents/model`（仅 model≠default 写入） | `sanitize_im_metadata` 白名单后落库 | `InboundMessage.metadata` | `message_keys.py:16-43`、`:154-173` |
| 上下文隐式注入 | dashboard/CLI 用数字 `user.id`；IM 归 agent owner（兜底 0） | `resolve_user_id_for_message` | `user=str(user_id)` | `message_keys.py:67-93`、`harness_request.py:255-322` |
| 会话路由隐式注入 | `make_key=f"{agent_id}:{channel}:{subject}:{chat_type}"` | `session_key_from_message` | `configurable.session_key` | `threads.py:21-30`、`message_keys.py:112` |
| 运行时限额 | `_positive_int/_unit_float` 校验 | `apply_agent_runtime_to_stream_request` | `recursion_limit` 顶层 + `configurable["model_settings"]`/`max_input_tokens` | `runtime_limits.py:33-87`、`:135-168` |

### A.2 下游返回字典 → 本仓对象 / 上游出参回填

| 下游返回键（`路径:行号`） | 判空 / 兜底 / 转换 | 回填目标 | 解包锚点 |
|---|---|---|---|
| harness chunk `token` | 文本 buffer 累加 | `MessageEvent.delta` → WS 流块 | `stream_project.py:110-229` |
| harness chunk `reasoning` | 单独通道 | `thinking_delta` | `stream_project.py:110-229` |
| `tool_call_chunk` / `tool_result` | 加 `display_name`、媒体 ID 去重 | `tool_start`/`tool_end` + 媒体事件 | `stream_project.py:83-107`、`:110-229` |
| `hitl_required` | 生成卡片并 `return`，终止本轮投影 | WS `error`/卡片帧 | `stream_project.py:110-229` |
| `usage` 7 字段 | `input/uncached/cache_read/cache_write/output/reasoning/total_tokens`；显式值一旦出现即清空累积 | `usage_log` 行 | `usage_record.py:46-81`、`:210-248` |
| `state_snapshot/state_update` | 取最后一个 user 之后消息 | `thread_messages` 投影 | `history_projection.py:76-112` |
| 任意 chunk | `observe_chunk` → `project_harness_chunk` → `finish_turn` | `trajectory_events` + SSE 回放 | `trajectory/service.py:53,132,233` |

## 3. 场景 B：Connector MCP 调用 → 13 类 adapter 请求字典

| 上游字段 | 转换逻辑 | 目标下游 Key | 源码锚点 |
|---|---|---|---|
| MCP body `params.name` | 按 `kind` 查 `GatewayAdapter` | `call_tool(creds, name, args)` 的 `name` | `protocol.py:21-51`、`registry.py:32-77` |
| MCP body `params.arguments` | 先剥 `arguments.kwargs`，再剥 None（`langchain.py:33`） | adapter `args` | `protocol.py:44-51`、`langchain.py:30-58` |
| DB `connectors.credentials_json` | `validate_create_credentials` 按 `auth_kind` 归一化 | `token/api_key+client_id/cookie/bot_id+bot_secret/email+password+imap/smtp_hosts` | `builder.py:203-413` |
| LangChain `StructuredTool._run(**kwargs)` | None 剥离后塞回同一 MCP body | `arguments.kwargs` | `langchain.py:30-58` |

返回方向：`result.content[0].text` → `_ok` → JSON-RPC `result` → LangChain 工具返回值（`protocol.py:54-78`、`langchain.py:30-58`）；逐下游完整字典见 [`connectors-mcp.md`](downstream/connectors-mcp.md)。

## 4. 通用字典拼装模式与共变修改清单

- **公共信封构造器**：`_ok/_err`（`protocol.py:54-78`）——固定 `{jsonrpc,id,result|error}`，error code `-32601` 表示未知工具。
- **分批拉取 / 并发汇聚器**：embedding 单批 ≤20（`knowledge/embed.py:16-65`）；provider reload 并发 6（`manager.py:81`）；索引并发 2（`knowledge/jobs.py:17`）。
- **新增透传字段标准改动链**：
  1. 入向 Schema / metadata 写入（`turn.py:306-349` 或 `api/routers/connectors.py`）。
  2. 中间转换器提取并映射键名（`message_keys.py:16-43`、`builder.py:203-413`）。
  3. 下游封装方法写请求字典（对应 [`downstream/`](index.md) 专页）。
  4. 如需回显，更新投影/序列化（`stream_project.py:110-229`）。
  5. 更新 Mock 夹具（`tests/support/fakes.py:34`）并跑 `uv run pytest tests/unit/gateway tests/unit/connectors -q`。
