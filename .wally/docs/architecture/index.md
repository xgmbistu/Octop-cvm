---
kind: component
scope: architecture-index
status: draft
origin: generated
source_paths: [src/octop, src/octop/api, src/octop/cli, src/octop/i18n, src/octop/infra, src/octop/infra/db, src/octop/infra/gateway, src/octop/infra/agents, src/octop/infra/connectors, src/octop/infra/knowledge, src/octop/infra/cron, src/octop/infra/setup, src/octop/infra/users, src/octop/infra/utils, dashboard/src, tests]
symbols: [build_app, OctopServer.start, SharedServices, GlobalProcessor, AgentManager, Gateway, CronManager]
upstream: [../INDEX.md, ../overview/system-architecture.md]
downstream: [module-dep-matrix.md, ../integrations/index.md, ../operations/boundary.md]
---

# 组件技术架构总表

按运行时框架模型（Archetype）汇总全仓全部技术模块；Tier 3 轻量工具表对仓库**全部顶层与二级源码目录**做零遗漏兜底归档，确保任何源码目录都能 O(1) 反查到知识页。组件分层与装配顺序见 [`../overview/system-architecture.md`](../overview/system-architecture.md)。

## 1. 全量核心组件矩阵（Tier 1 & Tier 2）

| 组件标识 | 框架模型（Archetype） | 源码路径 | 核心入口符号（路径:行号） | 技术能力与业务边界 | 直接上游 | 直接下游 | 详情文档 |
|---|---|---|---|---|---|---|---|
| `api-service` | API Service | `src/octop/api/` | `build_app` (`src/octop/api/app.py:101`) | 52 组 FastAPI 路由、JWT/Setup 中间件、SSE/WS、异常映射 | Dashboard / CLI / IM | `infra/` 编排层 | [api-service.md](api-service.md) |
| `cli` | UI & CLI | `src/octop/cli/` | `cli` (`src/octop/cli/main.py:115`) | Click 20 个顶层命令，Offline/Embedded/External 三态 | 用户终端 | `infra/`、`launch.py` | [cli.md](cli.md) |
| `dashboard-ui` | UI & CLI | `dashboard/src/` | `dashboard/src/api/request.ts` | React 18 + TS + Vite SPA，仅经 `/api` HTTP 通信 | 浏览器 | `api-service` | [dashboard-ui.md](dashboard-ui.md) |
| `agent-runtime` | Core Engine | `src/octop/infra/gateway/`、`infra/agents/` | `GlobalProcessor.__call__` (`src/octop/infra/gateway/process/processor.py:517`) | 统一消息处理、斜杠分发、HITL、harness 请求装配 | `api-service` / IM / Cron | `harness-agent` 黑盒 | [agent-runtime.md](agent-runtime.md) |
| `async-worker` | Async/Cron Worker | `src/octop/infra/cron/`、`infra/proactive/`、`infra/backup/` | `CronManager.boot` (`src/octop/infra/cron/manager.py:75`) | APScheduler、定时任务投递、主动关怀、自动备份 | `OctopServer.start` | `AgentManager.stream` | [async-worker.md](async-worker.md) |
| `data-and-adapter` | Data & Adapter | `src/octop/infra/db/`、`infra/backend/`、`infra/utils/` | `SqlitePool` (`src/octop/infra/db/pool.py:33`) | SQLite/PG 双驱动、23 repo、迁移、缓存/路径工具 | 全领域层 | 磁盘 / 外部对象存储 | [data-and-adapter.md](data-and-adapter.md) |
| `connectors` | Downstream Wrapper | `src/octop/infra/connectors/` | `probe_connector` (`src/octop/infra/connectors/probe.py:422`) | MCP/OAuth/CLI 网关与 14 个业务适配器 | `api/routers/connectors.py` | 外部 SaaS / MCP 服务 | [../integrations/index.md](../integrations/index.md) |
| `knowledge` | Core Engine | `src/octop/infra/knowledge/` | `process_document` (`src/octop/infra/knowledge/jobs.py:34`) | 分块、向量化、索引与检索上下文 | `api/routers/knowledge_bases.py` | Embedding 服务 | [../business/knowledge-indexing.md](../business/knowledge-indexing.md) |
| `setup` | API Service + Ops | `src/octop/infra/setup/` | `install_service` (`src/octop/infra/setup/service.py:560`) | 首启向导、systemd/launchd、TLS/ACME、自更新 | `launch.py`、`api/routers/setup.py` | OS 服务管理器 | [../business/setup-wizard.md](../business/setup-wizard.md) |
| `users` | Core Engine | `src/octop/infra/users/` | `UserManager` (`src/octop/infra/users/manager.py`) | 用户/角色/密码哈希/邀请/审计 | `api/routers/auth.py` | `user_repo` / `audit_repo` | [../overview/glossary.md](../overview/glossary.md) |
| `i18n` | Tier 2 Utility | `src/octop/i18n/` | `tr` (`src/octop/i18n/loader.py`) | `en`/`zh` 两套 JSON bundle + 域助手 | 全仓服务端文案 | `apiErrors.*` 前端镜像 | [../contracts/error-codes.md](../contracts/error-codes.md) |
| `devices` | UI & Stream | `src/octop/infra/browser/`、`desktop/`、`mobile/` | `src/octop/api/routers/browser/stream.py:326` | CDP 浏览器、桌面/移动推流、ADB | Dashboard | 宿主 OS / 容器 | [../contracts/api/devices-and-ops.md](../contracts/api/devices-and-ops.md) |

