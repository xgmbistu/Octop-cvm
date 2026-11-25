---
kind: operations
scope: deployment-and-runtime
status: draft
origin: generated
source_paths: [docker/Dockerfile, docker/docker-compose.yml, docker/docker-entrypoint.sh, Makefile, docs/configuration.md, src/octop/infra/utils/paths.py, src/octop/launch.py, fnos/README.md]
symbols: [run_foreground, PathLayout, HEALTHCHECK, build_listen_plan]
upstream: [INDEX.md, contracts/configuration.md]
downstream: [operations/runbook-and-observability.md]
---

# 部署产物、进程拓扑与持久化目录契约

Octop 以单个 Python wheel 交付（FastAPI + React SPA + Click CLI）；镜像内单进程 uvicorn，可选 TLS 双监听，数据全部落在 `~/.octop/`（Docker 为 `/data/.octop`）绑定挂载卷。

## 1. 构建资产清单

| 构建文件 | 构建产物 | 注入的关键目录与运行约束 |
|---|---|---|
| `Makefile:93-126` | `make build` = `build-frontend` + `build-wheel` | wheel 含 `src/octop/**` 与 dashboard 产物（`pyproject.toml:98-118`） |
| `dashboard/vite.config.ts:91-93` | `src/octop/dashboard/`（构建产物，禁直接编辑） | `outDir=../src/octop/dashboard`、`emptyOutDir=true` |
| `docker/Dockerfile:36-58,64-140` | `octop` 镜像 | 两阶段前端 `node:20-slim` + 运行时 `python:3.12-slim`；`HOME=/data`、`OCTOP_BIND_HOST=0.0.0.0`、`OCTOP_PORT=8088`（`:72-80`）；`HEALTHCHECK` 每 30s `curl -f http://localhost:8088/api/health`（`:136-137`） |
| `docker/docker-compose.yml:22-55` | 单服务容器 | `${OCTOP_PORT:-8088}:${OCTOP_PORT:-8088}`；挂载 `${OCTOP_DATA:-~/.octop}:/data/.octop`；首启密码 `Octop123` |
| `docker/docker-entrypoint.sh:25-59` | 首启初始化 + 启动 | DB 不存在→`octop init --yes` 写 `credential.txt`(0600)；`exec octop run --host 0.0.0.0 --port $PORT` |
| `docker/docker-compose.postgres.yml` + `init-vector.sql` | pgvector/pgvector:pg16 | 实例级 `CREATE EXTENSION vector`（应用迁移禁止，见 ADR 002） |
| `fnos/`（Docker 版 8088 / native 版 8089） | 两款 `.fpk` | `scripts/build-fpk.sh`；native 自带 Python 3.12 + whl（`fnos/native/app/bin/octop:51-99`）；双层 gzip tar 见 `fnos/README.md:79` |
| `.github/workflows/{release,docker-publish,fnos-build-fpk,octop-desktop}.yml` | PyPI/GHCR/DockerHub/FPK/桌面安装包 | v* tag 触发；桌面 6 平台矩阵 |

## 2. 运行期持久化数据目录树契约

路径根由 `PathLayout.from_env`（`src/octop/infra/utils/paths.py:15-17`）统一解析，布局说明见 `docs/configuration.md:9-22,52-54`。

```text
~/.octop/                          # OCTOP_HOME 可覆盖 (docs/configuration.md:9-22,52-54)
├── config.json                     # bind_host/port/时区/database/tls
├── env                             # 仅合并未 set 的键；保护 OCTOP_* (env_file.py:87-92)
├── octop.db                        # SQLite 控制面（WAL）
├── cli_state.json / repl_history   # CLI 固定主体与 REPL 历史
├── secrets/jwt_secret              # JWT 密钥（不明文回显）
├── agents/<agent_id>/              # 每 agent 工作区（SOUL.md/skills/.octop/...）
├── plugins/                        # 已安装插件（bundled 默认 enabled:false）
├── skill-packages/ / knowledge/    # 技能包与知识库数据
├── ssl/                            # TLS 证书（resolve_tls_paths）
├── logs/octop.log.<date>[.gz]      # 每日+100MB 轮转，14 天保留 (server.py:42-43,160-196)
└── octop.log                       # 兼容旧单文件日志，启动时迁移 (server.py:515-516)
```

Agent 工作区内容文件必须经 `BackendWorkspace` 读写；`~/.octop/agents/<id>/` 不得用 `Path.write_text/read_text` 直写（见 `AGENTS.md` §5）。

## 3. 进程、子进程与外部网络边界

| 边界类型 | 方向与端口 / 协议 | 调用模块（`路径:行号`） | 安全与超时约束 |
|---|---|---|---|
| 入向监听 | HTTP 8088（可配 TLS 443 + HTTP-01 companion 80） | `launch.py:85-145`、`tls/listeners.py:33` | JWT + setup lockdown；双 TLS 监听强制 `workers=1,reload=False`（`launch.py:93-98`） |
| 本地子进程 | `lark-cli` / `wecom-cli`（npm 全局）、`adb`、`xdotool`、`pg_dump/pg_restore` | `connectors/gateway/cli_runner.py:61-82`、`mobile/adb.py:22-185`、`backup/pg_dump.py:23,47` | 固定 argv 列表，禁 `shell=True`；CLI 安装到 `~/.npm-global` 并注入 PATH（`server.py:284-286`） |
| 出向网络 | HTTPS：LLM provider / 连接器 API / SkillHub / ONNX COS / ACME | `connectors/gateway/adapters/*`、`skills/skills_hub.py`、`tls/acme_issue.py:56-135` | 域名走配置项，禁硬编码内部地址；SSRF 白名单（`utils/ssrf_guard.py`） |
| 控制面板 DB | SQLite WAL 或 PostgreSQL（psycopg_pool 1–8） | `db/factory.py:34`、`db/pool.py:20,33,144` | 单 active writer；无多实例写承诺（ADR 002） |

## 4. 升级与回滚

- `octop update --check/--yes`（`cli/commands/update.py:13-58`）：editable 安装要求 `git pull`，否则走 `infra/setup/self_update.py:215 run_upgrade`；FPK native 离线 whl 兜底。
- 备份/恢复：`octop backup …` / `octop backup restore`（`cli/commands/backup.py:25,149,163`），恢复前必须停 `octop run`；跨引擎恢复拒绝（`BACKUP_DRIVER_MISMATCH`）。
- Docker 回滚：`docker compose down` 后用旧镜像 `up -d --build`；数据卷 `${OCTOP_DATA}` 独立保留。
- `OCTOP_HOME` 自托管部署需确保目录可写；首次向导五步见 `docs/configuration.md:197-215` 与 [`setup-and-auth.md`](../business/setup-and-auth.md)。

## 导航与共变索引

构建命令与测试门禁见 [构建与单测](dev-and-test.md)，运行期配置键见 [配置手册](../contracts/configuration.md)，部署故障排查见 [Runbook](runbook-and-observability.md)。
