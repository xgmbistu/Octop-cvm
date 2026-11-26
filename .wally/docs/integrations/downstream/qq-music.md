---
kind: downstream-contract
scope: qq-music
status: draft
origin: generated
source_paths: [src/octop/infra/connectors/gateway/adapters/qq_music.py, src/octop/infra/connectors/catalog.py, src/octop/infra/connectors/probe.py]
symbols: [list_tools, call_tool, search_music, probe_credentials, SKILL_VERSION]
upstream: [../index.md, ../topology-and-mapping.md, connector-adapters.md]
downstream: []
---

# 下游出向接口契约：`qq-music`（QQ 音乐检索）

QQ 音乐适配器用 `{"params": {...}, "comm": {"skill_version": "0.0.3"}}` 双层信封发起检索，成功判定依赖 `payload["ret"]`；`ret == 11534343` 或含 `unauthorized` 被翻译为凭据失效。业务封装在 `src/octop/infra/connectors/gateway/adapters/qq_music.py`。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（路径:行号） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/connectors/gateway/adapters/qq_music.py` | 字典组装与返回解包层 |
| 底层传输 | `httpx` POST，`Authorization: Bearer`，超时 `30.0s` | `src/octop/infra/connectors/gateway/adapters/qq_music.py:124` |
| 公共请求信封 | `{"params": <业务参数>, "comm": {"skill_version": SKILL_VERSION}}` | `src/octop/infra/connectors/gateway/adapters/qq_music.py:124` |
| `SKILL_VERSION` | 字面 `"0.0.3"` | `qq_music.py` 常量定义 |
| 下游成功判定 | `payload["ret"]` 存在且不等于 `11534343` | `src/octop/infra/connectors/gateway/adapters/qq_music.py:136-144` |
| 凭据失效判定 | `HTTP 401`、`ret 11534343`、响应含 `unauthorized` | `src/octop/infra/connectors/gateway/adapters/qq_music.py:132-144` |

## 2. 本仓上游调用方反查表

| 本仓封装方法 | 上游调用模块与函数 | 所属业务流 | 调用点锚点（路径:行号） |
|---|---|---|---|
| `call_tool(creds, name, args)` | `connectors/gateway/registry.py` 工具分派 | Agent 工具调用 | `src/octop/infra/connectors/gateway/adapters/qq_music.py:34` |
| `probe_credentials(creds)` | `connectors/probe.py` | 连接器实例创建 | `src/octop/infra/connectors/probe.py:422` |
| `list_tools()` | `builder.py` 工具装配 | 对话轮次 MCP 注入 | `src/octop/infra/connectors/builder.py:574` |

## 3. 封装方法总清单

| 序号 | 封装函数 | 下游目标 | 读写 | 超时 | 定义锚点 |
|---|---|---|---|---|---|
| 1 | 音乐检索 `search_music` | `POST {qq_music_endpoint}` | 读 | `30.0s` | `src/octop/infra/connectors/gateway/adapters/qq_music.py:124-144` |
| 2 | `probe_credentials` | 同上（轻量探测） | 读 | `30.0s` | `src/octop/infra/connectors/gateway/adapters/qq_music.py:38` |

## 4. 逐方法请求字典与响应解包契约（Full Dict Schemas）

### 4.1 音乐检索 → `POST {endpoint}`（`src/octop/infra/connectors/gateway/adapters/qq_music.py:124-144`）

#### A. 发往下游的组装字典表

```json
{"params": {"<业务检索键>": "<value>"}, "comm": {"skill_version": "0.0.3"}}
```

| 下游字典键路径 | 类型 | 必填 | 默认值 / 固定值 | 值来源与转换逻辑 | 组装行号 |
|---|---|---|---|---|---|
| `params` | `dict` | 是 | — | 由 `args` 透传的业务检索参数（歌曲/歌手/关键字） | `src/octop/infra/connectors/gateway/adapters/qq_music.py:124` |
| `comm.skill_version` | `str` | 是 | `"0.0.3"`（`SKILL_VERSION`） | 协议版本常量 | `src/octop/infra/connectors/gateway/adapters/qq_music.py:124` |
| `Authorization`（header） | `str` | 是 | `Bearer <api_key>` | 连接器凭据 | `src/octop/infra/connectors/gateway/adapters/qq_music.py:124` |

#### B. 下游返回字典与解包规则表

| 下游返回键路径 | 类型 | 本仓提取、判空兜底与转换规则 | 解包行号 |
|---|---|---|---|
| `payload["ret"]` | `int` | 非 `11534343` 且无 `unauthorized` 时成功 | `src/octop/infra/connectors/gateway/adapters/qq_music.py:136` |
| `payload["msg"]` | `str` | 错误时拼入 `ValueError(f"QQ 音乐接口错误 [{ret}]: {msg}")` | `src/octop/infra/connectors/gateway/adapters/qq_music.py:144` |
| 成功正文 | `dict` | 序列化为工具结果文本 | `src/octop/infra/connectors/gateway/adapters/qq_music.py:136-144` |

#### C. 下游错误码拦截与翻译

| 下游错误码 / 条件 | 本仓转换 | 代码行号 |
|---|---|---|
| `HTTP 401` | 凭据无效（提示检查 Token） | `src/octop/infra/connectors/gateway/adapters/qq_music.py:132-133` |
| `ret == 11534343` 或含 `unauthorized` | 凭据无效 | `src/octop/infra/connectors/gateway/adapters/qq_music.py:136-144` |
| 其他非成功 `ret` | `ValueError(f"QQ 音乐接口错误 [{ret}]: {msg}")` | `src/octop/infra/connectors/gateway/adapters/qq_music.py:144` |
| 通用 `401/403` | `error_type:"auth"` | `src/octop/infra/connectors/probe.py:129-153` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- **新增检索键**：改 `src/octop/infra/connectors/gateway/adapters/qq_music.py:124` 的 `params` 组装 → 核对 `call_tool`（`:34`）的 `args` 白名单 → 更新 [`../index.md`](../index.md) 与 [`../topology-and-mapping.md`](../topology-and-mapping.md) → 跑 `uv run pytest tests/unit/connectors -q`。
- **特殊协议陷阱**：请求为 `params`/`comm` 双层信封，`skill_version` 必须与协议发布值字面一致；`ret 11534343` 是授权专用码，不要当普通业务错误；`Authorization` 用 Bearer 而非自定义头。
- **凭据纪律**：`api_key` 走连接器凭据表，不明文回显（[`../../contracts/configuration.md`](../../contracts/configuration.md)）。
- **核验锚点**：`src/octop/infra/connectors/catalog.py:1`（连接器目录注册表）。
