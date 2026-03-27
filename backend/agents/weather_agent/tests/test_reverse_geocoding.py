from http import HTTPStatus

import pytest
import requests

import main


class DummyResponse:
    def __init__(self, status_code=200, json_data=None):
        self.status_code = status_code
        self._json_data = json_data or {}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.exceptions.RequestException(f"HTTP {self.status_code}")

    def json(self):
        return self._json_data


@pytest.mark.parametrize(
    "json_data, expected_district, expected_state",
    [
        # state_district present
        (
            {
                "address": {"state_district": "Pune District", "state": "Maharashtra"},
                "display_name": "Pune, Maharashtra, India",
            },
            "Pune",
            "Maharashtra",
        ),
        # no state_district, use county fallback
        (
            {
                "address": {"county": "Bangalore District", "state": "Karnataka"},
                "display_name": "Bengaluru, Karnataka, India",
            },
            "Bangalore",
            "Karnataka",
        ),
    ],
)
def test_get_district_from_coordinates_success(monkeypatch, json_data, expected_district, expected_state):
    """Reverse geocoding returns district and state from Nominatim JSON responses."""

    def fake_get(url, params=None, headers=None, timeout=None):  # noqa: ARG001
        return DummyResponse(status_code=200, json_data=json_data)

    monkeypatch.setattr(main.requests, "get", fake_get)

    district, state = main.get_district_from_coordinates(18.52, 73.86)

    assert district == expected_district
    assert state == expected_state


def test_get_district_from_coordinates_not_found(monkeypatch):
    """If Nominatim responds with an error, we should get (None, None)."""

    def fake_get(url, params=None, headers=None, timeout=None):  # noqa: ARG001
        return DummyResponse(status_code=404, json_data={})

    monkeypatch.setattr(main.requests, "get", fake_get)

    district, state = main.get_district_from_coordinates(0.0, 0.0)

    assert district is None
    assert state is None


def test_get_district_from_coordinates_rate_limited(monkeypatch):
    """HTTP 429 or similar rate-limit error should also yield (None, None)."""

    def fake_get(url, params=None, headers=None, timeout=None):  # noqa: ARG001
        return DummyResponse(status_code=429, json_data={"error": "Too Many Requests"})

    monkeypatch.setattr(main.requests, "get", fake_get)

    district, state = main.get_district_from_coordinates(18.52, 73.86)

    assert district is None
    assert state is None


def test_get_district_from_coordinates_timeout(monkeypatch):
    """Timeout exceptions should be retried and ultimately return (None, None) after max attempts."""

    call_count = {"n": 0}

    def fake_get(url, params=None, headers=None, timeout=None):  # noqa: ARG001
        call_count["n"] += 1
        raise requests.exceptions.Timeout("Simulated timeout")

    monkeypatch.setattr(main.requests, "get", fake_get)

    district, state = main.get_district_from_coordinates(18.52, 73.86)

    # After 3 retries, the function returns (None, None)
    assert call_count["n"] == 3
    assert district is None
    assert state is None
