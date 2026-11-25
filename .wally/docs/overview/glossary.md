---
kind: panorama
scope: glossary
status: draft
origin: generated
source_paths: [src/octop/i18n/loader.py, src/octop/infra/utils/locale.py, src/octop/infra/gateway/threads.py, src/octop/infra/gateway/process/message_keys.py, src/octop/infra/cron/task_type.py, src/octop/infra/errors.py]
symbols: [tr, lookup, resolve_locale, resolve_user_locale, resolve_request_locale, make_key, dashboard_key, session_key_from_message, normalize_cron_task_type]
upstream: [INDEX.md]
downstream: [business/domain-models/index.md, contracts/error-codes.md, contracts/configuration.md]
---

# 领域术语与代码符号精确映射表

本页把自然语言需求话术、界面文案与 Octop 源码类名/表字段/枚举字面量一一锁定，供 Agent 把「会话」「渠道」「定时任务」等模糊叫法精准翻译为可 `Read` 的符号。

## 1. 自然语言术语 ↔ 源码符号映射字典

| 需求/业务常见叫法（含别名） | 精确技术与业务定义 | 源码对应类 / 表 / 字段 / 枚举 | 权威定义位置（`路径:行号`） |
|---|---|---|---|
| 智能体 / Agent（运行时实例） | 一行 `agents` 行 + 按需构造的 `HarnessAgentRuntime`；全局唯一 `AgentManager` 注册表，按 `agents.user_id` 做归属隔离 | `AgentManager.boot` / `_start_agent` / `HarnessAgentConfig` | `src/octop/infra/agents/manager.py:417` (`boot`)、`:2013` (`_start_agent`)、`:2649-2678` |
| 会话 / Thread（聊天线程） | 一次对话的持久化单元，`threads` 行；公开 `thread_id = "thr_" + ULID`，与来源无关 | `ThreadRegistry.get_or_create` / `_new_thread_id` | `src/octop/infra/gateway/threads.py:91`、`:388` |
| 会话键 / Session Key | 隔离在线会话的复合字符串 `agent_id:channel_type:subject_id:chat_type`；dashboard 形态 `<aid>:dashboard:<user_id>:dm` | `make_key` / `dashboard_key` / `session_key_from_message` | `src/octop/infra/gateway/threads.py:21-30`、`src/octop/infra/gateway/process/message_keys.py:112` |
| 一轮对话 / Turn | 从入站消息到 harness `stream()` 完成的一次执行；usage/trajectory 均按 turn 记账 | `GlobalProcessor.__call__` / `UsageTracker.observe` / `TrajectoryService.finish_turn` | `src/octop/infra/gateway/process/processor.py:517`、`src/octop/infra/gateway/process/usage_record.py:210`、`src/octop/infra/trajectory/service.py:132` |
| 渠道 / Channel（IM 机器人） | IM 平台接入实例；`channels` 行 + `harness_gateway` 侧的 `ChannelManager`，一个 agent 可挂多个渠道 | `channels` 表 / `Gateway.boot` | `src/octop/infra/gateway/gateway.py:199`、`src/octop/infra/db/migrations/001_initial.sql:82-94` |
| 定时任务 / Cron Job | `cron_jobs` 行；`schedule_spec` 三种字面量 `interval:` / `cron:` / `date:`，`task_type` 决定直推还是跑 AI | `CronManager.create` / `build_trigger` / `normalize_cron_task_type` | `src/octop/infra/cron/manager.py:105`、`src/octop/infra/cron/trigger.py:62`、`src/octop/infra/cron/task_type.py:7-11` |
| 主动关怀 / Proactive Care | 按配置窗口随机触发的程序化关怀流程，不走 ReAct；候选来自 memory episode 并按情绪/新近度打分 | `ProactiveCareScheduler.compute_next_trigger` / `ProactiveCareService.run` / `_score` | `src/octop/infra/proactive/scheduler.py:44`、`src/octop/infra/proactive/service.py:83`、`src/octop/infra/proactive/picker.py:68` |
| 模型 / Provider（供应商） | `providers` 行（name-keyed），经 `build_harness_configs` 降级为 harness 的 `ProviderConfig` 与 `ModelConfig` | `KIND_TO_PROTOCOL` / `build_harness_configs` / `_model_config_from_row` | `src/octop/infra/agents/providers/store.py:18-24`、`:130-161`、`:163-172` |
| 工作区 / Workspace | agent 内容文件根目录，通过 `BackendWorkspace` 读写；路径为工作区相对路径，`"/"` 与 `"."` 语义不同 | `harness_workspace_path` / `workspace_api_path` | `src/octop/infra/agents/manager.py:2429-2440`、`src/octop/api/common/workspace.py` |
| 连接器 / Connector（外部工具） | 由凭证 + 协议生成的 MCP 工具集；`connectors` 行 + `GatewayAdapter` 分派，内部走 JSON-RPC 信封 | `validate_create_credentials` / `call_gateway_tool` / `handle_mcp_request` | `src/octop/infra/connectors/builder.py:203-413`、`src/octop/infra/connectors/gateway/registry.py:32-77`、`src/octop/infra/connectors/gateway/protocol.py:21-51` |
| 知识库 / KB | `knowledge_bases` + `knowledge_documents`；文档经 parse→chunk→embed→向量表落库 | `process_document` / `KnowledgeIndex.replace_doc_chunks` | `src/octop/infra/knowledge/jobs.py:34`、`src/octop/infra/knowledge/index.py:26-134` |
| 轨迹 / Trajectory | turn 的结构化事件流，落 `trajectory_events` 表，供前端 SSE 回放 | `TrajectoryService.observe_chunk` / `finish_turn` | `src/octop/infra/trajectory/service.py:53`、`:132` |
| 错误码 / ErrorCode | `errors.<CODE>` i18n 键对应的 StrEnum，默认 HTTP 状态由 `_DEFAULT_STATUS` 给出 | `ErrorCode` / `OctopError.to_envelope` | `src/octop/infra/errors.py:13-104`、`:239` |
| 语言 / Locale | 仅 `zh` 与 `en`（`en` 为 i18n 回退，`zh` 为默认语言）；语言不是 `config.json` 键 | `resolve_locale` / `normalize_locale` / `SUPPORTED_LOCALES` | `src/octop/infra/utils/locale.py:7-10`、`:13-19` |

