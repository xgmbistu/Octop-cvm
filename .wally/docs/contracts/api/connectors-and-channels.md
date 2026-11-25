---
kind: api-contract
scope: api-connectors-and-channels
status: draft
origin: generated
source_paths: [src/octop/api/routers/connectors.py, src/octop/api/routers/channels.py, src/octop/api/routers/internal_mcp.py, src/octop/api/routers/subagents.py]
symbols: [connector_instances, channel_test, internal_mcp_post, subagent_catalog]
upstream: [contracts/api-reference.md]
downstream: [integrations/downstream/connectors-mcp.md, integrations/downstream/im-channels.md]
---

# 入向接口分组契约：`连接器 / 渠道 / MCP / 子代理`

本页展开连接器与渠道组的逐端点清单；出向请求字典与错误翻译统一见 [`connectors-mcp.md`](../../integrations/downstream/connectors-mcp.md) 与 [`im-channels.md`](../../integrations/downstream/im-channels.md)。

## 1. Connector 与 MCP（`api/routers/connectors.py`、`internal_mcp.py`）

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| GET | `/api/connectors/catalog` | catalog | `src/octop/api/routers/connectors.py:480` |
| GET | `/api/connectors/weknora/detect-local` | detect local | `connectors.py:494` |
| GET | `/api/connectors/connector-instances` | list | `connectors.py:503` |
| GET | `/api/connectors/custom-mcp` | get custom MCP | `connectors.py:521` |
| PUT | `/api/connectors/custom-mcp` | put custom MCP | `connectors.py:531` |
| PATCH | `/api/connectors/custom-mcp/servers/{server_name}` | patch server | `connectors.py:561` |
| POST | `/api/connectors/custom-mcp/test` | test | `connectors.py:591` |
| GET | `/api/connectors/connector-instances/{id}` | get | `connectors.py:627` |
| POST | `/api/connectors/connector-instances` | create | `connectors.py:662` |
| PATCH | `/api/connectors/connector-instances/{id}` | update | `connectors.py:731` |
| DELETE | `/api/connectors/connector-instances/{id}` | delete | `connectors.py:858` |
| POST | `/api/connectors/connector-instances/{id}/test` | test | `connectors.py:911` |
| POST | `/api/connectors/test-credentials` | test credentials | `connectors.py:955` |
| GET | `/api/connectors/{kind}/cli-status` | CLI status | `connectors.py:992` |
| POST | `/api/connectors/{kind}/install-cli` | install CLI | `connectors.py:1013` |
| POST | `/api/connectors/{kind}/feishu-cli/user-auth/start` | start | `connectors.py:1034` |
| POST | `/api/connectors/{kind}/feishu-cli/user-auth/complete` | complete | `connectors.py:1061` |
| POST | `/api/connectors/connector-instances/{id}/feishu-user-auth/start` | instance start | `connectors.py:1093` |
| POST | `/api/connectors/connector-instances/{id}/feishu-user-auth/complete` | instance complete | `connectors.py:1114` |
| POST | `/api/connectors/connector-instances/{id}/refresh` | refresh | `connectors.py:1142` |
| GET | `/api/connectors/auth/{kind}/info` | auth info | `connectors.py:1160` |
| GET | `/api/connectors/auth/{kind}/authorize-url` | authorize URL | `connectors.py:1173` |
| POST | `/api/connectors/auth/{kind}/exchange-code` | exchange code | `connectors.py:1187` |
| POST | `/api/connectors/oauth/start` | OAuth start | `connectors.py:1218` |
| POST | `/api/connectors/oauth/{kind}/start` | `oauth_start_legacy`（旧别名） | `connectors.py:1237` |
| GET | `/api/connectors/oauth/callback` | callback | `connectors.py:1255` |
| GET | `/api/connectors/oauth/pending/{state_id}` | pending | `connectors.py:1367` |
| POST | `/api/internal/mcp/{kind}/{instance_id}` | `internal_mcp_post` | `src/octop/api/routers/internal_mcp.py:50` |
| GET | `/api/internal/mcp/{kind}/{instance_id}` | `internal_mcp_get`（SSE keepalive） | `internal_mcp.py:96` |
| DELETE | `/api/internal/mcp/{kind}/{instance_id}` | `internal_mcp_delete` | `internal_mcp.py:133` |

