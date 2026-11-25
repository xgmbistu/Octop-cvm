---
kind: downstream-contract
scope: connectors-mcp
status: draft
origin: generated
source_paths: [src/octop/infra/connectors/gateway/protocol.py, src/octop/infra/connectors/gateway/registry.py, src/octop/infra/connectors/gateway/langchain.py, src/octop/infra/connectors/builder.py, src/octop/infra/connectors/oauth/mcp.py, src/octop/infra/connectors/gateway/cli_install.py, src/octop/infra/connectors/mcp_tool_cache.py]
symbols: [handle_mcp_request, call_gateway_tool, build_gateway_langchain_tools, build_http_mcp_spec, validate_create_credentials, _normalize_tokens, fingerprint_mcp_spec]
upstream: [integrations/index.md, integrations/topology-and-mapping.md]
downstream: [contracts/error-codes.md, business/chat-turn.md]
---

# 下游出向接口契约：`Connectors / MCP Gateway`

连接器把外部服务（HTTP API、宿主 CLI、私有知识库）统一包装为进程内 MCP 工具：上游 harness 以 JSON-RPC 信封调用，本仓 `GatewayAdapter` 组装真实请求字典并解包返回，错误再翻译为中文 ValueError。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（`路径:行号`） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/connectors/gateway/protocol.py`（JSON-RPC 信封）、`registry.py`（adapter 分派）、`builder.py`（spec/凭证组装） | `protocol.py:21-51`、`registry.py:32-77`、`builder.py:76-200` |
| 底层传输底座 | `httpx`（HTTP JSON）、`subprocess`（CLI argv）、`imaplib/smtplib`（邮件）；无单一 BaseAdapter | `src/octop/infra/connectors/gateway/cli_runner.py:61-82` |
| 端点与鉴权配置来源 | DB `connectors` 行凭证，按 `auth_kind` 归一化为 `token/api_key+client_id/internal_token/cookie/bot_id+bot_secret/email+password+imap/smtp_hosts` | `builder.py:203-413` |
| 公共请求信封格式 | `{"method":"tools/call","id":…,"params":{"name":…,"arguments":{"kwargs":{…}}}}`；内部 token `secrets.token_urlsafe(32)` | `protocol.py:21-51`、`builder.py:72` |
| 成功判定条件 | `_ok` 返回 `{jsonrpc,id,result}`；`result.content[].text` 为业务文本，`isError` 标记错误；未注册 kind 返回 `_err(-32601)` | `protocol.py:54-78`、`registry.py:32-77` |
| MCP HTTP 地址 | `build_http_mcp_spec` → `http://host:port/api/internal/mcp/{kind}/{id}?token=...`（网关型）或外部 URL + headers（remote 型） | `builder.py:76-200` |

## 2. 本仓上游调用方反查表

| 本仓封装方法 | 上游调用模块与函数 | 调用点锚点（`路径:行号`） |
|---|---|---|
| `handle_mcp_request` | `POST/GET/DELETE /api/internal/mcp/{kind}/{instance_id}` | `src/octop/api/routers/internal_mcp.py:50`、`:96`、`:133` |
| `call_gateway_tool` | 13 个 `GatewayAdapter.call_tool` 实现 | `src/octop/infra/connectors/gateway/registry.py:32-77` |
| `build_gateway_langchain_tools` | `AgentManager._build_harness_config` 的 MCP tool 装配 | `src/octop/infra/agents/manager.py:2586-2601`、`src/octop/infra/connectors/gateway/langchain.py:30-58` |
| `validate_create_credentials` | `POST /api/connector-instances` | `src/octop/api/routers/connectors.py:662` |
| `fingerprint_mcp_spec` | MCP tool cache 指纹与共享封装 | `src/octop/infra/connectors/mcp_tool_cache.py:12-94` |

## 3. 封装方法总清单（13 类 GatewayAdapter）

`GatewayAdapter` 统一实现 `list_tools/call_tool/probe_credentials`（`registry.py:24-29`）。逐下游方法与请求字典如下。

## 4. 逐方法请求字典与响应解包契约

