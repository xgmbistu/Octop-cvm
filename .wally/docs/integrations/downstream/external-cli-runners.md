---
kind: downstream-contract
scope: external-cli-runners
status: draft
origin: generated
source_paths: [src/octop/infra/agents/acp_settings.py, src/octop/infra/agents/manager.py, src/octop/infra/setup/self_update.py, src/octop/infra/desktop/setup.py, src/octop/infra/mobile/adb.py, src/octop/infra/connectors/gateway/cli_runner.py, src/octop/infra/backup/pg_dump.py, src/octop/cli/commands/completion.py]
symbols: [ACPConfig.from_dict, run, _run, create_subprocess_exec, DEFAULT_TIMEOUT_S, ACP_RUNNERS]
upstream: [../index.md, ../topology-and-mapping.md, ../../overview/callchain-panorama.md]
downstream: []
---

# 下游出向接口契约：`external-cli-runners`（ACP / 自更新 / 桌面移动 / 备份子进程）

本仓多处通过 `subprocess` 拉起宿主 CLI 或外部编码 Agent：ACP runner（配置交给 harness 黑盒派生）、自更新 pip/git、桌面/移动安装、pg_dump 备份与连接器 CLI。本页按子进程族展开**真实 argv/环境字典与返回判定**；`shell=True` 全仓禁用。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（路径:行号） |
|---|---|---|
| ACP runner 配置 | `{"command":…, "args": ["acp"] | ["-y","pi-acp"]}` 默认集 | `src/octop/infra/agents/acp_settings.py:22`、`:28`、`:34` |
| 装配点 | `ACPConfig.from_dict({"runners": …})` 作为 `acp_runners=` 注入 | `src/octop/infra/agents/manager.py:2577`、`:2669` |
| 自更新子进程 | `subprocess.run(...)` 5 处（pip/git/version） | `src/octop/infra/setup/self_update.py:195`、`:263`、`:287`、`:364`、`:454` |
| 桌面安装 | `create_subprocess_exec`，apt/命令超时 `120` | `src/octop/infra/desktop/setup.py:205`、`:316`、`:724` |
| 移动 ADB | `adb` 命令族 | `src/octop/infra/mobile/adb.py:50`、`:84` |
| 备份 pg_dump | `subprocess` 导出 | `src/octop/infra/backup/pg_dump.py:34`、`:49` |
| CLI runner 默认超时 | `DEFAULT_TIMEOUT_S = 30.0`，`check=False` | `src/octop/infra/connectors/gateway/cli_runner.py:11`、`:38` |
| 内置技能脚本超时 | `120` | `src/octop/infra/agents/builtin_skills/skill-manager/scripts/manage_skills.py:213` |

## 2. 本仓上游调用方反查表

| 本仓封装方法 | 上游调用模块与函数 | 所属业务流 / 接口 | 调用点锚点（路径:行号） |
|---|---|---|---|
| `ACPConfig.from_dict` | `AgentManager._start_agent` | `WF-01` 出站委派 | `src/octop/infra/agents/manager.py:2577`、`:2669` |
| `_run` | `infra/setup/self_update.py` | `POST /api/update/check` / `restart` | `src/octop/api/routers/update.py:82`、`:173` |
| `create_subprocess_exec` | Desktop setup | `GET /api/desktop/*` | `src/octop/api/routers/desktop/install.py:15` |
| `run_cli` | 飞书/企微 CLI 适配器 | 工具调用 | `src/octop/infra/connectors/gateway/cli_runner.py:38` |
| `SHELL` 解析 | `octop completion` | CLI 补全 | `src/octop/cli/commands/completion.py:22` |

## 3. 子进程族清单

| 序号 | 子进程族 | 调用形态 | 超时 / 重试 | 定义锚点 |
|---|---|---|---|---|
| 1 | ACP runners（OpenCode / CodeBuddy / Claude Code / Codex） | harness 黑盒派生（本仓仅存配置） | 由 harness 决定 | `src/octop/infra/agents/acp_settings.py:22-34` |
| 2 | 自更新 pip/git | `subprocess.run` 固定 argv | `check=False`，`TimeoutExpired` 兜底 | `src/octop/infra/setup/self_update.py:195-454` |
| 3 | 桌面 apt/依赖安装 | `asyncio.create_subprocess_exec` | `120s` | `src/octop/infra/desktop/setup.py:205`、`:316`、`:724` |
| 4 | 移动 ADB | `adb` 固定 argv | 由调用点决定 | `src/octop/infra/mobile/adb.py:50`、`:84` |
| 5 | 备份 pg_dump | `subprocess` 导出到归档 | 由调用点决定 | `src/octop/infra/backup/pg_dump.py:34`、`:49` |
| 6 | 服务管理器 | `systemctl` / `launchctl` | `_STARTUP_GRACE_SECONDS=5.0` | `src/octop/infra/setup/service.py:323`、`:463`、`:36` |

