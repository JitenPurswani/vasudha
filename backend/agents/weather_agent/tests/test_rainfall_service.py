import main


def test_get_seasonal_rainfall_existing_district_kharif():
    """Should return stored kharif rainfall for a known district."""

    rainfall = main.get_seasonal_rainfall("Pune", "kharif")

    assert rainfall == 800.0


def test_get_seasonal_rainfall_existing_district_rabi():
    """Should return stored rabi rainfall for a known district."""

    rainfall = main.get_seasonal_rainfall("Pune", "rabi")

    assert rainfall == 150.0


def test_get_seasonal_rainfall_existing_district_zaid_case_insensitive():
    """District name comparisons should be case-insensitive and trimmed."""

    rainfall = main.get_seasonal_rainfall("  pune  ", "ZAID")

    assert rainfall == 50.0


def test_get_seasonal_rainfall_unknown_district():
    """Unknown district should yield None (no data)."""

    rainfall = main.get_seasonal_rainfall("NonExistingDistrict", "kharif")

    assert rainfall is None


def test_get_seasonal_rainfall_invalid_season():
    """Invalid season string should yield None and avoid querying the DB."""

    rainfall = main.get_seasonal_rainfall("Pune", "invalid-season")

    assert rainfall is None
