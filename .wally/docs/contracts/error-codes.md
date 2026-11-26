---
kind: error-dict
scope: error-codes
status: draft
origin: generated
source_paths: [src/octop/infra/errors.py, src/octop/api/app.py, src/octop/api/middleware/jwt_auth.py, src/octop/infra/gateway/process/processor.py, src/octop/infra/backup/auto.py]
symbols: [ErrorCode, OctopError, to_envelope, _octop, format_stream_error]
upstream: [api-reference.md, ../integrations/index.md]
downstream: [../operations/runbook-and-observability.md, configuration.md]
---

# 错误码、异常传播与降级标识字典

> `ErrorCode(StrEnum)` 共 **91** 个成员（`src/octop/infra/errors.py:13-104`），`OctopError.__post_init__` 在 `status=0` 时按 `_DEFAULT_STATUS` 注入 HTTP 状态码（`src/octop/infra/errors.py:209`、`:107`）。下表 100% 取自源码字面量，无推测编号。

## 1. 异常捕获与协议状态映射规则

| 边界位置 | 捕获类型 | 映射后响应 | 是否阻断 |
|---|---|---|---|
| `src/octop/api/app.py:78` (`_octop`) | `OctopError` | `JSONResponse(status_code=exc.status, content=exc.to_envelope(locale=locale))` | 是 |
| `src/octop/api/app.py:93` (`_unhandled`) | 任意 `Exception` | `OctopError.localized(INTERNAL_ERROR)` → `500` | 是 |
| `src/octop/api/middleware/jwt_auth.py:62` | `OctopError`（鉴权） | 直接 `JSONResponse`，跳过 FastAPI handler | 是 |
| `src/octop/infra/gateway/process/processor.py:735` | 流式执行异常 | `format_stream_error` + 审计 `agent.stream.error` | 记录不重试 |
| `src/octop/infra/agents/providers/probe.py:180` | `status_code>=400` | `"HTTP {code} POST {url}"`（body ≤ 300 字符） | 探针失败 |

## 2. 对外接口与领域层错误全表（91 项）

