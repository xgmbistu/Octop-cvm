---
kind: downstream-contract
scope: llm-provider
status: draft
origin: generated
source_paths: [src/octop/infra/agents/providers/probe.py, src/octop/infra/agents/providers/store.py, src/octop/infra/agents/providers/onnx_service.py, src/octop/api/routers/providers.py, src/octop/api/routers/setup.py]
symbols: [probe_provider_row, fetch_openai_compatible_models, _probe_embeddings, probe_local_model, build_chat_model]
upstream: [../index.md, ../topology-and-mapping.md]
downstream: []
---

# 下游出向接口契约：`llm-provider`（OpenAI 兼容模型提供方）

OpenAI 兼容 Provider 提供模型列表、Embedding 心跳与 Chat 连通性探测能力。本仓业务封装集中在 `src/octop/infra/agents/providers/probe.py`；**真正的聊天/ONNX 模型调用委托给 `harness-agent` 的 `build_chat_model` / `ChatOpenAI.ainvoke`，属仓外黑盒**，本仓不组装其 wire 字典，仅做边界配置注入。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（路径:行号） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/agents/providers/probe.py` | 请求字典组装与返回解包层 |
| 底层传输 | `httpx`（`Authorization: Bearer` + `extra_json.headers` 合并） | `src/octop/infra/agents/providers/probe.py:165-168`、`:23-34` |
| 端点模板 | `POST {base}/embeddings`、`GET {base}/models`、`chat ping` | `src/octop/infra/agents/providers/probe.py:174`、`:262`、`:238` |
| 探测超时 | `_FETCH_MODELS_TIMEOUT_S = 30.0`；chat ping `asyncio.wait_for(..., 30.0)` | `src/octop/infra/agents/providers/probe.py:19`、`:239` |
| 公共请求信封 | `{"model": <model_id>, "input": ["ping"]}`（embeddings） | `src/octop/infra/agents/providers/probe.py:174` |
| 下游成功判定 | `status_code < 400` 且 `data[0]["embedding"]` 为非空 list | `src/octop/infra/agents/providers/probe.py:180-206` |
| Codex 分支 kwargs | `{"model","base_url","api_key","use_responses_api": True}` + 条件 `default_headers` | `src/octop/infra/agents/providers/probe.py:58-66` |
| 本地 ONNX 返回 | `{"ok","latency_ms","dim"}`（on-device，无网络） | `src/octop/infra/agents/providers/onnx_service.py:407-436` |

## 2. 本仓上游调用方反查表

> 修改本文件任一方法签名或返回值前，必须逐一核对以下全部调用点：

| 本仓封装方法 | 上游调用模块与函数 | 所属业务流 / 接口 | 调用点锚点（路径:行号） |
|---|---|---|---|
| `probe_provider_row` | `api/routers/providers.py` 的 `test` | `POST /api/providers/{id}/test` | `src/octop/api/routers/providers.py:311`、`:320`、`:344`、`:480` |
| `fetch_openai_compatible_models` | 安装向导 provider 测试 | `POST /api/setup/test-provider` | `src/octop/api/routers/setup.py:402-409` |
| Provider 探测（Embedded CLI） | `cli/support/embedded_ops.py` | `octop provider test` | `src/octop/cli/support/embedded_ops.py:76` |
| `probe_local_model` | ONNX / 知识库能力路由 | `GET /api/onnx-models/*`、`knowledge capability` | `src/octop/api/routers/onnx_models.py:174`、`src/octop/api/routers/knowledge_bases.py:489` |

## 3. 封装方法总清单

| 序号 | 封装函数签名 | 下游目标 `METHOD Path` | 读写类型 | 幂等 / 重试 / 单批上限 | 定义锚点 |
|---|---|---|---|---|---|
| 1 | `_probe_embeddings(base, model, api_key, extra_json)` | `POST {base}/embeddings` | 读（探测） | 单次，无自动重试 | `src/octop/infra/agents/providers/probe.py:174-206` |
| 2 | `fetch_openai_compatible_models(...)` | `GET {base}/models` | 读 | 超时 `30.0s` | `src/octop/infra/agents/providers/probe.py:262-310` |
| 3 | chat ping | `build_chat_model(...).ainvoke` | 读（黑盒） | `asyncio.wait_for(..., 30.0)` | `src/octop/infra/agents/providers/probe.py:238-244` |
| 4 | `probe_local_model(...)` | 本地 ONNX（无网络） | 读 | 返回 `{ok, latency_ms, dim}` | `src/octop/infra/agents/providers/onnx_service.py:407-436` |

## 4. 逐方法请求字典与响应解包契约（Full Dict Schemas）

### 4.1 Embeddings 探测 → `POST {base}/embeddings`（`src/octop/infra/agents/providers/probe.py:174-206`）

#### A. 发往下游的组装字典表（Outbound Payload Dict）

```json
{"model": "<model_id>", "input": ["ping"]}
```

| 下游字典键路径 | 类型 | 必填条件 | 默认值 / 固定值 | 值来源与转换逻辑 | 组装行号 |
|---|---|---|---|---|---|
| `model` | `str` | 必填 | — | Provider 行内的 `model_id` | `src/octop/infra/agents/providers/probe.py:174` |
| `input` | `list[str]` | 必填 | `["ping"]` | 固定字面量单元素探针 | `src/octop/infra/agents/providers/probe.py:174` |
| `Authorization`（header） | `str` | `api_key` 非空 | `Bearer <api_key>` | 与 `extra_json.headers` 合并 | `src/octop/infra/agents/providers/probe.py:165-168` |
| `extra_json.headers`（header） | `dict` | 可选透传 | `{}` | 用户自定义头按键覆盖 | `src/octop/infra/agents/providers/probe.py:23-34` |

#### B. 下游返回字典与解包规则表

| 下游返回键路径 | 类型 | 本仓提取、判空兜底与转换规则 | 解包行号 |
|---|---|---|---|
| `payload["data"]` | `list[dict]` | 必须存在且首元素含 `embedding` | `src/octop/infra/agents/providers/probe.py:197` |
| `payload["data"][0]["embedding"]` | `list[float]` | 必须非空，否则判「非 OpenAI 兼容」 | `src/octop/infra/agents/providers/probe.py:203-206` |
| 上层结果 | `dict` | `{"ok": True, "latency_ms": float}` | `src/octop/infra/agents/providers/probe.py:206` |

#### C. 下游错误码拦截与翻译

| 下游错误码 / 条件 | 下游语义 | 本仓转换后的错误 | 代码行号 |
|---|---|---|---|
| `status_code >= 400` | HTTP 失败 | `"HTTP {code} POST {url}"` + body 截断 ≤300 字符 | `src/octop/infra/agents/providers/probe.py:180-187` |
| `response` 非 JSON | 非法响应 | `"response is not valid JSON…"` | `src/octop/infra/agents/providers/probe.py:194` |
| `data` 结构不符 | 非 OpenAI 兼容 | `"response is not OpenAI-compatible (expected {data: [{embedding, …}]})"` | `src/octop/infra/agents/providers/probe.py:203` |

### 4.2 模型列表 → `GET {base}/models`（`src/octop/infra/agents/providers/probe.py:262-310`）

| 下游返回键路径 | 类型 | 解包规则 | 行号 |
|---|---|---|---|
| `payload["data"]` | `list[dict]` | 逐项取 `item["id"]` | `src/octop/infra/agents/providers/probe.py:289` |
| `item["id"]` | `str` | 归一为 `{"id": ..., "name": ...}` | `src/octop/infra/agents/providers/probe.py:310` |

### 4.3 Chat ping（`src/octop/infra/agents/providers/probe.py:238-244`）

| 项 | 精确值 | 锚点 |
|---|---|---|
| 调用 | `build_chat_model(...).ainvoke(...)`，黑盒 | `src/octop/infra/agents/providers/probe.py:238` |
| 返回解包 | `result.content` | `src/octop/infra/agents/providers/probe.py:244` |
| 超时 | `asyncio.wait_for(..., 30.0)` | `src/octop/infra/agents/providers/probe.py:239` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- **给探测新增入参键**：改 `src/octop/infra/agents/providers/probe.py:174` 字典拼装 → 核对第 2 节全部上游调用点传参 → 更新 [`../topology-and-mapping.md`](../topology-and-mapping.md) 场景 B → 更新 [`../contracts/error-codes.md`](../../contracts/error-codes.md) 探针错误条目 → 运行 `uv run pytest tests/unit/providers -q`。
- **特殊协议陷阱**：`base_url` 必须拼 `/v1` 兼容路径；`api_key` 与 `extra_json.headers` 合并时后者可覆盖 `Authorization`；`use_responses_api=True` 仅 Codex 分支使用（`src/octop/infra/agents/providers/probe.py:58-66`）；本地 ONNX 无网络请求，禁止给它套用 HTTP 超时语义。
- **黑盒纪律**：不得推测 harness-agent 内部 `ChatOpenAI` 的请求字段，详见 [`../../operations/boundary.md`](../../operations/boundary.md)。
- **核验锚点**：`src/octop/infra/agents/providers/store.py:1`（Provider 配置存储）。
