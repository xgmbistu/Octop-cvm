---
kind: operations
scope: boundary
status: draft
origin: generated
source_paths: [pyproject.toml, src/octop/infra/backend/resolver.py, src/octop/infra/gateway/channels/qr_bind.py, src/octop/infra/agents/acp_settings.py, src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py, docs/architecture.md, docs/api.md, docs/cli.md, docs/configuration.md, docs/adr/001-single-process-model.md, .wally/profiles/project.md]
symbols: [resolve_backend, QQBotQRLogin, ACPConfig.from_dict, build_chat_model, ocr]
upstream: [../INDEX.md, ../overview/system-architecture.md]
downstream: [pitfalls-and-adr.md, ../integrations/index.md]
---

# 认知边界与外部黑盒声明（Agent Anti-Hallucination Boundary）

界定本套 `.wally/docs/` 已核验的源码快照边界、仓库外不可见的黑盒服务、静态分析局限与生成物可信度等级。核心纪律：**弱命中线索不等于字面证据**；找不到实现直写「未找到」，绝不拼接猜测字段。

## 1. 核验基准快照与生成物状态

- **Git 分支与提交**：`chore/wally-init-20261126-c113` @ `79d7a7f42859317b967ad991650dc1846fe24900`。
- **生成模式与覆盖目录**：`FULL`（无有效 `.wiki-meta.json` 基线）· 已完整扫描：`src/octop/{api,cli,i18n,infra}/`、`dashboard/src/`、`desktop/`、`docker/`、`docs/`、`fnos/`、`plugins/`、`scripts/`、`tests/`（逐目录归档见 [`../architecture/index.md`](../architecture/index.md) 第 2 节，未映射源码目录 = `0`）。
- **生成物可信度声明**：除显式标为 `origin: human` / `status: verified` 的人工精修页外，其余自动生成页均为 `status: draft`；Agent 改动核心逻辑前必须按页内 `path:line` 回读源码字面核验。
- **语言与快照**：全站 `TARGET_LANG = zh-CN`；源码符号、字典 Key、路径与 YAML 键名保持英文原样。生成时源码工作树干净（`git status` 无改动），无暂存/未跟踪源码纳入。

## 2. 仓库外黑盒系统清单（Out-of-Repo Black Boxes）

以下目标仅在本仓存在出向调用封装或配置注入，其**服务端内部实现不在本仓**（出向请求/响应字典契约已按本仓代码记录于 [`../integrations/index.md`](../integrations/index.md)，远端内部逻辑严禁猜测）：

| 外部黑盒目标 | 本仓边界文件（路径:行号） | 本仓已核实的契约范围 | 不可见的远端黑盒范围 |
|---|---|---|---|
| `harness-agent` / `harness-gateway` / `harness-memory` / `harness-browser` | `pyproject.toml:13-48`（wheel 依赖）、`src/octop/infra/backend/resolver.py:23` | 配置 spec 字典、`AgentManager.stream` 调用、`BackendWorkspace` 路径约定 | 模型路由/工具执行/对象存储 PUT-GET/浏览器 CDP/记忆召回的内部 wire 格式 |
| LLM 聊天模型 / 远程 OCR | `src/octop/infra/agents/providers/probe.py:238`、`src/octop/infra/knowledge/ocr.py:282-302` | `build_chat_model(...).ainvoke`、OCR content 字典 | 模型内部请求字段、采样参数、服务端实现 |
| ACP 出站 runners | `src/octop/infra/agents/acp_settings.py:22-34`、`src/octop/infra/agents/manager.py:2577` | `{"command","args"}` runner 配置 | OpenCode / CodeBuddy / Claude Code / Codex 的 stdio ACP 协议 |
| QQ / 微信 QR 登录 | `src/octop/infra/gateway/channels/qr_bind.py:62`、`:126` | `wait_for_login(qrcode_token)` + `60.0s` 超时 | `harness_gateway.channels.qq.QQBotQRLogin` 等内部实现 |
| 元宝宿主 metadata | `src/octop/infra/gateway/bot_creators/yuanbao_bot_creator.py:379`、`:395` | `http://metadata.tencentyun.com/...` 取 `instance_id`/`ip` | 宿主元数据服务（仅腾讯云环境可见） |
| 外部 IM / SaaS / OIDC / 对象存储 | [`../integrations/downstream/`](../integrations/index.md) 各专页 | 请求字典键、超时、成功码、返回解包键 | 远端限流配额、内部字段、外部环境配置值 |
| 外部 CLI（lark-cli / wecom-cli / adb / git / pip） | `src/octop/infra/connectors/gateway/cli_runner.py:38`、`src/octop/infra/setup/self_update.py:195` | 固定 argv、stdout JSON 错误解包 | CLI 内部命令实现与版本差异 |

