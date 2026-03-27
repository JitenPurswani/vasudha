from typing import List

from fastapi.testclient import TestClient

import main
from schemas import XAIRequest, RecommendationItem, SHAPSummary, SustainabilityItem


def _make_client() -> TestClient:
    return TestClient(main.app)


def _base_request() -> XAIRequest:
    shap = SHAPSummary(
        top_positive_features=["rainfall"],
        top_negative_features=["temperature"],
        neutral_features=["soil_ph"],
    )

    rec = RecommendationItem(
        crop="Wheat",
        final_score=0.9,
        agronomic_score=0.8,
        market_score=0.7,
        raw_probability=0.95,
        shap_summary=shap,
    )

    sustain = SustainabilityItem(
        crop="Wheat",
        sustainability_score=0.82,
        explanation={"summary": "Good sustainability"},
    )

    return XAIRequest(
        location={"state": "Maharashtra", "district": "Pune"},
        recommendations=[rec],
        sustainability=[sustain],
    )


def test_xai_explain_happy_path(monkeypatch):
    """Endpoint should accept a valid request and return structured explanations."""

    client = _make_client()

    base_req = _base_request()

    # Avoid exercising the full reasoning engine; just verify wiring
    # and that the response conforms to XAIResponse schema.
    def fake_generate_xai_response(recommendations, sustainability_results):  # noqa: ARG001
        return [
            {
                "crop": "Wheat",
                "model_explanation": [
                    {
                        "feature": "rainfall",
                        "effect": "positive",
                        "reason": "Favorable rainfall supports this crop.",
                    }
                ],
                "market_explanation": "Market conditions are favorable.",
                "sustainability_explanation": "Sustainability profile is acceptable.",
                "summary": "Economically viable, environmentally acceptable, supported by soil and climate conditions.",
            }
        ]

    monkeypatch.setattr(main, "generate_xai_response", fake_generate_xai_response, raising=False)

    resp = client.post("/xai/explain", json=base_req.model_dump())
    assert resp.status_code == 200
    data = resp.json()

    assert data["agent"] == "xai_agent"
    assert data["scope"] == "crop_level"
    assert isinstance(data["explanations"], list)
    assert data["explanations"][0]["crop"] == "Wheat"


def test_xai_explain_handles_missing_sustainability(monkeypatch):
    """Sustainability can be omitted; endpoint should still succeed and call reasoning engine with None."""

    client = _make_client()

    base_req = _base_request()
    base_req.sustainability = None

    captured_args: List = []

    def fake_generate_xai_response(recommendations, sustainability_results):
        captured_args.append((recommendations, sustainability_results))
        return []

    monkeypatch.setattr(main, "generate_xai_response", fake_generate_xai_response, raising=False)

    resp = client.post("/xai/explain", json=base_req.model_dump())
    assert resp.status_code == 200

    assert len(captured_args) == 1
    recs, sustain = captured_args[0]
    assert isinstance(recs, list)
    assert sustain is None or sustain == []


def test_xai_explain_invalid_payload_returns_422(client: TestClient):
    """FastAPI should return 422 for structurally invalid requests."""

    # Missing required 'recommendations' field
    resp = client.post("/xai/explain", json={"location": {"state": "MH"}})
    assert resp.status_code == 422


def test_xai_explain_internal_error_returns_500(monkeypatch):
    """If reasoning engine raises an exception, endpoint should wrap it in a 500 HTTPException."""

    client = _make_client()
    base_req = _base_request()

    def failing_generate_xai_response(recommendations, sustainability_results):  # noqa: ARG001
        raise RuntimeError("Reasoning failure")

    monkeypatch.setattr(main, "generate_xai_response", failing_generate_xai_response, raising=False)

    resp = client.post("/xai/explain", json=base_req.model_dump())
    assert resp.status_code == 500
    assert "Reasoning failure" in resp.json()["detail"]
