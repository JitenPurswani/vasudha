from http import HTTPStatus

import pytest

from database import get_connection
from security import hash_password


REGISTER_ENDPOINT = "/register"
LOGIN_ENDPOINT = "/login"


def _valid_register_payload(**overrides):
    payload = {
        "username": "testuser",
        "password": "ValidPass1",
        "state": "Maharashtra",
        "district": "Pune",
        "language": "en",
        "N": 50.0,
        "P": 20.0,
        "K": 30.0,
        "pH": 6.5,
    }
    payload.update(overrides)
    return payload


@pytest.mark.usefixtures("clean_users_table")
def test_login_with_valid_credentials_after_registration(client):
    """User can log in successfully after registering via the API."""
    reg_payload = _valid_register_payload(username="loginuser")
    reg_resp = client.post(REGISTER_ENDPOINT, json=reg_payload)
    assert reg_resp.status_code == HTTPStatus.OK

    login_resp = client.post(
        LOGIN_ENDPOINT,
        json={"username": "loginuser", "password": reg_payload["password"]},
    )

    assert login_resp.status_code == HTTPStatus.OK
    data = login_resp.json()
    assert "token" in data
    assert data["profile"]["name"] == "loginuser"


@pytest.mark.usefixtures("clean_users_table")
def test_login_with_invalid_credentials(client):
    """Wrong password should yield 401 Invalid credentials."""
    # Seed one user directly in DB
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO users (username, password_hash, state_key, district_key, language)
        VALUES (?, ?, ?, ?, ?)
        """,
        ("wrongpassuser", hash_password("CorrectPass1"), "MH", "Pune", "en"),
    )
    conn.commit()
    conn.close()

    resp = client.post(
        LOGIN_ENDPOINT,
        json={"username": "wrongpassuser", "password": "WrongPass1"},
    )

    assert resp.status_code == HTTPStatus.UNAUTHORIZED
    data = resp.json()
    assert data.get("detail") == "Invalid credentials"


@pytest.mark.usefixtures("clean_users_table")
def test_login_unknown_user(client):
    """Unknown username should also yield 401 Invalid credentials."""
    resp = client.post(
        LOGIN_ENDPOINT,
        json={"username": "doesnotexist", "password": "SomePass1"},
    )

    assert resp.status_code == HTTPStatus.UNAUTHORIZED
    data = resp.json()
    assert data.get("detail") == "Invalid credentials"


@pytest.mark.usefixtures("clean_users_table")
@pytest.mark.parametrize(
    "payload",
    [
        {},  # empty body
        {"username": "useronly"},  # missing password
        {"password": "Password1"},  # missing username
        {"username": "us", "password": "Password1"},  # username too short
    ],
)
def test_login_malformed_payload_validation(client, payload):
    """Malformed login payloads should trigger 422 validation errors."""
    resp = client.post(LOGIN_ENDPOINT, json=payload)

    assert resp.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
