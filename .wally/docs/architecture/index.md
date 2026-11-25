---
kind: component
scope: architecture-index
status: draft
origin: generated
source_paths: [src/octop/api, src/octop/cli, src/octop/infra, src/octop/i18n, src/octop/config.py, dashboard, tests, plugins, docker, fnos, scripts, docs]
symbols: [build_app, cli, OctopServer, AgentManager, GlobalProcessor, SharedServices]
upstream: [INDEX.md, overview/system-architecture.md]
downstream: [architecture/module-dep-matrix.md, architecture/api-service.md]
---

# 组件技术架构总表

按运行时框架模型归类全仓模块，并把不单独成篇的 Tier 3 工具/目录完整归档，确保顶层与二级源码目录 100% 有路由入口（未映射目录 = 0）。

## 1. 全量核心组件矩阵（Tier 1 & Tier 2）

| 组件标识 | 框架模型 | 源码路径 | 核心入口符号（`路径:行号`） | 技术能力与边界 | 上游 | 下游 | 详情文档 |
|---|---|---|---|---|---|---|---|
| `api-service` | `API Service` | `src/octop/api/` | `build_app` (`api/app.py:101`) | 417 入向路由、JWT/lockdown 中间件、WS/SSE/MCP | Dashboard/CLI/外部 | `infra/*` | [`api-service.md`](api-service.md) |
| `cli-and-dashboard` | `UI & CLI` | `src/octop/cli/`、`dashboard/` | `cli` (`cli/main.py:83`)、`request` (`dashboard/src/api/request.ts:298`) | 20 顶层命令 + React SPA，CLI 三传输层 | 用户终端 | `api-service` | [`ui-and-cli.md`](ui-and-cli.md) |
| `server-bootstrap` | `Core Engine`（装配） | `src/octop/launch.py`、`infra/server.py` | `run_foreground` (`launch.py:56`)、`OctopServer.start` (`server.py:278`) | 单进程装配、双监听 TLS、日志轮转 | CLI `octop run` | 全部单例 | [`system-architecture.md`](../overview/system-architecture.md) |
| `agent-runtime` | `Core Engine` | `src/octop/infra/agents/` | `AgentManager.boot` (`agents/manager.py:417`) | Agent 生命周期、provider 解析、工具/中间件装配 | gateway/api | harness-agent（外部） | [`core-engine.md`](core-engine.md) |
| `gateway-processor` | `Core Engine`（消息管线） | `src/octop/infra/gateway/` | `GlobalProcessor.__call__` (`gateway/process/processor.py:517`) | IM/WS 归一、slash 分派、流投影 | api/channels/cron | agent-runtime | [`chat-turn.md`](../business/chat-turn.md) |
| `async-worker` | `Async/Cron Worker` | `src/octop/infra/cron/`、`proactive/`、`backup/`、`setup/tls/renewal.py` | `CronManager.boot` (`cron/manager.py:75`) | APScheduler 单进程调度、备份/TLS 系统任务 | server boot | gateway/agent | [`async-job-worker.md`](async-job-worker.md) |
| `data-and-adapter` | `DAO & Adapter` | `src/octop/infra/db/`、`infra/backend/` | `SharedServices` (`db/services.py:93`)、`row_to_backend_spec` (`backend/adapter.py:44`) | SQLite/PG 双引擎、24 repo、workspace spec | 全部领域模块 | 磁盘/外部存储 | [`data-and-adapter.md`](data-and-adapter.md) |
| `connectors-mcp` | `DAO & Adapter`（下游封装） | `src/octop/infra/connectors/` | `handle_mcp_request` (`connectors/gateway/protocol.py:21`) | 13 类外部工具、OAuth、凭证加密 | agent/api | 外部 HTTP/CLI | [`connectors-mcp.md`](../integrations/downstream/connectors-mcp.md) |
| `knowledge-rag` | `Core Engine`（检索） | `src/octop/infra/knowledge/` | `process_document` (`knowledge/jobs.py:34`) | parse/chunk/embed/向量检索/citation | api/middleware | Embedding/OCR | [`knowledge-rag.md`](../integrations/downstream/knowledge-rag.md) |
| `auth-and-setup` | `API + Engine` | `src/octop/infra/users/`、`auth/`、`setup/` | `UserManager` (`users/manager.py`)、`setup_finish` (`api/routers/setup.py:412`) | JWT/OIDC/向导/密码文件 | api | DB/secrets | [`setup-and-auth.md`](../business/setup-and-auth.md) |
| `voice-and-media` | `DAO & Adapter` | `src/octop/infra/voice/` | `VoiceManager.synthesize` (`voice/manager.py:92-183`) | 6 类 STT/TTS 请求字典 | api/voice | 外部语音服务 | [`voice-and-media.md`](../integrations/downstream/voice-and-media.md) |
| `device-bridges` | `DAO & Adapter` | `src/octop/infra/mobile/`、`desktop/`、`browser/` | `find_adb` (`mobile/adb.py:22`)、`capture_frame` (`desktop/capture.py:158`) | ADB/xdotool/Playwright 子进程桥 | api stream WS | 宿主 CLI | [`device-bridges.md`](../integrations/downstream/device-bridges.md) |
| `config-i18n` | `Cross-cutting` | `src/octop/config.py`、`src/octop/i18n/` | `load_config` (`config.py:394`)、`tr` (`i18n/loader.py:44`) | 环境变量覆盖、语言包与 locale 解析 | 全仓 | 本地 JSON | [`configuration.md`](../contracts/configuration.md)、[`glossary.md`](../overview/glossary.md) |

