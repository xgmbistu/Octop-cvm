---
kind: panorama
scope: callchain-panorama
status: draft
origin: generated
source_paths: [src/octop/api/routers/chat/ws.py, src/octop/infra/gateway/process/processor.py, src/octop/infra/gateway/process/harness_request.py, src/octop/infra/cron/delivery.py, src/octop/infra/knowledge/jobs.py, src/octop/infra/gateway/process/stream_project.py]
symbols: [dashboard_chat_ws, GlobalProcessor.__call__, iter_turn_chunks, build_harness_request, project_stream, CronDeliveryService.deliver, process_document]
upstream: [../INDEX.md, system-architecture.md]
downstream: [../integrations/topology-and-mapping.md, ../contracts/error-codes.md, ../business/message-processing.md]
---

# 主干调用链全景

提炼贯穿全仓的四条主干执行链路：同步/流式对话链（Web/IM/Cron 三面归一）、HITL 恢复链、异步知识索引链、定时投递链。跨线程、队列、子进程与动态分发处显式给出「投递点 → 消费入口」桥接，避免静态搜索断链。

## 1. 主干链路索引

| 链路 ID | 链路名称 | 模式 | 起点符号（路径:行号） | 终点落点 | 对应业务页 |
|---|---|---|---|---|---|
| `CC-01` | Dashboard WS 对话流 | 流式异步 | `dashboard_chat_ws` (`src/octop/api/routers/chat/ws.py:32`) | WS 帧 + `thread_messages` 投影 | [message-processing.md](../business/message-processing.md) |
| `CC-02` | IM/Cron 统一消息处理 | 生成器流 | `GlobalProcessor.__call__` (`src/octop/infra/gateway/process/processor.py:517`) | `MessageEvent` 流 + 审计 | [message-processing.md](../business/message-processing.md) |
| `CC-03` | 知识文档索引 | 后台任务 | `process_document` (`src/octop/infra/knowledge/jobs.py:34`) | `KnowledgeIndex` 向量 + `status="ready"` | [knowledge-indexing.md](../business/knowledge-indexing.md) |
| `CC-04` | 定时任务投递 | APScheduler | `CronJob.run` (`src/octop/infra/cron/job.py:78`) | `cron_jobs.last_status` + 推送 | [cron-automation.md](../business/cron-automation.md) |

---

## 2. 符号级条件调用树

### `CC-01`：Dashboard WS 对话流

```text
WS /api/chat/ws -> src/octop/api/routers/chat/ws.py:32 dashboard_chat_ws(websocket)
  ├─ [guard: token] src/octop/api/routers/chat/ws.py:41/47 缺失或鉴权失败 -> close(4001)
  ├─ [guard: gateway] src/octop/api/routers/chat/ws.py:55 未就绪 -> close(1011)
  ├─ [loop: msg_type]
  │    ├─ "ping"      src/octop/api/routers/chat/ws.py:91  -> {"type":"pong"}
  │    ├─ "subscribe" src/octop/api/routers/chat/ws.py:95  -> {"type":"turn_status","thread_id","active"}
  │    ├─ "cancel"    src/octop/api/routers/chat/ws.py:116 -> cancel_stream
  │    └─ "user_turn" src/octop/api/routers/chat/ws.py:135 -> build_dashboard_inbound (src/octop/api/routers/chat/turn.py:306)
  │         └─ ValidationError/OctopError -> {"type":"error"} + {"type":"done"} (src/octop/api/routers/chat/ws.py:137-156)
  ├─ [subscribe] src/octop/api/routers/chat/ws.py:167 hub.subscribe(...)
  ├─ [enqueue]   src/octop/api/routers/chat/ws.py:168 channel_manager.enqueue(WS_CHANNEL_ID, inbound)
  └─ [consume]   src/octop/infra/gateway/ws/ws_channel.py:90 handle_inbound
       └─ GlobalProcessor.iter_turn_chunks (src/octop/infra/gateway/process/processor.py:752) -> _hub.push_to_thread(:153)
```

### `CC-02`：IM/Cron 统一消息处理

```text
InboundMessage -> src/octop/infra/gateway/process/processor.py:517 GlobalProcessor.__call__(msg)
  ├─ [metric] src/octop/infra/gateway/process/processor.py:520 METRICS.inc("messages_total")
  ├─ [guard: tenant] src/octop/infra/gateway/process/processor.py:523 空 tenant_id -> error_event + completed()（短路）
  ├─ [slash] src/octop/infra/gateway/process/processor.py:537 parse_slash(msg.text)
  │    ├─ approve/reject/pending -> _hitl.iter_slash_resolution (:544-582)
  │    ├─ cmd is None -> _hitl.resolve_ask_pending (:587-618)
  │    └─ _dispatcher.handle (:620) -> [if handled] completed(); return (:635)
  ├─ [thread] src/octop/infra/gateway/process/processor.py:639 get_or_create_by_key -> media_backend_for_agent (:648)
  ├─ [content] src/octop/infra/gateway/process/processor.py:649 build_content_from_message (src/octop/infra/gateway/process/harness_request.py:96, VISION_MAX_COUNT=4)
  ├─ [model] src/octop/infra/gateway/process/processor.py:654 _resolve_harness_model -> _resolve_turn_mcp_servers(..., raise_on_failure=False) (:661)
  ├─ [request] src/octop/infra/gateway/process/processor.py:686 build_harness_request (src/octop/infra/gateway/process/harness_request.py:255) -> _attach_turn_knowledge_config (:696)
  ├─ [stream] src/octop/infra/gateway/process/processor.py:713 project_stream (src/octop/infra/gateway/process/stream_project.py:231) -> agent_manager.stream(:856)
  │    ├─ "hitl_required" -> register_from_request (:865)
  │    └─ "tool_result" -> enrich_tool_result_with_backend (:880)
  ├─ [success] src/octop/infra/gateway/process/processor.py:738-746 _touch_thread_after_turn + _record_turn_usage + _record_turn_history
  └─ [always] src/octop/infra/gateway/process/processor.py:747 MessageEvent.completed()；异常 -> format_stream_error + 审计 "agent.stream.error" (:735)
```

