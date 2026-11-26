---
kind: operations
scope: dev-and-test
status: draft
origin: generated
source_paths: [pyproject.toml, Makefile, conftest.py, tests/conftest.py, tests/integration/conftest.py, .github/workflows/ci.yml, .githooks/pre-commit]
symbols: [cli, install, all, lint, typecheck, test, install-hooks, pytest_collection_modifyitems, _isolated_user_home, app_client]
upstream: [../INDEX.md, ../architecture/index.md]
downstream: [deployment-and-runtime.md, ../contracts/api-reference.md]
---

# 构建启动与单测验证手册（Agent Verification Playbook）

运行时约束：Python 3.12+（`pyproject.toml:8`）、Node 18+、`uv` 包管理；**禁止裸跑 `pytest`，一律 `uv run pytest`**（`AGENTS.md:346`）。交付门禁为 `make all`（format-all + lint + typecheck + test）与 dashboard `npm run build`（`.githooks/pre-commit`）。

## 1. 环境前置与可执行命令速查

| 动作 | 精确执行命令 | 配置来源（路径:行号） | 备注 / 前置环境变量 |
|---|---|---|---|
| 安装后端依赖 | `make install`（`uv sync` / `pip install -e ".[dev]"`） | `Makefile:303-310` | Python 3.12+ |
| 安装 Git 钩子 | `make install-hooks`（`git config core.hooksPath .githooks`） | `Makefile:295-301` | 每次 clone 一次 |
| 全量交付门禁 | `make all` = `format-all lint typecheck test` | `Makefile:201-202` | 提交前必绿 |
| 静态检查 / 格式 | `make lint`（`ruff check src tests` + `ruff format --check`） / `make format` | `Makefile:204-215`、`pyproject.toml:120-132` | ruff line-length 100，py312 |
| 类型检查 | `make typecheck`（`mypy src/octop`，`strict = true`） | `Makefile:217-220`、`pyproject.toml:134-200` | 13 个 override |
| 全量单测 | `make test`（`pytest -n auto -m "not live"`） | `Makefile:222-225`、`pyproject.toml:202-217` | markers `live/slow/postgresql` |
| 单元 / 集成 / 快速 | `uv run pytest tests/unit -x -q` / `tests/integration -x -q` / `make test-fast` | `Makefile:227-230`、`AGENTS.md` §6 | 改单模块优先精准用例 |
| 前端构建 / 类型检查 | `make build-frontend`、`cd dashboard && npx tsc --noEmit` | `Makefile:96-102`、`:274-277` | 产物写 `src/octop/dashboard/` |
| 服务启动 / 冒烟 | `octop run` → `curl -f http://127.0.0.1:8088/api/health` | `src/octop/cli/commands/run.py:153`、`docker/Dockerfile:136` | `GET /api/health` 返回 `ok=true` |

## 2. 源码模块 → 必跑回归测试映射表（Module-to-Test Map）

