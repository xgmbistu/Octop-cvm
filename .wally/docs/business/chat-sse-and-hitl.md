---
kind: workflow
scope: WF-02-chat-sse-and-hitl
status: draft
origin: generated
source_paths: [src/octop/api/routers/chat/routes.py, src/octop/api/routers/chat/sse.py, src/octop/api/routers/chat/trajectory.py, src/octop/api/routers/chat/models.py, src/octop/api/routers/chat/ws.py, src/octop/infra/gateway/process/processor.py]
symbols: [iter_dashboard_hitl_resume_sse, format_sse, _sse_named, ChatTurnBody, HitlResumeBody, _DECISION_TYPES, resume_hitl]
upstream: [index.md, message-processing.md, ../contracts/api/chat-and-memory.md]
downstream: [../integrations/downstream/llm-provider.md, ../contracts/error-codes.md, domain-models/agent-thread-cron.md]
---

# `WF-02` · HITL 审批与流式会话恢复

工具调用需要人工审批时，流被挂起（`hitl_paused`）；Dashboard 通过 `POST /api/agents/{id}/chat/hitl/resume` 提交 `approve/edit/reject/respond` 决策，服务端以 SSE 增量帧恢复执行。本页展开 SSE 帧字典、决策校验与异常短路。

## 1. 符号级端到端执行调用树

```text
Trigger: POST /api/agents/{agent_id}/chat/hitl/resume (src/octop/api/routers/chat/routes.py:156)
  -> iter_dashboard_hitl_resume_sse (src/octop/api/routers/chat/routes.py:83)
  ├─ [guard: decision] HitlResumeBody validator (src/octop/api/routers/chat/models.py:166)
  │    └─ _DECISION_TYPES={approve,edit,reject,respond} (:10), _MAX_DECISIONS=16 (:12), _MAX_DECISION_MESSAGE_CHARS=8000 (:13)
  ├─ [approve/reject] mark_resolved(..., "rejected" if rejected else "approved") (src/octop/api/routers/chat/routes.py:128-130)
  ├─ [resume] GlobalProcessor.resume_hitl (src/octop/infra/gateway/process/processor.py:937) / iter_hitl_resume_chunks (:923)
  ├─ [stream] format_sse("chunk", chunk) (src/octop/api/routers/chat/sse.py:24)
  │    └─ f"event: {event}\ndata: {payload}\n\n" (:32)
  ├─ [done] {"type":"done"} (src/octop/api/routers/chat/routes.py:132)
  └─ [error] {"type":"error","message":...} (src/octop/api/routers/chat/routes.py:136)
       -> StreamingResponse(gen(), media_type="text/event-stream") (src/octop/api/routers/chat/routes.py:201)
```

## 2. 分阶段业务规则与分支判定表（Exact Code Rules & Thresholds）

| 阶段 | 负责函数（路径:行号） | 精确布尔条件 / 阈值常量 | 命中分支行为 | 状态副作用 |
|---|---|---|---|---|
| 决策类型 | `HitlResumeBody`（`src/octop/api/routers/chat/models.py:153`、validator `:166`） | `_DECISION_TYPES = frozenset({"approve","edit","reject","respond"})` (`:10`) | 非法类型 422 | 无 |
| 决策上限 | `src/octop/api/routers/chat/models.py:12-13` | `_MAX_DECISIONS=16`、`_MAX_DECISION_MESSAGE_CHARS=8000` | 超限拒绝 | 无 |
| 审批结果 | `mark_resolved`（`src/octop/api/routers/chat/routes.py:128`） | `rejected` 布尔 | 写 `"rejected"` 或 `"approved"` | HITL 记录状态 |
| SSE 帧 | `format_sse`（`src/octop/api/routers/chat/sse.py:24`） | `json_chunk_default`（`:9`）；不可序列化回 `{"type":"error","message":"chunk not serializable"}`（`:31`） | 逐帧 yield | 无 |
| 轨迹 SSE | `_sse_named`（`src/octop/api/routers/chat/trajectory.py:156`） | 事件名 `"chunk"`/`"metrics"`/`"heartbeat"`/`"error"`/`"event"`（`:170`、`:214`、`:234`、`:203`） | 带 `id: {sse_id}` 前缀 | 轨迹事件落表 |
| WS 帧 | `dashboard_chat_ws`（`src/octop/api/routers/chat/ws.py:32`） | `ping`/`subscribe`/`cancel`/`user_turn`（`:91`、`:95`、`:116`、`:135`） | 未知类型 `{"type":"error","message":"unknown message type: …"}`（`:131`） | `turn_status.active` |
| Polish 超时 | `src/octop/api/routers/chat/routes.py:235` | `timeout=30.0` | 超时报错 | 无 |

