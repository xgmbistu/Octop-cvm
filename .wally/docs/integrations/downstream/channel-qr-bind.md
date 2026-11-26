---
kind: downstream-contract
scope: channel-qr-bind
status: draft
origin: generated
source_paths: [src/octop/infra/gateway/channels/qr_bind.py, src/octop/infra/gateway/channels/dingtalk_registration.py, src/octop/api/routers/channels.py, src/octop/infra/gateway/gateway.py]
symbols: [wecom_qr_generate, wecom_qr_poll, QQBotQRLogin, WeixinBotQRLogin, init_registration, begin_registration, poll_registration, _require_success]
upstream: [../index.md, ../topology-and-mapping.md, yuanbao-channel.md]
downstream: []
---

# 下游出向接口契约：`channel-qr-bind`（企微 / QQ / 微信 / 钉钉二维码绑定）

IM 通道二维码绑定分散在两类实现：企微与钉钉由本仓直接用 `httpx` 调远端注册接口；QQ/微信则由 `harness-gateway` 的 QR 类（`QQBotQRLogin` / `WeixinBotQRLogin`）实现，属仓外黑盒，本仓只持有调用与超时参数。业务封装在 `src/octop/infra/gateway/channels/qr_bind.py` 与 `dingtalk_registration.py`。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（路径:行号） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/gateway/channels/qr_bind.py`、`dingtalk_registration.py` | 请求字典组装与返回解包层 |
| 企微端点 | `GET https://work.weixin.qq.com/ai/qc/generate?source=octop&plat={code}` | `src/octop/infra/gateway/channels/qr_bind.py:26-36` |
| 钉钉端点 | `POST /app/registration/init`（`json={}`）、`/begin`、`/poll` | `src/octop/infra/gateway/channels/dingtalk_registration.py:25-57` |
| 成功判定 | 企微 `data["status"]=="success"`；钉钉 `errcode==0` | `src/octop/infra/gateway/channels/qr_bind.py:39-56`、`src/octop/infra/gateway/channels/dingtalk_registration.py:13-19` |
| 超时 | 钉钉 `_TIMEOUT_SECONDS=15.0`；QQ/微信 `asyncio.wait_for(..., 60.0)` | `src/octop/infra/gateway/channels/dingtalk_registration.py:10`、`src/octop/infra/gateway/channels/qr_bind.py:126` |
| 黑盒边界 | `harness_gateway.channels.qq.QQBotQRLogin` 等 | `src/octop/infra/gateway/channels/qr_bind.py:62` |

## 2. 本仓上游调用方反查表

| 本仓封装方法 | 上游调用模块与函数 | 所属接口 | 调用点锚点（路径:行号） |
|---|---|---|---|
| `wecom_qr_generate` / `wecom_qr_poll` | `api/routers/channels.py` 二维码端点 | `POST /api/agents/{id}/channels/dingtalk/qrcode/generate` 等 | `src/octop/api/routers/channels.py:454` |
| `init/begin/poll_registration` | 同上（钉钉） | 通道绑定 | `src/octop/api/routers/channels.py:454` |
| QQ/微信 QR 类 | `qr_bind.py` 动态 import | 通道绑定 | `src/octop/infra/gateway/channels/qr_bind.py:62-136` |
| 通道注册 | `gateway.py` IM 挂载 | `WF-01` 入站 | `src/octop/infra/gateway/gateway.py:636` |

## 3. 封装方法总清单

| 序号 | 封装函数 | 下游目标 | 读写 | 超时 | 定义锚点 |
|---|---|---|---|---|---|
| 1 | 企微二维码生成 | `GET /ai/qc/generate` | 读 | 由 httpx 客户端 | `src/octop/infra/gateway/channels/qr_bind.py:26-36` |
| 2 | 企微二维码轮询 | `GET /query_result?scode=<scode>` | 读 | 同上 | `src/octop/infra/gateway/channels/qr_bind.py:39-56` |
| 3 | 钉钉注册 init/begin/poll | `POST /app/registration/*` | 读 | `15.0s` | `src/octop/infra/gateway/channels/dingtalk_registration.py:25-57` |
| 4 | QQ/微信 QR | harness 黑盒 `wait_for_login` | 读 | `60.0s` | `src/octop/infra/gateway/channels/qr_bind.py:62-126` |

## 4. 逐方法请求字典与响应解包契约（Full Dict Schemas）

### 4.1 企微二维码生成（`src/octop/infra/gateway/channels/qr_bind.py:26-36`）

