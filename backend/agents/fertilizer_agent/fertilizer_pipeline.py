"""
Fertilizer Recommendation Pipeline — Orchestrates all 4 stages sequentially.
Stage 1: Deficit Calculator  → Compute N/P/K deficits and pH assessment
Stage 2: Fertilizer Selector → Pick organic-first fertilizers to fill gaps
Stage 3: Rainfall Adjuster   → Adjust quantities based on recent rainfall
Stage 4: Tool Matcher         → Attach application tools and purchase links
"""

from deficit_calculator import calculate_deficit
from fertilizer_selector import select_fertilizers
from rainfall_adjuster import adjust_for_rainfall
from tool_matcher import match_tools
from rainfall_service import get_weekly_rainfall


def run_pipeline(
    crop: str,
    lat: float,
    lon: float,
    crop_age_days: int,
    current_n: float,
    current_p: float,
    current_k: float,
    current_ph: float,
    season: str = "kharif"
) -> dict:
    """
    Run the full 4-stage fertilizer recommendation pipeline.

    Args:
        crop: Crop name (lowercase, must match crop_nutrient_profiles keys)
        lat: Latitude of the farm
        lon: Longitude of the farm
        crop_age_days: Current age of the crop in days since sowing
        current_n: Current soil Nitrogen level (from soil agent)
        current_p: Current soil Phosphorus level (from soil agent)
        current_k: Current soil Potassium level (from soil agent)
        current_ph: Current soil pH (from soil agent)
        season: Growing season (kharif/rabi/zaid) — for context

    Returns:
        Complete fertilizer recommendation dict with all 4 stages' output.
    """

    # ── Stage 0: Fetch recent rainfall ──────────────────────────────
    rainfall_data = get_weekly_rainfall(lat, lon)
    weekly_rainfall_mm = rainfall_data.get("weekly_rainfall_mm", 15.0)

    # ── Stage 1: Deficit Calculation ────────────────────────────────
    deficit_result = calculate_deficit(
        crop=crop,
        crop_age_days=crop_age_days,
        current_n=current_n,
        current_p=current_p,
        current_k=current_k,
        current_ph=current_ph
    )

    if "error" in deficit_result:
        return {
            "error": deficit_result["error"],
            "stage_failed": "deficit_calculator",
            "rainfall": rainfall_data
        }

    # ── Stage 2: Fertilizer Selection (organic-first) ──────────────
    selection_result = select_fertilizers(deficit_result)

    if "error" in selection_result:
        return {
            "error": selection_result["error"],
            "stage_failed": "fertilizer_selector",
            "deficit": deficit_result,
            "rainfall": rainfall_data
        }

    # ── Stage 3: Rainfall Adjustment ───────────────────────────────
    adjusted_result = adjust_for_rainfall(selection_result, weekly_rainfall_mm)

    # ── Stage 4: Tool Matching ─────────────────────────────────────
    final_result = match_tools(adjusted_result)

    # ── Compose final output ───────────────────────────────────────
    final_result["input"] = {
        "crop": crop,
        "lat": lat,
        "lon": lon,
        "crop_age_days": crop_age_days,
        "current_soil": {
            "N": current_n,
            "P": current_p,
            "K": current_k,
            "pH": current_ph
        },
        "season": season
    }
    final_result["rainfall_data"] = rainfall_data

    return final_result
