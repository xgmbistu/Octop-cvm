---
kind: api-contract
scope: inbound-api
status: draft
origin: generated
source_paths: [src/octop/api/app.py, src/octop/api/deps.py, src/octop/api/openapi_meta.py, src/octop/api/middleware/jwt_auth.py, src/octop/api/routers/chat/ws.py, src/octop/api/routers/internal_mcp.py]
symbols: [build_app, sign_token, resolve_user_from_token, _jwt_auth, configure_openapi, dashboard_chat_ws, internal_mcp_post]
upstream: [INDEX.md]
downstream: [contracts/api/chat-and-agents.md, integrations/topology-and-mapping.md]
---

# 入向接口契约全集（Inbound API / WS / SSE / MCP / CLI）

Octop 对外暴露 **417 个入向路由**（66 个 router 文件共 414 个装饰器 + `app.py` 3 个顶层 GET），超过 20 个按业务分组拆为 5 个子页；本页给出公共协议约定、全量分组索引与关键端点 Schema，逐端点清单见子页，严禁「其余类似」省略。

## 1. 公共协议、鉴权与响应包络规范

| 维度 | 精确实现规则 | 源码锚点（`路径:行号`） |
|---|---|---|
| 认证凭据提取 | `extract_raw_token`：优先 `Authorization: Bearer`，否则 `?access_token=`；JWT HS256 payload `sub/uname/role/iat/exp` | `src/octop/api/deps.py:112`、`:28` |
| 免登白名单 | `_JWT_EXEMPT_PREFIXES`：`setup/`、`health/`、`i18n/`、`internal/mcp/`、OAuth callback；精确项含 login、oidc 全套、invite validate/redeem、docs、openapi.json | `deps.py:66-91` |
| JWT 中间件 | 仅拦 `/api/*` 且非豁免；失败直出 JSONResponse | `src/octop/api/middleware/jwt_auth.py:37,52-62` |
| Setup 锁 | 零用户时非白名单路由统一 503 `{"setup_required": true}` | `src/octop/api/middleware/setup_lockdown.py:15,31,36-40` |
| 租户/资源归属 | agent 路由 URL 带 `{agent_id}`，加载行后 `_assert_agent_owner(row, user)`；admin 经 `require_admin` 豁免 | `deps.py:196,217` |
| 标准错误包络 | `{"error":{"code","message","details"}}`；`OctopError.to_envelope(locale)` 本地化；未捕获异常→`INTERNAL_ERROR` 500 | `src/octop/infra/errors.py:239`、`src/octop/api/app.py:77-98` |
| SSE 帧格式 | `event: {event}\ndata: {json}\n\n`；不可序列化回退 `{"type":"error"}` | `src/octop/api/routers/chat/sse.py:24-32` |
| WS close code | 4001 鉴权 / 4003 权限 / 4404 无此 agent / 1011 未就绪 | `src/octop/api/routers/chat/ws.py:41,47,55,63` |
| 滑动续期 | 剩余寿命 < 1/3 TTL 时写响应头 `X-Octop-Access-Token` | `deps.py:146`、`:61-62` |
| API 文档 | `/api/docs`（Scalar，默认 `enable_api_docs=false`）；`openapi_url="/api/openapi.json"` | `app.py:109-115`、`:276-283` |
| SPA 兜底 | `GET /{full_path:path}` → `src/octop/dashboard/`；`api/`、`ws/` 前缀 404，路径穿越防护 | `app.py:285-308` |

## 2. 全量入向接口路由总表（Master Inventory）

> 装饰器统计：GET 170、POST 161、PUT 29、DELETE 28、PATCH 19、WEBSOCKET 7（router 装饰器 414）；按方法/路径/Handler/行号逐条列在分组子页。

| 分组子页 | 覆盖 router 文件与端点数 | 代表前缀 | 协议形态 |
|---|---|---|---|
| [`chat-and-agents.md`](api/chat-and-agents.md) | acp 11、agents 13、agent_files 5、agent_tools 3、chat routes 3、history 11、trajectory 5、chat/ws 1、notify_ws 1、memory 20、memory_portable 4、slash 1、terminal 2、uploads 1、workspace 15、users 8、preferences 2、invites 5（约 109） | `/api/agents/{aid}/*`、`/api/acp`、`/api/users/*` | JSON + WS + SSE |
| [`admin-and-setup.md`](api/admin-and-setup.md) | setup 11、auth 5、auth_oidc 7、admin 3、backup 11、observability 3、security 7、media_generation 3、tls 3、providers 15、search 1、usage 2、update 5、cron 7、proactive_care 2、settings 3、envs 3、health 1、i18n 2（约 91） | `/api/setup/*`、`/api/admin/*`、`/api/providers/*` | JSON + SSE |
| [`connectors-and-channels.md`](api/connectors-and-channels.md) | connectors 27、internal_mcp 3、channels 21、subagents 5（56） | `/api/connectors/*`、`/api/internal/mcp/*`、`/api/agents/{aid}/channels/*` | JSON-RPC + SSE |
| [`knowledge-and-skills.md`](api/knowledge-and-skills.md) | knowledge_bases 25、skills 13、skill_packages 15、experts 13、plugins 11、mbti 7（84） | `/api/knowledge-bases/*`、`/api/skill-packages/*` | JSON |
| [`devices-and-media.md`](api/devices-and-media.md) | browser 15、desktop 7、mobile 7、voice 12、filesystem 8、storage_backends 8、onnx_models 8、ollama_models 7（72） | `/api/browser*`、`/api/desktop*`、`/api/mobile*`、`/api/voice/*` | WS + SSE + JSON |
| `app.py` 顶层 3 条 | `/.well-known/acme-challenge/{token}` (`app.py:137`)、`/api/docs` (`:278`)、`/{full_path:path}` (`:290`) | 公开 / SPA | PlainText / HTML |

