---
kind: downstream-contract
scope: device-bridges
status: draft
origin: generated
source_paths: [src/octop/infra/mobile/adb.py, src/octop/infra/mobile/tools.py, src/octop/infra/mobile/docker_install.py, src/octop/infra/desktop/capture.py, src/octop/infra/desktop/input.py, src/octop/infra/browser/setup.py, src/octop/api/routers/mobile/stream.py]
symbols: [find_adb, list_devices, screenrecord_h264_args, screencap_png, capture_frame, run_desktop_action, ensure_bubblewrap]
upstream: [integrations/index.md, architecture/ui-and-cli.md]
downstream: [contracts/error-codes.md, operations/deployment-and-runtime.md]
---

# 下游出向接口契约：`设备桥（ADB / Desktop / Browser）`

远端 Android、桌面 VNC 与浏览器会话均通过 `subprocess` argv 调宿主 CLI，再把输出解包为 WS 帧；本仓只维护命令行参数字典、PNG/H.264 提取与 SSE 日志，浏览器自动化本体在外部 `harness-browser`。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（`路径:行号`） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/mobile/adb.py`、`desktop/{capture,input,setup}.py`、`browser/setup.py` | `src/octop/infra/mobile/adb.py:22-185` |
| 底层传输底座 | `subprocess.run(argv, capture_output, check=False)`；异常/非 0 一律返回 `False`/`None` | `adb.py:22-185` |
| 端点与工具发现 | `PATH` → `ANDROID_HOME\|ANDROID_SDK_ROOT/platform-tools/adb[.exe]`（`adb.py:22`）；DISPLAY/WAYLAND_DISPLAY 探测桌面（`desktop/setup.py:529,535`） | `adb.py:22-44` |
| 成功判定条件 | ADB 用正则 `^(\S+)\s+(device\|emulator)$` 识别在线设备；截图提取 PNG magic 前的前导文本 | `adb.py:45-66`、`adb.py:191-209` |

## 2. 本仓上游调用方反查表

| 封装方法 | 上游接口 | 调用点锚点（`路径:行号`） |
|---|---|---|
| `mobile_screenshot/tap/swipe/launch_app/ui_dump` | harness tools + `WS /api/mobile-stream/ws`、`WS /api/mobile/adb/shell/ws` | `src/octop/infra/mobile/tools.py:76-253`、`src/octop/api/routers/mobile/stream.py:481`、`shell_ws.py:52` |
| `capture_frame` / `run_desktop_action` | `WS /api/desktop-stream/ws` | `src/octop/api/routers/desktop/stream.py:235` |
| `browser_stream_ws` 启停 | `WS /api/browser-stream/ws` | `src/octop/api/routers/browser/stream.py:326` |
| `auto_install_docker_stream` | `POST /api/mobile/install`（SSE） | `src/octop/api/routers/mobile/install.py:18` |

## 3. 设备命令参数字典总清单

| 能力 | argv（精确字面） | 返回解包 | 源码锚点 |
|---|---|---|---|
| 设备列表 | `[adb, devices]` | 正则取 `serial + device\|emulator` | `adb.py:45-66` |
| 连接设备 | `[adb, connect, hostport]` | bool | `adb.py:69` |
| 主显示 ID | `[adb,-s,d,shell,dumpsys,SurfaceFlinger,--display-id]` | 显示 ID 字符串 | `adb.py:112` |
| 分辨率 | `[adb,-s,d,shell,wm,size]` | `Physical size: WxH` | `adb.py:130` |
| H.264 录屏 | `[adb,-s,d,exec-out,screenrecord,--output-format=h264,--time-limit=0,--bit-rate=N,(--size),(--display-id),-]` | 字节流 → `video_init` 帧 | `adb.py:150` |
| PNG 截图 | `[adb,-s,d,exec-out,screencap,-p]` | `extract_png` 跳前导文本 | `adb.py:191-209` |
| 点击/滑动 | `[adb,-s,d,shell,input,tap,x,y]` / `[...,input,swipe,x1,y1,x2,y2,ms]` | bool | `adb.py:288`、`:304` |
| 文本输入 | `[adb,-s,d,shell,input,text,...]`，空格→`%s`，转义 `\ % ' " $ & | ; < > ( )` | bool | `adb.py:357` |
| 设备信息 | `_DEVICE_INFO_SHELL` 单次拼 model/market/size/density/mem/df/fps → `parse_device_info_payload` | `{device,model,manufacturer,android_version,width,height,density_dpi,refresh_hz,mem_total_mb,cpu_cores,storage_*_gb}` | `adb.py:561`、`:594` |
| 旋转锁定 | `settings put system accelerometer_rotation 0`、`settings put system user_rotation {t}`、`cmd window user-rotation lock {t}` | `RotationResult(ok,rotation,message)` | `adb.py:483` |
| 桌面截图 | `[import,-silent,-display,d,-window,root,-quality,q,jpg:-]` | `CaptureFrame(jpeg_b64,width,height)` | `desktop/capture.py:158-203` |
| 桌面输入 | `[xdotool,*args]`（env `DISPLAY`）；`[xdotool,key,combo]` | bool / `action_result` | `desktop/input.py:89-108`、`:346-359` |
| 浏览器清理 | `[pkill,-9,-f,"user-data-dir={profile_dir}"]`（仅 POSIX） | bool | `browser/setup.py:338-353` |
| Docker 安装 | `sh {bundled install-docker.sh}` + env `DOWNLOAD_URL`（镜像源竞速）；`[docker,version,--format,{{.Server.Version}}]` | SSE 日志键 `docker_hint_*` | `mobile/docker_install.py:102`、`:173`、`:277`、`:309` |

