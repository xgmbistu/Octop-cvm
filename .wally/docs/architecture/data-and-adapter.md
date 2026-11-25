---
kind: component
scope: data-and-adapter
status: draft
origin: generated
source_paths: [src/octop/infra/db/pool.py, src/octop/infra/db/factory.py, src/octop/infra/db/migrate.py, src/octop/infra/db/services.py, src/octop/infra/backend/adapter.py, src/octop/infra/connectors/mcp_tool_cache.py]
symbols: [SqlitePool, PostgresPool, open_database, run_migrations, build_shared_services, row_to_backend_spec, fingerprint_mcp_spec]
upstream: [architecture/index.md, business/domain-models/index.md]
downstream: [integrations/downstream/storage-backends.md, operations/pitfalls-and-adr.md]
---

# `Data & Adapter`（数据持久化 / 缓存 / 传输底座组件）

> **边界切分铁律**：本页只管 SQLite/PG 连接池、迁移、repo DI 容器、工作区 spec 生成与通用缓存指纹；每个外部下游系统「组装什么字典、解包什么字段」一律在 [`integrations/downstream/`](../integrations/index.md) 独立展开。

本仓无统一 `BaseAdapter`：传输底座分散为 `httpx`（连接器/语音/embedding）、`subprocess`（CLI/ADB/xdotool）、外部 `harness-agent` 的 `BackendProtocol` 与 `lark-oapi` 等 SDK；本层只提供 spec 生成与连接管理。

## 1. 本地持久化契约（SQL / 文件存储）

| 表名 / 文件路径 | 主键 / 约束 | 权威读写函数（`路径:行号`） | 事务、锁与安全约束 |
|---|---|---|---|
| 24 张控制面表（`users/agents/channels/cron_jobs/sessions/threads/...`） | 整数 `id` pk + 字符串 `{entity}_id` UNIQUE | `src/octop/infra/db/repos/*.py` 经 `RepoBundle`（`services.py:35`）注入 | SQL 100% 参数化；SQLite 单连接 + `RLock`、WAL、FK ON、首次建库 chmod 0600（`pool.py:20,33,144`） |
| `_schema_version` | 单值 | `_current_version` (`migrate.py:63`) / `run_migrations` (`:1417`) | 版本 `<= current` 跳过；末尾无条件跑 `_ensure_*` 幂等修补 |
| `~/.octop/config.json` / `env` / `secrets/jwt_secret` | 实例单文件 | `load_config` (`config.py:394-582`) / `apply_env_file` (`utils/env_file.py:87-92`) | 密钥不明文落库、不回显；`secrets.get_or_create("jwt", os.urandom(32))`（`server.py:543-545`） |
| `~/.octop/logs/octop.log.<date>` | 按日 + 大小封顶 | `SizeTimedRotatingFileHandler` (`server.py:46-87`) | 100MB 上限、14 天保留、delaycompress（`:42-43,107-157`） |

## 2. 缓存指纹与失效机制

| 缓存维度 | 实现细节与常量 | 源码锚点 |
|---|---|---|
| MCP tool 指纹 | `fingerprint_mcp_spec` 取 `transport/url/headers/command/args/env`，`sort_keys` 后 sha256 前 16 位 | `src/octop/infra/connectors/mcp_tool_cache.py:12-94` |
| i18n 语言包 | `_load_all` 用 `importlib.resources` + `lru_cache(maxsize=1)`；lookup 未命中回落 `en` | `src/octop/i18n/loader.py:24-41` |
| Trajectory 指标缓存 | `_METRICS_CACHE_TTL_S=1.0`、live 推送间隔 `0.05s` | `src/octop/infra/trajectory/service.py:20-21` |
| DB 连接池 | SQLite 单连接 + `RLock`；PG `psycopg_pool` min=1/max=8，`?`→`%s` | `pool.py:15,20,144` |

无基于文件 `(mtime_ns,size)` 的 wiki 指纹缓存；Octop 的「失效」主要是 DB 状态回写与 MCP spec 指纹变更。

## 3. 通用外部传输底座（Transport Base）

| 底座类 / 函数 | 统一鉴权头 / 签名注入 | 默认超时与重试 | 无外部环境的替身 | 源码锚点 |
|---|---|---|---|---|
| HTTP JSON (`httpx`) | Bearer / API-Key / TC3 / HMAC 由各 adapter 自行注入 | 逐 adapter 不同，provider 探测 30s | `tests/support/fakes.py:34 FakeHarnessAgent`、`tests/integration/conftest.py:235 env_fake_harness` | `src/octop/infra/voice/adapters.py:68-427`、`providers/probe.py:209-245` |
| CLI (`subprocess`) | argv 列表，禁 `shell=True`；env 注入 `LARKSUITE_CLI_CONFIG_DIR` / `WECOM_CLI_CONFIG_DIR` | CLI 超时逐项配置 | 离线 fixture | `src/octop/infra/connectors/gateway/cli_runner.py:61-82` |
| Workspace spec | `BackendProtocol` 由 `resolve_backend(spec)` 外部解析 | 外部 harness 管理 | 临时目录 filesystem backend | `src/octop/infra/backend/adapter.py:44-168`、`resolver.py:79-122` |
| MCP JSON-RPC | `_ok/_err` 统一信封，内部 token | 长连接 SSE keepalive | stub processor `gateway.py:86` | `src/octop/infra/connectors/gateway/protocol.py:21-78` |

**继承/调用底座的全部业务封装清单**：见 [`integrations/index.md`](../integrations/index.md) 的下游总表（13 类 connector adapter、6 类语音 provider、7 类 backend spec、ADB/xdotool/Playwright 设备桥）。

## 4. 共变耦合与修改清单（Co-Change Playbook）

- 新增持久化状态文件：写入方需同步更新 `PathLayout`（`src/octop/infra/utils/paths.py`）与 [部署目录契约](../operations/deployment-and-runtime.md)，避免升级/备份漏拷。
- 修改 SQL 表结构：`open_database`（`src/octop/infra/db/factory.py:34`）选择驱动 → 成对提交 `NNN_*.sql` + `NNN_*.pg.sql` → bump `tests/unit/db/test_db_pool.py` 版本断言 → `run_migrations` 幂等 helper（`migrate.py`）→ repo 映射 → API DTO。
- 修改 backend spec：`adapter.py:44-168` → `probe.py:73-235` → 前端存储后端表单 → `tests/unit/backend/`。
- **特殊陷阱**：`qmark_to_pyformat`（`pool.py:15`）让 repo 统一写 `?` 由 PG pool 改写 `%s`；在 repo 里手写 `%s` 会在 SQLite 上直接失败。