## 3. SSE / WS 帧字典契约

| 帧类型 | 事件名 / `type` | 精确 Key | 构造锚点 |
|---|---|---|---|
| SSE 增量 | `event: chunk` | `data: <json>`，`{"type":"token","content":...}` 等 | `src/octop/api/routers/chat/sse.py:24-32`、`src/octop/api/routers/chat/routes.py:125` |
| SSE 轨迹 | `event: metrics`/`heartbeat`/`error`/`event` | `id: {sse_id}` 前缀 + `data` | `src/octop/api/routers/chat/trajectory.py:156-234` |
| SSE 终止 | `event: chunk` | `{"type":"done"}` | `src/octop/api/routers/chat/routes.py:132` |
| SSE 错误 | `event: chunk` | `{"type":"error","message":...}` | `src/octop/api/routers/chat/routes.py:136` |
| WS 出向 | `type` | `pong`/`turn_status`/`token`/`tool_result`/`hitl_required`/`error`/`done` | `src/octop/api/routers/chat/ws.py:91`、`:95`、`src/octop/infra/gateway/process/processor.py:865`、`:880`、`:909` |
| WS 关闭码 | — | `4001`（缺 token/鉴权）、`1011`（网关未就绪）、`4003`/`4404`（越权/不存在） | `src/octop/api/routers/chat/ws.py:41`、`:47`、`:55`、`:63-64` |

## 4. 幂等、并发互斥与异常补偿回滚表

| 边界 / 故障场景 | 源码检测条件 | 保护/回滚/降级动作 |
|---|---|---|
| 重复提交同一决策 | `mark_resolved`（`src/octop/api/routers/chat/routes.py:128`） | 幂等写审批状态，不重复恢复流 |
| chunk 不可序列化 | `json_chunk_default`（`src/octop/api/routers/chat/sse.py:9`） | 回退 `{"type":"error","message":"chunk not serializable"}`，不中断整个流 |
| harness 恢复失败 | `src/octop/infra/gateway/process/processor.py:909` | `{"type":"error"}` + `{"type":"done"}` 收尾 |
| Cron 触发的 HITL 需求 | `src/octop/infra/cron/delivery.py:149` | 抛 `RuntimeError("cron agent run requires user interaction")`，任务记 `error` |

## 5. 共变耦合与修改清单（Agent Co-Change Playbook）

1. 改决策类型/上限：同步 `src/octop/api/routers/chat/models.py:10-13`、前端审批弹窗与 [`../overview/glossary.md`](../overview/glossary.md) 字面量集合。
2. 改 SSE 帧结构：改 `src/octop/api/routers/chat/sse.py:24` → 核对 `src/octop/api/routers/chat/routes.py:125` 与 `src/octop/api/routers/chat/trajectory.py:156-234` 的事件名 → 同步 `dashboard/src/pages/Chat/hooks/sseHelpers.ts`。
3. 改 WS 关闭码/帧：同步 `src/octop/api/routers/chat/ws.py:41-64` 与前端 `useUnauthorizedRedirect` 等 hook（[`../architecture/dashboard-ui.md`](../architecture/dashboard-ui.md)）。
4. 必跑回归：`uv run pytest tests/unit/api tests/unit/gateway -q`；错误分支同步 [`../contracts/error-codes.md`](../contracts/error-codes.md)。
