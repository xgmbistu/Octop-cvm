---
kind: api-contract
scope: api-admin-and-setup
status: draft
origin: generated
source_paths: [src/octop/api/routers/setup.py, src/octop/api/routers/auth.py, src/octop/api/routers/auth_oidc.py, src/octop/api/routers/providers.py, src/octop/api/routers/backup.py, src/octop/api/routers/cron.py]
symbols: [setup_finish, login, oidc_callback, probe_provider, create_backup, CronManager.create]
upstream: [contracts/api-reference.md]
downstream: [business/setup-and-auth.md, business/cron-and-proactive.md]
---

# 入向接口分组契约：`安装 / 认证 / 管理 / 定时`

本页展开 `contracts/api-reference.md` 中「系统管理」组端点；向导期锁定的 503 语义与 JWT 滑动续期统一见总页，业务闭环见 [`WF-03`](../../business/setup-and-auth.md) 与 [`WF-02`](../../business/cron-and-proactive.md)。

## 1. 首次安装向导（`/api/setup/*`）

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| GET | `/api/setup/presets` | presets | `src/octop/api/routers/setup.py:213` |
| GET | `/api/setup/validate-token` | validate token | `setup.py:219` |
| GET | `/api/setup/status` | status | `setup.py:232` |
| POST | `/api/setup/test-database` | test database | `setup.py:254` |
| POST | `/api/setup/database` | bind database | `setup.py:272` |
| POST | `/api/setup/begin` | begin wizard | `setup.py:309` |
| POST | `/api/setup/verify-password` | verify password | `setup.py:319` |
| POST | `/api/setup/initial-admin` | initial admin | `setup.py:341` |
| POST | `/api/setup/resume-wizard` | resume | `setup.py:378` |
| POST | `/api/setup/test-provider` | test provider | `setup.py:390` |
| POST | `/api/setup/finish` | `setup_finish` | `setup.py:412` |

## 2. 登录与 OIDC（`/api/auth/*`）

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| POST | `/api/auth/login` | `login` | `src/octop/api/routers/auth.py:40` |
| POST | `/api/auth/logout` | logout | `auth.py:61` |
| GET | `/api/auth/me` | current user | `auth.py:68` |
| POST | `/api/auth/change-password` | change password | `auth.py:74` |
| PATCH | `/api/auth/me` | patch me | `auth.py:90` |
| GET | `/api/auth/oidc/status` | status | `src/octop/api/routers/auth_oidc.py:68` |
| POST | `/api/auth/oidc/start` | start | `auth_oidc.py:74` |
| GET | `/api/auth/oidc/callback` | `oidc_callback` | `auth_oidc.py:109` |
| POST | `/api/auth/oidc/exchange` | exchange | `auth_oidc.py:137` |
| GET | `/api/auth/oidc/config` | get config | `auth_oidc.py:158` |
| PUT | `/api/auth/oidc/config` | put config | `auth_oidc.py:168` |
| POST | `/api/auth/oidc/config/test` | test config | `auth_oidc.py:182` |

## 3. 管理、备份与可观测（`/api/admin/*`、`/api/usage/*`）

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| GET | `/api/admin/overview` | overview | `src/octop/api/routers/admin.py:14` |
| GET | `/api/admin/audit-log` | audit log | `admin.py:47` |
| GET | `/api/admin/metrics` | metrics | `admin.py:70` |
| GET | `/api/admin/backup/list` | list | `src/octop/api/routers/backup.py:213` |
| GET | `/api/admin/backup/status` | status | `backup.py:226` |
| GET | `/api/admin/backup/auto` | auto config | `backup.py:234` |
| PUT | `/api/admin/backup/auto` | set auto | `backup.py:243` |
| POST | `/api/admin/backup/auto/run` | run auto | `backup.py:255` |
| POST | `/api/admin/backup/create` | `create_backup` | `backup.py:271` |
| GET | `/api/admin/backup/files/{filename}` | download | `backup.py:293` |
| POST | `/api/admin/backup/files/{filename}/restore` | restore | `backup.py:314` |
| DELETE | `/api/admin/backup/files/{filename}` | delete | `backup.py:358` |
| GET | `/api/admin/backup/export` | export | `backup.py:369` |
| POST | `/api/admin/backup/import` | import | `backup.py:413` |
| GET | `/api/admin/observability/langfuse` | get | `src/octop/api/routers/observability.py:51` |
| PUT | `/api/admin/observability/langfuse` | put | `observability.py:59` |
| POST | `/api/admin/observability/langfuse/test` | test | `observability.py:74` |
| GET | `/api/admin/security` | get | `src/octop/api/routers/security.py:45` |
| PUT | `/api/admin/security` | put | `security.py:53` |
| GET | `/api/admin/security/tool-guard/rules` | rules | `security.py:128` |
| GET | `/api/admin/security/tool-guard/rules/raw` | raw rules | `security.py:143` |
| PUT | `/api/admin/security/tool-guard/rules/raw` | put raw | `security.py:152` |
| POST | `/api/admin/security/tool-guard/rules/reset` | reset | `security.py:173` |
| GET | `/api/admin/security/defaults` | defaults | `security.py:190` |
| GET | `/api/admin/media-generation` | get | `src/octop/api/routers/media_generation.py:74` |
| PUT | `/api/admin/media-generation` | put | `media_generation.py:87` |
| POST | `/api/admin/media-generation/test` | test | `media_generation.py:118` |
| GET | `/api/admin/tls/status` | TLS status | `src/octop/api/routers/tls.py:55` |
| POST | `/api/admin/tls/preflight` | preflight | `tls.py:66` |
| POST | `/api/admin/tls/issue` | issue | `tls.py:80` |
| GET | `/api/usage/summary` | user summary | `src/octop/api/routers/usage.py:44` |
| GET | `/api/admin/usage/summary` | admin summary | `usage.py:75` |
| GET | `/api/update/status` | status | `src/octop/api/routers/update.py:73` |
| POST | `/api/update/check` | check | `update.py:82` |
| POST | `/api/update/upgrade` | upgrade | `update.py:121` |
| GET | `/api/update/progress` | progress | `update.py:133` |
| POST | `/api/update/restart` | restart | `update.py:173` |

