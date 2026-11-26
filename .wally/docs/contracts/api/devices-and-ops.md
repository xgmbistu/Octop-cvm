---
kind: api-contract
scope: devices-and-ops
status: draft
origin: generated
source_paths: [src/octop/api/app.py, src/octop/api/routers/backup.py, src/octop/api/routers/browser/env.py, src/octop/api/routers/browser/harness.py, src/octop/api/routers/browser/record_replay.py, src/octop/api/routers/browser/stream.py, src/octop/api/routers/browser/uninstall.py, src/octop/api/routers/desktop/install.py, src/octop/api/routers/desktop/settings.py, src/octop/api/routers/desktop/status.py, src/octop/api/routers/desktop/stream.py, src/octop/api/routers/desktop/uninstall.py, src/octop/api/routers/mobile/install.py, src/octop/api/routers/mobile/shell_ws.py, src/octop/api/routers/mobile/status.py, src/octop/api/routers/mobile/stream.py, src/octop/api/routers/observability.py, src/octop/api/routers/settings.py, src/octop/api/routers/tls.py, src/octop/api/routers/update.py]
symbols: [adb_shell_ws, browser_stream_ws, check_for_updates, create_backup, desktop_stream_ws, download_backup_file, env_status, export_backup, get_agent_control, get_auto_backup_settings, get_backup_status, get_capabilities]
upstream: [../api-reference.md, ../../INDEX.md]
downstream: [../error-codes.md, ../../architecture/api-service.md]
---

# 入向接口契约：浏览器/桌面/移动端与运维（`devices-and-ops`）

> 本页覆盖 `devices-and-ops` 分组全部 **51** 条入向接口，路径为 `app.include_router` 挂载后的完整路径；公共协议、鉴权与包络见 [`api-reference.md`](../api-reference.md)，错误码字典见 [`error-codes.md`](../error-codes.md)。

## 1. 分组范围与实现要点

`browser`/`desktop`/`mobile` 三组含 WebSocket 推流端点，其中 mobile 路由仅在 `enable_mobile` 为真时挂载（`src/octop/api/app.py:268`）。`/api/admin/backup/auto*` 管理自动备份开关，作业 ID 字面量 `octop_auto_backup`（`src/octop/infra/backup/auto.py:36`）。`/api/admin/tls/*` 触发 ACME HTTP-01，`/.well-known/acme-challenge/{token}` 由 `src/octop/api/app.py:137` 直接注册，读取进程内 `challenge_store`。`/api/update/*` 调用 `src/octop/infra/setup/self_update.py:195` 的 pip/git 子进程。`/api/settings/timezone` 返回服务端时区（`src/octop/api/routers/settings.py:25`），dashboard 必须以它格式化时间。

## 2. 全量接口路由总表（Master Inbound Inventory）

