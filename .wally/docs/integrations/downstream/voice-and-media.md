---
kind: downstream-contract
scope: voice-and-media
status: draft
origin: generated
source_paths: [src/octop/infra/voice/manager.py, src/octop/infra/voice/adapters.py, src/octop/infra/voice/tencent_sign.py, src/octop/infra/voice/presets.py, src/octop/infra/agents/media_generation.py]
symbols: [VoiceManager.transcribe, VoiceManager.synthesize, _tc3_headers, _wav_header, verify_langfuse_credentials]
upstream: [integrations/index.md, contracts/api-reference.md]
downstream: [contracts/error-codes.md, business/chat-turn.md]
---

# 下游出向接口契约：`语音 STT/TTS 与媒体生成`

`VoiceManager` 按 provider kind 把音频转写/合成请求分发到 6 类下游适配器；上游是 `POST /api/voice/stt|tts`，本仓库仅实现请求字典拼装、签名与返回解包，模型侧实现均为外部黑盒。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（`路径:行号`） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/voice/adapters.py`（逐下游请求字典）、`tencent_sign.py`（TC3 签名）、`manager.py`（分派） | `src/octop/infra/voice/manager.py:92-183` |
| 底层传输底座 | `httpx`（OpenAI/Mimo/Tencent）、`edge_tts.Communicate`（edge-tts） | `src/octop/infra/voice/adapters.py:68-427` |
| 端点与凭据配置来源 | `voice_providers` 表（name-keyed）+ `extra_json` 中的 `app_id/secret_id/secret_key` | `src/octop/infra/voice/presets.py` |
| 成功判定条件 | `Response.Error` 缺失且有 `Result`/`Audio`；OpenAI 用 `raise_for_status()`；Mimo 必须有 `choices[0]` | `adapters.py:133-221`、`:304-427` |

## 2. 本仓上游调用方反查表

| 封装方法 | 上游接口 | 调用点锚点（`路径:行号`） |
|---|---|---|
| `VoiceManager.transcribe` | `POST /api/voice/stt` | `src/octop/api/routers/voice.py:112` |
| `VoiceManager.synthesize` | `POST /api/voice/tts` | `src/octop/api/routers/voice.py:133` |
| `verify_langfuse_credentials` | `POST /api/admin/observability/langfuse/test` | `src/octop/api/routers/observability.py:74` |
| media generation 配置 | `GET/PUT /api/admin/media-generation`、`POST /test` | `src/octop/api/routers/media_generation.py:74`、`:87`、`:118` |

## 3. 封装方法总清单

| 下游 | 能力 | 请求方法 / 命令 | 流式 | 定义锚点 |
|---|---|---|---|---|
| OpenAI-compatible STT | 转写 | multipart POST | 否 | `adapters.py:68-93` |
| OpenAI-compatible TTS | 合成 | POST + `aiter_bytes` | 是 | `adapters.py:96-130` |
| 腾讯云 ASR | 转写 | TC3 签名 POST | 否 | `adapters.py:133-175` |
| 腾讯云 TTS | 合成 | TC3 签名 POST | 否 | `adapters.py:178-221` |
| edge-tts | 合成 | `edge_tts.Communicate` | 是 | `adapters.py:224-240` |
| Mimo STT / TTS | 转写 / 合成 | OpenAI 兼容 + SSE | TTS 是 | `adapters.py:304-355`、`:358-427` |

## 4. 逐方法请求字典与响应解包契约

### 4.1 OpenAI-compatible STT / TTS（`adapters.py:68-130`）

| 字典键 | 类型 | 值来源 / 转换 | 行号 |
|---|---|---|---|
| STT `files={file:(audio.{ext},audio,mime)}` | multipart | 上传音频字节 + 扩展名推断 MIME | `adapters.py:68-93` |
| STT `data.model` | `str` | provider 配置模型名 | `adapters.py:68-93` |
| STT `data.language` | `str` | `language.split("-")[0]` | `adapters.py:68-93` |
| TTS `{model,input,voice,speed,response_format:"mp3"}` | `dict` | 上游 `text` + 配置 | `adapters.py:96-130` |

返回解包：STT 取 `body.text`（`adapters.py:68-93`）；TTS 用 `aiter_bytes()` 逐块输出（`adapters.py:96-130`）。

### 4.2 腾讯云 ASR / TTS 与 TC3 签名（`adapters.py:133-221`、`tencent_sign.py:12-57`）

| 下游字典键 | 类型 | 值来源 / 固定值 | 行号 |
|---|---|---|---|
| `EngSerViceType` | `str` | `16k_zh` / `16k_en` | `adapters.py:133-175` |
| `SourceType` | `int` | 固定 `1` | `adapters.py:133-175` |
| `VoiceFormat` | `str` | `wav/mp3/ogg-opus/webm` | `adapters.py:133-175` |
| `Data` / `DataLen` | `str` / `int` | base64(audio) / 字节长度 | `adapters.py:133-175` |
| `Text` / `SessionId` | `str` | 上游文本 / `uuid4` | `adapters.py:178-221` |
| `ModelType` / `VoiceType` | `int` / `int` | 固定 `1` / 配置音色 | `adapters.py:178-221` |
| `Codec` / `Speed` | `str` / `float` | `"mp3"` / `0.5-2.0` | `adapters.py:178-221` |
| `Authorization` header | `str` | `Credential+SignedHeaders+Signature`，HMAC-SHA256 派生 | `tencent_sign.py:12-57` |

返回解包：ASR `Response.Result`；`Response.Error` → `RuntimeError "{Code}: {Message}"`（`adapters.py:133-175`）。TTS `Response.Audio` → `b64decode`；无 `Audio`→「returned empty audio」（`adapters.py:178-221`）。

### 4.3 edge-tts 与 Mimo（`adapters.py:224-240`、`:304-427`）

| 下游 | 请求字典 Key | 返回解包 | 错误翻译 |
|---|---|---|---|
| edge-tts | `Communicate(text, voice, rate="{±n}%")` | `chunk["type"]=="audio"` → `chunk["data"]` | 无显式翻译 |
| Mimo STT | `{model:"mimo-v2.5-asr", messages:[{role,content:[{type:"input_audio",input_audio:{data:"data:{mime};base64,..."}}]}], asr_options:{language}}` | `choices[0].message.content` | 无 choices→「returned no choices」 |
| Mimo TTS | `{model:"mimo-v2.5-tts", messages:[user:"Speak naturally.",assistant:text], audio:{format:"pcm16",voice}, stream:true}` + 先 yield `_wav_header(0xFFFFFFFF)` | SSE `data:` → `choices[0].delta.audio.data` → `b64decode` | JSONDecode 跳过跨行 |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- 新增语音 provider：在 `voice/presets.py` 登记预设 → `VoiceManager.transcribe/synthesize` 分派新增 `kind` 分支（`manager.py:92-183`）→ `api/routers/voice.py` 增补 test 端点 → 更新 `tests/unit/voice/` 桩。
- 改 TC3 签名：必须同步 `Authorization` 的 `Credential/SignedHeaders/Signature` 三段与时间戳窗口，否则腾讯云返回 `AuthFailure`，错误经 `Response.Error` 直接透出。
- **特殊陷阱**：`VOICE_BROWSER_ONLY`（HTTP 422）表示某音色仅浏览器可用（`src/octop/infra/errors.py:63`）；Mimo TTS 必须先发一个 44 字节 WAV 头，否则客户端无法边收边播。

## 导航与共变索引

语音端点见 [设备与媒体分组契约](../../contracts/api/devices-and-media.md)，错误码语义见 [错误码字典](../../contracts/error-codes.md)，Provider 配置复用见 [LLM Provider 契约](llm-providers.md)。
