---
kind: api-contract
scope: api-chat-and-agents
status: draft
origin: generated
source_paths: [src/octop/api/routers/agents.py, src/octop/api/routers/chat/ws.py, src/octop/api/routers/chat/history.py, src/octop/api/routers/chat/trajectory.py, src/octop/api/routers/workspace.py, src/octop/api/routers/memory.py]
symbols: [list_agents, dashboard_chat_ws, list_threads, stream_thread_trajectory, workspace_tree, memory_stats_counts]
upstream: [contracts/api-reference.md]
downstream: [business/chat-turn.md, business/domain-models/index.md]
---

# 入向接口分组契约：`对话 / Agent / 工作区 / 用户`

本页展开 `contracts/api-reference.md` 总表中「对话与 Agent」组的逐端点清单；统一鉴权、错误包络与 SSE/WS 帧格式见总页，业务语义见 [`WF-01`](../../business/chat-turn.md)。

## 1. Agent 生命周期与 ACP（`/api/agents`、`/api/acp`）

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| GET | `/api/agents` | `list_agents` | `src/octop/api/routers/agents.py:174` |
| POST | `/api/agents` | `create_agent` | `agents.py:244` |
| POST | `/api/agents/{agent_id}/read` | read agent | `agents.py:283` |
| GET | `/api/agents/{agent_id}` | get agent | `agents.py:298` |
| PATCH | `/api/agents/{agent_id}` | update agent | `agents.py:321` |
| DELETE | `/api/agents/{agent_id}` | delete agent | `agents.py:370` |
| POST | `/api/agents/{agent_id}/avatar` | set avatar | `agents.py:385` |
| GET | `/api/agents/{agent_id}/avatar` | get avatar | `agents.py:409` |
| DELETE | `/api/agents/{agent_id}/avatar` | delete avatar | `agents.py:428` |
| POST | `/api/agents/{agent_id}/start` | start agent | `agents.py:442` |
| POST | `/api/agents/{agent_id}/stop` | stop agent | `agents.py:457` |
| POST | `/api/agents/{agent_id}/reload` | reload agent | `agents.py:472` |
| GET | `/api/agents/{agent_id}/status` | agent status | `agents.py:487` |
| GET | `/api/acp` | `get_global_acp_runners` | `src/octop/api/routers/acp.py:148` |
| PUT | `/api/acp` | put global runners | `acp.py:158` |
| GET | `/api/acp/{runner_name}` | get runner | `acp.py:172` |
| PUT | `/api/acp/{runner_name}` | put runner | `acp.py:185` |
| DELETE | `/api/acp/{runner_name}` | delete runner | `acp.py:204` |
| GET | `/api/agents/{agent_id}/acp` | `get_acp_config` | `acp.py:221` |
| PUT | `/api/agents/{agent_id}/acp` | put config | `acp.py:234` |
| PUT | `/api/agents/{agent_id}/acp/tool` | put tool | `acp.py:253` |
| GET | `/api/agents/{agent_id}/acp/{runner_name}` | get runner | `acp.py:268` |
| PUT | `/api/agents/{agent_id}/acp/{runner_name}` | put runner | `acp.py:279` |
| DELETE | `/api/agents/{agent_id}/acp/{runner_name}` | delete runner | `acp.py:291` |
| GET | `/api/agents/{agent_id}/tool-settings` | get tool settings | `src/octop/api/routers/agent_tools.py:63` |
| PUT | `/api/agents/{agent_id}/tool-settings` | put tool settings | `agent_tools.py:108` |
| PATCH | `/api/agents/{agent_id}/tool-settings/{tool_name}` | patch one tool | `agent_tools.py:137` |
| GET | `/api/agents/{agent_id}/heartbeat-config` | get heartbeat | `src/octop/api/routers/agent_files.py:91` |
| PUT | `/api/agents/{agent_id}/heartbeat-config` | put heartbeat | `agent_files.py:109` |

