---
kind: workflow
scope: business-index
status: draft
origin: generated
source_paths: [src/octop/infra/gateway/process/processor.py, src/octop/infra/cron/manager.py, src/octop/infra/knowledge/service.py, src/octop/api/routers/setup.py, src/octop/api/routers/chat/routes.py, src/octop/infra/agents/manager.py]
symbols: [GlobalProcessor, CronManager, KnowledgeService, finish, iter_dashboard_hitl_resume_sse, AgentManager]
upstream: [../INDEX.md, ../overview/business-architecture.md]
downstream: [domain-models/index.md, ../contracts/api-reference.md, ../contracts/error-codes.md]
---

# 业务能力与核心流程总清单

全量归档本仓对外业务用例与后台自动化闭环流程（`WF-01`～`WF-05`），建立「业务场景 ↔ 触发入口 ↔ 下游扇出 ↔ 数据模型 ↔ 错误码/配置」结构化索引。所有入向接口清单位于 [`../contracts/api-reference.md`](../contracts/api-reference.md) 与其 8 张分组子页。

## 1. 全量业务流程路由总表（Complete Workflow Inventory）

| 流程 ID | 业务域 | 流程名称 | 触发入口（路由 / 定时器 / 命令 + 路径:行号） | 串联模块与外部下游链 | 变更的核心实体/状态 | 专页路径 |
|---|---|---|---|---|---|---|
| `WF-01` | `DOM-03` | 统一消息处理与流式回复 | WS `user_turn` (`src/octop/api/routers/chat/ws.py:135`) / IM 入站 / Cron | `api → GlobalProcessor → 斜杠分发 → build_harness_request → AgentManager.stream（harness 黑盒）→ SSE/WS` | `threads` / `thread_messages` / `trajectory_events` | [message-processing.md](message-processing.md) |
| `WF-02` | `DOM-03` | HITL 审批与流式会话恢复 | `POST /api/agents/{id}/chat/hitl/resume` (`src/octop/api/routers/chat/routes.py:156`) | `routes.iter_dashboard_hitl_resume_sse → GlobalProcessor.resume_hitl → SSE` | `hitl_pending → approved/rejected` | [chat-sse-and-hitl.md](chat-sse-and-hitl.md) |
| `WF-03` | `DOM-05` | 定时任务与主动推送 | `CronManager._schedule` (`src/octop/infra/cron/manager.py:236`) | `AsyncIOScheduler → CronJob.run → CronDeliveryService.deliver → AgentManager.stream` | `cron_jobs.last_status=ok\|error` | [cron-automation.md](cron-automation.md) |
| `WF-04` | `DOM-04` | 知识库文档索引与检索 | 文档上传端点 (`src/octop/api/routers/knowledge_bases.py`) | `upload_document → enqueue_index_document → chunk_text → embed → KnowledgeIndex.replace_doc_chunks` | `knowledge_documents.status: pending→processing→ready\|failed` | [knowledge-indexing.md](knowledge-indexing.md) |
| `WF-05` | `DOM-01` | 首次安装向导 | `POST /api/setup/begin` (`src/octop/api/routers/setup.py:309`) | `validate-token → database → initial-admin → test-provider → finish` | `users` / `secrets.jwt` / `config.json` | [setup-wizard.md](setup-wizard.md) |

## 2. 业务域 ↔ 接口组 ↔ 错误码 ↔ 配置键交叉速查

