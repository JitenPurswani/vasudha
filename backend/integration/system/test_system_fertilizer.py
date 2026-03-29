import pytest


pytestmark = pytest.mark.system


def test_system_fertilizer_basic_flow(http_client, base_urls):
    """End-to-end test of orchestrator /fertilizer hitting the real agent.

    Preconditions:
    - Orchestrator is running on ORCHESTRATOR_URL.
    - Fertilizer agent is running on FERTILIZER_AGENT_URL and has access to
      its rainfall DB / config files.
    """
    url = f"{base_urls['orchestrator']}/fertilizer"

    body = {
        "crop": "wheat",
        "lat": 18.52,
        "lon": 73.86,
        "crop_age_days": 45,
        "current_n": 40.0,
        "current_p": 15.0,
        "current_k": 35.0,
        "current_ph": 6.5,
        "season": "rabi",
    }

    resp = http_client.post(url, json=body)

    # Either a successful recommendation or a structured error from the agent
    assert resp.status_code == 200
    data = resp.json()

    assert "status" in data
    status = data["status"]

    # The fertilizer agent may currently use either "ok" or "success" to
    # denote a successful recommendation. Treat both as success cases.
    if status in {"ok", "success"}:
        # Basic structural expectations on successful payloads.
        # The live fertilizer agent currently nests details under `data`.
        fert_data = data.get("data") or {}
        assert fert_data.get("crop") == "wheat"
        # Deficit information should be present for at least N/P/K
        assert isinstance(fert_data.get("deficit_kg_ha"), dict)
        # Input echo should be present
        assert isinstance(fert_data.get("input"), dict)
        # Rainfall context may be present depending on pipeline; if present, it should be a dict
        if "rainfall_context" in fert_data:
            assert isinstance(fert_data["rainfall_context"], dict)
    else:
        # For error responses we just ensure a clear error contract
        assert status == "error"
        assert "error" in data
