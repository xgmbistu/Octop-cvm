---
kind: api-contract
scope: inbound-api
status: draft
origin: generated
source_paths: [src/octop/api/app.py, src/octop/api/deps.py, src/octop/api/middleware/jwt_auth.py, src/octop/api/routers/chat/ws.py, src/octop/api/routers/chat/sse.py]
symbols: [build_app, is_jwt_exempt_request, extract_raw_token, format_sse, dashboard_chat_ws]
upstream: [../INDEX.md]
downstream: [error-codes.md, configuration.md, api/auth-and-users.md]
---

# 入向接口契约全集（HTTP / SSE / WebSocket / CLI）

> 全仓共登记 **422** 条 HTTP/SSE/WebSocket 入向接口（含 5 条 `add_api_route` 动态注册），按业务分组拆为 8 张子页；本页保留公共协议约定、分组总表与 CLI 命令矩阵，逐接口完整路径与 Handler 锚点见对应子页，每条端点逐一登记、不做省略归并。CLI 子命令同属入向入口，清单位于 [`architecture/cli.md`](../architecture/cli.md)。

## 1. 公共协议、路由挂载与响应包络

| 维度 | 精确实现规则 | 源码锚点 |
|---|---|---|
| FastAPI 工厂 | `build_app(server)` 统一装配中间件、异常处理与路由 | `src/octop/api/app.py:101` |
| 路由挂载 | 52 组 `_RouterMount(spec.router, prefix, tags)` 经 `_mount_routers` 批量注册 | `src/octop/api/app.py:201`、`:72` |
| 认证凭据提取 | `Authorization: Bearer` → `access_token` 查询参数 → `access_token` Cookie | `src/octop/api/deps.py:112` |
| JWT 解码 | PyJWT `HS256` 校验 `sub/uname/role/iat/exp`，过期→`TOKEN_EXPIRED` | `src/octop/api/deps.py:47`、`:124` |
| 免鉴权白名单 | `_JWT_EXEMPT_PREFIXES` + `_JWT_EXEMPT_EXACT` 双表判定 | `src/octop/api/deps.py:66`、`:73` |
| 归属与权限 | `_assert_agent_owner` + `require_permission(key)`（admin 豁免） | `src/octop/api/common/agent.py:23`、`src/octop/api/deps.py:196` |
| 标准错误包络 | `{"error": {"code", "message", "details"}}` | `src/octop/infra/errors.py:239` |
| SSE 帧格式 | `event: {event}\ndata: {json}\n\n` | `src/octop/api/routers/chat/sse.py:24` |
| WS 帧类型 | `ping`/`subscribe`/`cancel`/`user_turn` 入向，`token`/`done`/`error` 出向 | `src/octop/api/routers/chat/ws.py:91` |
| 交互式文档 | `enable_api_docs` 为真时挂 `/api/docs`（Scalar）与 `/api/openapi.json` | `src/octop/api/app.py:276` |
| SPA 回退 | `/{full_path:path}` 仅服务 `assets/` 外的静态壳，拒绝 `..` 越界 | `src/octop/api/app.py:290`、`:299` |

## 2. 全量接口分组总表（422 条 → 8 张分组子页）

| 分组标识 | 业务范围 | 接口数 | 逐接口契约子页 |
|---|---|---|---|
| `auth-and-users` | 认证、用户与系统初始化 | 54 | [`contracts/api/auth-and-users.md`](api/auth-and-users.md) |
| `agents-and-experts` | Agent、专家与插件 | 68 | [`contracts/api/agents-and-experts.md`](api/agents-and-experts.md) |
| `skills-and-models` | 技能、模型提供方与语音 | 74 | [`contracts/api/skills-and-models.md`](api/skills-and-models.md) |
| `chat-and-memory` | 对话、SSE/WS、记忆与用量 | 58 | [`contracts/api/chat-and-memory.md`](api/chat-and-memory.md) |
| `connectors-and-knowledge` | 连接器与知识库 | 55 | [`contracts/api/connectors-and-knowledge.md`](api/connectors-and-knowledge.md) |
| `channels-and-cron` | IM 通道与定时任务 | 28 | [`contracts/api/channels-and-cron.md`](api/channels-and-cron.md) |
| `workspace-and-filesystem` | 工作区文件与存储后端 | 34 | [`contracts/api/workspace-and-filesystem.md`](api/workspace-and-filesystem.md) |
| `devices-and-ops` | 浏览器/桌面/移动端与运维 | 51 | [`contracts/api/devices-and-ops.md`](api/devices-and-ops.md) |

> 覆盖率对账：`src/octop/api/app.py:201-265` 的 52 组挂载 + `src/octop/api/app.py:268` 的条件 mobile 组 + `src/octop/api/app.py:137`/`:278`/`:290` 三条直接注册路由 + `src/octop/api/routers/memory.py:654` 的 5 条 `add_api_route` 均已落表，未映射入向接口 = `0`。