| 业务域 | 入向接口前缀 | 调用的外部下游封装 | 专属错误码 / 降级标识前缀 | 核心控制配置键 |
|---|---|---|---|---|
| `DOM-01` 身份与安装 | `/api/setup/*`、`/api/auth/*`（[`api/auth-and-users.md`](../contracts/api/auth-and-users.md)） | [oidc-provider](../integrations/downstream/oidc-provider.md) | `SETUP_REQUIRED` / `SETUP_TOKEN_INVALID` / `LOGIN_LOCKED` / `AUTH_FAILED`（[`error-codes.md`](../contracts/error-codes.md)） | `OCTOP_REQUIRE_SETUP_PASSWORD`、`OCTOP_LOGIN_MAX_ATTEMPTS`（[`configuration.md`](../contracts/configuration.md)） |
| `DOM-02` Agent 与模型 | `/api/agents/*`、`/api/providers/*`（[`api/agents-and-experts.md`](../contracts/api/agents-and-experts.md)） | [llm-provider](../integrations/downstream/llm-provider.md)、[storage-backend](../integrations/downstream/storage-backend.md) | `AGENT_NOT_RUNNING` / `AGENT_BUSY` / `PROVIDER_REFERENCED` | `OCTOP_BROWSER_IDLE_TIMEOUT_MINUTES` |
| `DOM-03` 对话与记忆 | `/api/agents/{id}/chat/*`、`/api/agents/{id}/memory/*`（[`api/chat-and-memory.md`](../contracts/api/chat-and-memory.md)） | [mcp-gateway](../integrations/downstream/mcp-gateway.md)、[embedding-service](../integrations/downstream/embedding-service.md) | `ATTACHMENT_TOO_LARGE` / `CONNECTOR_MCP_LOAD_FAILED` / `agent.stream.error` | `DEFAULT_RETRIEVAL_K`、`knowledge_base_ids` |
| `DOM-04` 知识与连接器 | `/api/knowledge-bases/*`、`/api/connectors/*`（[`api/connectors-and-knowledge.md`](../contracts/api/connectors-and-knowledge.md)） | [connector-adapters](../integrations/downstream/connector-adapters.md)、[embedding-service](../integrations/downstream/embedding-service.md) | `KNOWLEDGE_DOC_LIMIT` / `KNOWLEDGE_BASE_LIMIT` / `KNOWLEDGE_PREREQUISITES_FAILED` | `MAX_DOCS_PER_KB=100`、`MAX_BASES_PER_OWNER=20` |
| `DOM-05` 通道与自动化 | `/api/agents/{id}/channels/*`、`/api/agents/{id}/cron`（[`api/channels-and-cron.md`](../contracts/api/channels-and-cron.md)） | [feishu-channel](../integrations/downstream/feishu-channel.md)、[channel-qr-bind](../integrations/downstream/channel-qr-bind.md) | `CRON_TRIGGER_INVALID` / `CHANNEL_INVALID_CREDENTIALS` / `backup.auto_failed` | `OCTOP_BACKUP_*`、`OCTOP_DEFAULT_TIMEZONE` |

## 3. 主干链路与数据模型交叉索引

- **主干链路**：[`../overview/callchain-panorama.md`](../overview/callchain-panorama.md) 的 `CC-01`～`CC-04` 与 `WF-*` 一一对应。
- **数据模型**：实体字段与读写归属见 [`domain-models/index.md`](domain-models/index.md)、[`agent-thread-cron.md`](domain-models/agent-thread-cron.md) 与 [`knowledge-user-provider.md`](domain-models/knowledge-user-provider.md)。
- **参数组装**：上游字段如何变形为下游请求字典见 [`../integrations/topology-and-mapping.md`](../integrations/topology-and-mapping.md)。

## 4. 共变耦合与修改清单（Co-Change Playbook）

1. 新增业务用例：先在 [`../overview/business-architecture.md`](../overview/business-architecture.md) 登记 `WF-*` → 写本表与专页 → 补 [`../contracts/api-reference.md`](../contracts/api-reference.md) 分组表 → 补错误码与配置键交叉行。
2. 改业务规则阈值：核对专页「分阶段业务规则与分支判定表」中真实 `if/else` 与常量 → 同步前后端展示（[`../architecture/dashboard-ui.md`](../architecture/dashboard-ui.md)）→ 跑 `uv run pytest tests/unit/gateway tests/unit/cron tests/unit/knowledge -q`。
3. 改状态枚举：同步 [`../overview/glossary.md`](../overview/glossary.md) 字面量集合、[`domain-models/index.md`](domain-models/index.md) 字段字典与单测 fixture，禁止只改一侧。
- **核验锚点**：`src/octop/infra/gateway/process/processor.py:1`（统一消息处理入口）。
- **核验锚点**：`src/octop/infra/knowledge/service.py:1`（知识库业务服务）。
