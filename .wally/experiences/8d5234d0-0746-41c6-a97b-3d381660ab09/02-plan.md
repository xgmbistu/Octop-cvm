# 02 · Plan — 原生 GET /welcome

## 实现步骤
1. 在 `src/octop/api/app.py` 的 `build_app` 中，紧随 ACME 路由之后（:142 后）新增：
   ```python
   @app.get("/welcome")
   async def welcome() -> dict[str, str]:
       return {"message": "welcome"}
   ```
   FastAPI 自动序列化为 200 + `application/json`。
2. 确认注册位置早于 `if enable_dashboard:` 的 `@app.get("/{full_path:path}")`（:290），避免被 SPA fallback 截获。
3. 不改 `jwt_auth.py`：`/welcome` 不匹配 `/api/`，自动免登录。

## 具体文件与命令
- 唯一源码改动：`src/octop/api/app.py`（约 +4 行）。
- 验证（平台执行，本阶段不跑）：
  - `uv run pytest tests/test_experience_welcome.py -q`
  - `make all`（format-all + lint + typecheck + test）
  - `cd dashboard && npx tsc --noEmit`（本项目未动前端，可跳过）

## 契约测试方案
- 沿用平台固定 `tests/test_experience_welcome.py`：用 `TestClient(build_app(fake_server))` 发 `GET /welcome`。
- 断言：`status_code==200`；`content-type` 以 `application/json` 开头；`response.json()=={"message":"welcome"}`。
- 覆盖免登录（不带 `Authorization`）与 dashboard 开启顺序（仍返回 JSON）两点。
- 本阶段不新增/修改测试文件，只让现有契约测试通过。

## runtime.json 形状（建议，最终以平台为准）
```json
{
  "experience_id": "8d5234d0-0746-41c6-a97b-3d381660ab09",
  "mode": "repository",
  "base_sha": "deb7ac81e89b8779fec59378684582efcde70d43",
  "command": "uv run octop run",
  "port": 8000,
  "probe": { "method": "GET", "path": "/welcome" },
  "expect": { "status": 200, "content_type": "application/json", "body": { "message": "welcome" } },
  "test_command": "uv run pytest tests/test_experience_welcome.py -q"
}
```

## 回滚要点
- 删除 `app.py` 中新增的 `welcome` 路由块即可；无其他文件改动，无 schema/依赖变更。
- 回滚后 `build_app` 恢复原状；Git 提交与推送由平台收尾，无需人工操作。
- 唯一风险点是路由顺序：若误放在 SPA catch-all 之后会返回 `index.html`（text/html）导致失败——放在 :142 之后即可规避。
