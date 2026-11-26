# Integration testing

> Static verification only. Sources: `Makefile`, `pyproject.toml`
> (`[tool.pytest.ini_options]`), `.github/workflows/ci.yml`,
> `tests/conftest.py`, `tests/integration/conftest.py`, `AGENTS.md` section 6. No test
> command was executed while preparing this guide; it is configuration evidence,
> not a run record.

## Runner and environment

- Working directory: repository root; Python 3.12+ with `uv`.
- Setup: `make install` (`uv sync` / `pip install -e ".[dev]"`).
- Full non-live gate (unit + `tests/integration`): `make test`, which runs
  `uv run pytest -n auto -m "not live"`. Focused integration run:
  `uv run pytest tests/integration -x -q`.
- CI runs `make install` -> `make lint` -> `make typecheck` -> `make test` on
  Linux and Windows (`.github/workflows/ci.yml`). `tests/conftest.py` auto-marks
  `tests/integration/` modules as `slow`.
- `make all` (format-all + lint + typecheck + test) is the project ship bar.

## Authentication, data, and isolation

- `tests/conftest.py` isolates `HOME` per test (`tmp_octop_home`) for xdist;
  `tests/integration/conftest.py` boots an in-process `OctopServer` via
  `octop_client` with a `FakeHarnessAgent` / patched harness.
- No external LLM, database, or network credentials are needed for `make test`.
  Real credentials are used only by `make test-live` / `tests/live`, injected as
  `LIVE_*` secrets in CI and auto-skipped when absent.
- PostgreSQL-backed cases need `OCTOP_TEST_DATABASE_URL` (see
  `docker/docker-compose.postgres.yml`); without it those cases do not run.

## Result criteria

- `make test` exits 0 and every collected unit and integration case passes; the
  CI quality job stays green on both Linux and Windows.
- An empty, all-skipped, or errored run is not a pass; distinguish assertion,
  environment, and execution failures in the task IT artifact.

## Cleanup and evidence

- Temp `HOME` / `~/.octop` data lives under pytest tmp dirs and is cleaned by
  pytest; `make test` starts no persistent service.
- Record the command, Python/pytest versions, exit code, and per-case results
  in the task IT artifact together with the aggregate gate result.
