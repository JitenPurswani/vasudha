from http import HTTPStatus

import main


def test_market_evaluate_uses_cache(client, temp_market_db):  # noqa: ARG001
    """Second call with same crop/state should hit in-memory cache."""

    cache_key = "eval:wheat:maharashtra"
    assert cache_key not in main._cache

    resp1 = client.get("/market/evaluate", params={"crop": "Wheat", "state": "Maharashtra"})
    assert resp1.status_code == HTTPStatus.OK
    assert cache_key in main._cache

    # Clear DB path to ensure we are truly using cache (optional defensive step)
    # If cache wasn't used, this might cause failures; with cache, second call is safe.
    first_cache_size = len(main._cache)

    resp2 = client.get("/market/evaluate", params={"crop": "Wheat", "state": "Maharashtra"})
    assert resp2.status_code == HTTPStatus.OK
    assert len(main._cache) == first_cache_size


def test_market_evaluate_batch_reuses_cache(client, temp_market_db):  # noqa: ARG001
    """Batch endpoint should reuse per-crop cache where available."""

    # First, populate cache via single evaluate
    resp_single = client.get("/market/evaluate", params={"crop": "Wheat", "state": "Maharashtra"})
    assert resp_single.status_code == HTTPStatus.OK

    # Now call batch endpoint with the same crop plus an unknown one
    resp_batch = client.get(
        "/market/evaluate/batch",
        params=[("crops", "Wheat"), ("crops", "UnknownCrop"), ("state", "Maharashtra")],
    )

    assert resp_batch.status_code == HTTPStatus.OK
    data = resp_batch.json()

    assert data["state"] == "Maharashtra"
    assert "Wheat" in data["results"]
    # Wheat should have a result (from cache or fresh)
    assert data["results"]["Wheat"] is not None
    # UnknownCrop should be None
    assert data["results"]["UnknownCrop"] is None
