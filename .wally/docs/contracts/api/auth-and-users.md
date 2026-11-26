---
kind: api-contract
scope: auth-and-users
status: draft
origin: generated
source_paths: [src/octop/api/app.py, src/octop/api/routers/admin.py, src/octop/api/routers/auth.py, src/octop/api/routers/auth_oidc.py, src/octop/api/routers/health.py, src/octop/api/routers/i18n.py, src/octop/api/routers/invites.py, src/octop/api/routers/preferences.py, src/octop/api/routers/security.py, src/octop/api/routers/setup.py, src/octop/api/routers/users.py]
symbols: [acme_http01_challenge, api_docs, apply_database, audit_log, begin_setup, change_password, create_invite, create_user, delete_user, finish, get_preferences, get_security_defaults]
upstream: [../api-reference.md, ../../INDEX.md]
downstream: [../error-codes.md, ../../architecture/api-service.md]
---

# 入向接口契约：认证、用户与系统初始化（`auth-and-users`）

> 本页覆盖 `auth-and-users` 分组全部 **54** 条入向接口，路径为 `app.include_router` 挂载后的完整路径；公共协议、鉴权与包络见 [`api-reference.md`](../api-reference.md)，错误码字典见 [`error-codes.md`](../error-codes.md)。

## 1. 分组范围与实现要点

本组覆盖身份生命周期与首次安装：`/api/setup/*` 在库内用户数为 0 时开放，由 `src/octop/api/middleware/setup_lockdown.py:21` 的 `_lockdown` 判定，未就绪返回 `503 {"setup_required": true}`（`src/octop/api/middleware/setup_lockdown.py:36`）。登录成功后 `src/octop/api/routers/auth.py:40` 调用 `sign_token` 生成 `{sub, uname, role, iat, exp}`（`src/octop/api/deps.py:37`），默认 `access_token_ttl_seconds=86400`（`src/octop/config.py:129`）。`OctopConfig.login_max_attempts=5` 与 `login_lockout_seconds=900`（`src/octop/config.py:130-131`）共同触发 `LOGIN_LOCKED(429)`（`src/octop/infra/errors.py:118`）。`/api/health` 为无鉴权存活探针，返回 `ok`、`started_at`、`db`、`users_loaded`、`agents_running`（`src/octop/api/routers/health.py:22`）；`GET /api/admin/metrics` 经 `require_permission` 后读取 `METRICS.snapshot()`（`src/octop/api/routers/admin.py:70`）。

## 2. 全量接口路由总表（Master Inbound Inventory）

