---
kind: workflow
scope: business-index
status: draft
origin: generated
source_paths: [src/octop/infra/gateway/process/processor.py, src/octop/infra/cron/manager.py, src/octop/api/routers/setup.py, src/octop/infra/knowledge/jobs.py, src/octop/infra/backup/auto.py, src/octop/infra/connectors/builder.py, src/octop/infra/mobile/tools.py]
symbols: [GlobalProcessor.__call__, CronManager.create, setup_finish, process_document, run_auto_backup, validate_create_credentials, mobile_screenshot]
upstream: [INDEX.md, overview/business-architecture.md]
downstream: [business/domain-models/index.md, contracts/api-reference.md]
---

# 业务能力与核心流程总清单

全仓业务闭环按 WF 编号登记；每个 WF 给出触发入口、串联组件、状态实体与专页（专页可能是业务页或下游/运维页，避免同料复写）。各 WF 的编排权威锚点：`src/octop/infra/gateway/process/processor.py:517`（WF-01）、`src/octop/infra/knowledge/jobs.py:34`（WF-04）、`src/octop/infra/backup/auto.py:151`（WF-06）、`src/octop/infra/connectors/builder.py:203`（WF-07）、`src/octop/infra/mobile/tools.py:76`（WF-08）。

## 1. 全量业务流程路由总表（Complete Workflow Inventory）

| 流程 ID | 业务域 | 流程名称 | 触发入口（`路径:行号`） | 串联模块与外部下游链 | 变更实体 / 状态 | 专页 |
|---|---|---|---|---|---|---|
| `WF-01` | 对话 | Dashboard/IM/CLI 统一回合 | `WS /api/agents/{aid}/chat/ws` (`src/octop/api/routers/chat/ws.py:32`) | `WS → 准备 → GlobalProcessor → harness → 流投影 → usage/trajectory` | `Thread / Session / usage_log` | [`chat-turn.md`](chat-turn.md) |
| `WF-02` | 自动化 | 定时任务与主动关怀 | `CronManager.create` (`src/octop/infra/cron/manager.py:105`) | `APScheduler → CronDeliveryService → Gateway → harness / push_text` | `cron_jobs / proactive_care_config / care_push_records` | [`cron-and-proactive.md`](cron-and-proactive.md) |
| `WF-03` | 安装与身份 | 首次向导与认证授权 | `POST /api/setup/database` (`src/octop/api/routers/setup.py:272`) | `setup_lockdown → WizardToken → bind_control_plane → JWT/OIDC` | `users / secrets / sso_providers` | [`setup-and-auth.md`](setup-and-auth.md) |
| `WF-04` | 知识 | 文档索引与检索注入 | `POST /api/knowledge-bases/{kb}/documents` (`src/octop/api/routers/knowledge_bases.py:692`) | `parse → chunk → embed → KnowledgeIndex → citation preamble` | `knowledge_documents.status` | [`knowledge-rag.md`](../integrations/downstream/knowledge-rag.md) |
| `WF-05` | 渠道 | IM 机器人扫码绑定 | `POST /api/agents/{aid}/channels/*/qrcode` (`src/octop/api/routers/channels.py:454`) | `channels API → bot_creators → 外部 SDK → channels 行` | `channels.credentials` | [`im-channels.md`](../integrations/downstream/im-channels.md) |
| `WF-06` | 运维 | 自动备份与恢复 | `install_auto_backup_job` (`src/octop/infra/server.py:417-419`) | `CronManager(system job) → snapshot/pg_dump → tar.gz → prune` | `backup 文件 + manifest.json` | [`runbook-and-observability.md`](../operations/runbook-and-observability.md) |
| `WF-07` | 工具 | 连接器实例创建与 MCP 装配 | `POST /api/connector-instances` (`src/octop/api/routers/connectors.py:662`) | `凭证校验 → spec → registry → LangChain tool → agent 配置` | `connectors / connector_oauth_states` | [`connectors-mcp.md`](../integrations/downstream/connectors-mcp.md) |
| `WF-08` | 设备控制 | 移动/桌面/浏览器远程流 | `WS /api/mobile-stream/ws` (`src/octop/api/routers/mobile/stream.py:481`) | `WS → ADB/xdotool/Playwright 子进程 → 帧投影` | 运行期帧，无持久化 | [`device-bridges.md`](../integrations/downstream/device-bridges.md) |

