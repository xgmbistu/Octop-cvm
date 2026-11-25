---
kind: downstream-contract
scope: knowledge-rag
status: draft
origin: generated
source_paths: [src/octop/infra/knowledge/embed.py, src/octop/infra/knowledge/index.py, src/octop/infra/knowledge/retrieve.py, src/octop/infra/knowledge/jobs.py, src/octop/infra/knowledge/parse.py, src/octop/infra/knowledge/ocr.py, src/octop/infra/knowledge/chunk.py]
symbols: [embed_knowledge_texts, KnowledgeIndex.search, replace_doc_chunks, process_document, parse_document, chunk_text, assert_knowledge_usable]
upstream: [integrations/index.md, business/chat-turn.md]
downstream: [business/domain-models/index.md, contracts/error-codes.md]
---

# 下游出向接口契约：`Knowledge Base / RAG`

知识库子系统把上传文档解析、切块、向量化后写入本地 SQLite 向量表；检索时把命中块拼成带 citation 的上下文 preamble 注入 harness。Embedding 与 OCR 模型本身是外部黑盒，本仓负责真实请求字典与返回解包。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（`路径:行号`） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/knowledge/{embed,index,retrieve,parse,chunk,ocr,jobs}.py` | `src/octop/infra/knowledge/jobs.py:34-60` |
| 底层传输底座 | `httpx` 远程 embedding；本地 ONNX 经 `harness_agent` 的 `embed_texts`；向量表为 SQLite | `src/octop/infra/knowledge/embed.py:16-65` |
| 端点与凭据配置来源 | `knowledge_bases` 行的 embedding provider/base_url/api_key，与 `providers` 同源 | `src/octop/infra/knowledge/embed.py:16-65` |
| 成功判定条件 | 远程 embedding 必须返回 `data[]` 且条数一致；向量非零向量；OCR/解析按文件后缀分派 | `embed.py:16-65`、`index.py:26-134` |

## 2. 本仓上游调用方反查表

| 封装方法 | 上游调用方 | 调用点锚点（`路径:行号`） |
|---|---|---|
| `process_document` / `enqueue_index_document` | `API POST /api/knowledge-bases/{kb_id}/documents`、`reindex` | `src/octop/api/routers/knowledge_bases.py:692`、`:850`、`:875` |
| `resume_pending_index_jobs` | `OctopServer._boot_runtime` 启动钩子 | `src/octop/infra/server.py:455-457` |
| `assert_knowledge_usable` | harness `KnowledgeSearchHintMiddleware` / 检索工具 | `src/octop/infra/knowledge/retrieve.py:22-132` |
| `KnowledgeIndex.search` | `retrieve.py` 检索上下文 | `src/octop/infra/knowledge/retrieve.py:22-132` |

## 3. 封装方法总清单

| 序号 | 函数 | 下游目标 | 读写 | 并发 / 单批上限 | 定义锚点 |
|---|---|---|---|---|---|
| 1 | `embed_knowledge_texts` | `POST {base}/embeddings` 或本地 ONNX | 读 | 单批 ≤ 20 | `embed.py:16-65` |
| 2 | `replace_doc_chunks` | SQLite chunks 表 | 写 | 全量替换单文档 | `index.py:26-134` |
| 3 | `KnowledgeIndex.search` | SQLite 向量表（余弦相似度） | 读 | top-k by score | `index.py:26-134` |
| 4 | `process_document` | parse→chunk→embed→index 链 | 写 | `INDEX_CONCURRENCY=2`，信号量 | `jobs.py:17`、`jobs.py:34-60` |
| 5 | `parse_document` | pypdf/docx/pptx/openpyxl/xlrd/HTMLParser | 读 | 后缀白名单 | `parse.py:32-71` |
| 6 | `chunk_text` | 纯文本 | — | `size=800, overlap=120` | `chunk.py:6-21` |
| 7 | OCR (`RapidOCR` 或视觉模型) | 本地 OCR / 远程 vision | 读 | 远程图片 data URL | `ocr.py:232-302` |

## 4. 逐方法请求字典与响应解包契约

### 4.1 远程 Embedding（`embed.py:16-65`）

```json
{"model": "<embedding_model>", "input": ["<chunk_1>", "<chunk_2>"]}
```

| 字典键 | 类型 | 值来源 / 约束 | 行号 |
|---|---|---|---|
| `model` | `str` | KB 配置的 embedding 模型名 | `embed.py:16-65` |
| `input` | `list[str]` | 文本批次，≤ 20 条 | `embed.py:16-65` |
| `Authorization` | `str` | `Bearer {api_key}` + `provider_headers` | `embed.py:16-65` |

返回解包：`data[].embedding` 按序合并；无 `data`→「no data」，条数不符→「count mismatch」（`embed.py:16-65`）。本地路径直接 `embed_texts(model, texts)` 交外部 ONNX 服务（`embed.py:21-22`）。

### 4.2 本地向量表与检索（`index.py:26-134`）

| 表字段 | 类型 / 编码 | 值来源 | 行号 |
|---|---|---|---|
| `chunks.chunk_id` | `str` | `f"{doc_id}:{ordinal}"` | `index.py:26-134` |
| `chunks.doc_id` / `ordinal` / `text` | `str/int/str` | 切块结果 | `index.py:26-134` |
| `chunks.embedding` | `BLOB` | `struct.pack("<{n}f", *vector)` | `index.py:26-134` |
| `chunks.meta_json` | `str` | 文档元数据 JSON | `index.py:26-134` |

返回 `Hit(chunk_id, doc_id, ordinal, text, score, metadata)`：余弦相似度，按 score 倒序取 k；空/零向量→`ValueError`（`index.py:26-134`）。检索上下文由 `_format_context` 产出，char_budget=6000，尾部附 `<!--octop-kb-citations:[...]-->`（`src/octop/infra/knowledge/retrieve.py:22-132`、`src/octop/infra/knowledge/citations.py:21-57`）；任何检索异常被吞掉返回 `""`，因此「检索不到」可能是降级而非真无命中。

### 4.3 OCR 与解析（`ocr.py:232-302`、`parse.py:32-71`、`chunk.py:6-21`）

| 下游 | 请求字典 Key | 返回解包 | 错误翻译 |
|---|---|---|---|
| 本地 OCR | `RapidOCR()` → 图片字节 | `result.txts` 逐行 `\n`.join | 未启用→「OCR is not enabled」 |
| 远程 OCR（视觉模型） | `HumanMessage(content=[{type:"text",text:_OCR_PROMPT},{type:"image_url",image_url:{url:"data:{media_type};base64,..."}}])` | `llm_text_content(model.invoke(...))` | provider 非 vision→「remote OCR provider is not ready」 |
| PDF OCR | `pymupdf.open(path)` → `page.get_pixmap(Matrix(2,2)).tobytes("png")` | PNG 字节流 | — |
| 文档解析 | pypdf/docx/pptx/openpyxl/xlrd/HTMLParser | 纯文本 | 不支持后缀→`ValueError` |
| 切块 | `chunk_text(text, size=800, overlap=120)`，步长 `size-overlap` | `list[str]` | `overlap>=size`→`ValueError` |

### 4.4 索引作业（`jobs.py:34-86`）

`process_document` 把文档置 `status=processing`，依次调 `parse_document → chunk_text → embed_knowledge_texts → replace_doc_chunks`，成功后 `status=ready` 并写回 `chunk_count`，异常则 `status=failed` + `error_message`；维度变化时回写 `knowledge_bases.embedding_dim`（`jobs.py:34-60`）。`enqueue_index_document` 用 `run_in_executor` 卸载 CPU/IO，`reindex_all_documents` 批量重排（`jobs.py:63-81`）。启动恢复 `resume_pending_index_jobs` 调用 `knowledge_repo.resume_pending_documents()`，先把 `status='processing' AND is_dir=0` 全部重置为 `pending` 并清空错误（`src/octop/infra/db/repos/knowledge.py:488-502`）。

## 5. 共变耦合与修改清单（Co-Change Playbook）

- 改切块/嵌入参数：同步迁移或配置默认值（`chunk.py:6-21`）→ `process_document` 回写 `chunk_count`（`jobs.py:34-60`）→ 已存在文档的 `reindex` 入口（`knowledge_bases.py:850`）→ `tests/unit/knowledge/`。
- 改 citation 格式：必须同步前端 citation 解析 `dashboard/src/utils/collectTurnKnowledgeCitations.ts` 与 `citations.py:21-57` 的尾注字面量。
- **特殊陷阱**：`INDEX_CONCURRENCY=2` 是全局信号量（`jobs.py:17,27-31`），盲目调大可能压垮 embedding 端点；检索失败静默返回空串，排障时应先看 provider 连通性而非直接判「无知识」。

## 导航与共变索引

知识库端点见 [知识分组契约](../../contracts/api/knowledge-and-skills.md)，Embedding 连接配置见 [Provider 契约](llm-providers.md)，检索不到内容的排障见 [Runbook](../../operations/runbook-and-observability.md)。
