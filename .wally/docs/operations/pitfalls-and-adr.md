---
kind: operations
scope: pitfalls-and-adr
status: draft
origin: generated
source_paths: [docs/adr/001-single-process-model.md, docs/adr/002-database-backends.md, src/octop/config.py, src/octop/infra/agents/workspace_dir.py, src/octop/infra/agents/execute_env.py, src/octop/api/routers/mbti.py, src/octop/api/routers/chat/models.py, src/octop/api/routers/memory.py, src/octop/api/app.py, src/octop/infra/db/migrate.py, tests/unit/db/test_db_pool.py, src/octop/api/routers/ollama_download_store.py, src/octop/api/routers/update_store.py, AGENTS.md]
symbols: [load_config, _assert_agent_owner, _coerce_bool, run_migrations, dashboard_cache_control, ChatTurnBody, include_deprecated]
upstream: [../INDEX.md, ../overview/system-architecture.md]
downstream: [boundary.md, ../contracts/configuration.md]
---

# 关键架构决策（ADR）、修改高危雷区与存量死路径警示

汇总决定本仓结构的硬性设计权衡、Agent 极易误踩的隐式耦合，以及「`Grep` 能搜到但当前主链路未挂载」的存量兼容代码，防止改错地方导致修改在运行态不生效。

## 1. 核心架构决策与不可违背的工程约束（Key ADRs）

| 编号 | 决策主题 | 核心实现机制与源码锚点 | Agent 修改时必须遵守的硬约束 |
|---|---|---|---|
| `ADR-01` | 单进程、无外部队列 | `OctopServer.start` 从 `~/.octop/octop.db` 重建全部状态（`src/octop/infra/server.py:278`、`:319-323`）；`docs/adr/001-single-process-model.md:1` | 不得引入必须常驻的独立 broker；任务状态为内存态，重启即清空 |
| `ADR-02` | SQLite / PostgreSQL 双驱动同构 | `DatabasePool` Protocol + 成对 `.sql`/`.pg.sql` 迁移（`src/octop/infra/db/pool.py:20`、`src/octop/infra/db/migrate.py:37`、`:1417`）；`docs/adr/002-database-backends.md:1` | 改表必须成对提交并推进 `_schema_version`（当前 13） |
| `ADR-03` | 依赖向内、扁平模块 | `dashboard/ → api/ → infra/ → infra/utils, octop.config`（`AGENTS.md:97-104`） | 禁止 `infra/` 反向 import `api/|cli/|launch.py`；router 保持薄层 |
| `ADR-04` | 工作区 IO 归 `BackendWorkspace` | `HarnessAgent.workspace`（`AGENTS.md:207`）、`src/octop/infra/backend/resolver.py:23` | 禁止 `Path.write_text` 直写 `~/.octop/agents/<id>/`，禁止在 Octop 分支判断 backend 类型 |
| `ADR-05` | 无构建步骤的 SPA 产物 | `make build-frontend` → `src/octop/dashboard/`（`Makefile:96-102`） | 禁止直接编辑构建产物；`assets/` 哈希资源设 immutable（`src/octop/api/app.py:36-44`） |
| `ADR-06` | 错误语义单一真源 | `ErrorCode` 91 项 + `_DEFAULT_STATUS`（`src/octop/infra/errors.py:13`、`:107`） | 新错误须同步后端 `i18n/errors.*` 与前端 `apiErrors.*` |
| `ADR-07` | 服务端时区为准 | `default_timezone`（`src/octop/config.py:133`）、`GET /api/settings/timezone` | 前端时间展示禁止裸 `toLocaleString()` |

## 2. 修改高危雷区与隐式耦合表（Danger Zones & Hidden Couplings）

