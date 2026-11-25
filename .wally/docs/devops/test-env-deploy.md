# Test environment deployment

## Prerequisites and authorization

Environment identifier/owner, access, required services/data, versions, deployment scope, and authorization boundary.

## Build, synchronize, and deploy

Actual project commands and artifact paths. Preserve a defect baseline before updates; state effective-version verification, readiness checks, and expected results.

## Failure and rollback

Failure diagnostics, rollback version/commands/triggers, and data cleanup. Record environment retention/release ownership and actual results.

## Validation evidence

Command, code version, run/request identifiers, output, and conclusion. If no independent test deployment exists, explain the actual validation/release flow with implementation evidence.


During initialization, populate this execution guidance from actual project files. Record sources, working directory, commands, prerequisites, result criteria and cleanup/rollback. In `.wally/config.json`, set optional `readiness: pending` and concrete `gaps` when required information is missing; ask the user and wait for the required information. Mark the phase BLOCKED, not automatically skipped; a guide path alone must not activate it. Set ready only after static verification. This is not evidence of execution. Existing configs without readiness retain legacy command/guide semantics.

## Static initialization record (not executed)

Sources read: README.md (Quick Start, Docker), docker/README.md, docker/Dockerfile, docker/docker-compose.yml, docker/docker_build.sh, docker/docker-entrypoint.sh, .env.example, Makefile, .github/workflows/ci.yml, .github/workflows/docker-publish.yml.

- Entry (real): from the repository root, `docker compose -f docker/docker-compose.yml up -d --build` (docker/README.md Quick start). Alternative: `bash docker/docker_build.sh` then `docker run -d --name octop -p 8088:8088 -v octop-data:/data/.octop -e HOME=/data octop:latest`.
- Target: a single self-hosted container `octop` on `localhost:${OCTOP_PORT:-8088}`; HOME=/data, data in the `~/.octop` bind mount or the `octop-data` volume. No independent test environment is defined.
- Credentials: first-boot admin `admin` / `Octop123` (override `OCTOP_ADMIN_USERNAME`, `OCTOP_DEFAULT_PASSWORD`; written to `/data/.octop/credential.txt`). Optional `OPENAI_API_KEY` / `DASHSCOPE_API_KEY` via `docker/.env` (keys must be listed under `environment:` in docker-compose.yml) or the mounted `~/.octop/env`; no secrets are committed.
- Verify: `curl -f http://localhost:8088/api/health` (Dockerfile HEALTHCHECK), `docker exec -it octop octop --version`, Web UI at http://localhost:8088 and first-boot login.
- Rollback: `docker compose -f docker/docker-compose.yml down`; redeploy the previous image with `up -d --build`. Data persists in the volume/bind mount.
- Readiness: pending. Gaps: no test environment (identifier / host / owner / access / authorization boundary), no test-environment access credentials, no pre-update defect baseline or pinned deploy version (always `octop:latest`). No command, deployment or test was executed.