## 2. 轻量辅助模块归档表（Tier 3 Utilities — 零遗漏兜底）

> 下表逐一归档仓库全部顶层目录、二级源码目录与 `infra/` 子包；未映射源码目录 = `0`。外部权威文档（`docs/`、`docs/adr/`、`.wally/docs/apis|sqls|unittest|integration_test|devops/`）仅在 [`../INDEX.md`](../INDEX.md) 链接，不改写为 codewiki 模板。

| 源码目录 | 角色 | 核心内容 / 导出 | 归档去向 |
|---|---|---|---|
| `src/octop/` | Python 包根 | `config.py`、`launch.py`、`__main__.py` | [system-architecture.md](../overview/system-architecture.md) |
| `src/octop/api/` | HTTP 适配 | `app.py`、`deps.py`、`openapi_meta.py` | [api-service.md](api-service.md) |
| `src/octop/api/routers/` | 路由 | 52 组路由，含 `chat/`、`browser/`、`desktop/`、`mobile/` 子包 | [../contracts/api-reference.md](../contracts/api-reference.md) |
| `src/octop/api/middleware/` | 中间件 | `jwt_auth.py`、`setup_lockdown.py` | [api-service.md](api-service.md) |
| `src/octop/api/common/` | 路由公共件 | `agent.py`、`workspace.py`、`attachments.py` | [api-service.md](api-service.md) |
| `src/octop/cli/` | CLI | `main.py`、`registry.py`、`commands/`、`support/`、`repl/` | [cli.md](cli.md) |
| `src/octop/i18n/` | 本地化 | `loader.py`、`en.json`、`zh.json`、`domains/` | [../contracts/error-codes.md](../contracts/error-codes.md) |
| `src/octop/infra/` | 领域核心 | 20 个子包（下表逐项） | [module-dep-matrix.md](module-dep-matrix.md) |
| `src/octop/infra/agents/` | Agent 运行时 | `manager.py`、`providers/`、`experts/`、`plugins/`、`subagents/`、`middleware/` | [agent-runtime.md](agent-runtime.md) |
| `src/octop/infra/auth/` | SSO/OIDC | `sso/discovery.py`、`id_token.py`、`service.py` | [../integrations/downstream/oidc-provider.md](../integrations/downstream/oidc-provider.md) |
| `src/octop/infra/backend/` | 工作区后端 | `resolver.py`、`adapter.py`、`probe.py` | [../integrations/downstream/storage-backend.md](../integrations/downstream/storage-backend.md) |
| `src/octop/infra/backup/` | 备份 | `snapshot.py`、`auto.py`、`chats.py`、`system_archive.py` | [async-worker.md](async-worker.md) |
| `src/octop/infra/browser/` | 浏览器 | `setup.py`、`src/octop/infra/utils/bwrap.py` | [../contracts/api/devices-and-ops.md](../contracts/api/devices-and-ops.md) |
| `src/octop/infra/connectors/` | 连接器 | `catalog.py`、`builder.py`、`gateway/adapters/`、`oauth/` | [../integrations/index.md](../integrations/index.md) |
| `src/octop/infra/cron/` | 定时 | `manager.py`、`job.py`、`trigger.py`、`delivery.py` | [async-worker.md](async-worker.md) |
| `src/octop/infra/db/` | 持久化 | `pool.py`、`migrate.py`、`migrations/`、`repos/`、`services.py` | [data-and-adapter.md](data-and-adapter.md) |
| `src/octop/infra/desktop/` | 桌面 | `setup.py`、`capture.py`、`input.py` | [../contracts/api/devices-and-ops.md](../contracts/api/devices-and-ops.md) |
| `src/octop/infra/gateway/` | IM/消息处理 | `gateway.py`、`process/`、`threads.py`、`slash/`、`bot_creators/`、`media/` | [agent-runtime.md](agent-runtime.md) |
| `src/octop/infra/knowledge/` | 知识库 | `service.py`、`jobs.py`、`retrieve.py`、`embed.py`、`ocr.py`、`chunk.py` | [../business/knowledge-indexing.md](../business/knowledge-indexing.md) |
| `src/octop/infra/mobile/` | 移动端 | `adb.py`、`docker_install.py`、`setup.py` | [../contracts/api/devices-and-ops.md](../contracts/api/devices-and-ops.md) |
| `src/octop/infra/proactive/` | 主动关怀 | `scheduler.py` | [async-worker.md](async-worker.md) |
| `src/octop/infra/providers/` | 凭据 | `codex_oauth.py` | [../integrations/downstream/llm-provider.md](../integrations/downstream/llm-provider.md) |
| `src/octop/infra/setup/` | 安装/服务/TLS | `service.py`、`wizard_tokens.py`、`password_file.py`、`tls/`、`self_update.py` | [../business/setup-wizard.md](../business/setup-wizard.md) |
| `src/octop/infra/skills/` | 技能市场 | `skills_hub.py`、`skillhub_market.py` | [../business/index.md](../business/index.md) |
| `src/octop/infra/trajectory/` | 轨迹 | `projector.py`、`service.py` | [../business/chat-sse-and-hitl.md](../business/chat-sse-and-hitl.md) |
| `src/octop/infra/users/` | 用户 | `manager.py`、`identity.py`、`invites.py` | [../overview/glossary.md](../overview/glossary.md) |
| `src/octop/infra/utils/` | 纯工具 | `host_dirs.py`、`locale.py`、`doc_edit.py`、`docker_env.py`、`runtime_packages.py` | [data-and-adapter.md](data-and-adapter.md) |
| `src/octop/infra/voice/` | 语音 | `adapters.py`、`manager.py` | [../integrations/downstream/voice-provider.md](../integrations/downstream/voice-provider.md) |
| `dashboard/` | 前端源码 | `src/`、`public/`、`scripts/`、`package.json`、`vite.config` | [dashboard-ui.md](dashboard-ui.md) |
| `desktop/` | 桌面客户端 | Wails v3 `src/`、`portable/`、`package-*.sh` | [../operations/deployment-and-runtime.md](../operations/deployment-and-runtime.md) |
| `docker/` | 容器资产 | `Dockerfile`、`docker-compose*.yml`、`docker-entrypoint.sh`、`postgres/` | [../operations/deployment-and-runtime.md](../operations/deployment-and-runtime.md) |
| `docs/` | 人工权威文档 | `architecture.md`、`api.md`、`cli.md`、`configuration.md`、`adr/` | [../operations/boundary.md](../operations/boundary.md) |
| `fnos/` | NAS 打包 | `docker/`、`native/`、`.fpk` 构建 | [../operations/deployment-and-runtime.md](../operations/deployment-and-runtime.md) |
| `plugins/` | 示例插件包 | 6 个 `demo-*`/`bilibili-anime`/`server-status` | [../operations/boundary.md](../operations/boundary.md) |
| `scripts/` | 安装/发布脚本 | `install.sh`、`install.ps1`、`install.bat`、`fnos/`、`wheel_build.sh` | [../operations/dev-and-test.md](../operations/dev-and-test.md) |
| `tests/` | 测试 | `unit/`、`integration/`、`live/`、`support/`、`fixtures/`、`conftest.py` | [../operations/dev-and-test.md](../operations/dev-and-test.md) |