| 错误码 | HTTP 状态 | 枚举声明锚点 | 状态映射锚点 |
|---|---|---|---|
| `AUTH_FAILED` | `401` | `src/octop/infra/errors.py:14` | `src/octop/infra/errors.py:108` |
| `TOKEN_EXPIRED` | `401` | `src/octop/infra/errors.py:15` | `src/octop/infra/errors.py:109` |
| `SETUP_REQUIRED` | `409` | `src/octop/infra/errors.py:16` | `src/octop/infra/errors.py:110` |
| `DATABASE_NOT_EMPTY` | `409` | `src/octop/infra/errors.py:17` | `src/octop/infra/errors.py:111` |
| `BACKUP_DRIVER_MISMATCH` | `400` | `src/octop/infra/errors.py:18` | `src/octop/infra/errors.py:112` |
| `BACKUP_SCHEMA_INCOMPATIBLE` | `400` | `src/octop/infra/errors.py:19` | `src/octop/infra/errors.py:113` |
| `BACKUP_IN_PROGRESS` | `409` | `src/octop/infra/errors.py:20` | `src/octop/infra/errors.py:114` |
| `FORBIDDEN` | `403` | `src/octop/infra/errors.py:21` | `src/octop/infra/errors.py:115` |
| `NOT_FOUND` | `404` | `src/octop/infra/errors.py:22` | `src/octop/infra/errors.py:116` |
| `USER_DISABLED` | `403` | `src/octop/infra/errors.py:23` | `src/octop/infra/errors.py:117` |
| `LOGIN_LOCKED` | `429` | `src/octop/infra/errors.py:24` | `src/octop/infra/errors.py:118` |
| `USERNAME_TAKEN` | `409` | `src/octop/infra/errors.py:25` | `src/octop/infra/errors.py:119` |
| `EMAIL_TAKEN` | `409` | `src/octop/infra/errors.py:26` | `src/octop/infra/errors.py:120` |
| `EMAIL_INVALID` | `400` | `src/octop/infra/errors.py:27` | `src/octop/infra/errors.py:121` |
| `PASSWORD_SAME_AS_OLD` | `400` | `src/octop/infra/errors.py:28` | `src/octop/infra/errors.py:122` |
| `PASSWORD_TOO_WEAK` | `400` | `src/octop/infra/errors.py:29` | `src/octop/infra/errors.py:123` |
| `SETUP_PASSWORD_WRONG` | `401` | `src/octop/infra/errors.py:30` | `src/octop/infra/errors.py:124` |
| `SETUP_RATE_LIMITED` | `429` | `src/octop/infra/errors.py:31` | `src/octop/infra/errors.py:125` |
| `SETUP_TOKEN_INVALID` | `401` | `src/octop/infra/errors.py:32` | `src/octop/infra/errors.py:126` |
| `AGENT_NOT_FOUND` | `404` | `src/octop/infra/errors.py:33` | `src/octop/infra/errors.py:127` |
| `AGENT_NOT_RUNNING` | `409` | `src/octop/infra/errors.py:34` | `src/octop/infra/errors.py:128` |
| `AGENT_FAILED` | `500` | `src/octop/infra/errors.py:35` | `src/octop/infra/errors.py:129` |
| `AGENT_BUSY` | `409` | `src/octop/infra/errors.py:36` | `src/octop/infra/errors.py:130` |
| `AGENT_NAME_TAKEN` | `409` | `src/octop/infra/errors.py:37` | `src/octop/infra/errors.py:131` |
| `AGENT_ID_INVALID` | `400` | `src/octop/infra/errors.py:38` | `src/octop/infra/errors.py:132` |
| `AGENT_ID_TAKEN` | `409` | `src/octop/infra/errors.py:39` | `src/octop/infra/errors.py:133` |
| `PROVIDER_NAME_TAKEN` | `409` | `src/octop/infra/errors.py:40` | `src/octop/infra/errors.py:134` |
| `PROVIDER_NOT_VISIBLE` | `400` | `src/octop/infra/errors.py:41` | `src/octop/infra/errors.py:135` |
| `PROVIDER_REFERENCED` | `409` | `src/octop/infra/errors.py:42` | `src/octop/infra/errors.py:136` |
| `PROVIDER_LOCAL_PROTECTED` | `409` | `src/octop/infra/errors.py:43` | `src/octop/infra/errors.py:137` |
| `STORAGE_BACKEND_NAME_TAKEN` | `409` | `src/octop/infra/errors.py:44` | `src/octop/infra/errors.py:138` |
| `STORAGE_BACKEND_REFERENCED` | `409` | `src/octop/infra/errors.py:45` | `src/octop/infra/errors.py:139` |
| `STORAGE_BACKEND_DEPS_FAILED` | `503` | `src/octop/infra/errors.py:46` | `src/octop/infra/errors.py:140` |
| `CHANNEL_KIND_UNSUPPORTED` | `400` | `src/octop/infra/errors.py:47` | `src/octop/infra/errors.py:141` |
| `CHANNEL_INVALID_CREDENTIALS` | `400` | `src/octop/infra/errors.py:48` | `src/octop/infra/errors.py:142` |
| `CHANNEL_NAME_TAKEN` | `409` | `src/octop/infra/errors.py:49` | `src/octop/infra/errors.py:143` |
| `CONNECTOR_NOT_FOUND` | `404` | `src/octop/infra/errors.py:50` | `src/octop/infra/errors.py:144` |
| `CONNECTOR_NAME_TAKEN` | `409` | `src/octop/infra/errors.py:51` | `src/octop/infra/errors.py:145` |
| `CONNECTOR_INVALID_CREDENTIALS` | `400` | `src/octop/infra/errors.py:52` | `src/octop/infra/errors.py:146` |
| `CONNECTOR_OAUTH_HTTPS_REQUIRED` | `400` | `src/octop/infra/errors.py:53` | `src/octop/infra/errors.py:147` |
| `CONNECTOR_KIND_UNSUPPORTED` | `400` | `src/octop/infra/errors.py:54` | `src/octop/infra/errors.py:148` |
| `CONNECTOR_NOT_BOUND` | `400` | `src/octop/infra/errors.py:55` | `src/octop/infra/errors.py:149` |
| `CONNECTOR_ALREADY_BOUND` | `409` | `src/octop/infra/errors.py:56` | `src/octop/infra/errors.py:150` |
| `CONNECTOR_MCP_LOAD_FAILED` | `502` | `src/octop/infra/errors.py:57` | `src/octop/infra/errors.py:151` |
| `CRON_TRIGGER_INVALID` | `400` | `src/octop/infra/errors.py:58` | `src/octop/infra/errors.py:152` |
| `SLASH_UNKNOWN` | `400` | `src/octop/infra/errors.py:59` | `src/octop/infra/errors.py:153` |
| `SLASH_BAD_ARGS` | `400` | `src/octop/infra/errors.py:60` | `src/octop/infra/errors.py:154` |
| `ATTACHMENT_UNSUPPORTED_TYPE` | `400` | `src/octop/infra/errors.py:61` | `src/octop/infra/errors.py:155` |
| `ATTACHMENT_TOO_LARGE` | `413` | `src/octop/infra/errors.py:62` | `src/octop/infra/errors.py:156` |
| `VOICE_BROWSER_ONLY` | `422` | `src/octop/infra/errors.py:63` | `src/octop/infra/errors.py:157` |
| `VOICE_KIND_UNSUPPORTED` | `400` | `src/octop/infra/errors.py:64` | `src/octop/infra/errors.py:158` |
| `VOICE_CAPABILITY_MISMATCH` | `400` | `src/octop/infra/errors.py:65` | `src/octop/infra/errors.py:159` |
| `VOICE_PROVIDER_DISABLED` | `400` | `src/octop/infra/errors.py:66` | `src/octop/infra/errors.py:160` |
| `INTERNAL_ERROR` | `500` | `src/octop/infra/errors.py:67` | `src/octop/infra/errors.py:161` |
| `TLS_NOT_ELIGIBLE` | `403` | `src/octop/infra/errors.py:68` | `src/octop/infra/errors.py:162` |
| `TLS_ISSUE_IN_PROGRESS` | `409` | `src/octop/infra/errors.py:69` | `src/octop/infra/errors.py:163` |
| `TLS_DOMAIN_MISMATCH` | `400` | `src/octop/infra/errors.py:70` | `src/octop/infra/errors.py:164` |
| `WORKSPACE_OP_UNSUPPORTED` | `400` | `src/octop/infra/errors.py:71` | `src/octop/infra/errors.py:165` |
| `SKILL_IMPORT_UNSUPPORTED_URL` | `400` | `src/octop/infra/errors.py:72` | `src/octop/infra/errors.py:166` |
| `SKILL_IMPORT_FAILED` | `502` | `src/octop/infra/errors.py:73` | `src/octop/infra/errors.py:167` |
| `SKILL_ALREADY_EXISTS` | `409` | `src/octop/infra/errors.py:74` | `src/octop/infra/errors.py:168` |
| `SKILL_PACKAGE_NOT_FOUND` | `404` | `src/octop/infra/errors.py:75` | `src/octop/infra/errors.py:169` |
| `SKILL_PACKAGE_NAME_TAKEN` | `409` | `src/octop/infra/errors.py:76` | `src/octop/infra/errors.py:170` |
| `SKILL_PACKAGE_BACKEND_UNSUPPORTED` | `400` | `src/octop/infra/errors.py:77` | `src/octop/infra/errors.py:171` |
| `PUBLISHED_EXPERT_SLUG_TAKEN` | `409` | `src/octop/infra/errors.py:78` | `src/octop/infra/errors.py:172` |
| `PUBLISHED_EXPERT_ALREADY_EXISTS` | `409` | `src/octop/infra/errors.py:79` | `src/octop/infra/errors.py:173` |
| `OIDC_BAD_REQUEST` | `400` | `src/octop/infra/errors.py:80` | `src/octop/infra/errors.py:174` |
| `EXPERT_MARKET_FAILED` | `502` | `src/octop/infra/errors.py:81` | `src/octop/infra/errors.py:175` |
| `SKILLHUB_SSL_FAILED` | `502` | `src/octop/infra/errors.py:82` | `src/octop/infra/errors.py:176` |
| `DESKTOP_SESSION_LIMIT` | `429` | `src/octop/infra/errors.py:83` | `src/octop/infra/errors.py:177` |
| `DESKTOP_CAPTURE_FAILED` | `503` | `src/octop/infra/errors.py:84` | `src/octop/infra/errors.py:178` |
| `PLUGIN_INVALID_ARCHIVE` | `400` | `src/octop/infra/errors.py:85` | `src/octop/infra/errors.py:179` |
| `PLUGIN_INSTALL_FAILED` | `502` | `src/octop/infra/errors.py:86` | `src/octop/infra/errors.py:180` |
| `PLUGIN_ALREADY_EXISTS` | `409` | `src/octop/infra/errors.py:87` | `src/octop/infra/errors.py:181` |
| `KNOWLEDGE_FEATURE_DISABLED` | `403` | `src/octop/infra/errors.py:88` | `src/octop/infra/errors.py:182` |
| `KNOWLEDGE_PREREQUISITES_FAILED` | `409` | `src/octop/infra/errors.py:89` | `src/octop/infra/errors.py:183` |
| `KNOWLEDGE_NOT_FOUND` | `404` | `src/octop/infra/errors.py:90` | `src/octop/infra/errors.py:184` |
| `KNOWLEDGE_FORBIDDEN` | `403` | `src/octop/infra/errors.py:91` | `src/octop/infra/errors.py:185` |
| `KNOWLEDGE_DOC_LIMIT` | `409` | `src/octop/infra/errors.py:92` | `src/octop/infra/errors.py:186` |
| `KNOWLEDGE_DOC_TOO_LARGE` | `413` | `src/octop/infra/errors.py:93` | `src/octop/infra/errors.py:187` |
| `KNOWLEDGE_BASE_LIMIT` | `409` | `src/octop/infra/errors.py:94` | `src/octop/infra/errors.py:188` |
| `KNOWLEDGE_UNSUPPORTED_TYPE` | `400` | `src/octop/infra/errors.py:95` | `src/octop/infra/errors.py:189` |
| `KNOWLEDGE_NAME_TAKEN` | `409` | `src/octop/infra/errors.py:96` | `src/octop/infra/errors.py:190` |
| `KNOWLEDGE_NAME_INVALID` | `400` | `src/octop/infra/errors.py:97` | `src/octop/infra/errors.py:191` |
| `AVATAR_INVALID` | `400` | `src/octop/infra/errors.py:98` | `src/octop/infra/errors.py:192` |
| `AVATAR_TOO_LARGE` | `413` | `src/octop/infra/errors.py:99` | `src/octop/infra/errors.py:193` |
| `INVITE_INVALID` | `400` | `src/octop/infra/errors.py:100` | `src/octop/infra/errors.py:194` |
| `INVITE_USED` | `409` | `src/octop/infra/errors.py:101` | `src/octop/infra/errors.py:195` |
| `INVITE_EXPIRED` | `410` | `src/octop/infra/errors.py:102` | `src/octop/infra/errors.py:196` |
| `INVITE_REVOKED` | `410` | `src/octop/infra/errors.py:103` | `src/octop/infra/errors.py:197` |
| `INVITE_RATE_LIMITED` | `429` | `src/octop/infra/errors.py:104` | `src/octop/infra/errors.py:198` |

