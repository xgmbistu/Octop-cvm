---
kind: error-dict
scope: error-codes
status: draft
origin: generated
source_paths: [src/octop/infra/errors.py, src/octop/api/app.py, src/octop/api/middleware/jwt_auth.py, src/octop/i18n/domains/errors.py, src/octop/infra/utils/bwrap.py, src/octop/infra/utils/docker_env.py]
symbols: [ErrorCode, OctopError, to_envelope, localized_message, _octop, _unhandled]
upstream: [contracts/api-reference.md, integrations/index.md]
downstream: [operations/runbook-and-observability.md]
---

# 错误码、异常传播与降级标识字典

`ErrorCode` 共 91 个 StrEnum（`src/octop/infra/errors.py:13-104`），默认英文消息存 `src/octop/i18n/en.json → errors.<CODE>`，中文在 `zh.json` 同键；HTTP 状态由 `_DEFAULT_STATUS`（`errors.py:107-199`）给出，`OctopError.to_envelope`（`:239`）产出标准包络。

## 1. 异常捕获与协议状态映射规则

| 边界位置（`路径:行号`） | 捕获的内部异常 | 对外状态码 / 错误结构 | 是否阻断写盘 / 重试 |
|---|---|---|---|
| `src/octop/api/app.py:78 _octop` | `OctopError` | `exc.status` + `{error:{code,message,details}}`，5xx 先用原始英文记日志再本地化（`:82-91`） | 阻断当前操作 |
| `src/octop/api/app.py:93 _unhandled` | 任意未捕获 `Exception` | 500 `INTERNAL_ERROR` | 阻断 |
| `src/octop/api/middleware/jwt_auth.py:52-62` | `OctopError`（鉴权） | 直接 `JSONResponse(exc.status, exc.to_envelope())`，绕过异常处理器 | 阻断访问 |
| `src/octop/infra/connectors/gateway/adapters/*.py` | HTTP 非 2xx / `ret/errcode≠0` | 中文 `ValueError`，如「API Key 无效」「接口错误[n]」 | 阻断该工具调用 |
| `src/octop/infra/knowledge/retrieve.py:22-132` | 任意检索异常 | 吞异常返回 `""` | **不阻断**，降级为空上下文 |
| `src/octop/infra/cron/job.py:100-110` | 任务执行异常 | `last_status=error` + 审计，不无限重试 | 阻断该轮 |

## 2. 对外接口与领域层错误全表

> 状态码取 `_DEFAULT_STATUS`（`errors.py:107-199`）；未显式指定 status 的 `OctopError` 自动套用（`:209-212`）。

