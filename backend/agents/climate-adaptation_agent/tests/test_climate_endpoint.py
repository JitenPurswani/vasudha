from typing import List

from fastapi.testclient import TestClient

import main


def _make_client() -> TestClient:
    return TestClient(main.app)


def test_climate_adapt_happy_path_with_explanation(monkeypatch):
    """Happy path: supported crop, successful geocoding and weather, risks present, explanation enabled."""

    client = _make_client()

    # Minimal crop profile; actual contents are not used because run_climate_adaptation is mocked
    monkeypatch.setattr(main, "CROP_PROFILES", {"wheat": {"profile": "dummy"}}, raising=False)

    def fake_reverse_geocode(lat: float, lon: float) -> str:  # noqa: ARG001
        return "Pune"

    def fake_fetch_weather_context(lat: float, lon: float, district: str, season: str):  # noqa: ARG001
        weather_context = {
            "temp_current": 25.0,
            "humidity": 70.0,
            "temp_forecast_max": 32.0,
            "temp_forecast_min": 20.0,
            "seasonal_rainfall": 750.0,
        }
        debug_weather = {"source": "fake"}
        return weather_context, debug_weather

    def fake_run_climate_adaptation(weather_context, crop_profile):  # noqa: ARG001
        return {"status": "ok", "risks": [{"risk": "Heat Stress"}]}

    def fake_groq_explain(crop: str, risks: list) -> str:  # noqa: ARG001
        return "Sample explanation"

    monkeypatch.setattr(main, "reverse_geocode", fake_reverse_geocode, raising=False)
    monkeypatch.setattr(main, "fetch_weather_context", fake_fetch_weather_context, raising=False)
    monkeypatch.setattr(main, "run_climate_adaptation", fake_run_climate_adaptation, raising=False)
    monkeypatch.setattr(main, "groq_explain", fake_groq_explain, raising=False)

    payload = {
        "crop": "wheat",
        "lat": 18.5,
        "lon": 73.9,
        "season": "kharif",
        "explain": True,
    }

    resp = client.post("/climate/adapt", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "ok"
    assert data["risks"] == [{"risk": "Heat Stress"}]
    assert data["explanation"] == "Sample explanation"

    debug = data["debug"]
    assert debug["location"]["district"] == "Pune"
    assert debug["crop_used"] == "wheat"
    assert debug["weather_context_used"]["temp_current"] == 25.0


def test_climate_adapt_explain_flag_false_skips_explanation(monkeypatch):
    """When explain is False, groq_explain should not be called and explanation should be null."""

    client = _make_client()

    monkeypatch.setattr(main, "CROP_PROFILES", {"wheat": {"profile": "dummy"}}, raising=False)

    def fake_reverse_geocode(lat: float, lon: float) -> str:  # noqa: ARG001
        return "Pune"

    def fake_fetch_weather_context(lat: float, lon: float, district: str, season: str):  # noqa: ARG001
        return {"ctx": True}, {"debug": True}

    def fake_run_climate_adaptation(weather_context, crop_profile):  # noqa: ARG001
        return {"status": "ok", "risks": [{"risk": "Heat Stress"}]}

    calls: List[str] = []

    def fake_groq_explain(crop: str, risks: list) -> str:  # noqa: ARG001
        calls.append("called")
        return "Should not be used"

    monkeypatch.setattr(main, "reverse_geocode", fake_reverse_geocode, raising=False)
    monkeypatch.setattr(main, "fetch_weather_context", fake_fetch_weather_context, raising=False)
    monkeypatch.setattr(main, "run_climate_adaptation", fake_run_climate_adaptation, raising=False)
    monkeypatch.setattr(main, "groq_explain", fake_groq_explain, raising=False)

    payload = {
        "crop": "wheat",
        "lat": 18.5,
        "lon": 73.9,
        "season": "rabi",
        "explain": False,
    }

    resp = client.post("/climate/adapt", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["explanation"] is None
    assert calls == []


def test_climate_adapt_unsupported_crop_returns_400(monkeypatch):
    client = _make_client()

    # No supported crops
    monkeypatch.setattr(main, "CROP_PROFILES", {}, raising=False)

    payload = {
        "crop": "unknown_crop",
        "lat": 18.5,
        "lon": 73.9,
        "season": "kharif",
    }

    resp = client.post("/climate/adapt", json=payload)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Unsupported crop"


def test_climate_adapt_reverse_geocode_failure_returns_400(monkeypatch):
    client = _make_client()

    monkeypatch.setattr(main, "CROP_PROFILES", {"wheat": {"profile": "dummy"}}, raising=False)

    def failing_reverse_geocode(lat: float, lon: float) -> str:  # noqa: ARG001
        raise ValueError("District not found")

    monkeypatch.setattr(main, "reverse_geocode", failing_reverse_geocode, raising=False)

    payload = {
        "crop": "wheat",
        "lat": 18.5,
        "lon": 73.9,
        "season": "kharif",
    }

    resp = client.post("/climate/adapt", json=payload)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "District not found"


def test_climate_adapt_weather_context_failure_returns_500(monkeypatch):
    client = _make_client()

    monkeypatch.setattr(main, "CROP_PROFILES", {"wheat": {"profile": "dummy"}}, raising=False)

    def fake_reverse_geocode(lat: float, lon: float) -> str:  # noqa: ARG001
        return "Pune"

    def failing_fetch_weather_context(lat: float, lon: float, district: str, season: str):  # noqa: ARG001
        raise RuntimeError("Weather service failure")

    monkeypatch.setattr(main, "reverse_geocode", fake_reverse_geocode, raising=False)
    monkeypatch.setattr(main, "fetch_weather_context", failing_fetch_weather_context, raising=False)

    payload = {
        "crop": "wheat",
        "lat": 18.5,
        "lon": 73.9,
        "season": "kharif",
    }

    resp = client.post("/climate/adapt", json=payload)
    assert resp.status_code == 500
    assert "Weather service failure" in resp.json()["detail"]


def test_climate_adapt_validation_error_for_missing_fields():
    client = _make_client()

    # Missing required fields like lat, lon, season
    resp = client.post("/climate/adapt", json={"crop": "wheat"})
    assert resp.status_code == 422
