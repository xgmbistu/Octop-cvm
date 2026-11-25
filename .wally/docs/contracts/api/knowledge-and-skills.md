---
kind: api-contract
scope: api-knowledge-and-skills
status: draft
origin: generated
source_paths: [src/octop/api/routers/knowledge_bases.py, src/octop/api/routers/skills.py, src/octop/api/routers/skill_packages.py, src/octop/api/routers/experts.py, src/octop/api/routers/plugins.py, src/octop/api/routers/mbti.py]
symbols: [knowledge_bases, skills, skill_packages, published_experts, plugins, mbti_types]
upstream: [contracts/api-reference.md]
downstream: [integrations/downstream/knowledge-rag.md, architecture/ui-and-cli.md]
---

# 入向接口分组契约：`知识库 / 技能 / 专家 / 插件 / MBTI`

本页展开知识能力与扩展生态的逐端点清单；知识索引链路见 [`knowledge-rag.md`](../../integrations/downstream/knowledge-rag.md)，前端技能市场与 CLI 对应见 [`ui-and-cli.md`](../../architecture/ui-and-cli.md)。

## 1. 知识库（`/api/knowledge-bases/*`）

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| GET | `/api/knowledge-bases/capability` | capability | `src/octop/api/routers/knowledge_bases.py:284` |
| GET | `/api/knowledge-bases/embedding-options` | embedding options | `knowledge_bases.py:292` |
| GET | `/api/knowledge-bases/ocr-options` | OCR options | `knowledge_bases.py:328` |
| PUT | `/api/knowledge-bases/feature` | feature switch | `knowledge_bases.py:359` |
| POST | `/api/knowledge-bases/onnx-download` | download | `knowledge_bases.py:441` |
| GET | `/api/knowledge-bases/onnx-download-status` | status | `knowledge_bases.py:454` |
| POST | `/api/knowledge-bases/onnx-activate` | activate | `knowledge_bases.py:461` |
| POST | `/api/knowledge-bases/onnx-test` | test | `knowledge_bases.py:479` |
| GET | `/api/knowledge-bases` | list | `knowledge_bases.py:492` |
| POST | `/api/knowledge-bases` | create | `knowledge_bases.py:505` |
| GET | `/api/knowledge-bases/default-open` | default open | `knowledge_bases.py:529` |
| GET | `/api/knowledge-bases/{kb_id}` | get | `knowledge_bases.py:546` |
| PATCH | `/api/knowledge-bases/{kb_id}` | update | `knowledge_bases.py:566` |
| DELETE | `/api/knowledge-bases/{kb_id}` | delete | `knowledge_bases.py:595` |
| GET | `/api/knowledge-bases/{kb_id}/documents` | documents | `knowledge_bases.py:614` |
| POST | `/api/knowledge-bases/{kb_id}/folders` | folder | `knowledge_bases.py:638` |
| POST | `/api/knowledge-bases/{kb_id}/documents/text` | add text | `knowledge_bases.py:661` |
| POST | `/api/knowledge-bases/{kb_id}/documents` | upload | `knowledge_bases.py:692` |
| GET | `/api/knowledge-bases/documents/{doc_id}/preview` | preview | `knowledge_bases.py:730` |
| GET | `/api/knowledge-bases/documents/{doc_id}/content` | content | `knowledge_bases.py:751` |
| PUT | `/api/knowledge-bases/documents/{doc_id}/content` | put content | `knowledge_bases.py:772` |
| POST | `/api/knowledge-bases/documents/{doc_id}/rename` | rename | `knowledge_bases.py:801` |
| DELETE | `/api/knowledge-bases/documents/{doc_id}` | delete | `knowledge_bases.py:828` |
| POST | `/api/knowledge-bases/documents/{doc_id}/reindex` | reindex doc | `knowledge_bases.py:850` |
| POST | `/api/knowledge-bases/{kb_id}/reindex` | reindex KB | `knowledge_bases.py:875` |