| 段 | 错误码 @ 定义行号（含义 / 默认 HTTP 状态） |
|---|---|
| 认证 / DB（14-20） | `AUTH_FAILED`@14 认证失败/401；`TOKEN_EXPIRED`@15/401；`SETUP_REQUIRED`@16/409；`DATABASE_NOT_EMPTY`@17/409；`BACKUP_DRIVER_MISMATCH`@18 跨引擎恢复/400；`BACKUP_SCHEMA_INCOMPATIBLE`@19/400；`BACKUP_IN_PROGRESS`@20/409 |
| 权限 / 登录（21-32） | `FORBIDDEN`@21/403；`NOT_FOUND`@22/404；`USER_DISABLED`@23/403；`LOGIN_LOCKED`@24/429；`USERNAME_TAKEN`@25、`EMAIL_TAKEN`@26/409；`EMAIL_INVALID`@27、`PASSWORD_SAME_AS_OLD`@28、`PASSWORD_TOO_WEAK`@29/400；`SETUP_PASSWORD_WRONG`@30/401；`SETUP_RATE_LIMITED`@31/429；`SETUP_TOKEN_INVALID`@32/401 |
| Agent（33-39） | `AGENT_NOT_FOUND`@33/404；`AGENT_NOT_RUNNING`@34/409；`AGENT_FAILED`@35/500；`AGENT_BUSY`@36/409；`AGENT_NAME_TAKEN`@37/409；`AGENT_ID_INVALID`@38/400；`AGENT_ID_TAKEN`@39/409 |
| Provider / 存储 / 频道（40-49） | `PROVIDER_NAME_TAKEN`@40/409；`PROVIDER_NOT_VISIBLE`@41/400；`PROVIDER_REFERENCED`@42/409；`PROVIDER_LOCAL_PROTECTED`@43/409；`STORAGE_BACKEND_NAME_TAKEN`@44、`STORAGE_BACKEND_REFERENCED`@45/409；`STORAGE_BACKEND_DEPS_FAILED`@46/503；`CHANNEL_KIND_UNSUPPORTED`@47、`INVALID_CREDENTIALS`@48/400；`CHANNEL_NAME_TAKEN`@49/409 |
| Connector（50-57） | `CONNECTOR_NOT_FOUND`@50/404；`CONNECTOR_NAME_TAKEN`@51/409；`CONNECTOR_INVALID_CREDENTIALS`@52/400；`OAUTH_HTTPS_REQUIRED`@53/400；`CONNECTOR_KIND_UNSUPPORTED`@54/400；`CONNECTOR_NOT_BOUND`@55/400；`CONNECTOR_ALREADY_BOUND`@56/409；`MCP_LOAD_FAILED`@57/502 |
| Cron / Slash / 附件 / 语音（58-66） | `CRON_TRIGGER_INVALID`@58/400；`SLASH_UNKNOWN`@59、`SLASH_BAD_ARGS`@60/400；`ATTACHMENT_UNSUPPORTED_TYPE`@61/400；`ATTACHMENT_TOO_LARGE`@62/413；`VOICE_BROWSER_ONLY`@63/422；`VOICE_KIND_UNSUPPORTED`@64/`CAPABILITY_MISMATCH`@65/`PROVIDER_DISABLED`@66/400 |
| 通用 / TLS / Workspace（67-71） | `INTERNAL_ERROR`@67/500；`TLS_NOT_ELIGIBLE`@68/403；`TLS_ISSUE_IN_PROGRESS`@69/409；`TLS_DOMAIN_MISMATCH`@70/400；`WORKSPACE_OP_UNSUPPORTED`@71/400 |
| 技能 / 专家 / OIDC（72-82） | `SKILL_IMPORT_UNSUPPORTED_URL`@72/400；`SKILL_IMPORT_FAILED`@73/502；`SKILL_ALREADY_EXISTS`@74/409；`SKILL_PACKAGE_NOT_FOUND`@75/404；`SKILL_PACKAGE_NAME_TAKEN`@76/409；`SKILL_PACKAGE_BACKEND_UNSUPPORTED`@77/400；`PUBLISHED_EXPERT_SLUG_TAKEN`@78、`PUBLISHED_EXPERT_ALREADY_EXISTS`@79/409；`OIDC_BAD_REQUEST`@80/400；`EXPERT_MARKET_FAILED`@81、`SKILLHUB_SSL_FAILED`@82/502 |
| 桌面 / 插件（83-87） | `DESKTOP_SESSION_LIMIT`@83/429；`DESKTOP_CAPTURE_FAILED`@84/503；`PLUGIN_INVALID_ARCHIVE`@85/400；`PLUGIN_INSTALL_FAILED`@86/502；`PLUGIN_ALREADY_EXISTS`@87/409 |
| 知识库（88-97） | `FEATURE_DISABLED`@88/403；`PREREQUISITES_FAILED`@89/409；`KNOWLEDGE_NOT_FOUND`@90/404；`KNOWLEDGE_FORBIDDEN`@91/403；`DOC_TOO_LARGE`@93/413；`DOC_LIMIT`@92、`BASE_LIMIT`@94/409；`UNSUPPORTED_TYPE`@95/400；`NAME_TAKEN`@96/409；`NAME_INVALID`@97/400 |
| 头像 / 邀请（98-104） | `AVATAR_INVALID`@98/400；`AVATAR_TOO_LARGE`@99/413；`INVITE_INVALID`@100/400；`INVITE_USED`@101/409；`INVITE_EXPIRED`@102、`INVITE_REVOKED`@103/410；`INVITE_RATE_LIMITED`@104/429 |

