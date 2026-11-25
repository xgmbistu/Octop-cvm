---
kind: operations
scope: dev-and-test
status: draft
origin: generated
source_paths: [Makefile, pyproject.toml, conftest.py, tests/conftest.py, tests/integration/conftest.py, tests/support/fakes.py, .github/workflows/ci.yml]
symbols: [make_all, pytest, octop_client, patch_harness, FakeHarnessAgent]
upstream: [INDEX.md]
downstream: []
---

# 构建启动与单测验证手册（Agent Verification Playbook）

Python 3.12+，`uv` 为包管理器（**永远 `uv run pytest`，不裸跑 `pytest`**）；ship bar 为 `make all`，CI 在 Linux 与 Windows 双平台跑同一组命令。

## 1. 环境前置与可执行命令速查

| 动作 | 精确执行命令 | 配置来源 | 备注 / 前置 |
|---|---|---|---|
| 安装依赖 | `uv sync` 或 `pip install -e ".[dev]"` | `Makefile:303-310` | Python ≥3.12（`pyproject.toml:11`） |
| 装 Git hooks | `make install-hooks`（`core.hooksPath=.githooks`） | `Makefile:295-301` | pre-commit 跑 `make precommit` + dashboard build |
| ship bar | `make all` = `format-all lint typecheck test` | `Makefile:201-202` | 改任何代码后必跑 |
| lint / 格式检查 | `make lint`（`ruff check src tests` + `ruff format --check`） | `Makefile:204-209` | 配置 `pyproject.toml:120-133` |
| 类型检查 | `make typecheck`（`mypy src/octop`，strict） | `Makefile:217-220`、`pyproject.toml:134-200` | — |
| 全量单测 | `make test`（`pytest -n auto -m "not live"`） | `Makefile:222-225` | `PYTEST_JOBS` 默认 32 |
| 快速单测 | `make test-fast`（`-m "not live and not slow"`） | `Makefile:227-230` | 跳过 integration boot/browser |
| 增量单测 | `make test-affected`（`pytest --testmon`，刻意不带 `-m`） | `Makefile:255-258` | testmon 遇 marker 退化全量 |
| live 测试 | `make test-live`（`pytest -m live`） | `Makefile:232-235`、`pyproject.toml:206` | 需 `LIVE_*`/`.env` 密钥，缺则 skip |
| 前端检查 | `cd dashboard && npx tsc --noEmit`；`npm run lint` | `Makefile:262-277` | 改 `dashboard/` 后必跑 |
| 启动服务 | `uv run octop run --host 127.0.0.1 --port 8088` | `src/octop/cli/commands/run.py:153` | 首启向导 `~/octop-login.txt` |
| 冒烟自检 | `curl -f http://localhost:8088/api/health` | `src/octop/api/routers/health.py:14` | 预期 200 |

CI（`.github/workflows/ci.yml`）：`quality`（ubuntu/py3.12，`make install → lint → typecheck → test`，`:14-42`）、`test-windows`（windows/py3.12，同四命令，`:44-66`）、`live-tests`（仅本仓 PR 注入 40+ secrets，`:68-129`）。

## 2. 源码模块 → 必跑回归测试映射表

| 被改源码目录 | 必跑测试 | 覆盖契约点 | 精确命令 |
|---|---|---|---|
| `src/octop/infra/agents/` | `tests/unit/agents/`、`tests/live/test_agent_manager*.py` | agent 生命周期、provider 重载、bootstrap 边界 | `uv run pytest tests/unit/agents -q` |
| `src/octop/infra/gateway/` | `tests/unit/gateway/`、`tests/integration/test_chat*.py` | slash 分派、消息键、流投影 | `uv run pytest tests/unit/gateway -q` |
| `src/octop/infra/cron/`、`proactive/` | `tests/unit/cron/`、`tests/unit/proactive/test_scheduler.py` | 触发器、状态机、关怀窗口 | `uv run pytest tests/unit/cron tests/unit/proactive -q` |
| `src/octop/infra/db/` | `tests/unit/db/`（含 `test_db_pool.py` 版本断言） | 迁移、pool、repo 映射 | `uv run pytest tests/unit/db -q` |
| `src/octop/infra/connectors/` | `tests/unit/connectors/`、`tests/integration/test_connectors_api.py` | 凭证字典、MCP 信封、错误翻译 | `uv run pytest tests/unit/connectors -q` |
| `src/octop/infra/knowledge/` | `tests/unit/knowledge/` | chunk/embed/向量检索/citation | `uv run pytest tests/unit/knowledge -q` |
| `src/octop/infra/voice/` | `tests/unit/voice/` | TC3 签名、返回解包 | `uv run pytest tests/unit/voice -q` |
| `src/octop/infra/{mobile,desktop,browser}/` | `tests/unit/{mobile,desktop,browser}/`（POSIX 标记） | argv 构造、帧提取 | `uv run pytest tests/unit/mobile tests/unit/desktop -q` |
| `src/octop/api/` | `tests/unit/api/`、`tests/integration/`（70 个 `test_*_api.py`） | 路由、鉴权、WS、scope | `uv run pytest tests/unit/api -q` |
| `src/octop/cli/` | `tests/unit/cli/` | 命令注册表、offline/embedded | `uv run pytest tests/unit/cli -q` |
| `src/octop/i18n/` | `tests/unit/i18n/` | en/zh key 奇偶、domain helper | `uv run pytest tests/unit/i18n -q` |
| `dashboard/` | Vitest + `npx tsc --noEmit` | API wrapper、路由、帧解析 | `cd dashboard && npm test -- --run` |

`tests/integration/` 用 in-process httpx AsyncClient + `FakeHarnessAgent`（`tests/support/fakes.py:34`）/ `patch_harness`（`tests/support/harness.py:179`），每测试隔离 HOME，无需外部服务或真凭证。

## 3. 测试环境隔离与 Mock / Fixture 编写规范

1. **HOME / DB 隔离**：`tests/conftest.py:72-86 _isolated_user_home` autouse 隔离 HOME/USERPROFILE（xdist 必需）；`tmp_octop_home`（`:89-95`）；新用例必须 `monkeypatch.setenv("OCTOP_HOME", str(tmp_path))`，不得假设 `~/.octop/...` 字面路径。
2. **后台调度静默**：`tests/conftest.py:54-69 _suspend_proactive_care_loops` 全局 patch `ProactiveCareScheduler`，唯一例外 `tests/unit/proactive/test_scheduler.py`。
3. **慢测试标记**：`tests/conftest.py:15-39` 把 9 个重型模块与全部 integration 自动标 `slow`；`postgresql` 需 `OCTOP_TEST_DATABASE_URL`（`tests/support/postgresql.py:15`）。
4. **跨平台**：POSIX-only 行为用 `@pytest.mark.skipif(os.name != "posix")`；路径用 `Path` 与 `tests.support.fakes.fake_bin_path`，禁止硬编码 `/proc`、`/etc`、`/root`。
5. **testmon 补丁**：根 `conftest.py:1-11` 在 `pytest_configure` 前打 staged-aware 补丁（`tests/support/testmon_staged_changes.py:32,45`），不要裸跑 pytest 绕过。
6. **提交禁令**：测试生成的临时 DB、日志、向量快照、会话记录不得提交（见 `AGENTS.md` 与 [`boundary.md`](boundary.md)）。

## 4. 导航与共变索引

受影响模块的业务流程见 [业务总表](../business/index.md)，改动后的排障信号见 [Runbook](runbook-and-observability.md)，提交与发布约束见 [高危雷区](pitfalls-and-adr.md)。
