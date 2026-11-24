# 03 · Implement — 原生 GET /welcome

## 结论
已完成实现与验证：原生 `GET /welcome` 返回 `200` + `application/json` + `{"message":"welcome"}`，免登录，且不会被 SPA catch-all 截获。契约测试 3 项全部通过。

## 改动文件
1. `src/octop/api/app.py` — 在 `build_app()` 内、ACME 路由之后、SPA 兜底路由 `@app.get("/{full_path:path}")` 之前注册：
   ```python
   @app.get("/welcome", include_in_schema=False)
   async def welcome() -> dict[str, str]:
       return {"message": "welcome"}
   ```
   - 注册顺序早于 `if enable_dashboard:` 的 catch-all，保证返回 JSON 而非 `index.html`。
   - `/welcome` 不以 `/api/` 开头，JWT 与 setup-lockdown 中间件天然放行，无需改 allowlist。
   - `include_in_schema=False`：不污染 `/api/docs` 的 OpenAPI 列表，不影响 HTTP 行为。
2. `tests/test_experience_welcome.py`（新增）— 用 `TestClient(build_app(fake_server))` 验证：
   - `app.routes` 中存在原生 GET `/welcome` 路由；
   - `GET /welcome` → 200、`content-type` 以 `application/json` 开头、`json() == {"message":"welcome"}`；
   - 不带 `Authorization`、且带 `Accept: text/html` 时仍返回 JSON（免登录 + 早于 SPA fallback）。
3. `README.md` — 在 `### Server & auth` 增加接口说明：`GET /welcome` → 200 + `application/json` + `{"message":"welcome"}`（无需登录）。
4. `.wally/experiences/8d5234d0-0746-41c6-a97b-3d381660ab09/runtime.json`（新增）— 平台重跑所需命令：
   - `test`: `python3 -m pytest -q tests/test_experience_welcome.py`
   - `serve`: `python3 -m octop.cli.main run --host 0.0.0.0 --port {port}`

## 环境
- 已在沙箱内 `/workspace/.venv` 创建虚拟环境；`uv sync --extra dev --no-install-package evdev` 安装项目与测试依赖（evdev 需内核头文件，且 /welcome 不涉及该依赖）。

## 测试命令与结果
- 契约测试（实际执行）：
  ```
  PATH=/workspace/.venv/bin:$PATH python -m pytest -q tests/test_experience_welcome.py
  ```
  结果：`3 passed, 1 warning in 6.26s`（warning 为 pytest 配置提示，不影响断言）。
- 服务端冒烟（验证 runtime.json 的 serve 命令，实际执行）：
  ```
  python3 -m octop.cli.main run --host 0.0.0.0 --port 8123
  ```
  结果：`GET /welcome` → `200 application/json {"message":"welcome"}`；日志显示 Uvicorn 监听 `0.0.0.0:8123`。

## 备注
- 未跑全量 `pytest` / `make all`（按任务要求只跑契约测试文件）。
- 无数据库、配置、i18n、CLI、dashboard 改动；无新增运行依赖。
- Git 提交与推送由平台收尾。
