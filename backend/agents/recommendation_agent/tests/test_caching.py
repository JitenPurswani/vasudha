import time

import main


def _example_features(**overrides):
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


def test_set_and_get_cached_prediction_within_ttl():
    key = main.get_cache_key(_example_features(), top_n=3)
    value = {"foo": "bar"}

    main.set_cached_prediction(key, value)

    retrieved = main.get_cached_prediction(key)
    assert retrieved == value


def test_cache_entry_expires_after_ttl(monkeypatch):
    key = main.get_cache_key(_example_features(), top_n=3)
    value = {"baz": "qux"}

    # Seed cache manually with an old timestamp
    main._prediction_cache[key] = (value, time.time() - (main._cache_ttl + 1))

    retrieved = main.get_cached_prediction(key)
    assert retrieved is None
    assert key not in main._prediction_cache


def test_cache_size_limit_eviction():
    """When more than 100 entries are stored, the oldest should be evicted."""

    # Fill cache with 101 entries
    for i in range(101):
        key = f"key-{i}"
        main.set_cached_prediction(key, {"index": i})

    assert len(main._prediction_cache) <= 100

    # Ensure at least one of the earliest keys is gone
    early_keys = {"key-0", "key-1", "key-2"}
    assert not early_keys.issubset(main._prediction_cache.keys())


def test_predict_endpoint_uses_cache(client, dummy_model, monkeypatch):  # noqa: ARG001
    """Two identical requests within TTL should hit the in-memory cache on second call."""

    # Spy on the underlying pipeline.predict_proba to count calls
    call_count = {"n": 0}

    original_predict_proba = dummy_model.predict_proba

    def wrapped_predict_proba(X):  # noqa: N803
        call_count["n"] += 1
        return original_predict_proba(X)

    monkeypatch.setattr(dummy_model, "predict_proba", wrapped_predict_proba)

    payload = _example_features()

    resp1 = client.post("/predict_top_crops/", json=payload)
    assert resp1.status_code == 200

    resp2 = client.post("/predict_top_crops/", json=payload)
    assert resp2.status_code == 200

    # Underlying model should have been called only once thanks to caching
    assert call_count["n"] == 1
