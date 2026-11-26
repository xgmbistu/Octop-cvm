---
kind: component
scope: dashboard-ui
status: draft
origin: generated
source_paths: [dashboard/src/api/request.ts, dashboard/src/api/index.ts, dashboard/src/api/modules/agentChat.ts, dashboard/src/api/modules/connectors.ts, dashboard/src/api/probeHealth.ts, dashboard/src/i18n.ts, dashboard/src/hooks/useServerTimezone.ts, dashboard/package.json, dashboard/index.html]
symbols: [request, api modules, probeHealth, i18n, useServerTimezone]
upstream: [../INDEX.md, ../overview/system-architecture.md]
downstream: [../contracts/api-reference.md, ../operations/deployment-and-runtime.md]
---

# `dashboard-ui`（React 18 + TypeScript + Vite 前端组件）

前端源码位于 `dashboard/`（**无 Python 侧直接依赖**），生产构建产物输出到 `src/octop/dashboard/` 由 `src/octop/api/app.py:285-308` 挂载为 SPA 静态壳。铁律：前端**只经 `/api` HTTP 与后端通信**，禁止 import Python 包或假设后端模块布局（`AGENTS.md` §5）。

## 1. 路由视图 / 子命令分发表

| URL / Hash 路由区域 | 入口模块 | 源码锚点（路径:行号） | 核心交互闭环 |
|---|---|---|---|
| Chat（主对话） | `dashboard/src/pages/Chat/hooks/useChat.ts` | `dashboard/src/pages/Chat/hooks/useChat.ts` | WebSocket `user_turn` → SSE/WS 增量 token → HITL 审批弹窗 |
| Agents / Experts / Skills | `dashboard/src/pages/Agent/` | `dashboard/src/pages/Agent/Skills/useSkills.ts` | Agent 创建、专家库、技能开关、技能包导入 |
| Connectors | `dashboard/src/pages/Agent/Connectors/` | `dashboard/src/api/modules/connectors.ts` | OAuth 绑定、MCP 网关工具列表 |
| Channels | `dashboard/src/pages/Agent/Channels/` | `dashboard/src/api/modules/channel.ts` | IM 通道配置与二维码绑定 |
| CronJobs | `dashboard/src/pages/Control/CronJobs/` | `dashboard/src/api/modules/cronjob.ts` | 定时任务可视化增删改 |
| Settings / ACP / Terminal / Browser / Desktop | `dashboard/src/pages/Control/`、`pages/Settings/` | `dashboard/src/api/modules/settings.ts` | 用户/安全/TLS、ACP runner、终端与远程桌面 |
| KnowledgeBases | `dashboard/src/pages/KnowledgeBases/` | `dashboard/src/api/modules/knowledgeBases.ts` | 知识库文档树与检索 |

## 2. 状态容器与动作委托机制

- **模块核心状态**：聊天状态容器 `chatStore`（`dashboard/src/pages/Chat/hooks/chatStore.ts`），核心字段含 `messages`、`threadId`、`activeTab`、`pendingAlias`；`useChatSessionActions.ts` 管理会话切换。
- **动作委托**：统一通过 `data-act` 属性委托到 `actions` 字典分发；跨模块跳转（如启动 ACP / 进入沙箱）经 `WallyOpenChatLaunch` 类写入后切换 `location.hash`。
- **API 层**：`dashboard/src/api/request.ts` 为唯一 fetch 包装（含 `X-Octop-Access-Token` 响应头回写与 401 重定向，`dashboard/src/api/request.unauthorized.test.ts` 守护）；`dashboard/src/api/modules/*.ts` 按资源分组封装 50+ 端点，对应 [`../contracts/api-reference.md`](../contracts/api-reference.md) 的 8 张分组子页。
- **跨切面**：`dashboard/src/i18n.ts` 使用 `locales/{en,zh}.json`；服务端文案（工具名、apiErrors）由 `src/octop/i18n/*.json` 同步镜像，`GET /api/i18n/tools` 可水合。

## 3. 动作 → 后端 API 绑定矩阵

| UI 动作 | 前端处理位置 | 调用的后端接口 | 异步反馈机制 |
|---|---|---|---|
| 发送对话 | `pages/Chat/hooks/useChatSend.ts` | WS `/api/chat/ws` + `POST .../chat/*` | WS 增量帧 / SSE `since_index` 式轮询 |
| 工具审批 | `pages/Chat/hooks/turnStatusGate.ts` | `POST /api/agents/{id}/chat/hitl/resume` | SSE `chunk`/`metrics`/`heartbeat`/`error`/`event` |
| 上传附件 | `pages/Chat/utils/chatAttachments.ts` | `POST /api/agents/{id}/upload` | 落 `{workspace}/inbound/`，非独立 uploads 库 |
| 知识库索引 | `pages/KnowledgeBases/` | `POST /api/knowledge-bases/*` | 文档 `pending→ready` 状态徽章 |
| 时区格式化 | `hooks/useServerTimezone.ts` | `GET /api/settings/timezone` | 禁止裸 `toLocaleString()`，须带服务端 `timeZone` |
| 健康探测 | `dashboard/src/api/probeHealth.ts` | `GET /api/health` | Docker `HEALTHCHECK` 同源 |

## 4. 共变耦合与修改清单（Agent Co-Change Playbook）

1. 在 DOM 壳层新增挂载点/按钮：`dashboard/index.html` → 在 `pages/*/hooks/` 的 `actions` 分发表注册处理函数并对接 `api/modules/*.ts`。
2. **静态缓存破坏提醒**：`src/octop/api/app.py:36-44` 的 `dashboard_cache_control` 对 `assets/` 内容哈希资源设 `public, max-age=31536000, immutable`，对 `index.html`/`sw.js`/`manifest.json` 设 `no-cache`；修改资源后须走 `make build-frontend` 重新生成哈希文件名。
3. **i18n 键同步**：新增错误码/工具名须同时更新 `src/octop/i18n/{en,zh}.json` 与 `dashboard/src/locales/{en,zh}.json`，跑 `uv run pytest tests/unit/i18n -q`（见 [`../contracts/error-codes.md`](../contracts/error-codes.md)）。
4. **前端验证**：`cd dashboard && npx tsc --noEmit` 与 `npm run lint`；产物由 `Makefile:96-102` 的 `build-frontend` 写入 `src/octop/dashboard/`，禁止直接编辑构建产物（`AGENTS.md:347`）。
- **核验锚点**：`dashboard/src/api/index.ts:1`（前端 API 模块出口）。
- **核验锚点**：`dashboard/src/api/modules/agentChat.ts:1`（对话 API 封装）。
- **核验锚点**：`dashboard/package.json:1`（前端依赖与脚本清单）。