## 2.1 二级源码目录逐项归档（零遗漏对账）

> 下表逐一登记仓库全部顶层目录的直接子目录（二级源码目录），用于 G2 覆盖率对账；未映射二级目录 = `0`。`src/octop/` 下的三级子包见第 2 节表格。

| 二级源码目录 | 角色 | 归档去向 |
|---|---|---|
| `dashboard/public/` | PWA 清单、离线页、音频处理器 | [dashboard-ui.md](dashboard-ui.md) |
| `dashboard/scripts/` | 前端构建辅助脚本 | [dashboard-ui.md](dashboard-ui.md) |
| `dashboard/src/` | React/TS 主源码（api/hooks/pages/components/locales/…） | [dashboard-ui.md](dashboard-ui.md) |
| `desktop/portable/` | 桌面绿色版打包资产 | [../operations/deployment-and-runtime.md](../operations/deployment-and-runtime.md) |
| `desktop/src/` | Wails v3 Go 桌面壳 | [../operations/deployment-and-runtime.md](../operations/deployment-and-runtime.md) |
| `docker/postgres/` | pgvector 初始化 SQL | [../operations/deployment-and-runtime.md](../operations/deployment-and-runtime.md) |
| `docs/adr/` | 人工 ADR（001/002） | [../operations/boundary.md](../operations/boundary.md) |
| `docs/assets/` | README 图片资产 | [../operations/boundary.md](../operations/boundary.md) |
| `fnos/docker/` | FnOS Docker 版打包 | [../operations/deployment-and-runtime.md](../operations/deployment-and-runtime.md) |
| `fnos/native/` | FnOS 原生版打包 | [../operations/deployment-and-runtime.md](../operations/deployment-and-runtime.md) |
| `plugins/bilibili-anime/` | 示例插件包 | [../operations/boundary.md](../operations/boundary.md) |
| `plugins/demo-greeting-skill/` | 示例技能插件 | [../operations/boundary.md](../operations/boundary.md) |
| `plugins/demo-toolkit/` | 示例工具插件 | [../operations/boundary.md](../operations/boundary.md) |
| `plugins/demo-turn-logger/` | 示例轮次日志插件 | [../operations/boundary.md](../operations/boundary.md) |
| `plugins/demo-ui-card/` | 示例 UI 卡片插件 | [../operations/boundary.md](../operations/boundary.md) |
| `plugins/server-status/` | 示例服务状态插件 | [../operations/boundary.md](../operations/boundary.md) |
| `scripts/fnos/` | FnOS 打包脚本 | [../operations/deployment-and-runtime.md](../operations/deployment-and-runtime.md) |
| `src/octop/` | Python 包根（api/cli/i18n/infra + config.py/launch.py） | [../overview/system-architecture.md](../overview/system-architecture.md) |
| `tests/fixtures/` | 测试夹具（plugins/echo-tool） | [../operations/dev-and-test.md](../operations/dev-and-test.md) |
| `tests/integration/` | 集成测试与 conftest | [../operations/dev-and-test.md](../operations/dev-and-test.md) |
| `tests/live/` | 需真实凭据的 live 测试 | [../operations/dev-and-test.md](../operations/dev-and-test.md) |
| `tests/support/` | fakes/auth/http/scenarios/app 共享支撑 | [../operations/dev-and-test.md](../operations/dev-and-test.md) |
| `tests/unit/` | 22 个按模块划分的单测子目录 | [../operations/dev-and-test.md](../operations/dev-and-test.md) |