## 2. 轻量辅助模块归档表（Tier 3 Utilities — 零遗漏兜底）

| 源码路径 | 核心导出函数 / 类 / 常量 | 调用方模块 | 职责 |
|---|---|---|---|
| `src/octop/infra/utils/paths.py` | `PathLayout.from_env` (`:17`) | `server.py`、`cli/*`、`backup/*` | `~/.octop` 目录树与关键文件路径 |
| `src/octop/infra/utils/env_file.py` | `apply_env_file` (`:87`)、`SEARCH_ENV_KEYS` (`:24-32`) | `server.py:287-289` | `env` 文件 parse/save/overlay，保护 `OCTOP_*` |
| `src/octop/infra/utils/locale.py` | `resolve_locale` (`:22-43`)、`resolve_request_locale` (`:75-83`) | i18n/gateway/api | 用户偏好 > explicit > metadata > 渠道提示 |
| `src/octop/infra/utils/ulid.py` | ULID 生成 | `threads.py:388`、资源 ID | 公开字符串 ID |
| `src/octop/infra/utils/bwrap.py` | `ensure_bubblewrap`、`degraded` (`:182,189,196,209`) | `launch.py:16-40` | Linux bubblewrap 后台 provisioning |
| `src/octop/infra/utils/docker_env.py` | Docker 环境探测、`degraded` (`:359,376`) | `backend/*`、`mobile/*` | Docker 可用性判定 |
| `src/octop/infra/utils/ssrf_guard.py` | SSRF 校验 | `connectors/oauth/*`、`filesystem.py` | 阻止非白名单主机访问 |
| `src/octop/infra/utils/subprocess_io.py` / `_win.py` | 子进程抽水与 Windows 兼容 | `connectors/gateway/*`、`mobile/*` | 防管道阻塞 |
| `src/octop/infra/utils/host_dirs.py` | POSIX 宿主目录拒绝前缀 | `filesystem.py`、`workspace.py` | 路径越界防护 |
| `src/octop/infra/utils/frontmatter.py` / `doc_edit.py` / `llm_text.py` | 文本解析辅助 | `knowledge/*`、`skills/*` | 文档与模型输出处理 |
| `src/octop/infra/utils/browser_media.py` | `configure_browser_idle_timeout`、媒体目录 env | `server.py:362` | 浏览器空闲与截图目录 |
| `src/octop/infra/utils/ollama_manager.py` / `runtime_packages.py` | Ollama 服务与运行时包探测 | `ollama_models.py`、`desktop/setup.py` | 外部运行时管理 |
| `src/octop/infra/metrics.py` | `METRICS` (`:9-37`) | `cron/job.py`、`processor.py`、`admin.py` | 进程内计数器 |
| `src/octop/infra/errors.py` | `ErrorCode` (`:13-104`)、`OctopError` (`:202-247`) | 全仓 | 统一错误码与 i18n 包络 |
| `src/octop/infra/trajectory/` | `TrajectoryService` (`service.py:46`) | `processor.py`、`chat/trajectory.py` | turn 事件流记录与回放 |
| `src/octop/infra/skills/` | `skills_hub.py`、`skill_packages.py` | `api/routers/skills.py`、`skill_packages.py` | 技能包与 SkillHub 交互 |
| `src/octop/infra/providers/` | `codex_apply.py`、`codex_oauth.py` | `api/routers/providers.py:401` | Codex OAuth 兼容 |
| `src/octop/i18n/domains/` | 8 个 namespace helper | 全仓用户可见文案 | 错误/工具/渠道/slash 文案 |
| `tests/` | `conftest.py`、`support/fakes.py`、`integration/conftest.py` | 全仓测试 | 隔离 HOME、FakeHarness、patch_harness |
| `docs/`、`docker/`、`fnos/`、`scripts/`、`.github/workflows/`、`plugins/` | 架构/API/ADR、Docker/fnOS 构建、CI、示例插件 | 运维与发布 | 见 [`deployment-and-runtime.md`](../operations/deployment-and-runtime.md)、[`boundary.md`](../operations/boundary.md) |
| `.wally/docs/{apis,sqls,unittest,integration_test,devops}/` | SOP 外部引用页 | 流程脚手架 | 由 `wally-init` 预置，非 codewiki 管理页，见 [`INDEX.md`](../INDEX.md) |

**覆盖对账**：`src/octop/` 全部 20 个二级目录/文件已归档；`dashboard/`、`tests/`、`docker/`、`fnos/`、`scripts/`、`plugins/`、`docs/`、`.github/` 均有归属，未映射源码目录 = 0。

## 3. 导航与维护

组件依赖边与爆炸半径见 [模块依赖矩阵](module-dep-matrix.md)；入向接口与协议见 [API 参考](../contracts/api-reference.md)；外部黑盒边界见 [认知边界声明](../operations/boundary.md)。新增模块时必须同步本表、[系统架构](../overview/system-architecture.md) 与 [INDEX](../INDEX.md)。

## 4. 验证与门禁对账

本表的目录覆盖由 G2「源码目录零遗漏」核验；组件页的入口符号由 G3 抽检 `path:line` 锚定；本页与各组件页的链接由 G1 元数据双射校验。跨仓依赖边为空的结论见 [依赖矩阵](module-dep-matrix.md)，外部包不可见的实现见 [边界声明](../operations/boundary.md)。