| 高危源码位置（路径:行号） | 涉及符号 | 隐蔽陷阱机制 | 安全修改标准动作 |
|---|---|---|---|
| `src/octop/config.py:406` | `load_config` | `merged = {**file_defaults, **raw}` + 写回 `config.json`（`:401-402`）为**全量覆盖**语义 | 新增键必须先补 `_defaults_for_file`（`:151`），否则旧文件缺键 |
| `src/octop/config.py:408-410` | 兼容键迁移 | `cron_timezone` 被 `pop` 后并入 `default_timezone`，`OCTOP_CRON_TIMEZONE`（`:437`）仍可读 | 不要删除兼容分支，改时区逻辑须同时测旧键 |
| `src/octop/config.py:282-286` | `_coerce_bool` | 真值集合 `{"1","true","yes","on"}`、假值 `{"0","false","no","off"}`，大小写敏感 | 环境变量取值须落在集合内，否则回默认 |
| `src/octop/infra/db/migrate.py:1417` | `run_migrations` | 版本水印 `_schema_version` 是**已应用迁移水位**，不是变更日志；重复版本号 `RuntimeError`（`:55-58`） | 未发布 schema 改动折进当前 `NNN`，不新增 `NNN+1`；同步 `tests/unit/db/test_db_pool.py:95` 的 `v == 13` |
| `src/octop/infra/agents/workspace_dir.py:317`、`src/octop/infra/agents/execute_env.py:54-59` | 兼容目录 | 旧 Agent 的 auth 在 `{workspace}/.octop-auth`，新 Agent 在 `{workspace}/.octop/` | 不要全局替换字符串，须按 Agent 创建代际分流 |
| `src/octop/api/routers/mbti.py:5`、`:153`、`:679` | `X-Octop-Agent-Id` | MBTI 端点仍用**请求头**传 agent，与标准 `/api/agents/{id}/…` 归属校验并存 | 新增 MBTI 接口须沿用该头或显式迁移，勿混用 |
| `src/octop/api/routers/chat/models.py:55` | `locale` 字段 | 注释「Deprecated — locale is read from the user profile. Ignored when set.」 | 不要依赖请求体 `locale` 做本地化，走 `resolve_user_locale` |
| `src/octop/api/routers/memory.py:88` | `include_deprecated` | 默认 `False` 的兼容开关，改动会影响历史记忆返回形态 | 保持默认值，除非明确迁移 |
| `src/octop/api/app.py:36-44` | `dashboard_cache_control` | `assets/` 哈希资源 `public, max-age=31536000, immutable`；`index.html`/`sw.js`/`manifest.json` `no-cache` | 修改静态资源必须重新 `make build-frontend` 生成新哈希 |
| `src/octop/api/app.py:290-305` | `spa_fallback` | 显式拒绝 `api/`、`ws/` 前缀与 `..` 路径穿越 | 新增静态路径须走 `resolve().relative_to()` 校验 |
| `src/octop/infra/gateway/threads.py:30` | `make_key` | 线程键四段拼接，历史数据按此键聚合 | 改格式必须同时迁移历史行，否则会话全错位 |
| `src/octop/infra/gateway/process/processor.py:661` | `_resolve_turn_mcp_servers` | `raise_on_failure=False` 时静默降级，强校验才抛 `CONNECTOR_MCP_LOAD_FAILED` | 排障时先确认调用点的 `raise_on_failure` 实参 |
| `Makefile:244-254` | `test-affected` | 依赖 `pytest-testmon` 与 staged changes 补丁（`tests/support/testmon_staged_changes.py`） | 不要绕过 `make test` 直接用 testmon 结果当全量门禁 |

## 3. 存量死路径与历史兼容保留代码警示（Legacy / Unmounted Code Traps）

| 存量代码位置（路径:行号） | 符号 / 配置名 | 当前真实状态 | 当前真正生效的主入口位置 |
|---|---|---|---|
| `docs/api.md:225-226`、`docs/personas.md:104`、`src/octop/api/routers/mbti.py:200` | `/personas` / `/api/personas` | **文档提及但源码未注册**（`src/octop/api/` 中无该路由；`src/octop/api/routers/mbti.py:200` 仅注释「legacy /api/personas」） | 人格能力走 `/api/mbti/*`（`src/octop/api/routers/mbti.py:151`、`:204`） |
| `AGENTS.md:302` | `GET /api/cron/settings` | 兼容别名描述；主时区入口为 `GET /api/settings/timezone` | `src/octop/api/routers/settings.py:25` |
| `src/octop/config.py:437` | `OCTOP_CRON_TIMEZONE` | 旧环境变量仍接受（legacy），非主入口 | `OCTOP_DEFAULT_TIMEZONE`（`src/octop/config.py:436`） |
| `src/octop/infra/agents/workspace_dir.py:317` | `.octop-auth` 目录 | 仅旧 Agent 兼容回退 | `{workspace}/.octop/`（`AGENTS.md:209`） |
| `src/octop/api/routers/ollama_download_store.py` / `update_store.py` | helper 模块 | **未定义 `APIRouter`，不是未挂载路由**，是 `src/octop/api/routers/ollama_models.py:18` / `src/octop/api/routers/update.py:15` 导入的辅助模块 | 对应路由文件本身 |
| `pyproject.toml:65`、`:69` | `browser`/`desktop` extras 兼容注释 | 声明「Kept for backward compatibility」，仍为有效可选依赖 | 无需改动 |
| `src/octop/infra/voice/adapters.py:285` | `mimo_default` | 旧语音默认配置常量，保留兼容 | 当前 kind 分派见 [`../integrations/downstream/voice-provider.md`](../integrations/downstream/voice-provider.md) |

> 全仓 `src/octop/**/*.py` 未发现待办/修复类标记；`TAB_ALIAS` 字面量在本仓 **未找到**（`Grep` 无命中），请勿据模板示例臆造「未挂载页签」。

## 4. 共变耦合与修改清单（Co-Change Playbook）

1. 动 `config.py` / `migrate.py` / `threads.py` 等雷区前，先读 [`../contracts/configuration.md`](../contracts/configuration.md)、[`../architecture/data-and-adapter.md`](../architecture/data-and-adapter.md) 与 [`../overview/glossary.md`](../overview/glossary.md)。
2. 发现「搜到同名函数但改了不生效」时，回本页第 3 节核对是否已切到主入口；外部黑盒边界见 [`boundary.md`](boundary.md)。
3. 任何 schema/枚举/兼容键改动，跑 `uv run pytest tests/unit/db tests/unit/i18n tests/unit/gateway -q`，禁止用 `SKIP_PRECOMMIT=1` 绕过红灯。
