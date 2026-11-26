---
kind: config-dict
scope: configuration
status: draft
origin: generated
source_paths: [src/octop/config.py, src/octop/infra/server.py, .env.example, docker/docker-compose.yml, src/octop/infra/setup/wizard_tokens.py, src/octop/infra/knowledge/params.py]
symbols: [OctopConfig, load_config, apply_env_file, WizardTokenStore]
upstream: [../INDEX.md, ../overview/system-architecture.md]
downstream: [../operations/deployment-and-runtime.md, api-reference.md]
---

# 配置项、环境变量与动态开关全集

> 全仓 `src/octop/**/*.py` 中 `os.getenv` / `os.environ` 共命中 **81** 个唯一环境变量名，下表 100% 收录读取锚点；核心配置解析集中在 `src/octop/config.py:394` 的 `load_config`。

## 1. 配置覆盖优先级链

`单次接口显式参数` > `进程环境变量（os.environ / .env 文件）` > `~/.octop/config.json` > `代码硬编码默认值`。`OctopServer.start()` 先 `apply_env_file(env_file_path(...))`（`src/octop/infra/server.py:289`）再 `load_config`（`:291`）；`load_config` 以 `merged = {**file_defaults, **raw}` 合并（`src/octop/config.py:406`），随后各 `OCTOP_*` 环境变量覆盖（`src/octop/config.py:418-549`）。时区键 `default_timezone` 兼容旧的 `cron_timezone`（`src/octop/config.py:408`）。

## 2. 进程环境变量全集（100% 扫描 getenv / environ）

