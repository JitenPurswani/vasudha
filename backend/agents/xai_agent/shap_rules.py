"""
Rule-based interpretation of SHAP feature contributions.
This file converts SHAP summaries into human-readable explanations.
"""

FEATURE_EXPLANATION_RULES = {
    "nitrogen": {
        "positive": "Adequate nitrogen levels support healthy vegetative growth.",
        "negative": "Low nitrogen availability limits plant growth and yield potential.",
        "neutral": "Nitrogen levels are not a major influencing factor for this crop."
    },
    "phosphorus": {
        "positive": "Phosphorus supports strong root development and early plant vigor.",
        "negative": "Insufficient phosphorus may restrict root growth and flowering.",
        "neutral": "Phosphorus levels are within a tolerable range for this crop."
    },
    "potassium": {
        "positive": "Potassium improves stress tolerance and overall crop resilience.",
        "negative": "Low potassium can reduce disease resistance and crop quality.",
        "neutral": "Potassium has a limited effect on this recommendation."
    },
    "ph": {
        "positive": "Soil pH is well suited for nutrient uptake and crop growth.",
        "negative": "Soil pH may restrict nutrient availability for this crop.",
        "neutral": "Soil pH does not strongly influence this crop’s suitability."
    },
    "rainfall": {
        "positive": "Rainfall levels align well with this crop’s water requirements.",
        "negative": "Excess or insufficient rainfall reduces suitability for this crop.",
        "neutral": "Rainfall does not significantly affect this recommendation."
    },
    "temperature": {
        "positive": "Temperature conditions are favorable for this crop’s growth cycle.",
        "negative": "Temperature stress may negatively impact crop performance.",
        "neutral": "Temperature plays a minor role for this crop in current conditions."
    }
}


def explain_shap_feature(feature: str, effect: str) -> str:
    """
    Return explanation text for a given feature and effect.
    effect ∈ {positive, negative, neutral}
    """
    return FEATURE_EXPLANATION_RULES.get(
        feature,
        {
            "positive": "This factor contributes positively.",
            "negative": "This factor contributes negatively.",
            "neutral": "This factor has minimal impact."
        }
    ).get(effect, "No explanation available.")


def build_shap_explanations(shap_summary: dict):
    """
    Convert SHAP summary into structured explanations.
    """
    explanations = []

    for feature in shap_summary.get("top_positive_features", []):
        explanations.append({
            "feature": feature,
            "effect": "positive",
            "reason": explain_shap_feature(feature, "positive")
        })

    for feature in shap_summary.get("top_negative_features", []):
        explanations.append({
            "feature": feature,
            "effect": "negative",
            "reason": explain_shap_feature(feature, "negative")
        })

    for feature in shap_summary.get("neutral_features", []):
        explanations.append({
            "feature": feature,
            "effect": "neutral",
            "reason": explain_shap_feature(feature, "neutral")
        })

    return explanations
