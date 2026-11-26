---
kind: downstream-contract
scope: voice-provider
status: draft
origin: generated
source_paths: [src/octop/infra/voice/adapters.py, src/octop/infra/voice/manager.py, src/octop/api/routers/voice.py, src/octop/infra/db/repos/voice_providers.py]
symbols: [transcribe, synthesize, _openai_stt, _tencent_asr, _mimo_asr, VoiceProviderRow]
upstream: [../index.md, ../topology-and-mapping.md]
downstream: []
---

# 下游出向接口契约：`voice-provider`（STT / TTS 语音服务）

语音适配层支持 OpenAI 兼容 STT/TTS、腾讯云 TC3 签名 ASR/TTS 与 Mimo ASR/TTS 三类下游。业务封装集中在 `src/octop/infra/voice/adapters.py`，`voice/manager.py` 按 `voice_providers` 行的 `kind` 分派；四类请求字典与返回解包键全部在下文逐一展开。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（路径:行号） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/voice/adapters.py` | 请求组装与返回解包层 |
| 底层传输 | `httpx`（OpenAI/Mimo）、TC3 签名 POST（腾讯云） | `src/octop/infra/voice/adapters.py:68`、`:133`、`:304` |
| 上游调用方 | `VoiceManager` 分派 | `src/octop/infra/voice/manager.py:113`、`:117`、`:164` |
| 端点 | `{base}/audio/transcriptions`、`{base}/audio/speech`、`https://asr.tencentcloudapi.com/`、`{base}/chat/completions` | `src/octop/infra/voice/adapters.py:68`、`:96`、`:133`、`:325` |
| 超时 | STT `60.0s`、TTS `120.0s`、腾讯 ASR/TTS `60.0s` | `src/octop/infra/voice/adapters.py:68`、`:96`、`:133` |
| 成功判定 | `{"ok": True, "mode": kind}` / `{"ok", "bytes"}` / `body["text"]` | `src/octop/infra/voice/adapters.py:430-480` |
| 错误枚举 | `VOICE_KIND_UNSUPPORTED(400)`、`VOICE_CAPABILITY_MISMATCH(400)`、`VOICE_PROVIDER_DISABLED(400)`、`VOICE_BROWSER_ONLY(422)` | `src/octop/infra/errors.py:63-66`、`:157-160` |

## 2. 本仓上游调用方反查表

| 本仓封装方法 | 上游调用模块与函数 | 所属接口 | 调用点锚点（路径:行号） |
|---|---|---|---|
| `transcribe` / `synthesize` | `VoiceManager`（按 kind 分派） | `POST /api/voice/*/test` | `src/octop/infra/voice/manager.py:113`、`:117`、`:164` |
| Provider 测试 | `test-configuration` 路由 | `POST /api/admin/voice/providers/test-configuration` | `src/octop/api/routers/voice.py:242` |
| 配置持久化 | `VoiceProviderRepo` | `PATCH /api/admin/voice/providers/{id}` | `src/octop/infra/db/repos/voice_providers.py:62` |

## 3. 封装方法总清单

| 序号 | 封装函数签名 | 下游目标 | 读写类型 | 超时 | 定义锚点 |
|---|---|---|---|---|---|
| 1 | OpenAI STT `POST {base}/audio/transcriptions` | OpenAI 兼容 | 读式计算 | `60.0s` | `src/octop/infra/voice/adapters.py:68-93` |
| 2 | OpenAI TTS `POST {base}/audio/speech` | OpenAI 兼容 | 流式字节 | `120.0s` | `src/octop/infra/voice/adapters.py:96-130` |
| 3 | 腾讯云 ASR（TC3 签名） | `SentenceRecognition` `2019-06-14` | 读式计算 | `60.0s` | `src/octop/infra/voice/adapters.py:133-175` |
| 4 | 腾讯云 TTS | `TextToVoice` `2019-08-23` | 流式 base64 | `60.0s` | `src/octop/infra/voice/adapters.py:178-221` |
| 5 | Mimo ASR `POST {base}/chat/completions` | `mimo-v2.5-asr` | 读式计算 | `60.0s` | `src/octop/infra/voice/adapters.py:304-355` |
| 6 | Mimo TTS（SSE 流） | `mimo-v2.5-tts` | SSE 流 | `120.0s` | `src/octop/infra/voice/adapters.py:358-427` |

## 4. 逐方法请求字典与响应解包契约（Full Dict Schemas）

### 4.1 OpenAI STT（`src/octop/infra/voice/adapters.py:68-93`）

| 请求位置 / 键 | 类型 | 必填 | 默认值 / 转换 | 行号 |
|---|---|---|---|---|
| `files["file"]` | `tuple` | 是 | 音频字节 | `src/octop/infra/voice/adapters.py:68` |
| `data["model"]` | `str` | 是 | 配置模型名 | `src/octop/infra/voice/adapters.py:68` |
| `data["language"]` | `str` | 条件 | 仅当调用方传语言才写入 | `src/octop/infra/voice/adapters.py:68` |
| `Authorization`（header） | `str` | 是 | `Bearer <api_key>` | `src/octop/infra/voice/adapters.py:68` |
| 返回 `body["text"]` | `str` | — | 直接提取 | `src/octop/infra/voice/adapters.py:93` |

### 4.2 OpenAI TTS（`src/octop/infra/voice/adapters.py:96-130`）