## 2. IM 渠道（`api/routers/channels.py`）

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| GET | `/api/agents/{agent_id}/channels` | list channels | `src/octop/api/routers/channels.py:118` |
| POST | `/api/agents/{agent_id}/channels` | create channel | `channels.py:133` |
| GET | `/api/agents/{agent_id}/channels/{channel_id}` | get channel | `channels.py:160` |
| PATCH | `/api/agents/{agent_id}/channels/{channel_id}` | update | `channels.py:178` |
| DELETE | `/api/agents/{agent_id}/channels/{channel_id}` | delete | `channels.py:204` |
| POST | `/api/agents/{agent_id}/channels/{channel_id}/test` | test | `channels.py:219` |
| POST | `/api/agents/{agent_id}/channels/{channel_id}/probe` | probe | `channels.py:241` |
| POST | `/api/agents/{agent_id}/channels/dingtalk/qrcode/generate` | generate | `channels.py:454` |
| GET | `/api/agents/{agent_id}/channels/dingtalk/qrcode/poll` | poll | `channels.py:496` |
| POST | `/api/agents/{agent_id}/channels/wecom/qrcode/generate` | generate | `channels.py:599` |
| GET | `/api/agents/{agent_id}/channels/wecom/qrcode/poll` | poll | `channels.py:617` |
| POST | `/api/agents/{agent_id}/channels/qq/qrcode/generate` | generate | `channels.py:640` |
| GET | `/api/agents/{agent_id}/channels/qq/qrcode/poll` | poll | `channels.py:661` |
| POST | `/api/agents/{agent_id}/channels/weixin/qrcode/generate` | generate | `channels.py:700` |
| GET | `/api/agents/{agent_id}/channels/weixin/qrcode/poll` | poll | `channels.py:726` |
| POST | `/api/agents/{agent_id}/channels/feishu/bot-creator/start` | start | `channels.py:781` |
| GET | `/api/agents/{agent_id}/channels/feishu/bot-creator/poll` | poll | `channels.py:837` |
| POST | `/api/agents/{agent_id}/channels/feishu/bot-creator/stop` | stop | `channels.py:891` |
| POST | `/api/agents/{agent_id}/channels/yuanbao/bot-creator/start` | start | `channels.py:929` |
| GET | `/api/agents/{agent_id}/channels/yuanbao/bot-creator/poll` | poll | `channels.py:986` |
| POST | `/api/agents/{agent_id}/channels/yuanbao/bot-creator/stop` | stop | `channels.py:1051` |

## 3. 子代理目录（`/api/subagent-catalog/*`）

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| GET | `/api/subagent-catalog/divisions` | divisions | `src/octop/api/routers/subagents.py:103` |
| GET | `/api/subagent-catalog` | catalog | `subagents.py:112` |
| GET | `/api/subagent-catalog/{slug}` | one | `subagents.py:134` |
| GET | `/api/agents/{agent_id}/subagents` | agent subagents | `subagents.py:155` |
| POST | `/api/agents/{agent_id}/subagents/install` | install | `subagents.py:168` |

## 4. 关键契约语义

- MCP 三端点用 `mcp-session-id` / `mcp-protocol-version` 头（`internal_mcp.py:24-25`），`initialize` 协商见 `:37,:79`，tool 列表由 `infra/connectors/gateway/protocol.py` 处理而非本 router。
- `oauth_start_legacy` 是 catalog-only 旧别名（`connectors.py:1237-1245`），新调用方应使用 `/api/connectors/oauth/{kind}/start`（见 [`pitfalls-and-adr.md`](../../operations/pitfalls-and-adr.md)）。
- 渠道 QR 与 bot-creator 端点以 SSE/轮询返回扫码状态；凭证字段禁止出现在审计日志。

## 5. 共变耦合与修改清单（Co-Change Playbook）

1. 新增 connector kind：`connectors.py` CRUD/probe → `builder.py:203-413` 凭证键 → `registry.py:24-29` adapter → [`connectors-mcp.md`](../../integrations/downstream/connectors-mcp.md)。
2. 新增渠道平台：`channels.py` 路由 → `infra/gateway/channels/` 封装 → `message_keys.py:67-93` 归属 → i18n `channel.*`。
3. 必跑：`uv run pytest tests/integration/test_connectors_api.py tests/integration/test_channels_api.py -q`。
