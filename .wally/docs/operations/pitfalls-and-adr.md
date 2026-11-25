---
kind: operations
scope: pitfalls-and-adr
status: draft
origin: generated
source_paths: [docs/adr/001-single-process-model.md, docs/adr/002-database-backends.md, src/octop/infra/agents/manager.py, src/octop/infra/gateway/process/message_keys.py, src/octop/api/routers/connectors.py, Makefile, src/octop/infra/db/migrate.py]
symbols: [_apply_pending_bootstrap_graph_refresh, user_id_from_message, oauth_start_legacy, _reconcile_pre_squash_schema_version, docs-cli]
upstream: [INDEX.md, overview/system-architecture.md]
downstream: []
---

# 关键架构决策（ADR）、修改高危雷区与存量死路径警示

本页汇总决定 Octop 代码结构的硬权衡，以及 Agent 修改时极易误踩的隐式耦合与存量未挂载/仅兼容路径。

## 1. 核心架构决策（Key ADRs）

| 编号 | 决策主题 | 核心实现机制与源码锚点 | 修改时必须遵守的硬约束 |
|---|---|---|---|
| `ADR-01` | 单进程、无外部队列 | `docs/adr/001-single-process-model.md:12-35`；`OctopServer.start` (`server.py:278`)；`SharedServices` 进程全局 | 禁止引入 Redis/Celery/独立 worker；CPU 密集任务用 `run_in_executor`；只能纵向扩展；横向扩展接缝在 `gateway/processor.py` |
| `ADR-02` | 双数据库后端与三层存储分离 | `docs/adr/002-database-backends.md:16-59`；`NNN_*.sql` + `NNN_*.pg.sql`；`db/pool.py:15` | 控制面 / harness checkpoints / harness-memory 严格分离；SQL 保留 `?` 由 pool 改写 `%s`；单 active writer；`.pg.sql` 禁 `CREATE EXTENSION`（vector 归 docker/ops）；无 SQLite→PG 迁移器 |
| `ADR-03`（约定） | 分层依赖红线 | `AGENTS.md` §5；`launch.py:74-100` 是唯一同时导入 server/api 处 | `infra/` 禁导入 `api/`、`cli/`、`launch.py`；`db/repos/` 只写 SQL；`api/routers/` 保持薄 |
| `ADR-04`（约定） | 工作区内容文件统一经 `BackendWorkspace` | `docs/agent-backend-file-io.md`；`api/common/workspace.py` | 禁止 `Path.write_text/read_text` 直读 `~/.octop/agents/<id>/`；不按 backend 类型分支；`"/"` 与 `"."` 语义不同 |

## 2. 修改高危雷区与隐式耦合表

| 高危源码位置（`路径:行号`） | 涉及符号 | 隐蔽陷阱机制 | 安全修改动作 |
|---|---|---|---|
| `agents/manager.py:2096-2102`、`:2118` | `_apply_pending_bootstrap_graph_refresh` | bootstrap 未完成只记标记，同步 `_init_graph()` 会在流式中段 segfault | 只能在 stream/call/resume 边界刷新；跑 `tests/unit/agents/` |
| `agents/manager.py:89` | `_HARNESS_AGENT_CONFIG_FIELDS` | 按已安装 harness 版本的 `fields()` 裁剪未知键，新增字段会静默丢失 | 先确认上游版本含该字段，再改 `_build_harness_config` |
| `db/pool.py:15` | `qmark_to_pyformat` | repo 统一写 `?`，PG 层改 `%s`；手写 `%s` 在 SQLite 直接失败 | SQL 一律用 `?` 参数化 |
| `agents/tool_catalog.py:10-19` | `CRITICAL_TOOLS` | denylist 会被减去关键工具，导致 agent 无法读文件/列目录 | 新增剥离逻辑时必须保留该集合 |
| `config.py:408-410` | legacy `cron_timezone` 回退 | 老配置仍可生效且被 `pop`，新增时区键时易重复处理 | 只保留 `default_timezone` 单一权威键 |
| `connectors/gateway/cli_runner.py:72-74` | `_humanize_cli_error` hint 过滤 | 含 `lark-cli/wecom-cli` 的 hint 被刻意过滤，防 Agent 进入 auth/shell 循环 | 改错误文案不得恢复这些 hint |
| `backup/system_archive.py:82-91` | `BackupManifest` 旧包默认 | 旧包缺 `plugins/knowledge` 视为 false、缺 `chats` 视为 true | 调整备份内容开关需兼容旧 manifest |
| `tests/conftest.py:54-69` | `_suspend_proactive_care_loops` | 全局 patch 掉主动关怀调度，只 `test_scheduler.py` 例外 | 改调度器必须显式跑该例外文件 |

## 3. 存量死路径与历史兼容保留代码警示

| 存量位置（`路径:行号`） | 符号 / 配置 | 当前真实状态 | 真正生效的主入口 |
|---|---|---|---|
| `gateway/process/message_keys.py:62` | `user_id_from_message` | 明确标注 “Legacy helper — prefer resolve_user_id_for_message”，本仓无调用点 | `resolve_user_id_for_message` (`message_keys.py:67-93`) |
| `gateway/gateway.py:86` | `_probe_processor` | 桩实现（`if False: yield None`），仅用于频道凭证探测 | 真实 `GlobalProcessor.__call__` (`processor.py:517`) |
| `gateway/process/harness_request.py:167,197` | `content_from_parts` / `build_content` | 仅测试用的同步 helper，`__all__` 注明旧导入兼容 | `build_content_from_message` (`harness_request.py:96-164`) |
| `providers/reasoning.py:41,116-121` | `_legacy_adapter` / `effort_parameter=="thinking"` | 第一版推理配置兼容分支 | `reasoning_capability` (`reasoning.py:61-141`) |
| `api/routers/chat/models.py:55` | locale 字段 | `Deprecated — locale is read from user profile. Ignored when set.` | `resolve_request_locale` (`utils/locale.py:75-83`) |
| `api/routers/connectors.py:1237-1245` | `oauth_start_legacy` | catalog-only 旧别名 | `POST /api/connectors/oauth/{kind}/start` (`connectors.py:1237`) |
| `config.py:407`（legacy `cron_timezone`） | 旧时区键 | 仍被回退读取后 `pop` | `default_timezone` (`config.py:436`) |
| `agents/acp_settings.py:84` `_migrate_legacy_from_agents` | 旧 ACP 配置迁移 | 仍在启动/迁移路径，不是死代码 | 保留 |
| `db/migrate.py:164,1172,1299-1313` | legacy schema repair | 仍服务旧数据 | 保留 |
| `gateway/history_backfill.py` | 遗留 checkpoint 回填队列 | 仍在回填路径 | 保留 |
| `Makefile:317-319` | `docs-cli` | 指向不存在的 `scripts/regen_cli_docs.py`，死 target | 无 |
| `pyproject.toml:65-70` | `browser/desktop` extras | 标注 “kept for backward compatibility” | 核心依赖已含 playwright/mss |
| `dashboard/src/routes/index.tsx:114,117` | 空 Set 占位 | `SELF_HEADER_PATHS`/`MOBILE_FULLSCREEN_PATHS` 为空 | 无 |

**分类纪律**：只有「主链路已不再挂载」的才按死路径处理；仍在服务旧数据的兼容/迁移代码（ACP、schema repair、history backfill）**不可删除**。

## 4. 导航与共变索引

依赖边与高扇入底座见 [模块依赖矩阵](../architecture/module-dep-matrix.md)，配套验证命令见 [构建与单测](dev-and-test.md)，外部包不可见实现见 [边界声明](boundary.md)。
