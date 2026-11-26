---
kind: api-contract
scope: agents-and-experts
status: draft
origin: generated
source_paths: [src/octop/api/app.py, src/octop/api/routers/acp.py, src/octop/api/routers/agent_files.py, src/octop/api/routers/agent_tools.py, src/octop/api/routers/agents.py, src/octop/api/routers/experts.py, src/octop/api/routers/mbti.py, src/octop/api/routers/plugins.py, src/octop/api/routers/subagents.py]
symbols: [agent_status, apply_type, create_agent, create_agent_from_expert, delete_acp_runner, delete_agent, delete_agent_avatar, delete_daily_memory, delete_global_acp_runner, get_acp_config, get_acp_runner, get_agent]
upstream: [../api-reference.md, ../../INDEX.md]
downstream: [../error-codes.md, ../../architecture/api-service.md]
---

# 入向接口契约：Agent、专家与插件（`agents-and-experts`）

> 本页覆盖 `agents-and-experts` 分组全部 **68** 条入向接口，路径为 `app.include_router` 挂载后的完整路径；公共协议、鉴权与包络见 [`api-reference.md`](../api-reference.md)，错误码字典见 [`error-codes.md`](../error-codes.md)。

## 1. 分组范围与实现要点

本组以 `/api/agents/{agent_id}/…` 为主体，挂载前缀见 `src/octop/api/app.py:213`。Agent 归属校验统一走 `_assert_agent_owner`（`src/octop/api/common/agent.py:23`），越权抛 `FORBIDDEN(403)`。`start`/`stop`/`reload` 三个 204 端点（`src/octop/api/routers/agents.py:442`、`:457`、`:472`）委托 `AgentManager`，状态字面量 `starting`/`running`/`stopped`/`failed`/`created` 由 `agent_repo.set_state` 写入（`src/octop/infra/agents/manager.py:573`、`:711`、`:2030`、`:2018`）。`/api/acp` 与 `/api/agents/{agent_id}/acp` 维护出站 coding-agent runner 配置；MBTI 端点仍接受 `X-Octop-Agent-Id` 头（`src/octop/api/routers/mbti.py:153`），属存量兼容入口，勿与标准 URL 归属校验混用。

## 2. 全量接口路由总表（Master Inbound Inventory）

