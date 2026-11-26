# Octop · Agent 知识库总路由表（INDEX）

> **Agent 读取规程（必读）**：
> 1. **禁止一次性全量读取 `.wally/docs/`**。先查下方「任务意图最短路由表」或「源码路径反向索引表」，只打开命中的 1–3 篇目标文档（可用 `Read(limit=15)` 先看顶部 8 键 YAML 头确认 `source_paths`、`symbols` 与 `status`）。
> 2. **弱命中与草稿核验纪律**：标记 `status: draft` 的文档为源码提取草稿；从文档拿到 `路径:行号`（`符号名`）、上下游字典结构与「共变耦合与修改清单」后，执行修改前必须调用 `Read(path, offset, limit)` 复核源码字面实现（近邻词线索不等于原词覆盖）。
> 3. **人工精修保护**：标记 `origin: human` 或 `status: verified` 的页面为人工确认权威结论，后续重跑知识库严禁覆盖。基准提交：`chore/wally-init-20261126-c113` @ `79d7a7f42859317b967ad991650dc1846fe24900`；本次 `FULL` 生成未发现受保护页面。
> 4. **外部权威页**：`apis/`、`sqls/`、`unittest/`、`integration_test/`、`devops/` 及 `docs/*.md` 为 SOP/人工参考页，仅链接、不改写、不计入 codewiki 管理页集合（见本文第 5 节）。

Octop 是单进程自托管 AI 助手：FastAPI + uvicorn 承载 Web/HTTP/SSE/WS 与 IM 通道，Click 提供离线/嵌入/外部三态 CLI，全部状态重建于 `~/.octop/octop.db`（SQLite WAL 或 PostgreSQL）。全仓登记 **422** 条入向接口、**91** 个 `ErrorCode`、**81** 个环境变量、**16** 类外部下游系统；`harness-*` 运行时为仓外黑盒，本套文档只记录本仓组装的边界字典与返回解包键。

---

## 1. 任务意图最短路由表（Agent Intent Router）

| Agent 当前待办任务类型 | 按序必读文档（1 → 2 → 3） |
|---|---|
| **上游加字段透传/组装给下游**（高频编排需求） | [参数组装与字段映射](integrations/topology-and-mapping.md) → `integrations/downstream/<目标下游>.md` → [入向接口参考](contracts/api-reference.md) |
| **新增/修改本仓对外接口或命令** | [入向接口参考](contracts/api-reference.md) → [API 服务架构](architecture/api-service.md) → [错误码字典](contracts/error-codes.md) |
| **对接新下游接口 / 修改下游返回解析** | [上下游集成总览](integrations/index.md) → `integrations/downstream/<目标下游>.md` → [错误码字典](contracts/error-codes.md) |
| **修改业务校验规则 / 状态流转逻辑** | [业务能力总表](business/index.md) → `business/<目标流程>.md` → [核心数据模型](business/domain-models/index.md) |
| **新增/修改定时任务或后台异步队列** | [异步 Worker 架构](architecture/async-worker.md) → [配置与开关手册](contracts/configuration.md) → [排障 Runbook](operations/runbook-and-observability.md) |
| **定位报错 / 异常码 / 降级原因** | [错误码字典](contracts/error-codes.md) → [主干调用链全景](overview/callchain-panorama.md) → [排障 Runbook](operations/runbook-and-observability.md) |
| **跨模块重构 / 评估联动修改与跑单测** | [模块依赖矩阵](architecture/module-dep-matrix.md) → [高危雷区与历史陷阱](operations/pitfalls-and-adr.md) → [构建与单测映射](operations/dev-and-test.md) |
| **改数据库表 / 迁移 / repo** | [数据模型总览](business/domain-models/index.md) → [数据与底座架构](architecture/data-and-adapter.md) → [构建与单测映射](operations/dev-and-test.md) |
| **理解首次安装 / 登录鉴权** | [安装向导流程](business/setup-wizard.md) → [系统技术架构](overview/system-architecture.md) → [OIDC 契约](integrations/downstream/oidc-provider.md) |

---

## 2. 源码目录/核心文件 → 文档反向索引（Source-to-Doc Reverse Index）

> 当用户直接指定修改某个源码目录或文件时，由此表 O(1) 反查对应知识文档；完整目录归档见 [组件技术架构总表](architecture/index.md) 第 2 节（未映射源码目录 = `0`）。

