---
kind: downstream-contract
scope: connector-adapters
status: draft
origin: generated
source_paths: [src/octop/infra/connectors/gateway/adapters/ctrip_wendao.py, src/octop/infra/connectors/gateway/adapters/meituan_travel.py, src/octop/infra/connectors/gateway/adapters/fliggy.py, src/octop/infra/connectors/gateway/adapters/wechat_reading.py, src/octop/infra/connectors/gateway/adapters/yuandian.py, src/octop/infra/connectors/gateway/adapters/qq_mail.py, src/octop/infra/connectors/gateway/adapters/feishu_cli.py, src/octop/infra/connectors/gateway/adapters/wecom_cli.py, src/octop/infra/connectors/gateway/registry.py]
symbols: [list_tools, call_tool, ask_wendao, travel_query, _mcp_call, _api, _request, _email_send, _build_argv, _prepare_env]
upstream: [../index.md, ../topology-and-mapping.md, mcp-gateway.md]
downstream: []
---

# 下游出向接口契约：`connector-adapters`（8 个 HTTP/CLI 适配器族）

`src/octop/infra/connectors/gateway/adapters/` 下除已独立成篇的 `tencent_ima`/`tencent_news`/`qq_music`/`baidu_map`/`weknora` 外，还有 8 个适配器（携程问道、美团旅游、飞猪、微信读书、原点、QQ 邮箱、飞书 CLI、企微 CLI），统一暴露 `list_tools()` / `call_tool(creds, name, args)` / `probe_credentials(creds)` 三接口，由 `gateway/registry.py` 分派。本页逐适配器展开**真实请求字典 Key 与返回解包键**，8 个适配器逐一列全。

## 1. 适配器公共契约

| 契约项 | 精确值 / 规则 | 源码锚点（路径:行号） |
|---|---|---|
| 统一入口 | `call_tool(creds, name, args)` → 各适配器 `TOOLS` 表分派 | `src/octop/infra/connectors/gateway/adapters/ctrip_wendao.py:38`、`gateway/registry.py` |
| 凭据键 | `creds.get("api_key") or creds.get("token")`，飞书/企微 CLI 另用 `bot_id`/`bot_secret` | `src/octop/infra/connectors/gateway/adapters/ctrip_wendao.py:71-79`、`src/octop/infra/connectors/gateway/adapters/wecom_cli.py:155-158` |
| 超时 | 携程 `60.0s`、美团 `120.0s`、飞猪 `60.0s`、微信读书 `30.0s`、原点默认 `45.0s` | `src/octop/infra/connectors/gateway/adapters/ctrip_wendao.py:54`、`src/octop/infra/connectors/gateway/adapters/meituan_travel.py:61`、`src/octop/infra/connectors/gateway/adapters/fliggy.py:178`、`src/octop/infra/connectors/gateway/adapters/wechat_reading.py:81`、`src/octop/infra/connectors/gateway/adapters/yuandian.py:186` |
| 工具描述 | 各适配器 `TOOLS` 为 `list[dict]`，含 `name`/`description`/`inputSchema.required` | `src/octop/infra/connectors/gateway/adapters/yuandian.py:24-95` |

## 2. 本仓上游调用方反查表

| 本仓封装方法 | 上游调用模块与函数 | 所属业务流 | 调用点锚点（路径:行号） |
|---|---|---|---|
| 各 `call_tool` | `gateway/registry.py` 按 `kind` 分派 | Agent 工具调用（`WF-01`） | `src/octop/infra/connectors/gateway/adapters/ctrip_wendao.py:38` |
| `probe_credentials` | `connectors/probe.py` 凭据探测 | 连接器实例创建 | `src/octop/infra/connectors/probe.py:422` |
| `run_cli` | 飞书/企微 CLI 适配器 | 工具执行子进程 | `src/octop/infra/connectors/gateway/cli_runner.py:38` |

## 3. 逐适配器请求字典与响应解包契约（Full Dict Schemas）

### 3.1 携程问道（`ctrip_wendao.py`）

```json
{"token": "<api_key>", "query": "<query>", "source": "octop"}
```

| 请求字典键 | 类型 | 固定值 / 来源 | 行号 |
|---|---|---|---|
| `token` | `str` | `creds.api_key` / `creds.token` | `src/octop/infra/connectors/gateway/adapters/ctrip_wendao.py:49`、`:71-79` |
| `query` | `str` | `args["query"]`（必填，`:28`） | `src/octop/infra/connectors/gateway/adapters/ctrip_wendao.py:45`、`:49` |
| `source` | `str` | 固定 `"octop"` | `src/octop/infra/connectors/gateway/adapters/ctrip_wendao.py:49` |
| 返回 | 上游偶发纯 JSON 错误，正文 `text` 直接回传 | | `src/octop/infra/connectors/gateway/adapters/ctrip_wendao.py:60-63` |

