import math

import httpx
import pytest


pytestmark = pytest.mark.system


def test_system_full_recommendation_basic_flow(http_client, base_urls):
    """End-to-end test hitting the live orchestrator + agents stack.

    Preconditions:
    - Orchestrator is running on ORCHESTRATOR_URL (default http://localhost:8000).
    - Weather, soil, recommendation, market, sustainability, and XAI agents
      are running on their configured ports (e.g., via the VS Code "Start All Services" task).
    """
    url = f"{base_urls['orchestrator']}/get_full_recommendation/"

    payload = {
        "lat": 18.52,
        "lon": 73.86,
        "season": "kharif",
        "mode": "seasonal",
    }

    try:
        resp = http_client.post(url, json=payload)
    except httpx.ReadTimeout:
        pytest.skip("/get_full_recommendation timed out; ensure orchestrator and all agents are running")
    assert resp.status_code == 200

    data = resp.json()
    assert data.get("status") == "OK"

    # Basic location sanity
    loc = data.get("location") or {}
    assert "district" in loc and isinstance(loc["district"], str)
    assert "state" in loc and isinstance(loc["state"], str)

    recs = (data.get("recommendations") or {}).get("predictions") or []
    # At least one recommended crop
    assert len(recs) >= 1

    # Check a few structural properties of the top recommendation
    top = recs[0]
    for key in ["crop", "final_score", "agronomic_score", "raw_probability"]:
        assert key in top

    # Scores should be finite numbers
    assert isinstance(top["final_score"], (int, float)) and math.isfinite(top["final_score"])
    assert isinstance(top["agronomic_score"], (int, float)) and math.isfinite(top["agronomic_score"])
    assert isinstance(top["raw_probability"], (int, float)) and 0.0 <= top["raw_probability"] <= 1.0

    # Sustainability and XAI sections should either be null or structurally valid objects
    # We avoid brittle deep checks; this is a coarse contract test.
    # Just ensure keys exist and types are consistent if present.
    if data.get("sustainability") is not None:
        assert isinstance(data["sustainability"], dict)

    if data.get("xai_data") is not None:
        assert isinstance(data["xai_data"], dict)


@pytest.mark.system
def test_system_full_recommendation_idempotent_for_same_input(http_client, base_urls):
    """Calling the same input twice should be stable at a high level.

    We only assert on high-level properties like same top crop name,
    not exact scores, to avoid brittleness.
    """
    url = f"{base_urls['orchestrator']}/get_full_recommendation/"

    payload = {
        "lat": 18.52,
        "lon": 73.86,
        "season": "kharif",
        "mode": "seasonal",
    }

    try:
        resp1 = http_client.post(url, json=payload)
        resp2 = http_client.post(url, json=payload)
    except httpx.ReadTimeout:
        pytest.skip("/get_full_recommendation timed out; ensure orchestrator and all agents are running")

    assert resp1.status_code == 200
    assert resp2.status_code == 200

    data1 = resp1.json()
    data2 = resp2.json()

    recs1 = (data1.get("recommendations") or {}).get("predictions") or []
    recs2 = (data2.get("recommendations") or {}).get("predictions") or []

    assert len(recs1) >= 1
    assert len(recs2) >= 1

    # Top crop should be the same across calls, even if scores vary slightly
    assert recs1[0]["crop"] == recs2[0]["crop"]
