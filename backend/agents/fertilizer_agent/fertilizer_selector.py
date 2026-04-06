"""
Fertilizer Selector — Stage 2 of the Fertilizer Recommendation Pipeline
Selects the best fertilizer(s) to address N/P/K deficits and pH issues.
ORGANIC-FIRST: Always prefers organic fertilizers. Chemical is used only
when organic alone cannot cover the deficit or when time is critical.
"""

import json
import os
import math

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(BASE_DIR, "fertilizers.json"), "r") as f:
    FERTILIZERS_DB = json.load(f)


def _dict_to_list(section: dict | list) -> list[dict]:
    """Convert a dict-keyed section {id: {...}} into a list [{id: id, ...}]."""
    if isinstance(section, list):
        return section
    items = []
    for key, val in section.items():
        if key.startswith("_"):
            continue
        entry = dict(val)
        entry["id"] = key
        items.append(entry)
    return items


def _get_organic_fertilizers() -> list[dict]:
    """Return organic fertilizers sorted by N+P+K coverage (descending)."""
    organics = _dict_to_list(FERTILIZERS_DB.get("organic", {}))
    # Sort by total nutrient coverage (highest first)
    return sorted(
        organics,
        key=lambda f: (
            f["nutrient_content"]["N"] +
            f["nutrient_content"]["P"] +
            f["nutrient_content"]["K"]
        ),
        reverse=True
    )


def _get_chemical_fertilizers() -> list[dict]:
    """Return chemical fertilizers."""
    return _dict_to_list(FERTILIZERS_DB.get("chemical", {}))


def _get_ph_amendments() -> list[dict]:
    """Return pH correction amendments."""
    return _dict_to_list(FERTILIZERS_DB.get("ph_amendments", {}))


def _compute_quantity(deficit_kg_ha: float, nutrient_pct: float) -> float:
    """
    How many kg/ha of a fertilizer is needed to supply the deficit.
    deficit_kg_ha: kg of nutrient needed per hectare
    nutrient_pct: percentage of that nutrient in the fertilizer (e.g., 0.6 for FYM N)
    """
    if nutrient_pct <= 0:
        return 0.0
    # Convert percentage to fraction
    fraction = nutrient_pct / 100.0
    if fraction <= 0:
        return 0.0
    return round(deficit_kg_ha / fraction, 1)


def _select_organic_for_nutrient(
    deficit_kg_ha: float,
    nutrient: str,
    organics: list[dict]
) -> list[dict]:
    """
    Select organic fertilizer(s) to address a specific nutrient deficit.
    Returns list of {fertilizer, quantity_kg_ha, nutrient_supplied_kg_ha, method}.
    """
    if deficit_kg_ha <= 0:
        return []

    recommendations = []
    remaining_deficit = deficit_kg_ha

    for fert in organics:
        pct = fert["nutrient_content"].get(nutrient, 0)
        if pct <= 0:
            continue

        qty = _compute_quantity(remaining_deficit, pct)
        max_dose = fert.get("typical_dose_kg_ha", 5000)

        # Cap at typical max dose
        actual_qty = min(qty, max_dose * 1.5)
        supplied = round(actual_qty * (pct / 100.0), 1)

        recommendations.append({
            "fertilizer_id": fert["id"],
            "display_name": fert["display_name"],
            "type": "organic",
            "quantity_kg_ha": actual_qty,
            "nutrient_supplied_kg_ha": {nutrient: supplied},
            "release_speed": fert.get("release_speed", "slow"),
            "methods": fert.get("methods", []),
            "benefits": fert.get("benefits", []),
            "notes": fert.get("notes", "")
        })

        remaining_deficit -= supplied
        if remaining_deficit <= 0:
            break

    return recommendations, max(0, remaining_deficit)


