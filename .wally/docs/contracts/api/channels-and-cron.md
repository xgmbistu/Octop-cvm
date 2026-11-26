---
kind: api-contract
scope: channels-and-cron
status: draft
origin: generated
source_paths: [src/octop/api/app.py, src/octop/api/routers/channels.py, src/octop/api/routers/cron.py]
symbols: [create_channel, create_cron, cron_settings, delete_channel, delete_cron, dingtalk_qrcode_generate, dingtalk_qrcode_poll, feishu_bot_creator_poll, feishu_bot_creator_start, feishu_bot_creator_stop, get_channel, get_cron]
upstream: [../api-reference.md, ../../INDEX.md]
downstream: [../error-codes.md, ../../architecture/api-service.md]
---

# 入向接口契约：IM 通道与定时任务（`channels-and-cron`）

> 本页覆盖 `channels-and-cron` 分组全部 **28** 条入向接口，路径为 `app.include_router` 挂载后的完整路径；公共协议、鉴权与包络见 [`api-reference.md`](../api-reference.md)，错误码字典见 [`error-codes.md`](../error-codes.md)。

## 1. 分组范围与实现要点

通道端点按 agent 组织，二维码绑定类端点（`/api/agents/{agent_id}/channels/dingtalk/qrcode/generate` 等，见 `src/octop/api/routers/channels.py:454`）会拉起外部注册服务。`cron` 的 `POST /api/agents/{agent_id}/cron` 接受 `schedule_spec`，取值由 `build_trigger` 解析为 `interval`/`cron`/`date` 三种（`src/octop/infra/cron/trigger.py:62`、`:71`、`:73`、`:75`），非法值抛 `CRON_TRIGGER_INVALID(400)`（`src/octop/infra/errors.py:152`）。`CronTaskType = Literal["text","agent"]`，默认 `"agent"`（`src/octop/infra/cron/task_type.py:7-8`）。调度器 `AsyncIOScheduler` 的 `misfire_grace_time=60`（`src/octop/infra/cron/manager.py:256`）。

## 2. 全量接口路由总表（Master Inbound Inventory）

| 方法 | 完整路径 | Handler 符号 | 源码锚点（仓库根相对） | 鉴权 | 执行模式 |
|---|---|---|---|---|---|
| `GET` | `/api/agents/{agent_id}/channels` | `list_channels` | `src/octop/api/routers/channels.py:118` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/channels` | `create_channel` | `src/octop/api/routers/channels.py:133` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/channels/dingtalk/qrcode/generate` | `dingtalk_qrcode_generate` | `src/octop/api/routers/channels.py:454` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/channels/dingtalk/qrcode/poll` | `dingtalk_qrcode_poll` | `src/octop/api/routers/channels.py:496` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/channels/feishu/bot-creator/poll` | `feishu_bot_creator_poll` | `src/octop/api/routers/channels.py:837` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/channels/feishu/bot-creator/start` | `feishu_bot_creator_start` | `src/octop/api/routers/channels.py:781` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/channels/feishu/bot-creator/stop` | `feishu_bot_creator_stop` | `src/octop/api/routers/channels.py:891` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/channels/probe` | `probe_channel_config` | `src/octop/api/routers/channels.py:241` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/channels/qq/qrcode/generate` | `qq_qrcode_generate` | `src/octop/api/routers/channels.py:640` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/channels/qq/qrcode/poll` | `qq_qrcode_poll` | `src/octop/api/routers/channels.py:661` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/channels/wecom/qrcode/generate` | `wecom_qrcode_generate` | `src/octop/api/routers/channels.py:599` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/channels/wecom/qrcode/poll` | `wecom_qrcode_poll` | `src/octop/api/routers/channels.py:617` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/channels/weixin/qrcode/generate` | `weixin_qrcode_generate` | `src/octop/api/routers/channels.py:700` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/channels/weixin/qrcode/poll` | `weixin_qrcode_poll` | `src/octop/api/routers/channels.py:726` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/channels/yuanbao/bot-creator/poll` | `yuanbao_bot_creator_poll` | `src/octop/api/routers/channels.py:986` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/channels/yuanbao/bot-creator/start` | `yuanbao_bot_creator_start` | `src/octop/api/routers/channels.py:929` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/channels/yuanbao/bot-creator/stop` | `yuanbao_bot_creator_stop` | `src/octop/api/routers/channels.py:1051` | JWT | 同步 JSON |
| `DELETE` | `/api/agents/{agent_id}/channels/{channel_id}` | `delete_channel` | `src/octop/api/routers/channels.py:204` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/channels/{channel_id}` | `get_channel` | `src/octop/api/routers/channels.py:160` | JWT | 同步 JSON |
| `PATCH` | `/api/agents/{agent_id}/channels/{channel_id}` | `patch_channel` | `src/octop/api/routers/channels.py:178` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/channels/{channel_id}/test` | `test_channel` | `src/octop/api/routers/channels.py:219` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/cron` | `list_cron` | `src/octop/api/routers/cron.py:75` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/cron` | `create_cron` | `src/octop/api/routers/cron.py:91` | JWT | 同步 JSON |
| `DELETE` | `/api/agents/{agent_id}/cron/{cron_id}` | `delete_cron` | `src/octop/api/routers/cron.py:190` | JWT | 同步 JSON |
| `GET` | `/api/agents/{agent_id}/cron/{cron_id}` | `get_cron` | `src/octop/api/routers/cron.py:128` | JWT | 同步 JSON |
| `PATCH` | `/api/agents/{agent_id}/cron/{cron_id}` | `patch_cron` | `src/octop/api/routers/cron.py:144` | JWT | 同步 JSON |
| `POST` | `/api/agents/{agent_id}/cron/{cron_id}/run-now` | `run_now` | `src/octop/api/routers/cron.py:207` | JWT | 同步 JSON |
| `GET` | `/api/cron/settings` | `cron_settings` | `src/octop/api/routers/cron.py:66` | JWT | 同步 JSON |

