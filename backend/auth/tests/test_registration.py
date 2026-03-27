from http import HTTPStatus

import pytest


REGISTER_ENDPOINT = "/register"


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
def test_register_happy_path(client):
    """User can register successfully with a valid payload."""
    response = client.post(REGISTER_ENDPOINT, json=_valid_register_payload())

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data.get("status") == "success"


@pytest.mark.usefixtures("clean_users_table")
def test_register_duplicate_username(client):
    """Registering the same username twice should fail with 400."""
    payload = _valid_register_payload(username="duplicateuser")

    first = client.post(REGISTER_ENDPOINT, json=payload)
    assert first.status_code == HTTPStatus.OK

    second = client.post(REGISTER_ENDPOINT, json=payload)
    assert second.status_code == HTTPStatus.BAD_REQUEST
    data = second.json()
    assert data.get("detail") == "Username already exists"


@pytest.mark.usefixtures("clean_users_table")
@pytest.mark.parametrize(
    "password, expected_detail",
    [
        ("short1A", "Password must contain at least one lowercase letter"),  # no lowercase
        ("lowercase1", "Password must contain at least one uppercase letter"),  # no uppercase
        ("NOLOWERCASE", "Password must contain at least one number"),  # no number
    ],
)
def test_register_invalid_password_validation(client, password, expected_detail):
    """Pydantic validators should reject structurally invalid passwords.

    FastAPI returns 422 for request body validation errors.
    """
    payload = _valid_register_payload(password=password)

    response = client.post(REGISTER_ENDPOINT, json=payload)

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    # Optional: check that the error message mention our validator
    errors = response.json().get("detail", [])
    # At least one error message should reference password validation
    assert any("password" in str(err) for err in errors)


@pytest.mark.usefixtures("clean_users_table")
def test_register_username_format_validation(client):
    """Username must be alphanumeric or underscores only (validator-level)."""
    payload = _valid_register_payload(username="invalid user!")

    response = client.post(REGISTER_ENDPOINT, json=payload)

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    errors = response.json().get("detail", [])
    assert any("Username must be alphanumeric or underscores only" in str(err) for err in errors)
