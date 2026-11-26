---
kind: component
scope: api-service
status: draft
origin: generated
source_paths: [src/octop/api/app.py, src/octop/api/deps.py, src/octop/api/middleware/jwt_auth.py, src/octop/api/middleware/setup_lockdown.py, src/octop/api/common/agent.py, src/octop/api/routers/chat/sse.py, src/octop/api/routers/chat/ws.py, src/octop/api/openapi_meta.py]
symbols: [build_app, _install_exception_handlers, install_jwt_auth, install_setup_lockdown, extract_raw_token, current_user, require_admin, _assert_agent_owner, format_sse, dashboard_chat_ws]
upstream: [../contracts/api-reference.md, ../overview/system-architecture.md]
downstream: [../integrations/index.md, module-dep-matrix.md, ../contracts/error-codes.md]
---

# `api-service`（FastAPI / SSE / WebSocket 接入组件）

`src/octop/api/` 是全仓唯一 HTTP 适配层：`build_app` 装配 FastAPI、CORS、JWT/Setup 中间件、异常处理器与 52 组路由，全部接口以 `/api` 为主前缀。router 必须保持「校验 HTTP → 调 `infra/` → 映射错误」的薄层，禁止承载领域规则与 SQL。

## 1. 请求处理洋葱链（Middleware & Dispatch Call Tree）

```text
Incoming Request (HTTP / SSE / WS)
  ├─ [1. setup-lockdown] src/octop/api/middleware/setup_lockdown.py:23 _lockdown
  │    └─ user_manager is None or count()==0 -> 503 {"setup_required": true} (:36-40)
  ├─ [2. jwt-gate]       src/octop/api/middleware/jwt_auth.py:38 _jwt_auth
  │    ├─ 非 /api/ 或 is_jwt_exempt_request -> 放行 (:43-44)
  │    ├─ extract_raw_token (src/octop/api/deps.py:112) -> resolve_user_from_token (:137)
  │    │    ├─ ExpiredSignatureError -> TOKEN_EXPIRED(401) (:132-134)
  │    │    └─ 用户不存在 -> USER_DISABLED (:142)
  │    └─ request.state.octop_user 缓存 + 滑动续期 X-Octop-Access-Token (:51, :65-71)
  ├─ [3. validation]     Pydantic 请求模型（各 routers/*.py 内 *Body）-> 422
  ├─ [4. execution]      同步直出 | SSE StreamingResponse | WS 长连接 | to_thread 卸载阻塞 IO
  ├─ [5. error-map]      src/octop/api/app.py:78 _octop -> JSONResponse(exc.status, exc.to_envelope(locale))
  │    └─ 未捕获异常 -> :93 _unhandled -> INTERNAL_ERROR(500)
  └─ [6. spa-fallback]   src/octop/api/app.py:290 （仅静态资源，assets/ 缺失返回 404）
```

## 2. 路由分组与并发执行模型表

> 逐端点入参/出参字典统一见 [`../contracts/api-reference.md`](../contracts/api-reference.md) 与其 8 张分组子页，本表聚焦架构执行特征。

| 路由组前缀 | 端点数（分组） | 鉴权依赖 | 并发/IO 模型 | 关联缓存/状态失效 | 下游模块 |
|---|---|---|---|---|---|
| `/api/setup/*`、`/api/health` | 12 | 免鉴权 / Setup lockdown | 同步；DB 探测可能阻塞 | 建库后 `SharedServices` 装配 | `infra/setup/`、`infra/db/` |
| `/api/auth/*`、`/api/users/*` | 18 | 免登 + JWT + `require_admin` | 同步；Argon2 哈希卸载 | 会话/JWT secret | `infra/users/` |
| `/api/agents/*/…` | 13 | JWT + `_assert_agent_owner` | 同步；`start/stop/reload` 触发运行时切换 | Agent 状态写 `last_state` | `infra/agents/` |
| `/api/agents/{id}/chat/ws`、`/api/chat/*` | 21 | JWT | **WebSocket + SSE 流**（`src/octop/api/routers/chat/ws.py:32`、`src/octop/api/routers/chat/sse.py:24`） | 线程投影 `thread_messages` | `infra/gateway/` |
| `/api/connectors/*`、`/api/knowledge-bases/*` | 52 | JWT + 权限 | 同步；远程探测需超时卸载 | 文档索引状态 | `infra/connectors/`、`infra/knowledge/` |
| `/api/admin/*` | 33 | `require_permission` / admin | 同步；`METRICS.snapshot()` 懒加载 | 审计表写入 | `infra/metrics.py`、`infra/db/` |
| `/api/browser-stream/ws`、`/api/desktop-stream/ws`、`/api/mobile-stream/ws` | 3 | JWT | **WebSocket 推流** | 会话级流 | `infra/browser|desktop|mobile/` |

