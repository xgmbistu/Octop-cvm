---
kind: component
scope: cli
status: draft
origin: generated
source_paths: [src/octop/cli/main.py, src/octop/cli/registry.py, src/octop/cli/commands/run.py, src/octop/cli/support/offline_ops.py, src/octop/cli/support/embedded_ops.py, src/octop/cli/support/ctx.py, src/octop/cli/support/state.py, src/octop/cli/commands/channel.py, pyproject.toml]
symbols: [cli, _LazyCLI, COMMANDS, run, open_cli_services, offline_ops, embedded_ops, acting, cli_state]
upstream: [../INDEX.md, ../overview/system-architecture.md]
downstream: [../contracts/api-reference.md, ../operations/dev-and-test.md]
---

# `cli`（Click 命令树 / 离线-嵌入-外部三态 CLI 组件）

`octop` 命令入口为 `pyproject.toml:96` 注册的 `octop.cli.main:cli`，采用 `_LazyCLI` 懒加载 20 个顶层命令组。CLI 不重复领域逻辑：按 `Offline`（仅本地 SQLite）、`Embedded`（进程内起 `OctopServer`）、`External`（直接调 OS/daemon）三种传输层选择，全部业务规则下沉 `infra/`。

## 1. 命令分组表（20 个顶层 COMMANDS）

| 顶层命令 | 定义锚点 | 传输层 | 子命令 / 说明 |
|---|---|---|---|
| `init` | `src/octop/cli/registry.py:7` | Offline | 首启建库、JWT secret、admin（`src/octop/cli/commands/init.py:10`） |
| `run` | `src/octop/cli/registry.py:8` | Embedded | 委托 `launch.run_foreground_blocking`（`src/octop/cli/commands/run.py:133`、`:153`） |
| `service` | `src/octop/cli/registry.py:9` | External | `start/stop/restart/status`（`src/octop/cli/commands/service.py:103`、`:134`、`:154`、`:172`） |
| `config` | `src/octop/cli/registry.py:14` | Offline | `show`、`set-user`（`src/octop/cli/commands/config.py:17`、`:32`） |
| `user` | `src/octop/cli/registry.py:15` | Offline | `create/list/set-email/passwd/role/disable/delete` |
| `agent` | `src/octop/cli/registry.py:16` | Offline+Embedded | `create/from-expert/list/use/start/stop/reload/delete/experts` |
| `chats` | `src/octop/cli/registry.py:17` | Offline+Embedded | `list/get/create/update/delete/send/repl`（`src/octop/cli/commands/chats.py:91-236`） |
| `channel` | `src/octop/cli/registry.py:18` | Offline+External | `list/get/create/patch/delete/test/bind/config/feishu-setup`（`src/octop/cli/commands/channel.py:39-509`） |
| `cron` | `src/octop/cli/registry.py:19` | Offline | `list/create/delete/run-now`（`src/octop/cli/commands/cron.py:20-104`） |
| `provider` | `src/octop/cli/registry.py:20` | Offline+Embedded | `list/create/delete/test` |
| `models` | `src/octop/cli/registry.py:21` | Offline+External | `presets/list/active/config/ollama-*`（`src/octop/cli/commands/models.py:17-231`） |
| `skills` | `src/octop/cli/registry.py:22` | Offline+Embedded | `list/enable/disable/config` |
| `admin` | `src/octop/cli/registry.py:23` | Offline | `overview/audit/providers/rotate-jwt-secret` |
| `version` / `completion` | `src/octop/cli/registry.py:24-25` | Offline | 版本与 shell 补全 |
| `update` / `clean` / `backup` | `src/octop/cli/registry.py:26-28` | External/Offline | 自更新、清状态、备份导出/恢复 |
| `acp` | `src/octop/cli/registry.py:29` | Embedded | stdio ACP server（`src/octop/cli/commands/acp.py:48`） |
| `plugin` | `src/octop/cli/registry.py:30` | Offline | `list/install/uninstall/reload` |

