import pytest
import respx
from httpx import Response

from backend.orchestrator.main import FertilizerInput


@pytest.mark.integration
@respx.mock
def test_fertilizer_happy_path(client):
    # Mock fertilizer agent successful response
    respx.post("http://fertilizer-agent.test/fertilizer/recommend").mock(
        return_value=Response(200, json={
            "status": "ok",
            "crop": "wheat",
            "tools": [
                {"name": "Compost", "quantity_kg": 200},
            ],
            "rainfall_context": {"seasonal_mm": 600},
        })
    )

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

    response = client.post("/fertilizer", json=body)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ok"
    assert data["crop"] == "wheat"
    assert data["tools"][0]["name"] == "Compost"


@pytest.mark.integration
@respx.mock
def test_fertilizer_agent_error_is_wrapped(client):
    # Mock fertilizer agent returning non-200
    respx.post("http://fertilizer-agent.test/fertilizer/recommend").mock(
        return_value=Response(500, json={"detail": "Internal error"})
    )

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

    response = client.post("/fertilizer", json=body)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "error"
    assert "returned 500" in data["error"]
    assert "Internal error" in data["detail"]
