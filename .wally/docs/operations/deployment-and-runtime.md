---
kind: operations
scope: deployment-and-runtime
status: draft
origin: generated
source_paths: [docker/Dockerfile, docker/docker-compose.yml, docker/docker-entrypoint.sh, docker/docker_build.sh, docker/docker-compose.postgres.yml, docker/postgres/init-vector.sql, Makefile, .env.example, desktop/README.md, fnos/README.md, scripts/install-octop.sh]
symbols: [frontend-builder, runtime, octop init, build-frontend, install-octop]
upstream: [../INDEX.md, ../contracts/configuration.md, ../overview/system-architecture.md]
downstream: [runbook-and-observability.md, ../architecture/dashboard-ui.md]
---

# 部署产物、进程拓扑与持久化目录契约

Octop 单进程交付：Python wheel（`hatchling`，`pyproject.toml:1-3`）内含构建好的 React SPA；Docker 双阶段镜像把前端产物与后端 venv 打进 `python:3.12-slim`。运行期全部状态落在 `~/.octop/`（Docker 内 `/data/.octop`）。

## 1. 构建资产清单

| 构建文件（路径） | 构建产物 | 注入的关键目录与运行用户约束 |
|---|---|---|
| `pyproject.toml:98-99` | `octop` wheel（`packages = ["src/octop"]`） | `[project.scripts] octop = "octop.cli.main:cli"`（`:95-96`） |
| `Makefile:96-102` | `src/octop/dashboard/`（前端产物） | `npm ci` + `NODE_ENV=production npm run build` |
| `docker/Dockerfile:36` | `frontend-builder` 阶段 | `ARG NPM_REGISTRY`、`NODE_MAX_OLD_SPACE_SIZE=2048`、`npm run build:docker` |
| `docker/Dockerfile:64` | `runtime` 镜像 | `python:3.12-slim`，`uv sync --frozen --no-dev --extra browser`（`:110`、`:127`） |
| `docker/docker_build.sh:29` | 本地镜像 | `DOCKER_BUILDKIT=1` + build args（`PIP_INDEX_URL` 等，`:31-46`） |
| `desktop/` | Wails v3 桌面客户端 | `desktop/README.md:1-7`，NSIS/DMG/tar.gz |
| `fnos/` | 飞牛 fnOS `.fpk` | `fnos/README.md:1-20`，`docker/` 与 `native/` 两种打包 |
| `scripts/install-octop.sh:1` | 本机 `~/.octop` 安装 | uv 托管 venv + `~/.octop/bin/octop` wrapper |

## 2. 运行期持久化数据目录树契约（Disk Layout Contract）

```text
~/.octop/                              ← 安装与数据根（容器 /data/.octop）
├── octop.db                           # 主业务 SQLite 库（WAL）
├── config.json                        # OctopConfig 持久化（含 database/tls/backup/capabilities）
├── secrets/                           # JWT secret、通道 Token
├── agents/<agent_id>/                 # 每 Agent 工作区
│   └── .octop/                        # 系统文件（sessions、skills、auth）
├── security/tool_guard/               # shell 命令 allow/deny 规则
├── logs/                              # 运行期日志（轮转）
├── venv/                              # uv 托管 Python（安装器布局）
├── bin/octop                          # PATH wrapper
└── plugins/                           # 已安装插件包
```

Docker 首启额外写 `/data/.octop/credential.txt`（`chmod 600`，`docker/docker-entrypoint.sh:34-44`）；`docker/docker-compose.yml:33` 把 `${OCTOP_DATA:-~/.octop}` 挂到 `/data/.octop`。

## 3. 进程、子进程与外部网络边界

| 边界类型 | 方向与端口/协议 | 调用模块（路径:行号） | 安全与超时约束 |
|---|---|---|---|
| 入向监听 | `HTTP ${OCTOP_PORT:-8088}`（`docker/docker-compose.yml:31`） | `src/octop/cli/commands/run.py:153`、`src/octop/launch.py:100` | JWT 鉴权 + 静态 SPA 挂载 |
| 健康检查 | `GET /api/health`（`docker/Dockerfile:136-137`） | `src/octop/api/routers/health.py:14` | `interval=30s timeout=10s start-period=90s retries=3` |
| 本地子进程 | `git` / `pip` / `adb` / `systemctl` / `lark-cli` | `src/octop/infra/setup/self_update.py:195`、`src/octop/infra/mobile/adb.py:50` | 固定 argv 列表禁 `shell=True`，独立会话超时强杀（见 [`../integrations/downstream/external-cli-runners.md`](../integrations/downstream/external-cli-runners.md)） |
| 出向网络 | `HTTPS`（LLM / MCP / IM / OIDC / 对象存储） | `src/octop/infra/connectors/probe.py:422`、`src/octop/infra/agents/providers/probe.py:174` | 各封装独立超时（20–120s），凭据走配置项 |
| PostgreSQL 旁路 | `docker-compose.postgres.yml` `pgvector/pgvector:pg16` | `src/octop/infra/db/pool.py:144` | `CREATE EXTENSION IF NOT EXISTS vector`（`docker/postgres/init-vector.sql:5`） |

## 4. 环境变量与首启凭据

| 变量 | 默认值 | 来源 | 说明 |
|---|---|---|---|
| `OCTOP_PORT` | `8088` | `.env.example:6`、`docker/Dockerfile:72-80` | HTTP 监听端口 |
| `OCTOP_BIND_HOST` | `0.0.0.0`（容器）/ `127.0.0.1`（代码默认） | `.env.example:8`、`src/octop/config.py:126` | 绑定地址 |
| `OCTOP_ADMIN_USERNAME` / `OCTOP_DEFAULT_PASSWORD` | `admin` / `Octop123` | `docker/docker-compose.yml:39-41` | **仅 Docker 首启**，须立即改密 |
| `OCTOP_DATA` | `~/.octop` | `docker/docker-compose.yml:33` | 宿主机绑定卷 |
| `OCTOP_DATABASE_*` | sqlite | `.env.example:18-29`、`src/octop/config.py:375-389` | PG 切换 |
| `OCTOP_LANGFUSE_*` | 关闭 | `.env.example:35-39` | 可观测性 |

完整 81 个环境变量读取锚点见 [`../contracts/configuration.md`](../contracts/configuration.md)。

## 5. 共变耦合与修改清单（Co-Change Playbook）

1. 改端口/绑定/卷：同步 `docker/docker-compose.yml`、`docker/Dockerfile:134-139` 的 `EXPOSE` 与 `HEALTHCHECK`、`src/octop/config.py:126-127` 默认值、`.env.example`。
2. 改前端构建：走 `make build-frontend` 重新生成 `src/octop/dashboard/`，禁止直接编辑构建产物（`AGENTS.md:347`）；`src/octop/api/app.py:36-44` 的 `Cache-Control` 对 `assets/` 哈希资源设 immutable。
3. 改首启脚本：`docker/docker-entrypoint.sh:28-50` 的 `octop init --yes` 与 `credential.txt` 逻辑必须与 [`../business/setup-wizard.md`](../business/setup-wizard.md) 的向导流程一致。
4. 新增外部地址：一律走配置项，禁止硬编码 `*.woa.com` 或内部平台地址（[`../contracts/configuration.md`](../contracts/configuration.md)）。
