# Octop · Agent 知识库总路由表（INDEX）

> **Agent 读取规程（必读）**：
> 1. **禁止一次性全量读取 `.wally/docs/`**。先查下方「任务意图路由表」或「源码路径反向索引」，只打开命中的 1–3 篇目标文档（可用 `Read(limit=15)` 先看顶部 YAML 头确认 `source_paths`、`symbols` 与 `status`）。
> 2. **弱命中与草稿核验纪律**：标记 `status: draft` 的文档为源码提取草稿；从文档拿到 `路径:L起-L止`（`符号名`）、上下游字典结构与「共变耦合清单」后，执行修改前必须调用 `Read(path, offset, limit)` 复核源码字面实现（近邻词线索不等于原词覆盖）。
> 3. **人工精修保护**：标记 `origin: human` 或 `status: verified` 的页面为人工确认权威结论，后续重跑知识库严禁覆盖。基准提交：`chore/wally-init-20261125-c103` @ `1f99bda2d7fea2f00c4e1b247a4036131445f780`（FULL 模式生成，无被保护页）。

Octop 是单进程自托管多用户/多 Agent AI 平台：一个 Python wheel 内含 FastAPI/WS 接入（417 个入向路由）、Click CLI、React SPA 与 `infra/` 领域核心，控制面落 SQLite WAL 或 PostgreSQL，harness-agent / harness-gateway / harness-memory 为外部包。核心输入输出契约是 `HarnessAgentConfig`/`InboundMessage` 配置字典与 `{error:{code,message,details}}` 错误包络，所有业务入口最终归一为同一 harness turn。

---

## 1. 任务意图最短路由表（Agent Intent Router）

| Agent 当前待办任务类型 | 按序必读文档（1 → 2 → 3） |
|---|---|
| **上游加字段透传/组装给下游**（高频编排需求） | [参数组装与字段映射](integrations/topology-and-mapping.md) → `integrations/downstream/<目标下游>.md` → [入向接口参考](contracts/api-reference.md) |
| **新增/修改本仓对外接口或命令** | [入向接口参考](contracts/api-reference.md) → [API 接入组件](architecture/api-service.md) → [错误码字典](contracts/error-codes.md) |
| **对接新下游接口 / 修改下游返回解析** | [上下游集成总览](integrations/index.md) → `integrations/downstream/<目标下游>.md` → [错误码字典](contracts/error-codes.md) |
| **修改业务校验规则 / 状态流转逻辑** | [业务能力总表](business/index.md) → `business/<目标流程>.md` → [核心数据模型](business/domain-models/index.md) |
| **新增/修改定时任务或后台异步作业** | [异步任务组件](architecture/async-job-worker.md) → [配置与开关手册](contracts/configuration.md) → [排障 Runbook](operations/runbook-and-observability.md) |
| **定位报错 / 异常码 / 降级原因** | [错误码字典](contracts/error-codes.md) → [主干调用链全景](overview/callchain-panorama.md) → [排障 Runbook](operations/runbook-and-observability.md) |
| **跨模块重构 / 评估联动修改与跑单测** | [模块依赖矩阵](architecture/module-dep-matrix.md) → [高危雷区与历史陷阱](operations/pitfalls-and-adr.md) → [构建与单测映射](operations/dev-and-test.md) |
| **首次进入仓库 / 理解分层与启动** | [系统技术架构](overview/system-architecture.md) → [组件技术架构总表](architecture/index.md) → [认知边界声明](operations/boundary.md) |

---

## 2. 源码目录/核心文件 → 文档反向索引（Source-to-Doc Reverse Index）

> 当用户直接指定修改某个源码目录或文件时，由此表 O(1) 反查对应知识文档：

