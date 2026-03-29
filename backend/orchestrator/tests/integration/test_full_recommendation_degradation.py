import pytest
import respx
from httpx import Response


@pytest.mark.integration
@respx.mock
def test_full_recommendation_market_failure_graceful(client):
    # Weather + soil + rec happy
    respx.get("http://weather-agent.test/get_combined_weather/").mock(
        return_value=Response(200, json={
            "district": "Pune",
            "state": "Maharashtra",
            "avg_seasonal_rainfall_mm": 800.0,
            "temperature_celsius": 28.0,
        })
    )

    respx.get("http://soil-agent.test/get_soil_data_by_district/").mock(
        return_value=Response(200, json={
            "soil_data": {"N": 50.0, "P": 20.0, "K": 40.0, "pH": 6.8},
            "status": "OK",
        })
    )

    respx.post("http://recommendation-agent.test/predict_top_crops/").mock(
        return_value=Response(200, json={
            "predictions": [
                {"crop": "rice", "probability": 0.7},
                {"crop": "jowar", "probability": 0.5},
            ]
        })
    )

    # Market agent fails
    respx.get("http://market-agent.test/market/evaluate").mock(
        return_value=Response(500, json={"detail": "market down"})
    )

    # Sustainability and XAI minimal mocks
    respx.get("http://sustainability-agent.test/sustainability/evaluate").mock(
        return_value=Response(200, json={"results": []})
    )
    respx.post("http://xai-agent.test/xai/explain").mock(
        return_value=Response(200, json={"agent": "xai_agent", "scope": "crop_level", "explanations": []})
    )

    payload = {
        "lat": 18.52,
        "lon": 73.86,
        "season": "kharif",
        "mode": "seasonal",
    }
    response = client.post("/get_full_recommendation/", json=payload)

    assert response.status_code == 200
    data = response.json()

    preds = data["recommendations"]["predictions"]
    assert len(preds) > 0

    # With market failure, market_score should be None but we still get final scores
    assert any(p["market_score"] is None for p in preds)
    assert all("final_score" in p for p in preds)