| 仓库源码路径（前缀或关键文件） | 架构模型 / 角色 | 首选关联文档 | 关联上下游/业务文档 |
|---|---|---|---|
| `src/octop/api/`、`src/octop/api/routers/` | `API Service` | [architecture/api-service.md](architecture/api-service.md) | [contracts/api-reference.md](contracts/api-reference.md) |
| `src/octop/config.py`、`launch.py`、`infra/server.py` | `Composition Root` | [overview/system-architecture.md](overview/system-architecture.md) | [contracts/configuration.md](contracts/configuration.md) |
| `src/octop/cli/`、`cli/commands/` | `UI-CLI` | [architecture/cli.md](architecture/cli.md) | [contracts/api-reference.md](contracts/api-reference.md) |
| `dashboard/src/`、`dashboard/src/api/` | `UI-CLI` | [architecture/dashboard-ui.md](architecture/dashboard-ui.md) | [contracts/api-reference.md](contracts/api-reference.md) |
| `src/octop/infra/gateway/`、`infra/agents/` | `Core Engine` | [architecture/agent-runtime.md](architecture/agent-runtime.md) | [business/message-processing.md](business/message-processing.md) |
| `src/octop/infra/cron/`、`proactive/`、`backup/` | `Async/Cron Worker` | [architecture/async-worker.md](architecture/async-worker.md) | [business/cron-automation.md](business/cron-automation.md) |
| `src/octop/infra/db/`、`infra/backend/`、`infra/utils/` | `Data & Adapter` | [architecture/data-and-adapter.md](architecture/data-and-adapter.md) | [business/domain-models/index.md](business/domain-models/index.md) |
| `src/octop/infra/connectors/gateway/adapters/` | `Downstream Wrapper` | [integrations/downstream/connector-adapters.md](integrations/downstream/connector-adapters.md) | [integrations/index.md](integrations/index.md) |
| `src/octop/infra/agents/providers/probe.py` | `Downstream Wrapper` | [integrations/downstream/llm-provider.md](integrations/downstream/llm-provider.md) | [integrations/topology-and-mapping.md](integrations/topology-and-mapping.md) |
| `src/octop/infra/voice/adapters.py` | `Downstream Wrapper` | [integrations/downstream/voice-provider.md](integrations/downstream/voice-provider.md) | [contracts/error-codes.md](contracts/error-codes.md) |
| `src/octop/infra/knowledge/`、`infra/auth/sso/` | `Core Engine / Downstream` | [business/knowledge-indexing.md](business/knowledge-indexing.md) | [integrations/downstream/oidc-provider.md](integrations/downstream/oidc-provider.md) |
| `src/octop/infra/gateway/bot_creators/` | `Downstream Wrapper` | [integrations/downstream/feishu-channel.md](integrations/downstream/feishu-channel.md) | [integrations/index.md](integrations/index.md) |
| `src/octop/infra/errors.py`、`i18n/` | `Error Dict` | [contracts/error-codes.md](contracts/error-codes.md) | [contracts/configuration.md](contracts/configuration.md) |
| `docker/`、`desktop/`、`fnos/`、`scripts/` | `Deployment` | [operations/deployment-and-runtime.md](operations/deployment-and-runtime.md) | [operations/dev-and-test.md](operations/dev-and-test.md) |
| `tests/`、`pyproject.toml`、`Makefile`、`.github/workflows/` | `Verification` | [operations/dev-and-test.md](operations/dev-and-test.md) | [operations/runbook-and-observability.md](operations/runbook-and-observability.md) |
| `docs/`、`docs/adr/` | `Human Reference` | [operations/boundary.md](operations/boundary.md) | [operations/pitfalls-and-adr.md](operations/pitfalls-and-adr.md) |

---

## 3. 模块技术能力清单（Component Registry）