def _fill_with_chemical(
    remaining_deficit: float,
    nutrient: str,
    chemicals: list[dict],
    severity: str
) -> list[dict]:
    """
    If organic cannot fully cover the deficit, fill with chemical fertilizer.
    Only triggered for moderate/high/critical severity or if organic leaves a gap.
    """
    if remaining_deficit <= 0:
        return []

    # Sort chemicals by their content of the target nutrient (highest first)
    relevant = [c for c in chemicals if c["nutrient_content"].get(nutrient, 0) > 0]
    relevant.sort(key=lambda c: c["nutrient_content"][nutrient], reverse=True)

    recommendations = []
    for fert in relevant[:2]:  # Max 2 chemical supplements
        pct = fert["nutrient_content"][nutrient]
        qty = _compute_quantity(remaining_deficit, pct)
        max_dose = fert.get("typical_dose_kg_ha", 200)
        actual_qty = min(qty, max_dose * 1.2)
        supplied = round(actual_qty * (pct / 100.0), 1)

        recommendations.append({
            "fertilizer_id": fert["id"],
            "display_name": fert["display_name"],
            "type": "chemical",
            "quantity_kg_ha": actual_qty,
            "nutrient_supplied_kg_ha": {nutrient: supplied},
            "release_speed": fert.get("release_speed", "fast"),
            "methods": fert.get("methods", []),
            "benefits": fert.get("benefits", []),
            "notes": fert.get("notes", ""),
            "reason": f"Organic alone insufficient for {nutrient} deficit ({severity} severity). Chemical supplement recommended."
        })

        remaining_deficit -= supplied
        if remaining_deficit <= 0:
            break

    return recommendations


def _select_ph_amendment(ph_assessment: dict) -> list[dict]:
    """
    Select pH correction amendment based on pH assessment.
    """
    if ph_assessment["status"] == "none":
        return []

    amendments = _get_ph_amendments()
    direction = ph_assessment["direction"]
    gap = ph_assessment["gap"]

    recommendations = []
    for amend in amendments:
        if direction == "too_acidic" and amend.get("ph_effect") == "raise":
            # Lime: ~1 ton/ha raises pH by ~0.5-1.0 unit
            base_dose = amend.get("typical_dose_kg_ha", 500)
            multiplier = min(gap / 0.5, 3.0)  # Cap at 3x
            qty = round(base_dose * multiplier, 0)
            recommendations.append({
                "fertilizer_id": amend["id"],
                "display_name": amend["display_name"],
                "type": "ph_amendment",
                "quantity_kg_ha": qty,
                "purpose": "Raise soil pH (reduce acidity)",
                "release_speed": amend.get("release_speed", "slow"),
                "methods": amend.get("methods", []),
                "notes": amend.get("notes", "")
            })
            break  # One amendment is enough

        elif direction == "too_alkaline" and amend.get("ph_effect") == "lower":
            base_dose = amend.get("typical_dose_kg_ha", 200)
            multiplier = min(gap / 0.5, 3.0)
            qty = round(base_dose * multiplier, 0)
            recommendations.append({
                "fertilizer_id": amend["id"],
                "display_name": amend["display_name"],
                "type": "ph_amendment",
                "quantity_kg_ha": qty,
                "purpose": "Lower soil pH (reduce alkalinity)",
                "release_speed": amend.get("release_speed", "slow"),
                "methods": amend.get("methods", []),
                "notes": amend.get("notes", "")
            })
            break

    return recommendations


