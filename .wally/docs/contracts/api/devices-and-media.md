---
kind: api-contract
scope: api-devices-and-media
status: draft
origin: generated
source_paths: [src/octop/api/routers/browser/stream.py, src/octop/api/routers/desktop/stream.py, src/octop/api/routers/mobile/stream.py, src/octop/api/routers/voice.py, src/octop/api/routers/filesystem.py, src/octop/api/routers/storage_backends.py]
symbols: [browser_stream_ws, desktop_stream_ws, mobile_stream_ws, voice_tts, probe_storage_backend, filesystem_defaults]
upstream: [contracts/api-reference.md]
downstream: [integrations/downstream/device-bridges.md, integrations/downstream/voice-and-media.md]
---

# 入向接口分组契约：`设备串流 / 语音 / 文件与存储`

本页展开 Browser/Desktop/Mobile 串流 WS、语音 STT/TTS、文件系统与存储后端端点；WS 帧协议见 [`device-bridges.md`](../../integrations/downstream/device-bridges.md)，语音字典见 [`voice-and-media.md`](../../integrations/downstream/voice-and-media.md)。

## 1. Browser 设备端点

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| GET | `/api/browser/env-status` | env status | `src/octop/api/routers/browser/env.py:91` |
| POST | `/api/browser/install` | install（SSE） | `browser/env.py:120` |
| GET | `/api/browser/harness-sessions` | sessions | `browser/harness.py:292` |
| POST | `/api/browser/sessions/{session_id}/handoff` | handoff | `browser/harness.py:298` |
| POST | `/api/browser/shutdown` | shutdown | `browser/harness.py:342` |
| GET | `/api/browser/record-replay/status` | status | `browser/record_replay.py:142` |
| POST | `/api/browser/record-replay/start` | start | `browser/record_replay.py:154` |
| POST | `/api/browser/record-replay/stop` | stop | `browser/record_replay.py:174` |
| POST | `/api/browser/record-replay/stop-and-generate-skill` | generate skill | `browser/record_replay.py:202` |
| POST | `/api/browser/record-replay/skill-content` | skill content | `browser/record_replay.py:282` |
| POST | `/api/browser/record-replay/replay` | replay | `browser/record_replay.py:312` |
| WS | `/api/browser-stream/ws` | `browser_stream_ws` | `browser/stream.py:326` |
| POST | `/api/browser/uninstall` | uninstall（SSE） | `browser/uninstall.py:18` |

## 2. Desktop 与 Mobile 端点

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| POST | `/api/desktop/install` | install（SSE） | `src/octop/api/routers/desktop/install.py:18` |
| POST | `/api/desktop/geometry` | set geometry | `desktop/settings.py:28` |
| GET | `/api/desktop/geometry` | get geometry | `desktop/settings.py:43` |
| GET | `/api/desktop/status` | status | `desktop/status.py:16` |
| WS | `/api/desktop-stream/ws` | `desktop_stream_ws` | `desktop/stream.py:235` |
| POST | `/api/desktop/uninstall` | uninstall（SSE） | `desktop/uninstall.py:18` |
| POST | `/api/mobile/install` | install（SSE） | `src/octop/api/routers/mobile/install.py:18` |
| GET | `/api/mobile/status` | status | `mobile/status.py:37` |
| GET | `/api/mobile/devices/{device}/info` | device info | `mobile/status.py:70` |
| GET | `/api/mobile/agent-control` | get control | `mobile/status.py:90` |
| PUT | `/api/mobile/agent-control` | put control | `mobile/status.py:97` |
| WS | `/api/mobile-stream/ws` | `mobile_stream_ws` | `mobile/stream.py:481` |
| WS | `/api/mobile/adb/shell/ws` | `adb_shell_ws` | `mobile/shell_ws.py:52` |