## 3. 关键端点精确契约（Endpoint Schemas）

### `WS /api/agents/{agent_id}/chat/ws` — 双向对话（`ws.py:32`）

- **入口与编排链**：`chat/ws.py:32 dashboard_chat_ws` → `chat/turn.py:226 prepare_dashboard_turn` → `gateway/process/processor.py:517 GlobalProcessor.__call__`（关联 [`WF-01`](../business/chat-turn.md)）。
- **入参帧**：`ping` / `subscribe` / `cancel` / `user_turn`（`ws.py:90-130`），`user_turn` 走 `UserTurnWsFrame` 校验（`:135`），空内容拒绝（`:142`）。
- **出站帧**：`pong` / `turn_status` / `error` / `done` + harness 流块；经 `hub.register/subscribe/unregister`（`:77/:106/:180`）与 `channel_manager.enqueue`（`:168`）。
- **错误分支**：close 4001/4003/4404/1011（`ws.py:41,47,55,63`）。

### `POST /api/setup/database` — 绑定控制面 DB（`setup.py:272`）

| 位置 | 字段名 | 类型 | 必填 | 校验约束 | 含义与去向 |
|---|---|---|---|---|---|
| `body` | `driver` | `str` | 是 | `sqlite \| postgres` | 写 `config.json.database` |
| `body` | `sqlite_path` / `host/port/name/user/password` | `str/int` | 依 driver | `probe_database` (`db/probe.py:11`) | 连接参数，密码不明文回显 |
| `side effect` | — | — | — | `rebind_control_plane` 仅 `user_count==0`（`db/rebind.py:102`） | `bind_control_plane` 后启动运行时 |

### `POST /api/internal/mcp/{kind}/{instance_id}` — 进程内 MCP（`internal_mcp.py:50`）

| 位置 | 字段名 | 类型 | 必填 | 含义与去向 |
|---|---|---|---|---|
| `header` | `mcp-session-id` / `mcp-protocol-version` | `str` | 否 / 是 | 会话协商（`internal_mcp.py:24-25`） |
| `body` | `method` / `id` / `params` | `str/int/dict` | 是 | `handle_mcp_request`（`connectors/gateway/protocol.py:21-51`），`tools/call` 取 `params.name/arguments` |
| `error` | JSON-RPC `error.code` | `int` | — | 未知工具 `-32601`（`protocol.py:54-78`） |

### `POST /api/providers/{provider_id}/test` — Provider 连通性（`providers.py:465`）

- **返回**：`{"ok": bool, "latency_ms": int}`（`providers/probe.py:209-245`）；embedding 探测 `POST {base}/embeddings {"model":..., "input":["ping"]}`（`:159-206`）。

## 4. CLI 入向命令（20 个顶层子命令）

`octop` console_scripts 入口为 `octop.cli.main:cli`（`pyproject.toml:95-96`），`python -m octop` 走 `src/octop/__main__.py:5-8`；命令注册表 `cli/registry.py:6-31`：`init/run/service/config/user/agent/chats/channel/cron/provider/models/skills/admin/version/completion/update/clean/backup/acp/plugin`。完整命令行为与传输层见 [`ui-and-cli.md`](../architecture/ui-and-cli.md)。

## 5. 共变耦合与修改清单（Co-Change Playbook）

1. 新增路由：更新对应分组子页 + `openapi_meta.py` 标签 + `tests/integration/test_*_api.py`（详情见各子页「共变清单」）。
2. 改鉴权/白名单：`deps.py:66-91` + `setup_lockdown.py:15,31` + 前端 401/503 跳转（`dashboard/src/api/request.ts:77-93`）。
3. 改错误码：`errors.py:13-104` + `i18n/{en,zh}.json` + 前端 `apiErrors.*`，详见 [`error-codes.md`](error-codes.md)。