| 下游系统 | 请求字典真实 Key（值来源 / 转换） | 返回解包字段 | 错误翻译 | 源码锚点 |
|---|---|---|---|---|
| 百度地图 Agent Plan | GET `user_raw_request←args.query`、`region←args.region`；headers `Authorization=Bearer {api_key\|token}` | `status/message/result/results` | `status=102` 或 message 含 token 失效→「Token 无效」 | `adapters/baidu_map.py:63-113` |
| 携程问道 | POST `{token, query, source:"octop"}`；token 必须 `^[0-9a-f]{32}$` | 原 `r.text` | 空→「返回为空」；含 error/invalid→「接口错误」 | `adapters/ctrip_wendao.py:44-79` |
| 美团旅游 | headers `Authorization=裸 token`；body `{city 默认"北京", query}` | `data` 或原 payload | 401 / msg 含鉴权失败→「API Key 无效」 | `adapters/meituan_travel.py:49-98` |
| 腾讯新闻 OpenAPI | headers `Authorization=Bearer`、`Skill-Request-Id=uuid4`、`Caller-Skill=octop_tencent-news_0.1`；body `{page:1,page_size:limit(1-50),is_show_content:0,query:{query_id,search},article_types:[0]}` | `base_rsp.code/msg` | `code=4006` 或 msg 含 apikey→「API Key 无效」 | `adapters/tencent_news.py:55-101` |
| QQ 音乐 Skills | body `{params:{keyword\|type\|topId\|dissId},comm:{skill_version:"0.0.3"}}`；Bearer `qmk-` | `ret`/`msg` | 401 / `ret=11534343`→「API Key 无效」；route not found 放过 | `adapters/qq_music.py:76-145` |
| 微信读书 | body `{api_name:"/shelf/sync"\|"/book/bookmarklist",skill_version:"1.0.3",bookId}`；Bearer `wrk-` | `errcode`/`errmsg` | `errcode≠0`→`[{errcode}] {errmsg}` | `adapters/wechat_reading.py:45-90` |
| 飞猪 MCP（签名） | body `{jsonrpc,id,method,params}`；headers `Authorization=Bearer`、`x-ff-ctx`=gzip+AES-GCM{machine,fingerprint}、`x-ttid`、`x-ff-ai-sign-ver/alg/ts/nonce/sign`（HMAC-SHA256） | `result.content[0].text` | 401 / error.message 含 auth→「API Key 无效」 | `adapters/fliggy.py:64-193` |
| 元典法律 AI | headers `X-API-Key=sk_`；`law_vector_search{query,return_num≤45}`、`case_vector_search{query}`、GET `rh_enterpriseSearch?name&top_k`、`rh_company_info?name&num`、`hall_detect{text}` | `success/code/message/msg/error_code` | 401/403→「无效: HTTP」；success=false 且 msg 含 api+key→「API Key 无效」 | `adapters/yuandian.py:100-221` |
| QQ/网易邮箱 | `imap.uid("search",query)`、`uid("fetch",uid,"(BODY.PEEK[…])"/"(RFC822)")`；SMTP `{to,subject,body}`+MIMEText | `[{uid,from,subject,date(,body)}]` / `{ok,to}` | `imaplib.IMAP4.error`；网易主机 `correct_netease_*_host` | `adapters/qq_mail.py:83-185`、`mail_servers.py:52-90` |
| 飞书 CLI（`lark-cli`） | argv `[binary,domain,*shlex(method),"--format","json"]`；`+xxx`→`--{key} {value}`，否则 `--params json.dumps(args)`；`--as {bot\|user}` | CLI stdout JSON | scope/auth→「登录授权」；command not found→「用安装 CLI」；过滤 `run xxx` hint | `adapters/feishu_cli.py:117-228`、`cli_runner.py:61-82` |
| 企微 CLI（`wecom-cli`） | argv `[binary,name,method,json.dumps(args)]` | CLI stdout | 未找到 MCP / `bot_id\|secret invalid`→「凭证无效」 | `adapters/wecom_cli.py:115-212` |
| WeKnora 私有 KB | headers `X-API-Key`/`X-Tenant-ID`；POST `/knowledge-search` `{query,knowledge_base_ids}`、`params={resource_urls:"handle"}`；GET `/chunks/{id}?page&page_size` | `{passages:[{knowledge_id,chunk_index,score,content(截1200),truncated}]}` | HTTP status→「WeKnora request failed: HTTP n」 | `adapters/weknora.py:72-223` |
| 腾讯 IMA | headers `ima-openapi-clientid`/`ima-openapi-apikey`；`get_doc_content{note_id,target_content_format:0}`、`import_doc{content_format:1,content,folder_id}`、`add_knowledge{media_type:11,title,knowledge_base_id,note_info:{content_id}}` | 原 `data`（含 `code`） | `code≠0`→`[{code}] {msg}`；401→「IMA 认证失败」 | `adapters/tencent_ima.py:265-499` |