## 3. 语音、文件系统与存储端点

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| GET | `/api/voice/presets` | presets | `src/octop/api/routers/voice.py:82` |
| GET | `/api/voice/providers` | providers | `voice.py:87` |
| GET | `/api/voice/active` | get active | `voice.py:95` |
| PUT | `/api/voice/active` | put active | `voice.py:103` |
| POST | `/api/voice/stt` | transcribe | `voice.py:112` |
| POST | `/api/voice/tts` | `voice_tts` | `voice.py:133` |
| GET | `/api/admin/voice/providers` | admin list | `voice.py:154` |
| POST | `/api/admin/voice/providers` | admin create | `voice.py:162` |
| PATCH | `/api/admin/voice/providers/{provider_id}` | patch | `voice.py:187` |
| DELETE | `/api/admin/voice/providers/{provider_id}` | delete | `voice.py:213` |
| POST | `/api/admin/voice/providers/{provider_id}/test` | test | `voice.py:232` |
| POST | `/api/voice/test-configuration` | test config | `voice.py:242` |
| GET | `/api/filesystem/defaults` | `filesystem_defaults` | `src/octop/api/routers/filesystem.py:61` |
| GET | `/api/filesystem/dirs` | dirs | `filesystem.py:78` |
| POST | `/api/filesystem/probe` | probe | `filesystem.py:92` |
| POST | `/api/filesystem/ensure-bwrap` | ensure bwrap | `filesystem.py:105` |
| GET | `/api/filesystem/docker-status` | docker status | `filesystem.py:121` |
| POST | `/api/filesystem/ensure-docker` | ensure docker | `filesystem.py:135` |
| POST | `/api/filesystem/mkdir` | mkdir | `filesystem.py:150` |
| POST | `/api/filesystem/rename` | rename | `filesystem.py:167` |
| GET | `/api/admin/storage-backends` | list | `src/octop/api/routers/storage_backends.py:90` |
| POST | `/api/admin/storage-backends` | create | `storage_backends.py:98` |
| PATCH | `/api/admin/storage-backends/{backend_id}` | patch | `storage_backends.py:121` |
| DELETE | `/api/admin/storage-backends/{backend_id}` | delete | `storage_backends.py:149` |
| POST | `/api/admin/storage-backends/probe` | `probe_storage_backend` | `storage_backends.py:169` |
| GET | `/api/admin/storage-backends/{backend_id}/tree` | tree | `storage_backends.py:196` |
| POST | `/api/admin/storage-backends/{backend_id}/test` | test | `storage_backends.py:215` |
| GET | `/api/storage-backends` | user list | `storage_backends.py:233` |
| GET | `/api/onnx-models/catalog` | catalog | `src/octop/api/routers/onnx_models.py:82` |
| GET | `/api/onnx-models/models/{model_name:path}/meta` | meta | `onnx_models.py:97` |
| GET | `/api/onnx-models/status` | status | `onnx_models.py:113` |
| PUT | `/api/onnx-models/config` | config | `onnx_models.py:121` |
| POST | `/api/onnx-models/test` | test | `onnx_models.py:164` |
| POST | `/api/onnx-models/download` | download | `onnx_models.py:183` |
| GET | `/api/onnx-models/download-status` | status | `onnx_models.py:197` |
| DELETE | `/api/onnx-models/local/{model_name:path}` | delete | `onnx_models.py:204` |
| GET | `/api/ollama-models` | list | `src/octop/api/routers/ollama_models.py:73` |
| POST | `/api/ollama-models/download` | download | `ollama_models.py:117` |
| GET | `/api/ollama-models/download-status` | status | `ollama_models.py:179` |
| DELETE | `/api/ollama-models/download/{task_id}` | cancel | `ollama_models.py:192` |
| DELETE | `/api/ollama-models/{name:path}` | delete | `ollama_models.py:210` |
| GET | `/api/ollama-models/service` | service | `ollama_models.py:255` |
| PUT | `/api/ollama-models/service` | set service | `ollama_models.py:275` |

## 4. 协议要点

- 三个串流 WS 均以 Query 传 token，入站 `start/navigate/click/...` 或 `input/resize`，出站 `frame/status/action_result/error`；token 缺失败按 close code 4001/4003 处理。
- `POST /api/browser/install`、`/api/desktop/install`、`/api/mobile/install` 与 uninstall 均为 SSE 进度流，client 需按 `log` 字段增量渲染。
- `VOICE_BROWSER_ONLY`(422) 表示音色仅浏览器可用；`DESKTOP_SESSION_LIMIT`(429) 限制并发桌面会话（见 [`error-codes.md`](../error-codes.md)）。

## 5. 共变耦合与修改清单（Co-Change Playbook）

1. 新增 WS 事件：改 `stream.py` 分派 → `infra/{mobile,desktop,browser}` 命令封装 → 前端 hooks（`useMobileStream.ts`/`useDesktopStream.ts`）→ `tests/unit/{mobile,desktop,browser}/`。
2. 新增语音 provider：`voice.py` CRUD/test → `voice/presets.py` → [`voice-and-media.md`](../../integrations/downstream/voice-and-media.md)。
3. 新增 backend kind：`storage_backends.py` probe/test/tree → [`storage-backends.md`](../../integrations/downstream/storage-backends.md) → `tests/unit/backend/`。
