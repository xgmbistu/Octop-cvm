---
kind: downstream-contract
scope: storage-backends
status: draft
origin: generated
source_paths: [src/octop/infra/backend/adapter.py, src/octop/infra/backend/docker_spec.py, src/octop/infra/backend/probe.py, src/octop/infra/backend/resolver.py, src/octop/infra/backend/browse.py, src/octop/infra/backend/opensandbox_deps.py]
symbols: [row_to_backend_spec, enrich_docker_backend_spec, probe_backend, resolve_backend, browse_backend]
upstream: [integrations/index.md, architecture/core-engine.md]
downstream: [contracts/configuration.md, operations/boundary.md]
---

# 下游出向接口契约：`存储后端 / Workspace Adapter`

`storage_backends` 表行经 `row_to_backend_spec` 转换为 harness 的 `BackendProtocol` spec 字典；真正的 S3/COS boto3 调用、Docker 沙箱与 OpenSandbox 会话均在外部包 `harness-agent` 内，本仓只产出 spec 并做探测/浏览封装。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（`路径:行号`） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/backend/adapter.py`（DB→spec 字典）、`docker_spec.py`（默认值）、`probe.py`/`browse.py`（调用封装） | `adapter.py:44-168`、`probe.py:73-235` |
| 底层传输底座 | 外部 `harness_agent.backends.resolve_backend` / `probe_backend`；Docker 用 `docker.from_env()`；boto3 仅在 `pyproject.toml:35` 声明依赖 | `src/octop/infra/backend/probe.py:73-235`、`pyproject.toml:35` |
| 端点与凭据配置来源 | `storage_backends` 行：`bucket/region/endpoint/access_key/secret_key/config` | `adapter.py:44-168` |
| 成功判定条件 | Docker 用 `docker.version` + 写入/读回 `_PROBE_CONTENT` 比对；其它 kind 直接交外部 `probe_backend` | `probe.py:73-235` |
| 路径穿越防护 | 内容文件一律经 `BackendWorkspace`；HTTP 适配层 `workspace_api_path()` 规整前导 `/` | `src/octop/api/common/workspace.py` |

## 2. 本仓上游调用方反查表

| 封装方法 | 上游调用方 | 调用点锚点（`路径:行号`） |
|---|---|---|
| `row_to_backend_spec` | `AgentManager._build_harness_config` | `src/octop/infra/agents/manager.py:2649-2678` |
| `probe_backend` | `POST /api/admin/storage-backends/probe`、`/test` | `src/octop/api/routers/storage_backends.py:169`、`:215` |
| `browse_backend` | `GET /api/admin/storage-backends/{id}/tree` | `src/octop/api/routers/storage_backends.py:196` |
| `resolve_backend` | named/composite 后端解析 | `src/octop/infra/backend/resolver.py:79-122` |
| `ensure_opensandbox_deps` | OpenSandbox 探测前依赖门禁 | `src/octop/infra/backend/opensandbox_deps.py:16` |

## 3. spec 字典完整清单（本仓贡献的全部请求字典）

| kind | spec Key（值来源） | 定义锚点 |
|---|---|---|
| `cos` | `type,bucket,region,secret_id←access_key,secret_key,endpoint?,prefix←cfg` | `adapter.py:49-63` |
| `oss` / `obs` | `type,bucket,endpoint,access_key_id,access_key_secret\|secret_access_key,prefix` + cfg 透传 | `adapter.py:65-93` |
| `s3` / `custom` / 其它 | `type:"s3",bucket,access_key_id,secret_access_key,region?,endpoint_url`（endpoint 补 `https://`） | `adapter.py:95-112` |
| `filesystem` / `local_shell` | `type,root_dir←cfg.root_dir\|path\|bucket,virtual_mode:True` | `adapter.py:114-122` |
| `postgres` | `connection_string`，或由 `access_key/secret_key/bucket/endpoint/region` 拼 `postgresql://u:p@h/db` + schema | `adapter.py:124-140` |
| `docker` | `type,image←cfg.image\|bucket` + `_DOCKER_PASSTHROUGH_KEYS`（`allow_network/memory/cpus/sandbox_scope/sandbox_prefix/volumes/environment`…） | `adapter.py:142-150`、`docker_spec.py:10-36` |
| `opensandbox` | `type,image,api_key←secret_key,domain←endpoint,protocol(http\|https),timeout/command_timeout/use_server_proxy` | `adapter.py:152-166` |
| `named` | 解析时按 name 查 `storage_backends` 行再递归生成 spec | `resolver.py:79-122` |

Docker 默认值注入 `enrich_docker_backend_spec`：`sandbox_prefix=octop_sandbox`、`sandbox_scope=agent`，agent 补 `agent_id`、user 补 `username`（`docker_spec.py:55-78`）。

## 4. 探测、浏览与返回解包

| 函数 | 调用链 | 返回解包 | 错误翻译 | 源码锚点 |
|---|---|---|---|---|
| `probe_backend` | docker: `docker.from_env().ping()` → `ensure_docker_image(image)` → `resolve_backend(spec).write/read` 比对 `_PROBE_CONTENT`；opensandbox: 先 `ensure_opensandbox_deps(allow_install=True)` | `{ok, message, message_key}` | 失败信息用 i18n key，不回显凭据 | `probe.py:73-235`、`opensandbox_deps.py:16` |
| `browse_backend` | `resolve_backend(spec, workspace_dir=tempdir)` → `backend.als(path)` | `{path,is_dir,size,modified_at}` | 异常由 router 映射为 `STORAGE_BACKEND_*` 错误码 | `browse.py:38-66` |
| `resolve_backend` | 按 `type` 分派到外部 harness；named/composite 走 DB | `BackendProtocol` 实例 | 未知 type→`ValueError` | `resolver.py:79-122` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- 新增 backend kind：`adapter.py:44-168` 增加 spec 分支 → `resolver.py:79-122` 支持解析 → `probe.py:73-235` 补探测 → `api/routers/storage_backends.py` CRUD/probe/test → `tests/unit/backend/`。
- 改 Docker 默认沙箱参数：同步 `docker_spec.py:10-36` 透传白名单与 `docs/agent-backend-file-io.md` 的约定，否则 agent 启动后挂载/网络行为与文档不符。
- **特殊陷阱**：本仓无 boto3 调用代码，S3/COS 的真实请求 Key 在外部 `harness-agent` 内；不要在本仓臆造 `Bucket/Key/Body` 字典。凭据在 `secrets` 表加密，禁止写入 `.wally/docs/` 或日志（见 [边界声明](../../operations/boundary.md)）。

## 导航与共变索引

存储后端端点见 [设备与媒体分组契约](../../contracts/api/devices-and-media.md)，本地持久化底座见 [数据适配器](../../architecture/data-and-adapter.md)，表结构见 [领域模型](../../business/domain-models/index.md)。