## 4. argv / 环境字典与返回解包契约（Full Dict Schemas）

### 4.1 ACP runner 配置字典（`acp_settings.py`）

```json
{"runners": [{"name": "opencode", "command": "opencode", "args": ["acp"]}, {"name": "pi", "command": "npx", "args": ["-y", "pi-acp"]}]}
```

| 配置键 | 类型 | 默认值 / 固定值 | 行号 |
|---|---|---|---|
| `command` | `str` | 内置 4 个 runner 各自固定 | `src/octop/infra/agents/acp_settings.py:22`、`:28`、`:34` |
| `args` | `list[str]` | `["acp"]` 或 `["-y","pi-acp"]` | `src/octop/infra/agents/acp_settings.py:22`、`:34` |
| 注入 | `ACPConfig.from_dict({"runners": …})` | 作为 `acp_runners=` 传给 harness | `src/octop/infra/agents/manager.py:2577` |

### 4.2 CLI runner 通用契约（`src/octop/infra/connectors/gateway/cli_runner.py:26-77`）

```text
subprocess.run(argv, input=stdin_text, capture_output=True, text=True, env=env, timeout_s=..., cwd=..., check=False)
```

| 项 | 精确值 | 行号 |
|---|---|---|
| `argv` | 固定列表（禁 `shell=True`） | `src/octop/infra/connectors/gateway/cli_runner.py:26-58` |
| `returncode == 0` | `stdout or "{}"` | `src/octop/infra/connectors/gateway/cli_runner.py:38` |
| 错误解包 | `payload.get("message") or payload.get("msg")`、`hint`、`error.message`、`error.hint` | `src/octop/infra/connectors/gateway/cli_runner.py:61-77` |
| 错误字符上限 | `_MAX_ERR_CHARS=4000` | `src/octop/infra/connectors/gateway/cli_runner.py:11` |
| 提示抑制 | 含 `lark-cli`/`wecom-cli` 的 hint 屏蔽 | `src/octop/infra/connectors/gateway/cli_runner.py:73` |

### 4.3 桌面 / 移动 / 自更新返回判定

| 子进程族 | 返回判定 | 异常翻译 | 行号 |
|---|---|---|---|
| 桌面 `create_subprocess_exec` | `returncode == 0` | `TimeoutExpired` / `FileNotFoundError` → `DESKTOP_CAPTURE_FAILED(503)` | `src/octop/infra/desktop/setup.py:205`、`src/octop/infra/errors.py:178` |
| 自更新 `subprocess.run` | `returncode == 0` + stdout 解析 | `TimeoutExpired` → 更新失败提示 | `src/octop/infra/setup/self_update.py:195` |
| 服务管理器 | `systemctl`/`launchctl` 输出解析 | `_STOP_POLL_ATTEMPTS=30` 轮询 | `src/octop/infra/setup/service.py:39` |

### 4.4 相关环境变量字典（边界）

| 环境变量 | 用途 | 行号 |
|---|---|---|
| `OCTOP_UV_BIN` / `VIRTUAL_ENV` | 自更新定位 uv / venv | `src/octop/infra/utils/runtime_packages.py:44`、`src/octop/infra/setup/self_update.py:68` |
| `OCTOP_FPK_SITE_PACKAGES` | FnOS 打包站点包路径 | `src/octop/infra/setup/self_update.py:441` |
| `DISPLAY` / `WAYLAND_DISPLAY` | 桌面捕获会话 | `src/octop/infra/desktop/setup.py:535` |
| `OCTOP_HOME` / `OCTOP_DESKTOP_GEOMETRY` | 桌面数据目录与窗口几何 | `src/octop/infra/desktop/setup.py:149`、`:279` |
| `SHELL` | CLI 补全目标 shell | `src/octop/cli/commands/completion.py:22` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- **新增/改 ACP runner**：改 `src/octop/infra/agents/acp_settings.py:22-34` 默认字典 → 核对 `src/octop/infra/agents/manager.py:2577` 注入与前端 ACP 设置页 → 更新 [`../index.md`](../index.md) 与 [`../../overview/callchain-panorama.md`](../../overview/callchain-panorama.md) 桥接表 → 跑 `uv run pytest tests/unit/agents -q`。
- **特殊协议陷阱**：所有子进程必须用**固定 argv 列表**，禁止字符串拼接后 `shell=True`（命令注入红线）；`check=False` + 显式判 `returncode`；`TimeoutExpired`/`FileNotFoundError` 必须转成 `OctopError` 而非裸抛；ACP 子进程由 harness 派生，本仓只存配置，不得推测其 stdio 协议。
- **黑盒纪律**：ACP runner 与宿主 CLI 的内部实现不在本仓，详见 [`../../operations/boundary.md`](../../operations/boundary.md)；环境变量全表见 [`../../contracts/configuration.md`](../../contracts/configuration.md)。