## 4. Provider / Cron / 设置与系统端点

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| GET | `/api/providers/presets` | presets | `src/octop/api/routers/providers.py:139` |
| GET | `/api/providers/resolved` | resolved | `providers.py:147` |
| GET | `/api/providers/active-model` | get active | `providers.py:164` |
| PUT | `/api/providers/active-model` | put active | `providers.py:174` |
| GET | `/api/providers` | list | `providers.py:187` |
| GET | `/api/admin/providers` | admin list | `providers.py:201` |
| POST | `/api/admin/providers` | admin create | `providers.py:209` |
| PATCH | `/api/admin/providers/{provider_id}` | patch | `providers.py:232` |
| DELETE | `/api/admin/providers/{provider_id}` | delete | `providers.py:267` |
| POST | `/api/providers/test-draft` | test draft | `providers.py:298` |
| POST | `/api/providers/fetch-models` | fetch models | `providers.py:328` |
| POST | `/api/providers/codex-oauth/start` | Codex OAuth | `providers.py:401` |
| GET | `/api/providers/codex-oauth/pending/{state_id}` | pending | `providers.py:429` |
| DELETE | `/api/providers/codex-oauth` | delete | `providers.py:448` |
| POST | `/api/providers/{provider_id}/test` | `probe_provider` | `providers.py:465` |
| POST | `/api/search/{provider_id}/test` | search test | `src/octop/api/routers/search.py:36` |
| GET | `/api/cron/settings` | settings | `src/octop/api/routers/cron.py:66` |
| GET | `/api/agents/{agent_id}/cron` | list cron | `cron.py:75` |
| POST | `/api/agents/{agent_id}/cron` | create cron | `cron.py:91` |
| GET | `/api/agents/{agent_id}/cron/{cron_id}` | get cron | `cron.py:128` |
| PATCH | `/api/agents/{agent_id}/cron/{cron_id}` | update cron | `cron.py:144` |
| DELETE | `/api/agents/{agent_id}/cron/{cron_id}` | delete cron | `cron.py:190` |
| POST | `/api/agents/{agent_id}/cron/{cron_id}/run-now` | run now | `cron.py:207` |
| GET | `/api/agents/{agent_id}/proactive-care` | get config | `src/octop/api/routers/proactive_care.py:97` |
| PUT | `/api/agents/{agent_id}/proactive-care` | put config | `proactive_care.py:112` |
| GET | `/api/settings/timezone` | timezone | `src/octop/api/routers/settings.py:25` |
| GET | `/api/settings/upload` | upload limit | `settings.py:38` |
| GET | `/api/settings/capabilities` | capabilities | `settings.py:65` |
| GET | `/api/envs` | get envs | `src/octop/api/routers/envs.py:53` |
| PUT | `/api/envs` | put envs | `envs.py:62` |
| DELETE | `/api/envs/{key}` | delete env | `envs.py:94` |
| GET | `/api/health` | health | `src/octop/api/routers/health.py:14` |
| GET | `/api/i18n/tools` | tool labels | `src/octop/api/routers/i18n.py:24` |
| GET | `/api/i18n/skills` | skill labels | `i18n.py:36` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

1. 向导端点改动必须同步 `setup_lockdown.py:15,31` 白名单，否则 503 拦截；见 [`setup-and-auth.md`](../../business/setup-and-auth.md)。
2. 新增 admin 端点须加 `require_admin`（`deps.py:217`），备份类端点还需 `BACKUP_LOCK`（`backup/auto.py:42-78`）。
3. 所有 `ErrorCode` 同步 `src/octop/i18n/en.json|zh.json` 与前端 `apiErrors.*`；变更 provider 探测字典见 [`llm-providers.md`](../../integrations/downstream/llm-providers.md)。
