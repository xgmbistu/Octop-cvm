---
kind: component
scope: ui-and-cli
status: draft
origin: generated
source_paths: [src/octop/cli/main.py, src/octop/cli/registry.py, src/octop/cli/support/ctx.py, dashboard/src/api/request.ts, dashboard/src/routes/index.tsx, dashboard/vite.config.ts, src/octop/i18n/loader.py]
symbols: [_LazyCLI, cli, COMMANDS, request, getWsUrl, route_table, tr]
upstream: [INDEX.md, architecture/index.md]
downstream: [contracts/api-reference.md, operations/deployment-and-runtime.md]
---

# `UI & CLI`（React Dashboard + Click 命令树）

前端为 Vite 构建的 React 18 + TypeScript SPA，构建产物落在 `src/octop/dashboard/`（禁止直接编辑）；CLI 为 Click 惰性命令树，20 个顶层子命令按 offline / embedded / external 三种传输层访问本机或启动内嵌服务。

## 1. 路由视图 / 子命令分发表

| URL / CLI 命令 | 挂载容器 / 入口函数 | 源码锚点 | 核心交互闭环 | 兼容备注 |
|---|---|---|---|---|
| `/chat`、`/workbench/*`、`/admin/*` | `pathToKey` 路由表 | `dashboard/src/routes/index.tsx:48-93` | 侧栏导航 → 页面组件 → `api/` 模块请求 | `FULLSCREEN_PATHS` (`:98-109`) 控制全屏 |
| `octop run` | `run` (`cli/commands/run.py:153`) | `pyproject.toml:95-96` console_scripts | 前台启动 → `launch.run_foreground_blocking` | 唯一同时导入 server/app 的链路 |
| `octop init/user/config/agent/chats/...` | `_LazyCLI.get_command` | `cli/main.py:57-81`、`cli/registry.py:6-31` | `importlib.import_module` 惰性加载，help 不导入实现 | 全局 `--user/--agent/--json` (`main.py:93-113`) |
| CLI 传输层三选一 | `cli/support/{db,embedded_ops,offline_ops}.py` | `cli/support/ctx.py` / `acting.py` | offline 只读本地 DB；embedded 启动短生命周期 `OctopServer`；external 直连 OS/daemon | `octop user login` 不存在（`AGENTS.md` §5） |

## 2. 状态容器与动作委托机制

- **模块核心状态**：前端 `context/`（AgentContext、AuthFileDownloadLink、ServiceRestartContext）+ `hooks/`（useAgentThreadChat、useDesktopStream 等）持有会话与流状态；API 层统一经 `dashboard/src/api/request.ts:298 request`。
- **鉴权与续期**：`request.ts` 注入 `Authorization: Bearer`、`Accept-Language`、`X-Octop-Agent-Id`（`:183-241`）；401→`/login`，503+`setup_required`→`/setup`（`:77-93`），滑动续期读 `X-Octop-Access-Token`（`:17,64`）。
- **WS 通信**：`getWsUrl`（`api/config.ts:22-38`）把 http→ws、https→wss；调用点 `modules/wsChat.ts:6`、`wsNotifications.ts:6`、`browser.ts:172`、`useDesktopStream.ts:41`。
- **i18n 分工**：服务端文案在 `src/octop/i18n/{en,zh}.json`（`tr()`，`loader.py:12,33-49`），Dashboard chrome 在 `dashboard/src/locales/{en,zh}.json`，API 错误码镜像 `apiErrors.*`。

## 3. 动作 → 后端 API 绑定矩阵

| UI / CLI 动作 | 处理函数（`路径:行号`） | 后端接口 | 异步反馈机制 |
|---|---|---|---|
| Dashboard 聊天 | `modules/wsChat.ts:6` | `WS /api/agents/{id}/chat/ws` | WS 流块 + `subscribe/cancel` |
| CLI `chats send/repl` | `cli/commands/chats.py:15 _run_turn` | embedded `AgentManager.stream` | REPL 渲染 |
| CLI `cron run-now` | `cli/commands/cron.py:110 cron_run_now` | embedded `CronManager.run_now` | 即时执行 |
| CLI `channel bind_*` | `cli/commands/channel.py:216,289,348,516` | 外部二维码/CLI | 轮询扫码状态 |
| CLI `agent start/stop/reload` | `cli/commands/agent.py:152 agent_action` | embedded `AgentManager` | 状态输出 |
| CLI `provider test` | `cli/commands/provider.py:100 probe_provider` | embedded `probe_provider_row` | `{"ok","latency_ms"}` |

## 4. 共变耦合与修改清单（Co-Change Playbook）

1. 新增前端路由/按钮：改 `dashboard/src/routes/index.tsx:48-93` → `dashboard/src/api/` 增加 typed wrapper → 跑 `cd dashboard && npx tsc --noEmit` 与 `make build-frontend`（产物写 `src/octop/dashboard/`，见 `dashboard/vite.config.ts:91-93`）。
2. 新增 CLI 子命令：`cli/registry.py:6-31` 注册 → `cli/commands/<cmd>.py` 实现 → `cli/support/` 选择传输层 → `tests/unit/cli/`。
3. 新增 i18n key：`en.json`/`zh.json` 同键 → `i18n/domains/*.py` helper → 若是 ErrorCode 需同步 Dashboard `apiErrors.*` → `uv run pytest tests/unit/i18n -q`。
4. **静态缓存破坏提醒**：Dashboard 资源采用 hash 文件名（`vite.config.ts:101-103`），改前端源码必须重建产物，否则运行态仍是旧 SPA。

## 导航与共变索引

前端调用的入向契约见 [API 参考](../contracts/api-reference.md)，构建产物与部署目录见 [部署运行时](../operations/deployment-and-runtime.md)，设备串流接口见 [设备端点](../contracts/api/devices-and-media.md)。
