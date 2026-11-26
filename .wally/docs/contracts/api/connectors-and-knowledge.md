---
kind: api-contract
scope: connectors-and-knowledge
status: draft
origin: generated
source_paths: [src/octop/api/app.py, src/octop/api/routers/connectors.py, src/octop/api/routers/internal_mcp.py, src/octop/api/routers/knowledge_bases.py]
symbols: [activate_onnx_service, auth_authorize_url, auth_exchange_code, auth_info, capability, connector_cli_status, connector_install_cli, create_base, create_folder, create_instance, create_text_document, default_open_bases]
upstream: [../api-reference.md, ../../INDEX.md]
downstream: [../error-codes.md, ../../architecture/api-service.md]
---

# 入向接口契约：连接器与知识库（`connectors-and-knowledge`）

> 本页覆盖 `connectors-and-knowledge` 分组全部 **55** 条入向接口，路径为 `app.include_router` 挂载后的完整路径；公共协议、鉴权与包络见 [`api-reference.md`](../api-reference.md)，错误码字典见 [`error-codes.md`](../error-codes.md)。

## 1. 分组范围与实现要点

本组是入向接口最密集区域：`connectors` 27 条、`knowledge_bases` 25 条、`internal_mcp` 3 条。连接器实例 CRUD 走 `/api/connector-instances*`（`src/octop/api/routers/connectors.py:503`、`:662`），`probe` 端点组装 MCP `initialize`/`tools/list` JSON-RPC 信封（`src/octop/infra/connectors/probe.py:422`、`:457`）。`/api/internal/mcp/{kind}/{instance_id}` 为 harness 内部回调入口，属 JWT 白名单前缀（`src/octop/api/deps.py:66`）。知识库受 `MAX_DOCS_PER_KB=100`、`MAX_BASES_PER_OWNER=20`（`src/octop/infra/knowledge/service.py:29-30`）约束，超限分别抛 `KNOWLEDGE_DOC_LIMIT(409)` / `KNOWLEDGE_BASE_LIMIT(409)`（`src/octop/infra/errors.py:186`、`:188`）。

## 2. 全量接口路由总表（Master Inbound Inventory）

