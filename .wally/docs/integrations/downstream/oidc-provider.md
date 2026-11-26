---
kind: downstream-contract
scope: oidc-provider
status: draft
origin: generated
source_paths: [src/octop/infra/auth/sso/discovery.py, src/octop/infra/auth/sso/id_token.py, src/octop/infra/auth/sso/service.py, src/octop/api/routers/auth_oidc.py]
symbols: [fetch_discovery, _endpoint, exchange_code, verify_id_token, _CACHE_TTL_SECONDS, _ALLOWED_ALGORITHMS]
upstream: [../index.md, ../topology-and-mapping.md, ../../business/setup-wizard.md]
downstream: []
---

# 下游出向接口契约：`oidc-provider`（OIDC 发现 / 改码 / JWKS 校验）

OIDC 单点登录链路分三步：`discovery.py` 拉取 `.well-known/openid-configuration`（TTL 3600 缓存），`service.py` 用授权码换 `id_token`，`id_token.py` 取 `jwks_uri` 公钥并校验签名/`nonce`。业务封装全部在 `src/octop/infra/auth/sso/`。

## 1. 封装定位与连接契约

| 契约项 | 精确值 / 规则 | 源码锚点（路径:行号） |
|---|---|---|
| 本仓业务封装文件 | `src/octop/infra/auth/sso/{discovery,id_token,service}.py` | 请求字典组装与返回解包层 |
| 底层传输 | `httpx`，`httpx.Timeout(10.0, connect=5.0)` | `src/octop/infra/auth/sso/service.py:32` |
| 发现端点 | `GET {issuer}/.well-known/openid-configuration` | `src/octop/infra/auth/sso/discovery.py:18-27` |
| 发现缓存 | `_CACHE_TTL_SECONDS = 3600` | `src/octop/infra/auth/sso/discovery.py:11`、`:44` |
| 校验算法 | `_ALLOWED_ALGORITHMS = ("RS256","ES256")` | `src/octop/infra/auth/sso/id_token.py:11`、`:16` |
| 成功判定 | `discovery["issuer"]` 匹配 + `claims["nonce"]` 一致 + JWT 签名有效 | `src/octop/infra/auth/sso/discovery.py:18-27`、`src/octop/infra/auth/sso/id_token.py:47-57` |

## 2. 本仓上游调用方反查表

| 本仓封装方法 | 上游调用模块与函数 | 所属接口 | 调用点锚点（路径:行号） |
|---|---|---|---|
| `fetch_discovery` | `SSOService` 构造 | `GET/PUT /api/auth/oidc/config` | `src/octop/api/routers/auth_oidc.py:158`、`:168` |
| `exchange_code` | OIDC 回调 | `GET /api/auth/oidc/callback` | `src/octop/api/routers/auth_oidc.py:109` |
| `verify_id_token` | 同上 | 登录态建立 | `src/octop/infra/auth/sso/service.py:325` |
| SSO 配置持久化 | `sso_repo` | `/api/auth/oidc/*` | `src/octop/infra/db/repos/sso.py:70` |

## 3. 封装方法总清单

| 序号 | 封装函数 | 下游目标 | 读写 | 超时 | 定义锚点 |
|---|---|---|---|---|---|
| 1 | `fetch_discovery(issuer, httpx_client)` | `GET /.well-known/openid-configuration` | 读 | `10.0s` | `src/octop/infra/auth/sso/discovery.py:18-27` |
| 2 | `exchange_code` | `POST token_endpoint` | 读写 | `10.0s` | `src/octop/infra/auth/sso/service.py:288-320` |
| 3 | `verify_id_token` | `GET jwks_uri` + 本地 JWT 校验 | 读 | `10.0s` | `src/octop/infra/auth/sso/id_token.py:23-57` |

## 4. 逐方法请求字典与响应解包契约（Full Dict Schemas）

### 4.1 发现文档（`src/octop/infra/auth/sso/discovery.py:18-27`）

| 返回键 | 类型 | 本仓解包规则 | 行号 |
|---|---|---|---|
| `discovery["issuer"]` | `str` | 必须与配置 issuer 一致，否则拒绝 | `src/octop/infra/auth/sso/discovery.py:18-27` |
| `discovery["authorization_endpoint"]` | `str` | 授权跳转 | `src/octop/infra/auth/sso/service.py:120` |
| `discovery["token_endpoint"]` | `str` | 改码地址 | `src/octop/infra/auth/sso/service.py:311` |
| `discovery["jwks_uri"]` | `str` | 公钥地址 | `src/octop/infra/auth/sso/service.py:139`、`src/octop/infra/auth/sso/id_token.py:23` |

