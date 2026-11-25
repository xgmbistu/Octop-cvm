---
kind: config-dict
scope: configuration
status: draft
origin: generated
source_paths: [src/octop/config.py, src/octop/infra/server.py, src/octop/infra/utils/env_file.py, src/octop/infra/utils/paths.py, src/octop/infra/setup/tls/listeners.py, .env.example]
symbols: [OctopConfig, load_config, _apply_database_env, apply_env_file, PathLayout.from_env, TlsConfig]
upstream: [INDEX.md, overview/system-architecture.md]
downstream: [operations/deployment-and-runtime.md]
---

# 配置项、环境变量与动态开关全集

## 1. 配置覆盖优先级链

`CLI --host/--port` > `进程环境变量（OCTOP_*）` > `~/.octop/env` 文件（仅合并未 set 的键）> `~/.octop/config.json` > 代码默认值。

解析入口 `load_config`（`src/octop/config.py:394-582`）：`merged={**file_defaults,**raw}`（`:406`），legacy `cron_timezone` 回退并弹出（`:408-410`），数据库段 `_apply_database_env`（`:413-417`），随后逐项 `if v := os.environ.get(...)` 覆盖（`:418-553`）。`~/.octop/env` 由 `OctopServer.start()` 在加载配置前 `apply_env_file` 注入（`server.py:287-289`、`env_file.py:87-92`，保护 `HOME/USER/*` 与全部 `OCTOP_*` 键不被 overlay）。

## 2. 进程环境变量全集（核心 `OCTOP_*`）