## 4. 返回帧与工具结果字典

`mobile_screenshot → {device,image_base64\|path,format}`；`mobile_tap/swipe → {device,ok}`；`launch_app → {device,exit_code,output}`（`shell "monkey -p {pkg} …"`）；`ui_dump → {device,xml}`（`uiautomator dump`）；错误统一 `{error:str(exc)}`（`mobile/tools.py:76-253`）。设备绑定由 `mobile/agent_control.py:25-56` 产出 `{enabled,device}`。

WS 出站帧：mobile 为 `video_init`（`stream.py:258`）、JPEG `frame`（`:192`）、`action_result`（`:311,:325,:335`）、`error`（`:502`）；desktop 为 `display`（`desktop/stream.py:115`）、`frame`（`:94`）、`action_result`（`:165`）；browser 为 `status/frame(base64 jpeg)/tabs/session_update/error`（`browser/stream.py:20-24`）。

## 5. 共变耦合与修改清单（Co-Change Playbook）

- 改 ADB 参数：`adb.py` 命令构造 → `mobile/tools.py` 工具返回字典 → 前端 `hooks/useMobileStream.ts` / `useAdbShell.ts` 帧解析 → `tests/unit/mobile/`。
- 改截图编码：必须同步 `mobile/stream.py` 的 `video_init`/`frame` 分派与 `dashboard/src/utils/h264CanvasDecoder.ts`，否则画面错帧。
- **特殊陷阱**：`adb` 路径发现依赖 `ANDROID_HOME/ANDROID_SDK_ROOT`（`adb.py:35-36`），CI Windows 用例需用 `tests.support.fakes.fake_bin_path` 造桩；POSIX-only 行为必须带 `@pytest.mark.skipif(os.name != "posix")`（见 [构建与单测](../../operations/dev-and-test.md)）。

## 导航与共变索引

WS 端点见 [设备接口分组契约](../../contracts/api/devices-and-media.md)，协议帧来源见 [UI/CLI 组件](../../architecture/ui-and-cli.md)，宿主工具依赖边界见 [认知边界声明](../../operations/boundary.md)。