| 查询参数 Key | 类型 | 固定值 / 来源 | 行号 |
|---|---|---|---|
| `source` | `str` | 固定 `"octop"` | `src/octop/infra/gateway/channels/qr_bind.py:26` |
| `plat` | `str` | `wecom_plat_code()` 平台码 | `src/octop/infra/gateway/channels/qr_bind.py:26` |
| 返回 `{"scode","auth_url"}` | `dict` | 二维码标识与授权 URL | `src/octop/infra/gateway/channels/qr_bind.py:26-36` |

### 4.2 企微二维码轮询（`src/octop/infra/gateway/channels/qr_bind.py:39-56`）

| 项 | 精确值 | 行号 |
|---|---|---|
| 请求 | `GET /query_result?scode=<scode>` | `src/octop/infra/gateway/channels/qr_bind.py:39` |
| 成功判定 | `data["status"] == "success"` | `src/octop/infra/gateway/channels/qr_bind.py:39-56` |
| 返回 `bot_info["botid"]` / `bot_info["secret"]` | `str` | 写 `channels` 凭据表 | `src/octop/infra/gateway/channels/qr_bind.py:39-56` |

### 4.3 钉钉注册三段式（`src/octop/infra/gateway/channels/dingtalk_registration.py:25-57`）

```json
{"nonce": "<nonce>"}
{"device_code": "<device_code>"}
```

| 阶段 | 请求字典 | 返回解包键 | 行号 |
|---|---|---|---|
| init | `json={}` | `nonce` | `src/octop/infra/gateway/channels/dingtalk_registration.py:25` |
| begin | `{"nonce": nonce}` | `device_code`、`user_code`、`verification_uri_complete`（`required` 三键，`:39-45`） | `src/octop/infra/gateway/channels/dingtalk_registration.py:25-45` |
| poll | `{"device_code": device_code}` | 经 `_require_success` 校验 | `src/octop/infra/gateway/channels/dingtalk_registration.py:57` |
| 公共校验 | — | `errcode==0`，否则取 `errmsg` 抛错 | `src/octop/infra/gateway/channels/dingtalk_registration.py:13-19` |

### 4.4 QQ / 微信（黑盒边界，`src/octop/infra/gateway/channels/qr_bind.py:62-136`）

| 项 | 精确值 | 行号 |
|---|---|---|
| 动态 import | `from harness_gateway.channels.qq import QQBotQRLogin`（微信同理） | `src/octop/infra/gateway/channels/qr_bind.py:62` |
| 等待 | `await asyncio.wait_for(login.wait_for_login(qrcode_token), timeout=60.0)` | `src/octop/infra/gateway/channels/qr_bind.py:126` |
| 远端内部实现 | 本仓不可见，禁止推测 | [`../../operations/boundary.md`](../../operations/boundary.md) |

### 4.5 下游错误码拦截与翻译

| 下游条件 | 本仓转换 | 行号 |
|---|---|---|
| 钉钉 `errcode != 0` | `ValueError`（`_require_success`） | `src/octop/infra/gateway/channels/dingtalk_registration.py:13-19` |
| 企微 `status != "success"` | 继续轮询，最终超时失败 | `src/octop/infra/gateway/channels/qr_bind.py:39-56` |
| QQ/微信 `wait_for_login` 超时 | `asyncio.TimeoutError`（`60.0s`） | `src/octop/infra/gateway/channels/qr_bind.py:126` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- **改二维码参数**：改 `src/octop/infra/gateway/channels/qr_bind.py:26`、`:39` 或 `src/octop/infra/gateway/channels/dingtalk_registration.py:25-57` → 核对 `src/octop/api/routers/channels.py:454` 的入参透传与前端轮询 → 更新 [`../index.md`](../index.md) → 跑 `uv run pytest tests/unit/gateway -q`。
- **特殊协议陷阱**：钉钉 `required` 三键（`device_code`/`user_code`/`verification_uri_complete`）缺一不可（`src/octop/infra/gateway/channels/dingtalk_registration.py:39-45`）；企微 `source=octop` 固定；QQ/微信 QR 是 harness 黑盒，本仓仅持有 `60.0s` 超时，禁止推测其返回字典。
- **凭据纪律**：`botid`/`secret`/`device_code` 均为临时或持久凭据，走 `secrets`/`channels` 表，不明文写日志（[`../../contracts/configuration.md`](../../contracts/configuration.md)）。
