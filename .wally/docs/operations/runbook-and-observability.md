---
kind: operations
scope: runbook-and-observability
status: draft
origin: generated
source_paths: [src/octop/api/routers/health.py, src/octop/api/routers/admin.py, src/octop/api/routers/observability.py, src/octop/infra/metrics.py, src/octop/infra/db/repos/audit.py, src/octop/infra/db/migrations/001_initial.sql, src/octop/api/routers/chat/history.py, src/octop/infra/cron/job.py, src/octop/infra/backup/auto.py, src/octop/infra/server.py]
symbols: [health, overview, audit_log, metrics, METRICS, AuditRepo.write, set_run_status, run_auto_backup, _setup_logging]
upstream: [../contracts/error-codes.md, ../contracts/configuration.md]
downstream: [pitfalls-and-adr.md, ../business/cron-automation.md]
---

# 可观测性信号与故障定位决策树（Agent Runbook）

系统内建健康探测、进程内指标计数器、审计日志与增量任务状态；所有信号均可从 HTTP 端点或 `~/.octop/octop.db` 直接读取，无需外部 APM。

## 1. 诊断信号读取入口表

| 信号类别 | 接口 / 磁盘文件位置 | 核心诊断字段 | 源码锚点（路径:行号） |
|---|---|---|---|
| 实例状态与就绪度 | `GET /api/health` | `ok`、`started_at`、`db`、`users_loaded`、`agents_running` | `src/octop/api/routers/health.py:15`、`:22-28` |
| 管理员总览 | `GET /api/admin/overview` | 用户/Agent/通道聚合状态 | `src/octop/api/routers/admin.py:14` |
| 审计日志 | `GET /api/admin/audit-log` | `audit_repo.query(since, actor, action, limit)` | `src/octop/api/routers/admin.py:47`、`:56` |
| 进程内指标 | `GET /api/admin/metrics` | `METRICS.set("agent_active", …)` + `snapshot()` | `src/octop/api/routers/admin.py:70`、`:74-81` |
| 指标字典 | `src/octop/infra/metrics.py:9-16` | `messages_total`、`stream_errors_total`、`cron_runs_total`、`cron_errors_total`、`agent_active` | `src/octop/infra/metrics.py:11-15`、`:26-34` |
| 异步任务状态 | `cron_jobs.last_status` / `knowledge_documents.status` | `ok|error` / `pending|processing|ready|failed` | `src/octop/infra/cron/job.py:103`、`src/octop/infra/knowledge/jobs.py:44` |
| 自动备份记录 | `audit_log.action = backup.auto_ok|auto_failed` | 归档文件名前缀 `octop-auto-backup-` | `src/octop/infra/backup/auto.py:37`、`:224`、`:235` |
| 运行日志 | `~/.octop/logs/`（轮转） | `OCTOP_LOG_RETENTION_DAYS=14`、`OCTOP_LOG_MAX_BYTES=100MiB` | `src/octop/infra/server.py:141`、`:151`、`:510` |
| Langfuse 配置 | `GET/PUT /api/admin/observability/langfuse` | `require_permission("observability")` | `src/octop/api/routers/observability.py:51`、`:59`、`:74` |

审计动作字面量（已核验）：`cron.run_failed`/`cron.run_ok`（`src/octop/infra/cron/job.py:106`、`:114`）、`cron.create`/`cron.delete`（`src/octop/infra/users/manager.py:139`、`:217`）、`agent.stream.error`（`src/octop/infra/gateway/process/processor.py:1170`）、`backup.auto_failed`/`backup.auto_ok`（`src/octop/infra/backup/auto.py:224`、`:235`）、`auth.failed`/`login`/`logout`、`user.*`、`connector.instance.*`、`security.tool_guard_rules.*`（`src/octop/infra/db/repos/audit.py:10-11`、`:39-79`）。

---

## 2. 症状 → 根因定位与修复决策树

### 症状 A：`/api/health` 返回 `db=false` 或业务接口 503

