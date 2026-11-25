---
kind: operations
scope: runbook-and-observability
status: draft
origin: generated
source_paths: [src/octop/api/routers/health.py, src/octop/infra/metrics.py, src/octop/infra/server.py, src/octop/infra/db/repos/audit.py, src/octop/infra/trajectory/service.py, src/octop/api/routers/admin.py]
symbols: [health, METRICS, SizeTimedRotatingFileHandler, AuditRepo.write, TrajectoryService.observe_chunk]
upstream: [contracts/error-codes.md]
downstream: []
---

# 可观测性信号与故障定位决策树（Agent Runbook）

Octop 无外部 APM：诊断信号来自 `GET /api/health`、进程内 `METRICS`、审计表、`~/.octop/logs/` 日志、trajectory 事件流与备份状态端点。

## 1. 诊断信号读取入口表

| 信号类别 | 接口 / 磁盘位置 | 核心诊断字段 | 源码锚点 |
|---|---|---|---|
| 健康与就绪 | `GET /api/health` | 200 即服务存活 | `src/octop/api/routers/health.py:14` |
| 进程指标 | `GET /api/admin/metrics` | `messages_total / stream_errors_total / cron_runs_total / cron_errors_total / agent_active` | `src/octop/infra/metrics.py:9-37`、`admin.py:70` |
| 审计事件 | `GET /api/admin/audit-log`（`query` 默认 limit=100） | actor `_system/_admin/user`、`cron.*`、`backup.auto_*`、`auth.login/logout` | `src/octop/infra/db/repos/audit.py:10-11,81` |
| 应用日志 | `~/.octop/logs/octop.log[.<date>][.gz]` | 每日+100MB 轮转，14 天保留 | `src/octop/infra/server.py:42-43,160-196` |
| 备份状态 | `GET /api/admin/backup/status`、`/list`、`/auto` | `{busy,operation}`、备份文件清单 | `backup/auto.py:42-78`、`backup/store.py:74-134` |
| Cron 任务状态 | `GET /api/agents/{aid}/cron` | `last_status/last_error` | `src/octop/api/routers/cron.py:75`、`repos/cron.py` |
| Trajectory 回放 | `GET /api/agents/{aid}/threads/{tid}/trajectory/stream`（SSE） | `metrics`/`heartbeat`/`error` 事件，`seq` 增量 | `chat/trajectory.py:326`、`:170,214,234`；Writer `src/octop/infra/trajectory/service.py:46,53,132` |
| Provider 连通性 | `POST /api/providers/{id}/test` | `{ok,latency_ms}` | `providers/probe.py:209-245` |

## 2. 症状 → 根因定位与修复决策树

### 症状 A：对话无输出 / 流中断

1. 查 `GET /api/admin/metrics` 的 `stream_errors_total` 是否递增；递增则读 `~/.octop/logs/octop.log` 最近异常栈。
2. 查 agent 状态 `GET /api/agents/{aid}/status`：`failed` 时多为 `NO_MODELS_CONFIGURED` 或 provider 不可用（`manager.py:2017-2019`），跑 `POST /api/providers/{id}/test`。
3. 若 WebSocket close 4001/4003/4404/1011，分别对应鉴权/权限/无此 agent/未就绪（`chat/ws.py:41,47,55,63`）。
4. 检查 `hitl_required` 是否挂起（卡片需 `/approve` 或 `reject`，`processor.py:544-583`）；检查 bootstrap 未完成时图刷新边界（`manager.py:2096-2102`）。

### 症状 B：定时任务未执行 / 状态 error

1. 读 `cron_jobs.last_status/last_error` 与审计 `cron.run_failed`（`job.py:100-110`）。
2. 查 `schedule_spec` 是否合法：三种前缀 `interval:/cron:/date:`，非法被 `_schedule` warning 跳过（`cron/manager.py:241-247`）。
3. 系统任务（自动备份/TLS 续期）不入 DB，若消失查启动钩子 `server.py:413-419` 与 `misfire_grace_time=300`（`manager.py:290-308`）。
4. 关怀不触发时查 `proactive_care_config.enabled`、时间窗与进程内 task（异常只在日志记，**不会自动重建**，`scheduler.py:265-272`）。

### 症状 C：知识库检索不到内容

1. 查 `knowledge_documents.status/chunk_count`：仍为 `processing/pending` 说明索引作业未完成（`jobs.py:34-60`），启动恢复会重置 processing→pending（`repos/knowledge.py:488-502`）。
2. 查 `POST /api/admin/providers/{id}/test` 与 embedding `data[].embedding` 条数；条数不符返回 `count mismatch`（`embed.py:16-65`）。
3. 注意检索异常被吞掉返回空串（`retrieve.py:22-132`），「无命中」不等于「无文档」。

### 症状 D：备份失败 / 恢复被拒

1. `backup_status_payload` 的 `busy/operation`：并发被 `BACKUP_LOCK` 拒绝为 `BACKUP_IN_PROGRESS`(409)（`backup/auto.py:42-78`）。
2. 跨引擎恢复 `BACKUP_DRIVER_MISMATCH`(400)、schema 过高 `BACKUP_SCHEMA_INCOMPATIBLE`(400)（`system_archive.py:393-453`）。
3. `pg_dump/pg_restore` 仅在 `returncode>=2` 时硬失败（`pg_dump.py:63-68`）；恢复后强制 `run_migrations`。

## 3. 日志与降级信号速查

| 信号 | 含义 | 源码锚点 |
|---|---|---|
| `degraded` | bubblewrap / Docker 环境部分可用，不阻断启动 | `launch.py:27`、`utils/bwrap.py:182-209`、`docker_env.py:359,376` |
| `ready/installed/skipped/degraded` | `POST /api/filesystem/ensure-bwrap` 探测结果 | `filesystem.py:115` |
| `X-Octop-Access-Token` | JWT 滑动续期；前端须保存 | `deps.py:146`、`dashboard/src/api/request.ts:17,64` |
| 503 `setup_required` | 零用户锁定非安装端点 | `setup_lockdown.py:36-40` |

## 4. 共变耦合与修改清单（Co-Change Playbook）

1. 新增指标：`metrics.py:9-37` 注册 → 埋点 → `admin.py:70` 暴露 → 本页第 1 节。
2. 新增审计事件：`repos/audit.py` actor 常量与 `query` → 本页排障树 → `tests/unit/db/`。
3. 修改错误码或降级标识：先查 [`error-codes.md`](../contracts/error-codes.md) 的 code→status 映射，再按本页决策树定位；排障结论必须附 `path:line` 证据。

## 导航与共变索引

cron 状态字段来源见 [定时任务业务流](../business/cron-and-proactive.md)，知识索引状态见 [RAG 契约](../integrations/downstream/knowledge-rag.md)，部署目录与日志位置见 [部署运行时](deployment-and-runtime.md)。
