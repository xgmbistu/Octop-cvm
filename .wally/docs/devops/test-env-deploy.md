# Test environment deployment

> Static verification only. Sources: `docker/README.md`,
> `docker/docker-compose.yml`, `docker/Dockerfile`, `docker/docker_build.sh`,
> `docker/docker-entrypoint.sh`, `README.md` (Quick Start / Docker),
> `.env.example`, `Makefile`. No build, deploy, or test command was executed
> while preparing this guide; it is configuration evidence, not a run record.

## Prerequisites and working directory

- Docker with Compose (BuildKit for `docker_build.sh` cache mounts).
- Run every command from the repository root.
- Optional overrides in `docker/.env` (Compose interpolation only; a key reaches
  the container only if listed under `environment:` in the compose file).
- First-boot password policy: at least 8 characters with letters and digits.

## Target environment and credentials

- Target: local container `octop`, HTTP `http://localhost:8088` (`OCTOP_PORT`,
  default `8088`), bind host `0.0.0.0`, image `octop:latest`.
- Data: host `~/.octop` (override `OCTOP_DATA`) -> `/data/.octop`, `HOME=/data`.
- First-boot credentials: `admin` / `Octop123`, written by
  `docker/docker-entrypoint.sh` to `/data/.octop/credential.txt`; override via
  `OCTOP_ADMIN_USERNAME` / `OCTOP_DEFAULT_PASSWORD` (or `docker/.env`). Change
  the default immediately after first login. No registry or remote-host
  credential is needed for the local Compose target.

## Build, synchronize, and deploy

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

Alternative: `bash docker/docker_build.sh` then
`docker run -d -p 8088:8088 -v octop-data:/data/.octop -e HOME=/data octop:latest`.
Effective-version check: `docker exec -it octop octop --version`.

## Verification

```bash
curl -f http://localhost:8088/api/health
```

The image defines `HEALTHCHECK ... curl -f http://localhost:${OCTOP_PORT:-8088}/api/health`.
Open `http://localhost:8088` and sign in with the first-boot credentials.

## Failure and rollback

```bash
docker compose -f docker/docker-compose.yml down
docker compose -f docker/docker-compose.yml up -d --build
```

`down` keeps the mounted `~/.octop` data volume; redeploy a known-good
`octop:latest` / tagged image to roll back. Inspect with `docker logs -f octop`.
No separate database-migration rollback command is documented, so back up the
data volume before updates. Record environment retention and actual results in
the task Deploy artifact.
