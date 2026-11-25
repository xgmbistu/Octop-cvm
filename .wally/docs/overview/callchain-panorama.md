---
kind: panorama
scope: callchain-panorama
status: draft
origin: generated
source_paths: [src/octop/api/routers/chat/ws.py, src/octop/infra/gateway/process/processor.py, src/octop/infra/agents/manager.py, src/octop/infra/cron/job.py, src/octop/infra/connectors/gateway/protocol.py, src/octop/api/routers/setup.py]
symbols: [dashboard_chat_ws, GlobalProcessor.__call__, AgentManager.stream, CronJob.run, handle_mcp_request, setup_finish]
upstream: [INDEX.md]
downstream: [integrations/topology-and-mapping.md, contracts/error-codes.md]
---

# 主干调用链全景

Octop 的四条主干链（对话、定时、MCP 工具、安装绑定）均收敛到 `OctopServer` 装配出的同一组单例；本页用符号级条件调用树与跨进程桥接表连接静态搜索易断链处。

## 1. 主干链路索引

| 链路 ID | 链路名称 | 模式 | 起点符号（`路径:行号`） | 终点落点 | 对应业务页 |
|---|---|---|---|---|---|
| `CC-01` | Dashboard/IM 对话回合 | 同步 WS + 流式 | `dashboard_chat_ws` (`api/routers/chat/ws.py:32`) | harness → `usage_log`/`trajectory_events`/WS 帧 | [`chat-turn.md`](../business/chat-turn.md) |
| `CC-02` | Cron 任务投递与执行 | 异步定时 | `CronJob.run` (`infra/cron/job.py:78`) | `cron_jobs.last_status` + IM/dashboard 推送 | [`cron-and-proactive.md`](../business/cron-and-proactive.md) |
| `CC-03` | MCP 工具调用 | 同步 JSON-RPC | `internal_mcp_post` (`api/routers/internal_mcp.py:50`) | 13 类下游 adapter → 外部服务 | [`connectors-mcp.md`](../integrations/downstream/connectors-mcp.md) |
| `CC-04` | 首次安装与认证 | 同步请求 | `setup_finish` (`api/routers/setup.py:412`) | `config.json` + `bind_control_plane` + JWT | [`setup-and-auth.md`](../business/setup-and-auth.md) |

## 2. 符号级条件调用树

### `CC-01`：对话回合

```text
WS /api/agents/{aid}/chat/ws -> src/octop/api/routers/chat/ws.py:32 dashboard_chat_ws(req)
  ├─ [guard: JWT/归属] ws.py:47-63 -> fail: close 4001/4003/4404/1011
  ├─ [frame] ws.py:90-130 user_turn -> :135 UserTurnWsFrame -> :142 空内容拒绝
  ├─ [prepare] src/octop/api/routers/chat/turn.py:226 prepare_dashboard_turn
  │    ├─ [if mcp fail] :245 prepare_chat_mcp -> 错误帧
  │    └─ :283-285 update_composer + build_composer_context
  ├─ [enqueue] ws.py:168 channel_manager.enqueue(WS_CHANNEL_ID, inbound)
  ├─ [orchestrate] src/octop/infra/gateway/process/processor.py:517 __call__
  │    ├─ [slash: HITL/ask/normal] :544-637 短路
  │    ├─ :639 ThreadRegistry.get_or_create_by_key
  │    ├─ [model] :423-448 解析优先级 + :474 推理覆盖
  │    ├─ [outbound] :686 build_harness_request -> src/octop/infra/agents/manager.py:956 stream
  │    └─ [project] :713 project_stream -> stream_project.py:110-229 token→delta / hitl→卡片
  └─ [done] processor.py:740 usage + :746 history + :747 completed
```

### `CC-02`：Cron 任务