示例消息含 `str.format` 占位（如 `{minute}/{max_mb}/{limit}`），本地化入口 `error_message()`（`src/octop/i18n/domains/errors.py:11`），`KeyError` 时回落源码默认英文（`errors.py:214-218`）。

## 3. 下游错误码 → 本仓错误翻译矩阵

| 下游系统 | 原始错误码 / 状态 | 本仓拦截位置（`路径:行号`） | 翻译后结果 |
|---|---|---|---|
| 腾讯新闻 OpenAPI | `base_rsp.code=4006` 或 msg 含 apikey | `connectors/gateway/adapters/tencent_news.py:88-95` | 「API Key 无效」ValueError |
| 元典法律 AI | `success=false` 或 code∉{0,200,201} 且 msg 含 api+key | `adapters/yuandian.py:208-220` | 「API Key 无效」 |
| 微信读书 | `errcode≠0` | `adapters/wechat_reading.py:45-90` | `[{errcode}] {errmsg}` |
| 飞猪 MCP | 401 / error.message 含 authorization | `adapters/fliggy.py:64-193` | 「无效或鉴权失败」 |
| 腾讯云 ASR/TTS | `Response.Error` | `voice/adapters.py:133-221` | `RuntimeError "{Code}: {Message}"` |
| WeKnora | HTTP 非 2xx / `success=false` | `adapters/weknora.py:72-223` | 「WeKnora request failed: HTTP n」 |
| LLM Provider 探测 | HTTPStatusError / 无 models / 无 choices | `providers/probe.py:159-310` | `_friendly_probe_error` → `stream_error_message` 本地化 |
| 备份恢复 | 驱动不符 / `schema_version` 过高 | `backup/system_archive.py:393-453` | `BACKUP_DRIVER_MISMATCH` / `BACKUP_SCHEMA_INCOMPATIBLE` |

13 个 connector adapter 各自内联翻译，无统一映射表；密钥类错误文案必须保持「不回显 key」约束。

## 4. 后台任务失败与优雅降级标识表（`degraded` / `reason` literals）

| 标识字面量 | 产出位置（`路径:行号`） | 触发条件 | 系统兜底行为 |
|---|---|---|---|
| `"degraded"` | `src/octop/launch.py:27`（bubblewrap provisioning） | `ensure_bubblewrap()` 返回 `status="degraded"` | 仅 warning，不阻断服务启动 |
| `"no_package_manager"` / `"no_privilege"` / `"install_failed"` | `src/octop/infra/utils/bwrap.py:182,189,196,209` | 无包管理器 / 无权限 / 安装失败 | bubblewrap 不可用但不阻断 |
| `"degraded"` | `src/octop/infra/utils/docker_env.py:359,376` | Docker 环境探测部分失败 | 记录状态，由前端展示提示 |
| `"ready" \| "installed" \| "skipped" \| "degraded"` | `src/octop/api/routers/filesystem.py:115` | `ensure-bwrap` 探测结果 | 返回状态字典供 UI 渲染 |
| 空字符串 `""`（检索降级） | `src/octop/infra/knowledge/retrieve.py:22-132` | 任何检索异常 | 对话继续，不注入知识上下文 |

## 5. 共变耦合与修改清单（Co-Change Playbook）

1. 新增错误码：`errors.py:13-104` 枚举 → `_DEFAULT_STATUS`（`:107-199`）→ `i18n/en.json|zh.json → errors.<CODE>` → 前端 `apiErrors.*` → `uv run pytest tests/unit/i18n -q`。
2. 新增下游错误翻译：对应 adapter 文件 → 本页第 3 节 → `tests/unit/connectors/`。
3. **排障入口**：所有用户可见错误均经 `to_envelope` 输出，先按 `error.code` 查本页第 2 节，再按 [`runbook-and-observability.md`](../operations/runbook-and-observability.md) 定位根因。

## 导航与共变索引

错误码对应的入向端点见 [API 参考](api-reference.md)，i18n 键命名见 [术语表](../overview/glossary.md)，下游错误翻译对应的封装见 [集成总览](../integrations/index.md)。