```json
{"model": "<model>", "input": "<text>", "voice": "<voice>", "speed": 1.0, "response_format": "mp3"}
```

| 下游字典键 | 类型 | 必填 | 默认值 / 固定值 | 行号 |
|---|---|---|---|---|
| `model` / `input` / `voice` / `speed` | `str/float` | 是 | 由配置与入参提供 | `src/octop/infra/voice/adapters.py:96` |
| `response_format` | `str` | 是 | 固定 `"mp3"` | `src/octop/infra/voice/adapters.py:96` |
| 返回 | 流式 audio bytes | — | `{"ok": True, "bytes": ...}` | `src/octop/infra/voice/adapters.py:130`、`src/octop/infra/voice/adapters.py:430` |

### 4.3 腾讯云 ASR / TTS（TC3 签名，`src/octop/infra/voice/adapters.py:133-221`）

#### A. ASR 请求字典（`:145-151`）

```json
{"EngSerViceType": "16k_zh", "SourceType": 1, "VoiceFormat": "<fmt>", "Data": "<base64>", "DataLen": 12345}
```

| 下游字典键 | 类型 | 必填 | 值来源 | 行号 |
|---|---|---|---|---|
| `EngSerViceType` | `str` | 是 | 引擎类型配置 | `src/octop/infra/voice/adapters.py:145` |
| `SourceType` | `int` | 是 | 固定 `1` | `src/octop/infra/voice/adapters.py:145` |
| `VoiceFormat` | `str` | 是 | 音频格式 | `src/octop/infra/voice/adapters.py:145` |
| `Data` | `str` | 是 | `base64(audio_bytes)` | `src/octop/infra/voice/adapters.py:145` |
| `DataLen` | `int` | 是 | `len(audio_bytes)` | `src/octop/infra/voice/adapters.py:145` |
| 返回 `data["Response"]["Result"]` | `str` | — | 识别文本 | `src/octop/infra/voice/adapters.py:170` |
| 错误 `Response["Error"]["Code"|"Message"]` | `dict` | — | 转本仓错误 | `src/octop/infra/voice/adapters.py:170-174` |

#### B. TTS 请求字典（`:188-195`）

```json
{"Text": "<text>", "SessionId": "<id>", "ModelType": 1, "VoiceType": 0, "Codec": "mp3", "Speed": 0}
```

| 下游字典键 | 类型 | 固定值 / 来源 | 返回解包 | 行号 |
|---|---|---|---|---|
| `Text` / `SessionId` / `ModelType=1` / `VoiceType` / `Codec="mp3"` / `Speed` | `str/int` | 见左 | `Response["Audio"]`（base64） | `src/octop/infra/voice/adapters.py:188-195`、`:218` |

### 4.4 Mimo ASR / TTS（`src/octop/infra/voice/adapters.py:304-427`）

#### A. ASR 请求（`:325-339`）

```json
{"model": "mimo-v2.5-asr", "messages": [{"role": "user", "content": [{"type": "input_audio", "input_audio": {"data": "<data_url>"}}]}], "asr_options": {"language": "<lang>"}}
```

| 下游字典键 | 类型 | 固定值 / 来源 | 行号 |
|---|---|---|---|
| `model` | `str` | `"mimo-v2.5-asr"` | `src/octop/infra/voice/adapters.py:325` |
| `messages[0].content[0].input_audio.data` | `str` | `data:<mime>;base64,<b64>` | `src/octop/infra/voice/adapters.py:325-339` |
| `asr_options.language` | `str` | 入参语言 | `src/octop/infra/voice/adapters.py:339` |
| 返回 `body["choices"][0]["message"]["content"]` | `str` | 识别文本 | `src/octop/infra/voice/adapters.py:339` |

#### B. TTS 请求与 SSE 解包（`:374-426`）

```json
{"model": "mimo-v2.5-tts", "messages": [<user>, <assistant>], "audio": {"format": "pcm16", "voice": "<voice>"}, "stream": true}
```

| 项 | 精确值 | 行号 |
|---|---|---|
| `model` / `audio.format` / `stream` | `"mimo-v2.5-tts"` / `"pcm16"` / `true` | `src/octop/infra/voice/adapters.py:374-382` |
| SSE `data:` 行终止 | `[DONE]` | `src/octop/infra/voice/adapters.py:401` |
| 解包 | `event["choices"][0]["delta"]["audio"]["data"]`（base64 分片累加） | `src/octop/infra/voice/adapters.py:401-426` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- **新增 STT/TTS 提供方**：改 `adapters.py` 分派与 `VOICE_KIND_UNSUPPORTED`（`src/octop/infra/errors.py:64`）→ 核对 `src/octop/infra/voice/manager.py:113` 调用点 → 更新 [`../index.md`](../index.md) 下游表与 [`../../contracts/error-codes.md`](../../contracts/error-codes.md) → 跑 `uv run pytest tests/unit/api tests/unit/infra -q`。
- **特殊协议陷阱**：腾讯云用 TC3 签名而非 `Bearer`；TTS 返回 base64 `Audio` 而非字节流；Mimo TTS 是 SSE 流且需按 `[DONE]` 收尾；`VOICE_BROWSER_ONLY(422)` 表示能力仅浏览器可用，勿当 500 处理。
- **凭据纪律**：`api_key`/`secret_key` 走 `voice_providers` 表与 `secrets`（[`../../contracts/configuration.md`](../../contracts/configuration.md)），禁止写入日志。
