---
kind: api-contract
scope: workspace-and-filesystem
status: draft
origin: generated
source_paths: [src/octop/api/app.py, src/octop/api/routers/envs.py, src/octop/api/routers/filesystem.py, src/octop/api/routers/storage_backends.py, src/octop/api/routers/workspace.py]
symbols: [batch_save_envs, create_storage_backend, delete_env, delete_storage_backend, delete_workspace_file, download_file, ensure_bwrap, export_workspace_archive, filesystem_defaults, get_docker_status, glob_files, grep_files]
upstream: [../api-reference.md, ../../INDEX.md]
downstream: [../error-codes.md, ../../architecture/api-service.md]
---

# 入向接口契约：工作区文件与存储后端（`workspace-and-filesystem`）

> 本页覆盖 `workspace-and-filesystem` 分组全部 **34** 条入向接口，路径为 `app.include_router` 挂载后的完整路径；公共协议、鉴权与包络见 [`api-reference.md`](../api-reference.md)，错误码字典见 [`error-codes.md`](../error-codes.md)。

## 1. 分组范围与实现要点

工作区内容读写严禁直接使用 `Path.write_text`，必须经 `HarnessAgent.workspace`（`AGENTS.md:207`）；HTTP 侧由 `workspace_api_path()` 规范化 dashboard 传来的前置 `/`（`src/octop/api/routers/workspace.py:119`）。`/api/filesystem/defaults` 与 `docker-status` 暴露宿主目录策略，POSIX 拒绝前缀判定在 `src/octop/infra/utils/host_dirs.py`。`storage_backends` 分 `admin_router` 与 `user_router` 两个 `APIRouter`（`src/octop/api/routers/storage_backends.py:14`、`:230`），分别挂 `/api/admin/storage-backends` 与 `/api/storage-backends`（`src/octop/api/app.py:240`、`:242`）。

## 2. 全量接口路由总表（Master Inbound Inventory）

| 方法 | 完整路径 | Handler 符号 | 源码锚点（仓库根相对） | 鉴权 | 执行模式 |
|---|---|---|---|---|---|
| `GET` | `/api/envs` | `list_envs` | `src/octop/api/routers/envs.py:53` | JWT | 同步 JSON |
| `PUT` | `/api/envs` | `batch_save_envs` | `src/octop/api/routers/envs.py:62` | JWT | 同步 JSON |
| `DELETE` | `/api/envs/{key}` | `delete_env` | `src/octop/api/routers/envs.py:94` | JWT | 同步 JSON |
| `GET` | `/api/filesystem/defaults` | `filesystem_defaults` | `src/octop/api/routers/filesystem.py:61` | JWT | 同步 JSON |
| `GET` | `/api/filesystem/dirs` | `list_host_dirs` | `src/octop/api/routers/filesystem.py:78` | JWT | 同步 JSON |
| `GET` | `/api/filesystem/docker-status` | `get_docker_status` | `src/octop/api/routers/filesystem.py:121` | JWT | 同步 JSON |
| `POST` | `/api/filesystem/ensure-bwrap` | `ensure_bwrap` | `src/octop/api/routers/filesystem.py:105` | JWT | 同步 JSON |
| `POST` | `/api/filesystem/ensure-docker` | `post_ensure_docker` | `src/octop/api/routers/filesystem.py:135` | JWT | 同步 JSON |
| `POST` | `/api/filesystem/mkdir` | `mkdir_host_dir` | `src/octop/api/routers/filesystem.py:150` | JWT | 同步 JSON |
| `POST` | `/api/filesystem/probe` | `probe_host_dir` | `src/octop/api/routers/filesystem.py:92` | JWT | 同步 JSON |
| `POST` | `/api/filesystem/rename` | `rename_host_directory` | `src/octop/api/routers/filesystem.py:167` | JWT | 同步 JSON |
| `GET` | `/api/admin/storage-backends` | `list_storage_backends` | `src/octop/api/routers/storage_backends.py:90` | JWT | 同步 JSON |
| `POST` | `/api/admin/storage-backends` | `create_storage_backend` | `src/octop/api/routers/storage_backends.py:98` | JWT | 同步 JSON |
| `POST` | `/api/admin/storage-backends/probe` | `probe_storage_backend_config` | `src/octop/api/routers/storage_backends.py:169` | JWT | 同步 JSON |
| `DELETE` | `/api/admin/storage-backends/{backend_id}` | `delete_storage_backend` | `src/octop/api/routers/storage_backends.py:149` | JWT | 同步 JSON |
| `PATCH` | `/api/admin/storage-backends/{backend_id}` | `patch_storage_backend` | `src/octop/api/routers/storage_backends.py:121` | JWT | 同步 JSON |
| `POST` | `/api/admin/storage-backends/{backend_id}/test` | `test_storage_backend` | `src/octop/api/routers/storage_backends.py:215` | JWT | 同步 JSON |
| `GET` | `/api/admin/storage-backends/{backend_id}/tree` | `list_storage_backend_tree` | `src/octop/api/routers/storage_backends.py:196` | JWT | 同步 JSON |
| `GET` | `/api/storage-backends` | `list_storage_backends_for_user` | `src/octop/api/routers/storage_backends.py:233` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/media/preview` | `preview_media` | `src/octop/api/routers/workspace.py:425` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/workspace/archive` | `export_workspace_archive` | `src/octop/api/routers/workspace.py:516` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/workspace/archive` | `import_workspace_archive` | `src/octop/api/routers/workspace.py:540` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/workspace/doc` | `read_doc` | `src/octop/api/routers/workspace.py:367` | JWT | 同步 JSON |
| `PUT` | `/api/agents/{agent_id}/workspace/doc` | `write_doc` | `src/octop/api/routers/workspace.py:393` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/workspace/download` | `download_file` | `src/octop/api/routers/workspace.py:328` | JWT | 同步 JSON |
| `DELETE` | `/api/agents/{agent_id}/workspace/file` | `delete_workspace_file` | `src/octop/api/routers/workspace.py:242` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/workspace/file` | `read_file` | `src/octop/api/routers/workspace.py:154` | JWT | 同步 JSON |
| `PUT` | `/api/agents/{agent_id}/workspace/file` | `write_file` | `src/octop/api/routers/workspace.py:171` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/workspace/glob` | `glob_files` | `src/octop/api/routers/workspace.py:458` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/workspace/grep` | `grep_files` | `src/octop/api/routers/workspace.py:493` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/workspace/mkdir` | `mkdir_workspace_dir` | `src/octop/api/routers/workspace.py:212` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/workspace/move` | `move_workspace_file` | `src/octop/api/routers/workspace.py:271` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/workspace/tree` | `list_tree` | `src/octop/api/routers/workspace.py:119` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/workspace/upload` | `upload_file` | `src/octop/api/routers/workspace.py:302` | JWT | 同步 JSON |

## 3. 关键端点入参与出参契约

| 端点（`方法 路径`） | 关键入参字段 / 位置 | 出参结构 | 精确源码锚点 |
|---|---|---|---|
| `GET /api/envs` | 路径/查询/体字段见路由表 Handler 定义 | 由 `list_envs` 组装的 Pydantic 响应 | `src/octop/api/routers/envs.py:53` |
| `PUT /api/envs` | 路径/查询/体字段见路由表 Handler 定义 | 由 `batch_save_envs` 组装的 Pydantic 响应 | `src/octop/api/routers/envs.py:62` |
| `DELETE /api/envs/{key}` | 路径/查询/体字段见路由表 Handler 定义 | 由 `delete_env` 组装的 Pydantic 响应 | `src/octop/api/routers/envs.py:94` |

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