| 环境变量名 | 类型/默认 | 读取锚点（仓库根相对） |
|---|---|---|
| `BROWSER_USE_PROFILES_DIR` | 见源码读取点 | `src/octop/api/routers/channels.py:341` |
| `CODEBUDDY_BUILTIN_SKILLS_DIR` | 见源码读取点 | `src/octop/infra/agents/experts/library/meituan-living-assistant/skills/meituan-deals/scripts/plugin_version_lite.py:76` |
| `CODEBUDDY_CONFIG_DIR` | 见源码读取点 | `src/octop/infra/agents/experts/library/meituan-living-assistant/skills/meituan-deals/scripts/plugin_version_lite.py:75` |
| `CODEBUDDY_PLUGIN_DIRS` | 见源码读取点 | `src/octop/infra/agents/experts/library/meituan-living-assistant/skills/meituan-deals/scripts/plugin_version_lite.py:77` |
| `CODEBUDDY_SESSION_ID` | 见源码读取点 | `src/octop/infra/agents/experts/library/meituan-living-assistant/skills/meituan-deals/scripts/plugin_version_lite.py:68` |
| `COMSPEC` | 见源码读取点 | `src/octop/api/routers/terminal.py:121` |
| `DISPLAY` | 见源码读取点 | `src/octop/api/routers/desktop/stream.py:63` |
| `GEMINI_API_KEY` | 见源码读取点 | `src/octop/infra/agents/experts/library/wechat-ops/skills/publisher-multi-platform/scripts/xhs_publish.py:492` |
| `GH_TOKEN` | 见源码读取点 | `src/octop/infra/skills/skills_hub.py:196` |
| `GITHUB_TOKEN` | 见源码读取点 | `src/octop/infra/skills/skills_hub.py:196` |
| `HOME` | 见源码读取点 | `src/octop/infra/agents/experts/library/meituan-living-assistant/skills/meituan-deals/scripts/plugin_version_lite.py:48` |
| `HUNYUAN_API_KEY` | 见源码读取点 | `src/octop/infra/agents/experts/library/wechat-ops/skills/publisher-multi-platform/scripts/xhs_publish.py:494` |
| `IMG_API_KEY` | 见源码读取点 | `src/octop/infra/agents/experts/library/wechat-ops/skills/publisher-multi-platform/scripts/xhs_publish.py:493` |
| `LOCALAPPDATA` | 见源码读取点 | `src/octop/infra/gateway/media/backend_files.py:112` |
| `OCTOP_ACCESS_TOKEN_TTL` | 见源码读取点 | `src/octop/config.py:424` |
| `OCTOP_ALLOW_RUNTIME_PIP` | 见源码读取点 | `src/octop/infra/agents/providers/onnx_service.py:56` |
| `OCTOP_AUTH_DIR` | 见源码读取点 | `src/octop/infra/agents/experts/library/meituan-living-assistant/skills/meituan-deals/scripts/auth.py:40` |
| `OCTOP_BACKUP_AUTO_ENABLED` | 见源码读取点 | `src/octop/config.py:499` |
| `OCTOP_BACKUP_INCLUDE_CHATS` | 见源码读取点 | `src/octop/config.py:549` |
| `OCTOP_BACKUP_INCLUDE_CONFIG` | 见源码读取点 | `src/octop/config.py:516` |
| `OCTOP_BACKUP_INCLUDE_KNOWLEDGE` | 见源码读取点 | `src/octop/config.py:542` |
| `OCTOP_BACKUP_INCLUDE_PLUGINS` | 见源码读取点 | `src/octop/config.py:537` |
| `OCTOP_BACKUP_INCLUDE_SKILL_PACKAGES` | 见源码读取点 | `src/octop/config.py:528` |
| `OCTOP_BACKUP_INCLUDE_WORKSPACES` | 见源码读取点 | `src/octop/config.py:521` |
| `OCTOP_BACKUP_RETENTION_COUNT` | 见源码读取点 | `src/octop/config.py:507` |
| `OCTOP_BACKUP_SCHEDULE` | 见源码读取点 | `src/octop/config.py:504` |
| `OCTOP_BIND_HOST` | 见源码读取点 | `src/octop/config.py:418` |
| `OCTOP_BROWSER_IDLE_TIMEOUT_MINUTES` | 见源码读取点 | `src/octop/config.py:462` |
| `OCTOP_CODEX_ATTRIBUTION_VERSION` | 见源码读取点 | `src/octop/infra/providers/codex_oauth.py:46` |
| `OCTOP_CORS_ORIGINS` | 见源码读取点 | `src/octop/config.py:440` |
| `OCTOP_CRON_TIMEZONE` | 见源码读取点 | `src/octop/config.py:437` |
| `OCTOP_DATABASE_DRIVER` | 见源码读取点 | `src/octop/config.py:377` |
| `OCTOP_DATABASE_HOST` | 见源码读取点 | `src/octop/config.py:381` |
| `OCTOP_DATABASE_NAME` | 见源码读取点 | `src/octop/config.py:385` |
| `OCTOP_DATABASE_PASSWORD` | 见源码读取点 | `src/octop/config.py:389` |
| `OCTOP_DATABASE_PORT` | 见源码读取点 | `src/octop/config.py:383` |
| `OCTOP_DATABASE_SQLITE_PATH` | 见源码读取点 | `src/octop/config.py:379` |
| `OCTOP_DATABASE_URL` | 见源码读取点 | `src/octop/config.py:375` |
| `OCTOP_DATABASE_USER` | 见源码读取点 | `src/octop/config.py:387` |
| `OCTOP_DEFAULT_TIMEZONE` | 见源码读取点 | `src/octop/config.py:436` |
| `OCTOP_DESKTOP` | 见源码读取点 | `src/octop/api/routers/update.py:156` |
| `OCTOP_DESKTOP_GEOMETRY` | 见源码读取点 | `src/octop/infra/desktop/setup.py:279` |
| `OCTOP_ENABLE_API_DOCS` | 见源码读取点 | `src/octop/config.py:446` |
| `OCTOP_ENABLE_DASHBOARD` | 见源码读取点 | `src/octop/config.py:442` |
| `OCTOP_ENABLE_MOBILE` | 见源码读取点 | `src/octop/config.py:475` |
| `OCTOP_FPK_SITE_PACKAGES` | 见源码读取点 | `src/octop/infra/setup/self_update.py:441` |
| `OCTOP_HOME` | 见源码读取点 | `src/octop/infra/desktop/setup.py:149` |
| `OCTOP_LOGIN_LOCKOUT_SECONDS` | 见源码读取点 | `src/octop/config.py:432` |
| `OCTOP_LOGIN_MAX_ATTEMPTS` | 见源码读取点 | `src/octop/config.py:428` |
| `OCTOP_LOG_COMPRESS` | 见源码读取点 | `src/octop/infra/server.py:107` |
| `OCTOP_LOG_LEVEL` | 见源码读取点 | `src/octop/config.py:422` |
| `OCTOP_LOG_MAX_BYTES` | 见源码读取点 | `src/octop/infra/server.py:151` |
| `OCTOP_LOG_RETENTION_DAYS` | 见源码读取点 | `src/octop/infra/server.py:141` |
| `OCTOP_MAX_UPLOAD_MB` | 见源码读取点 | `src/octop/config.py:454` |
| `OCTOP_PORT` | 见源码读取点 | `src/octop/config.py:420` |
| `OCTOP_REQUIRE_SETUP_PASSWORD` | 见源码读取点 | `src/octop/config.py:450` |
| `OCTOP_SERVICE_MODE` | 见源码读取点 | `src/octop/infra/setup/service.py:80` |
| `OCTOP_SKILLS_DIR` | 见源码读取点 | `src/octop/infra/agents/builtin_skills/skill-manager/scripts/manage_skills.py:83` |
| `OCTOP_SKILLS_HUB_BASE_URL` | 见源码读取点 | `src/octop/infra/skills/skills_hub.py:143` |
| `OCTOP_SKILLS_HUB_HTTP_BACKOFF_BASE` | 见源码读取点 | `src/octop/infra/skills/skills_hub.py:121` |
| `OCTOP_SKILLS_HUB_HTTP_BACKOFF_CAP` | 见源码读取点 | `src/octop/infra/skills/skills_hub.py:129` |
| `OCTOP_SKILLS_HUB_HTTP_RETRIES` | 见源码读取点 | `src/octop/infra/skills/skills_hub.py:113` |
| `OCTOP_SKILLS_HUB_HTTP_TIMEOUT` | 见源码读取点 | `src/octop/infra/skills/skills_hub.py:105` |
| `OCTOP_SKILLS_IMPORT_URL_PREFIXES` | 见源码读取点 | `src/octop/infra/skills/skills_hub.py:53` |
| `OCTOP_UV_BIN` | 见源码读取点 | `src/octop/infra/utils/runtime_packages.py:44` |
| `OPENCLAW_CONFIG_PATH` | 见源码读取点 | `src/octop/infra/agents/experts/library/meituan-living-assistant/skills/meituan-deals/scripts/plugin_version_lite.py:71` |
| `PATH` | 见源码读取点 | `src/octop/infra/connectors/gateway/cli_install.py:114` |
| `PATROL_RETENTION_DAYS` | 见源码读取点 | `src/octop/infra/agents/experts/library/cvm-ai-doctor/skills/cvm-ai-doctor/scripts/cluster_patrol_record.py:34` |
| `PLAYWRIGHT_BROWSERS_PATH` | 见源码读取点 | `src/octop/infra/browser/setup.py:369` |
| `PROGRAMFILES` | 见源码读取点 | `src/octop/infra/agents/experts/library/office-automation/skills/xlsx/scripts/office/soffice.py:41` |
| `QCLAW_USER_ID` | 见源码读取点 | `src/octop/infra/agents/experts/library/meituan-living-assistant/skills/meituan-deals/scripts/plugin_version_lite.py:66` |
| `SHELL` | 见源码读取点 | `src/octop/cli/commands/completion.py:22` |
| `SKILLHUB_HOST` | 见源码读取点 | `src/octop/infra/agents/experts/skillhub_market.py:461` |
| `SYSTEMROOT` | 见源码读取点 | `src/octop/api/routers/terminal.py:125` |
| `USER` | 见源码读取点 | `src/octop/api/routers/terminal.py:491` |
| `USERNAME` | 见源码读取点 | `src/octop/api/routers/terminal.py:491` |
| `VIRTUAL_ENV` | 见源码读取点 | `src/octop/infra/setup/self_update.py:68` |
| `WAYLAND_DISPLAY` | 见源码读取点 | `src/octop/infra/desktop/setup.py:535` |
| `WORKBUDDY_AUTH_FILE` | 见源码读取点 | `src/octop/infra/agents/experts/library/meituan-living-assistant/skills/meituan-deals/scripts/auth.py:36` |
| `WORKBUDDY_CONFIG_DIR` | 见源码读取点 | `src/octop/infra/agents/experts/library/meituan-living-assistant/skills/meituan-deals/scripts/plugin_version_lite.py:74` |
| `XHS_COOKIE_FILE` | 见源码读取点 | `src/octop/infra/agents/experts/library/wechat-ops/skills/publisher-multi-platform/scripts/xhs_publish.py:54` |