| 方法 | 完整路径 | Handler 符号 | 源码锚点（仓库根相对） | 鉴权 | 执行模式 |
|---|---|---|---|---|---|
| `GET` | `/api/connector-instances` | `list_instances` | `src/octop/api/routers/connectors.py:503` | JWT | 同步 JSON |
| `POST` | `/api/connector-instances` | `create_instance` | `src/octop/api/routers/connectors.py:662` | JWT | 同步 JSON |
| `DELETE` | `/api/connector-instances/{instance_id}` | `delete_instance` | `src/octop/api/routers/connectors.py:858` | JWT | 同步 JSON |
| `GET` | `/api/connector-instances/{instance_id}` | `get_instance` | `src/octop/api/routers/connectors.py:627` | JWT | 同步 JSON |
| `PATCH` | `/api/connector-instances/{instance_id}` | `patch_instance` | `src/octop/api/routers/connectors.py:731` | JWT | 同步 JSON |
| `POST` | `/api/connector-instances/{instance_id}/feishu-user-auth/complete` | `feishu_cli_user_auth_complete_instance` | `src/octop/api/routers/connectors.py:1114` | JWT | 同步 JSON |
| `POST` | `/api/connector-instances/{instance_id}/feishu-user-auth/start` | `feishu_cli_user_auth_start_instance` | `src/octop/api/routers/connectors.py:1093` | JWT | 同步 JSON |
| `POST` | `/api/connector-instances/{instance_id}/refresh` | `refresh_instance` | `src/octop/api/routers/connectors.py:1142` | JWT | 同步 JSON |
| `POST` | `/api/connector-instances/{instance_id}/test` | `test_instance` | `src/octop/api/routers/connectors.py:911` | JWT | 同步 JSON |
| `GET` | `/api/connectors/auth/{kind}/authorize-url` | `auth_authorize_url` | `src/octop/api/routers/connectors.py:1173` | JWT | 同步 JSON |
| `POST` | `/api/connectors/auth/{kind}/exchange-code` | `auth_exchange_code` | `src/octop/api/routers/connectors.py:1187` | JWT | 同步 JSON |
| `GET` | `/api/connectors/auth/{kind}/info` | `auth_info` | `src/octop/api/routers/connectors.py:1160` | JWT | 同步 JSON |
| `GET` | `/api/connectors/catalog` | `get_catalog` | `src/octop/api/routers/connectors.py:480` | JWT | 同步 JSON |
| `GET` | `/api/connectors/custom-mcp` | `get_custom_mcp` | `src/octop/api/routers/connectors.py:521` | JWT | 同步 JSON |
| `PUT` | `/api/connectors/custom-mcp` | `put_custom_mcp` | `src/octop/api/routers/connectors.py:531` | JWT | 同步 JSON |
| `PATCH` | `/api/connectors/custom-mcp/servers/{server_name}` | `patch_custom_mcp_server` | `src/octop/api/routers/connectors.py:561` | JWT | 同步 JSON |
| `POST` | `/api/connectors/custom-mcp/test` | `test_custom_mcp` | `src/octop/api/routers/connectors.py:591` | JWT | 同步 JSON |
| `POST` | `/api/connectors/feishu-cli/user-auth/complete` | `feishu_cli_user_auth_complete` | `src/octop/api/routers/connectors.py:1061` | JWT | 同步 JSON |
| `POST` | `/api/connectors/feishu-cli/user-auth/start` | `feishu_cli_user_auth_start` | `src/octop/api/routers/connectors.py:1034` | JWT | 同步 JSON |
| `GET` | `/api/connectors/oauth/callback` | `oauth_callback` | `src/octop/api/routers/connectors.py:1255` | 免鉴权 | 同步 JSON |
| `GET` | `/api/connectors/oauth/pending/{state_id}` | `oauth_pending` | `src/octop/api/routers/connectors.py:1367` | JWT | 同步 JSON |
| `POST` | `/api/connectors/oauth/start` | `oauth_start_unified` | `src/octop/api/routers/connectors.py:1218` | JWT | 同步 JSON |
| `POST` | `/api/connectors/oauth/{kind}/start` | `oauth_start_legacy` | `src/octop/api/routers/connectors.py:1237` | JWT | 同步 JSON |
| `POST` | `/api/connectors/test-credentials` | `test_credentials` | `src/octop/api/routers/connectors.py:955` | JWT | 同步 JSON |
| `GET` | `/api/connectors/weknora/detect-local` | `detect_weknora_on_octop_host` | `src/octop/api/routers/connectors.py:494` | JWT | 同步 JSON |
| `GET` | `/api/connectors/{kind}/cli-status` | `connector_cli_status` | `src/octop/api/routers/connectors.py:992` | JWT | 同步 JSON |
| `POST` | `/api/connectors/{kind}/install-cli` | `connector_install_cli` | `src/octop/api/routers/connectors.py:1013` | JWT | 同步 JSON |
| `DELETE` | `/api/internal/mcp/{kind}/{instance_id}` | `internal_mcp_delete` | `src/octop/api/routers/internal_mcp.py:133` | 免鉴权 | 同步 JSON |
| `GET` | `/api/internal/mcp/{kind}/{instance_id}` | `internal_mcp_get` | `src/octop/api/routers/internal_mcp.py:96` | 免鉴权 | 同步 JSON |
| `POST` | `/api/internal/mcp/{kind}/{instance_id}` | `internal_mcp_post` | `src/octop/api/routers/internal_mcp.py:50` | 免鉴权 | 同步 JSON |
| `GET` | `/api/knowledge-bases` | `list_bases` | `src/octop/api/routers/knowledge_bases.py:492` | JWT | 同步 JSON |
| `POST` | `/api/knowledge-bases` | `create_base` | `src/octop/api/routers/knowledge_bases.py:505` | JWT | 同步 JSON |
| `GET` | `/api/knowledge-bases/capability` | `capability` | `src/octop/api/routers/knowledge_bases.py:284` | JWT | 同步 JSON |
| `GET` | `/api/knowledge-bases/default-open` | `default_open_bases` | `src/octop/api/routers/knowledge_bases.py:529` | JWT | 同步 JSON |
| `GET` | `/api/knowledge-bases/embedding-options` | `embedding_options` | `src/octop/api/routers/knowledge_bases.py:292` | JWT | 同步 JSON |
| `PUT` | `/api/knowledge-bases/feature` | `put_feature` | `src/octop/api/routers/knowledge_bases.py:359` | JWT | 同步 JSON |
| `GET` | `/api/knowledge-bases/ocr-options` | `ocr_options` | `src/octop/api/routers/knowledge_bases.py:328` | JWT | 同步 JSON |
| `POST` | `/api/knowledge-bases/onnx-activate` | `activate_onnx_service` | `src/octop/api/routers/knowledge_bases.py:461` | JWT | 同步 JSON |
| `POST` | `/api/knowledge-bases/onnx-download` | `start_onnx_download` | `src/octop/api/routers/knowledge_bases.py:441` | JWT | 同步 JSON |
| `GET` | `/api/knowledge-bases/onnx-download-status` | `onnx_download_status` | `src/octop/api/routers/knowledge_bases.py:454` | JWT | 同步 JSON |
| `POST` | `/api/knowledge-bases/onnx-test` | `test_onnx_model` | `src/octop/api/routers/knowledge_bases.py:479` | JWT | 同步 JSON |
| `DELETE` | `/api/knowledge-bases/{kb_id}` | `delete_base` | `src/octop/api/routers/knowledge_bases.py:595` | JWT | 同步 JSON |
| `GET` | `/api/knowledge-bases/{kb_id}` | `get_base` | `src/octop/api/routers/knowledge_bases.py:546` | JWT | 同步 JSON |
| `PATCH` | `/api/knowledge-bases/{kb_id}` | `update_base` | `src/octop/api/routers/knowledge_bases.py:566` | JWT | 同步 JSON |
| `GET` | `/api/knowledge-bases/{kb_id}/documents` | `list_documents` | `src/octop/api/routers/knowledge_bases.py:614` | JWT | 同步 JSON |
| `POST` | `/api/knowledge-bases/{kb_id}/documents` | `upload_document` | `src/octop/api/routers/knowledge_bases.py:692` | JWT | 同步 JSON |
| `POST` | `/api/knowledge-bases/{kb_id}/documents/text` | `create_text_document` | `src/octop/api/routers/knowledge_bases.py:661` | JWT | 同步 JSON |
| `DELETE` | `/api/knowledge-bases/{kb_id}/documents/{doc_id}` | `delete_document` | `src/octop/api/routers/knowledge_bases.py:828` | JWT | 同步 JSON |
| `GET` | `/api/knowledge-bases/{kb_id}/documents/{doc_id}/content` | `get_text_document` | `src/octop/api/routers/knowledge_bases.py:751` | JWT | 同步 JSON |
| `PUT` | `/api/knowledge-bases/{kb_id}/documents/{doc_id}/content` | `update_text_document` | `src/octop/api/routers/knowledge_bases.py:772` | JWT | 同步 JSON |
| `GET` | `/api/knowledge-bases/{kb_id}/documents/{doc_id}/preview` | `preview_document` | `src/octop/api/routers/knowledge_bases.py:730` | JWT | 同步 JSON |
| `POST` | `/api/knowledge-bases/{kb_id}/documents/{doc_id}/reindex` | `reindex_document` | `src/octop/api/routers/knowledge_bases.py:850` | JWT | 同步 JSON |
| `POST` | `/api/knowledge-bases/{kb_id}/documents/{doc_id}/rename` | `rename_document` | `src/octop/api/routers/knowledge_bases.py:801` | JWT | 同步 JSON |
| `POST` | `/api/knowledge-bases/{kb_id}/folders` | `create_folder` | `src/octop/api/routers/knowledge_bases.py:638` | JWT | 同步 JSON |
| `POST` | `/api/knowledge-bases/{kb_id}/reindex` | `reindex_base` | `src/octop/api/routers/knowledge_bases.py:875` | JWT | 同步 JSON |

## 3. 关键端点入参与出参契约

| 端点（`方法 路径`） | 关键入参字段 / 位置 | 出参结构 | 精确源码锚点 |
|---|---|---|---|
| `GET /api/connector-instances` | 路径/查询/体字段见路由表 Handler 定义 | 由 `list_instances` 组装的 Pydantic 响应 | `src/octop/api/routers/connectors.py:503` |
| `POST /api/connector-instances` | 路径/查询/体字段见路由表 Handler 定义 | 由 `create_instance` 组装的 Pydantic 响应 | `src/octop/api/routers/connectors.py:662` |
| `DELETE /api/connector-instances/{instance_id}` | 路径/查询/体字段见路由表 Handler 定义 | 由 `delete_instance` 组装的 Pydantic 响应 | `src/octop/api/routers/connectors.py:858` |

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
