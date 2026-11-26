---
kind: downstream-contract
scope: yuanbao-channel
status: draft
origin: generated
source_paths: [src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py, src/octop/infra/gateway/channels/qr_bind.py, src/octop/api/routers/channels.py]
symbols: [get_scan_bind_code, check_scan_bind_status, _emit_finish, _http_post, POLL_INTERVAL, QR_MAX_RETRIES]
upstream: [../index.md, ../topology-and-mapping.md, channel-qr-bind.md]
downstream: []
---

# 下游出向接口契约：`yuanbao-channel`（元宝机器人扫码绑定）

元宝机器人绑定分两步：向 `/api/v5/robotLogic/get-scan-bind-code` 申请扫码参数，再轮询 `/check-scan-bind-status` 直到 `data["status"]==2`（已确认）取回 `app_key`/`app_secret`。宿主实例元数据 `instance_id`/`ip` 来自腾讯云 metadata 服务。业务封装在 `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py`。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（路径:行号） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py` | 请求字典组装与返回解包层 |
| 底层传输 | `urllib` GET/POST，超时 `30` | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:191`、`:260` |
| 轮询参数 | `POLL_INTERVAL=3`、`QR_MAX_RETRIES=3` | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:379` |
| metadata 端点 | `http://metadata.tencentyun.com/latest/meta-data/instance-id` 等 | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:379`、`:395` |
| 成功判定 | `resp["code"]==0` 且 `data["status"]==2` | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:203`、`:279-308` |
| finish 载荷 | `{"app_key","app_secret","instance_id","ip"}` | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:360-368` |

## 2. 本仓上游调用方反查表

| 本仓封装方法 | 上游调用模块与函数 | 所属业务流 | 调用点锚点（路径:行号） |
|---|---|---|---|
| 扫码绑定流程 | `gateway/channels/qr_bind.py` 分发 | `POST /api/agents/{id}/channels/*/qrcode` | `src/octop/infra/gateway/channels/qr_bind.py:62` |
| 通道落库 | `api/routers/channels.py` 创建/更新 | 通道配置 | `src/octop/api/routers/channels.py:133` |
| `_emit_finish` | 主流程收尾 | 凭据写回 | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:360` |

## 3. 封装方法总清单

| 序号 | 封装函数 | 下游目标 | 读写 | 超时 | 定义锚点 |
|---|---|---|---|---|---|
| 1 | `get-scan-bind-code` | `GET /api/v5/robotLogic/get-scan-bind-code` | 读 | `30s` | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:191-215` |
| 2 | `check-scan-bind-status` | `POST /check-scan-bind-status`（轮询） | 读 | `30s` | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:260-308` |
| 3 | metadata 拉取 | `GET http://metadata.tencentyun.com/...` | 读 | `30s` | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:379`、`:395` |

## 4. 逐方法请求字典与响应解包契约（Full Dict Schemas）

### 4.1 申请扫码参数（`:191-196`）

```text
GET /api/v5/robotLogic/get-scan-bind-code?instance_id=<id>&ip=<ip>&source=tx_cloud_lighthouse&bot_type=1
```

| 查询参数 Key | 类型 | 固定值 / 来源 | 行号 |
|---|---|---|---|
| `instance_id` | `str` | 宿主 metadata 实例 ID | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:191`、`:379` |
| `ip` | `str` | 宿主 metadata 内网 IP | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:191`、`:395` |
| `source` | `str` | 固定 `"tx_cloud_lighthouse"` | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:191` |
| `bot_type` | `int` | 固定 `1` | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:191` |
| 返回 `resp["code"]` | `int` | 必须为 `0`，否则失败 | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:203` |
| 返回 `data["scan_code"]` / `access_code` / `scan_url` / `expires_in` | `str/int` | 二维码与轮询凭据 | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:203-215` |

### 4.2 轮询绑定状态（`:260-308`）

```json
{"scan_code": "<scan_code>", "access_code": "<access_code>"}
```

| 请求字典键 | 类型 | 来源 | 行号 |
|---|---|---|---|
| `scan_code` | `str` | 4.1 返回 | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:260-265` |
| `access_code` | `str` | 4.1 返回 | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:260-265` |
| 返回 `data["status"]` | `int` | `0` 等待 / `1` 已扫 / `2` 已确认 / `3` 取消 / `4` 过期 | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:279-308` |
| 返回 `data["app_key"]` / `app_secret` | `str` | `status==2` 时取回写凭据表 | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:279-308` |

### 4.3 finish 事件（`:360-368`）

| 返回键 | 类型 | 解包规则 | 行号 |
|---|---|---|---|
| `app_key` / `app_secret` | `str` | 写回 `channels` 凭据 | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:360-368` |
| `instance_id` / `ip` | `str` | 绑定宿主信息 | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:360-368` |

### 4.4 下游错误码拦截与翻译

| 下游条件 | 本仓转换 | 行号 |
|---|---|---|
| `resp["code"] != 0` | 绑定失败，退出流程 | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:203` |
| `status == 3`（取消）或 `4`（过期） | 重试至 `QR_MAX_RETRIES=3` 后失败 | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:279-308`、`:379` |
| metadata 不可达 | 宿主非腾讯云环境时 `instance_id`/`ip` 缺失，禁止伪造 | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:379` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- **改扫码参数/轮询字典**：改 `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:191` / `:260` → 核对 `:203`、`:279-308` 解包与 `src/octop/infra/gateway/channels/qr_bind.py:62` 分发 → 更新 [`../index.md`](../index.md) 与 [`channel-qr-bind.md`](channel-qr-bind.md) → 跑 `uv run pytest tests/unit/gateway -q`。
- **特殊协议陷阱**：`source="tx_cloud_lighthouse"` 与 `bot_type=1` 为协议固定值；`status` 是 `0..4` 的状态枚举而非布尔；metadata 地址是内网黑盒，本地/测试环境无该服务时不得猜测值（[`../../operations/boundary.md`](../../operations/boundary.md)）。
- **凭据纪律**：`app_secret` 走 `secrets`/`channels` 表，禁止写日志（[`../../contracts/configuration.md`](../../contracts/configuration.md)）。