1. 查 `src/octop/api/middleware/setup_lockdown.py:36-40`：若用户数为 0，属**正常绿场态**，仅 `/api/setup/*` 与 `/api/health` 开放，完成 [`../business/setup-wizard.md`](../business/setup-wizard.md) 即可。
2. 查 `src/octop/infra/server.py:319-322`：`open_database` / `run_migrations` / `build_shared_services` 是否抛错；PostgreSQL 侧核对 `src/octop/infra/db/pool.py:144` 连接池与 `docker/postgres/init-vector.sql:5` 的 vector 扩展。
3. 查 `~/.octop/logs/` 的 `OctopError INTERNAL_ERROR`（`src/octop/api/app.py:93-98` 会 `logger.exception`）。

### 症状 B：后台任务 `failed` 或超时中断

1. 读 `cron_jobs.last_status` / `last_error`（`src/octop/infra/cron/job.py:103`、`:111`）与审计 `cron.run_failed`。
2. 核对触发器是否被 `build_trigger` 判为非法（[`../contracts/error-codes.md`](../contracts/error-codes.md) 的 `CRON_TRIGGER_INVALID(400)`），以及 `misfire_grace_time=60`（`src/octop/infra/cron/manager.py:256`）。
3. 若 `CronDeliveryService` 报 `cron agent run requires user interaction`，说明 Agent 流触发了 HITL（`src/octop/infra/cron/delivery.py:149`）——定时任务**不允许**等待人工，改提示词/工具配置。
4. 自动备份失败查 `backup.auto_failed` 与 `hold_backup_lock("auto")`（`src/octop/infra/backup/auto.py:193`）。

### 症状 C：文档已写入但检索不命中

1. 查 `knowledge_documents.status` 是否 `ready`（仅 ready 参与检索，`src/octop/infra/knowledge/retrieve.py:93`）；`failed` 见 [`../business/knowledge-indexing.md`](../business/knowledge-indexing.md)。
2. 查嵌入错误 `"knowledge embedding response has no data"` / `"count mismatch"`（`src/octop/infra/knowledge/embed.py:61`、`:64`）。
3. 查检索短路条件 `k<=0` / `char_budget<=0`（`src/octop/infra/knowledge/retrieve.py:35`）。

### 症状 D：登录后频繁 401 / 令牌失效

1. 查 `TOKEN_EXPIRED` / `AUTH_FAILED` 与 `access_token_ttl_seconds=86400`（`src/octop/config.py:129`）、滑动续期头 `X-Octop-Access-Token`（`src/octop/api/deps.py:61`、`:146`）。
2. 查 `LOGIN_LOCKED(429)` 的 `login_max_attempts=5` / `login_lockout_seconds=900`（`src/octop/config.py:130-131`）与审计 `auth.failed`。
3. 查 JWT secret 是否被 `rotate-jwt-secret` 轮换（`src/octop/cli/commands/admin.py:105`）。

## 3. 日志与审计写入规范

- `AuditRepo.write` 固定 `INSERT INTO audit_log(ts, actor, action, target, payload)`（`src/octop/infra/db/repos/audit.py:49`）；`ACTOR_SYSTEM="_system"` / `ACTOR_ADMIN="_admin"`（`:10-11`）。
- 5xx `OctopError` 由 `src/octop/api/app.py:82-89` 用 `logger.error` 记录**原始英文** message，客户端只见本地化文案，排障须查日志原文。
- 凭据类内容（api_key/bearer/secret）禁止进日志与审计 payload（[`../contracts/configuration.md`](../contracts/configuration.md)）。

## 4. 共变耦合与修改清单（Co-Change Playbook）

1. 新增指标：改 `src/octop/infra/metrics.py:9-16` 的 `Metrics` dataclass → 在 `METRICS.inc/set` 调用点埋点 → 更新本页信号表。
2. 新增审计动作：同步 `src/octop/infra/db/repos/audit.py:39-79` 的写入封装与本页字面量清单，便于排障检索。
3. 改健康端点字段：同步 `docker/Dockerfile:136-137` 的 `HEALTHCHECK`、`dashboard/src/api/probeHealth.ts` 与 [`deployment-and-runtime.md`](deployment-and-runtime.md)。
4. 排障结论涉及未挂载/兼容代码时，转 [`pitfalls-and-adr.md`](pitfalls-and-adr.md) 核对，避免改错入口。
- **核验锚点**：`src/octop/infra/db/migrations/001_initial.sql:1`（初始建表 DDL）。
- **核验锚点**：`src/octop/api/routers/chat/history.py:1`（会话历史路由）。
