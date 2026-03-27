from http import HTTPStatus

import numpy as np

import main


def _example_payload(**overrides):
    payload = {
        "N": 100.0,
        "P": 40.0,
        "K": 60.0,
        "pH": 6.5,
        "rainfall": 800.0,
        "temperature": 28.0,
    }
    payload.update(overrides)
    return payload


def test_predict_crops_happy_path(client, dummy_model):  # noqa: ARG001
    """Posting valid features should return top_n crops with probabilities.

    Uses the dummy model, which returns a fixed distribution over 3 crops.
    """

    resp = client.post("/predict_top_crops/", json=_example_payload())

    assert resp.status_code == HTTPStatus.OK
    data = resp.json()

    assert data["status"] == "OK"
    assert data["top_n"] == 5  # default
    assert len(data["predictions"]) == 3 or len(data["predictions"]) == data["top_n"]

    # With the dummy model, probability order is Maize > Rice > Wheat
    crops = [p["crop"] for p in data["predictions"]]
    assert crops[0] == "Maize"
    assert set(crops).issuperset({"Wheat", "Rice", "Maize"})


def test_predict_crops_custom_top_n(client, dummy_model):  # noqa: ARG001
    resp = client.post("/predict_top_crops/?top_n=2", json=_example_payload())

    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    assert data["top_n"] == 2
    assert len(data["predictions"]) == 2


def test_predict_crops_invalid_top_n(client, dummy_model):  # noqa: ARG001
    """top_n outside allowed range should return 422 from FastAPI validation."""

    resp = client.post("/predict_top_crops/?top_n=0", json=_example_payload())
    assert resp.status_code == HTTPStatus.UNPROCESSABLE_ENTITY

    resp = client.post("/predict_top_crops/?top_n=99", json=_example_payload())
    assert resp.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