## 2. 技能与技能包（`/api/agents/{aid}/skills/*`、`/api/skill-packages/*`）

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| GET | `/api/agents/{agent_id}/skills` | list skills | `src/octop/api/routers/skills.py:445` |
| GET | `/api/agents/{agent_id}/skill-packages` | list packages | `skills.py:468` |
| PUT | `/api/agents/{agent_id}/skill-packages` | put packages | `skills.py:504` |
| GET | `/api/agents/{agent_id}/skills/{name}` | get skill | `skills.py:522` |
| POST | `/api/agents/{agent_id}/skills` | add skill | `skills.py:618` |
| PUT | `/api/agents/{agent_id}/skills/{name}` | update skill | `skills.py:663` |
| DELETE | `/api/agents/{agent_id}/skills/{name}` | delete skill | `skills.py:848` |
| POST | `/api/agents/{agent_id}/skills/import` | import | `skills.py:758` |
| POST | `/api/agents/{agent_id}/skills/{name}/enable` | enable | `skills.py:912` |
| POST | `/api/agents/{agent_id}/skills/{name}/disable` | disable | `skills.py:928` |
| GET | `/api/skills/hub/search` | hub search | `skills.py:1077` |
| GET | `/api/skills/hub/rankings` | rankings | `skills.py:1135` |
| POST | `/api/skills/hub/install` | hub install | `skills.py:1171` |
| GET | `/api/skill-packages` | list | `src/octop/api/routers/skill_packages.py:252` |
| GET | `/api/skill-packages/hub/search` | hub search | `skill_packages.py:264` |
| GET | `/api/skill-packages/hub/rankings` | rankings | `skill_packages.py:285` |
| POST | `/api/skill-packages` | create | `skill_packages.py:308` |
| POST | `/api/skill-packages/from-skillhub` | from hub | `skill_packages.py:331` |
| GET | `/api/skill-packages/{package_id}` | get | `skill_packages.py:358` |
| PATCH | `/api/skill-packages/{package_id}` | patch | `skill_packages.py:375` |
| DELETE | `/api/skill-packages/{package_id}` | delete | `skill_packages.py:411` |
| GET | `/api/skill-packages/{package_id}/skills` | skills | `skill_packages.py:428` |
| POST | `/api/skill-packages/{package_id}/skills` | add skill | `skill_packages.py:443` |
| GET | `/api/skill-packages/{package_id}/skills/{slug}` | get skill | `skill_packages.py:464` |
| PUT | `/api/skill-packages/{package_id}/skills/{slug}` | put skill | `skill_packages.py:492` |
| DELETE | `/api/skill-packages/{package_id}/skills/{slug}` | delete skill | `skill_packages.py:515` |
| POST | `/api/skill-packages/skills/import` | import | `skill_packages.py:570` |
| POST | `/api/skill-packages/skills/hub/install` | hub install | `skill_packages.py:650` |

## 3. 专家与插件（`/api/experts/*`、`/api/plugins/*`）

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| GET | `/api/experts/published` | published | `src/octop/api/routers/experts.py:318` |
| GET | `/api/experts/published/{id}/avatar` | avatar | `experts.py:330` |
| GET | `/api/experts/published/{id}` | get | `experts.py:348` |
| POST | `/api/experts/agents/{agent_id}/publish-expert` | publish | `experts.py:374` |
| POST | `/api/experts/published/{id}/refresh` | refresh | `experts.py:411` |
| DELETE | `/api/experts/published/{id}` | delete | `experts.py:455` |
| POST | `/api/experts/published/{id}/install` | install | `experts.py:471` |
| GET | `/api/experts` | list | `experts.py:507` |
| GET | `/api/experts/hub` | hub | `experts.py:518` |
| GET | `/api/experts/hub/{slug}` | hub detail | `experts.py:539` |
| POST | `/api/experts/hub/{slug}/install` | hub install | `experts.py:556` |
| GET | `/api/experts/{expert_id}` | expert detail | `experts.py:623` |
| POST | `/api/experts/agents/from-expert/{expert_id}` | create from expert | `experts.py:636` |
| GET | `/api/plugins` | list | `src/octop/api/routers/plugins.py:97` |
| POST | `/api/plugins/reload` | reload | `plugins.py:105` |
| POST | `/api/plugins/install` | install | `plugins.py:132` |
| POST | `/api/plugins/upload` | upload | `plugins.py:160` |
| PATCH | `/api/plugins/{plugin_id}` | patch | `plugins.py:206` |
| DELETE | `/api/plugins/{plugin_id}` | delete | `plugins.py:225` |
| GET | `/api/plugins/{plugin_id}/ui/{file_path:path}` | UI asset | `plugins.py:237` |
| GET | `/api/plugins/agents/{agent_id}` | agent plugins | `plugins.py:309` |
| PATCH | `/api/plugins/agents/{agent_id}` | patch agent plugins | `plugins.py:324` |
| GET | `/api/plugins/agents/{agent_id}/tools` | plugin tools | `plugins.py:358` |
| PATCH | `/api/plugins/agents/{agent_id}/tools` | patch tools | `plugins.py:409` |

## 4. MBTI（`/api/mbti/*`）

| 方法 | 精确路径 | Handler | 源码锚点 |
|---|---|---|---|
| GET | `/api/mbti/current` | current | `src/octop/api/routers/mbti.py:151` |
| GET | `/api/mbti/types` | types | `mbti.py:174` |
| GET | `/api/mbti/types/{code}` | one type | `mbti.py:187` |
| GET | `/api/mbti/preview/{code}` | preview | `mbti.py:204` |
| GET | `/api/mbti/test/questions` | questions | `mbti.py:589` |
| POST | `/api/mbti/test/submit` | submit | `mbti.py:676` |
| POST | `/api/mbti/apply` | apply | `mbti.py:742` |

## 5. 共变耦合与修改清单（Co-Change Playbook）

1. 知识端点改动：`knowledge_bases.py` → `infra/knowledge/jobs.py:34` 索引作业 → `tests/integration/test_knowledge_bases_api.py`。
2. 技能/插件端点改动：`infra/skills/`、`infra/agents/plugins/manager.py` → 版本嗅探兼容分支 → `tests/unit/skills/`；插件 ZIP 必须自带预构建 `ui/dist`（见 [`boundary.md`](../../operations/boundary.md)）。
3. 新增 MBTI 类型：`mbti_profiles.py` 数据 + i18n `mbti.*` 文案（见 [`glossary.md`](../../overview/glossary.md)）。