## 3. 关键端点入参与出参契约

| 端点（`方法 路径`） | 关键入参字段 / 位置 | 出参结构 | 精确源码锚点 |
|---|---|---|---|
| `GET /api/agents/{agent_id}/channels` | 路径/查询/体字段见路由表 Handler 定义 | 由 `list_channels` 组装的 Pydantic 响应 | `src/octop/api/routers/channels.py:118` |
| `POST /api/agents/{agent_id}/channels` | 路径/查询/体字段见路由表 Handler 定义 | 由 `create_channel` 组装的 Pydantic 响应 | `src/octop/api/routers/channels.py:133` |
| `POST /api/agents/{agent_id}/channels/dingtalk/qrcode/generate` | 路径/查询/体字段见路由表 Handler 定义 | 由 `dingtalk_qrcode_generate` 组装的 Pydantic 响应 | `src/octop/api/routers/channels.py:454` |

逐接口 Pydantic 请求模型定义于各 `src/octop/api/routers/*.py` 文件内 `class ...Body(BaseModel)`；统一错误包络为 `{"error": {"code", "message", "details"}}`（`src/octop/infra/errors.py:239`）。

## 4. 鉴权、错误分支与执行约定

- **鉴权分级**：`免鉴权` 前缀由 `src/octop/api/deps.py:66` 的 `_JWT_EXEMPT_PREFIXES` 与 `:73` 的 `_JWT_EXEMPT_EXACT` 判定；其余一律经 `src/octop/api/middleware/jwt_auth.py:38` 的 `_jwt_auth` 中间件与 `current_user` 依赖。
- **归属校验**：agent 维度端点须经 `_assert_agent_owner`（`src/octop/api/common/agent.py:23`）或 admin 豁免。
- **错误分支**：业务异常统一由 `src/octop/api/app.py:78` 的 `_octop` 处理器映射为 `_DEFAULT_STATUS[code]`（`src/octop/infra/errors.py:107`）；未捕获异常由 `:93` 兜底为 `INTERNAL_ERROR(500)`。
- **执行模式**：阻塞磁盘/DB/子进程 IO 必须 `run_in_executor` 卸载（`AGENTS.md:348`）；WebSocket/SSE 端点保持长连接，不走同步 JSON 包装。

## 5. 共变耦合与修改清单（Co-Change Playbook）

1. 新增路由：在对应 `src/octop/api/routers/*.py` 定义带 `summary` 的装饰器 → 核对 `src/octop/api/app.py:201` 的 `_RouterMount` 前缀 → 补 `src/octop/api/openapi_meta.py` 的 tag。
2. 同步错误语义：新增 `ErrorCode` 枚举与 `_DEFAULT_STATUS` 映射（`src/octop/infra/errors.py:13`、`:107`），并在 `src/octop/i18n/{en,zh}.json` 与 `dashboard/src/locales/{en,zh}.json` 补 `errors.*` / `apiErrors.*` 键。
3. 更新本表与 [`api-reference.md`](../api-reference.md) 分组计数，运行 `uv run pytest tests/unit/api -q` 与 `cd dashboard && npx tsc --noEmit`。
