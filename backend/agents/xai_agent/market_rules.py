"""
Rule-based explanations for market agent output.
Derived directly from market_logic.py scoring design.
"""


def explain_market(crop: str, market_score: float | None) -> str | None:
    """
    Generate a human-readable explanation for market attractiveness.
    """

    if market_score is None:
        return None

    # market_score is 0–100 (as returned by market agent)
    score = market_score

    if score >= 75:
        return (
            "Strong market outlook due to high average prices, stable demand, "
            "and a positive recent price trend."
        )

    elif 60 <= score < 75:
        return (
            "Good market potential supported by stable prices and moderate "
            "recent demand growth."
        )

    elif 45 <= score < 60:
        return (
            "Moderate market conditions with balanced pricing and limited "
            "price volatility."
        )

    elif 30 <= score < 45:
        return (
            "Weaker market outlook due to price fluctuations or declining "
            "recent trends."
        )

    else:
        return (
            "Low market attractiveness driven by unstable prices or reduced "
            "recent demand."
        )