def select_fertilizers(deficit_result: dict) -> dict:
    """
    Main entry point for Stage 2.

    Takes the deficit result from Stage 1 and selects fertilizers.
    Priority: organic first, chemical only as supplement.

    Args:
        deficit_result: Output dict from deficit_calculator.calculate_deficit()

    Returns:
        dict with organic_recommendations, chemical_supplements, ph_amendments,
        and a combined summary.
    """
    if "error" in deficit_result:
        return deficit_result

    deficits = deficit_result["deficit_kg_ha"]
    severities = deficit_result["severity"]
    ph_assessment = deficit_result["ph_assessment"]

    organics = _get_organic_fertilizers()
    chemicals = _get_chemical_fertilizers()

    all_organic = []
    all_chemical = []

    # Process each nutrient
    for nutrient in ["N", "P", "K"]:
        deficit_kg = deficits.get(nutrient, 0)
        severity = severities.get(nutrient, "none")

        if deficit_kg <= 0 or severity == "none":
            continue

        # Step 1: Try organic first
        organic_recs, remaining = _select_organic_for_nutrient(
            deficit_kg, nutrient, organics
        )
        all_organic.extend(organic_recs)

        # Step 2: If organic can't cover it AND severity is moderate+, add chemical
        if remaining > 0 and severity in ("moderate", "high", "critical"):
            chem_recs = _fill_with_chemical(remaining, nutrient, chemicals, severity)
            all_chemical.extend(chem_recs)

    # pH amendments
    ph_recs = _select_ph_amendment(ph_assessment)

    # Deduplicate organics (same fertilizer may appear for N and K)
    seen_organic_ids = {}
    deduped_organic = []
    for rec in all_organic:
        fid = rec["fertilizer_id"]
        if fid in seen_organic_ids:
            # Merge: take higher quantity
            existing = seen_organic_ids[fid]
            if rec["quantity_kg_ha"] > existing["quantity_kg_ha"]:
                existing["quantity_kg_ha"] = rec["quantity_kg_ha"]
            # Merge nutrient supplied
            for k, v in rec["nutrient_supplied_kg_ha"].items():
                existing["nutrient_supplied_kg_ha"][k] = v
        else:
            seen_organic_ids[fid] = rec
            deduped_organic.append(rec)

    # Compute overall summary
    has_deficit = any(deficits.get(n, 0) > 0 for n in ["N", "P", "K"])
    has_ph_issue = ph_assessment["status"] != "none"

    if not has_deficit and not has_ph_issue:
        # No deficit detected - provide maintenance recommendation
        summary = "No deficit detected. Soil nutrients and pH are within optimal range for the current growth stage. Provide organic maintenance fertilizer to sustain soil health and productivity."
        priority = "maintenance"
        
        # Add maintenance organic fertilizer recommendation
        # Prefer FYM/Compost for maintenance (most commonly available)
        maintenance_fert = None
        for fert in organics:
            if fert["id"] in ["fym", "compost", "vermicompost"]:
                maintenance_fert = fert
                break
        
        if maintenance_fert:
            # Typical maintenance dose: 5-10 tons FYM/ha
            qty = maintenance_fert.get("typical_dose_kg_ha", 7500)
            deduped_organic.append({
                "fertilizer_id": maintenance_fert["id"],
                "display_name": maintenance_fert["display_name"],
                "type": "organic",
                "quantity_kg_ha": qty,
                "nutrient_supplied_kg_ha": {
                    "N": round(qty * (maintenance_fert["nutrient_content"]["N"] / 100.0), 1),
                    "P": round(qty * (maintenance_fert["nutrient_content"]["P"] / 100.0), 1),
                    "K": round(qty * (maintenance_fert["nutrient_content"]["K"] / 100.0), 1)
                },
                "release_speed": maintenance_fert.get("release_speed", "slow"),
                "benefits": maintenance_fert.get("benefits", []),
                "notes": "Maintenance dose to sustain soil productivity and organic matter content.",
                "methods": maintenance_fert.get("methods", []),
                "original_quantity_kg_ha": qty,
                "rainfall_adjustment": 1.0
            })
    else:
        worst_severity = max(
            [severities.get(n, "none") for n in ["N", "P", "K"]] + [ph_assessment["status"]],
            key=lambda s: ["none", "low", "moderate", "high", "critical"].index(s)
        )
        priority = worst_severity

        deficit_parts = []
        for n in ["N", "P", "K"]:
            if severities.get(n, "none") != "none":
                deficit_parts.append(f"{n}: {severities[n]} ({deficits[n]} kg/ha deficit)")
        if has_ph_issue:
            deficit_parts.append(f"pH: {ph_assessment['direction']} (gap: {ph_assessment['gap']})")

        summary = f"Deficits detected — {', '.join(deficit_parts)}. "
        if deduped_organic:
            summary += f"Recommended {len(deduped_organic)} organic fertilizer(s) as primary treatment. "
        if all_chemical:
            summary += f"Added {len(all_chemical)} chemical supplement(s) where organic is insufficient. "
        if ph_recs:
            summary += f"pH correction: {ph_recs[0]['display_name']}. "

    return {
        "crop": deficit_result["crop"],
        "stage": deficit_result["stage"],
        "deficit_kg_ha": deficits,
        "severity": severities,
        "ph_assessment": {
            "status": ph_assessment["status"],
            "direction": ph_assessment.get("direction", ""),
            "gap": ph_assessment.get("gap", 0)
        },
        "recommendations": {
            "organic": deduped_organic,
            "chemical_supplements": all_chemical,
            "ph_amendments": ph_recs
        },
        "priority": priority,
        "organic_first": True,
        "summary": summary.strip()
    }
