---
kind: downstream-contract
scope: baidu-map
status: draft
origin: generated
source_paths: [src/octop/infra/connectors/gateway/adapters/baidu_map.py, src/octop/infra/connectors/catalog.py, src/octop/infra/connectors/probe.py]
symbols: [list_tools, call_tool, _get, place_search, direction, weather, probe_credentials]
upstream: [../index.md, ../topology-and-mapping.md, connector-adapters.md]
downstream: []
---

# 下游出向接口契约：`baidu-map`（百度地图地点/路线/天气）

百度地图适配器以 `GET /{place|direction|weather}` 三个端点提供地点检索、路线规划与天气查询，成功判定为 `status ∈ {0}` 或 `message == "ok"` 或存在 `result`/`results`；`status 102` 与 `token失效` 被识别为凭据失效。业务封装在 `src/octop/infra/connectors/gateway/adapters/baidu_map.py`。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（路径:行号） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/connectors/gateway/adapters/baidu_map.py` | 参数字典组装与返回解包层 |
| 底层传输 | `httpx` GET，超时 `30.0s` | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:71`、`:76`、`:81` |
| 三个端点 | `/place`、`/direction`、`/weather` | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:71`、`:76`、`:81` |
| 公共成功判定 | `status ∈ {0}` / `message=="ok"` / `result` 或 `results` 非空 | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:107-113` |
| 凭据失效判定 | `status == 102` 或 `message` 含 `token失效` | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:107-113` |
| 错误翻译 | `ValueError(f"百度地图接口错误 [{status}]: {message or status}")` | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:113` |

## 2. 本仓上游调用方反查表

| 本仓封装方法 | 上游调用模块与函数 | 所属业务流 | 调用点锚点（路径:行号） |
|---|---|---|---|
| `place_search` / `direction` / `weather` | `call_tool` 分派 | Agent 工具调用 | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:34` |
| `probe_credentials(creds)` | `connectors/probe.py` | 连接器实例创建 | `src/octop/infra/connectors/probe.py:422` |
| `list_tools()` | `builder.py` 工具装配 | 对话轮次 MCP 注入 | `src/octop/infra/connectors/builder.py:574` |

## 3. 封装方法总清单

| 序号 | 封装函数 | 下游 `Path` | 读写 | 超时 | 定义锚点 |
|---|---|---|---|---|---|
| 1 | 地点检索 | `GET /place` | 读 | `30.0s` | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:71` |
| 2 | 路线规划 | `GET /direction` | 读 | `30.0s` | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:76` |
| 3 | 天气查询 | `GET /weather` | 读 | `30.0s` | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:81` |
| 4 | `probe_credentials` | 同上（轻量探测） | 读 | `30.0s` | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:38` |

## 4. 逐方法请求字典与响应解包契约（Full Dict Schemas）

### 4.1 三个 GET 端点的查询参数字典（完整展开）

| 端点 | 查询参数 Key | 类型 | 必填 | 默认值 / 来源 | 行号 |
|---|---|---|---|---|---|
| `/place` | `user_raw_request` | `str` | 是 | 用户自然语言 query | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:71` |
| `/place` | `region` | `str` | 是 | 地域（入参） | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:71` |
| `/direction` | `user_raw_request` | `str` | 是 | 起终点自然语言 query | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:76` |
| `/weather` | `region` | `str` | 是 | 地域（入参） | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:81` |
| 公共（header） | `Authorization` / API Key 头 | `str` | 是 | 连接器凭据 | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:71-81` |

#### B. 下游返回字典与解包规则表

| 下游返回键路径 | 类型 | 本仓提取、判空兜底与转换规则 | 解包行号 |
|---|---|---|---|
| `payload["status"]` | `int` | `0` 成功；`102` 或 `token失效` → 凭据无效 | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:107` |
| `payload["message"]` | `str` | `"ok"` 视为成功；错误时拼入 `ValueError` | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:107-113` |
| `payload["result"]` / `payload["results"]` | `dict/list` | 任一存在即视为成功，序列化为工具结果 | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:107-113` |

#### C. 下游错误码拦截与翻译

| 下游错误码 / 条件 | 本仓转换 | 代码行号 |
|---|---|---|
| `status == 102` 或 `message` 含 `token失效` | 标记凭据失效（提示检查 AK） | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:107-113` |
| 其他非成功 `status` | `ValueError(f"百度地图接口错误 [{status}]: {message or status}")` | `src/octop/infra/connectors/gateway/adapters/baidu_map.py:113` |
| 通用 `HTTP 401/403` | `error_type:"auth"` | `src/octop/infra/connectors/probe.py:129-153` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- **新增端点/参数**：改 `src/octop/infra/connectors/gateway/adapters/baidu_map.py:71-81` 的 `_get` 调用参数 → 核对 `call_tool`（`:34`）入参映射 → 更新 [`../index.md`](../index.md) 与 [`../topology-and-mapping.md`](../topology-and-mapping.md) → 跑 `uv run pytest tests/unit/connectors -q`。
- **特殊协议陷阱**：成功判定是「`status==0` 或 `message=="ok"` 或 `result/results` 存在」的**或**逻辑，不能只判 `status`；`status` 为 `102` 是 Token 失效专用码；三个端点参数名不统一（`/direction` 与 `/weather` 不带 `region` 或反之），改动时逐端点核对。
- **凭据纪律**：AK 走连接器凭据表，禁止拼进日志（[`../../contracts/configuration.md`](../../contracts/configuration.md)）。
- **核验锚点**：`src/octop/infra/connectors/catalog.py:1`（连接器目录注册表）。
