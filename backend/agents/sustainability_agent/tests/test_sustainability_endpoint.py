from typing import List

from fastapi.testclient import TestClient

import main


def test_evaluate_sustainability_single_crop_success(monkeypatch, client: TestClient):
    """Single crop should return a wrapped response with one result entry."""

    def fake_compute(crop: str):  # noqa: ARG001
        return {"crop": "Wheat", "sustainability_score": 0.75}

    monkeypatch.setattr(main, "compute_sustainability", fake_compute, raising=False)

    resp = client.get("/sustainability/evaluate", params={"crops": "Wheat"})
    assert resp.status_code == 200
    data = resp.json()

    assert data["agent"] == "sustainability_scoring"
    assert data["scope"] == "crop_level"
    assert isinstance(data["results"], list)
    assert len(data["results"]) == 1
    assert data["results"][0]["crop"] == "Wheat"


def test_evaluate_sustainability_multiple_crops_mixed_known_unknown(monkeypatch, client: TestClient):
    """Endpoint should drop crops with no data but still succeed if at least one crop is valid."""

    def fake_compute(crop: str):
        if crop == "Wheat":
            return {"crop": "Wheat", "sustainability_score": 0.8}
        if crop == "Rice":
            return {"crop": "Rice", "sustainability_score": 0.7}
        return None

    monkeypatch.setattr(main, "compute_sustainability", fake_compute, raising=False)

    # Pass two crops, one known and one unknown
    resp = client.get("/sustainability/evaluate", params=[("crops", "Wheat"), ("crops", "Unknown")])
    assert resp.status_code == 200
    data = resp.json()

    returned_crops: List[str] = [item["crop"] for item in data["results"]]
    assert "Wheat" in returned_crops
    assert "Unknown" not in returned_crops


def test_evaluate_sustainability_all_unknown_returns_404(monkeypatch, client: TestClient):
    """If all crops are unknown (engine returns None), endpoint should respond with 404."""

    def fake_compute(crop: str):  # noqa: ARG001
        return None

    monkeypatch.setattr(main, "compute_sustainability", fake_compute, raising=False)

    resp = client.get("/sustainability/evaluate", params={"crops": "MysteryCrop"})
    assert resp.status_code == 404
    data = resp.json()
    assert data["detail"] == "No sustainability data found for given crops"


def test_evaluate_sustainability_wraps_string_into_list(monkeypatch, client: TestClient):
    """When a single string is provided, it should be treated as a single-element list."""

    seen: List[str] = []

    def fake_compute(crop: str):
        seen.append(crop)
        return {"crop": crop, "sustainability_score": 0.6}

    monkeypatch.setattr(main, "compute_sustainability", fake_compute, raising=False)

    resp = client.get("/sustainability/evaluate", params={"crops": "Maize"})
    assert resp.status_code == 200
    assert seen == ["Maize"]


def test_evaluate_sustainability_missing_crops_validation_error(client: TestClient):
    """FastAPI should return 422 when the required crops query parameter is missing."""

    resp = client.get("/sustainability/evaluate")
    assert resp.status_code == 422
