"""Contract test for the native GET /welcome endpoint (Wally experience 03)."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from octop.api.app import build_app


class _FakeServer:
    """Minimal server stub: build_app only needs these two attributes."""

    services = None
    config = None


def _client() -> TestClient:
    # cfg=None -> enable_dashboard=True, so the SPA catch-all is mounted and
    # the route-ordering guarantee is actually exercised.
    return TestClient(build_app(_FakeServer()))  # type: ignore[arg-type]


def test_welcome_is_a_native_get_route() -> None:
    app: FastAPI = build_app(_FakeServer())  # type: ignore[arg-type]
    matched = [
        route
        for route in app.routes
        if getattr(route, "path", None) == "/welcome" and "GET" in getattr(route, "methods", set())
    ]
    assert matched, "GET /welcome must be a registered native route"


def test_welcome_returns_json_message() -> None:
    with _client() as client:
        response = client.get("/welcome")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert response.json() == {"message": "welcome"}


def test_welcome_needs_no_auth_and_beats_spa_fallback() -> None:
    # No Authorization header: /welcome is outside /api/ so JWT and setup
    # middleware let it through, and it is registered before the SPA fallback.
    with _client() as client:
        response = client.get("/welcome", headers={"Accept": "text/html"})

    assert response.status_code == 200
    assert response.json() == {"message": "welcome"}
