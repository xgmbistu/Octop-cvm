---
kind: downstream-contract
scope: im-channels
status: draft
origin: generated
source_paths: [src/octop/infra/gateway/gateway.py, src/octop/infra/gateway/bot_creators/feishu_bot_creator.py, src/octop/infra/gateway/bot_creators/feishu_runner.py, src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py, src/octop/infra/gateway/channels/dingtalk_registration.py, src/octop/infra/gateway/channels/qr_bind.py]
symbols: [Gateway.boot, register_feishu_app, start_feishu_creator, check_scan_bind_status, dingtalk_registration, qr_bind]
upstream: [integrations/index.md, business/chat-turn.md]
downstream: [contracts/error-codes.md, architecture/api-service.md]
---

# 下游出向接口契约：`IM 渠道机器人网关`

IM 渠道的外部注册/扫码绑定/欢迎语由本仓 `infra/gateway` 封装：上游是 `api/routers/channels.py` 的 QR 与 bot-creator 端点，下游是飞书 `lark-oapi`、元宝云端点、钉钉注册服务与 `harness-gateway` 的平台扫码 SDK；消息主循环本身在外部包内。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（`路径:行号`） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/gateway/bot_creators/` 与 `infra/gateway/channels/` | `src/octop/infra/gateway/gateway.py:199` |
| 底层传输底座 | `lark-oapi`（飞书）、`urllib`（欢迎语）、外部 `harness_gateway.channels.*`（QQ/微信扫码）、子进程 `Popen`（飞书 creator） | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:225-307` |
| 端点与凭据配置来源 | 扫码注册返回的 `app_id/app_secret/botid/secret/user_openid`，落 `channels` 行 | `src/octop/infra/gateway/channels/qr_bind.py:14-136` |
| 成功判定条件 | `errcode/code == 0` 且必需字段齐全；飞书 runner 以 stdout JSON 行的 `status=success` 判定 | `src/octop/infra/gateway/bot_creators/feishu_runner.py:27-115` |
| 进程编排 | `Gateway.boot()` 启动 `ChannelManager`，为每个有 channel 行的 agent 建立平台连接并挂 WebSocket/CliChannel | `src/octop/infra/gateway/gateway.py:199-237` |

## 2. 本仓上游调用方反查表

| 封装方法 | 上游接口 | 调用点锚点（`路径:行号`） |
|---|---|---|
| `start_feishu_creator` / `poll_feishu_creator` / `stop_feishu_creator` | `POST /api/agents/{aid}/channels/feishu/bot-creator/*` | `src/octop/api/routers/channels.py:781`、`:837`、`:891` |
| yuanbao bot-creator 三个端点 | `POST /api/agents/{aid}/channels/yuanbao/bot-creator/*` | `src/octop/api/routers/channels.py:929`、`:986`、`:1051` |
| `dingtalk_registration` | `POST /api/agents/{aid}/channels/dingtalk/qrcode/*` | `src/octop/api/routers/channels.py:454`、`:496` |
| `qr_bind` | 企微/微信/QQ 扫码 generate + poll | `src/octop/api/routers/channels.py:599`、`:617`、`:640`、`:661`、`:700`、`:726` |

## 3. 封装方法总清单

| 下游系统 | 下游动作 | 读写 | 幂等 / 重试 | 定义锚点 |
|---|---|---|---|---|
| 飞书/Lark | `lark.register_app` 扫码建机器人 + 欢迎语 | 写 | 子进程事件流，失败 `sys.exit(1)` | `feishu_bot_creator.py:225-307` |
| 飞书 runner | `create` 子进程 + stdout JSON 轮询 | 写 | 进程常驻，poll 取状态 | `feishu_runner.py:27-115` |
| 元宝 | `get-scan-bind-code` / `check-scan-bind-status` | 写 | 3 次重试耗尽退出 | `yuanbao_bot_creator.py:187-369` |
| 钉钉 | `/app/registration/init|begin|poll` | 写 | 单轮设备码 | `dingtalk_registration.py:22-57` |
| 企微/微信/QQ | 扫码 URL + 轮询结果 + 外部 SDK 登录 | 写 | 状态 `pending/expired/error` | `qr_bind.py:14-136` |

## 4. 逐方法请求字典与响应解包契约

