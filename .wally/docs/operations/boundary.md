---
kind: operations
scope: boundary
status: draft
origin: generated
source_paths: [pyproject.toml, src/octop/infra/agents/manager.py, src/octop/infra/connectors/gateway/protocol.py, src/octop/infra/backend/probe.py, tests/support/fakes.py, .wally/config.json]
symbols: [HarnessAgentManager, resolve_backend, FakeHarnessAgent, patch_harness]
upstream: [INDEX.md]
downstream: []
---

# 认知边界与外部黑盒声明（Agent Anti-Hallucination Boundary）

本页界定 `.wally/docs/` 已核验的源码快照、仓库外不可见的实现、静态分析局限与生成物可信度，防止把弱命中或仓外猜测当事实。

## 1. 核验基准快照与生成物状态

- **Git 分支**：`chore/wally-init-20261125-c103` @ `1f99bda2d7fea2f00c4e1b247a4036131445f780`
- **生成模式与范围**：`FULL`（无有效 `.wiki-meta.json` 基线）；已扫描 `src/octop/**`（api/cli/infra/i18n/config）、`dashboard/`、`tests/`、`docker/`、`fnos/`、`scripts/`、`docs/`、`.github/`、`plugins/`、`.wally/docs/`。
- **生成物可信度**：除显式 `origin: human` / `status: verified` 页外，所有页面为 `status: draft`、`origin: generated`；Agent 改动核心逻辑前必须按页内 `path:行号` 回读源码字面核验。
- **人工页保护**：本次无被保护页面；若未来出现 `origin: human|status: verified`，全量/增量均不覆盖，仅记录 `driftWarnings`。

## 2. 仓库外黑盒系统清单

| 外部黑盒目标 | 本仓边界文件（`路径:行号`） | 本仓已核实的契约范围 | 不可见的远端范围 |
|---|---|---|---|
| `orcakit-harness-agent`（LangGraph 运行时） | `pyproject.toml:24`；`src/octop/infra/agents/manager.py:420-426,2649-2678` | `ProviderConfig`/`ModelConfig`/`HarnessAgentConfig` 字典键、插件 `setup(ctx)` 约定 | Harness 图执行、checkpoint 存储、memory DDL、插件分派内部实现 |
| `harness-gateway`（IM channel 管线） | `pyproject.toml:26`；`gateway/process/processor.py:517` | 入站消息归一、session_key、ChannelManager 接口 | 各平台真实消息收发与限流 |
| `harness-memory` | `pyproject.toml:25` | memory 工具入口与 episode 候选（`infra/proactive/service.py:143-150`） | 抽取算法与表结构 |
| S3 / COS / OSS / Docker / OpenSandbox | `backend/adapter.py:44-168`、`backend/probe.py:73-235` | spec 字典键、探测结果 `{ok,message,message_key}`、browse 返回字段 | boto3/远端真实请求字典、沙箱内部行为 |
| 外部 LLM / Embedding / OCR 服务 | `providers/probe.py:159-245`、`knowledge/embed.py:16-65` | `{"model","input"}` 请求字典、`data[].embedding` 解包、30s 超时 | 模型内部、真实配额、线上限流 |
| 13 类连接器下游（腾讯新闻/飞猪/元典/IMA/飞书 CLI 等） | `connectors/gateway/adapters/*.py` | 请求字典 Key、错误翻译、返回解包 | 远端内部实现、真实凭证与权限 |
| 宿主 CLI（`adb/lark-cli/wecom-cli/xdotool/docker`） | `mobile/adb.py:22-185`、`connectors/gateway/cli_install.py:140-228` | argv、返回解包、SSE 日志键 | 宿主环境版本与可用性 |
| ACME / Let's Encrypt | `setup/tls/acme_issue.py:56-135` | HTTP-01 challenge、CSR/order 调用 | CA 内部状态 |

## 3. 动态分发与运行期注入边界

| 动态机制位置 | 机制说明 | Agent 注意事项 |
|---|---|---|
| `server.py:287-289` + `utils/env_file.py:87-92` | `~/.octop/env` 文件仅合并未 set 的键，宿主机文件内容不在 Git 内 | 测试用 `monkeypatch.setenv("OCTOP_HOME", tmp_path)` 模拟，替身见 `tests/support/fakes.py:34` |
| `agents/plugins/manager.py` + `server.py:302-307` | `~/.octop/plugins/*` 动态加载，`kind→api` 分派在 harness-agent 内 | UI 需预构建 ESM；bundled 插件默认 disabled；不要假设 `setup(ctx)` 之外的 API |
| `connectors/gateway/registry.py:24-77`、`src/octop/infra/connectors/gateway/protocol.py:21-78` | `kind→adapter` 运行时注册 + JSON-RPC 信封 | 新增 kind 必须同步注册，否则 `_err(-32601)` |
| `config.py:394-582` | `config.json` + env 覆盖；Setup 期 `rebind_control_plane` 热换 DB | 未提交本机配置不属快照，排障时先看实际 `config.json` |
| `trajectory/settings.py:16-31`、apiErrors i18n key | 运行期开关与前后端文案镜像 | key 变更需同时改前后端 |

## 4. 外部引用页与排除理由

`.wally/docs/` 中以下页面由 `wally-init` 预置，属 SOP 流程脚手架/静态快照，**不是 codewiki 管理页**（不强制 8 键 YAML 头，不计入 `.wiki-meta.json` 的 `pageOrder`），本生成仅链接不改写：

| 路径 | 性质与排除理由 |
|---|---|
| `.wally/docs/apis/index.md`、`_template.md` | API 契约模板，正文为 `<actual API>` 占位，权威来源是真实 router |
| `.wally/docs/sqls/README.md` | 库表/SQL 模板，权威来源 `infra/db/migrations/` |
| `.wally/docs/unittest/unittest.md` | 单测规范模板，权威来源 `Makefile`/`pyproject.toml`/CI |
| `.wally/docs/integration_test/integration_test.md` | 静态初始化记录（标注 not executed），权威来源 `tests/integration/` |
| `.wally/docs/devops/env.md`、`test-env-deploy.md` | 环境/部署静态快照（标注 static verification only），权威来源 `docker/`、`docs/configuration.md` |

`src/octop/dashboard/` 为构建产物（`.gitignore:74-77`），不在仓内检出；前端源码在 `dashboard/`，改动后必须 `make build-frontend`。

## 5. 诚实与弱命中纪律

- 弱命中 / 语义近邻只作线索，下结论前必须 `Read` 原文核验符号、字典键与配置键的字面出现。
- 源码无字面证据时写「[仓库内未找到字面实现]」或「[外部黑盒：本仓未包含服务端实现]」，不拼接猜测字段名、错误码或跨系统边。
- token 计量区分真实 API 与 `agent-local` 估算；原始 prompt 不写入文档；密钥不落 `.wally/docs/`、不回显、不写日志。

## 导航与共变索引

基准快照对应的生成模式与覆盖目录见 [组件架构总表](../architecture/index.md)，外部黑盒的契约展开见 [集成总览](../integrations/index.md)，SOP 外部页维护规则见 [INDEX](../INDEX.md)。