### `CC-03` / `CC-04`：异步索引与定时投递

```text
CC-03 文档上传 -> src/octop/infra/knowledge/jobs.py:63 enqueue_index_document
  └─ src/octop/infra/knowledge/jobs.py:34 process_document -> status="processing"(:44) -> chunk_text(src/octop/infra/knowledge/chunk.py:6, size=800, overlap=120)
       -> embed_knowledge_texts (:52) -> KnowledgeIndex.replace_doc_chunks (:53)
       -> status="ready", chunk_count (:55)；异常 -> status="failed" (:59)

CC-04 AsyncIOScheduler -> src/octop/infra/cron/job.py:78 CronJob.run
  ├─ METRICS.inc("cron_runs_total") (:81)
  ├─ CronDeliveryService.deliver (src/octop/infra/cron/delivery.py:66) -> run_in_session (:82)
  │    ├─ task_type == "text" -> _deliver_text (:88)
  │    └─ else _deliver_agent (:131) -> agent_manager.stream(:141) 消费 ("token","delta")
  ├─ 失败 -> set_run_status(status="error") (:103) + 审计 "cron.run_failed" (:106)
  └─ 成功 -> status="ok" (:111) + "cron.run_ok" (:114)
```

---

## 3. 跨线程 / 队列 / 子进程 / 动态分发桥接表

| 投递方符号（路径:行号） | 桥接机制 | 实际接收执行入口 | 载荷结构 |
|---|---|---|---|
| `channel_manager.enqueue` (`src/octop/api/routers/chat/ws.py:168`) | `WS_CHANNEL_ID` 内存通道 | `ws_channel.handle_inbound` (`src/octop/infra/gateway/ws/ws_channel.py:90`) | `InboundMessage`（含 metadata `thread_id`/`session_key`） |
| `SlashDispatcher.handle` (`src/octop/infra/gateway/slash/dispatcher.py:35`) | `_handlers` 字典 + `runtime.has` 动态分发 | `handlers/` 与 `src/octop/infra/connectors/catalog.py:67` 的 `CATALOG` | `cmd.name` + 参数 |
| `router.add_api_route` (`src/octop/api/routers/memory.py:654`) | 运行时注册（非装饰器） | `_terminal_endpoint(method_name)` (`src/octop/api/routers/memory.py:645`) | `GET /agents/{id}/memory/terminal/*` |
| `CronManager._schedule` (`src/octop/infra/cron/manager.py:236`) | `AsyncIOScheduler` + `misfire_grace_time=60` | `CronJob.run` (`src/octop/infra/cron/job.py:78`) | `CronDeliveryCommand` (`src/octop/infra/cron/delivery.py:32`) |
| `subprocess.Popen` (`src/octop/infra/gateway/bot_creators/feishu_runner.py:42`) | 子进程 stdout 行协议 | `action=="show_qrcode"/"finish"` 解包（`:51-82`） | `{"action","content","data"}` 行 JSON |
| `run_cli` (`src/octop/infra/connectors/gateway/cli_runner.py:38`) | `subprocess.run(argv, input=stdin_text, timeout_s)` | `lark-cli` / `wecom-cli` 外部 CLI | JSON（错误解包 `message`/`hint`） |
| `ACPConfig.from_dict` (`src/octop/infra/agents/manager.py:2577`) | harness 黑盒子进程（本仓不含实现） | 外部 OpenCode / Claude Code / Codex / CodeBuddy | `{"command","args"}` runner 配置 |

链路中字段级入向 → 出向变形规则见 [`topology-and-mapping.md`](../integrations/topology-and-mapping.md)，错误短路与 `degraded` 字面量见 [`error-codes.md`](../contracts/error-codes.md)。

## 4. 共变耦合与修改清单（Co-Change Playbook）

- **新增主干链路**：先在 [`../business/index.md`](../business/index.md) 登记 `WF-*` → 在本页加 `CC-*` 索引与符号调用树 → 在第 3 节桥接表补「投递点 → 消费入口」→ 同步 [`../architecture/module-dep-matrix.md`](../architecture/module-dep-matrix.md) 调用边。
- **改桥接机制**：线程/队列/`subprocess`/动态分发任一侧变更都会让静态搜索断链，必须同时更新 `src/octop/infra/gateway/process/processor.py:752`、`src/octop/infra/cron/manager.py:236` 与 `src/octop/infra/connectors/gateway/cli_runner.py:38` 的对应锚点。
- **必跑回归**：`uv run pytest tests/unit/gateway tests/unit/cron tests/unit/connectors -q`；新增子进程桥接补 `tests/support/fakes.py` 桩。