```text
CronManager.boot (infra/cron/manager.py:75) -> reload_from_db (:82) -> _schedule (:236)
  └─ add_job (:251, misfire_grace_time=60) -> CronJob.run (job.py:78)
       ├─ [guard] session 归属不符 -> manager.py:263-277 ValueError
       ├─ [deliver] CronDeliveryService.deliver (delivery.py:66) [Gateway.run_in_session :82]
       │    ├─ [if task_type=text] :88 _deliver_text -> push_text_from_session
       │    └─ [if task_type=agent] :131 _build_agent_request -> AgentManager.stream
       │         ├─ :146-149 hitl_required -> RuntimeError
       │         └─ :151-153 空输出 -> RuntimeError
       ├─ [ok] :111-116 status="ok" + audit cron.run_ok
       └─ [err] :100-110 cron_errors_total + last_status="error" + audit cron.run_failed
```

### `CC-03`：MCP 工具调用

```text
POST /api/internal/mcp/{kind}/{id} -> internal_mcp.py:50 internal_mcp_post
  └─ handle_mcp_request (connectors/gateway/protocol.py:21)
       ├─ [unwrap] :44-51 params.name / arguments.kwargs
       ├─ [dispatch] registry.py:32-77 kind -> GatewayAdapter.call_tool
       │    └─ adapter 组装请求字典（13 类，见 downstream 专页）
       ├─ [if unknown kind] protocol.py:54-78 _err(-32601)
       └─ [return] result.content[0].text -> _ok -> JSON-RPC result
```

### `CC-04`：首次安装

```text
POST /api/setup/database -> setup.py:272 -> bind_control_plane (server.py:328-351)
  ├─ [guard] should_defer_control_plane_db (server.py:313-317) / user_count==0 (db/rebind.py:102)
  ├─ open_database -> run_migrations -> build_shared_services
  └─ POST /api/setup/finish (setup.py:412) -> _boot_runtime -> JWT secret (server.py:543-545)
       └─ [middleware] setup_lockdown.py:36-40 零用户 503 -> 用户创建后放行
```

## 3. 跨线程 / 队列 / 子进程 / 协议桥接表

| 投递方符号（`路径:行号`） | 桥接机制 | 实际接收执行入口（`路径:行号`） | 载荷结构 |
|---|---|---|---|
| `ws.py:168 enqueue(WS_CHANNEL_ID, inbound)` | `WebSocketChannel` 内存通道 | `gateway/ws/ws_channel.py:90 handle_inbound` | `InboundMessage` + metadata dict |
| `cron/manager.py:220 run_now` | `asyncio.ensure_future` | `cron/job.py:78 CronJob.run` | cron row |
| `knowledge/jobs.py:63 enqueue_index_document` | `run_in_executor` + `asyncio.Semaphore(2)` | `jobs.py:34 process_document` | document_id |
| `connectors/gateway/cli_runner.py:61-82` | `subprocess.run(argv)` | `lark-cli` / `wecom-cli` stdout JSON | `[binary,domain,method,--params,…]` |
| `mobile/adb.py:288-357` | `subprocess.run([adb,…])` | 设备 shell `input tap/swipe/text` | argv |
| `gateway/process/stream_project.py:110-229` | 异步生成器 → `hub.push_to_thread` | `ws_channel.py:153` | `MessageEvent` 帧 |
| `api/routers/chat/sse.py:24-32` | `StreamingResponse` | 浏览器 EventSource | `event/data` 文本帧 |
| `infra/agents/manager.py:2337 _reload_worker` | `_reload_dirty` 集合合并 | `:2302 _reload_agent` | agent_id 集合 |

静态搜索在 `asyncio.create_task`、`run_in_executor`、`subprocess`、`actions[kind]` 处会断链；排障时按本表跳到真实消费入口，错误码语义统一查 [`error-codes.md`](../contracts/error-codes.md)。

## 4. 导航与维护

跨链路字段变形见 [参数组装矩阵](../integrations/topology-and-mapping.md)，分层装配见 [系统技术架构](system-architecture.md)，调用边爆炸半径见 [模块依赖矩阵](../architecture/module-dep-matrix.md)。新增链路时同步更新本节与 [INDEX](../INDEX.md)。