> `config.py` 内主开关默认值：`OCTOP_PORT=8088`（`src/octop/config.py:127`）、`OCTOP_BIND_HOST=127.0.0.1`（`:126`）、`OCTOP_ACCESS_TOKEN_TTL=86400`（`:129`）、`OCTOP_DEFAULT_TIMEZONE=Asia/Shanghai`（`:133`）、`OCTOP_MAX_UPLOAD_MB=100`（`:143`，范围 1–1024，`parse_max_upload_mb` 位于 `:243`）、`OCTOP_BROWSER_IDLE_TIMEOUT_MINUTES=30`（`:144`）、`login_max_attempts=5` / `login_lockout_seconds=900`（`:130-131`）。日志轮转 `OCTOP_LOG_RETENTION_DAYS=14`、`OCTOP_LOG_MAX_BYTES` 默认 100 MiB（`src/octop/infra/server.py:141`、`:151`）。

## 3. `config.json` 持久化键与动态策略开关

| 配置域 | 键 | 默认值 | 生效时机与约束 | 源码锚点 |
|---|---|---|---|---|
| database | `driver` | `"sqlite"` | `sqlite|postgresql` 二选一（`_VALID_DRIVERS`） | `src/octop/config.py:20`、`:43` |
| database | `sqlite_path` | `octop.db` | SQLite 库文件名 | `src/octop/config.py:44` |
| tls | `enabled` / `acme_staging` / `http_port` | `False` / `False` / `80` | 仅文件解析 | `src/octop/config.py:80-88`、`:161` |
| backup | `auto_enabled` / `schedule` / `retention_count` | `False` / `cron:0 4 * * *` / `7` | 下一调度周期生效，`retention>=1` | `src/octop/config.py:95-97`、`src/octop/infra/backup/auto.py:134` |
| capabilities.mobile | `enabled` / `backend` | `False` / `none` | 决定 `src/octop/api/app.py:268` 是否挂 mobile 路由 | `src/octop/config.py:113-116`、`:184` |
| knowledge 高级参数 | `DEFAULT_CHUNK_SIZE=800`、`DEFAULT_RETRIEVAL_K=8`、`DEFAULT_CONTEXT_CHAR_BUDGET=6000` | 见源码 | `chunk` 大小 100–8000、k 1–20 | `src/octop/infra/knowledge/params.py:7-22` |
| 向导令牌 | `RATE_LIMIT_BURST=5`、`RATE_LIMIT_WINDOW=60.0` | 常量 | 防爆破 | `src/octop/infra/setup/wizard_tokens.py:12-13` |