| 环境变量名 | 类型 | 代码默认值 | 必填 | 控制行为与边界 | 读取锚点 |
|---|---|---|---|---|---|
| `OCTOP_HOME` | `str` | `~/.octop` | 否 | 安装根目录 | `src/octop/infra/utils/paths.py:17` |
| `OCTOP_BIND_HOST` | `str` | `127.0.0.1` | 否 | 绑定地址（Docker 内 `0.0.0.0`） | `config.py:418` |
| `OCTOP_PORT` | `int` | `8088` | 否 | HTTP 端口 | `config.py:420` |
| `OCTOP_LOG_LEVEL` | `str` | `info` | 否 | 根日志级别 | `config.py:422`、`server.py:540` |
| `OCTOP_ACCESS_TOKEN_TTL` | `int` | `86400` | 否 | JWT TTL（秒） | `config.py:424` |
| `OCTOP_LOGIN_MAX_ATTEMPTS` | `int` | `5` | 否 | 登录失败锁定阈值 | `config.py:428` |
| `OCTOP_LOGIN_LOCKOUT_SECONDS` | `int` | `900` | 否 | 锁定时长 | `config.py:432` |
| `OCTOP_DEFAULT_TIMEZONE` | `str` | `Asia/Shanghai` | 否 | 时区；legacy `OCTOP_CRON_TIMEZONE`/`cron_timezone` 仍接受 | `config.py:436-437` |
| `OCTOP_CORS_ORIGINS` | `str` | `[]` | 否 | 逗号分隔 CORS 白名单 | `config.py:440` |
| `OCTOP_ENABLE_DASHBOARD` | `bool` | `true` | 否 | SPA 挂载 | `config.py:442` |
| `OCTOP_ENABLE_API_DOCS` | `bool` | `false` | 否 | Scalar `/api/docs` | `config.py:446` |
| `OCTOP_REQUIRE_SETUP_PASSWORD` | `bool` | `true` | 否 | 首启向导密码 | `config.py:450` |
| `OCTOP_MAX_UPLOAD_MB` | `int` | `100`（1–1024） | 否 | 上传上限 | `config.py:454`、`:243-270` |
| `OCTOP_BROWSER_IDLE_TIMEOUT_MINUTES` | `int` | `30` | 否 | 浏览器空闲 | `config.py:462` |
| `OCTOP_ENABLE_MOBILE` | `bool` | 探测值 | 否 | 强制移动能力 | `config.py:475,487` |
| `OCTOP_DATABASE_URL` | `str` | `None` | 否 | PG DSN | `config.py:375,294-314` |
| `OCTOP_DATABASE_DRIVER` | `str` | `sqlite` | 否 | `sqlite\|postgres` | `config.py:377` |
| `OCTOP_DATABASE_SQLITE_PATH` | `str` | `octop.db` | 否 | SQLite 路径 | `config.py:379` |
| `OCTOP_DATABASE_HOST` / `_PORT` / `_NAME` / `_USER` / `_PASSWORD` | `str/int` | `127.0.0.1/5432/octop/octop/None` | PG 时必填 | PG 连接 | `config.py:381-389` |
| `OCTOP_BACKUP_AUTO_ENABLED` | `bool` | `false` | 否 | 自动备份开关 | `config.py:499` |
| `OCTOP_BACKUP_SCHEDULE` | `str` | `cron:0 4 * * *` | 否 | 备份 cron 表达式 | `config.py:504` |
| `OCTOP_BACKUP_RETENTION_COUNT` | `int` | `7`（≥1） | 否 | 自动备份保留数 | `config.py:507` |
| `OCTOP_BACKUP_INCLUDE_CONFIG/WORKSPACES/SKILL_PACKAGES/PLUGINS/KNOWLEDGE/CHATS` | `bool` | `true/true/true/true/true/false` | 否 | 备份内容开关 | `config.py:516-549` |
| `OCTOP_LOG_COMPRESS` | `bool` | `1` | 否 | 日志 gzip delaycompress | `server.py:107` |
| `OCTOP_LOG_RETENTION_DAYS` | `int` | `14` | 否 | 日志保留天 | `server.py:141` |
| `OCTOP_LOG_MAX_BYTES` | `int` | `104857600` | 否 | 单日志文件上限 | `server.py:151` |
| `OCTOP_USER` / `OCTOP_AGENT` | `str` | `None` | 否 | CLI 默认 acting 主体 | `src/octop/cli/main.py:97,104` |
| `OCTOP_ADMIN_USERNAME` / `_PASSWORD` / `_DISPLAY_NAME` | `str` | `None` | init 时推荐 | 首管理员引导 | `src/octop/cli/commands/init.py:13,19,25` |
| `OCTOP_SERVICE_MODE` / `OCTOP_SERVICE_SCOPE` | `str` | `''` | 否 | 系统服务安装 | `src/octop/infra/setup/service.py:80,124` |
| `OCTOP_SKILLS_HUB_BASE_URL` / `_HTTP_TIMEOUT` / `_RETRIES` / `_BACKOFF_BASE` / `_BACKOFF_CAP` / `_SEARCH_PATH` / `_VERSION_PATH` / `_DETAIL_PATH` / `_FILE_PATH` / `_IMPORT_URL_PREFIXES` | 混合 | `https://clawhub.ai` / `15` / `3` / `0.8` / `6` / … | 否 | SkillHub 交互 | `src/octop/infra/skills/skills_hub.py:53,105,113,121,129,143,147,154,161,168` |
| `OCTOP_ONNX_COS_BASE` | `str` | 公共 COS | 否 | ONNX 模型下载源 | `src/octop/infra/agents/providers/onnx_download.py:32,83` |
| `OCTOP_ALLOW_RUNTIME_PIP` | `str` | `''` | 否 | ONNX 依赖安装门禁 | `onnx_service.py:56` |
| `OCTOP_CODEX_ATTRIBUTION_VERSION` | `str` | 内置 | 否 | Codex 归属版本 | `codex_oauth.py:46` |
| `OCTOP_GREEN_PACKAGES` / `OCTOP_FPK_SITE_PACKAGES` | `str` | `''` | 否 | 自更新打包路径 | `setup/self_update.py:24,52,441` |
| `OCTOP_DESKTOP*` / `_GEOMETRY` / `_DISPLAY` / `_INSTALL_SCRIPT` / `_START_SCRIPT` / `_STOP_SCRIPT` / `_RESIZE_SCRIPT` | `str` | 见源码 | 否 | 桌面端脚本与显示 | `desktop/setup.py:149,173,177,181,185,279,295` |
| `OCTOP_SKILLS_DIR` / `OCTOP_AUTH_DIR` / `OCTOP_AGENT_ID` | `str` | 运行时注入 | 否 | 沙箱执行环境 | `agents/execute_env.py:85-90` |
| `OCTOP_SYSTEMD_USER` / `OCTOP_TEST_DATABASE_URL` | `str` | 写入标记 / `None` | 后两者测试用 | 服务标识 / PG 测试开关 | `setup/service.py:384`、`pyproject.toml:208` |

**非 `OCTOP_*` 读取点**：`SHELL`（`cli/.../completion.py:22`、`terminal.py:138`）；`DISPLAY/WAYLAND_DISPLAY`（`desktop/setup.py:529,535`、`browser/setup.py:104-135`）；`LOCALAPPDATA/PROGRAMFILES`（`runtime_packages.py:61-64`）；`ANDROID_HOME/ANDROID_SDK_ROOT`（`mobile/adb.py:35-36`）；`PLAYWRIGHT_BROWSERS_PATH`（`browser/setup.py:369`）；`GITHUB_TOKEN/GH_TOKEN`（`skills_hub.py:196,763`）；`PATH`（`connectors/gateway/cli_install.py:114-116`）；`SEARCH_ENV_KEYS` 列出的 `TAVILY_API_KEY/BRAVE_API_KEY/GOOGLE_API_KEY/GOOGLE_CSE_ID/MOONSHOT_API_KEY`（`env_file.py:24-32`）。

