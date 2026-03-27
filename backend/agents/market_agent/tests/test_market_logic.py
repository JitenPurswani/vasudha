from http import HTTPStatus

import pytest

import main
import market_logic


@pytest.mark.usefixtures("temp_market_db")
def test_evaluate_market_logic_single_commodity():
    """evaluate_market_logic should return a non-null score for known crop/state."""

    result = market_logic.evaluate_market_logic("Wheat", "Maharashtra")

    assert result is not None
    assert result["crop"] == "Wheat"
    assert result["state"] == "Maharashtra"
    assert 0 <= result["market_score"] <= 100


@pytest.mark.usefixtures("temp_market_db")
def test_evaluate_market_logic_unknown_crop_returns_none():
    """Unknown crop should yield None (no market data)."""

    result = market_logic.evaluate_market_logic("UnknownCrop", "Maharashtra")
    assert result is None


@pytest.mark.usefixtures("temp_market_db")
def test_evaluate_market_logic_handles_case_and_whitespace():
    """Case and extra spaces should be normalized in evaluate_market_logic."""

    result = market_logic.evaluate_market_logic("  wheat  ", "  maharashtra  ")

    assert result is not None
    assert result["crop"] == "wheat".strip()
    assert result["state"] == "maharashtra".strip()


@pytest.mark.usefixtures("temp_market_db")
def test_market_evaluate_endpoint_happy_path(client):
    """/market/evaluate should return data for valid crop/state."""

    resp = client.get("/market/evaluate", params={"crop": "Wheat", "state": "Maharashtra"})

    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    assert data["crop"] == "Wheat"
    assert data["state"] == "Maharashtra"


@pytest.mark.usefixtures("temp_market_db")
def test_market_evaluate_endpoint_not_found(client):
    """/market/evaluate should return 404 when no data exists."""

    resp = client.get("/market/evaluate", params={"crop": "UnknownCrop", "state": "Maharashtra"})

    assert resp.status_code == HTTPStatus.NOT_FOUND
