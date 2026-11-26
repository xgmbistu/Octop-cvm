---
kind: panorama
scope: glossary
status: draft
origin: generated
source_paths: [src/octop/infra/db/repos/agents.py, src/octop/infra/gateway/threads.py, src/octop/infra/db/repos/knowledge.py, src/octop/infra/cron/task_type.py, src/octop/config.py, src/octop/infra/users/identity.py]
symbols: [AgentRow, ThreadRegistry.make_key, KnowledgeDocumentRow, CronTaskType, OctopConfig, Role]
upstream: [../INDEX.md, system-architecture.md]
downstream: [../business/domain-models/index.md, ../architecture/index.md]
---

# 领域术语与代码符号精确映射表

消除需求话术、界面文案与底层源码类名/字段名之间的命名鸿沟：本表把「专家 / 会话 / 知识库 / 定时任务」等自然语言概念一对一钉到 `dataclass`、表列与枚举字面量，供 Agent 把需求翻译为精确符号。

## 1. 自然语言术语 ↔ 源码符号映射字典

| 需求/业务常见叫法（含别名/缩写） | 精确技术与业务定义 | 源码对应类 / 表 / 字段 / 枚举 | 权威定义位置（路径:行号） |
|---|---|---|---|
| 专家 / Agent / 智能体 | 每用户隔离的运行时实例，持有工作区、Provider、通道、Cron | `AgentRow`（表 `agents.agent_id`） | `src/octop/infra/db/repos/agents.py:23` |
| 会话 / Thread / 话题 | 按 `agent_id:channel_type:subject:chat_type` 聚合的消息容器 | `ThreadRow`（`threads.thread_id`） | `src/octop/infra/gateway/threads.py:30`、`src/octop/infra/db/repos/threads.py:55` |
| Session / 会话键 | 网关侧会话定位键，映射到 thread | `sessions.session_key` | `src/octop/infra/db/repos/sessions.py:111` |
| 消息 / Message | 无独立领域类：harness 侧 `HumanMessage`/`AIMessage`/`ToolMessage`，对外为 dashboard 形态 dict | `src/octop/api/routers/chat/serialize.py:881` 的 `role`/`content` blocks | `src/octop/api/routers/chat/serialize.py:881` |
| 知识库 / KB | 文档集合 + 向量索引，归属用户、可共享 | `KnowledgeBaseRow`（`knowledge_bases`） | `src/octop/infra/db/repos/knowledge.py:22` |
| 知识文档 / Document | 单篇文件，状态 `pending`/`processing`/`ready`/`failed` | `KnowledgeDocumentRow` | `src/octop/infra/db/repos/knowledge.py:63`、`src/octop/infra/knowledge/jobs.py:44` |
| 定时任务 / Cron | APScheduler 作业，`interval`/`cron`/`date` 三种触发器 | `CronJob`（`cron_jobs.cron_id`） | `src/octop/infra/cron/job.py:21`、`src/octop/infra/cron/trigger.py:62` |
| 模型提供方 / Provider | OpenAI 兼容 / DashScope / Ollama / 本地 ONNX 的凭据与模型槽 | `ProviderRow`（`providers.name`） | `src/octop/infra/db/repos/providers.py:24` |
| 通道 / Channel | IM 平台连接（飞书/钉钉/QQ/Discord/企微/Web） | `ChannelRow`（`channels.channel_id`） | `src/octop/infra/db/repos/channels.py:12` |
| 连接器 / Connector | OAuth 应用与 MCP 网关，向 Agent 注入工具 | `ConnectorRow`（`connectors.instance_id`） | `src/octop/infra/db/repos/connectors.py:13` |
| 管理员 / 角色 | `ADMIN` 与 `USER` 两值枚举，admin 豁免归属与权限 | `Role(StrEnum)` | `src/octop/infra/users/identity.py:9` |
| 首次安装向导 / Setup | 用户数为 0 时开放，创建 admin 与 JWT secret | `SETUP_REQUIRED` / `src/octop/api/routers/setup.py:105` | `src/octop/api/routers/setup.py:105`、`src/octop/infra/errors.py:16` |
| 数据目录 / OCTOP_HOME | `~/.octop/`（Docker 内 `/data/.octop`） | `PathLayout`（`apply_env_file`） | `src/octop/infra/server.py:241`、`docker/docker-entrypoint.sh:15` |
| HITL / 人工审批 | 工具调用前挂起，等待 approve/edit/reject/respond | `_DECISION_TYPES`（`src/octop/api/routers/chat/models.py:10`） | `src/octop/api/routers/chat/models.py:10` |