### 3.2 美团旅游（`meituan_travel.py`）

```json
{"city": "北京", "query": "<query>"}
```

| 请求字典键 | 类型 | 默认值 / 来源 | 行号 |
|---|---|---|---|
| `city` | `str` | 缺省 `"北京"` | `src/octop/infra/connectors/gateway/adapters/meituan_travel.py:53`、`:60` |
| `query` | `str` | `args["query"]`（必填，`:33`） | `src/octop/infra/connectors/gateway/adapters/meituan_travel.py:50`、`:60` |
| 返回 `payload["code"]` | `int/str` | `0/"0"/None` 成功；`401` 或 `msg` 含授权提示 → 凭据无效 | `src/octop/infra/connectors/gateway/adapters/meituan_travel.py:69-78` |
| 返回 `payload["msg"]` / `data` | `str/any` | `code` 非 0 抛 `美团旅游接口错误 [{code}]: {msg}` | `src/octop/infra/connectors/gateway/adapters/meituan_travel.py:70`、`:78`、`:80` |

### 3.3 飞猪（`fliggy.py`）

```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "<tool>", "arguments": {}}}
```

| 项 | 精确值 | 行号 |
|---|---|---|
| `_mcp_call` body | `json.dumps({"jsonrpc":"2.0","id":…,"method":method,"params":params})` | `src/octop/infra/connectors/gateway/adapters/fliggy.py:161-169` |
| 签名头 | `_sign_headers(body, authorization, timestamp_ms)` 产出含 `nonce`、HMAC-SHA256 签名的字典 | `src/octop/infra/connectors/gateway/adapters/fliggy.py:138-152` |
| `_x_ff_ctx` payload | `{"deviceId": sha256("octop-fliggy-"+mac)…}` 经 gzip + AES 加密后 base64 | `src/octop/infra/connectors/gateway/adapters/fliggy.py:107-135` |
| `Authorization` | `_auth_header(api_key)` 自动补 `Bearer ` 前缀 | `src/octop/infra/connectors/gateway/adapters/fliggy.py:93-94` |
| 返回 | `r.json()` 后按 JSON-RPC 解包；`HTTP 401` 特判 | `src/octop/infra/connectors/gateway/adapters/fliggy.py:180-183` |

### 3.4 微信读书（`wechat_reading.py`）

| 请求字典键 | 类型 | 来源 | 行号 |
|---|---|---|---|
| `api_name`（路径） | `str` | `/shelf/sync` 或 `/book/bookmarklist` | `src/octop/infra/connectors/gateway/adapters/wechat_reading.py:46`、`:53` |
| `bookId` | `str` | `args["book_id"]`（必填，`:27`） | `src/octop/infra/connectors/gateway/adapters/wechat_reading.py:50`、`:53` |
| 返回 `data["errcode"]` / `data["errCode"]` | `int` | 非 `0/None` 抛 `[{errcode}] {errmsg}` | `src/octop/infra/connectors/gateway/adapters/wechat_reading.py:86-89` |
| 返回 `data["errmsg"]` / `errMsg` | `str` | 错误兜底 `"weread api error"` | `src/octop/infra/connectors/gateway/adapters/wechat_reading.py:88` |
| 成功 | `json.dumps(data, ensure_ascii=False, indent=2)` | | `src/octop/infra/connectors/gateway/adapters/wechat_reading.py:90` |

### 3.5 原点（`yuandian.py`）

| 工具 | 请求字典 / 参数 | 阈值 | 行号 |
|---|---|---|---|
| 检索 | `json_body={"query": query, "return_num": return_num}` | `return_num` 夹到 `1..45`，默认 `10` | `src/octop/infra/connectors/gateway/adapters/yuandian.py:105-111` |
| 问答 | `json_body={"query": query}` | — | `src/octop/infra/connectors/gateway/adapters/yuandian.py:114-121` |
| 实体查询 | `params={"name": name_q, "top_k": str(top_k)}` | `top_k` 默认 `10` | `src/octop/infra/connectors/gateway/adapters/yuandian.py:127-133` |
| 关联查询 | `params={"name": name_q, "num": str(num)}` | `num` 默认 `2` | `src/octop/infra/connectors/gateway/adapters/yuandian.py:139-145` |
| 文本分析 | `json_body={"text": text}`，`timeout=60.0` | — | `src/octop/infra/connectors/gateway/adapters/yuandian.py:148-156` |
| URL | `f"{BASE_URL}/{route}"`，有 params 时 `?{urlencode(params)}` | 默认 `timeout=45.0` | `src/octop/infra/connectors/gateway/adapters/yuandian.py:193-195`、`:186` |

