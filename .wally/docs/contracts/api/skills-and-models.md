---
kind: api-contract
scope: skills-and-models
status: draft
origin: generated
source_paths: [src/octop/api/app.py, src/octop/api/routers/media_generation.py, src/octop/api/routers/ollama_models.py, src/octop/api/routers/onnx_models.py, src/octop/api/routers/providers.py, src/octop/api/routers/search.py, src/octop/api/routers/skill_packages.py, src/octop/api/routers/skills.py, src/octop/api/routers/voice.py]
symbols: [admin_create_provider, admin_create_voice_provider, admin_delete_provider, admin_delete_voice_provider, admin_fetch_provider_models, admin_list_providers, admin_list_voice_providers, admin_patch_provider, admin_patch_voice_provider, admin_test_provider, admin_test_provider_draft, admin_test_voice_configuration]
upstream: [../api-reference.md, ../../INDEX.md]
downstream: [../error-codes.md, ../../architecture/api-service.md]
---

# 入向接口契约：技能、模型提供方与语音（`skills-and-models`）

> 本页覆盖 `skills-and-models` 分组全部 **74** 条入向接口，路径为 `app.include_router` 挂载后的完整路径；公共协议、鉴权与包络见 [`api-reference.md`](../api-reference.md)，错误码字典见 [`error-codes.md`](../error-codes.md)。

## 1. 分组范围与实现要点

`/api/providers/{provider_id}/test` 触发 `probe_provider_row`（`src/octop/api/routers/providers.py:311`），组 `POST {base}/embeddings` 字典 `{"model":…, "input": ["ping"]}` 并解包 `data[0]["embedding"]`（`src/octop/infra/agents/providers/probe.py:174`、`:197`）；`GET {base}/models` 解包 `data[].id`（`src/octop/infra/connectors/probe.py:262`、`:289`）。技能包与 SkillHub 导入受 `ErrorCode.SKILL_IMPORT_UNSUPPORTED_URL(400)` / `SKILL_IMPORT_FAILED(502)` 约束（`src/octop/infra/errors.py:166-167`）。语音侧 `POST /api/voice/*/test` 走 `src/octop/infra/voice/adapters.py:68` 的 OpenAI STT 或 `:133` 的 TC3 签名腾讯云 ASR。`Ollama`/`ONNX` 下载端点返回 `{"ok": bool, "latency_ms": float, "dim": int}`（`src/octop/infra/agents/providers/onnx_service.py:407`）。

## 2. 全量接口路由总表（Master Inbound Inventory）

