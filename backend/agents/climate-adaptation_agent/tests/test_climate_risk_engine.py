import climate_risk_engine as engine


def _make_crop_profile():
    return {
        "temperature": {
            "min_safe": 18,
            "max_safe": 32,
            "heat_stress": 38,
            "cold_stress": 12,
        },
        "rainfall": {
            "seasonal_low": 600,
            "seasonal_high": 1200,
            "waterlogging_sensitive": True,
        },
        "humidity": {
            "high_risk": 85,
        },
        "frost_sensitive": True,
    }


def test_extreme_heat_triggers_high_heat_stress():
    crop = _make_crop_profile()
    weather = {
        "temp_current": 30.0,
        "temp_forecast_max": 40.0,  # > heat_stress
        "temp_forecast_min": 22.0,
        "humidity": 70.0,
        "seasonal_rainfall": 800.0,
    }

    risks = engine.assess_climate_risks(weather, crop)

    assert any(r["risk"] == "Heat Stress" and r["severity"] == "High" for r in risks)


def test_drought_conditions_trigger_dry_spell_high_severity():
    crop = _make_crop_profile()
    # seasonal_low = 600 -> high severity if < 0.7 * 600 = 420
    weather = {
        "temp_current": 28.0,
        "temp_forecast_max": 30.0,
        "temp_forecast_min": 20.0,
        "humidity": 60.0,
        "seasonal_rainfall": 300.0,  # well below threshold
    }

    risks = engine.assess_climate_risks(weather, crop)

    assert any(r["risk"] == "Dry Spell Risk" and r["severity"] == "High" for r in risks)


def test_normal_conditions_yield_no_risks():
    crop = _make_crop_profile()
    # Within safe temperature range, rainfall within band, humidity below high_risk
    weather = {
        "temp_current": 26.0,
        "temp_forecast_max": 30.0,
        "temp_forecast_min": 22.0,
        "humidity": 60.0,
        "seasonal_rainfall": 800.0,
    }

    risks = engine.assess_climate_risks(weather, crop)

    assert risks == []


def test_extreme_cold_and_frost_risk():
    crop = _make_crop_profile()
    weather = {
        "temp_current": 8.0,  # below cold_stress
        "temp_forecast_max": 20.0,
        "temp_forecast_min": 1.0,  # frost condition
        "humidity": 70.0,
        "seasonal_rainfall": 700.0,
    }

    risks = engine.assess_climate_risks(weather, crop)

    assert any(r["risk"] == "Cold Stress" and r["severity"] == "High" for r in risks)
    assert any(r["risk"] == "Frost Risk" for r in risks)


def test_high_humidity_adds_warning_risk():
    crop = _make_crop_profile()
    weather = {
        "temp_current": 26.0,
        "temp_forecast_max": 30.0,
        "temp_forecast_min": 22.0,
        "humidity": 90.0,  # >= high_risk threshold
        "seasonal_rainfall": 800.0,
    }

    risks = engine.assess_climate_risks(weather, crop)

    assert any(r["risk"] == "High Humidity Risk" and r["severity"] == "Low" for r in risks)