## 2. 对话、历史与轨迹（`/api/agents/{aid}/chat|threads`、`/api/notifications/ws`）

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| WS | `/api/agents/{agent_id}/chat/ws` | `dashboard_chat_ws` | `src/octop/api/routers/chat/ws.py:32` |
| GET | `/api/agents/{agent_id}/chat/welcome` | welcome | `src/octop/api/routers/chat/routes.py:50` |
| POST | `/api/agents/{agent_id}/chat/hitl/resume` | `resume_hitl`（SSE） | `chat/routes.py:156` |
| POST | `/api/agents/{agent_id}/chat/polish` | polish | `chat/routes.py:204` |
| WS | `/api/notifications/ws` | `dashboard_notifications_ws` | `chat/notify_ws.py:23` |
| GET | `/api/agents/{agent_id}/threads` | `list_threads` | `chat/history.py:87` |
| GET | `/api/agents/{agent_id}/history-migration/status` | migration status | `chat/history.py:124` |
| POST | `/api/agents/{agent_id}/history-migration/start` | migration start | `chat/history.py:140` |
| POST | `/api/agents/{agent_id}/threads` | create thread | `chat/history.py:192` |
| GET | `/api/agents/{agent_id}/threads/{thread_id}/context-usage` | context usage | `chat/history.py:220` |
| GET | `/api/agents/{agent_id}/threads/{thread_id}/history` | history | `chat/history.py:260` |
| POST | `/api/agents/{agent_id}/threads/{thread_id}/read` | mark read | `chat/history.py:340` |
| POST | `/api/agents/{agent_id}/threads/{thread_id}/fork` | fork | `chat/history.py:357` |
| PATCH | `/api/agents/{agent_id}/threads/session` | update session | `chat/history.py:397` |
| PATCH | `/api/agents/{agent_id}/threads/{thread_id}` | update thread | `chat/history.py:413` |
| DELETE | `/api/agents/{agent_id}/threads/{thread_id}` | delete thread | `chat/history.py:478` |
| GET | `/api/agents/{agent_id}/threads/{thread_id}/trajectory` | trajectory list | `chat/trajectory.py:239` |
| GET | `/api/agents/{agent_id}/threads/{thread_id}/trajectory/events/{event_id}` | one event | `chat/trajectory.py:286` |
| GET | `/api/agents/{agent_id}/threads/{thread_id}/trajectory/metrics` | metrics | `chat/trajectory.py:307` |
| GET | `/api/agents/{agent_id}/threads/{thread_id}/trajectory/stream` | `stream_thread_trajectory`（SSE） | `chat/trajectory.py:326` |
| GET | `/api/agents/{agent_id}/threads/{thread_id}/trajectory/export` | export | `chat/trajectory.py:366` |

## 3. 工作区、附件与终端（`/api/agents/{aid}/workspace|filesystem`）

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| GET | `/api/agents/{agent_id}/workspace/tree` | `workspace_tree` | `src/octop/api/routers/workspace.py:119` |
| GET | `/api/agents/{agent_id}/workspace/file` | read file | `workspace.py:154` |
| PUT | `/api/agents/{agent_id}/workspace/file` | write file | `workspace.py:171` |
| POST | `/api/agents/{agent_id}/workspace/mkdir` | mkdir | `workspace.py:212` |
| DELETE | `/api/agents/{agent_id}/workspace/file` | delete | `workspace.py:242` |
| POST | `/api/agents/{agent_id}/workspace/move` | move | `workspace.py:271` |
| POST | `/api/agents/{agent_id}/workspace/upload` | upload | `workspace.py:302` |
| GET | `/api/agents/{agent_id}/workspace/download` | download | `workspace.py:328` |
| GET | `/api/agents/{agent_id}/workspace/doc` | read doc | `workspace.py:367` |
| PUT | `/api/agents/{agent_id}/workspace/doc` | write doc | `workspace.py:393` |
| GET | `/api/agents/{agent_id}/media/preview` | media preview | `workspace.py:425` |
| GET | `/api/agents/{agent_id}/workspace/glob` | glob | `workspace.py:458` |
| GET | `/api/agents/{agent_id}/workspace/grep` | grep | `workspace.py:493` |
| GET | `/api/agents/{agent_id}/workspace/archive` | archive | `workspace.py:516` |
| POST | `/api/agents/{agent_id}/workspace/archive` | archive write | `workspace.py:540` |
| POST | `/api/agents/{agent_id}/upload` | `upload_attachment` | `src/octop/api/routers/uploads.py:59` |
| GET | `/api/agents/{agent_id}/terminal/context` | terminal context | `src/octop/api/routers/terminal.py:445` |
| WS | `/api/agents/{agent_id}/terminal/ws` | `terminal_ws` | `terminal.py:500` |