## 2. 易混概念严格辨析（Disambiguation）

| 概念 A（`源码符号`） | 概念 B（`源码符号`） | 关键差异（粒度 / 读写时机 / 混用后果） | 对照源码锚点 |
|---|---|---|---|
| `thread_id`（字符串公开 ID） | `sessions.session_key`（在线会话键） | Thread 是持久化对话单元；Session Key 是路由到「哪个 agent + 哪个渠道 + 哪个subject」的键。同一 thread 可被 rebind 到新 session，但 `session_key` 拆出 `channel_type`/`chat_type` 决定消息出口 | `src/octop/infra/gateway/threads.py:388` vs `src/octop/infra/cron/manager.py:263-277` |
| `agents.id`（整数 pk） | `agents.agent_id`（字符串公开 ID） | 资源表统一「整数代理 PK + 字符串公开 ID」；API 路径、子表 FK 一律用字符串 `agent_id`，误用整数会越权或查空 | `src/octop/infra/db/migrations/007_resource_identity_and_profile.sql`、`src/octop/infra/db/repos/agents.py` |
| `ProviderConfig`（harness 侧供应商） | `OctopConfig`（本仓进程配置） | 前者是传给 `HarnessAgentManager` 的 LLM 连接字典（`base_url/api_key/protocol/headers`）；后者是 `config.json` + `OCTOP_*` 环境变量的进程配置，二者不可互指 | `src/octop/infra/agents/providers/store.py:130-161` vs `src/octop/config.py:394-582` |
| `user_id`（数字/登录主体） | `subject_id`（渠道侧身份） | dashboard/CLI 用数字 `user.id` 作 user_id；外部 IM 一律归 agent owner，平台账号存 `subject_id`。混淆会把群聊消息记到错误用户名下 | `src/octop/infra/gateway/process/message_keys.py:67-93` |
| `task_type="text"`（Cron 直推） | `task_type="agent"`（Cron 跑 AI） | 前者直接 `Gateway.push_text_from_session` 推文本，后者构造 harness 请求流式收集 `token/delta`；接口层工具创建默认 `text`，manager 默认 `agent` | `src/octop/infra/cron/delivery.py:77-80`、`src/octop/infra/cron/tools.py:145` |
| `origin: generated` 页 | `origin: human` / `status: verified` 页 | 前者为自动提取草稿，可增量覆盖；后者是人工权威结论，全量/增量均禁止覆盖，仅报漂移 | `.wally/docs/.wiki-meta.json` 与 [边界声明](../operations/boundary.md) |

## 3. 代码命名与枚举惯例

- **模块分层前缀**：`src/octop/api/` 仅做 HTTP 适配；`src/octop/infra/` 为领域核心；`infra/db/repos/` 每表一个 repo 且只写参数化 SQL；`infra/utils/` 为无领域依赖的叶子工具，详见 [系统技术架构](system-architecture.md)。
- **状态字面量集合**：Agent `last_state` 包含 `running/failed/stopped/created`，`boot()` 仅跳过 `stopped`（`src/octop/infra/agents/manager.py:428-432`）；文档索引状态机见 [领域模型](../business/domain-models/index.md)。
- **国际化查找规则**：`tr("slash.catalog.help.label", locale)` 走点路径，缺失 key 直接 `raise KeyError`，目标 locale 未命中回落 `en`（`src/octop/i18n/loader.py:12,33-49`）；locale 解析优先级为「用户偏好 > explicit > metadata > 渠道提示」（`src/octop/infra/utils/locale.py:22-43`）。
- **凭据安全字面量**：错误翻译中识别 `api_key/bearer/token` 关键字并转成人类可读提示，不在日志回显密钥（如 `src/octop/infra/connectors/gateway/adapters/tencent_news.py:88-95`）；完整字典见 [错误码字典](../contracts/error-codes.md)。

## 4. 导航与维护

实体字段与公开 ID 规则见 [领域模型](../business/domain-models/index.md)，环境变量术语见 [配置手册](../contracts/configuration.md)，新增术语时同步 [业务架构](business-architecture.md) 与 [INDEX](../INDEX.md)。