## 3. 组件模型分类与修改路由

- **API 服务**（`api-service`）：改路由/鉴权 → [`../contracts/api-reference.md`](../contracts/api-reference.md) → [`../contracts/error-codes.md`](../contracts/error-codes.md)。
- **定时与异步 Worker**（`async-worker`）：改触发器/状态 → [`../business/cron-automation.md`](../business/cron-automation.md) → [`../contracts/configuration.md`](../contracts/configuration.md)。
- **核心引擎**（`agent-runtime`、`knowledge`）：改处理管线 → [`../overview/callchain-panorama.md`](../overview/callchain-panorama.md) → [`../business/message-processing.md`](../business/message-processing.md)。
- **DAO 与传输底座**（`data-and-adapter`）：改表/迁移 → [`data-and-adapter.md`](data-and-adapter.md) → [`../business/domain-models/index.md`](../business/domain-models/index.md)。
- **UI/CLI**（`dashboard-ui`、`cli`）：改交互 → [`../contracts/api-reference.md`](../contracts/api-reference.md) → [`../operations/dev-and-test.md`](../operations/dev-and-test.md)。

## 4. 共变耦合与修改清单（Co-Change Playbook）

- **新增源码目录**：必须同时在第 2 节 Tier 3 表、第 2.1 节二级目录对账表与 `.wiki-meta.json` 的 `moduleTree` 登记，未映射目录保持为 `0`；目录职责变化时同步 [`module-dep-matrix.md`](module-dep-matrix.md) 调用边。
- **新增组件**：在第 1 节矩阵登记框架模型（Archetype）→ 写对应 `architecture/<comp>.md` → 回 [`../INDEX.md`](../INDEX.md) 第 2/3 节补反向索引 → 跑 [`../operations/dev-and-test.md`](../operations/dev-and-test.md) 的模块必跑映射。
- **拆分/合并组件页**：目录嵌套深度不得超过 2 层；改页名须同步 `pageOrder`、全站相对链接与 `fileToDocs`。
