---
kind: component
scope: api-service
status: draft
origin: generated
source_paths: [src/octop/api/app.py, src/octop/api/deps.py, src/octop/api/middleware/jwt_auth.py, src/octop/api/middleware/setup_lockdown.py, src/octop/api/openapi_meta.py, src/octop/api/routers/chat/ws.py]
symbols: [build_app, _mount_routers, install_jwt_auth, install_setup_lockdown, _octop, _unhandled, dashboard_chat_ws]
upstream: [INDEX.md, architecture/index.md]
downstream: [contracts/api-reference.md, architecture/core-engine.md]
---

# `API Service`（FastAPI / WS / SSE / MCP 接入组件）

`src/octop/api/` 是唯一 HTTP 适配层：FastAPI 工厂装配 417 个入向路由（414 个 router 装饰器 + 3 个 app 顶层），所有领域规则下沉到 `infra/`，本层只做鉴权、校验、错误映射和流式转发。

## 1. 请求处理洋葱链（Middleware & Dispatch Call Tree）

```text
Incoming Request
  ├─ [1. setup 锁] src/octop/api/middleware/setup_lockdown.py:22 _lockdown
  │    ├─ 放行 setup/, health/ 与精确 open_exact (:15,:31)
  │    └─ user_manager is None or count()==0 -> 503 {"setup_required":true} (:36-40)
  ├─ [2. JWT] src/octop/api/middleware/jwt_auth.py:37 _jwt_auth
  │    ├─ 仅 /api/* 且非 src/octop/api/deps.py:66-91 豁免路径
  │    ├─ deps.py:112 extract_raw_token -> :137 resolve_user_from_token
  │    ├─ fail -> JSONResponse(exc.status, exc.to_envelope()) (:52-62)
  │    └─ 剩余 TTL < 1/3 -> 响应头 X-Octop-Access-Token (:146)
  ├─ [3. CORS] src/octop/api/app.py:120-130（仅 cfg.cors_origins，expose 续期头）
  ├─ [4. route] app.py:201-266 _mount_routers -> :74 app.include_router(spec.router, prefix, tags)
  ├─ [5. ws/sse] chat/ws.py:32 / chat/routes.py:156 / chat/trajectory.py:326 / browser|desktop|mobile stream.py
  └─ [6. error-map] app.py:78 _octop（OctopError 本地化） / :93 _unhandled（INTERNAL_ERROR 500）
```

注册序为 CORS→JWT→lockdown（Starlette 后进先出），实际执行由外到内为 **lockdown → JWT → CORS → 路由**。

## 2. 路由分组与并发执行模型表

> 逐端点字段字典见 [`contracts/api-reference.md`](../contracts/api-reference.md)；本表只列架构执行特征。

| 路由组前缀 | 端点数（约） | 鉴权依赖 | 并发 / IO 模型 | 关键下游模块 |
|---|---|---|---|---|
| `/api/agents/*`（agents/skills/cron/chat/threads/memory/workspace/acp/terminal…） | ~170 | 登录 + `_assert_agent_owner` | 同步 JSON + WS/SSE 流式 + `run_in_executor` 卸载阻塞 IO | [`core-engine.md`](core-engine.md) |
| `/api/connectors/*`、`/api/internal/mcp/*` | 27 + 3 | 登录；MCP token 豁免 | HTTP JSON-RPC + 长连接 SSE keepalive | [`connectors-mcp.md`](../integrations/downstream/connectors-mcp.md) |
| `/api/knowledge-bases/*` | 25 | 登录 + feature gate | 异步索引作业（`INDEX_CONCURRENCY=2`） | [`knowledge-rag.md`](../integrations/downstream/knowledge-rag.md) |
| `/api/agents/{aid}/channels/*` | 21 + QR/bot-creator | 登录 + owner | 子进程 + SSE 进度 | [`im-channels.md`](../integrations/downstream/im-channels.md) |
| `/api/admin/*`、`/api/setup/*`、`/api/auth/*`、`/api/users/*` | ~70 | admin 或 setup 豁免 | 同步 JSON；setup 期 lockdown | [`setup-and-auth.md`](../business/setup-and-auth.md) |
| `/api/browser*`、`/api/desktop*`、`/api/mobile*`、`/api/filesystem` | ~35 | 登录 + capability 权限 | WS 帧流 + subprocess | [`device-bridges.md`](../integrations/downstream/device-bridges.md) |
| `/.well-known/acme-challenge/{token}`、`/api/docs`、`/{full_path:path}` | 3 | 公开 / SPA 兜底 | ACME challenge / Scalar 文档 / 静态 SPA | [`deployment-and-runtime.md`](../operations/deployment-and-runtime.md) |

