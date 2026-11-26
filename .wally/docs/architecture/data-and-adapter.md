---
kind: component
scope: data-and-adapter
status: draft
origin: generated
source_paths: [src/octop/infra/db/pool.py, src/octop/infra/db/services.py, src/octop/infra/db/migrate.py, src/octop/infra/db/migrations/001_initial.sql, src/octop/infra/db/repos/_base.py, src/octop/infra/backend/adapter.py, src/octop/infra/backend/resolver.py, src/octop/infra/utils/host_dirs.py]
symbols: [SqlitePool, PostgresPool, RepoBundle, SharedServices, run_migrations, _discover, _FromRow, resolve_backend]
upstream: [../overview/system-architecture.md, module-dep-matrix.md]
downstream: [../integrations/index.md, ../business/domain-models/index.md, ../operations/pitfalls-and-adr.md]
---

# `data-and-adapter`（持久化 / 迁移 / 工作区与传输底座组件）

> **边界切分铁律**：本页聚焦本地 SQLite/PostgreSQL 持久化、迁移与通用工作区/传输底座；各具体外部下游的业务封装层（组装什么请求字典、解包什么返回字段）一律在 [`../integrations/downstream/`](../integrations/index.md) 独立展开，禁止在本页省略带过。

`src/octop/infra/db/` 以 `DatabasePool` Protocol 抽象双驱动，`RepoBundle` 一表一 repo 收敛全部 SQL；SQLite 与 PostgreSQL **共享一套逻辑 schema**，但迁移文件成对提交（`.sql` + `.pg.sql`）。工作区内容 IO 走 harness 的 `BackendWorkspace`，COS/S3/Docker 仅为配置项映射。

## 1. 本地持久化契约（SQL / 文件存储）

| 表名 / 磁盘文件路径模式 | 主键 / 唯一约束 | 权威读写函数（路径:行号） | 事务、锁与安全约束 |
|---|---|---|---|
| `users` | `id` 整数代理键，`username` UNIQUE | `UserRepo.create/get/get_by_username`（`src/octop/infra/db/repos/users.py:69`） | 参数化 SQL；`password_hash` 为 Argon2 |
| `agents` | `agent_id` 字符串 UNIQUE，`UNIQUE(user_id,name)` | `AgentRepo`（`src/octop/infra/db/repos/agents.py:81`） | 子表外键一律引用字符串 `agent_id`，不 FK 整数 `id` |
| `threads` / `thread_messages` | `thread_id` UNIQUE | `ThreadRepo`（`src/octop/infra/db/repos/threads.py:155`）、`ThreadMessageRepo`（`src/octop/infra/db/repos/thread_messages.py:57`） | 投影状态 `ready/pending/queued/running/failed` |
| `knowledge_bases` / `knowledge_documents` | `kb_id` / `doc_id` 字符串 | `KnowledgeRepo`（`src/octop/infra/db/repos/knowledge.py:99`） | 文档 `status` 四态机 |
| `connectors`（013 重建） | `instance_id` UNIQUE + `shared` | `ConnectorRepo`（`src/octop/infra/db/repos/connectors.py:79`） | `validate_mcp_servers_for_user` 校验归属 |
| `secrets` / `settings` | `k` / `key` PRIMARY KEY | `SecretRepo`（`src/octop/infra/db/repos/secrets.py:11`）、`SettingsRepo`（`src/octop/infra/db/repos/settings.py:8`） | JWT secret `os.urandom(32)`（`src/octop/infra/server.py:545`） |
| `_schema_version` | 版本水印 | `run_migrations`（`src/octop/infra/db/migrate.py:1417`） | **当前 `v == 13`**（`tests/unit/db/test_db_pool.py:95`） |
| `~/.octop/agents/<id>/.octop/` | 工作区系统文件 | `HarnessAgent.workspace`（`AGENTS.md:207`） | 禁止 `Path.write_text` 直写；`resolve()` 防 `..` 穿越（`src/octop/api/routers/workspace.py:299`） |

## 2. 连接池与双驱动机制