## 3. 协议分级与鉴权矩阵

| 协议级别 | 典型前缀 | 鉴权 | 说明 |
|---|---|---|---|
| 免鉴权-安装 | `/api/setup/*` | 无 | 用户数为 0 时才开放，见 `src/octop/api/middleware/setup_lockdown.py:21` |
| 免鉴权-存活 | `/api/health` | 无 | 返回 `ok/db/users_loaded/agents_running` |
| 免鉴权-认证 | `/api/auth/login`、`/api/auth/oidc/*` | 无 | 登录与 OIDC 回调 |
| 免鉴权-回调 | `/api/internal/mcp/*`、`/api/connectors/oauth/callback` | 无 | 内部与 OAuth 回调白名单 |
| JWT-用户 | `/api/agents/*`、`/api/knowledge-bases/*` | JWT + 归属 | 主业务面 |
| JWT-管理员 | `/api/admin/*` | `require_permission` | 运维与审计 |

## 4. 入向契约与下游扇出的交叉索引

上游字段如何转换为下游请求字典，见 [`integrations/topology-and-mapping.md`](../integrations/topology-and-mapping.md)；每个外部下游的完整请求/响应字典契约见 [`integrations/index.md`](../integrations/index.md)。错误码与 `degraded` 字面量见 [`error-codes.md`](error-codes.md)，配置项见 [`configuration.md`](configuration.md)。

## 5. CLI / ACP 入向命令清单（20 个顶层 COMMANDS）

> `octop` 入口由 `pyproject.toml:96` 注册，命令表在 `src/octop/cli/registry.py:6-31`，经 `_LazyCLI.get_command`（`src/octop/cli/main.py:65`）懒加载；`octop acp` 另提供 stdio ACP 入向服务。全部子命令均为入向入口，逐项登记如下。

| 顶层命令 | 注册锚点 | 关键子命令 / 传输层 |
|---|---|---|
| `init` | `src/octop/cli/registry.py:7` | 首启建库（Offline） |
| `run` | `src/octop/cli/registry.py:8` | `launch.run_foreground_blocking`（Embedded，`src/octop/cli/commands/run.py:153`） |
| `service` | `src/octop/cli/registry.py:9` | `start/stop/restart/status`（External） |
| `config` | `src/octop/cli/registry.py:14` | `show`、`set-user` |
| `user` | `src/octop/cli/registry.py:15` | `create/list/set-email/passwd/role/disable/delete` |
| `agent` | `src/octop/cli/registry.py:16` | `create/from-expert/list/use/start/stop/reload/delete/experts` |
| `chats` | `src/octop/cli/registry.py:17` | `list/get/create/update/delete/send/repl` |
| `channel` | `src/octop/cli/registry.py:18` | `list/get/create/patch/delete/test/bind/config/feishu-setup` |
| `cron` | `src/octop/cli/registry.py:19` | `list/create/delete/run-now` |
| `provider` | `src/octop/cli/registry.py:20` | `list/create/delete/test` |
| `models` | `src/octop/cli/registry.py:21` | `presets/list/active/config/ollama-list/ollama-pull/ollama-rm` |
| `skills` | `src/octop/cli/registry.py:22` | `list/enable/disable/config` |
| `admin` | `src/octop/cli/registry.py:23` | `overview/audit/providers/rotate-jwt-secret` |
| `version` / `completion` | `src/octop/cli/registry.py:24-25` | 版本输出 / shell 补全 |
| `update` / `clean` / `backup` | `src/octop/cli/registry.py:26-28` | 自更新 / 清状态 / `create/auto/restore` |
| `acp` | `src/octop/cli/registry.py:29` | stdio ACP server（`src/octop/cli/commands/acp.py:48`） |
| `plugin` | `src/octop/cli/registry.py:30` | `list/install/uninstall/reload` |

## 6. 共变耦合与修改清单（Co-Change Playbook）

1. 新增/变更路由：改 `src/octop/api/routers/*.py` → 核对 `src/octop/api/app.py:201` 前缀 → 更新对应 `contracts/api/<group>.md` 与本页分组计数。
2. 新增鉴权例外：同时改 `src/octop/api/deps.py:66`、`:73` 与 `src/octop/api/middleware/setup_lockdown.py:15`，并跑 `uv run pytest tests/unit/api -q`。
3. 错误语义：同步 `src/octop/infra/errors.py` 与前后端 i18n 键，运行 `uv run pytest tests/unit/i18n -q`。
- **核验锚点**：`src/octop/api/middleware/jwt_auth.py:1`（JWT 鉴权中间件）。
