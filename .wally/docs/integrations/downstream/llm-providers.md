---
kind: downstream-contract
scope: llm-providers
status: draft
origin: generated
source_paths: [src/octop/infra/agents/providers/store.py, src/octop/infra/agents/providers/harness_factory.py, src/octop/infra/agents/providers/resolved.py, src/octop/infra/agents/providers/probe.py, src/octop/infra/agents/providers/reasoning.py, src/octop/infra/agents/manager.py]
symbols: [build_harness_configs, _model_config_from_row, iter_usable_rows, sync_providers_to_harness, list_resolved_models, probe_provider_row, reasoning_request_parameters, _build_harness_config]
upstream: [integrations/index.md, integrations/topology-and-mapping.md]
downstream: [business/chat-turn.md, architecture/core-engine.md]
---

# 下游出向接口契约：`LLM Provider / Harness Runtime`

本仓不直接实现模型推理：`providers` 表行经业务封装层转成 harness 的 `ProviderConfig` / `ModelConfig` 字典，再由外部包 `orcakit-harness-agent` 执行；本页展开该「配置字典」的全部键、来源与返回解包。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（`路径:行号`） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/agents/providers/store.py`（DB→harness 配置转换）、`harness_factory.py`（同步到运行时）、`reasoning.py`（推理参数字典） | `src/octop/infra/agents/providers/store.py:130-161` |
| 底层传输底座 | 外部黑盒 `harness_agent.providers` / `build_chat_model`；本仓无推理服务端实现 | `src/octop/infra/agents/providers/probe.py:41-76` |
| 端点与凭据配置来源 | `providers.base_url` / `providers.api_key` / `providers.extra_json.headers` / `models_json`，`-` 前缀协议映射见 `KIND_TO_PROTOCOL` | `src/octop/infra/agents/providers/store.py:18-24`、`:142-149` |
| 公共请求信封格式 | `ProviderConfig(id=row.name, base_url, api_key, protocol, name, headers)` 与 `ModelConfig.from_dict(data)` | `src/octop/infra/agents/providers/store.py:130-161`、`:163-172` |
| 成功判定条件 | `iter_usable_rows` 仅保留 `enabled` 且 `base_url && api_key` 且 `get_models()` 非空且存在 chat 可用模型 | `src/octop/infra/agents/providers/store.py:110` |
| 运行时装配入口 | `AgentManager.boot()` → `build_harness_configs()` → `HarnessAgentManager(providers=…)`；无可用模型时 `_start_agent` 置 `failed` + `NO_MODELS_CONFIGURED` | `src/octop/infra/agents/manager.py:417-426`、`:2017-2019` |

## 2. 本仓上游调用方反查表

| 本仓封装方法 | 上游调用模块与函数 | 所属业务流 / 接口 | 调用点锚点（`路径:行号`） |
|---|---|---|---|
| `build_harness_configs` | `AgentManager.boot` | 进程启动装配 | `src/octop/infra/agents/manager.py:419` |
| `sync_providers_to_harness` | `AgentManager.on_provider_changed` | Provider CRUD 热更新（并发度 6） | `src/octop/infra/agents/manager.py:1097-1119` |
| `probe_provider_row` | `POST /api/admin/providers`、`POST /api/providers/test-draft` | [admin 接口](../../contracts/api-reference.md) | `src/octop/api/routers/providers.py:298`、`:465` |
| `list_resolved_models` | `GET /api/providers/resolved` | 模型下拉框 | `src/octop/api/routers/providers.py:147` |
| `reasoning_request_parameters` | `processor._resolve_reasoning_overrides` | [chat-turn 业务流](../../business/chat-turn.md) | `src/octop/infra/gateway/process/processor.py:474` |
| `_build_harness_config` | `_start_agent` → `acreate_agent` | Agent 启动 | `src/octop/infra/agents/manager.py:2022`、`manager.py:2418` |

## 3. 封装方法总清单

| 序号 | 封装函数签名 | 下游目标 / 命令 | 读写 | 幂等 / 重试 / 单批上限 | 定义锚点（`路径:行号`） |
|---|---|---|---|---|---|
| 1 | `build_harness_configs() -> tuple[list[ProviderConfig], dict]` | harness `ProviderConfig` | 读 | 纯转换，无网络 | `src/octop/infra/agents/providers/store.py:130-161` |
| 2 | `_model_config_from_row(raw: dict) -> ModelConfig` | harness `ModelConfig` | 读 | 注入 `input` 模态后原样下沉 | `src/octop/infra/agents/providers/store.py:163-172` |
| 3 | `sync_providers_to_harness(factory, rows)` | `HarnessAgentManager` 运行时字典 | 写 | 差集 remove + 全量 add，并发 6 | `src/octop/infra/agents/providers/harness_factory.py:16-44`、`src/octop/infra/agents/manager.py:81` |
| 4 | `list_resolved_models(...) -> list[dict]` | API 响应 DTO | 读 | 过滤 `not enabled or not api_key` | `src/octop/infra/agents/providers/resolved.py:11-49` |
| 5 | `probe_provider_row(row) -> {"ok","latency_ms"}` | `POST {base}/embeddings` 或 `chat.ainvoke("ping")` | 写（探测） | timeout 30s | `src/octop/infra/agents/providers/probe.py:209-245` |
| 6 | `fetch_openai_compatible_models(base, key)` | `GET {base}/models` | 读 | 去重排序 | `src/octop/infra/agents/providers/probe.py:253-310` |
| 7 | `reasoning_capability(...) -> dict` / `reasoning_request_parameters(...)` | `configurable["octop_reasoning_overrides"]` | 读 | 8 种 adapter 归一化 | `src/octop/infra/agents/providers/reasoning.py:61-141`、`:160-227` |
| 8 | `_build_harness_config(...) -> HarnessAgentConfig` | harness agent 构造字典 | 读 | 按 `fields(HarnessAgentConfig)` 裁剪未知键 | `src/octop/infra/agents/manager.py:2418-2693`、`:89` |

## 4. 逐方法请求字典与响应解包契约

### 4.1 `build_harness_configs` → `ProviderConfig`（`store.py:130-161`）

| 下游字典键路径 | 类型 | 必填条件 | 默认值 / 固定值 | 值来源与转换逻辑 | 组装行号 |
|---|---|---|---|---|---|
| `id` | `str` | 必填 | — | `row.name`（provider 名即运行时 ID） | `store.py:130-161` |
| `base_url` | `str` | 必填 | — | `row.base_url` | `store.py:130-161` |
| `api_key` | `str` | 必填 | — | `row.api_key`（不明文回显） | `store.py:130-161` |
| `protocol` | `str` | 必填 | 由 `KIND_TO_PROTOCOL` 推导 | `openai/anthropic/ollama/azure/gemini → "openai"` | `store.py:18-24` |
| `name` | `str` | 必填 | — | `row.name` | `store.py:130-161` |
| `headers` | `dict[str,str]` | `if extra_json.headers` | `{}` | `json.loads(row.extra_json)["headers"]`，逐项 `str()` | `store.py:142-149` |
| `models` | `list[ModelConfig]` | 必填 | — | `_model_config_from_row` 逐行产出 | `store.py:163-172` |

`ModelConfig.from_dict(data)` 的 `data` 以 DB `models_json` 条目为底，固定注入 `data["input"] = _infer_model_input_modalities(model_id, explicit)`（`store.py:163-172`）；模态启发式匹配 `-vl|vision|-image|gpt-4o|gpt-4.1|claude-3|gemini`→image、`audio|whisper`→audio（`store.py:27-47`）。其余下沉键：`id/name/enabled/context_window/max_input_tokens/max_output_tokens/max_tokens/reasoning/reasoning_config/embedding/task`。

### 4.2 `_probe_embedding_endpoint` → `{model, input}`（`probe.py:159-206`）

```json
{"model": "<model_id>", "input": ["ping"]}
```

| 下游字典键路径 | 类型 | 必填条件 | 值来源 | 组装行号 |
|---|---|---|---|---|
| `model` | `str` | 必填 | `model_id` | `src/octop/infra/agents/providers/probe.py:159-206` |
| `input` | `list[str]` | 必填 | 固定探针 `["ping"]` | `src/octop/infra/agents/providers/probe.py:159-206` |

返回解包：`data[0].embedding`；无 `data`→`no data`，条数不符→`count mismatch`（`probe.py:159-206`）。`fetch_openai_compatible_models` 解包 `{data:[{id,…}]}` 为 `{"ok":true,"models":[{"id":mid,"name":mid}]}`（`probe.py:253-310`）。`probe_provider_row` 三分支（ONNX 本地 / embedding / chat），统一返回 `{"ok":bool,"latency_ms":int}`，错误串经 `_friendly_probe_error` → `stream_error_message` 本地化（`probe.py:209-245`）。

### 4.3 `reasoning_request_parameters` → `{"model_fields","extra_body"}`（`reasoning.py:160-227`）

| adapter（来自 `reasoning_capability`） | `model_fields` 键 | `extra_body` 键 | 关闭时取值 | 源码行号 |
|---|---|---|---|---|
| `openai_reasoning_effort` | `reasoning_effort` | — | `"none"` | `reasoning.py:160-227` |
| `anthropic_adaptive` | `thinking={"type":"adaptive"}` | — | — | `reasoning.py:160-227` |
| `anthropic_budget` | `thinking={"type":"enabled","budget_tokens":int}` | — | — | `reasoning.py:160-227` |
| `dashscope` | `enable_thinking` / `thinking_budget` / `reasoning_effort` | — | `false` | `reasoning.py:160-227` |
| `openrouter` | — | `reasoning={enabled,effort}` | `enabled=false` | `reasoning.py:160-227` |
| `thinking` / `thinking_nested_effort` | `thinking={"type":…}` + `reasoning_effort` | — | — | `reasoning.py:160-227` |

`status_only` 强制 `toggle=False, mode=enabled, efforts=[]`（`reasoning.py:128-132`）；合法集合 `REASONING_MODES={auto,enabled,disabled}`、`REASONING_ADAPTERS` 8 种、`EFFORT_TYPES={enum,token_budget}`（`reasoning.py:7-32`）。历史 `_legacy_adapter()` 按 base_url 主机名映射（`openrouter.ai/dashscope/deepseek.com/bigmodel.cn/moonshot/openai.com`，默认 `thinking`），属于兼容分支而非主入口（`reasoning.py:41`）。

### 4.4 `_build_harness_config` → `HarnessAgentConfig`（`manager.py:2418-2693`）

| 字典键 | 值来源 / 条件 | 组装行号 |
|---|---|---|
| `name` | `_memory_namespace`（`agent_<public_id>`） | `manager.py:2649-2678`、`manager.py:85` |
| `workspace_dir` | 有 `workspace_dir` 走 `harness_workspace_path`，否则 legacy 回填 | `manager.py:2429-2440` |
| `system_files_path` | `{workspace}/.octop`（新 agent）或 `.octop-auth`（legacy） | `manager.py:2649-2678` |
| `default_model` | 显式默认或 `resolve_fallback_model_ref()` | `manager.py:2649-2678` |
| `system_prompt` / `memory` | `bootstrap_marker_exists(ws)` 为假时强制 `None` / `()` | `manager.py:2581-2583` |
| `backend` / `mcp_server_configs` | `row.config_json` + 连接器 MCP 组装；共享 agent（`user_id=NULL`）警告并留空 MCP | `manager.py:2586-2601` |
| `tools` / `middleware` | 工具求交 + 6 个中间件：`ReasoningRequestMiddleware`、`KnowledgeSearchHintMiddleware`、`BrowserProfileMiddleware`、`BinaryReadGuardMiddleware`、`WorkspaceImageMaterializeMiddleware`、`ThreadArtifactsMiddleware` | `manager.py:2485-2503`、`manager.py:2545-2556` |
| `acp_runners` / `acp_delegate_enabled` | `ACPConfig.from_dict({"runners": runners_dict})` | `manager.py:2567-2577` |
| `default_timezone` / `log_dir` | `OctopConfig.default_timezone` / 日志目录 | `manager.py:2649-2678` |
| `skills_disabled` / `skills_dir` / `tools_disabled` | 插件开关求交后按字段存在性写入 | `manager.py:2485-2503`、`manager.py:2679-2688` |
| `tool_guard_rules_dir` | `SecurityPolicy.merge(global, agent_override)` 后 `policy.apply_to_config` | `manager.py:2528-2530`、`manager.py:2689-2693` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- 新增 provider 字段：`providers` 迁移 DDL（`src/octop/infra/db/migrations/`）→ `_model_config_from_row` 下沉（`store.py:163-172`）→ `list_resolved_models` 出参（`resolved.py:11-49`）→ API 响应模型（`src/octop/api/routers/providers.py`）→ 单测 `tests/unit/providers/`。
- 新增推理 adapter：`reasoning.py:7-32` 枚举 → `_reasoning_profile` 预设（`presets.py:8-211`）→ `reasoning_capability` 归一化 → `reasoning_request_parameters` 字典 → 前端展示 `'thinking'` 文案，并跑 `uv run pytest tests/unit/providers -q`。
- **特殊陷阱**：`HarnessAgentConfig` 按已安装 harness 版本的 `fields()` 裁剪键（`manager.py:89`），新增键若不在该集合会被静默丢弃；bootstrap 未完成时禁止同步 `_init_graph()`，只能在 stream/call/resume 边界刷新（`manager.py:2096-2102`），否则中段重建图会 segfault。