| 被修改的源码文件 / 目录 | 必跑测试文件 | 关键测试函数 / 覆盖契约点 | 精确运行命令 |
|---|---|---|---|
| `src/octop/config.py` | `tests/unit/test_config.py` | 布尔/整型强制转换、时区兼容键 | `uv run pytest tests/unit/test_config.py -q` |
| `src/octop/infra/errors.py` | `tests/unit/i18n/` | 前后端 `errors.*` / `apiErrors.*` 键一致 | `uv run pytest tests/unit/i18n -q` |
| `src/octop/infra/db/pool.py`、`migrate.py` | `tests/unit/db/` | `_schema_version == 13`、WAL、双驱动 | `uv run pytest tests/unit/db -q` |
| `src/octop/infra/gateway/process/processor.py` | `tests/unit/gateway/` | 斜杠分发、HITL、流投影、线程键 | `uv run pytest tests/unit/gateway -q` |
| `src/octop/api/routers/*` | `tests/unit/api/` | 鉴权白名单、路由回归、错误映射 | `uv run pytest tests/unit/api -q` |
| `src/octop/infra/cron/`、`proactive/`、`backup/` | `tests/unit/cron/ tests/unit/proactive/ tests/unit/backup/` | 触发器、状态机、备份锁 | `uv run pytest tests/unit/cron tests/unit/proactive tests/unit/backup -q` |
| `src/octop/infra/knowledge/` | `tests/unit/knowledge/` | 分块边界、文档状态机、检索短路 | `uv run pytest tests/unit/knowledge -q` |
| `src/octop/infra/connectors/` | `tests/unit/connectors/` | MCP 字典、OAuth、适配器错误码 | `uv run pytest tests/unit/connectors -q` |
| `src/octop/cli/` | `tests/unit/cli/` | 三态传输、`OCTOP_HOME` 隔离 | `uv run pytest tests/unit/cli -q` |
| `dashboard/src/` | `dashboard/src/**/*.test.ts` | 前端组件/hook 单测 | `cd dashboard && npx tsc --noEmit` |

## 3. 测试环境隔离与 Mock / Fixture 编写规范

1. **临时目录与数据库隔离**：`tests/conftest.py:72-86` 的 `_isolated_user_home` 自动 `monkeypatch.setenv("HOME"/"USERPROFILE")`；涉及 `~/.octop` 物化的新用例须 `monkeypatch.setenv("OCTOP_HOME", str(tmp_path))`（例 `tests/unit/cli/test_run_cmd.py:50`），并用 `Path` 比较而非 POSIX 字符串。
2. **后台守护线程静默**：`tests/conftest.py:54-69` 的 `_suspend_proactive_care_loops` 自动挂起主动关怀循环；新增无关测试必须沿用，防止守护线程竞争临时目录（[`../architecture/async-worker.md`](../architecture/async-worker.md)）。
3. **慢测自动标记**：`tests/conftest.py:15-39` 的 `_SLOW_TEST_MODULES` + `pytest_collection_modifyitems` 自动打 `slow`；`live` 需 `tests/live/conftest.py:39-49` 从仓库根 `.env` 加载凭据，缺失则跳过（`live_openai_config`）。
4. **集成 Fixture**：`tests/integration/conftest.py:36-246` 提供 `app_client`、`env_admin_client`、`env_with_main_agent`、`env_boundary`、`env_fake_harness` 等；`tests/support/` 提供 `fakes.py`、`auth.py`、`http.py`、`scenarios.py`、`postgresql.py`。
5. **跨平台铁律**：POSIX 专属用例用 `posix_only = pytest.mark.skipif(os.name != "posix", ...)`；禁止硬编码 `/`、`/proc`、`~` 路径断言（`AGENTS.md:323-330`）。
6. **提交禁令**：禁止提交测试生成的临时数据库、日志、向量快照或会话记录；`AGENTS.md:346` 禁止裸 `pytest`。

## 4. 共变耦合与修改清单（Co-Change Playbook）

- `.github/workflows/ci.yml:14-66` 的 `quality`（ubuntu，Python 3.12）与 `test-windows` 两作业各跑 `make install/lint/typecheck/test`；`live-tests`（`:68-129`）仅在 fork PR 门控后使用 30 个 `LIVE_*` secrets。
- 改 API 路由：跑 `uv run pytest tests/unit/api -q` + `cd dashboard && npx tsc --noEmit`，并在 `/api/docs` 检查 Scalar 可读性（`AGENTS.md` §7）。
- 改 i18n：跑 `uv run pytest tests/unit/i18n -q` 保证前后端键 parity（[`../contracts/error-codes.md`](../contracts/error-codes.md)）。
- 改 pre-commit：`.githooks/pre-commit` 会 `make all` 与 `npm run build`，`SKIP_PRECOMMIT=1` 仅限紧急场景，禁止用它落红测试。
