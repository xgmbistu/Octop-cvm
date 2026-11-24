# 01 · Clarify — 原生 GET /welcome

## 框架与入口
- 框架：FastAPI（Python 3.12+，包根 `src/octop/`）。
- Web 工厂：`src/octop/api/app.py:101` 的 `build_app(server)`；启动链 `octop.launch` → uvicorn + `build_app`。
- 路由注册两种方式：
  - 直接装饰器路由写在 `app.py`：ACME `/.well-known/...`（:137）、`/api/docs`（:278）、SPA 兜底 `@app.get("/{full_path:path}")`（:290）。
  - 业务 API 经 `_mount_routers` 统一挂 `/api` 前缀（:201–:266）。

## 目标契约
- `GET /welcome` → HTTP 200，`Content-Type: application/json`，body `{"message":"welcome"}`。
- 免登录：JWT 中间件 `jwt_auth.install`（`app.py:132`）只拦 `path.startswith("/api/")`（`jwt_auth.py:43`）；`/welcome` 不在 `/api/` 下，天然豁免，无需改 allowlist。

## 改动范围
- 仅改 `src/octop/api/app.py`：在 `build_app` 内、`if enable_dashboard` 的 SPA 兜底路由（:285–:308）之前注册 `@app.get("/welcome")`。
- 顺序关键：Starlette 按注册顺序匹配，必须早于 catch-all，否则 `/welcome` 被 SPA fallback 吞成 index.html。
- 不改数据库/配置/i18n/CLI/dashboard；不动 auth 中间件；无新增运行依赖。

## 验收条件
1. `build_app` 产出 app 的 routes 中含 GET `/welcome`（原生路由）。
2. `GET /welcome` → 200 + `application/json` + `{"message":"welcome"}`。
3. 无 `Authorization` 头仍返回 200（免登录）。
4. dashboard 开启时同样返回 JSON，未被 SPA catch-all 截获。
5. 契约测试 `tests/test_experience_welcome.py` 通过（平台执行）。
6. `make all` 保持绿（本阶段不跑，由平台验收）。

## 结论
- 契约清晰、改动最小、风险可控；**可进入 Plan**。