| 底座类 / 函数 | 统一行为 | 默认超时 / 策略 | 源码锚点 |
|---|---|---|---|
| `SqlitePool` | 单连接 `check_same_thread=False`、`isolation_level=None`、`row_factory=sqlite3.Row` | `PRAGMA journal_mode=WAL`、`foreign_keys=ON`、`threading.RLock`、POSIX 首建 `chmod 0o600` | `src/octop/infra/db/pool.py:33`、`:42-52` |
| `PostgresPool` | `psycopg_pool.ConnectionPool(min_size=1,max_size=8)` | `_PgConnectionProxy` / `_CompatRow` 兼容层 | `src/octop/infra/db/pool.py:144`、`:108`、`:74` |
| `qmark_to_pyformat` | SQLite `?` 占位符 → PG `%s` 转换 | 保证同一 repo 跨驱动复用 | `src/octop/infra/db/pool.py:15` |
| `run_migrations` | SQLite `_repair_legacy_schema` 后逐版本 `executescript`；PG 在 `conn.transaction()` 内执行 | 成对 `NNN_*.sql` + `NNN_*.pg.sql`，重复版本 `RuntimeError` | `src/octop/infra/db/migrate.py:1417`、`:37`、`:55` |
| `_table_columns` | SQLite `PRAGMA table_info` vs PG `information_schema.columns` | 增量 `ALTER TABLE` 必须幂等 | `src/octop/infra/db/migrate.py:75` |

## 3. 通用外部传输底座（Transport Base）

| 底座类 / 函数 | 注入内容 | 无外部环境时的替身行为 | 源码锚点 |
|---|---|---|---|
| `resolve_backend` | 把 DB 行交给 harness `resolve_backend(spec)` | 本地磁盘默认后端；远程探测由 `probe_backend(spec)` 完成 | `src/octop/infra/backend/resolver.py:23`、`:31` |
| COS spec | `{"type","bucket","region","secret_id","secret_key"}` + `endpoint`,`prefix` | 凭据来自 `secrets` / 环境变量，不明文回显 | `src/octop/infra/backend/adapter.py:52-63` |
| S3 spec | `{"type":"s3","bucket","access_key_id","secret_access_key"}` + `region`,`endpoint_url` | 同上 | `src/octop/infra/backend/adapter.py:99-112` |
| Docker / OpenSandbox spec | `{"type":"docker","image"}` / `{"type":"opensandbox","image","api_key","domain","protocol"}` | `probe.py` 用 `docker.from_env()` 做写读往返 | `src/octop/infra/backend/adapter.py:148-166`、`src/octop/infra/backend/probe.py:146` |
| `host_dirs` 拒绝前缀 | POSIX 宿主根路径白名单 | `os.name != "posix"` 时短路（跨平台测试约定） | `src/octop/infra/utils/host_dirs.py` |

- **继承/调用本底座的所有下游业务封装清单**：详见 [`../integrations/index.md`](../integrations/index.md)，逐系统字典契约位于 [`../integrations/downstream/`](../integrations/index.md)。

## 4. 共变耦合与修改清单（Agent Co-Change Playbook）

- **新增/变更表结构**：必须成对提交 `NNN_desc.sql` + `NNN_desc.pg.sql` → 保持 `migrate.py` Python helper 等价且幂等 → 推进 `tests/unit/db/test_db_pool.py:95` 的版本断言 → 同步 [`../business/domain-models/index.md`](../business/domain-models/index.md) 字段字典。详见 [`../operations/pitfalls-and-adr.md`](../operations/pitfalls-and-adr.md)。
- **新增 repo**：改 `RepoBundle`（`src/octop/infra/db/services.py:35`、`:63`）与 `SharedServices` 访问器（`:103-193`）→ 全仓 grep `server.services.` → `uv run pytest tests/unit/db -q`。
- **新增影响概览的状态文件**：若参与指纹缓存，须同步加入监控列表（工作方式见 [`../operations/pitfalls-and-adr.md`](../operations/pitfalls-and-adr.md)），否则读取端命中陈旧缓存。
- **SQL 纪律**：一律参数化占位符，禁止字符串拼接（`AGENTS.md` 技术约束）；SQLite 与 PG 的 `INTEGER PRIMARY KEY AUTOINCREMENT` vs `GENERATED BY DEFAULT AS IDENTITY` 差异由 `_integer_pk_sql`（`src/octop/infra/db/migrate.py:260`）统一。
- **核验锚点**：`src/octop/infra/db/migrations/001_initial.sql:1`（初始建表 DDL）。
- **核验锚点**：`src/octop/infra/db/repos/_base.py:1`（repo 行映射协议）。