## 2. 易混概念严格辨析（Disambiguation）

| 概念 A（源码符号） | 概念 B（源码符号） | 关键差异 | 对照源码锚点 |
|---|---|---|---|
| `session_key`（`sessions`） | `thread_id`（`threads`） | 前者是网关/通道侧定位键（一会话可重绑 thread），后者是对话内容主键；`rebind` 会改变映射而不改历史 | `src/octop/infra/gateway/threads.py:188` vs `src/octop/infra/db/repos/threads.py:155` |
| `agent_id`（字符串公开 ID） | `id`（整数代理主键） | 资源表 API/外键一律用字符串 `agent_id`；`row.id` 被 repo 映射为公开串，`row.pk` 保留整数 | `src/octop/infra/db/repos/_base.py:17`、`AGENTS.md:242` |
| `CronTaskType="text"` | `CronTaskType="agent"` | 前者直发文本，后者走 `agent_manager.stream`（且 HITL 需求会抛错），默认 `"agent"` | `src/octop/infra/cron/task_type.py:7-8`、`src/octop/infra/cron/delivery.py:88`、`:131` |
| `OCTOP_DEFAULT_TIMEZONE` | `cron_timezone` | 新键 `default_timezone` 为准；旧键仅兼容迁移，`load_config` 会 `pop` | `src/octop/config.py:436` vs `:408`、`:437` |
| `BackendWorkspace`（harness） | `agent.backend` | 工作区内容 IO 必须走前者；直接读 `agent.backend` 或 `Path.write_text` 会绕过路径规则 | `AGENTS.md:207`、`src/octop/infra/backend/resolver.py:23` |
| `ErrorCode`（91 项枚举） | `HTTP status` | 枚举是业务语义，状态码由 `_DEFAULT_STATUS` 注入；改语义不改映射会串味 | `src/octop/infra/errors.py:13` vs `:107` |

## 3. 代码命名与枚举惯例

- **模块前缀约定**：`infra/` 下按子包分层（`db/repos/` 一表一 repo、`gateway/process/` 处理管线、`cron/` 调度）；`api/routers/` 一资源一文件；`cli/commands/*_cmd.py` 一类子命令；`_*` 前缀为模块内部函数（如 `_assert_agent_owner`）。
- **关键状态值字面量集合**：Agent `starting|running|stopped|failed|created`（`src/octop/infra/agents/manager.py:87`、`:573`、`:711`、`:2030`）；知识文档 `pending|processing|ready|failed`（`src/octop/infra/knowledge/jobs.py:44-59`）；Cron 运行 `ok|error`（`src/octop/infra/cron/job.py:103`、`:111`）；响应模式 `invoke|stream`（`src/octop/infra/gateway/process/response_mode.py:19`）。
- **ID 生成**：线程 `f"thr_{new_ulid()}"`（`src/octop/infra/gateway/threads.py:389`）；资源表公开 ID 为 ULID/短串，禁止用整数 `id` 做外键（`AGENTS.md:242`）。
- **i18n 键约定**：错误码 `ErrorCode.X` → `errors.X`（`src/octop/i18n/domains/errors.py`），dashboard 侧镜像 `apiErrors.X`；服务端用户可见文案禁止硬编码英文（`AGENTS.md:263`）。

## 4. 共变耦合与修改清单（Co-Change Playbook）

- **新增/重命名术语**：先在本表锁定「自然语言 ↔ 源码符号」映射 → 再写 [`../business/domain-models/index.md`](../business/domain-models/index.md) 字段字典 → 最后写组件与业务页，禁止先在正文造新词造成多页命名漂移。
- **改状态/枚举字面量**：同步 `src/octop/infra/errors.py:13`、`src/octop/infra/agents/manager.py:87`、`src/octop/infra/knowledge/jobs.py:44` 与前端 i18n 键，跑 `uv run pytest tests/unit/i18n -q`。
- **辨析易混概念**：本表第 2 节的 `session_key`/`thread_id`、`id`/`agent_id` 差异，改动任一侧须回查 [`../business/domain-models/agent-thread-cron.md`](../business/domain-models/agent-thread-cron.md)。