### 4.2 授权码改码 → `POST token_endpoint`（`src/octop/infra/auth/sso/service.py:288-320`）

#### A. 发往下游的表单字典

```json
{"grant_type": "authorization_code", "code": "<code>", "redirect_uri": "<uri>", "client_id": "<id>", "code_verifier": "<verifier>"}
```

| 下游字典键 | 类型 | 必填 | 固定值 / 条件键 | 行号 |
|---|---|---|---|---|
| `grant_type` | `str` | 是 | `"authorization_code"` | `src/octop/infra/auth/sso/service.py:288` |
| `code` | `str` | 是 | 回调 query | `src/octop/infra/auth/sso/service.py:288` |
| `redirect_uri` | `str` | 是 | 与授权请求一致 | `src/octop/infra/auth/sso/service.py:288` |
| `client_id` | `str` | 是 | SSO 配置 | `src/octop/infra/auth/sso/service.py:288` |
| `code_verifier` | `str` | 是 | PKCE | `src/octop/infra/auth/sso/service.py:288` |
| `client_secret` | `str` | 条件 | 机密客户端才写入 | `src/octop/infra/auth/sso/service.py:299` |
| `resource` | `str` | 条件 | 可选透传 | `src/octop/infra/auth/sso/service.py:299` |

#### B. 返回解包规则

| 返回键 | 类型 | 解包规则 | 行号 |
|---|---|---|---|
| `token["id_token"]` | `str` | 交给 `verify_id_token` | `src/octop/infra/auth/sso/service.py:318-320` |
| `token["access_token"]` | `str` | 可选消费 | `src/octop/infra/auth/sso/service.py:318` |

### 4.3 JWKS 与 ID Token 校验（`src/octop/infra/auth/sso/id_token.py:23-57`）

| 项 | 精确值 | 行号 |
|---|---|---|
| `jwks["keys"]` | 按 header `kid` 匹配公钥 | `src/octop/infra/auth/sso/id_token.py:23-33` |
| `alg` | 仅 `RS256`/`ES256` | `src/octop/infra/auth/sso/id_token.py:11`、`:16-21` |
| `jwt.decode(..., audience=client_id, issuer=issuer, leeway=60, options={"require":["exp","iat"]})` | 固定校验参数 | `src/octop/infra/auth/sso/id_token.py:47` |
| `claims["nonce"]` | 必须与登录态 nonce 一致 | `src/octop/infra/auth/sso/id_token.py:57` |
| 错误枚举 | `OIDC_BAD_REQUEST(400)`、`AUTH_FAILED(401)` | `src/octop/infra/errors.py:174`、`:14` |

### 4.4 下游错误码拦截与翻译

| 下游条件 | 本仓转换 | 行号 |
|---|---|---|
| `issuer` 不匹配 | 拒绝登录（`OIDC_BAD_REQUEST`） | `src/octop/infra/auth/sso/discovery.py:18-27` |
| `alg` 非白名单 / `nonce` 不符 | 拒绝登录（`AUTH_FAILED`） | `src/octop/infra/auth/sso/id_token.py:16-21`、`:57` |
| 改码 HTTP 失败 | `AUTH_FAILED` + `auth.oidc_login` 审计 | `src/octop/infra/auth/sso/service.py:247` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

- **改 OIDC 参数**：改 `src/octop/infra/auth/sso/service.py:288` 表单 → 核对 `src/octop/infra/auth/sso/discovery.py:18-27` 端点解包与 `src/octop/infra/auth/sso/id_token.py:47-57` 校验 → 更新 [`../index.md`](../index.md) 与 [`../../contracts/error-codes.md`](../../contracts/error-codes.md) → 跑 `uv run pytest tests/unit/auth -q`。
- **特殊协议陷阱**：发现文档带 `3600s` 缓存，远端配置变更后需等缓存过期或重启；`leeway=60` 与 `require=["exp","iat"]` 固定；`client_secret`/`resource` 为条件键，不能无条件写入；PKCE `code_verifier` 必填。
- **凭据纪律**：`client_secret` 走 `sso_providers`/`secrets` 表，`id_token` 不写日志（[`../../contracts/configuration.md`](../../contracts/configuration.md)）。