| 方法 | 完整路径 | Handler 符号 | 源码锚点（仓库根相对） | 鉴权 | 执行模式 |
|---|---|---|---|---|---|
| `GET` | `/api/admin/backup/auto` | `get_auto_backup_settings` | `src/octop/api/routers/backup.py:234` | JWT | 同步 JSON |
| `PUT` | `/api/admin/backup/auto` | `put_auto_backup_settings` | `src/octop/api/routers/backup.py:243` | JWT | 同步 JSON |
| `POST` | `/api/admin/backup/auto/run` | `run_auto_backup_now` | `src/octop/api/routers/backup.py:255` | JWT | 同步 JSON |
| `POST` | `/api/admin/backup/create` | `create_backup` | `src/octop/api/routers/backup.py:271` | JWT | 同步 JSON |
| `GET` | `/api/admin/backup/export` | `export_backup` | `src/octop/api/routers/backup.py:369` | JWT | 同步 JSON |
| `DELETE` | `/api/admin/backup/files/{filename}` | `remove_backup_file` | `src/octop/api/routers/backup.py:358` | JWT | 同步 JSON |
| `GET` | `/api/admin/backup/files/{filename}` | `download_backup_file` | `src/octop/api/routers/backup.py:293` | JWT | 同步 JSON |
| `POST` | `/api/admin/backup/files/{filename}/restore` | `restore_backup_file` | `src/octop/api/routers/backup.py:314` | JWT | 同步 JSON |
| `POST` | `/api/admin/backup/import` | `import_backup` | `src/octop/api/routers/backup.py:413` | JWT | 同步 JSON |
| `GET` | `/api/admin/backup/list` | `list_backups` | `src/octop/api/routers/backup.py:213` | JWT | 同步 JSON |
| `GET` | `/api/admin/backup/status` | `get_backup_status` | `src/octop/api/routers/backup.py:226` | JWT | 同步 JSON |
| `WEBSOCKET` | `/api/browser-stream/ws` | `browser_stream_ws` | `src/octop/api/routers/browser/stream.py:326` | JWT | WebSocket |
| `GET` | `/api/browser/env-status` | `env_status` | `src/octop/api/routers/browser/env.py:91` | JWT | 同步 JSON |
| `GET` | `/api/browser/harness-sessions` | `list_harness_sessions` | `src/octop/api/routers/browser/harness.py:292` | JWT | 同步 JSON |
| `POST` | `/api/browser/install` | `install` | `src/octop/api/routers/browser/env.py:120` | JWT | 同步 JSON |
| `POST` | `/api/browser/record-replay/replay` | `replay_recording` | `src/octop/api/routers/browser/record_replay.py:312` | JWT | 同步 JSON |
| `POST` | `/api/browser/record-replay/skill-content` | `get_skill_content` | `src/octop/api/routers/browser/record_replay.py:282` | JWT | 同步 JSON |
| `POST` | `/api/browser/record-replay/start` | `record_start` | `src/octop/api/routers/browser/record_replay.py:154` | JWT | 同步 JSON |
| `GET` | `/api/browser/record-replay/status` | `record_status` | `src/octop/api/routers/browser/record_replay.py:142` | JWT | 同步 JSON |
| `POST` | `/api/browser/record-replay/stop` | `record_stop` | `src/octop/api/routers/browser/record_replay.py:174` | JWT | 同步 JSON |
| `POST` | `/api/browser/record-replay/stop-and-generate-skill` | `record_stop_and_generate_skill` | `src/octop/api/routers/browser/record_replay.py:202` | JWT | 同步 JSON |
| `POST` | `/api/browser/sessions/{session_id}/handoff` | `handoff` | `src/octop/api/routers/browser/harness.py:298` | JWT | 同步 JSON |
| `POST` | `/api/browser/shutdown` | `shutdown_browser` | `src/octop/api/routers/browser/harness.py:342` | JWT | 同步 JSON |
| `POST` | `/api/browser/uninstall` | `uninstall_browser` | `src/octop/api/routers/browser/uninstall.py:18` | JWT | 同步 JSON |
| `WEBSOCKET` | `/api/desktop-stream/ws` | `desktop_stream_ws` | `src/octop/api/routers/desktop/stream.py:235` | JWT | WebSocket |
| `GET` | `/api/desktop/geometry` | `get_desktop_geometry` | `src/octop/api/routers/desktop/settings.py:43` | JWT | 同步 JSON |
| `POST` | `/api/desktop/geometry` | `set_desktop_geometry` | `src/octop/api/routers/desktop/settings.py:28` | JWT | 同步 JSON |
| `POST` | `/api/desktop/install` | `install_desktop` | `src/octop/api/routers/desktop/install.py:18` | JWT | 同步 JSON |
| `GET` | `/api/desktop/status` | `get_desktop_status` | `src/octop/api/routers/desktop/status.py:16` | JWT | 同步 JSON |
| `POST` | `/api/desktop/uninstall` | `uninstall_desktop` | `src/octop/api/routers/desktop/uninstall.py:18` | JWT | 同步 JSON |
| `WEBSOCKET` | `/api/mobile-stream/ws` | `mobile_stream_ws` | `src/octop/api/routers/mobile/stream.py:481` | JWT | WebSocket |
| `WEBSOCKET` | `/api/mobile/adb/shell/ws` | `adb_shell_ws` | `src/octop/api/routers/mobile/shell_ws.py:52` | JWT | WebSocket |
| `GET` | `/api/mobile/agent-control` | `get_agent_control` | `src/octop/api/routers/mobile/status.py:90` | JWT | 同步 JSON |
| `PUT` | `/api/mobile/agent-control` | `put_agent_control` | `src/octop/api/routers/mobile/status.py:97` | JWT | 同步 JSON |
| `GET` | `/api/mobile/devices/{device}/info` | `get_mobile_device_info` | `src/octop/api/routers/mobile/status.py:70` | JWT | 同步 JSON |
| `POST` | `/api/mobile/install` | `install_mobile` | `src/octop/api/routers/mobile/install.py:18` | JWT | 同步 JSON |
| `GET` | `/api/mobile/status` | `get_mobile_status` | `src/octop/api/routers/mobile/status.py:37` | JWT | 同步 JSON |
| `GET` | `/api/admin/observability/langfuse` | `get_langfuse_config` | `src/octop/api/routers/observability.py:51` | JWT | 同步 JSON |
| `PUT` | `/api/admin/observability/langfuse` | `put_langfuse_config` | `src/octop/api/routers/observability.py:59` | JWT | 同步 JSON |
| `POST` | `/api/admin/observability/langfuse/test` | `test_langfuse_connection` | `src/octop/api/routers/observability.py:74` | JWT | 同步 JSON |
| `GET` | `/api/settings/capabilities` | `get_capabilities` | `src/octop/api/routers/settings.py:65` | JWT | 同步 JSON |
| `GET` | `/api/settings/timezone` | `get_timezone_settings` | `src/octop/api/routers/settings.py:25` | JWT | 同步 JSON |
| `GET` | `/api/settings/upload` | `get_upload_settings` | `src/octop/api/routers/settings.py:38` | JWT | 同步 JSON |
| `POST` | `/api/admin/tls/issue` | `tls_issue` | `src/octop/api/routers/tls.py:80` | JWT | 同步 JSON |
| `POST` | `/api/admin/tls/preflight` | `tls_preflight` | `src/octop/api/routers/tls.py:66` | JWT | 同步 JSON |
| `GET` | `/api/admin/tls/status` | `tls_status` | `src/octop/api/routers/tls.py:55` | JWT | 同步 JSON |
| `POST` | `/api/update/check` | `check_for_updates` | `src/octop/api/routers/update.py:82` | JWT | 同步 JSON |
| `GET` | `/api/update/progress` | `upgrade_progress` | `src/octop/api/routers/update.py:133` | JWT | 同步 JSON |
| `POST` | `/api/update/restart` | `restart_service_endpoint` | `src/octop/api/routers/update.py:173` | JWT | 同步 JSON |
| `GET` | `/api/update/status` | `update_status` | `src/octop/api/routers/update.py:73` | JWT | 同步 JSON |
| `POST` | `/api/update/upgrade` | `trigger_upgrade` | `src/octop/api/routers/update.py:121` | JWT | 同步 JSON |

## 3. 关键端点入参与出参契约

| 端点（`方法 路径`） | 关键入参字段 / 位置 | 出参结构 | 精确源码锚点 |
|---|---|---|---|
| `GET /api/admin/backup/auto` | 路径/查询/体字段见路由表 Handler 定义 | 由 `get_auto_backup_settings` 组装的 Pydantic 响应 | `src/octop/api/routers/backup.py:234` |
| `PUT /api/admin/backup/auto` | 路径/查询/体字段见路由表 Handler 定义 | 由 `put_auto_backup_settings` 组装的 Pydantic 响应 | `src/octop/api/routers/backup.py:243` |
| `POST /api/admin/backup/auto/run` | 路径/查询/体字段见路由表 Handler 定义 | 由 `run_auto_backup_now` 组装的 Pydantic 响应 | `src/octop/api/routers/backup.py:255` |

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
