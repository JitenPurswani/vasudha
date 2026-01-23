import json
from pathlib import Path

# --------------------------------------------------
# Load crop sustainability data
# --------------------------------------------------
DATA_PATH = Path(__file__).parent / "crop_sustainability_data.json"

with open(DATA_PATH, "r") as f:
    CROP_DATA = json.load(f)


# --------------------------------------------------
# Numeric mappings (LOCKED DESIGN)
# --------------------------------------------------
WATER_MAP = {
    "very_high": 0.20,
    "high": 0.40,
    "medium": 0.70,
    "low": 0.90
}

SOIL_MAP = {
    "negative": 0.40,
    "neutral": 0.65,
    "positive": 0.90
}

CULTIVATION_MAP = {
    "high": 0.40,
    "medium": 0.65,
    "low": 0.85
}

WEIGHTS = {
    "water": 0.50,
    "soil": 0.30,
    "cultivation": 0.20
}


# --------------------------------------------------
# Core computation
# --------------------------------------------------
def compute_sustainability(crop: str):
    if crop not in CROP_DATA:
        return None

    meta = CROP_DATA[crop]

    water_factor = WATER_MAP[meta["water_intensity"]]
    soil_factor = SOIL_MAP[meta["soil_impact"]]
    cultivation_factor = CULTIVATION_MAP[meta["cultivation_intensity"]]

    score = (
        WEIGHTS["water"] * water_factor +
        WEIGHTS["soil"] * soil_factor +
        WEIGHTS["cultivation"] * cultivation_factor
    )

    return {
        "crop": crop,
        "sustainability_score": round(score, 3),

        "dimensions": {
            "water_intensity": {
                "category": meta["water_intensity"],
                "factor": water_factor,
                "weight": WEIGHTS["water"],
                "impact": "negative" if water_factor < 0.5 else "positive"
            },
            "soil_impact": {
                "category": meta["soil_impact"],
                "factor": soil_factor,
                "weight": WEIGHTS["soil"],
                "impact": "positive" if soil_factor > 0.7 else "neutral"
            },
            "cultivation_intensity": {
                "category": meta["cultivation_intensity"],
                "factor": cultivation_factor,
                "weight": WEIGHTS["cultivation"],
                "impact": "negative" if cultivation_factor < 0.5 else "moderate"
            }
        },

        "score_breakdown": {
            "water_contribution": round(WEIGHTS["water"] * water_factor, 3),
            "soil_contribution": round(WEIGHTS["soil"] * soil_factor, 3),
            "cultivation_contribution": round(WEIGHTS["cultivation"] * cultivation_factor, 3)
        },

        "explanation": {
            "summary": build_summary(meta),
            "details": build_details(meta)
        },

        "disclaimer": (
            "This sustainability score reflects intrinsic crop characteristics "
            "and does not account for local climate, irrigation practices, or soil chemistry."
        )
    }


# --------------------------------------------------
# Explanation helpers
# --------------------------------------------------
def build_summary(meta):
    if meta["water_intensity"] in ["very_high", "high"]:
        return "Lower sustainability due to high water requirements."
    if meta["soil_impact"] == "positive":
        return "High sustainability driven by soil-restorative properties."
    return "Moderate sustainability based on balanced resource usage."


def build_details(meta):
    details = []

    details.append(
        f"Water intensity is classified as {meta['water_intensity']}."
    )
    details.append(
        f"Soil impact is considered {meta['soil_impact']}."
    )
    details.append(
        f"Cultivation intensity is rated as {meta['cultivation_intensity']}."
    )

    return details
