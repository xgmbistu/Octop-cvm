# 06 · Review + Commit — 原生 GET /welcome

## 批准结论
**批准（approved=true）。** 改动满足契约，范围最小，无阻断性发现（findings 为空）。

## 基线对照（git diff）
- 基线 SHA：`deb7ac81e89b8779fec59378684582efcde70d43`（取自阶段目录 `baseline-sha`）。
- 共 10 个文件、+194 行；生产源码仅 1 个文件、+4 行。
- 生产改动：`src/octop/api/app.py` 在 `build_app()` 内注册
  ```python
  @app.get("/welcome", include_in_schema=False)
  async def welcome() -> dict[str, str]:
      return {"message": "welcome"}
  ```
- 契约测试：`tests/test_experience_welcome.py`（新增，3 项断言）。
- 文档/配置：`README.md` 增接口说明；stage 文档（00–05）、`runtime.json`、`test-output.txt`、`http-results.json`、`baseline-sha`。

## 审查要点
1. **契约符合**：FastAPI 将返回 dict 序列化为 `200` + `application/json` + `{"message":"welcome"}`。
2. **路由顺序正确**：`/welcome` 注册于 `app.py:144`，早于 SPA 兜底 `@app.get("/{full_path:path}")`（`app.py:294`）；Starlette 按注册顺序匹配，不会被 `index.html` 截获。实测带 `Accept: text/html` 仍返回 JSON。
3. **免登录成立**：`/welcome` 不在 `/api/` 下，JWT / setup-lockdown 中间件放行，无需改 allowlist；实测不带 `Authorization` 仍为 200。
4. **边界与副作用可控**：`include_in_schema=False` 不污染 OpenAPI；未改数据库、配置、i18n、CLI、dashboard；无新增运行依赖。
5. **可回滚**：删除该 4 行路由块即可恢复原状，无 schema / 依赖变更。

## 验证证据
- 契约测试（Review 阶段于当前工作树重跑，仅允许该文件）：
  `PATH=/workspace/.venv/bin:$PATH python -m pytest -q tests/test_experience_welcome.py`
  → `3 passed, 1 warning in 5.57s`（warning 为 pytest `asyncio_mode` 未知配置提示，不影响断言）。
- 实现阶段记录（`test-output.txt`）：`3 passed, 1 warning in 5.63s`。
- 真实 HTTP 探测（`http-results.json`）：`GET http://127.0.0.1:32774/welcome` → `status=200`，`content_type=application/json`，`body={"message":"welcome"}`。
- 未跑全量 pytest / `make all`（按任务要求只跑契约测试文件，契合本体验范围）。

## 交付物
- `review.json`：`{"approved": true, "findings": []}`
- 本文件 `06-review-commit.md`

Git 提交与推送由平台收尾；交付齐全即停止。
