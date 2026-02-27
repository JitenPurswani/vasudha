"""
Rainfall Adjuster — Stage 3 of the Fertilizer Recommendation Pipeline
Adjusts fertilizer quantities based on recent actual rainfall vs. crop's
optimal rainfall requirement. Prevents waste in heavy rain (leaching) and
under-application in dry conditions (poor uptake).
"""

import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(BASE_DIR, "rainfall_multipliers.json"), "r") as f:
    RAINFALL_DATA = json.load(f)


def _find_multiplier(crop: str, weekly_rainfall_mm: float) -> dict:
    """
    Look up the rainfall multiplier for a crop given recent weekly rainfall.
    Returns: {multiplier, label, reason, optimal_weekly_mm}
    """
    crop_data = RAINFALL_DATA.get(crop)
    if not crop_data:
        # Default: no adjustment for unknown crops
        return {
            "multiplier": 1.0,
            "label": "unknown_crop",
            "reason": f"No rainfall data for '{crop}'. Using default (no adjustment).",
            "optimal_weekly_mm": None
        }

    ranges = crop_data.get("ranges", [])
    optimal = crop_data.get("optimal_weekly_mm", [20, 40])

    for r in ranges:
        low, high = r["range"]
        if low <= weekly_rainfall_mm <= high:
            return {
                "multiplier": r["multiplier"],
                "label": r["label"],
                "reason": r["reason"],
                "optimal_weekly_mm": optimal
            }

    # Fallback: if rainfall exceeds all ranges (shouldn't happen with 999 cap)
    return {
        "multiplier": 0.8,
        "label": "extreme",
        "reason": "Extreme rainfall — significant leaching risk.",
        "optimal_weekly_mm": optimal
    }


def _adjust_quantity(quantity_kg_ha: float, multiplier: float) -> float:
    """Apply multiplier and round."""
    return round(quantity_kg_ha * multiplier, 1)


def adjust_for_rainfall(
    selection_result: dict,
    weekly_rainfall_mm: float
) -> dict:
    """
    Main entry point for Stage 3.

    Takes the fertilizer selection result from Stage 2
    and adjusts quantities based on actual recent rainfall.

    Args:
        selection_result: Output from fertilizer_selector.select_fertilizers()
        weekly_rainfall_mm: Total rainfall in the past 7 days (mm)

    Returns:
        Updated selection_result with adjusted quantities and rainfall context.
    """
    if "error" in selection_result:
        return selection_result

    crop = selection_result.get("crop", "")
    rainfall_info = _find_multiplier(crop, weekly_rainfall_mm)
    multiplier = rainfall_info["multiplier"]

    # Adjust organic recommendations
    adjusted_organic = []
    for rec in selection_result.get("recommendations", {}).get("organic", []):
        adjusted = dict(rec)
        original_qty = rec["quantity_kg_ha"]
        adjusted["quantity_kg_ha"] = _adjust_quantity(original_qty, multiplier)
        adjusted["original_quantity_kg_ha"] = original_qty
        adjusted["rainfall_adjustment"] = multiplier
        adjusted_organic.append(adjusted)

    # Adjust chemical supplements
    adjusted_chemical = []
    for rec in selection_result.get("recommendations", {}).get("chemical_supplements", []):
        adjusted = dict(rec)
        original_qty = rec["quantity_kg_ha"]
        adjusted["quantity_kg_ha"] = _adjust_quantity(original_qty, multiplier)
        adjusted["original_quantity_kg_ha"] = original_qty
        adjusted["rainfall_adjustment"] = multiplier
        adjusted_chemical.append(adjusted)

    # pH amendments less affected by rainfall, but slight adjustment
    adjusted_ph = []
    ph_multiplier = 1.0
    if rainfall_info["label"] in ("very_high", "high"):
        ph_multiplier = 0.95  # Slight reduction — lime/gypsum can wash away
    for rec in selection_result.get("recommendations", {}).get("ph_amendments", []):
        adjusted = dict(rec)
        original_qty = rec["quantity_kg_ha"]
        adjusted["quantity_kg_ha"] = _adjust_quantity(original_qty, ph_multiplier)
        adjusted["original_quantity_kg_ha"] = original_qty
        adjusted_ph.append(adjusted)

    # Build rainfall context
    rainfall_context = {
        "weekly_rainfall_mm": weekly_rainfall_mm,
        "optimal_weekly_mm": rainfall_info["optimal_weekly_mm"],
        "classification": rainfall_info["label"],
        "multiplier_applied": multiplier,
        "reason": rainfall_info["reason"]
    }

    # Add application timing advice based on rainfall
    if rainfall_info["label"] == "very_high":
        rainfall_context["timing_advice"] = (
            "Heavy rainfall detected. Delay fertilizer application by 2-3 days "
            "until soil drains. Apply in split doses to reduce leaching loss."
        )
    elif rainfall_info["label"] == "high":
        rainfall_context["timing_advice"] = (
            "Above-optimal rainfall. Consider split application — apply half now "
            "and remaining after 3-4 days."
        )
    elif rainfall_info["label"] == "very_low":
        rainfall_context["timing_advice"] = (
            "Very dry conditions. Apply fertilizer near irrigation channels or "
            "ensure irrigation within 24 hours of application for proper uptake."
        )
    elif rainfall_info["label"] == "low":
        rainfall_context["timing_advice"] = (
            "Below-optimal moisture. Irrigate after fertilizer application or "
            "apply during early morning when soil has some dew."
        )
    else:
        rainfall_context["timing_advice"] = (
            "Rainfall is optimal. Apply fertilizer as per standard practice."
        )

    result = dict(selection_result)
    result["recommendations"] = {
        "organic": adjusted_organic,
        "chemical_supplements": adjusted_chemical,
        "ph_amendments": adjusted_ph
    }
    result["rainfall_context"] = rainfall_context

    return result