## 3. 动态分发与运行期注入边界

| 动态机制位置（路径:行号） | 机制说明 | Agent 注意事项 |
|---|---|---|
| `src/octop/api/routers/memory.py:654` | 5 条路由经 `router.add_api_route` 运行时注册，非装饰器 | 静态 `Grep` 装饰器会漏计，完整清单见 [`../contracts/api/chat-and-memory.md`](../contracts/api/chat-and-memory.md) |
| `src/octop/infra/gateway/slash/dispatcher.py:35` | `_handlers` 字典 + `runtime.has` 动态分发 | 新增命令须同时登记 `src/octop/infra/gateway/slash/catalog.py:67` |
| `src/octop/cli/main.py:65` | `_LazyCLI.get_command` 用 `importlib.import_module` 懒加载 20 个命令 | 静态 import 图看不到全部命令，清单位于 [`../architecture/cli.md`](../architecture/cli.md) |
| `src/octop/infra/server.py:289` | `apply_env_file(env_file_path(...))` 加载运行期 `.env` | 宿主机 `.env` 内容不在 Git 仓内，测试用临时文件模拟 |
| `src/octop/api/app.py:268` | `enable_mobile` 为真才挂 `mobile.router` | 静态路由表须注明「条件挂载」，见 [`../contracts/api-reference.md`](../contracts/api-reference.md) |
| `src/octop/config.py:394` | `load_config` 读 `~/.octop/config.json` 运行期文件 | 文件默认值由 `_defaults_for_file`（`:151`）注入，实例配置值不得写入文档 |
| `dashboard/src/api/modules/*` | 前端只经 `/api` HTTP，不 import Python | 禁止据前端代码推断后端模块布局 |

## 4. 外部权威文档（链接、不改写）

以下为 SOP 共享 `.wally/docs/` 的外部引用页与人工权威文档，按规范**仅在 INDEX 链接，不复制正文、不改写为 codewiki 模板、不计入 `pageOrder`**：

| 外部页 | 用途 | 排除理由 |
|---|---|---|
| `.wally/docs/apis/index.md`、`apis/_template.md` | SOP API 索引模板 | SOP 专用（`.wally/profiles/project.md` 指定） |
| `.wally/docs/sqls/README.md` | 数据库/SQL 文档模板 | SOP 专用外部权威页 |
| `.wally/docs/unittest/unittest.md` | 单测规范模板 | SOP 专用外部权威页 |
| `.wally/docs/integration_test/integration_test.md` | IT 静态验证指南 | SOP 专用（`.wally/config.json` 的 `it.guide`） |
| `.wally/docs/devops/env.md`、`devops/test-env-deploy.md` | 环境与测试部署指南 | SOP 专用（`.wally/config.json` 的 `deploy.guide`） |
| `docs/architecture.md`、`docs/api.md`、`docs/cli.md`、`docs/configuration.md`、`docs/acp.md`、`docs/personas.md`、`docs/adr/*` | 人工编写参考文档 | 已有外部权威页，链接引用 |

## 5. 静态分析局限与纪律

- 调用图在线程投递、队列、`subprocess`、动态 action 分发处会断链，桥接表见 [`../overview/callchain-panorama.md`](../overview/callchain-panorama.md) 第 3 节。
- 向量/语义近邻弱命中只作线索，下结论前必须 `Read` 源码核验原词字面存在；本套文档中所有 `path:line` 均已按当前工作树核验（422 条路由锚点 0 越界）。
- `origin: human` / `status: verified` 页本次未发现（全仓 grep 0 命中）；`integrations/index.md` 原为 `wally-init` 预留的 thin 占位页（`origin: generated`），本次按 Mode B 覆写为正式集成总览。
- 未找到字面实现的项（如 `TAB_ALIAS`、`/personas` 路由、`src/octop/infra/agents/runtime.py`）已在 [`pitfalls-and-adr.md`](pitfalls-and-adr.md) 显式标注，禁止臆造。
- **核验锚点**：`docs/adr/001-single-process-model.md:1`（单进程模型 ADR）。
