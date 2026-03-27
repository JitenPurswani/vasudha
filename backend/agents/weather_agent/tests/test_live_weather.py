import pytest
import requests

import main


class DummyWeatherResponse:
    def __init__(self, status_code=200, json_data=None):
        self.status_code = status_code
        self._json_data = json_data or {}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.exceptions.RequestException(f"HTTP {self.status_code}")

    def json(self):
        return self._json_data


def test_get_live_weather_success(monkeypatch):
    """Successful OpenWeatherMap call should map temp, humidity, and convert wind speed to km/h."""

    def fake_get(url, params=None, timeout=None):  # noqa: ARG001
        return DummyWeatherResponse(
            status_code=200,
            json_data={
                "main": {"temp": 28.5, "humidity": 65},
                "wind": {"speed": 5.0},  # m/s
            },
        )

    monkeypatch.setattr(main.requests, "get", fake_get)
    # Ensure API key is considered present
    monkeypatch.setattr(main, "API_KEY", "dummy-key", raising=False)

    result = main.get_live_weather(18.52, 73.86)

    assert result["status"] == "OK"
    assert result["temp"] == 28.5
    assert result["humidity"] == 65
    # 5.0 m/s -> 18.0 km/h
    assert result["wind_speed"] == pytest.approx(18.0)


def test_get_live_weather_api_key_missing(monkeypatch):
    """If the API key is missing, function should return APIKeyMissing status without calling the API."""

    monkeypatch.setattr(main, "API_KEY", None, raising=False)

    result = main.get_live_weather(18.52, 73.86)

    assert result["status"] == "APIKeyMissing"
    assert result["temp"] is None
    assert result["humidity"] is None
    assert result["wind_speed"] is None


def test_get_live_weather_api_error(monkeypatch):
    """Any request-level error from OpenWeatherMap should result in APIError status."""

    def fake_get(url, params=None, timeout=None):  # noqa: ARG001
        raise requests.exceptions.RequestException("Simulated network error")

    monkeypatch.setattr(main.requests, "get", fake_get)
    monkeypatch.setattr(main, "API_KEY", "dummy-key", raising=False)

    result = main.get_live_weather(18.52, 73.86)

    assert result["status"] == "APIError"
    assert result["temp"] is None
    assert result["humidity"] is None
    assert result["wind_speed"] is None