## 3. 核心源码文件与符号表

| 源码文件 | 核心符号（`行号`） | 职责边界 |
|---|---|---|
| `src/octop/api/app.py` | `build_app` (`:101`)、`_install_exception_handlers` (`:77`)、`_mount_routers` (`:72`)、`_dashboard_fallback` (`:60`) | 工厂、异常映射、路由挂载、SPA 静态壳 |
| `src/octop/api/deps.py` | `_JWT_EXEMPT_PREFIXES` (`:66`)、`extract_raw_token` (`:112`)、`authenticate_request` (`:171`)、`require_permission` (`:196`)、`get_server` (`:95`) | JWT 白名单、身份解析、DI |
| `src/octop/api/middleware/jwt_auth.py` | `install` (`:32`)、`_jwt_auth` (`:38`) | 全局 HTTP 鉴权中间件 |
| `src/octop/api/middleware/setup_lockdown.py` | `_OPEN_PREFIXES` (`:15`)、`install` (`:21`) | 未初始化时仅放行 setup/health |
| `src/octop/api/common/agent.py` | `_assert_agent_owner` (`:23`) | agent 归属与 admin 豁免 |
| `src/octop/api/routers/chat/sse.py` | `format_sse` (`:24`) | `event: {event}\ndata: {json}\n\n` 帧构造 |
| `src/octop/api/routers/chat/ws.py` | `dashboard_chat_ws` (`:32`) | WS 帧分发与关闭码 `4001/1011/4003/4404` |
| `src/octop/api/openapi_meta.py` | `OPENAPI_TAGS` / `configure_openapi` | Scalar 文档分组与 tag 描述 |

## 4. 上下游调用关系

- **上游调用方**：`dashboard/src/api/modules/*` 的 fetch 包装、Click CLI 的 Embedded 态、外部 HTTP/SSE 客户端、IM 网关回调。
- **下游被调模块**：`infra/gateway/process/processor.py`（消息处理）、`infra/agents/manager.py`（Agent 运行时）、`infra/db/services.py`（23 repo）；外部封装详见 [`../integrations/index.md`](../integrations/index.md)。
- **错误与配置联动**：异常 → HTTP 状态映射见 [`../contracts/error-codes.md`](../contracts/error-codes.md)；`enable_api_docs`/`cors_origins`/`max_upload_mb` 等开关见 [`../contracts/configuration.md`](../contracts/configuration.md)。

## 5. 共变耦合与修改清单（Co-Change Playbook）

1. 定义请求/响应 Schema 与带 `summary` 的装饰器：对应 `src/octop/api/routers/<group>.py`。
2. 注册路由并绑定鉴权依赖：核对 `src/octop/api/app.py:201-266` 的 `_RouterMount` 前缀；阻塞磁盘/SQLite/Git IO 必须走 `run_in_executor`（`AGENTS.md:348`）。
3. 新增免鉴权路径须同步 `src/octop/api/deps.py:66`、`:73` 与 `src/octop/api/middleware/setup_lockdown.py:15`，并补 `src/octop/api/openapi_meta.py` 的 tag。
4. 同步异常映射与前后端 i18n 键（[`../contracts/error-codes.md`](../contracts/error-codes.md)），更新对应 [`../contracts/api/<group>.md`](../contracts/api-reference.md) 分组表，运行 `uv run pytest tests/unit/api -q` 与 `cd dashboard && npx tsc --noEmit`。