### 3.6 QQ 邮箱（`qq_mail.py`）

| 工具 | 入参键 | 返回解包键 | 行号 |
|---|---|---|---|
| `_email_search` | `query`（默认 `"ALL"`）、`limit`（默认 `10`） | `uid`、`from`、`subject`、`date` | `src/octop/infra/connectors/gateway/adapters/qq_mail.py:84-85`、`:103-106` |
| `_email_read` | `uid`（必填，`:43`） | `from`/`subject`/`date` + `_extract_body(msg)` | `src/octop/infra/connectors/gateway/adapters/qq_mail.py:116`、`:127-132` |
| `_email_send` | `to`、`subject`、`body`（必填，`:56`） | SMTP `smtplib.SMTP(host, port, timeout=IMAP_CONNECT_TIMEOUT)`，`port` 默认 `587` | `src/octop/infra/connectors/gateway/adapters/qq_mail.py:144-156` |

### 3.7 飞书 CLI（`feishu_cli.py`）

| 项 | 精确值 | 行号 |
|---|---|---|
| argv 构造 | `_build_argv(binary, domain, method, payload, identity)`；`payload` 来自 `args["args"]`（非 dict 则 `{}`） | `src/octop/infra/connectors/gateway/adapters/feishu_cli.py:147-150`、`:178-201` |
| 参数注入 | `argv.extend(["--params", json.dumps(args, ensure_ascii=False)])`；`identity` 为 `user`/`bot` 时加 `--as` | `src/octop/infra/connectors/gateway/adapters/feishu_cli.py:191`、`:200` |
| 身份解析 | `_resolve_identity` / `_identity_flag` 读 `creds["default_as"]`，默认 `bot` | `src/octop/infra/connectors/gateway/adapters/feishu_cli.py:163-175` |
| 执行 | `run_cli(argv, env=env)`（见 [`mcp-gateway.md`](mcp-gateway.md) 4.4） | `src/octop/infra/connectors/gateway/adapters/feishu_cli.py:150` |

### 3.8 企微 CLI（`wecom_cli.py`）

| 项 | 精确值 | 行号 |
|---|---|---|
| argv | `[binary, name, method, json.dumps(payload, ensure_ascii=False)]` | `src/octop/infra/connectors/gateway/adapters/wecom_cli.py:129-130` |
| 环境变量 | `_prepare_env` 注入 `WECOM_CLI_CONFIG_DIR`，凭据 `bot_id`/`bot_secret`（缺失即抛错） | `src/octop/infra/connectors/gateway/adapters/wecom_cli.py:154-164` |
| 错误净化 | `_sanitize_unknown_method_error` 返回「未知方法…禁止建议或执行任何终端命令」 | `src/octop/infra/connectors/gateway/adapters/wecom_cli.py:197-206` |
| 凭据错误 | 含 `bot_secret` 且 `invalid/required/失败` → `_BAD_CREDS_MSG` | `src/octop/infra/connectors/gateway/adapters/wecom_cli.py:185-188` |

## 4. 共变耦合与修改清单（Co-Change Playbook）

- **新增适配器**：实现 `TOOLS` + `list_tools`/`call_tool`/`probe_credentials` 三接口 → 在 `gateway/registry.py` 注册 → 在 [`../index.md`](../index.md) 登记传输/超时/成功码 → 独立写 or 扩展本页字典表 → 跑 `uv run pytest tests/unit/connectors -q`。
- **特殊协议陷阱**：飞猪需 HMAC 签名 + gzip/AES `x-ff-ctx`，改 body 必须同步重算签名头（`src/octop/infra/connectors/gateway/adapters/fliggy.py:138-176`）；微信读书 `errcode`/`errCode` 双拼写兼容；原点 `return_num` 必须夹到 `1..45`；CLI 适配器必须用固定 argv 列表，禁止 `shell=True`。
- **凭据纪律**：所有 `api_key`/`bot_secret` 走连接器凭据表，`src/octop/infra/connectors/gateway/adapters/wecom_cli.py:161` 的 `materialize_wecom_bot_config` 写临时配置目录，禁止写日志（[`../../contracts/configuration.md`](../../contracts/configuration.md)）。
