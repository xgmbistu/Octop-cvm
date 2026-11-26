---
kind: api-contract
scope: chat-and-memory
status: draft
origin: generated
source_paths: [src/octop/api/app.py, src/octop/api/routers/chat/history.py, src/octop/api/routers/chat/notify_ws.py, src/octop/api/routers/chat/routes.py, src/octop/api/routers/chat/trajectory.py, src/octop/api/routers/chat/ws.py, src/octop/api/routers/memory.py, src/octop/api/routers/memory_portable.py, src/octop/api/routers/proactive_care.py, src/octop/api/routers/slash.py, src/octop/api/routers/terminal.py, src/octop/api/routers/uploads.py, src/octop/api/routers/usage.py]
symbols: [_read_extract_config, _terminal_endpoint, admin_summary, adopt_agent_memory, create_thread, dashboard_chat_ws, dashboard_notifications_ws, delete_thread, deprecate_atom, doctor_agent_memory, export_thread_trajectory, fork_thread]
upstream: [../api-reference.md, ../../INDEX.md]
downstream: [../error-codes.md, ../../architecture/api-service.md]
---

# 入向接口契约：对话、SSE/WS、记忆与用量（`chat-and-memory`）

> 本页覆盖 `chat-and-memory` 分组全部 **58** 条入向接口，路径为 `app.include_router` 挂载后的完整路径；公共协议、鉴权与包络见 [`api-reference.md`](../api-reference.md)，错误码字典见 [`error-codes.md`](../error-codes.md)。

## 1. 分组范围与实现要点

对话主链由 `src/octop/api/routers/chat/ws.py:32` 的 WebSocket 与 `src/octop/api/routers/chat/routes.py:50` 的 welcome 组成；WS 入向帧 `msg_type` 字面量为 `ping`/`subscribe`/`cancel`/`user_turn`（`src/octop/api/routers/chat/ws.py:91`、`:95`、`:116`、`:135`），未知类型回 `{"type":"error","message":"unknown message type: …"}`。SSE 帧由 `format_sse(event, data)` 产生 `event: {event}\ndata: {json}\n\n`（`src/octop/api/routers/chat/sse.py:24`）。`ChatTurnBody` 字段 `messages`、`thread_id`、`session_key`、`mcp_servers`、`knowledge_base_ids`、`skills`、`reasoning_mode` 等见 `src/octop/api/routers/chat/models.py:16`；`HISTORY_DEFAULT_LIMIT=25`、`HISTORY_MAX_LIMIT=200`（`src/octop/api/routers/chat/serialize.py:52-53`）。记忆终端只读端点由 `router.add_api_route` 动态注册 5 条（`src/octop/api/routers/memory.py:654`）。

## 2. 全量接口路由总表（Master Inbound Inventory）