**隐式双重解包**：`protocol.py:44-51` 先剥 `arguments.kwargs`，`langchain.py:33` 再剥 None 值，才是 adapter 的真实入参；任一环节键名变更都会让全部 13 个 adapter 收到空参数。

## 4.5 OAuth / 凭证字典与返回解包

| 下游流程 | 请求字典 Key | 返回解包字段 | 错误翻译 | 源码锚点 |
|---|---|---|---|---|
| RFC8414 元数据发现 | GET `{issuer}/.well-known/oauth-authorization-server` | `authorization_endpoint/token_endpoint/registration_endpoint/scopes_supported` | 缺端点→「oauth metadata missing endpoints」；SSRF host 非 issuer→拒绝 | `src/octop/infra/connectors/oauth/mcp.py:46-81` |
| DCR 动态注册 | `{client_name,redirect_uris,grant_types:["authorization_code","refresh_token"],response_types:["code"],token_endpoint_auth_method}` | `client_id`/`client_secret` | 无 client_id→「dynamic client registration failed」 | `mcp.py:84-111` |
| token 交换/刷新 | `{grant_type,code\|refresh_token,redirect_uri,client_id,code_verifier?,client_secret?,resource?}` | `access_token/refresh_token/expires_at(now+expires_in)/token_type` | HTTPStatusError→「token exchange/refresh failed (HTTP n)」 | `mcp.py:149-247` |
| 飞书设备码登录 | `[lark-cli,auth,login,--no-wait,--json,--domain,all,--scope,"search:docs:read"]` | `device_code/verification_url/user_code/expires_in` | 缺字段→「返回不完整」；user 不可用→「授权未完成」 | `src/octop/infra/connectors/gateway/feishu_user_auth.py:22-116` |
| 企微 get_mcp_config | `{bot_id,time,nonce,signature:sha256(secret+bot_id+time+nonce),bind_source:1,cli_version}` | `list[]`（count） | `errcode≠0`→「凭证校验失败」；空→「机器人未开通 CLI 能力」 | `src/octop/infra/connectors/gateway/wecom_creds.py:108-156` |
| CLI 安装 | `npm install -g [--prefix ~/.npm-global] {package}` | `{installed,binary_path,version,install_command}` | 超时/EACCES→`ok=False` + 手动命令 | `src/octop/infra/connectors/gateway/cli_install.py:140-228` |

`fingerprint_mcp_spec` 的指纹 Keys 为 `transport/url/headers/command/args/env`（sort_keys + sha256 前 16 位），`wrap_tools_for_shared_use` 用 `asyncio.Lock` 串行化共享工具（`src/octop/infra/connectors/mcp_tool_cache.py:12-94`）。

## 5. 共变耦合与修改清单（Co-Change Playbook）

- 新增 adapter：实现 `list_tools/call_tool/probe_credentials` → 在 `registry.py:24-29` 注册 kind → `builder.py:203-413` 补 `auth_kind` 凭证键 → `api/routers/connectors.py` 补 CRUD 分支 → 更新 `tests/unit/connectors/` 中的 probe 桩。
- 修改请求字典：逐一核对第 2、4 节全部上游调用点；错误文案必须保留 `api_key/token` 识别逻辑，避免密钥回显（详见 [错误码字典](../../contracts/error-codes.md)）。
- **特殊陷阱**：`cli_runner.py:72-74` 明确过滤含 `lark-cli/wecom-cli` 的 hint，防止 Agent 进入 shell/auth 无限循环；这是业务层硬编码契约，重构错误文案时不得删除。

## 导航与共变索引

字段级映射见 [参数组装矩阵](../topology-and-mapping.md)，上游连接器接口见 [连接器分组契约](../../contracts/api/connectors-and-channels.md)，凭证错误语义见 [错误码字典](../../contracts/error-codes.md)。
