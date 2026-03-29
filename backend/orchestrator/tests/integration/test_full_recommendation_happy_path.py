import pytest
import respx
from httpx import Response

from backend.orchestrator.main import AppInput


@pytest.mark.integration
@respx.mock
def test_full_recommendation_happy_path(client):
    # --- Arrange mocks for downstream agents ---
    # Weather agent
    respx.get("http://weather-agent.test/get_combined_weather/").mock(
        return_value=Response(200, json={
            "district": "Pune",
            "state": "Maharashtra",
            "avg_seasonal_rainfall_mm": 800.0,
            "temperature_celsius": 28.0,
        })
    )

    # Soil agent
    respx.get("http://soil-agent.test/get_soil_data_by_district/").mock(
        return_value=Response(200, json={
            "soil_data": {"N": 50.0, "P": 20.0, "K": 40.0, "pH": 6.8},
            "status": "OK",
        })
    )

    # Recommendation agent
    respx.post("http://recommendation-agent.test/predict_top_crops/").mock(
        return_value=Response(200, json={
            "predictions": [
                {"crop": "rice", "probability": 0.7, "shap_summary": {"rainfall": 0.3}},
                {"crop": "jowar", "probability": 0.5, "shap_summary": {"rainfall": 0.2}},
                {"crop": "tomato", "probability": 0.4, "shap_summary": {"temperature": 0.1}},
            ]
        })
    )

    # Market agent (per crop)
    respx.get("http://market-agent.test/market/evaluate").mock(
        return_value=Response(200, json={"market_score": 80.0})
    )

    # Sustainability agent
    respx.get("http://sustainability-agent.test/sustainability/evaluate").mock(
        return_value=Response(200, json={
            "results": [
                {"crop": "rice", "sustainability_score": 0.6},
                {"crop": "jowar", "sustainability_score": 0.8},
            ]
        })
    )

    # XAI agent
    respx.post("http://xai-agent.test/xai/explain").mock(
        return_value=Response(200, json={
            "agent": "xai_agent",
            "scope": "crop_level",
            "explanations": [
                {"crop_name": "rice", "narrative": "Good for water-rich areas"},
                {"crop_name": "jowar", "narrative": "Good drought tolerance"},
            ],
        })
    )

    # --- Act ---
    payload = {
        "lat": 18.52,
        "lon": 73.86,
        "season": "kharif",
        "mode": "seasonal",
    }
    response = client.post("/get_full_recommendation/", json=payload)

    # --- Assert ---
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "OK"
    assert data["location"] == {"district": "Pune", "state": "Maharashtra"}

    preds = data["recommendations"]["predictions"]
    assert len(preds) > 0

    first = preds[0]
    for key in ["crop", "final_score", "agronomic_score", "market_score", "raw_probability"]:
        assert key in first

    # Sustainability and XAI should be present
    assert data["sustainability"] is not None
    assert data["xai_data"] is not None