| 方法 | 完整路径 | Handler 符号 | 源码锚点（仓库根相对） | 鉴权 | 执行模式 |
|---|---|---|---|---|---|
| `POST` | `/api/agents/{agent_id}/chat/hitl/resume` | `resume_hitl` | `src/octop/api/routers/chat/routes.py:156` | JWT | SSE |
| `POST` | `/api/agents/{agent_id}/chat/polish` | `polish_prompt` | `src/octop/api/routers/chat/routes.py:204` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/chat/welcome` | `get_chat_welcome` | `src/octop/api/routers/chat/routes.py:50` | JWT | 同步 JSON |
| `WEBSOCKET` | `/api/agents/{agent_id}/chat/ws` | `dashboard_chat_ws` | `src/octop/api/routers/chat/ws.py:32` | JWT | WebSocket |
| `POST` | `/api/agents/{agent_id}/history-migration/start` | `start_history_migration` | `src/octop/api/routers/chat/history.py:140` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/history-migration/status` | `get_history_migration_status` | `src/octop/api/routers/chat/history.py:124` | JWT | 同步 JSON |
| `PATCH` | `/api/agents/{agent_id}/session` | `rebind_session` | `src/octop/api/routers/chat/history.py:397` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/threads` | `list_threads` | `src/octop/api/routers/chat/history.py:87` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/threads` | `create_thread` | `src/octop/api/routers/chat/history.py:192` | JWT | 同步 JSON |
| `DELETE` | `/api/agents/{agent_id}/threads/{thread_id}` | `delete_thread` | `src/octop/api/routers/chat/history.py:478` | JWT | 同步 JSON |
| `PATCH` | `/api/agents/{agent_id}/threads/{thread_id}` | `patch_thread` | `src/octop/api/routers/chat/history.py:413` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/threads/{thread_id}/context-usage` | `get_thread_context_usage` | `src/octop/api/routers/chat/history.py:220` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/threads/{thread_id}/fork` | `fork_thread` | `src/octop/api/routers/chat/history.py:357` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/threads/{thread_id}/history` | `get_thread_history` | `src/octop/api/routers/chat/history.py:260` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/threads/{thread_id}/read` | `mark_thread_read` | `src/octop/api/routers/chat/history.py:340` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/threads/{thread_id}/trajectory` | `get_thread_trajectory` | `src/octop/api/routers/chat/trajectory.py:239` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/threads/{thread_id}/trajectory/events/{event_id}` | `get_trajectory_event` | `src/octop/api/routers/chat/trajectory.py:286` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/threads/{thread_id}/trajectory/export` | `export_thread_trajectory` | `src/octop/api/routers/chat/trajectory.py:366` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/threads/{thread_id}/trajectory/metrics` | `get_trajectory_metrics` | `src/octop/api/routers/chat/trajectory.py:307` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/threads/{thread_id}/trajectory/stream` | `stream_thread_trajectory` | `src/octop/api/routers/chat/trajectory.py:326` | JWT | 同步 JSON |
| `WEBSOCKET` | `/api/notifications/ws` | `dashboard_notifications_ws` | `src/octop/api/routers/chat/notify_ws.py:23` | JWT | WebSocket |
| `POST` | `/api/agents/{agent_id}/memory/atoms/list` | `list_atoms` | `src/octop/api/routers/memory.py:224` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/memory/atoms/{atom_id}` | `get_atom` | `src/octop/api/routers/memory.py:397` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/memory/atoms/{atom_id}:deprecate` | `deprecate_atom` | `src/octop/api/routers/memory.py:596` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/memory/candidates/list` | `list_candidates` | `src/octop/api/routers/memory.py:329` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/memory/candidates/{candidate_id}` | `get_candidate` | `src/octop/api/routers/memory.py:376` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/memory/candidates/{candidate_id}:promote` | `promote_candidate` | `src/octop/api/routers/memory.py:552` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/memory/candidates/{candidate_id}:reject` | `reject_candidate` | `src/octop/api/routers/memory.py:573` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/memory/entities/list` | `list_entities` | `src/octop/api/routers/memory.py:266` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/memory/entities/{entity_id}` | `get_entity` | `src/octop/api/routers/memory.py:418` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/memory/episodes/list` | `list_episodes` | `src/octop/api/routers/memory.py:287` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/memory/episodes/{episode_id}` | `get_episode` | `src/octop/api/routers/memory.py:439` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/memory/extract-config` | `get_extract_config` | `src/octop/api/routers/memory.py:723` | JWT | 同步 JSON |
| `PUT` | `/api/agents/{agent_id}/memory/extract-config` | `put_extract_config` | `src/octop/api/routers/memory.py:735` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/memory/journal/list` | `list_journal` | `src/octop/api/routers/memory.py:308` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/memory/journal/recent` | `recent_journal` | `src/octop/api/routers/memory.py:526` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/memory/raw_events/list` | `list_raw_events` | `src/octop/api/routers/memory.py:245` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/memory/raw_events/{event_id}` | `get_raw_event` | `src/octop/api/routers/memory.py:355` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/memory/stats/atom_kinds` | `stats_atom_kinds` | `src/octop/api/routers/memory.py:506` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/memory/stats/counts` | `stats_counts` | `src/octop/api/routers/memory.py:465` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/memory/stats/growth` | `stats_growth` | `src/octop/api/routers/memory.py:485` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/memory/terminal/about_me` | `_terminal_endpoint` | `src/octop/api/routers/memory.py:654` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/memory/terminal/current_focus` | `_terminal_endpoint` | `src/octop/api/routers/memory.py:659` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/memory/terminal/entities` | `_read_extract_config` | `src/octop/api/routers/memory.py:674` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/memory/terminal/recent_stories` | `_terminal_endpoint` | `src/octop/api/routers/memory.py:669` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/memory/terminal/things_you_told_me` | `_terminal_endpoint` | `src/octop/api/routers/memory.py:664` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/memory/portable/adopt` | `adopt_agent_memory` | `src/octop/api/routers/memory_portable.py:198` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/memory/portable/doctor` | `doctor_agent_memory` | `src/octop/api/routers/memory_portable.py:253` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/memory/portable/pack` | `pack_agent_memory` | `src/octop/api/routers/memory_portable.py:123` | JWT | 同步 JSON |
| `GET` | `/api/memory/portable/sources` | `list_portable_sources` | `src/octop/api/routers/memory_portable.py:98` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/proactive-care` | `get_proactive_care_config` | `src/octop/api/routers/proactive_care.py:97` | JWT | 同步 JSON |
| `PUT` | `/api/agents/{agent_id}/proactive-care` | `put_proactive_care_config` | `src/octop/api/routers/proactive_care.py:112` | JWT | 同步 JSON |
| `GET` | `/api/slash/commands` | `list_slash_commands` | `src/octop/api/routers/slash.py:39` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/terminal/context` | `terminal_context` | `src/octop/api/routers/terminal.py:445` | JWT | 同步 JSON |
| `WEBSOCKET` | `/api/agents/{agent_id}/terminal/ws` | `terminal_ws` | `src/octop/api/routers/terminal.py:500` | JWT | WebSocket |
| `POST` | `/api/agents/{agent_id}/upload` | `upload_attachment` | `src/octop/api/routers/uploads.py:59` | JWT | 同步 JSON |
| `GET` | `/api/admin/usage/summary` | `admin_summary` | `src/octop/api/routers/usage.py:75` | JWT | 同步 JSON |
| `GET` | `/api/usage/summary` | `user_summary` | `src/octop/api/routers/usage.py:44` | JWT | 同步 JSON |

## 3. 关键端点入参与出参契约

| 端点（`方法 路径`） | 关键入参字段 / 位置 | 出参结构 | 精确源码锚点 |
|---|---|---|---|
| `POST /api/agents/{agent_id}/chat/hitl/resume` | 路径/查询/体字段见路由表 Handler 定义 | 由 `resume_hitl` 组装的 Pydantic 响应 | `src/octop/api/routers/chat/routes.py:156` |
| `POST /api/agents/{agent_id}/chat/polish` | 路径/查询/体字段见路由表 Handler 定义 | 由 `polish_prompt` 组装的 Pydantic 响应 | `src/octop/api/routers/chat/routes.py:204` |
| `GET /api/agents/{agent_id}/chat/welcome` | 路径/查询/体字段见路由表 Handler 定义 | 由 `get_chat_welcome` 组装的 Pydantic 响应 | `src/octop/api/routers/chat/routes.py:50` |

逐接口 Pydantic 请求模型定义于各 `src/octop/api/routers/*.py` 文件内 `class ...Body(BaseModel)`；统一错误包络为 `{"error": {"code", "message", "details"}}`（`src/octop/infra/errors.py:239`）。

## 4. 鉴权、错误分支与执行约定

- **鉴权分级**：`免鉴权` 前缀由 `src/octop/api/deps.py:66` 的 `_JWT_EXEMPT_PREFIXES` 与 `:73` 的 `_JWT_EXEMPT_EXACT` 判定；其余一律经 `src/octop/api/middleware/jwt_auth.py:38` 的 `_jwt_auth` 中间件与 `current_user` 依赖。
- **归属校验**：agent 维度端点须经 `_assert_agent_owner`（`src/octop/api/common/agent.py:23`）或 admin 豁免。
- **错误分支**：业务异常统一由 `src/octop/api/app.py:78` 的 `_octop` 处理器映射为 `_DEFAULT_STATUS[code]`（`src/octop/infra/errors.py:107`）；未捕获异常由 `:93` 兜底为 `INTERNAL_ERROR(500)`。
- **执行模式**：阻塞磁盘/DB/子进程 IO 必须 `run_in_executor` 卸载（`AGENTS.md:348`）；WebSocket/SSE 端点保持长连接，不走同步 JSON 包装。

## 5. 共变耦合与修改清单（Co-Change Playbook）

1. 新增路由：在对应 `src/octop/api/routers/*.py` 定义带 `summary` 的装饰器 → 核对 `src/octop/api/app.py:201` 的 `_RouterMount` 前缀 → 补 `src/octop/api/openapi_meta.py` 的 tag。
2. 同步错误语义：新增 `ErrorCode` 枚举与 `_DEFAULT_STATUS` 映射（`src/octop/infra/errors.py:13`、`:107`），并在 `src/octop/i18n/{en,zh}.json` 与 `dashboard/src/locales/{en,zh}.json` 补 `errors.*` / `apiErrors.*` 键。
3. 更新本表与 [`api-reference.md`](../api-reference.md) 分组计数，运行 `uv run pytest tests/unit/api -q` 与 `cd dashboard && npx tsc --noEmit`。
