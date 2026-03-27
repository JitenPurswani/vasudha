from datetime import datetime, timedelta, timezone

import pytest
from http import HTTPStatus
from jose import JWTError

from config import Config
from security import create_access_token, decode_access_token


def test_create_and_decode_access_token_roundtrip():
    """A token created by create_access_token should decode back to the same payload fields."""
    payload = {"sub": "testuser", "role": "farmer"}

    token = create_access_token(payload)
    decoded = decode_access_token(token)

    # Standard JWT claims
    assert decoded["sub"] == payload["sub"]
    assert decoded["role"] == payload["role"]
    assert "exp" in decoded


def test_decode_access_token_with_tampered_token_raises():
    """Any tampering with the token should cause decode_access_token to raise a JWTError."""
    token = create_access_token({"sub": "testuser"})

    # Corrupt the token by altering the last character
    tampered = token[:-1] + ("a" if token[-1] != "a" else "b")

    with pytest.raises(JWTError):
        decode_access_token(tampered)


def test_decode_access_token_with_expired_token_raises(monkeypatch):
    """A token whose exp is in the past should fail validation."""

    class DummyConfig(Config.__class__):
        pass

    # Temporarily override EXPIRE_DAYS to a negative value so exp is in the past
    original_expire_days = Config.EXPIRE_DAYS
    try:
        Config.EXPIRE_DAYS = -1
        expired_token = create_access_token({"sub": "expireduser"})
    finally:
        Config.EXPIRE_DAYS = original_expire_days

    with pytest.raises(JWTError):
        decode_access_token(expired_token)


def test_update_profile_missing_authorization_header_returns_401(client):
    """/user/profile must reject requests without Authorization header."""
    resp = client.patch("/user/profile", json={})

    assert resp.status_code == HTTPStatus.UNAUTHORIZED
    data = resp.json()
    assert data.get("detail") == "Missing authorization header"


def test_update_profile_invalid_authorization_format_returns_401(client):
    """/user/profile must reject improperly formatted Authorization header."""
    resp = client.patch(
        "/user/profile",
        headers={"Authorization": "Token sometoken"},
        json={"language": "en"},
    )

    assert resp.status_code == HTTPStatus.UNAUTHORIZED
    data = resp.json()
    assert data.get("detail") == "Invalid Authorization format"
