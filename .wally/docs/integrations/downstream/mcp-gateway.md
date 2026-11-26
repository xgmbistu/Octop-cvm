---
kind: downstream-contract
scope: mcp-gateway
status: draft
origin: generated
source_paths: [src/octop/infra/connectors/probe.py, src/octop/infra/connectors/builder.py, src/octop/infra/connectors/gateway/protocol.py, src/octop/infra/connectors/gateway/langchain.py, src/octop/infra/connectors/gateway/cli_runner.py, src/octop/infra/connectors/oauth/mcp.py, src/octop/api/routers/connectors.py]
symbols: [probe_connector, build_http_mcp_spec, build_gateway_langchain_tools, run_cli, _format_cli_error, exchange_code, refresh_token, JsonRpc]
upstream: [../index.md, ../topology-and-mapping.md]
downstream: []
---

# 下游出向接口契约：`mcp-gateway`（MCP JSON-RPC / OAuth / CLI runner）

连接器网关把外部 MCP Server（HTTP/SSE/stdio）、OAuth 授权服务与本地 CLI 适配器统一为 Agent 可调用的工具。业务封装分三层：`builder.py` 生成 spec 字典（本仓保存）、`probe.py` 发 JSON-RPC 探测、`gateway/cli_runner.py` 拉起外部 CLI 子进程；`protocol.py` 定义 JSON-RPC 解包结构。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（路径:行号） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/connectors/probe.py`、`builder.py`、`gateway/` | 参数字典组装与返回解包层 |
| 底层传输 | `httpx`（HTTP/SSE/streamable）、`subprocess.run`（stdio） | `src/octop/infra/connectors/probe.py:422`、`src/octop/infra/connectors/gateway/cli_runner.py:38` |
| 协议版本 | `protocolVersion: "2024-11-05"`，`clientInfo: {"name":"octop","version":"0.1"}` | `src/octop/infra/connectors/probe.py:422-431` |
| Streamable Accept 头 | `application/json, text/event-stream` | `src/octop/infra/connectors/builder.py:21` |
| 超时 | HTTP 探测 `20.0s`、SSE `timeout=20, sse_read_timeout=20`、stdio `asyncio.timeout(25)` | `src/octop/infra/connectors/probe.py:433`、`:244`、`:537` |
| CLI 默认超时 | `DEFAULT_TIMEOUT_S = 30.0`，错误字符上限 `_MAX_ERR_CHARS=4000` | `src/octop/infra/connectors/gateway/cli_runner.py:11` |
| 下游成功判定 | `{"tools":[…]}` / `result.isError == False` / `returncode==0` | `src/octop/infra/connectors/gateway/protocol.py:39`、`:56`、`src/octop/infra/connectors/gateway/cli_runner.py:38` |

## 2. 本仓上游调用方反查表

| 本仓封装方法 | 上游调用模块与函数 | 所属业务流 / 接口 | 调用点锚点（路径:行号） |
|---|---|---|---|
| `probe_connector` | `api/routers/connectors.py` probe | `POST /api/connectors/*/probe` | `src/octop/api/routers/connectors.py:944`、`:981` |
| `handle_mcp_request` | `api/routers/internal_mcp.py` | `/api/internal/mcp/{kind}/{instance_id}` | `src/octop/api/routers/internal_mcp.py:82` |
| `build_http_mcp_spec` | `connectors/service.py` | 连接器实例创建 | `src/octop/infra/connectors/service.py:468`、`src/octop/infra/connectors/builder.py:494` |
| `build_gateway_langchain_tools` | `builder.py` 工具装配 | 对话轮次 MCP 注入 | `src/octop/infra/connectors/builder.py:574` |
| `run_cli` | 飞书/企微 CLI 适配器 | `WF-01` 工具调用 | `src/octop/infra/connectors/gateway/adapters/feishu_cli.py:150`、`src/octop/infra/connectors/gateway/adapters/wecom_cli.py:129`、`src/octop/infra/connectors/gateway/feishu_user_auth.py:48` |

## 3. 封装方法总清单

| 序号 | 封装函数签名 | 下游目标命令字 / Path | 读写类型 | 超时 / 单批 | 定义锚点 |
|---|---|---|---|---|---|
| 1 | `probe` initialize | `method:"initialize"` | 读 | `20.0s` | `src/octop/infra/connectors/probe.py:422-431` |
| 2 | `probe` tools/list | `method:"tools/list"` | 读 | `20.0s` | `src/octop/infra/connectors/probe.py:457-462`、`:385` |
| 3 | `langchain.tools/call` | `method:"tools/call"` | 写（工具执行） | 由 harness 决定 | `src/octop/infra/connectors/gateway/langchain.py:37-43` |
| 4 | `run_cli(argv, stdin_text, ...)` | 外部 CLI 进程 | 读写 | `30.0s` | `src/octop/infra/connectors/gateway/cli_runner.py:26-58` |
| 5 | OAuth 发现/注册/改码/刷新 | `.well-known/oauth-authorization-server` 等 | 读写 | `20.0s`/`30.0s` | `src/octop/infra/connectors/oauth/mcp.py:72-247` |

## 4. 逐方法请求字典与响应解包契约（Full Dict Schemas）

### 4.1 `initialize` → MCP JSON-RPC（`src/octop/infra/connectors/probe.py:422-431`）

```json
{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "octop", "version": "0.1"}}}
```

| 下游字典键路径 | 类型 | 固定值 / 来源 | 行号 |
|---|---|---|---|
| `jsonrpc` / `id` / `method` | `str/int` | `"2.0"` / `1` / `"initialize"` | `src/octop/infra/connectors/probe.py:422` |
| `params.protocolVersion` | `str` | `"2024-11-05"` | `src/octop/infra/connectors/probe.py:422` |
| `params.capabilities` | `dict` | `{}` | `src/octop/infra/connectors/probe.py:422` |
| `params.clientInfo.name/version` | `str` | `"octop"` / `"0.1"` | `src/octop/infra/connectors/probe.py:422-431` |
| 返回 `result["tools"]` | `list` | 归一为 `{"name","description"}` | `src/octop/infra/connectors/gateway/protocol.py:39`、`src/octop/infra/connectors/probe.py:60-74` |

### 4.2 `tools/list` / `tools/call`（`src/octop/infra/connectors/probe.py:457-462`、`src/octop/infra/connectors/gateway/langchain.py:37-43`）

```json
{"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "<tool_name>", "arguments": {"<k>": "<v>"}}}
```

| 下游字典键 | 类型 | 条件 / 来源 | 行号 |
|---|---|---|---|
| `method` | `str` | `"tools/list"` 或 `"tools/call"` | `src/octop/infra/connectors/probe.py:457`、`src/octop/infra/connectors/gateway/langchain.py:37` |
| `params.name` | `str` | 工具名（仅 call） | `src/octop/infra/connectors/gateway/langchain.py:37-43` |
| `params.arguments` | `dict` | 清洗后的入参 `cleaned`（仅 call） | `src/octop/infra/connectors/gateway/langchain.py:37-43` |
| 返回 `result["content"][i]["type"|"text"]` | `list[dict]` | `"text"` 文本结果 | `src/octop/infra/connectors/gateway/protocol.py:56` |
| 返回 `result["isError"]` | `bool` | `False` 为成功 | `src/octop/infra/connectors/gateway/protocol.py:56` |
| 返回 `error["code"|"message"]` | `dict` | 错误对象 | `src/octop/infra/connectors/gateway/protocol.py:78` |
| 探测结果 | `{"ok","tool_count","tools"}` | 聚合返回 | `src/octop/infra/connectors/probe.py:479-484` |

### 4.3 MCP spec 字典（本仓保存，`src/octop/infra/connectors/builder.py:88-181`）

```json
{"transport": "http", "url": "<url>", "headers": {"<k>": "<v>"}}
```

| spec 键 | 类型 | 必填条件 | 行号 |
|---|---|---|---|
| `transport` | `str` | `http`/`sse`/`stdio` 三选一 | `src/octop/infra/connectors/builder.py:88` |
| `url` | `str` | http/sse 必填 | `src/octop/infra/connectors/builder.py:88` |
| `headers` | `dict` | 可选鉴权头 | `src/octop/infra/connectors/builder.py:88` |
| `allowed_tools` | `list[str]` | 条件透传 | `src/octop/infra/connectors/builder.py:181` |
| `tool_arg_aliases` | `dict` | 条件透传 | `src/octop/infra/connectors/builder.py:181` |

### 4.4 CLI runner（`src/octop/infra/connectors/gateway/cli_runner.py:26-77`）

| 项 | 精确值 | 行号 |
|---|---|---|
| `subprocess.run(argv, input=stdin_text, capture_output=True, text=True, env, timeout_s, cwd, check=False)` | 固定 argv 列表，禁 `shell=True` | `src/octop/infra/connectors/gateway/cli_runner.py:26-58` |
| `returncode==0` | `stdout or "{}"` | `src/octop/infra/connectors/gateway/cli_runner.py:38` |
| 错误解包键 | `payload.get("message") or payload.get("msg")`、`"hint"`、`error.message`、`error.hint` | `src/octop/infra/connectors/gateway/cli_runner.py:61-77` |
| 提示抑制 | 含 `lark-cli`/`wecom-cli` 的 hint 被屏蔽 | `src/octop/infra/connectors/gateway/cli_runner.py:73` |

### 4.5 OAuth 字典（`oauth/mcp.py`）

| 阶段 | 请求字典精确 Key | 返回解包键 | 行号 |
|---|---|---|---|
| 发现 | `GET {issuer}/.well-known/oauth-authorization-server` | `authorization_endpoint`、`token_endpoint`、`registration_endpoint` | `src/octop/infra/connectors/oauth/mcp.py:72-81` |
| 动态注册 | `{"client_name","redirect_uris":[...],"grant_types":["authorization_code","refresh_token"],"response_types":["code"],"token_endpoint_auth_method":…}` | `client_id`、`client_secret` | `src/octop/infra/connectors/oauth/mcp.py:99-105` |
| 授权 | `{"response_type":"code","client_id","redirect_uri","state","code_challenge","code_challenge_method":"S256"}` + 条件 `scope`、`resource` | `code` | `src/octop/infra/connectors/oauth/mcp.py:124-136` |
| 改码 | `{"grant_type":"authorization_code","code","redirect_uri","client_id","code_verifier"}` + 条件 `client_secret`、`resource` | `access_token` | `src/octop/infra/connectors/oauth/mcp.py:165-175` |
| 刷新 | `grant_type=refresh_token` | 归一 `{"access_token","refresh_token","expires_at","token_type"}` | `src/octop/infra/connectors/oauth/mcp.py:207-215`、`:233-247` |

### 4.6 下游错误码拦截与翻译

| 下游条件 | 本仓翻译 | 行号 |
|---|---|---|
| `HTTP 401/403` | `error_type:"auth"`；`401` → `"认证失败，请检查 Token 或授权码"` | `src/octop/infra/connectors/probe.py:129-153`、`:90` |
| `status>=500` | `"远端服务错误 HTTP {code}"` | `src/octop/infra/connectors/probe.py:445` |
| body 错误键 | 依次取 `("show_msg","message","desc","detail","error")` | `src/octop/infra/connectors/probe.py:83` |
| MCP 装配失败 | `ErrorCode.CONNECTOR_MCP_LOAD_FAILED(502)`；对话轮次 `raise_on_failure=False` 时降级 | `src/octop/infra/errors.py:151`、`src/octop/infra/gateway/process/processor.py:1151` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- **新增 MCP 方法/字段**：改 `src/octop/infra/connectors/probe.py:422` 或 `src/octop/infra/connectors/gateway/langchain.py:37` 字典 → 核对 `src/octop/infra/connectors/gateway/protocol.py:39`、`:56` 解包 → 更新 [`../topology-and-mapping.md`](../topology-and-mapping.md) 场景 C 与 [`../index.md`](../index.md) → 跑 `uv run pytest tests/unit/connectors -q`。
- **特殊协议陷阱**：`protocolVersion` 必须字面保持 `"2024-11-05"`；`tools/call` 的 `arguments` 需先清洗（键名别名由 `tool_arg_aliases` 处理）；OAuth 强制 PKCE `S256`；`CONNECTOR_OAUTH_HTTPS_REQUIRED(400)` 禁止非 HTTPS 回调（`src/octop/infra/errors.py:147`）；CLI runner 必须用固定 argv 列表，禁止 `shell=True`。
- **凭据纪律**：`client_secret`/`access_token` 存 `secrets` 与 `connector_oauth_states`，不进日志（[`../../contracts/configuration.md`](../../contracts/configuration.md)）。
