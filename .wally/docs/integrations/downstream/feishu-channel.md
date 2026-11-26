---
kind: downstream-contract
scope: feishu-channel
status: draft
origin: generated
source_paths: [src/octop/infra/gateway/bot_creators/feishu_bot_creator.py, src/octop/infra/gateway/bot_creators/feishu_runner.py, src/octop/cli/support/feishu_creator.py, src/octop/infra/gateway/gateway.py]
symbols: [create_bot, _post_token, send_greeting, start_feishu_creator, _qr_url_from_event, stop_feishu_creator]
upstream: [../index.md, ../topology-and-mapping.md, ../../architecture/async-worker.md]
downstream: []
---

# 下游出向接口契约：`feishu-channel`（飞书自建机器人注册）

飞书通道在建机器人时向飞书开放平台申请 `tenant_access_token`、发送问候消息，并经 `lark_oapi.register_app` 设备授权（黑盒）。主流程在 `feishu_bot_creator.py` 子进程中运行，父进程 `feishu_runner.py` 用 stdout 行协议解包事件。业务封装文件与父进程桥接全部展开如下。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（路径:行号） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py` | 请求字典组装与返回解包层 |
| 底层传输 | `urllib`（token/问候）+ `subprocess.Popen`（父进程拉起） | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:153`、`src/octop/infra/gateway/bot_creators/feishu_runner.py:42` |
| Token 端点 | `POST` 申请 `tenant_access_token` | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:153-162` |
| 父进程命令 | `[sys.executable, script, "create", "--platform", platform]`，`shell=False` | `src/octop/infra/gateway/bot_creators/feishu_runner.py:36-48` |
| 子进程环境 | `env={**os.environ, "PYTHONUNBUFFERED":"1"}` | `src/octop/infra/gateway/bot_creators/feishu_runner.py:42` |
| 成功判定 | stdout `action=="finish" && level=="success"` 且 `data.app_id`/`app_secret` 齐备 | `src/octop/infra/gateway/bot_creators/feishu_runner.py:51-82` |
| 停机 | `proc.kill()` + `wait(timeout=5)` | `src/octop/infra/gateway/bot_creators/feishu_runner.py:118-123` |

## 2. 本仓上游调用方反查表

| 本仓封装方法 | 上游调用模块与函数 | 所属业务流 / 命令 | 调用点锚点（路径:行号） |
|---|---|---|---|
| `start_feishu_creator` | `cli/support/feishu_creator.py` | `octop channel feishu-setup` | `src/octop/cli/support/feishu_creator.py:39`、`:47` |
| 通道注册 | `gateway/gateway.py` IM 通道挂载 | `WF-01` 入站 | `src/octop/infra/gateway/gateway.py:636` |
| `stop_feishu_creator` | 进程退出清理 | 关闭序列 | `src/octop/infra/gateway/bot_creators/feishu_runner.py:118` |

## 3. 封装方法总清单

| 序号 | 封装函数 | 下游目标 | 读写 | 定义锚点 |
|---|---|---|---|---|
| 1 | token 申请 | `POST` 飞书 tenant token 端点 | 读 | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:153-162` |
| 2 | 发送问候消息 | `POST` 飞书 im 消息端点 | 写 | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:168-175` |
| 3 | 设备授权 | `lark_oapi.register_app`（黑盒） | 写 | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:232-240` |
| 4 | finish 事件 | 子进程 stdout 行 | 返回 | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:265-272` |

## 4. 逐方法请求字典与响应解包契约（Full Dict Schemas）

### 4.1 Token 申请（`src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:153-162`）

```json
{"app_id": "<app_id>", "app_secret": "<app_secret>"}
```

| 下游字典键 | 类型 | 必填 | 来源 | 行号 |
|---|---|---|---|---|
| `app_id` | `str` | 是 | 建机器人入参 | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:153` |
| `app_secret` | `str` | 是 | 建机器人入参 | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:153` |
| 返回 `tenant_access_token` | `str` | — | 后续调用鉴权凭据 | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:162` |

### 4.2 发送问候（`src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:168-175`）

```json
{"receive_id": "<open_id>", "msg_type": "text", "content": "{\"text\":\"<greeting>\"}", "uuid": "<uuid>"}
```

| 下游字典键 | 类型 | 固定值 / 来源 | 行号 |
|---|---|---|---|
| `receive_id` | `str` | 用户 open_id | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:168` |
| `msg_type` | `str` | 固定 `"text"` | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:168` |
| `content` | `str` | `json.dumps({"text": ...})` 二次序列化 | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:168` |
| `uuid` | `str` | 幂等 UUID | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:168` |

### 4.3 finish 事件字典（`src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:265-272`）

```json
{"action": "finish", "level": "success", "data": {"app_id": "...", "app_secret": "...", "bot_name": "...", "open_id": "...", "manage_url": "...", "tenant_brand": "..."}}
```

| 返回键 | 类型 | 解包规则 | 行号 |
|---|---|---|---|
| `action` | `str` | `"show_qrcode"` → `content`/`url`；`"finish"` → `data` | `src/octop/infra/gateway/bot_creators/feishu_runner.py:51-82` |
| `level` | `str` | `"success"` 才取凭据 | `src/octop/infra/gateway/bot_creators/feishu_runner.py:51-82` |
| `data.app_id` / `data.app_secret` | `str` | 写回 `channels` 凭据表 | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:265-272` |
| `data.bot_name` / `open_id` / `manage_url` / `tenant_brand` | `str` | 透传展示 | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:265-272` |
| `return_code == 0` | `int` | `"finished"`；否则 `"failed"` | `src/octop/infra/gateway/bot_creators/feishu_runner.py:104-106` |

### 4.4 下游错误码拦截与翻译

| 下游异常 | 本仓转换 | 行号 |
|---|---|---|
| `AppAccessDeniedError` / `AppExpiredError` / `RegisterAppError` | 子进程 `sys.exit(1)` + 错误事件 | `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:296-304` |
| 子进程超时 / 非零退出 | 父进程 `status="failed"` | `src/octop/infra/gateway/bot_creators/feishu_runner.py:104-106` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- **改 token/问候字典键**：改 `src/octop/infra/gateway/bot_creators/feishu_bot_creator.py:153` / `:168` → 核对 `src/octop/infra/gateway/bot_creators/feishu_runner.py:51-82` 事件解包与 `src/octop/cli/support/feishu_creator.py:39` 调用 → 更新 [`../index.md`](../index.md) → 跑 `uv run pytest tests/unit/gateway -q`。
- **特殊协议陷阱**：`content` 必须是 `json.dumps` 后的**字符串**而非对象；`msg_type="text"` 固定；子进程 stdout 为逐行 JSON 事件流，父进程按 `action` 分派，禁止改 stdout 打印格式；`PYTHONUNBUFFERED=1` 必须保留否则实时抽水失效。
- **凭据纪律**：`app_secret` 与 `tenant_access_token` 走 `secrets`/`channels` 凭据表，不明文写日志（[`../../contracts/configuration.md`](../../contracts/configuration.md)）。
