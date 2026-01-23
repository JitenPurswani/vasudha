"""
Central reasoning engine for XAI.
Combines SHAP, market, and sustainability explanations into a single narrative.
"""

from shap_rules import build_shap_explanations
from sustainability_rules import explain_sustainability
from market_rules import explain_market


def generate_crop_explanation(
    crop: str,
    shap_summary: dict | None,
    market_score: float | None,
    sustainability_data: dict | None
):
    """
    Build a full explanation for a single crop.
    """

    explanations = []

    # --------------------------------------------------
    # 1. Model (SHAP) Explanation
    # --------------------------------------------------
    if shap_summary:
        shap_explanations = build_shap_explanations(shap_summary)
    else:
        shap_explanations = []

    # --------------------------------------------------
    # 2. Market Explanation
    # --------------------------------------------------
    market_explanation = explain_market(crop, market_score)

    # --------------------------------------------------
    # 3. Sustainability Explanation
    # --------------------------------------------------
    sustainability_explanation = explain_sustainability(
        crop, sustainability_data
    )

    # --------------------------------------------------
    # 4. Final Summary (Deterministic)
    # --------------------------------------------------
    summary_parts = []

    if market_explanation:
        summary_parts.append("Economically viable")

    if sustainability_explanation:
        summary_parts.append("environmentally acceptable")

    if shap_explanations:
        summary_parts.append("supported by soil and climate conditions")

    summary = ", ".join(summary_parts).capitalize() + "."

    return {
        "crop": crop,
        "model_explanation": shap_explanations,
        "market_explanation": market_explanation,
        "sustainability_explanation": sustainability_explanation,
        "summary": summary
    }


def generate_xai_response(recommendations, sustainability_results):
    """
    Generate XAI explanations for all recommended crops.
    """

    sustainability_map = {
        item["crop"]: item
        for item in (sustainability_results or [])
    }

    explanations = []

    for rec in recommendations:
        crop = rec["crop"]

        explanations.append(
            generate_crop_explanation(
                crop=crop,
                shap_summary=rec.get("shap_summary"),
                market_score=rec.get("market_score"),
                sustainability_data=sustainability_map.get(crop)
            )
        )

    return explanations