## 4. 下游服务端点与凭据安全规则

| 下游目标 | 配置来源 | 脱敏与回退 | 源码锚点 |
|---|---|---|---|
| LLM / Embedding | Provider 表 `base_url`/`api_key` + `.env.example` 的 `OPENAI_API_KEY`、`DASHSCOPE_API_KEY` | 不明文回显、不进日志；未配置则探测失败 | `.env.example:31`、`:33` |
| OSS / COS / S3 | `OSS_*` / `ALI_OSS_*` 环境变量组 | 凭据经 `BackendRepo` 与 `secrets` 表加密 | `.env.example:57-75` |
| 连接器 Token | 16 个 `CONNECTOR_*_TOKEN` | 与 `connector_oauth_states` 分离存储 | `.env.example:77-94` |
| Langfuse | `OCTOP_LANGFUSE_ENABLED=false` + `LANGFUSE_*` | 默认关闭 | `.env.example:35-39` |
| Docker 首启管理员 | `OCTOP_ADMIN_USERNAME=admin`、`OCTOP_DEFAULT_PASSWORD=Octop123` | 写入 `credential.txt` 后 `chmod 600` | `docker/docker-compose.yml:39`、`docker/docker-entrypoint.sh:34` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

1. 新增环境变量：`config.py` 加读取与默认值 → `_defaults_for_file`（`src/octop/config.py:151`）补 `config.json` 默认键 → `.env.example` 补样例 → 本表补锚点。
2. 影响启动装配的开关（如 `capabilities.mobile`）须同步核对 `src/octop/api/app.py:268` 条件挂载与 `src/octop/infra/server.py:291` 探测。
3. 运行 `uv run pytest tests/unit/test_config.py -q` 验证布尔/整型强制转换（`_coerce_bool` 位于 `src/octop/config.py:282`）。

配置优先级链与运行期装配见 [`../overview/system-architecture.md`](../overview/system-architecture.md)，容器环境变量注入见 [`../operations/deployment-and-runtime.md`](../operations/deployment-and-runtime.md)，全量端点鉴权例外见 [`api-reference.md`](api-reference.md)。