| 仓库源码路径（前缀或关键文件） | 架构模型 / 角色 | 首选关联文档 | 关联上下游/业务文档 |
|---|---|---|---|
| `src/octop/api/**`、`src/octop/api/app.py` | `API Service` | [api-service.md](architecture/api-service.md) | [api-reference.md](contracts/api-reference.md) |
| `src/octop/cli/**`、`src/octop/__main__.py` | `UI & CLI` | [ui-and-cli.md](architecture/ui-and-cli.md) | [api-reference.md](contracts/api-reference.md) |
| `src/octop/launch.py`、`src/octop/infra/server.py` | 装配根（Composition Root） | [system-architecture.md](overview/system-architecture.md) | [deployment-and-runtime.md](operations/deployment-and-runtime.md) |
| `src/octop/config.py`、`src/octop/i18n/**` | 配置与国际化 | [configuration.md](contracts/configuration.md) | [glossary.md](overview/glossary.md) |
| `src/octop/infra/agents/**` | `Core Engine` | [core-engine.md](architecture/core-engine.md) | [llm-providers.md](integrations/downstream/llm-providers.md) |
| `src/octop/infra/gateway/**` | `Core Engine`（消息管线） | [chat-turn.md](business/chat-turn.md) | [im-channels.md](integrations/downstream/im-channels.md) |
| `src/octop/infra/cron/**`、`proactive/**`、`backup/**` | `Async/Cron Worker` | [async-job-worker.md](architecture/async-job-worker.md) | [cron-and-proactive.md](business/cron-and-proactive.md) |
| `src/octop/infra/db/**`、`infra/backend/**` | `DAO & Adapter` | [data-and-adapter.md](architecture/data-and-adapter.md) | [domain-models/index.md](business/domain-models/index.md)、[storage-backends.md](integrations/downstream/storage-backends.md) |
| `src/octop/infra/connectors/**` | 下游封装（MCP） | [connectors-mcp.md](integrations/downstream/connectors-mcp.md) | [topology-and-mapping.md](integrations/topology-and-mapping.md) |
| `src/octop/infra/knowledge/**` | 下游封装（RAG） | [knowledge-rag.md](integrations/downstream/knowledge-rag.md) | [business/index.md](business/index.md) |
| `src/octop/infra/voice/**` | 下游封装（STT/TTS） | [voice-and-media.md](integrations/downstream/voice-and-media.md) | [error-codes.md](contracts/error-codes.md) |
| `src/octop/infra/{mobile,desktop,browser}/**` | 下游封装（设备桥） | [device-bridges.md](integrations/downstream/device-bridges.md) | [devices-and-media.md](contracts/api/devices-and-media.md) |
| `src/octop/infra/{users,auth,setup}/**` | 身份与安装 | [setup-and-auth.md](business/setup-and-auth.md) | [api/admin-and-setup.md](contracts/api/admin-and-setup.md) |
| `src/octop/infra/errors.py`、`metrics.py` | 错误与指标 | [error-codes.md](contracts/error-codes.md) | [runbook-and-observability.md](operations/runbook-and-observability.md) |
| `src/octop/infra/utils/**`、`trajectory/**`、`skills/**` | Tier 3 工具与支撑 | [architecture/index.md](architecture/index.md) | [pitfalls-and-adr.md](operations/pitfalls-and-adr.md) |
| `dashboard/**`、`src/octop/dashboard/`（构建产物） | `UI & CLI`（前端） | [ui-and-cli.md](architecture/ui-and-cli.md) | [deployment-and-runtime.md](operations/deployment-and-runtime.md) |
| `tests/**`、`conftest.py`、`.github/workflows/**` | 验证与 CI | [dev-and-test.md](operations/dev-and-test.md) | [boundary.md](operations/boundary.md) |
| `docker/**`、`fnos/**`、`scripts/**`、`docs/**`、`plugins/**` | 构建/部署/决策/示例 | [deployment-and-runtime.md](operations/deployment-and-runtime.md) | [pitfalls-and-adr.md](operations/pitfalls-and-adr.md) |
| `.wally/docs/{apis,sqls,unittest,integration_test,devops}/` | SOP 外部引用页（非 codewiki 管理页） | 本页第 5 节说明 | 权威来源为真实源码与配置 |

---

## 3. 模块技术能力清单（Component Registry）

