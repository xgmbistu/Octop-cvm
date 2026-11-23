# Integration testing

> Initialization-only static verification. Commands and conclusions below cite the
> files actually read. No test, package install, service start or environment probe
> was run. `.wally/config.json` keeps `it.readiness: pending` with the gaps the
> project owner must supply before this phase can be activated.

## Runner, scope and working directory

- Runner: `uv run pytest` — bare `pytest` is explicitly disallowed
  (`AGENTS.md` §6 "Do not write bare `pytest` — always `uv run pytest`").
  `Makefile:27-30` prefers `uv run` and falls back to plain `python3`/`pip`.
- Pytest configuration: `pyproject.toml:202-209` — `testpaths = ["tests"]`,
  `asyncio_mode = "auto"`, markers `live` (real LLM/external services), `slow`
  (integration boot / real harness / browser) and `postgresql`
  (needs `OCTOP_TEST_DATABASE_URL`).
- Cases: `tests/integration/` (API-level, e.g. `test_auth_flow.py`,
  `test_agents_api.py`, `test_e2e_golden_path.py`, `test_dashboard_serve.py`).
  Other suites: `tests/unit/`, `tests/live/`, `tests/fixtures/`, `tests/support/`.
  `tests/conftest.py` marks every `tests/integration/` module `slow`.
- Working directory: repository root (`Makefile:17` `REPO_ROOT := $(shell pwd)`;
  all `make` targets are invoked from root).
- Commands (`AGENTS.md` §6, `Makefile:222-235`, `.github/workflows/ci.yml:41-42`,
  `CONTRIBUTING.md:12-14`):

```bash
uv run pytest tests/integration -x -q      # integration cases only
uv run pytest -m "not live"                # full non-live suite
make test                                   # pytest -n auto -m "not live"
make test-fast                              # -m "not live and not slow"
make test-live                              # -m live (real credentials)
```

- CI aggregate: `.github/workflows/ci.yml` runs `make install`, `make lint`,
  `make typecheck`, `make test` on Linux Python 3.12 (`:13-42`) and Windows Python
  3.12 (`:44-66`); a separate `live-tests` job runs `make test-live` with `LIVE_*`
  secrets (`:68-129`). CI is triggered on pull requests only (`:6-7`).

## Environment, prerequisites and non-dependence on Deploy

Integration cases boot the FastAPI app in-process: `tests/integration/conftest.py`
imports `octop.api.app.build_app`, `octop.infra.server.OctopServer` and uses
`tests.support.app.octop_client`, `FakeHarnessAgent` / `patch_harness`
(`tests/support/`), with an admin client from `bootstrap_admin` / `auth_header`
(`tests/support/auth.py`). They therefore do **not** require the Docker Compose
deployment in `.wally/docs/devops/test-env-deploy.md`; that is the basis for IT
not being gated on a deployed environment. No production host, credentials or
data are used by the local IT command.

- `live` cases need real credentials injected as `LIVE_*` env vars
  (`.github/workflows/ci.yml:86-129`); missing secrets make them auto-skip
  (`:86-87`) and they are excluded by `-m "not live"`.
- `postgresql`-marked cases need `OCTOP_TEST_DATABASE_URL` (`pyproject.toml:208`);
  a pgvector instance is provided by `docker/docker-compose.postgres.yml:23-36`.
- Auth/test data: `tests/support/auth.py` (`bootstrap_admin`, `auth_header`,
  `create_user`, `create_agent`, `seed_openai_provider`),
  `tests/support/scenarios.py` (`bootstrap_boundary_env`),
  `tests/support/fakes.py` (`FakeHarnessAgent`) and `tests/fixtures/`.
- Isolation/cleanup: per-test temporary `OCTOP_HOME` via `tmp_octop_home` and
  pytest `tmp_path` (`tests/integration/conftest.py`); `tests/conftest.py`
  suspends proactive-care loops. No shared database is configured.

## Success criteria

- `uv run pytest tests/integration -x -q` exits 0 with zero failures/errors;
  `make test` is green on Linux and Windows (`.github/workflows/ci.yml:13-66`).
- A run collecting zero cases or skipping everything is **not** a pass.
  Auto-skipped `live` cases must be disclosed as unverified, not counted as
  end-to-end verification; missing environment, tools, permissions or a failing
  case are blocked/failed, never silently skipped.
- Aggregate ship bar: `make all` = `format-all` + `lint` + `typecheck` + `test`
  (`Makefile:201-202`, `AGENTS.md` §6, `CONTRIBUTING.md:63-64`).
- Per-case results: pytest stdout (`-q` summary and node ids); aggregate results:
  GitHub Actions job logs (`.github/workflows/ci.yml`). No JUnit XML / persisted
  report file is configured (gap).
- Defect/performance tasks: retain comparable before/after (A/B) evidence and
  state the limits; no A/B harness or baseline entry point is defined here (gap).

## Gaps (readiness: pending)

1. No dedicated post-deploy IT environment is configured: the in-process
   integration suite does not exercise the Docker deployment.
2. No persisted per-case or aggregate report path is configured (pytest stdout /
   CI job log only).
3. `LIVE_*` credentials and `OCTOP_TEST_DATABASE_URL` are outside the local
   runner; their access/ownership is not defined in the repository.

## Validation evidence

Static verification only — no test was executed during initialization. In the
task's IT artifact record the exact command, code revision, per-case results,
aggregate CI run id/log, skipped markers and the conclusion. Do not present a
skipped or unexecuted suite as a passed end-to-end verification.