## 2. 状态容器与动作委托机制

- **模块核心状态**：`--user` / `--agent` 根选项分别读 `OCTOP_USER` / `OCTOP_AGENT` 环境变量（`src/octop/cli/main.py:97`、`:104`）；`--json` 控制输出格式（`src/octop/cli/main.py:107`）。
- **上下文与默认值**：`src/octop/cli/support/ctx.py` 解析根选项；`src/octop/cli/support/state.py` 把 `default_user` / `default_agent` 钉在 `cli_state.json`；`src/octop/cli/support/acting.py` 解析 `--user` 与 pin 默认值。
- **懒加载动作表**：`_LazyCLI`（`src/octop/cli/main.py:57`）以 `src/octop/cli/registry.py:6-31` 的 `COMMANDS` 字典为注册表，`get_command`（`src/octop/cli/main.py:65`）用 `importlib.import_module` 按需导入，避免启动期加载全部子模块。
- **无登录态**：CLI 信任本地文件系统对 `~/.octop` 的访问，**不存在** `octop user login`；`octop run` 运行时 config CLI 的写入需重启服务才生效（cron/channel 在 boot 期加载）。

## 3. 动作 → 后端绑定矩阵

| CLI 子命令 | 处理函数（路径:行号） | 对接的后端 | 反馈机制 |
|---|---|---|---|
| `octop run` | `run` (`src/octop/cli/commands/run.py:153`) | `launch.run_foreground_blocking`（uvicorn） | 前台日志 + `_save_configfile_overrides`（`src/octop/cli/commands/run.py:111`） |
| `chats send/repl` | `src/octop/cli/commands/chats.py:209`、`:236` | `embedded_ops` 进程内 `OctopServer` + harness | 流式渲染（`cli/repl/render.py`） |
| `cron run-now` | `src/octop/cli/commands/cron.py:104` | `embedded_ops` → `CronManager.run_now` | 同步返回 |
| `channel test` / `feishu-setup` | `src/octop/cli/commands/channel.py:184`、`:509` | `src/octop/cli/support/feishu_creator.py:39` 外部子进程 | stdout 行协议 |
| `models ollama-*` | `src/octop/cli/commands/models.py:185-231` | 宿主 Ollama CLI（External） | 直接命令输出 |
| `backup create/restore` | `src/octop/cli/commands/backup.py:29`、`:149` | `infra/backup/` 本地归档 | `dist/*.tar.gz` |

## 4. 共变耦合与修改清单（Agent Co-Change Playbook）

1. 新增顶层命令：在 `src/octop/cli/registry.py:6` 的 `COMMANDS` 注册 → 在 `cli/commands/` 实现 → 严禁从 `cli/` import `api/`（走 `launch.py`）。
2. 领域逻辑只写 `infra/`；`cli/*_cmd.py` 保持薄包装，避免与 HTTP 路由重复规则（`AGENTS.md` §5）。
3. 新增涉及 `~/.octop` 文件物化的命令：单测须 `monkeypatch.setenv("OCTOP_HOME", str(tmp_path))` 并用 `Path` 比较，禁止硬编码 POSIX 路径（见 [`../operations/dev-and-test.md`](../operations/dev-and-test.md)）。
4. 命令变更同步 `docs/cli.md` 与 `scripts/regen_cli_docs.py` 的生成约定（`Makefile:319` 引用）；跑 `uv run pytest tests/unit/cli -q`。
- **核验锚点**：`src/octop/cli/support/offline_ops.py:1`（CLI 离线态操作）。
- **核验锚点**：`src/octop/cli/support/embedded_ops.py:1`（CLI 嵌入态操作）。

命令与路由的对应关系见 [`../contracts/api-reference.md`](../contracts/api-reference.md)，CLI 三态与组装根约束见 [`../overview/system-architecture.md`](../overview/system-architecture.md)。
