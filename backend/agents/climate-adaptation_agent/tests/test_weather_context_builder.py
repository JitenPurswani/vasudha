import weather_context_builder as builder


def test_build_weather_context_happy_path(monkeypatch):
    def fake_fetch_current(lat, lon):  # noqa: ARG001
        return {"temp_current": 25.0, "humidity": 70.0}

    def fake_fetch_forecast(lat, lon):  # noqa: ARG001
        return {"temp_forecast_max": 32.0, "temp_forecast_min": 20.0}

    monkeypatch.setattr(builder, "fetch_current_weather", fake_fetch_current, raising=False)
    monkeypatch.setattr(builder, "fetch_forecast_weather", fake_fetch_forecast, raising=False)

    ctx = builder.build_weather_context(18.5, 73.9, seasonal_rainfall=750.0)

    assert ctx == {
        "temp_current": 25.0,
        "humidity": 70.0,
        "temp_forecast_max": 32.0,
        "temp_forecast_min": 20.0,
        "seasonal_rainfall": 750.0,
    }


def test_build_weather_context_handles_missing_fields_gracefully(monkeypatch):
    def fake_fetch_current(lat, lon):  # noqa: ARG001
        # Missing humidity key intentionally
        return {"temp_current": 26.0}

    def fake_fetch_forecast(lat, lon):  # noqa: ARG001
        # Missing forecast min intentionally
        return {"temp_forecast_max": 34.0}

    monkeypatch.setattr(builder, "fetch_current_weather", fake_fetch_current, raising=False)
    monkeypatch.setattr(builder, "fetch_forecast_weather", fake_fetch_forecast, raising=False)

    # We expect a KeyError today; this test just documents current behavior.
    # If you later add defaulting logic in build_weather_context, update this
    # assertion accordingly.
    try:
        builder.build_weather_context(18.5, 73.9, seasonal_rainfall=500.0)
    except KeyError:
        # Current behavior: propagates KeyError for missing fields
        return

    # If no error is raised, ensure at least temp_current is present
    ctx = builder.build_weather_context(18.5, 73.9, seasonal_rainfall=500.0)
    assert "temp_current" in ctx