**全量装饰器计数**：GET 170、POST 161、PUT 29、DELETE 28、PATCH 19、WEBSOCKET 7，分布于 66 个文件；`app.py:137/278/290` 三个顶层 GET 另计。

## 3. 核心源码文件与符号表

| 源码文件 | 核心符号（`行号`） | 职责边界 |
|---|---|---|
| `src/octop/api/app.py` | `build_app` (`:101`)、`_install_exception_handlers` (`:78,:93`)、`_mount_routers` (`:72`)、`spa_fallback` (`:290`) | FastAPI 工厂、router 注册、静态兜底与路径穿越防护 |
| `src/octop/api/deps.py` | `sign_token` (`:28`)、`decode_token` (`:47`)、`get_server` (`:95`)、`require_database` (`:102`)、`current_user` (`:181`)、`require_admin` (`:217`) | JWT 签发/解析、用户注入、权限守门 |
| `src/octop/api/middleware/jwt_auth.py` | `install` (`:32`)、`_jwt_auth` (`:37`) | 中间件级鉴权与滑动续期 |
| `src/octop/api/middleware/setup_lockdown.py` | `install` (`:21`)、`_lockdown` (`:22`) | 零用户时锁定非安装端点 |
| `src/octop/api/openapi_meta.py` | `configure_openapi` / `OPENAPI_TAGS` | Scalar 标签与接口说明 |
| `src/octop/api/routers/chat/ws.py` | `dashboard_chat_ws` (`:32`) | 双向 WS：ping/subscribe/cancel/user_turn |
| `src/octop/api/routers/chat/sse.py` | `format_sse` (`:24`) | 统一帧 `event: …\ndata: {json}\n\n` |

## 4. 上下游调用关系

- **上游调用方**：React Dashboard（`dashboard/src/api/request.ts:298`）、Click CLI（embedded 模式）、外部 MCP Client、浏览器直接访问 `/api/docs`。
- **下游被调模块**：仓内 [`core-engine.md`](core-engine.md) 与 [`async-job-worker.md`](async-job-worker.md)；外部封装走 [`integrations/index.md`](../integrations/index.md)。
- **错误映射**：`OctopError.to_envelope(locale)`（`src/octop/infra/errors.py:239`）产出 `{"error":{"code","message","details"}}`，i18n 由 `resolve_request_locale` 决定。

## 5. 共变耦合与新增接口清单（Co-Change Playbook）

1. 定义请求/响应 Schema（`src/octop/api/routers/<group>.py` Pydantic 模型）并补 `Field(description=…)`，保证 `/api/docs` 可读。
2. 注册路由：`app.py:201-266` 增加 `_RouterMount`，必要时补 `deps.py:66-91` 免登白名单与 `openapi_meta.py` 标签。
3. 错误映射：新增 `ErrorCode` 必须同步 `errors.py:13-104` + `i18n/{en,zh}.json` + `dashboard/src/locales/{en,zh}.json → apiErrors.*`。
4. 回归：`uv run pytest tests/unit/api -q` 与 `uv run pytest tests/integration -x -q`；涉及 WS 时用 `tests/support/http.py:132 ws_connect` 桩。
