import deficit_calculator as deficit
import rainfall_adjuster as r_adj


def test_deficit_calculation_basic_ranges(monkeypatch):
    """Deficit calculator: moderate deficit yields non-zero kg/ha and expected severities."""

    # Patch CROP_PROFILES to a simple synthetic crop profile
    monkeypatch.setattr(
        deficit,
        "CROP_PROFILES",
        {
            "wheat": {
                "stages": [
                    {
                        "name": "vegetative",
                        "start_day": 0,
                        "end_day": 60,
                        "optimal_N": [60, 80],
                        "optimal_P": [30, 40],
                        "optimal_K": [40, 60],
                        "optimal_pH": [6.0, 7.5],
                    }
                ],
                "total_N_requirement_kg_ha": 120,
                "total_P_requirement_kg_ha": 60,
                "total_K_requirement_kg_ha": 80,
            }
        },
        raising=False,
    )

    res = deficit.calculate_deficit(
        crop="wheat",
        crop_age_days=30,
        current_n=50,  # below midpoint 70 → deficit
        current_p=35,  # near midpoint 35 → small/no deficit
        current_k=30,  # below midpoint 50 → deficit
        current_ph=5.5,  # slightly acidic
    )

    assert res["crop"] == "wheat"
    # Deficits should be positive for N and K
    assert res["deficit_raw"]["N"] > 0
    assert res["deficit_raw"]["K"] > 0
    # P deficit should be small or zero depending on midpoint
    assert res["deficit_raw"]["P"] >= 0

    # pH assessment should detect acidity
    ph = res["ph_assessment"]
    assert ph["direction"] == "too_acidic"
    assert ph["status"] in {"low", "moderate", "high", "critical"}


def test_deficit_calculation_unknown_crop_returns_error():
    res = deficit.calculate_deficit(
        crop="unknown_crop",
        crop_age_days=10,
        current_n=40,
        current_p=20,
        current_k=30,
        current_ph=7.0,
    )

    assert "error" in res
    assert "supported_crops" in res


def test_rainfall_adjuster_multipliers_and_timing(monkeypatch):
    """Rainfall adjuster: different regimes change quantities and timing advice."""

    # Synthetic rainfall data for a test crop
    monkeypatch.setattr(
        r_adj,
        "RAINFALL_DATA",
        {
            "wheat": {
                "optimal_weekly_mm": [20, 40],
                "ranges": [
                    {"range": [0, 10], "multiplier": 0.8, "label": "very_low", "reason": "Very dry"},
                    {"range": [11, 20], "multiplier": 1.0, "label": "low", "reason": "Below optimal"},
                    {"range": [21, 40], "multiplier": 1.1, "label": "optimal", "reason": "Good"},
                    {"range": [41, 80], "multiplier": 0.9, "label": "high", "reason": "High"},
                ],
            }
        },
        raising=False,
    )

    base_selection = {
        "crop": "wheat",
        "recommendations": {
            "organic": [
                {"fertilizer_id": "org1", "quantity_kg_ha": 100.0},
            ],
            "chemical_supplements": [
                {"fertilizer_id": "chem1", "quantity_kg_ha": 50.0},
            ],
            "ph_amendments": [
                {"fertilizer_id": "ph1", "quantity_kg_ha": 200.0},
            ],
        },
    }

    # Very low rainfall → multiplier 0.8, timing advice about dry conditions
    out_dry = r_adj.adjust_for_rainfall(base_selection, weekly_rainfall_mm=5)
    assert out_dry["rainfall_context"]["classification"] == "very_low"
    assert any("Very dry" in out_dry["rainfall_context"]["reason"] for _ in [0])
    assert out_dry["recommendations"]["organic"][0]["quantity_kg_ha"] == 80.0

    # Optimal rainfall → multiplier 1.1, standard timing advice
    out_opt = r_adj.adjust_for_rainfall(base_selection, weekly_rainfall_mm=30)
    assert out_opt["rainfall_context"]["classification"] == "optimal"
    assert out_opt["recommendations"]["organic"][0]["quantity_kg_ha"] == 110.0

    # High rainfall → multiplier 0.9 and specific timing advice
    out_high = r_adj.adjust_for_rainfall(base_selection, weekly_rainfall_mm=60)
    assert out_high["rainfall_context"]["classification"] == "high"
    assert out_high["recommendations"]["organic"][0]["quantity_kg_ha"] == 90.0
    assert "Above-optimal rainfall" in out_high["rainfall_context"]["timing_advice"]
