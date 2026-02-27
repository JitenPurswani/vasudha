"""
Deficit Calculator — Stage 1 of the Fertilizer Recommendation Pipeline
Computes nutrient deficits by comparing current soil levels against the
crop's stage-wise optimal requirements.
"""

import json
import os
import math

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load crop nutrient profiles once at module level
with open(os.path.join(BASE_DIR, "crop_nutrient_profiles.json"), "r") as f:
    CROP_PROFILES = json.load(f)


def _resolve_stage(crop: str, crop_age_days: int) -> dict | None:
    """
    Given the crop name and the age in days, find which growth stage the
    crop is currently in and return the stage profile.
    """
    profile = CROP_PROFILES.get(crop)
    if not profile:
        return None

    stages = profile.get("stages", [])
    for stage in stages:
        if stage["start_day"] <= crop_age_days <= stage["end_day"]:
            return stage

    # If crop_age_days exceeds all stages, return last stage
    if stages:
        return stages[-1]

    return None


def _deficit(current: float, optimal_range: list[float]) -> float:
    """
    Calculate how much nutrient the soil is lacking.
    optimal_range = [min, max]
    Returns positive deficit if current < midpoint, else 0.
    """
    midpoint = (optimal_range[0] + optimal_range[1]) / 2.0
    gap = midpoint - current
    return max(0.0, round(gap, 2))


def _severity(deficit: float, optimal_range: list[float]) -> str:
    """
    Classify deficit severity based on how far below optimal we are.
    Returns: none | low | moderate | high | critical
    """
    if deficit <= 0:
        return "none"
    midpoint = (optimal_range[0] + optimal_range[1]) / 2.0
    if midpoint == 0:
        return "none"
    pct = (deficit / midpoint) * 100
    if pct < 15:
        return "low"
    elif pct < 35:
        return "moderate"
    elif pct < 60:
        return "high"
    else:
        return "critical"


def _ph_assessment(current_ph: float, optimal_ph_range: list[float]) -> dict:
    """
    Assess pH status. Unlike N/P/K, pH can be too high OR too low.
    Returns: {status, direction, gap, action}
    """
    low, high = optimal_ph_range
    if current_ph < low:
        gap = round(low - current_ph, 2)
        if gap > 1.5:
            severity = "critical"
        elif gap > 0.8:
            severity = "high"
        elif gap > 0.3:
            severity = "moderate"
        else:
            severity = "low"
        return {
            "status": severity,
            "direction": "too_acidic",
            "gap": gap,
            "action": "apply_lime",
            "message": f"Soil pH {current_ph} is below optimal {low}-{high}. Apply lime/dolomite to raise pH."
        }
    elif current_ph > high:
        gap = round(current_ph - high, 2)
        if gap > 1.5:
            severity = "critical"
        elif gap > 0.8:
            severity = "high"
        elif gap > 0.3:
            severity = "moderate"
        else:
            severity = "low"
        return {
            "status": severity,
            "direction": "too_alkaline",
            "gap": gap,
            "action": "apply_gypsum_or_sulphur",
            "message": f"Soil pH {current_ph} is above optimal {low}-{high}. Apply gypsum or sulphur to lower pH."
        }
    else:
        return {
            "status": "none",
            "direction": "optimal",
            "gap": 0,
            "action": "none",
            "message": f"Soil pH {current_ph} is within optimal range {low}-{high}."
        }


def _deficit_to_kg_ha(deficit_units: float, nutrient: str) -> float:
    """
    Convert soil nutrient deficit (in the dataset's ratio units) to
    approximate kg/ha of actual nutrient required.

    The soil ratio values (0-140 scale) from the dataset roughly correspond
    to mg/kg (ppm). Conversion: 1 ppm ≈ 2.24 kg/ha (assuming 15cm depth,
    bulk density 1.5 g/cm³). We use a simplified factor.
    """
    # Simplified conversion factor from dataset ratio → kg/ha
    CONVERSION = {
        "N": 1.8,   # dataset N ratio → kg N/ha
        "P": 1.5,   # dataset P ratio → kg P₂O₅/ha
        "K": 1.6    # dataset K ratio → kg K₂O/ha
    }
    factor = CONVERSION.get(nutrient, 1.5)
    return round(deficit_units * factor, 1)


def calculate_deficit(
    crop: str,
    crop_age_days: int,
    current_n: float,
    current_p: float,
    current_k: float,
    current_ph: float
) -> dict:
    """
    Main entry point for Stage 1.

    Args:
        crop: Crop name (lowercase, must match crop_nutrient_profiles keys)
        crop_age_days: Age of the crop in days since sowing/planting
        current_n: Current soil Nitrogen level (dataset ratio units)
        current_p: Current soil Phosphorus level (dataset ratio units)
        current_k: Current soil Potassium level (dataset ratio units)
        current_ph: Current soil pH

    Returns:
        dict with deficits, severities, pH assessment, and the resolved stage info.
    """
    profile = CROP_PROFILES.get(crop)
    if not profile:
        return {
            "error": f"Crop '{crop}' not found in nutrient profiles.",
            "supported_crops": [k for k in CROP_PROFILES.keys() if not k.startswith("_")]
        }

    stage = _resolve_stage(crop, crop_age_days)
    if not stage:
        return {"error": f"Could not resolve growth stage for crop '{crop}' at day {crop_age_days}."}

    # Compute N/P/K deficits
    n_deficit = _deficit(current_n, stage["optimal_N"])
    p_deficit = _deficit(current_p, stage["optimal_P"])
    k_deficit = _deficit(current_k, stage["optimal_K"])

    # Convert to kg/ha
    n_kg_ha = _deficit_to_kg_ha(n_deficit, "N")
    p_kg_ha = _deficit_to_kg_ha(p_deficit, "P")
    k_kg_ha = _deficit_to_kg_ha(k_deficit, "K")

    # Severities
    n_severity = _severity(n_deficit, stage["optimal_N"])
    p_severity = _severity(p_deficit, stage["optimal_P"])
    k_severity = _severity(k_deficit, stage["optimal_K"])

    # pH assessment
    ph_result = _ph_assessment(current_ph, stage["optimal_pH"])

    return {
        "crop": crop,
        "crop_age_days": crop_age_days,
        "stage": {
            "name": stage["name"],
            "start_day": stage["start_day"],
            "end_day": stage["end_day"]
        },
        "current_soil": {
            "N": current_n,
            "P": current_p,
            "K": current_k,
            "pH": current_ph
        },
        "optimal_for_stage": {
            "N": stage["optimal_N"],
            "P": stage["optimal_P"],
            "K": stage["optimal_K"],
            "pH": stage["optimal_pH"]
        },
        "deficit_raw": {
            "N": n_deficit,
            "P": p_deficit,
            "K": k_deficit
        },
        "deficit_kg_ha": {
            "N": n_kg_ha,
            "P": p_kg_ha,
            "K": k_kg_ha
        },
        "severity": {
            "N": n_severity,
            "P": p_severity,
            "K": k_severity
        },
        "ph_assessment": ph_result,
        "total_crop_requirement_kg_ha": {
            "N": profile.get("total_N_requirement_kg_ha", 0),
            "P": profile.get("total_P_requirement_kg_ha", 0),
            "K": profile.get("total_K_requirement_kg_ha", 0)
        }
    }
