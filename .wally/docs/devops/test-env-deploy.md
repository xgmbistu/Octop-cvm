# Test environment deployment

> Initialization-only static verification. Every command below is copied from the
> source path cited beside it. Nothing here was executed: no image was built, no
> container was started, no environment was probed, and no deployment or test was
> performed. `.wally/config.json` keeps `deploy.readiness: pending` with the gaps
> the project owner must supply before this phase can be activated.

## Prerequisites and authorization

- Deployment shape: one self-hosted container defined by `docker/docker-compose.yml:22-33`
  (`build.context: ..`, `dockerfile: docker/Dockerfile`, `image: octop:latest`,
  `container_name: octop`). Quick start and operations: `docker/README.md:19-29`,
  `docker/README.md:84-91`.
- Working directory: repository root (`docker/README.md:23`, `docker/docker_build.sh:22-23`).
- Runtime dependency: Docker with BuildKit (`DOCKER_BUILDKIT=1`,
  `docker/docker_build.sh:28-29`); the image build is driven by `docker/Dockerfile`
  and the repo-root build context (`docker/docker-compose.yml:24-26`).
- Listen port: `${OCTOP_PORT:-8088}` mapped host:container
  (`docker/docker-compose.yml:30-31`, `docker-compose.yml:37`, `docs/configuration.md:133`,
  `docker/Dockerfile:134`).
- Data/volume: `${OCTOP_DATA:-~/.octop}` mounted at `/data/.octop` with `HOME=/data`
  (`docker/docker-compose.yml:33-35`, `docker/README.md:59`, `docker/README.md:70-74`).
  First boot runs `octop init`; credentials are written under `/data/.octop`
  (`docker/README.md:74`).
- Configuration/credential entry points (names only; no values are stored in this
  repo): `OCTOP_ADMIN_USERNAME`, `OCTOP_DEFAULT_PASSWORD`, `OCTOP_ADMIN_DISPLAY_NAME`,
  `OCTOP_DATABASE_*`, `OPENAI_API_KEY`, `DASHSCOPE_API_KEY`, `LANGFUSE_*`
  (`docker/README.md:55-68`, `docker/docker-compose.yml:39-55`,
  `docs/configuration.md:129-161`). Supply them via `docker/.env` (only keys listed
  under `environment:` reach the container) or `~/.octop/env` in the mounted volume
  (`docker/README.md:68`, `docs/configuration.md:168-171`). How to obtain the
  secrets and who owns them is not documented (gap).
- Authorization boundary: the repository defines no target host, environment owner,
  access grant or external-write permission (gap). Initialization records local
  commands only and does not authorize external writes or deployments.

## Build, synchronize, and deploy

Sources: `docker/README.md:21-41`, `docker/README.md:84-91`,
`docker/docker_build.sh:22-59`, `docker/docker-compose.yml:24-27`.

From the repository root:

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

Alternative explicit build/run (`docker/README.md:31-41`,
`docker/docker_build.sh:25-59`, `docker/docker_build.sh:65-68`):

```bash
bash docker/docker_build.sh octop:latest
docker run -d --name octop -p 8088:8088 -v octop-data:/data/.octop -e HOME=/data octop:latest
```

Deploy artifact is the `octop:latest` image (`docker/docker-compose.yml:27`,
`docker/docker_build.sh:25`). No version tag or image digest is pinned (gap).
A plain `make build` (`Makefile:93-94`, frontend + wheel) is a build, not a Deploy,
and is not used as the deployment command here.

Effectiveness / readiness checks (`docker/README.md:76-88`,
`docker/Dockerfile:136-137`, `docs/api.md:32`):

```bash
docker compose -f docker/docker-compose.yml ps
docker exec -it octop octop --version
curl -f http://localhost:8088/api/health
```

Expected result: container running/healthy, HTTP success from `/api/health`,
dashboard reachable at `http://localhost:8088` (`docker/README.md:29`). The
`HEALTHCHECK` in `docker/Dockerfile:136-137` probes the same endpoint. Preserving a
defect baseline before an update is not described anywhere in the repository (gap).

## Failure and rollback

Diagnostics (`docker/README.md:86-88`):

```bash
docker logs -f octop
docker compose -f docker/docker-compose.yml ps
```

Stop/remove and redeploy (`docker/README.md:89-90`):

```bash
docker compose -f docker/docker-compose.yml down
docker compose -f docker/docker-compose.yml up -d --build
```

Rollback: the Compose service always builds `octop:latest`
(`docker/docker-compose.yml:24-27`); no previous image tag/digest, rollback
trigger condition, or rollback owner is recorded. A version-specific rollback
therefore cannot be stated without inventing one (gap). Data cleanup/retention:
`~/.octop` / `octop-data` persists across `down`; who owns retention and release
of the environment is not documented (gap). Items that are not applicable are
recorded as gaps rather than assumed.

## Validation evidence

Record in the task artifact: image tag/digest, container id, `octop --version`
output, `/api/health` response, `docker compose ps` state, log/request identifiers,
and the conclusion. No such evidence was produced during initialization — this is
static verification only, not an executed deployment. Where no independent test
deployment exists, the repository's actual validation flow is the CI quality gate
(`.github/workflows/ci.yml:32-42`, `:56-66`: `make install` → `make lint` →
`make typecheck` → `make test` on Linux and Windows) plus `make all`
(`Makefile:201-202`, `AGENTS.md` §6, `CONTRIBUTING.md:12-14`); that describes the
release flow, not a completed deployment.
