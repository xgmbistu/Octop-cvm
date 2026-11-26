---
kind: downstream-contract
scope: embedding-service
status: draft
origin: generated
source_paths: [src/octop/infra/knowledge/embed.py, src/octop/infra/knowledge/ocr.py, src/octop/infra/knowledge/jobs.py, src/octop/infra/knowledge/params.py, src/octop/infra/knowledge/retrieve.py]
symbols: [embed_knowledge_texts, chunk_text, process_document, retrieve_context, DEFAULT_CHUNK_SIZE]
upstream: [../index.md, ../topology-and-mapping.md, ../../business/knowledge-indexing.md]
downstream: []
---

# 下游出向接口契约：`embedding-service`（知识库向量化服务）

知识库文档分块后调用 OpenAI 兼容 `/embeddings` 端点生成向量；本地模式改用 `onnx_service.embed_texts`（on-device，无网络）。本仓封装在 `src/octop/infra/knowledge/embed.py`，OCR 侧另经 harness 黑盒模型处理图片。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（路径:行号） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/knowledge/embed.py` | 请求组装与返回解包层 |
| 底层传输 | `httpx` + `Authorization: Bearer` + 自定义 headers | `src/octop/infra/knowledge/embed.py:28-31`、`:53` |
| 端点模板 | `POST {base}/embeddings` | `src/octop/infra/knowledge/embed.py:53` |
| 超时与单批 | `60.0s`，单批上限 `20` | `src/octop/infra/knowledge/embed.py:13`、`:53` |
| 公共请求信封 | `{"model": <model>, "input": <batch>}` | `src/octop/infra/knowledge/embed.py:53-62` |
| 下游成功判定 | `response.json()["data"]` 存在且向量数与 batch 一致 | `src/octop/infra/knowledge/embed.py:59-64` |
| 本地回退 | `onnx_service.embed_texts`（黑盒，无出向字典） | `src/octop/infra/knowledge/embed.py:9`、`:22` |
| 分块参数 | `chunk_text(text, size=800, overlap=120)`，`_MIN_CHUNK_SIZE=100`、`_MAX_CHUNK_SIZE=8000` | `src/octop/infra/knowledge/chunk.py:6`、`src/octop/infra/knowledge/params.py:17-18` |
| 检索参数 | `DEFAULT_RETRIEVAL_K=8`、`DEFAULT_CONTEXT_CHAR_BUDGET=6000` | `src/octop/infra/knowledge/params.py:9-10` |

## 2. 本仓上游调用方反查表

| 本仓封装方法 | 上游调用模块与函数 | 所属业务流 / 接口 | 调用点锚点（路径:行号） |
|---|---|---|---|
| `embed_knowledge_texts` | `process_document` 索引管线 | 知识文档上传/重建 | `src/octop/infra/knowledge/jobs.py:52` |
| `retrieve_context` | 对话轮次知识注入 | `WF-01` 消息处理 | `src/octop/infra/knowledge/retrieve.py:22` |
| 远程 OCR | `build_probe_chat_model(...).invoke([...])` | 图片文档解析（黑盒） | `src/octop/infra/knowledge/ocr.py:282-302` |

## 3. 封装方法总清单

| 序号 | 封装函数签名 | 下游目标 | 读写类型 | 单批上限 / 超时 | 定义锚点 |
|---|---|---|---|---|---|
| 1 | `embed_knowledge_texts(texts: list[str]) -> list[list[float]]` | `POST {base}/embeddings` | 读式计算 | 单批 `20`，`60.0s` | `src/octop/infra/knowledge/embed.py:53-64` |
| 2 | `chunk_text(text, *, size, overlap)` | 本地纯函数 | — | `size<=0` / `overlap>=size` 拒绝 | `src/octop/infra/knowledge/chunk.py:6-11` |
| 3 | 远程 OCR | harness `build_probe_chat_model` | 黑盒 | 配置键 `knowledge_ocr_*` | `src/octop/infra/knowledge/ocr.py:23-26` |

## 4. 逐方法请求字典与响应解包契约（Full Dict Schemas）

### 4.1 `embed_knowledge_texts` → `POST {base}/embeddings`（`src/octop/infra/knowledge/embed.py:53-64`）

#### A. 发往下游的组装字典表

```json
{"model": "<embedding_model>", "input": ["<chunk_1>", "<chunk_2>"]}
```

| 下游字典键路径 | 类型 | 必填条件 | 默认值 | 值来源与转换逻辑 | 组装行号 |
|---|---|---|---|---|---|
| `model` | `str` | 必填 | — | 知识库高级设置中的 embedding model | `src/octop/infra/knowledge/embed.py:53` |
| `input` | `list[str]` | 必填 | — | `chunk_text(text, size=800, overlap=120)` 输出，按 `20` 分批 | `src/octop/infra/knowledge/embed.py:13`、`:53` |
| `Authorization`（header） | `str` | `api_key` 非空 | `Bearer <key>` | 与 `extra_headers` 合并 | `src/octop/infra/knowledge/embed.py:28-31` |
| `extra_headers`（header） | `dict` | 可选 | `{}` | 用户配置透传 | `src/octop/infra/knowledge/embed.py:28-31` |

#### B. 下游返回字典与解包规则表

| 下游返回键路径 | 类型 | 本仓提取、判空兜底与转换规则 | 解包行号 |
|---|---|---|---|
| `response.json()["data"]` | `list[dict]` | 缺失抛 `"knowledge embedding response has no data"` | `src/octop/infra/knowledge/embed.py:59-61` |
| `data[i]["embedding"]` | `list[float]` | 逐项收集；数量与 batch 不符抛 `"knowledge embedding count mismatch"` | `src/octop/infra/knowledge/embed.py:62-64` |

#### C. 下游错误码拦截与翻译

| 下游错误码 / 条件 | 本仓错误 / 兜底 | 代码行号 |
|---|---|---|
| `data` 缺失 | 字面错误 `"knowledge embedding response has no data"` → 文档 `status="failed"` | `src/octop/infra/knowledge/embed.py:61`、`src/octop/infra/knowledge/jobs.py:59` |
| 向量数不匹配 | `"knowledge embedding count mismatch"` → 同上 | `src/octop/infra/knowledge/embed.py:64` |
| 检索无 query / k<=0 / 预算<=0 | 直接返回 `""`（无异常） | `src/octop/infra/knowledge/retrieve.py:35` |

### 4.2 远程 OCR（边界字典，`src/octop/infra/knowledge/ocr.py:282-302`）

| 项 | 精确值 | 锚点 |
|---|---|---|
| 消息 content | `[{"type":"text","text":_OCR_PROMPT},{"type":"image_url","image_url":{"url":"data:{mime};base64,{b64}"}}]` | `src/octop/infra/knowledge/ocr.py:290-297` |
| 调用 | `build_probe_chat_model(...).invoke([HumanMessage])` → harness 黑盒 | `src/octop/infra/knowledge/ocr.py:282` |
| 配置键 | `knowledge_ocr_enabled/backend/model/provider_id` | `src/octop/infra/knowledge/ocr.py:23-26` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- **改 embedding 请求键**：改 `src/octop/infra/knowledge/embed.py:53` → 核对 `src/octop/infra/knowledge/jobs.py:52` 与 `src/octop/infra/knowledge/retrieve.py:95` 的向量消费 → 更新 [`../topology-and-mapping.md`](../topology-and-mapping.md) 与 [`../../business/knowledge-indexing.md`](../../business/knowledge-indexing.md) → 跑 `uv run pytest tests/unit/knowledge -q`。
- **改分块参数**：`src/octop/infra/knowledge/params.py:7-22` 的默认值与边界（chunk 100–8000、k 1–20、预算 500–50000）必须与 `get_advanced_settings`/`set_advanced_settings`（`src/octop/infra/knowledge/params.py:48`、`:82`）及前端设置页同步。
- **特殊协议陷阱**：`/embeddings` 返回 `data` 顺序须与 `input` 对应；`chunk_count` 由 `src/octop/infra/knowledge/jobs.py:55` 按实际分块数写入 `knowledge_documents`，不是向量数；本地 ONNX 路径不产生网络请求，禁止给它套用 `extra_headers`。