| 方法 | 完整路径 | Handler 符号 | 源码锚点（仓库根相对） | 鉴权 | 执行模式 |
|---|---|---|---|---|---|
| `GET` | `/api/admin/media-generation` | `get_media_generation_settings` | `src/octop/api/routers/media_generation.py:74` | JWT | 同步 JSON |
| `PUT` | `/api/admin/media-generation` | `put_media_generation_settings` | `src/octop/api/routers/media_generation.py:87` | JWT | 同步 JSON |
| `POST` | `/api/admin/media-generation/test` | `test_media_generation_credentials` | `src/octop/api/routers/media_generation.py:118` | JWT | 同步 JSON |
| `GET` | `/api/ollama-models` | `list_ollama_models` | `src/octop/api/routers/ollama_models.py:73` | JWT | 同步 JSON |
| `POST` | `/api/ollama-models/download` | `download_ollama_model` | `src/octop/api/routers/ollama_models.py:117` | JWT | 同步 JSON |
| `GET` | `/api/ollama-models/download-status` | `get_ollama_download_status` | `src/octop/api/routers/ollama_models.py:179` | JWT | 同步 JSON |
| `DELETE` | `/api/ollama-models/download/{task_id}` | `cancel_ollama_download` | `src/octop/api/routers/ollama_models.py:192` | JWT | 同步 JSON |
| `GET` | `/api/ollama-models/service` | `get_ollama_service` | `src/octop/api/routers/ollama_models.py:255` | JWT | 同步 JSON |
| `PUT` | `/api/ollama-models/service` | `put_ollama_service` | `src/octop/api/routers/ollama_models.py:275` | JWT | 同步 JSON |
| `DELETE` | `/api/ollama-models/{name:path}` | `delete_ollama_model` | `src/octop/api/routers/ollama_models.py:210` | JWT | 同步 JSON |
| `GET` | `/api/onnx-models/catalog` | `get_catalog` | `src/octop/api/routers/onnx_models.py:82` | JWT | 同步 JSON |
| `PUT` | `/api/onnx-models/config` | `put_config` | `src/octop/api/routers/onnx_models.py:121` | JWT | 同步 JSON |
| `POST` | `/api/onnx-models/download` | `post_download` | `src/octop/api/routers/onnx_models.py:183` | JWT | 同步 JSON |
| `GET` | `/api/onnx-models/download-status` | `get_download_status` | `src/octop/api/routers/onnx_models.py:197` | JWT | 同步 JSON |
| `DELETE` | `/api/onnx-models/local/{model_name:path}` | `delete_local_model` | `src/octop/api/routers/onnx_models.py:204` | JWT | 同步 JSON |
| `GET` | `/api/onnx-models/models/{model_name:path}/meta` | `get_model_meta` | `src/octop/api/routers/onnx_models.py:97` | JWT | 同步 JSON |
| `GET` | `/api/onnx-models/status` | `get_status` | `src/octop/api/routers/onnx_models.py:113` | JWT | 同步 JSON |
| `POST` | `/api/onnx-models/test` | `post_test` | `src/octop/api/routers/onnx_models.py:164` | JWT | 同步 JSON |
| `GET` | `/api/admin/providers` | `admin_list_providers` | `src/octop/api/routers/providers.py:201` | JWT | 同步 JSON |
| `POST` | `/api/admin/providers` | `admin_create_provider` | `src/octop/api/routers/providers.py:209` | JWT | 同步 JSON |
| `DELETE` | `/api/admin/providers/codex-oauth` | `codex_oauth_logout` | `src/octop/api/routers/providers.py:448` | JWT | 同步 JSON |
| `GET` | `/api/admin/providers/codex-oauth/pending/{state_id}` | `codex_oauth_pending` | `src/octop/api/routers/providers.py:429` | JWT | 同步 JSON |
| `POST` | `/api/admin/providers/codex-oauth/start` | `codex_oauth_start` | `src/octop/api/routers/providers.py:401` | JWT | 同步 JSON |
| `POST` | `/api/admin/providers/fetch-models` | `admin_fetch_provider_models` | `src/octop/api/routers/providers.py:328` | JWT | 同步 JSON |
| `POST` | `/api/admin/providers/test-draft` | `admin_test_provider_draft` | `src/octop/api/routers/providers.py:298` | JWT | 同步 JSON |
| `DELETE` | `/api/admin/providers/{provider_id}` | `admin_delete_provider` | `src/octop/api/routers/providers.py:267` | JWT | 同步 JSON |
| `PATCH` | `/api/admin/providers/{provider_id}` | `admin_patch_provider` | `src/octop/api/routers/providers.py:232` | JWT | 同步 JSON |
| `POST` | `/api/admin/providers/{provider_id}/test` | `admin_test_provider` | `src/octop/api/routers/providers.py:465` | JWT | 同步 JSON |
| `GET` | `/api/providers` | `list_providers` | `src/octop/api/routers/providers.py:187` | JWT | 同步 JSON |
| `GET` | `/api/providers/active-model` | `get_active_model` | `src/octop/api/routers/providers.py:164` | JWT | 同步 JSON |
| `PUT` | `/api/providers/active-model` | `set_active_model` | `src/octop/api/routers/providers.py:174` | JWT | 同步 JSON |
| `GET` | `/api/providers/presets` | `list_provider_presets` | `src/octop/api/routers/providers.py:139` | JWT | 同步 JSON |
| `GET` | `/api/providers/resolved` | `list_resolved_models` | `src/octop/api/routers/providers.py:147` | JWT | 同步 JSON |
| `POST` | `/api/search/{provider_id}/test` | `test_search_provider` | `src/octop/api/routers/search.py:36` | JWT | 同步 JSON |
| `GET` | `/api/skill-packages` | `list_skill_packages` | `src/octop/api/routers/skill_packages.py:252` | JWT | 同步 JSON |
| `POST` | `/api/skill-packages` | `create_skill_package` | `src/octop/api/routers/skill_packages.py:308` | JWT | 同步 JSON |
| `POST` | `/api/skill-packages/from-skillhub` | `create_from_skillhub` | `src/octop/api/routers/skill_packages.py:331` | JWT | 同步 JSON |
| `GET` | `/api/skill-packages/hub/rankings` | `package_hub_rankings` | `src/octop/api/routers/skill_packages.py:285` | JWT | 同步 JSON |
| `GET` | `/api/skill-packages/hub/search` | `package_hub_search` | `src/octop/api/routers/skill_packages.py:264` | JWT | 同步 JSON |
| `DELETE` | `/api/skill-packages/{package_id}` | `delete_skill_package` | `src/octop/api/routers/skill_packages.py:411` | JWT | 同步 JSON |
| `GET` | `/api/skill-packages/{package_id}` | `get_skill_package` | `src/octop/api/routers/skill_packages.py:358` | JWT | 同步 JSON |
| `PATCH` | `/api/skill-packages/{package_id}` | `update_skill_package` | `src/octop/api/routers/skill_packages.py:375` | JWT | 同步 JSON |
| `GET` | `/api/skill-packages/{package_id}/skills` | `list_package_skills` | `src/octop/api/routers/skill_packages.py:428` | JWT | 同步 JSON |
| `POST` | `/api/skill-packages/{package_id}/skills` | `create_package_skill` | `src/octop/api/routers/skill_packages.py:464` | JWT | 同步 JSON |
| `POST` | `/api/skill-packages/{package_id}/skills/hub/install` | `hub_install_package_skill` | `src/octop/api/routers/skill_packages.py:650` | JWT | 同步 JSON |
| `POST` | `/api/skill-packages/{package_id}/skills/import` | `import_package_skill` | `src/octop/api/routers/skill_packages.py:570` | JWT | 同步 JSON |
| `DELETE` | `/api/skill-packages/{package_id}/skills/{slug}` | `delete_package_skill` | `src/octop/api/routers/skill_packages.py:515` | JWT | 同步 JSON |
| `GET` | `/api/skill-packages/{package_id}/skills/{slug}` | `get_package_skill` | `src/octop/api/routers/skill_packages.py:443` | JWT | 同步 JSON |
| `PUT` | `/api/skill-packages/{package_id}/skills/{slug}` | `update_package_skill` | `src/octop/api/routers/skill_packages.py:492` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/skill-packages` | `list_skill_package_mounts` | `src/octop/api/routers/skills.py:468` | JWT | 同步 JSON |
| `PUT` | `/api/agents/{agent_id}/skill-packages` | `replace_skill_package_mounts` | `src/octop/api/routers/skills.py:504` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/skills` | `list_skills` | `src/octop/api/routers/skills.py:445` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/skills` | `create_skill` | `src/octop/api/routers/skills.py:618` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/skills/hub/install` | `hub_install_skill` | `src/octop/api/routers/skills.py:1171` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/skills/hub/rankings` | `hub_rankings` | `src/octop/api/routers/skills.py:1135` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/skills/hub/search` | `hub_search_skills` | `src/octop/api/routers/skills.py:1077` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/skills/import` | `import_skill_from_url` | `src/octop/api/routers/skills.py:758` | JWT | 同步 JSON |
| `DELETE` | `/api/agents/{agent_id}/skills/{name}` | `delete_skill` | `src/octop/api/routers/skills.py:848` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/skills/{name}` | `get_skill` | `src/octop/api/routers/skills.py:522` | JWT | 同步 JSON |
| `PUT` | `/api/agents/{agent_id}/skills/{name}` | `update_skill` | `src/octop/api/routers/skills.py:663` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/skills/{name}/disable` | `disable_skill` | `src/octop/api/routers/skills.py:928` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/skills/{name}/enable` | `enable_skill` | `src/octop/api/routers/skills.py:912` | JWT | 同步 JSON |
| `GET` | `/api/admin/voice/providers` | `admin_list_voice_providers` | `src/octop/api/routers/voice.py:154` | JWT | 同步 JSON |
| `POST` | `/api/admin/voice/providers` | `admin_create_voice_provider` | `src/octop/api/routers/voice.py:162` | JWT | 同步 JSON |
| `POST` | `/api/admin/voice/providers/test-configuration` | `admin_test_voice_configuration` | `src/octop/api/routers/voice.py:242` | JWT | 同步 JSON |
| `DELETE` | `/api/admin/voice/providers/{provider_id}` | `admin_delete_voice_provider` | `src/octop/api/routers/voice.py:213` | JWT | 同步 JSON |
| `PATCH` | `/api/admin/voice/providers/{provider_id}` | `admin_patch_voice_provider` | `src/octop/api/routers/voice.py:187` | JWT | 同步 JSON |
| `POST` | `/api/admin/voice/providers/{provider_id}/test` | `admin_test_voice_provider` | `src/octop/api/routers/voice.py:232` | JWT | 同步 JSON |
| `GET` | `/api/voice/active` | `get_active_voice` | `src/octop/api/routers/voice.py:95` | JWT | 同步 JSON |
| `PUT` | `/api/voice/active` | `set_active_voice` | `src/octop/api/routers/voice.py:103` | JWT | 同步 JSON |
| `GET` | `/api/voice/presets` | `list_voice_presets` | `src/octop/api/routers/voice.py:82` | JWT | 同步 JSON |
| `GET` | `/api/voice/providers` | `list_voice_providers` | `src/octop/api/routers/voice.py:87` | JWT | 同步 JSON |
| `POST` | `/api/voice/stt` | `transcribe_audio` | `src/octop/api/routers/voice.py:112` | JWT | 同步 JSON |
| `POST` | `/api/voice/tts` | `synthesize_speech` | `src/octop/api/routers/voice.py:133` | JWT | 同步 JSON |

## 3. 关键端点入参与出参契约

| 端点（`方法 路径`） | 关键入参字段 / 位置 | 出参结构 | 精确源码锚点 |
|---|---|---|---|
| `GET /api/admin/media-generation` | 路径/查询/体字段见路由表 Handler 定义 | 由 `get_media_generation_settings` 组装的 Pydantic 响应 | `src/octop/api/routers/media_generation.py:74` |
| `PUT /api/admin/media-generation` | 路径/查询/体字段见路由表 Handler 定义 | 由 `put_media_generation_settings` 组装的 Pydantic 响应 | `src/octop/api/routers/media_generation.py:87` |
| `POST /api/admin/media-generation/test` | 路径/查询/体字段见路由表 Handler 定义 | 由 `test_media_generation_credentials` 组装的 Pydantic 响应 | `src/octop/api/routers/media_generation.py:118` |

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