| 方法 | 完整路径 | Handler 符号 | 源码锚点（仓库根相对） | 鉴权 | 执行模式 |
|---|---|---|---|---|---|
| `GET` | `/api/acp` | `get_global_acp_runners` | `src/octop/api/routers/acp.py:148` | JWT | 同步 JSON |
| `PUT` | `/api/acp` | `put_global_acp_runners` | `src/octop/api/routers/acp.py:158` | JWT | 同步 JSON |
| `DELETE` | `/api/acp/{runner_name}` | `delete_global_acp_runner` | `src/octop/api/routers/acp.py:204` | JWT | 同步 JSON |
| `GET` | `/api/acp/{runner_name}` | `get_global_acp_runner` | `src/octop/api/routers/acp.py:172` | JWT | 同步 JSON |
| `PUT` | `/api/acp/{runner_name}` | `put_global_acp_runner` | `src/octop/api/routers/acp.py:185` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/acp` | `get_acp_config` | `src/octop/api/routers/acp.py:221` | JWT | 同步 JSON |
| `PUT` | `/api/agents/{agent_id}/acp` | `put_acp_config` | `src/octop/api/routers/acp.py:234` | JWT | 同步 JSON |
| `PUT` | `/api/agents/{agent_id}/acp/tool` | `put_acp_tool_toggle` | `src/octop/api/routers/acp.py:253` | JWT | 同步 JSON |
| `DELETE` | `/api/agents/{agent_id}/acp/{runner_name}` | `delete_acp_runner` | `src/octop/api/routers/acp.py:291` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/acp/{runner_name}` | `get_acp_runner` | `src/octop/api/routers/acp.py:268` | JWT | 同步 JSON |
| `PUT` | `/api/agents/{agent_id}/acp/{runner_name}` | `put_acp_runner` | `src/octop/api/routers/acp.py:279` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/heartbeat-config` | `get_heartbeat_config` | `src/octop/api/routers/agent_files.py:91` | JWT | 同步 JSON |
| `PUT` | `/api/agents/{agent_id}/heartbeat-config` | `put_heartbeat_config` | `src/octop/api/routers/agent_files.py:109` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/memory/daily` | `list_daily_memory` | `src/octop/api/routers/agent_files.py:144` | JWT | 同步 JSON |
| `DELETE` | `/api/agents/{agent_id}/memory/daily/{filename}` | `delete_daily_memory` | `src/octop/api/routers/agent_files.py:202` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/memory/daily/{filename}` | `read_daily_memory` | `src/octop/api/routers/agent_files.py:184` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/tool-settings` | `get_tool_settings` | `src/octop/api/routers/agent_tools.py:63` | JWT | 同步 JSON |
| `PUT` | `/api/agents/{agent_id}/tool-settings` | `put_tool_settings` | `src/octop/api/routers/agent_tools.py:108` | JWT | 同步 JSON |
| `PATCH` | `/api/agents/{agent_id}/tool-settings/{tool_name}` | `patch_tool_setting` | `src/octop/api/routers/agent_tools.py:137` | JWT | 同步 JSON |
| `GET` | `/api/agents` | `list_agents` | `src/octop/api/routers/agents.py:174` | JWT | 同步 JSON |
| `POST` | `/api/agents` | `create_agent` | `src/octop/api/routers/agents.py:244` | JWT | 同步 JSON |
| `DELETE` | `/api/agents/{agent_id}` | `delete_agent` | `src/octop/api/routers/agents.py:370` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}` | `get_agent` | `src/octop/api/routers/agents.py:298` | JWT | 同步 JSON |
| `PATCH` | `/api/agents/{agent_id}` | `patch_agent` | `src/octop/api/routers/agents.py:321` | JWT | 同步 JSON |
| `DELETE` | `/api/agents/{agent_id}/avatar` | `delete_agent_avatar` | `src/octop/api/routers/agents.py:428` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/avatar` | `get_agent_avatar` | `src/octop/api/routers/agents.py:409` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/avatar` | `upload_agent_avatar` | `src/octop/api/routers/agents.py:385` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/read` | `mark_agent_read` | `src/octop/api/routers/agents.py:283` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/reload` | `reload_agent` | `src/octop/api/routers/agents.py:472` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/start` | `start_agent` | `src/octop/api/routers/agents.py:442` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/status` | `agent_status` | `src/octop/api/routers/agents.py:487` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/stop` | `stop_agent` | `src/octop/api/routers/agents.py:457` | JWT | 同步 JSON |
| `POST` | `/api/agents/from-expert/{expert_id}` | `create_agent_from_expert` | `src/octop/api/routers/experts.py:636` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/publish-expert` | `publish_agent_expert` | `src/octop/api/routers/experts.py:374` | JWT | 同步 JSON |
| `GET` | `/api/experts` | `list_experts` | `src/octop/api/routers/experts.py:507` | JWT | 同步 JSON |
| `GET` | `/api/experts/hub` | `list_expert_hub` | `src/octop/api/routers/experts.py:518` | JWT | 同步 JSON |
| `GET` | `/api/experts/hub/{slug}` | `get_expert_hub_item` | `src/octop/api/routers/experts.py:539` | JWT | 同步 JSON |
| `POST` | `/api/experts/hub/{slug}/install` | `install_expert_hub_item` | `src/octop/api/routers/experts.py:556` | JWT | 同步 JSON |
| `GET` | `/api/experts/published` | `list_published_experts` | `src/octop/api/routers/experts.py:318` | JWT | 同步 JSON |
| `DELETE` | `/api/experts/published/{expert_id}` | `unpublish_expert` | `src/octop/api/routers/experts.py:455` | JWT | 同步 JSON |
| `GET` | `/api/experts/published/{expert_id}` | `get_published_expert` | `src/octop/api/routers/experts.py:348` | JWT | 同步 JSON |
| `GET` | `/api/experts/published/{expert_id}/avatar` | `get_published_expert_avatar` | `src/octop/api/routers/experts.py:330` | JWT | 同步 JSON |
| `POST` | `/api/experts/published/{expert_id}/install` | `install_published_expert` | `src/octop/api/routers/experts.py:471` | JWT | 同步 JSON |
| `POST` | `/api/experts/published/{expert_id}/refresh` | `refresh_published_expert` | `src/octop/api/routers/experts.py:411` | JWT | 同步 JSON |
| `GET` | `/api/experts/{expert_id}` | `get_expert` | `src/octop/api/routers/experts.py:623` | JWT | 同步 JSON |
| `POST` | `/api/mbti/apply` | `apply_type` | `src/octop/api/routers/mbti.py:742` | JWT | 同步 JSON |
| `GET` | `/api/mbti/current` | `get_current_mbti` | `src/octop/api/routers/mbti.py:151` | JWT | 同步 JSON |
| `GET` | `/api/mbti/preview/{code}` | `get_persona_preview` | `src/octop/api/routers/mbti.py:204` | JWT | 同步 JSON |
| `GET` | `/api/mbti/test/questions` | `get_test_questions` | `src/octop/api/routers/mbti.py:589` | JWT | 同步 JSON |
| `POST` | `/api/mbti/test/submit` | `submit_test` | `src/octop/api/routers/mbti.py:676` | JWT | 同步 JSON |
| `GET` | `/api/mbti/types` | `list_types` | `src/octop/api/routers/mbti.py:174` | JWT | 同步 JSON |
| `GET` | `/api/mbti/types/{code}` | `get_type` | `src/octop/api/routers/mbti.py:187` | JWT | 同步 JSON |
| `GET` | `/api/plugins` | `list_plugins` | `src/octop/api/routers/plugins.py:97` | JWT | 同步 JSON |
| `GET` | `/api/plugins/agents/{agent_id}` | `list_agent_plugins` | `src/octop/api/routers/plugins.py:309` | JWT | 同步 JSON |
| `PATCH` | `/api/plugins/agents/{agent_id}` | `patch_agent_plugins` | `src/octop/api/routers/plugins.py:324` | JWT | 同步 JSON |
| `GET` | `/api/plugins/agents/{agent_id}/tools` | `list_agent_plugin_tools` | `src/octop/api/routers/plugins.py:358` | JWT | 同步 JSON |
| `PATCH` | `/api/plugins/agents/{agent_id}/tools` | `patch_agent_plugin_tools` | `src/octop/api/routers/plugins.py:409` | JWT | 同步 JSON |
| `POST` | `/api/plugins/install` | `install_plugin` | `src/octop/api/routers/plugins.py:132` | JWT | 同步 JSON |
| `POST` | `/api/plugins/reload` | `reload_plugins` | `src/octop/api/routers/plugins.py:105` | JWT | 同步 JSON |
| `POST` | `/api/plugins/upload` | `upload_plugin` | `src/octop/api/routers/plugins.py:160` | JWT | 同步 JSON |
| `DELETE` | `/api/plugins/{plugin_id}` | `uninstall_plugin` | `src/octop/api/routers/plugins.py:225` | JWT | 同步 JSON |
| `PATCH` | `/api/plugins/{plugin_id}` | `patch_plugin` | `src/octop/api/routers/plugins.py:206` | JWT | 同步 JSON |
| `GET` | `/api/plugins/{plugin_id}/ui/{file_path:path}` | `get_plugin_ui_asset` | `src/octop/api/routers/plugins.py:237` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/subagents` | `list_subagents` | `src/octop/api/routers/subagents.py:155` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/subagents/install` | `install_subagent` | `src/octop/api/routers/subagents.py:168` | JWT | 同步 JSON |
| `GET` | `/api/subagent-catalog` | `list_subagent_catalog` | `src/octop/api/routers/subagents.py:112` | JWT | 同步 JSON |
| `GET` | `/api/subagent-catalog/divisions` | `list_subagent_divisions` | `src/octop/api/routers/subagents.py:103` | JWT | 同步 JSON |
| `GET` | `/api/subagent-catalog/{slug}` | `get_subagent_catalog_item` | `src/octop/api/routers/subagents.py:134` | JWT | 同步 JSON |

## 3. 关键端点入参与出参契约

| 端点（`方法 路径`） | 关键入参字段 / 位置 | 出参结构 | 精确源码锚点 |
|---|---|---|---|
| `GET /api/acp` | 路径/查询/体字段见路由表 Handler 定义 | 由 `get_global_acp_runners` 组装的 Pydantic 响应 | `src/octop/api/routers/acp.py:148` |
| `PUT /api/acp` | 路径/查询/体字段见路由表 Handler 定义 | 由 `put_global_acp_runners` 组装的 Pydantic 响应 | `src/octop/api/routers/acp.py:158` |
| `DELETE /api/acp/{runner_name}` | 路径/查询/体字段见路由表 Handler 定义 | 由 `delete_global_acp_runner` 组装的 Pydantic 响应 | `src/octop/api/routers/acp.py:204` |

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