| 组件标识 | 框架模型（Archetype） | 核心源码路径 | 核心入口符号（`路径:行号`） | 上游调用方 | 下游依赖 | 文档 |
|---|---|---|---|---|---|---|
| `api-service` | `API Service` | `src/octop/api/` | `build_app` (`src/octop/api/app.py:101`) | Dashboard / IM / CLI | `infra/` | [查看](architecture/api-service.md) |
| `cli` | `UI-CLI` | `src/octop/cli/` | `cli` (`src/octop/cli/main.py:115`) | 用户终端 | `infra/`、`launch.py` | [查看](architecture/cli.md) |
| `dashboard-ui` | `UI-CLI` | `dashboard/src/` | `request.ts` (`dashboard/src/api/request.ts`) | 浏览器 | `/api` HTTP | [查看](architecture/dashboard-ui.md) |
| `agent-runtime` | `Core Engine` | `src/octop/infra/gateway/` | `GlobalProcessor.__call__` (`src/octop/infra/gateway/process/processor.py:517`) | API / IM / Cron | harness 黑盒 | [查看](architecture/agent-runtime.md) |
| `async-worker` | `Async Worker` | `src/octop/infra/cron/` | `CronManager.boot` (`src/octop/infra/cron/manager.py:75`) | `OctopServer.start` | `AgentManager.stream` | [查看](architecture/async-worker.md) |
| `data-and-adapter` | `Data & Adapter` | `src/octop/infra/db/` | `SqlitePool` (`src/octop/infra/db/pool.py:33`) | 全领域层 | SQLite / PG | [查看](architecture/data-and-adapter.md) |
| `connectors` | `Downstream Wrapper` | `src/octop/infra/connectors/` | `probe_connector` (`src/octop/infra/connectors/probe.py:422`) | `api/routers/connectors.py` | 外部 SaaS / MCP | [查看](integrations/index.md) |
| `knowledge` | `Core Engine` | `src/octop/infra/knowledge/` | `process_document` (`src/octop/infra/knowledge/jobs.py:34`) | 文档上传 | Embedding 服务 | [查看](business/knowledge-indexing.md) |
| `devices` | `UI & Stream` | `src/octop/infra/browser|desktop|mobile/` | `src/octop/api/routers/browser/stream.py:326` | Dashboard | 宿主 OS / 容器 | [查看](contracts/api/devices-and-ops.md) |

---

## 4. 业务流程与下游依赖速查

- **全景认知**：[系统技术架构](overview/system-architecture.md) · [业务架构全景](overview/business-architecture.md) · [主干调用链全景](overview/callchain-panorama.md) · [领域术语与符号映射](overview/glossary.md)
- **组件与依赖**：[组件架构总表](architecture/index.md) · [模块依赖矩阵](architecture/module-dep-matrix.md)
- **上下游与契约**：[上下游集成总览](integrations/index.md) · [参数组装映射](integrations/topology-and-mapping.md) · 16 篇 [`integrations/downstream/`](integrations/index.md) 逐系统字典契约 · [入向接口参考](contracts/api-reference.md)（含 8 张 `contracts/api/` 分组子页）· [错误码字典](contracts/error-codes.md) · [配置手册](contracts/configuration.md)
- **业务与数据**：[业务流程总表](business/index.md)（`WF-01`～`WF-05`）· [核心领域与数据模型](business/domain-models/index.md)
- **验证、雷区与边界**：[构建与单测映射](operations/dev-and-test.md) · [部署与运行时](operations/deployment-and-runtime.md) · [排障 Runbook](operations/runbook-and-observability.md) · [高危雷区与历史陷阱](operations/pitfalls-and-adr.md) · [认知边界声明](operations/boundary.md)

---

## 5. 外部权威页与 SOP 引用（不计入 codewiki 管理页）

> 按 Mode B 增量规范，以下页面属于 SOP 专用或人工编写的外部权威文档，**仅在 INDEX 链接，不复制正文、不改写为 codewiki 模板、不计入 `pageOrder`/`pageCount`**（排除理由见 [认知边界声明](operations/boundary.md) 第 4 节）。

| 外部页 | 用途 |
|---|---|
| [.wally/docs/apis/index.md](apis/index.md)、[apis/_template.md](apis/_template.md) | SOP API 索引与模板 |
| [.wally/docs/sqls/README.md](sqls/README.md) | SOP 数据库/SQL 文档模板 |
| [.wally/docs/unittest/unittest.md](unittest/unittest.md) | SOP 单测规范模板 |
| [.wally/docs/integration_test/integration_test.md](integration_test/integration_test.md) | IT 静态验证指南（`.wally/config.json` 的 `it.guide`） |
| [.wally/docs/devops/env.md](devops/env.md)、[devops/test-env-deploy.md](devops/test-env-deploy.md) | 环境与测试部署指南（`deploy.guide`） |
| `docs/architecture.md`、`docs/api.md`、`docs/cli.md`、`docs/configuration.md`、`docs/acp.md`、`docs/personas.md`、`docs/adr/*` | 人工编写的产品/架构/API/ADR 参考文档 |

本套 codewiki 管理页共 **56** 篇（含本 `INDEX.md`），与 `.wiki-meta.json` 的 `pageOrder` 1:1 对齐；全站 `TARGET_LANG = zh-CN`，新建/修改业务代码前请按第 1 节规程回读源码字面核验。
