import types

import pytest

import sustainability_engine as engine


@pytest.fixture
def patched_crop_data(monkeypatch):
    """Patch CROP_DATA with controlled scenarios for scoring tests."""

    fake_data = {
        # Very high water use, high cultivation intensity, negative soil impact
        "HighInputHighWater": {
            "water_intensity": "very_high",
            "soil_impact": "negative",
            "cultivation_intensity": "high",
        },
        # Low water use, low cultivation intensity, positive soil impact
        "LowInputLowWater": {
            "water_intensity": "low",
            "soil_impact": "positive",
            "cultivation_intensity": "low",
        },
        # Soil degradation edge case: negative soil impact but moderate water/cultivation
        "SoilDegradationCase": {
            "water_intensity": "medium",
            "soil_impact": "negative",
            "cultivation_intensity": "medium",
        },
        # Pair differing only in water intensity to test water-scarce vs abundant
        "WaterAbundant": {
            "water_intensity": "very_high",
            "soil_impact": "neutral",
            "cultivation_intensity": "medium",
        },
        "WaterScarce": {
            "water_intensity": "low",
            "soil_impact": "neutral",
            "cultivation_intensity": "medium",
        },
    }

    monkeypatch.setattr(engine, "CROP_DATA", fake_data, raising=False)
    return fake_data


def test_high_input_vs_low_input_scoring(patched_crop_data):  # noqa: ARG001
    """High-input, high-water crops should score lower than low-input, low-water ones."""

    high = engine.compute_sustainability("HighInputHighWater")
    low = engine.compute_sustainability("LowInputLowWater")

    assert high is not None and low is not None
    assert high["sustainability_score"] < low["sustainability_score"]

    # Sanity-check dimension impacts
    assert high["dimensions"]["water_intensity"]["impact"] == "negative"
    assert high["dimensions"]["cultivation_intensity"]["impact"] == "negative"
    assert low["dimensions"]["water_intensity"]["impact"] == "positive"


def test_water_scarce_vs_water_abundant_scenarios(patched_crop_data):  # noqa: ARG001
    """Crops suited to water-scarce conditions should have higher scores than water-abundant ones.

    We keep soil and cultivation the same and vary only water_intensity.
    """

    abundant = engine.compute_sustainability("WaterAbundant")
    scarce = engine.compute_sustainability("WaterScarce")

    assert abundant is not None and scarce is not None
    assert scarce["sustainability_score"] > abundant["sustainability_score"]

    # High water use should produce a warning-style summary
    assert abundant["explanation"]["summary"] == "Lower sustainability due to high water requirements."
    # Low water with neutral soil falls back to a moderate summary
    assert scarce["explanation"]["summary"] == "Moderate sustainability based on balanced resource usage."


def test_soil_degradation_edge_case(patched_crop_data):  # noqa: ARG001
    """Negative soil impact should be reflected in the soil dimension and summary."""

    result = engine.compute_sustainability("SoilDegradationCase")
    assert result is not None

    soil_dim = result["dimensions"]["soil_impact"]
    # Negative soil impact gets a lower factor and a neutral/less favorable impact label
    assert soil_dim["category"] == "negative"
    assert soil_dim["impact"] == "neutral"

    # With non-high water use and non-positive soil, summary is moderate
    assert result["explanation"]["summary"] == "Moderate sustainability based on balanced resource usage."


def test_unknown_crop_returns_none(monkeypatch):
    """Engine should return None for crops not present in CROP_DATA."""

    monkeypatch.setattr(engine, "CROP_DATA", {"Known": {"water_intensity": "low", "soil_impact": "neutral", "cultivation_intensity": "medium"}}, raising=False)

    assert engine.compute_sustainability("Known") is not None
    assert engine.compute_sustainability("Unknown") is None