### 4.1 飞书 `register_feishu_app`（`feishu_bot_creator.py:225-307`）

| 下游字典键路径 | 类型 | 值来源 / 转换逻辑 | 组装行号 |
|---|---|---|---|
| `on_qr_code` | `callback` | 把扫码 URL 推给 API SSE 事件 | `feishu_bot_creator.py:225-307` |
| `on_status_change` | `callback` | 状态变化写回 creator 事件队列 | `feishu_bot_creator.py:225-307` |
| `source` | `str` | 固定 `"octop"` | `feishu_bot_creator.py:225-307` |
| `domain` / `lark_domain` | `str` | 飞书国内/国际域配置 | `feishu_bot_creator.py:225-307` |
| `app_preset{desc,avatar}` | `dict` | 机器人名与头像 | `feishu_bot_creator.py:225-307` |
| `create_only` | `bool` | 固定 `True`，只建应用不做后续发布 | `feishu_bot_creator.py:225-307` |

返回解包：`client_id→app_id`、`client_secret→app_secret`、`user_info.open_id/tenant_brand`、`app_name/name→bot_name`、`manage_url`；`AppAccessDeniedError/AppExpiredError/RegisterAppError` → `_emit_error` + `sys.exit(1)`（`feishu_bot_creator.py:225-307`）。欢迎语走 `POST tenant_access_token {app_id,app_secret}` 取 token，再 `POST {receive_id=open_id, msg_type:"text", content:json.dumps({"text":greeting}), uuid}`，所有异常静默返回（`:145-188`）。

### 4.2 元宝扫码绑定（`yuanbao_bot_creator.py:187-369`）

| 下游动作 | 请求字典 Key | 返回解包 | 错误翻译 |
|---|---|---|---|
| `get-scan-bind-code` | `params={instance_id,ip,source:"tx_cloud_lighthouse",bot_type:1}` | `data.scan_code/access_code/scan_url/expires_in` | `code≠0` 或字段缺失→`_log_error` |
| `check-scan-bind-status` | `{scan_code,access_code}` | `status=2` 时取 `app_key/app_secret`；finish 事件 `{app_key,app_secret,instance_id,ip}` | 3 次重试耗尽→exit(1) |
| 云元数据探测 | GET `http://metadata.tencentyun.com/latest/meta-data/{instance-id,public-ipv4}` | 字符串 | 超时→`local-{uuid8}` / `127.0.0.1` |

### 4.3 钉钉 / 企微 / 微信 / QQ（`dingtalk_registration.py:22-57`、`qr_bind.py:14-136`）

| 下游 | 请求字典 Key | 返回解包 | 错误翻译 |
|---|---|---|---|
| 钉钉设备流 | POST `/app/registration/init {}`→`nonce`；`begin {nonce}`；`poll {device_code}` | `device_code/user_code/verification_uri_complete` | `errcode≠0`→`RuntimeError("DingTalk {op} failed: {errmsg}")` |
| 企微/微信扫码 | GET `work.weixin.qq.com/ai/qc/generate?source=octop&plat={1\|2\|3}`；`query_result?scode` | `{scode,auth_url}`；`bot_info.botid/secret` | status=error/pending/expired 原样上报 |
| QQ/微信 SDK | `harness_gateway.channels.qq.QQBotQRLogin` / `weixin.login_qr.WeixinQRLogin` | `credentials[0].app_id/app_secret/user_openid`、`account_id/token/base_url` | 缺包→「requires harness-gateway」 |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- 新增渠道 kind：`api/routers/channels.py` 注册端点 → `infra/gateway/channels/` 增加封装 → `infra/gateway/process/message_keys.py:67-93` 补 `subject_id` 归属规则 → i18n `channel.*` 文案（见 [术语表](../../overview/glossary.md)）→ `tests/unit/gateway/`。
- 修改 QR 轮询状态：同步前端 `channels.py` 对应 SSE/轮询消费与 `tests/integration/test_channels_api.py`，避免 UI 卡在 pending。
- **特殊陷阱**：飞书 creator 的子进程 stdout 是逐行 JSON，poll 端不可按单次读取解析；扫码类接口的凭证属敏感字段，禁止写入审计日志或 `.wally/docs/`（见 [边界声明](../../operations/boundary.md)）。