| 方法 | 完整路径 | Handler 符号 | 源码锚点（仓库根相对） | 鉴权 | 执行模式 |
|---|---|---|---|---|---|
| `GET` | `/api/admin/audit-log` | `audit_log` | `src/octop/api/routers/admin.py:47` | JWT | 同步 JSON |
| `GET` | `/api/admin/metrics` | `metrics` | `src/octop/api/routers/admin.py:70` | JWT | 同步 JSON |
| `GET` | `/api/admin/overview` | `overview` | `src/octop/api/routers/admin.py:14` | JWT | 同步 JSON |
| `GET` | `/.well-known/acme-challenge/{token}` | `acme_http01_challenge` | `src/octop/api/app.py:137` | 免鉴权 | 同步 JSON |
| `GET` | `/api/docs` | `api_docs` | `src/octop/api/app.py:278` | 免鉴权 | 同步 JSON |
| `GET` | `/{full_path:path}` | `spa_fallback` | `src/octop/api/app.py:290` | 静态回退 | 同步 JSON |
| `POST` | `/api/auth/change-password` | `change_password` | `src/octop/api/routers/auth.py:74` | JWT | 同步 JSON |
| `POST` | `/api/auth/login` | `login` | `src/octop/api/routers/auth.py:40` | 免鉴权 | 同步 JSON |
| `POST` | `/api/auth/logout` | `logout` | `src/octop/api/routers/auth.py:61` | JWT | 同步 JSON |
| `GET` | `/api/auth/me` | `me` | `src/octop/api/routers/auth.py:68` | JWT | 同步 JSON |
| `PATCH` | `/api/auth/me` | `update_me` | `src/octop/api/routers/auth.py:90` | JWT | 同步 JSON |
| `GET` | `/api/auth/oidc/callback` | `oidc_callback` | `src/octop/api/routers/auth_oidc.py:109` | 免鉴权 | 同步 JSON |
| `GET` | `/api/auth/oidc/config` | `oidc_config` | `src/octop/api/routers/auth_oidc.py:158` | 免鉴权 | 同步 JSON |
| `PUT` | `/api/auth/oidc/config` | `put_oidc_config` | `src/octop/api/routers/auth_oidc.py:168` | 免鉴权 | 同步 JSON |
| `POST` | `/api/auth/oidc/config/test` | `test_oidc_config` | `src/octop/api/routers/auth_oidc.py:182` | 免鉴权 | 同步 JSON |
| `POST` | `/api/auth/oidc/exchange` | `oidc_exchange` | `src/octop/api/routers/auth_oidc.py:137` | 免鉴权 | 同步 JSON |
| `POST` | `/api/auth/oidc/start` | `oidc_start` | `src/octop/api/routers/auth_oidc.py:74` | 免鉴权 | 同步 JSON |
| `GET` | `/api/auth/oidc/status` | `oidc_status` | `src/octop/api/routers/auth_oidc.py:68` | 免鉴权 | 同步 JSON |
| `GET` | `/api/health` | `health` | `src/octop/api/routers/health.py:14` | 免鉴权 | 同步 JSON |
| `GET` | `/api/i18n/skills` | `get_skill_labels` | `src/octop/api/routers/i18n.py:36` | 免鉴权 | 同步 JSON |
| `GET` | `/api/i18n/tools` | `get_tool_labels` | `src/octop/api/routers/i18n.py:24` | 免鉴权 | 同步 JSON |
| `POST` | `/api/auth/invite/redeem` | `redeem_invite` | `src/octop/api/routers/invites.py:124` | 免鉴权 | 同步 JSON |
| `POST` | `/api/auth/invite/validate` | `validate_invite` | `src/octop/api/routers/invites.py:114` | 免鉴权 | 同步 JSON |
| `GET` | `/api/users/invites` | `list_invites` | `src/octop/api/routers/invites.py:75` | JWT | 同步 JSON |
| `POST` | `/api/users/invites` | `create_invite` | `src/octop/api/routers/invites.py:85` | JWT | 同步 JSON |
| `POST` | `/api/users/invites/{invite_id}/revoke` | `revoke_invite` | `src/octop/api/routers/invites.py:103` | JWT | 同步 JSON |
| `GET` | `/api/preferences` | `get_preferences` | `src/octop/api/routers/preferences.py:103` | JWT | 同步 JSON |
| `PATCH` | `/api/preferences` | `patch_preferences` | `src/octop/api/routers/preferences.py:112` | JWT | 同步 JSON |
| `GET` | `/api/admin/security` | `get_security_policy` | `src/octop/api/routers/security.py:45` | JWT | 同步 JSON |
| `PUT` | `/api/admin/security` | `put_security_policy` | `src/octop/api/routers/security.py:53` | JWT | 同步 JSON |
| `GET` | `/api/admin/security/defaults` | `get_security_defaults` | `src/octop/api/routers/security.py:190` | JWT | 同步 JSON |
| `GET` | `/api/admin/security/tool-guard/rules` | `get_tool_guard_rules` | `src/octop/api/routers/security.py:128` | JWT | 同步 JSON |
| `GET` | `/api/admin/security/tool-guard/rules/raw` | `get_tool_guard_rules_raw` | `src/octop/api/routers/security.py:143` | JWT | 同步 JSON |
| `PUT` | `/api/admin/security/tool-guard/rules/raw` | `put_tool_guard_rules_raw` | `src/octop/api/routers/security.py:152` | JWT | 同步 JSON |
| `POST` | `/api/admin/security/tool-guard/rules/reset` | `post_tool_guard_rules_reset` | `src/octop/api/routers/security.py:173` | JWT | 同步 JSON |
| `POST` | `/api/setup/begin` | `begin_setup` | `src/octop/api/routers/setup.py:309` | 免鉴权 | 同步 JSON |
| `POST` | `/api/setup/database` | `apply_database` | `src/octop/api/routers/setup.py:272` | 免鉴权 | 同步 JSON |
| `POST` | `/api/setup/finish` | `finish` | `src/octop/api/routers/setup.py:412` | 免鉴权 | 同步 JSON |
| `POST` | `/api/setup/initial-admin` | `initial_admin` | `src/octop/api/routers/setup.py:341` | 免鉴权 | 同步 JSON |
| `GET` | `/api/setup/presets` | `setup_presets` | `src/octop/api/routers/setup.py:213` | 免鉴权 | 同步 JSON |
| `POST` | `/api/setup/resume-wizard` | `resume_wizard` | `src/octop/api/routers/setup.py:378` | 免鉴权 | 同步 JSON |
| `GET` | `/api/setup/status` | `status` | `src/octop/api/routers/setup.py:232` | 免鉴权 | 同步 JSON |
| `POST` | `/api/setup/test-database` | `test_database` | `src/octop/api/routers/setup.py:254` | 免鉴权 | 同步 JSON |
| `POST` | `/api/setup/test-provider` | `test_provider_draft` | `src/octop/api/routers/setup.py:390` | 免鉴权 | 同步 JSON |
| `GET` | `/api/setup/validate-token` | `validate_wizard_token` | `src/octop/api/routers/setup.py:219` | 免鉴权 | 同步 JSON |
| `POST` | `/api/setup/verify-password` | `verify_password` | `src/octop/api/routers/setup.py:319` | 免鉴权 | 同步 JSON |
| `GET` | `/api/users` | `list_users` | `src/octop/api/routers/users.py:131` | JWT | 同步 JSON |
| `POST` | `/api/users` | `create_user` | `src/octop/api/routers/users.py:139` | JWT | 同步 JSON |
| `GET` | `/api/users/permissions` | `list_permission_catalog` | `src/octop/api/routers/users.py:107` | JWT | 同步 JSON |
| `DELETE` | `/api/users/{user_id}` | `delete_user` | `src/octop/api/routers/users.py:235` | JWT | 同步 JSON |
| `GET` | `/api/users/{user_id}` | `get_user` | `src/octop/api/routers/users.py:160` | JWT | 同步 JSON |
| `PATCH` | `/api/users/{user_id}` | `patch_user` | `src/octop/api/routers/users.py:172` | JWT | 同步 JSON |
| `POST` | `/api/users/{user_id}/reset-password` | `reset_password` | `src/octop/api/routers/users.py:222` | JWT | 同步 JSON |
| `POST` | `/api/users/{user_id}/unlock-login` | `unlock_user_login` | `src/octop/api/routers/users.py:209` | JWT | 同步 JSON |

## 3. 关键端点入参与出参契约

| 端点（`方法 路径`） | 关键入参字段 / 位置 | 出参结构 | 精确源码锚点 |
|---|---|---|---|
| `GET /api/admin/audit-log` | 路径/查询/体字段见路由表 Handler 定义 | 由 `audit_log` 组装的 Pydantic 响应 | `src/octop/api/routers/admin.py:47` |
| `GET /api/admin/metrics` | 路径/查询/体字段见路由表 Handler 定义 | 由 `metrics` 组装的 Pydantic 响应 | `src/octop/api/routers/admin.py:70` |
| `GET /api/admin/overview` | 路径/查询/体字段见路由表 Handler 定义 | 由 `overview` 组装的 Pydantic 响应 | `src/octop/api/routers/admin.py:14` |

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