## 3. 下游错误码 → 本仓错误翻译矩阵

| 下游系统 | 下游原始判定 | 本仓拦截位置 | 翻译结果 |
|---|---|---|---|
| OpenAI 兼容 Provider | `HTTP 401/403` → `error_type:"auth"` | `src/octop/infra/connectors/probe.py:129` | 认证失败提示 |
| MCP 远端 | `status>=500` → `"远端服务错误 HTTP {code}"` | `src/octop/infra/connectors/probe.py:445` | 探测失败返回 `ok=false` |
| 腾讯 IMA | `data["code"]` 非 `0/None/"0"` | `src/octop/infra/connectors/gateway/adapters/tencent_ima.py:480` | 抛 `msg`/`message` |
| 腾讯新闻 | `base_rsp["code"]`、`4006`/`apikey` | `src/octop/infra/connectors/gateway/adapters/tencent_news.py:88` | 标记 apikey 无效 |
| 百度地图 | `status 102` / `"token失效"` | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:107` | 标记凭据失效 |
| QQ 音乐 | `ret 11534343` / `"unauthorized"` | `src/octop/infra/connectors/gateway/adapters/qq_music.py:136` | 标记凭据失效 |
| Embedding 服务 | `data` 缺失/数量不符 | `src/octop/infra/knowledge/embed.py:61`、`:64` | 抛字面错误串 |

## 4. 后台异步任务失败与优雅降级标识

| 标识 / 状态字面量 | 产出位置 | 触发条件 | 系统兜底 |
|---|---|---|---|
| `"error"` / `"ok"` | `src/octop/infra/cron/job.py:103`、`:111` | 定时任务抛异常 / 正常 | 写 `last_status` + 审计 `cron.run_failed`/`cron.run_ok` |
| `"pending"|"processing"|"ready"|"failed"` | `src/octop/infra/knowledge/jobs.py:44`、`:55`、`:59` | 索引管线各阶段 | 失败不切检索快照 |
| `backup.auto_failed` / `backup.auto_ok` | `src/octop/infra/backup/auto.py:224`、`:235` | 自动备份作业 | 保留 `octop_auto_backup` 作业记录 |
| `rejected` / `approved` | `src/octop/api/routers/chat/routes.py:128` | HITL 人工审批 | `mark_resolved` 后恢复流 |
| `degraded` 语义 | `src/octop/infra/gateway/process/processor.py:713` | MCP 装配失败 `raise_on_failure=False` | 降级继续本轮对话 |

## 5. 共变耦合与修改清单（Co-Change Playbook）

1. 新增错误码：`src/octop/infra/errors.py:13` 加枚举 → `:107` 加 `_DEFAULT_STATUS` → `src/octop/i18n/{en,zh}.json` 加 `errors.<CODE>` → `dashboard/src/locales/{en,zh}.json` 加 `apiErrors.<CODE>`。
2. 前后端键一致性由 `uv run pytest tests/unit/i18n -q` 守护；后端 `to_envelope(locale=...)` 的本地化由 `resolve_request_locale` 驱动。
3. 修改状态码后复查 [`api-reference.md`](api-reference.md) 各分组错误分支与 [`runbook-and-observability.md`](../operations/runbook-and-observability.md)。