## 4. 记忆、用户与邀请（`/api/agents/{aid}/memory/*`、`/api/users/*`、`/api/slash/*`）

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| POST | `/api/agents/{agent_id}/memory/{atoms\|raw_events\|entities\|episodes\|journal\|candidates}/list` | 6 类 list | `src/octop/api/routers/memory.py:224,245,266,287,308,329` |
| GET | `/api/agents/{agent_id}/memory/{raw_events\|candidates\|atoms\|entities\|episodes}/{id}` | 5 类 get | `memory.py:355,376,397,418,439` |
| GET | `/api/agents/{agent_id}/memory/stats/counts` | counts | `memory.py:465` |
| GET | `/api/agents/{agent_id}/memory/stats/growth` | growth | `memory.py:485` |
| GET | `/api/agents/{agent_id}/memory/stats/atom_kinds` | atom kinds | `memory.py:506` |
| GET | `/api/agents/{agent_id}/memory/journal/recent` | recent journal | `memory.py:526` |
| POST | `/api/agents/{agent_id}/memory/candidates/{id}:promote` | promote | `memory.py:552` |
| POST | `/api/agents/{agent_id}/memory/candidates/{id}:reject` | reject | `memory.py:573` |
| POST | `/api/agents/{agent_id}/memory/atoms/{id}:deprecate` | deprecate | `memory.py:596` |
| GET | `/api/agents/{agent_id}/memory/extract-config` | get config | `memory.py:723` |
| PUT | `/api/agents/{agent_id}/memory/extract-config` | put config | `memory.py:735` |
| GET | `/api/memory/portable/sources` | sources | `src/octop/api/routers/memory_portable.py:98` |
| POST | `/api/agents/{agent_id}/memory/portable/pack` | pack | `memory_portable.py:123` |
| POST | `/api/agents/{agent_id}/memory/portable/adopt` | adopt | `memory_portable.py:198` |
| POST | `/api/agents/{agent_id}/memory/portable/doctor` | doctor | `memory_portable.py:253` |
| GET | `/api/users/permissions` | permissions | `src/octop/api/routers/users.py:107` |
| GET | `/api/users` | list users | `users.py:131` |
| POST | `/api/users` | create user | `users.py:139` |
| GET | `/api/users/{user_id}` | get user | `users.py:160` |
| PATCH | `/api/users/{user_id}` | update user | `users.py:172` |
| DELETE | `/api/users/{user_id}` | delete user | `users.py:235` |
| POST | `/api/users/{user_id}/unlock-login` | unlock | `users.py:209` |
| POST | `/api/users/{user_id}/reset-password` | reset password | `users.py:222` |
| GET | `/api/users/invites` | list invites | `src/octop/api/routers/invites.py:75` |
| POST | `/api/users/invites` | create invite | `invites.py:85` |
| POST | `/api/users/invites/{invite_id}/revoke` | revoke | `invites.py:103` |
| POST | `/api/auth/invite/validate` | validate | `invites.py:114` |
| POST | `/api/auth/invite/redeem` | redeem | `invites.py:124` |
| GET | `/api/slash/commands` | `list_slash_commands` | `src/octop/api/routers/slash.py:39` |
| GET | `/api/preferences` | get preferences | `src/octop/api/routers/preferences.py:103` |
| PATCH | `/api/preferences` | patch preferences | `preferences.py:112` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

1. 新增/改路由：改对应 router handler → 更新 `src/octop/api/openapi_meta.py` 标签与 `summary` → 同步 `tests/integration/test_*_api.py`。
2. 涉及 agent 资源的端点必须调用 `_assert_agent_owner`（见 [`setup-and-auth.md`](../../business/setup-and-auth.md)）；admin 端点走 `require_admin`（`deps.py:217`）。
3. 新增 ErrorCode 必须同步 `src/octop/i18n/{en,zh}.json` 与前端 `apiErrors.*`（见 [`error-codes.md`](../error-codes.md)）。
