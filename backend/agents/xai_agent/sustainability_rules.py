"""
Rule-based interpretation of sustainability scoring output.
Pure XAI layer – no computation, no dependency on sustainability agent code.
"""


def explain_sustainability(crop: str, sustainability_data: dict | None) -> str | None:
    """
    Convert sustainability agent output into a concise explanation.
    """

    if sustainability_data is None:
        return None

    score = sustainability_data.get("sustainability_score")
    explanation = sustainability_data.get("explanation", {})
    summary = explanation.get("summary")

    if score is None:
        return None

    # Tiered interpretation (aligned with your numeric design)
    if score >= 0.80:
        level = "highly sustainable"
    elif 0.65 <= score < 0.80:
        level = "moderately sustainable"
    elif 0.50 <= score < 0.65:
        level = "marginally sustainable"
    else:
        level = "low sustainability"

    # Final explanation sentence
    return (
        f"{crop.capitalize()} is considered {level}. "
        f"{summary}"
    )