## 2. 业务域 ↔ 接口组 ↔ 错误码 ↔ 配置键交叉速查

| 业务域 | 入向接口前缀（[全量清单](../contracts/api-reference.md)） | 外部下游封装（[总览](../integrations/index.md)） | 专属错误码前缀（[字典](../contracts/error-codes.md)） | 核心配置键（[手册](../contracts/configuration.md)） |
|---|---|---|---|---|
| 对话 | `/api/agents/{aid}/chat/*`、`/api/agents/{aid}/threads/*` | [LLM Provider](../integrations/downstream/llm-providers.md)、[知识库](../integrations/downstream/knowledge-rag.md) | `AGENT_*`、`ATTACHMENT_*` | `OCTOP_ACCESS_TOKEN_TTL`、`OCTOP_DEFAULT_TIMEZONE` |
| 自动化 | `/api/agents/{aid}/cron/*`、`/api/agents/{aid}/proactive-care` | [Provider](../integrations/downstream/llm-providers.md) | `CRON_TRIGGER_INVALID` | `OCTOP_BACKUP_SCHEDULE`、`OCTOP_BACKUP_RETENTION_COUNT` |
| 安装与身份 | `/api/setup/*`、`/api/auth/*`、`/api/users/*` | 本机 DB / OIDC 端点 | `SETUP_*`、`AUTH_FAILED`、`LOGIN_LOCKED`、`OIDC_*` | `OCTOP_REQUIRE_SETUP_PASSWORD`、`OCTOP_LOGIN_MAX_ATTEMPTS` |
| 知识 | `/api/knowledge-bases/*` | [Embedding/OCR](../integrations/downstream/knowledge-rag.md) | `FEATURE_DISABLED`、`PREREQUISITES_FAILED`、`DOC_*` | `OCTOP_ONNX_COS_BASE`、`OCTOP_ALLOW_RUNTIME_PIP` |
| 渠道/连接器 | `/api/agents/{aid}/channels/*`、`/api/connectors/*` | [IM 渠道](../integrations/downstream/im-channels.md)、[MCP 网关](../integrations/downstream/connectors-mcp.md) | `CHANNEL_*`、`CONNECTOR_*`、`MCP_LOAD_FAILED` | `OCTOP_SKILLS_HUB_*`（技能市场同类机制） |
| 设备 | `/api/browser*`、`/api/desktop*`、`/api/mobile*` | [设备桥](../integrations/downstream/device-bridges.md) | `DESKTOP_SESSION_LIMIT`、`DESKTOP_CAPTURE_FAILED` | `OCTOP_DESKTOP*`、`OCTOP_ENABLE_MOBILE` |

## 3. 流程选择规则（Agent 快速定位）

- 用户说「发消息/聊天/流式输出/中断」→ `WF-01`；说「定时/每天执行/run-now/关怀」→ `WF-02`。
- 用户说「登录/管理员/邀请/OIDC/首次安装」→ `WF-03`；说「上传文档/检索/引用」→ `WF-04`。
- 用户说「扫码/飞书机器人/元宝/钉钉」→ `WF-05`；说「备份/恢复/导出」→ `WF-06`。
- 用户说「连接器/凭证/MCP 工具」→ `WF-07`；说「手机/桌面/浏览器串流」→ `WF-08`。
- 所有流程的持久化实体与 Writer/Reader 归属统一查 [领域模型](domain-models/index.md)；接口参数查 [入向接口参考](../contracts/api-reference.md)。

## 4. 导航与维护

新增流程时同步更新 [业务架构全景](../overview/business-architecture.md) 的 `DOM-*` 矩阵与 [主干调用链](../overview/callchain-panorama.md) 的 `CC-*` 索引；错误码语义查 [错误码字典](../contracts/error-codes.md)，流程专页的源码锚点改动需回归 [单测映射](../operations/dev-and-test.md)。