`.env.example` 另声明 `OPENAI_API_KEY/DASHSCOPE_API_KEY`（`:32-33`）、`OCTOP_LANGFUSE_*`（`:36-39`）与 live 测试所需的 `OPENAI_BASE_URL/MODEL_NAME`、`OSS_*`、`ALI_OSS_*`、`CONNECTOR_*`（`:53-94`），这些密钥不入库、不回显、不写日志。

## 3. 动态运行时 / 单实例策略开关表

| 存储位置 | 配置键 | 类型 | 默认值 | 生效时机与副作用 | 读写锚点 |
|---|---|---|---|---|---|
| `config.json` | `bind_host/port/default_timezone/database/tls` | 混合 | 见默认值 | 重启生效；setup 期 `rebind_control_plane` 热重绑（仅 user_count==0） | `config.py:394-417`、`db/rebind.py:102` |
| `settings` 表（KV） | `active_model`、`enable_trajectory` 等 | `str/bool` | `enable_trajectory` 仅显式 `false` 关闭 | 下一回合生效 | `db/repos/settings.py`、`trajectory/settings.py:16-31` |
| `proactive_care_config` 表 | `enabled/start_hour/end_hour/min_interval_hours/max_interval_hours` | `bool/int` | `true/09:00/22:00/5/24` | `reschedule` 后立即 | `db/repos/proactive_care_config.py:24-29` |
| `cron_jobs` 行 | `schedule_spec/enabled/task_type/mcp_servers/model` | 混合 | `task_type="agent"` | `CronManager.update` 先 unschedule 再重排 | `cron/manager.py:165-209` |
| `security` 策略 | `hitl.enabled=false`、`tool_guard={enabled:true,mode:"warn"}` | `dict` | 见左 | `AgentManager.boot` 注入 harness | `agents/security/policy_store.py:18-23`、`manager.py:425` |
| TLS 配置 | `TlsConfig(enabled/mode/domains/cert_file/key_file/acme_staging/http_port=80)` | 混合 | 见源码 | `build_listen_plan` 生成单/双监听 | `config.py:76-88`、`src/octop/infra/setup/tls/listeners.py:33` |

## 4. 下游服务端点与凭据安全规则

| 下游目标 | 地址 / 模型配置来源 | 凭据存储与脱敏 | 未配置时的回退 | 源码锚点 |
|---|---|---|---|---|
| LLM Provider | `providers.base_url/api_key/extra_json.headers` | `secrets`/DB 列不明文回显；探测错误经 `_friendly_probe_error` 过滤 | 无可用模型→`NO_MODELS_CONFIGURED`，agent 置 `failed` | `providers/store.py:110-161`、`manager.py:2017-2019` |
| Connector / OAuth | `connectors` 行 + `X-API-Key/Bearer/CLI 配置文件` | `crypto.py` 加密；错误文案过滤 `api_key/token` 回显 | 凭证缺失→`*_INVALID_CREDENTIALS` | `connectors/builder.py:203-413` |
| 存储后端 | `storage_backends` 行 | `secrets` 加密；probe 返回 message_key 而非原文 | 缺依赖→`STORAGE_BACKEND_DEPS_FAILED` (503) | `backend/adapter.py:44-168` |
| Embedding / OCR | KB 行 + `providers` | 同 LLM Provider | 检索异常吞掉返回空串 | `knowledge/embed.py:16-65`、`retrieve.py:22-132` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

1. 新增 `OCTOP_*` 变量：`config.py` 字段 + `_defaults_for_file` + env 覆盖分支（`:418-553`）+ `.env.example` + 本页表格 + `tests/unit/test_config.py`。
2. 改数据库段：`_parse_database_section`/`_apply_database_env`（`config.py:294-314`）→ `db/factory.py:34` → `docs/configuration.md` → `tests/unit/db/`。
3. **安全铁律**：密钥类变量只在 `.env.example` 写占位名，禁止写入 `.wally/docs/`、日志或审计；发现明文按 [边界声明](../operations/boundary.md) 处理。

## 导航与共变索引

配置驱动的部署目录契约见 [部署运行时](../operations/deployment-and-runtime.md)；时区/语言术语见 [术语表](../overview/glossary.md)；配置相关错误码见 [错误码字典](error-codes.md)。