| 组件标识 | 框架模型 | 核心源码路径 | 核心入口符号（`路径:行号`） | 上游调用方 | 下游依赖 | 文档 |
|---|---|---|---|---|---|---|
| `api-service` | `API Service` | `src/octop/api/` | `build_app` (`api/app.py:101`) | Dashboard / CLI / MCP Client | `infra/*` | [查看](architecture/api-service.md) |
| `cli-and-dashboard` | `UI & CLI` | `src/octop/cli/`、`dashboard/` | `cli` (`cli/main.py:83`) | 用户终端 | `api-service` | [查看](architecture/ui-and-cli.md) |
| `server-bootstrap` | 装配根 | `launch.py`、`infra/server.py` | `OctopServer.start` (`server.py:278`) | `octop run` | 全部单例 | [查看](overview/system-architecture.md) |
| `agent-runtime` | `Core Engine` | `infra/agents/` | `AgentManager.boot` (`agents/manager.py:417`) | gateway / api | harness-agent（外部） | [查看](architecture/core-engine.md) |
| `gateway-processor` | `Core Engine` | `infra/gateway/` | `GlobalProcessor.__call__` (`gateway/process/processor.py:517`) | api / channels / cron | agent-runtime | [查看](business/chat-turn.md) |
| `async-worker` | `Async/Cron Worker` | `infra/{cron,proactive,backup}/` | `CronManager.boot` (`cron/manager.py:75`) | server boot | gateway / agent | [查看](architecture/async-job-worker.md) |
| `data-and-adapter` | `DAO & Adapter` | `infra/db/`、`infra/backend/` | `build_shared_services` (`db/services.py:196`) | 全部领域模块 | SQLite/PG / 外部存储 | [查看](architecture/data-and-adapter.md) |
| `connectors-mcp` | `DAO & Adapter` | `infra/connectors/` | `handle_mcp_request` (`connectors/gateway/protocol.py:21`) | agent / api | 13 类外部工具 | [查看](integrations/downstream/connectors-mcp.md) |
| `knowledge-rag` | `Core Engine` | `infra/knowledge/` | `process_document` (`knowledge/jobs.py:34`) | api / middleware | Embedding/OCR | [查看](integrations/downstream/knowledge-rag.md) |
| `voice-and-media` | `DAO & Adapter` | `infra/voice/` | `VoiceManager.synthesize` (`voice/manager.py:92`) | api/voice | 6 类语音服务 | [查看](integrations/downstream/voice-and-media.md) |
| `device-bridges` | `DAO & Adapter` | `infra/{mobile,desktop,browser}/` | `find_adb` (`mobile/adb.py:22`) | 串流 WS | 宿主 CLI | [查看](integrations/downstream/device-bridges.md) |

---

## 4. 业务流程与下游依赖速查

- **全景认知**：[系统技术架构](overview/system-architecture.md) · [业务架构全景](overview/business-architecture.md) · [主干调用链全景](overview/callchain-panorama.md) · [领域术语与符号映射](overview/glossary.md)
- **上下游与契约**：[上下游集成总览](integrations/index.md) · [参数组装映射](integrations/topology-and-mapping.md) · [入向接口参考](contracts/api-reference.md) · [错误码字典](contracts/error-codes.md) · [配置手册](contracts/configuration.md)
- **业务与数据**：[业务流程总表](business/index.md) · [核心领域与数据模型](business/domain-models/index.md)
- **验证、雷区与边界**：[构建与单测映射](operations/dev-and-test.md) · [部署与运行时](operations/deployment-and-runtime.md) · [排障 Runbook](operations/runbook-and-observability.md) · [高危雷区与历史陷阱](operations/pitfalls-and-adr.md) · [认知边界声明](operations/boundary.md)

---

## 5. SOP 外部引用页（非 codewiki 管理页，仅链接不改写）

`.wally-init` 预置的流程脚手架与静态快照，权威来源始终是真实源码/配置；本套知识库不复制其正文、不为其添加 codewiki YAML 头，也**不计入** `.wiki-meta.json` 的 `pageOrder`：

| 路径 | 性质 |
|---|---|
| `.wally/docs/apis/index.md`、`_template.md` | API 契约模板（含 `<actual API>` 占位），权威来源为 `src/octop/api/routers/**` |
| `.wally/docs/sqls/README.md` | 库表/SQL 模板，权威来源为 `src/octop/infra/db/migrations/` |
| `.wally/docs/unittest/unittest.md` | 单测规范模板，权威来源为 `Makefile`/`pyproject.toml`/CI |
| `.wally/docs/integration_test/integration_test.md` | 静态初始化记录（标注 not executed），权威来源为 `tests/integration/` |
| `.wally/docs/devops/env.md`、`test-env-deploy.md` | 环境/部署静态快照（标注 static verification only），权威来源为 `docker/`、`docs/configuration.md` |
