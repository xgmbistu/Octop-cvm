---
kind: downstream-contract
scope: storage-backend
status: draft
origin: generated
source_paths: [src/octop/infra/backend/adapter.py, src/octop/infra/backend/resolver.py, src/octop/infra/backend/probe.py, src/octop/infra/db/repos/backends.py, src/octop/api/routers/storage_backends.py]
symbols: [resolve_backend, build_spec, probe_backend, BackendRepo, build_backend_spec]
upstream: [../index.md, ../topology-and-mapping.md, ../../architecture/data-and-adapter.md]
downstream: []
---

# 下游出向接口契约：`storage-backend`（COS / S3 / Docker / OpenSandbox 工作区后端）

工作区后端决定 Agent 文件落在本地磁盘、COS、S3、Docker 容器还是 OpenSandbox。本仓 `adapter.py` 只把 DB 行映射为 harness spec 字典，`resolver.py` 交给 `harness_agent.backends.resolve_backend(spec)`，`probe.py` 用 `docker.from_env()` 做写读往返探测；**真实对象存储/容器 HTTP 调用在 harness 黑盒内**，本仓不含其服务端实现。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（路径:行号） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/backend/adapter.py` | DB 行 → spec 字典组装层 |
| 底层传输 | harness `resolve_backend(spec)` / `probe_backend(spec)` | `src/octop/infra/backend/resolver.py:23`、`:31`、`src/octop/infra/backend/probe.py:13`、`:92` |
| spec 组装入口 | `build_backend_spec`（各 `to_*_spec` 函数） | `src/octop/infra/backend/adapter.py:52`、`:99`、`:148`、`:152` |
| Docker 探测 | `docker.from_env()` 写读往返 | `src/octop/infra/backend/probe.py:146-189` |
| 成功判定 | `{"ok": True, "message": ..., "message_key": ...}` | `src/octop/infra/backend/probe.py:73-74` |
| 配置持久化 | `storage_backends` 表 + `BackendRepo` | `src/octop/infra/db/repos/backends.py:53` |

## 2. 本仓上游调用方反查表

| 本仓封装方法 | 上游调用模块与函数 | 所属业务流 / 接口 | 调用点锚点（路径:行号） |
|---|---|---|---|
| `resolve_backend` | `infra/agents/manager.py` Agent 启动 | `WF-01` 工作区 IO | `src/octop/infra/backend/resolver.py:23` |
| `probe_backend` | `api/routers/storage_backends.py` probe | `POST /api/admin/storage-backends/probe` | `src/octop/api/routers/storage_backends.py:169` |
| `BackendRepo` | 管理员 CRUD | `/api/admin/storage-backends/*` | `src/octop/infra/db/repos/backends.py:53` |
| 工作区内容 IO | `HarnessAgent.workspace`（`BackendWorkspace`） | 文件读写 | `AGENTS.md:207` |

## 3. 封装方法总清单

| 序号 | 封装函数 | 下游目标 | 读写 | 定义锚点 |
|---|---|---|---|---|
| 1 | COS spec 组装 | harness `resolve_backend(spec)` | 配置 | `src/octop/infra/backend/adapter.py:52-63` |
| 2 | S3 spec 组装 | 同上 | 配置 | `src/octop/infra/backend/adapter.py:99-112` |
| 3 | Docker spec 组装 | 同上 | 配置 | `src/octop/infra/backend/adapter.py:148` |
| 4 | OpenSandbox spec 组装 | 同上 | 配置 | `src/octop/infra/backend/adapter.py:152-166` |
| 5 | `probe_backend` | Docker/远端往返 | 读+写 | `src/octop/infra/backend/probe.py:92`、`:146-189` |

## 4. 逐后端 spec 字典契约（Full Dict Schemas）

### 4.1 COS（`src/octop/infra/backend/adapter.py:52-63`）

```json
{"type": "cos", "bucket": "<bucket>", "region": "<region>", "secret_id": "<id>", "secret_key": "<key>"}
```

| spec 键 | 类型 | 必填 | 条件键 | 来源 | 行号 |
|---|---|---|---|---|---|
| `type` | `str` | 是 | — | 固定 `"cos"` | `src/octop/infra/backend/adapter.py:52` |
| `bucket` / `region` | `str` | 是 | — | `storage_backends` 行 | `src/octop/infra/backend/adapter.py:52` |
| `secret_id` / `secret_key` | `str` | 是 | — | 凭据表（脱敏） | `src/octop/infra/backend/adapter.py:52` |
| `endpoint` / `prefix` | `str` | 否 | 有值才写入 | 可选配置 | `src/octop/infra/backend/adapter.py:63` |

### 4.2 S3（`src/octop/infra/backend/adapter.py:99-112`）

```json
{"type": "s3", "bucket": "<bucket>", "access_key_id": "<id>", "secret_access_key": "<key>"}
```

| spec 键 | 类型 | 条件 | 行号 |
|---|---|---|---|
| `type` / `bucket` | `str` | 固定 `"s3"` / 必填 | `src/octop/infra/backend/adapter.py:99` |
| `access_key_id` / `secret_access_key` | `str` | 必填（凭据） | `src/octop/infra/backend/adapter.py:99` |
| `region` / `endpoint_url` | `str` | 可选条件键 | `src/octop/infra/backend/adapter.py:112` |

### 4.3 Docker / OpenSandbox（`src/octop/infra/backend/adapter.py:148-166`）

```json
{"type": "docker", "image": "<image>"}
{"type": "opensandbox", "image": "<image>", "api_key": "<key>", "domain": "<domain>", "protocol": "<proto>"}
```

| spec 键 | 类型 | 固定值 / 条件 | 行号 |
|---|---|---|---|
| `type` | `str` | `"docker"` / `"opensandbox"` | `src/octop/infra/backend/adapter.py:148`、`:152` |
| `image` | `str` | 镜像名 | `src/octop/infra/backend/adapter.py:148`、`:152` |
| `api_key` / `domain` / `protocol` | `str` | OpenSandbox 必填 | `src/octop/infra/backend/adapter.py:152-166` |
| `timeout` | `int` | 可选条件键 | `src/octop/infra/backend/adapter.py:166` |

### 4.4 探测返回解包（`src/octop/infra/backend/probe.py:73-74`、`:146-189`）

| 返回键 | 类型 | 解包规则 | 行号 |
|---|---|---|---|
| `ok` | `bool` | Docker 写读往返一致为 `True` | `src/octop/infra/backend/probe.py:73` |
| `message` / `message_key` | `str` | 本地化提示键 | `src/octop/infra/backend/probe.py:73-74` |

### 4.5 下游错误码拦截与翻译

| 下游条件 | 本仓转换 | 行号 |
|---|---|---|
| `docker.from_env()` 不可用 | 探测返回 `ok=false` + `STORAGE_BACKEND_DEPS_FAILED(503)` | `src/octop/infra/errors.py:140`、`src/octop/infra/backend/probe.py:146` |
| spec 缺必填凭据 | `adapter.py` 组装阶段抛错，不下发 harness | `src/octop/infra/backend/adapter.py:52`、`:99` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- **新增后端类型**：改 `adapter.py` 的 `to_*_spec` → 核对 `src/octop/infra/backend/resolver.py:23` 与 `BackendRepo`（`src/octop/infra/db/repos/backends.py:53`）持久化字段 → 更新 [`../index.md`](../index.md)、[`../../contracts/configuration.md`](../../contracts/configuration.md) 的 `OSS_*` 组 → 跑 `uv run pytest tests/unit/backend -q`。
- **特殊协议陷阱**：spec 是**本仓保存并交给 harness** 的配置字典，不是直接发出的 HTTP 请求；禁止在 Octop 内分支判断 `backend` 类型或 `virtual_mode`（路径规则归 `BackendWorkspace`，`AGENTS.md:207`）；Docker 沙箱作用域用 `sandbox_scope` + `sandbox_prefix`（默认 `octop_sandbox`）。
- **黑盒纪律**：COS/S3 实际 PUT/GET、容器 exec 在 harness 内部，禁止推测其请求/响应字段（[`../../operations/boundary.md`](../../operations/boundary.md)）；`secret_key` 等凭据不明文回显（[`../../contracts/configuration.md`](../../contracts/configuration.md)）。
