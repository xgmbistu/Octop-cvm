#!/usr/bin/env python3
"""Verify documentation accuracy for the Octop repository.

Run from any working directory::

    python3 scripts/check_docs.py

This is the verification entry point for the ``knowledge.accuracy`` check.
It performs two offline, stdlib-only checks:

1. Every local Markdown link in README*.md and docs/**/*.md must resolve to a
   real file in the repository. External URLs, in-page anchors and mailto
   links cannot be verified offline and are reported as unverifiable scope.
2. A fixed, ordered set of up to five key claims from the docs is re-checked
   against the actual source and configuration, so the same samples can be
   re-verified on every run.

Exit code 0 = all checks passed, 1 = at least one problem found.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRIMARY_DOCS = (ROOT / "README.md", ROOT / "README_CN.md")
DOC_FILES = [*PRIMARY_DOCS, *sorted((ROOT / "docs").rglob("*.md"))]

LINK_RE = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
EXTERNAL_PREFIXES = ("http://", "https://", "mailto:", "data:", "//")


def _split_links(text):
    """Return (local_targets, unverifiable_count)."""
    local, unverifiable = [], 0
    for raw in LINK_RE.findall(text):
        target = raw.strip().strip("<>")
        target = re.split(r"\s+[\"']", target, maxsplit=1)[0].strip()
        if not target or target.startswith(EXTERNAL_PREFIXES):
            unverifiable += 1
            continue
        if target.startswith("#") or target.startswith("/"):
            unverifiable += 1
            continue
        target = target.split("#", 1)[0]
        if not target or "{" in target or "}" in target:
            unverifiable += 1
            continue
        local.append(target)
    return local, unverifiable


def check_links():
    checked = unverifiable = 0
    broken = []
    for doc in DOC_FILES:
        if not doc.is_file():
            broken.append(f"missing entry document: {doc.name}")
            continue
        local, skipped = _split_links(doc.read_text(encoding="utf-8"))
        unverifiable += skipped
        for target in local:
            checked += 1
            if not (doc.parent / target).exists():
                broken.append(f"{doc.relative_to(ROOT).as_posix()} -> {target}")
    return checked, unverifiable, broken


def _contains(rel_path, *tokens):
    text = (ROOT / rel_path).read_text(encoding="utf-8")
    return all(token in text for token in tokens)


def _db_row_is_current():
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    return "aiosqlite" not in readme and "PostgreSQL" in readme


CLAIMS = [
    (
        "README 'Full setup: docs/acp.md' points to a real guide",
        lambda: (ROOT / "docs" / "acp.md").is_file(),
    ),
    (
        "README Core Technology (Python 3.12+, hatchling/ruff/mypy/pytest) matches pyproject.toml",
        lambda: _contains(
            "pyproject.toml",
            'requires-python = ">=3.12"',
            "hatchling",
            "ruff",
            "mypy",
            "pytest",
        ),
    ),
    (
        "ADR 002 dual backend matches src/octop/infra/db/pool.py (sqlite3 + psycopg_pool)",
        lambda: _contains("src/octop/infra/db/pool.py", "import sqlite3", "psycopg_pool"),
    ),
    (
        "README control-plane DB row is current (no stale 'via aiosqlite')",
        _db_row_is_current,
    ),
    (
        "AGENTS.md ship bar 'make all' matches the Makefile target",
        lambda: _contains("Makefile", "all: format-all lint typecheck test"),
    ),
]


def main():
    print("== Octop documentation accuracy check (knowledge.accuracy:repository) ==")

    checked, unverifiable, broken = check_links()
    print(f"[links] local checked={checked} broken={len(broken)}")
    print(f"[scope] unverifiable (external URLs / anchors): {unverifiable}")
    for item in broken:
        print(f"  BROKEN {item}")

    failures = len(broken)
    print(f"[claims] re-checking {len(CLAIMS)} fixed samples in order:")
    for index, (label, check) in enumerate(CLAIMS, start=1):
        try:
            ok = bool(check())
        except OSError as exc:
            ok = False
            label = f"{label} ({exc})"
        print(f"  [{index}/{len(CLAIMS)}] {'PASS' if ok else 'FAIL'}  {label}")
        if not ok:
            failures += 1

    print("[recheck samples] " + "; ".join(label for label, _ in CLAIMS))
    if failures:
        print(f"RESULT: FAIL ({failures} problem(s))")
        return 1
    print("RESULT: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
