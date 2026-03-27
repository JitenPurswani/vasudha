import reasoning_engine as engine


def test_generate_crop_explanation_with_full_inputs(monkeypatch):
    """Combines SHAP, market, and sustainability inputs into a coherent summary."""

    def fake_build_shap_explanations(summary):  # noqa: ARG001
        return [
            {"feature": "rainfall", "effect": "positive", "reason": "Good rainfall supports this crop."},
            {"feature": "temperature", "effect": "neutral", "reason": "Temperature is within acceptable range."},
        ]

    def fake_explain_market(crop: str, market_score: float | None) -> str:  # noqa: ARG001
        return "Market conditions are favorable with strong price stability."

    def fake_explain_sustainability(crop: str, data: dict | None) -> str:  # noqa: ARG001
        return "Sustainability profile is acceptable given water and soil impacts."

    monkeypatch.setattr(engine, "build_shap_explanations", fake_build_shap_explanations, raising=False)
    monkeypatch.setattr(engine, "explain_market", fake_explain_market, raising=False)
    monkeypatch.setattr(engine, "explain_sustainability", fake_explain_sustainability, raising=False)

    shap_summary = {"dummy": True}
    sustainability = {"crop": "Wheat", "sustainability_score": 0.8}

    out = engine.generate_crop_explanation(
        crop="Wheat",
        shap_summary=shap_summary,
        market_score=0.9,
        sustainability_data=sustainability,
    )

    assert out["crop"] == "Wheat"
    assert len(out["model_explanation"]) == 2
    assert out["market_explanation"].startswith("Market conditions are favorable")
    assert out["sustainability_explanation"].startswith("Sustainability profile is acceptable")

    # Summary should weave together all three dimensions
    summary = out["summary"].lower()
    assert "economically viable" in summary
    assert "environmentally acceptable" in summary
    assert "supported by soil and climate conditions" in summary


def test_generate_crop_explanation_handles_missing_inputs(monkeypatch):
    """Handles missing SHAP and sustainability data gracefully, still returning a summary."""

    # Only market explanation is available
    def fake_explain_market(crop: str, market_score: float | None) -> str:  # noqa: ARG001
        return "Market conditions are moderately favorable."

    def fake_explain_sustainability(crop: str, data: dict | None) -> str:  # noqa: ARG001
        # Simulate no sustainability explanation when data is None
        return "" if data is None else "Sustainability explanation present."

    monkeypatch.setattr(engine, "build_shap_explanations", lambda summary: [], raising=False)  # noqa: ARG001
    monkeypatch.setattr(engine, "explain_market", fake_explain_market, raising=False)
    monkeypatch.setattr(engine, "explain_sustainability", fake_explain_sustainability, raising=False)

    out = engine.generate_crop_explanation(
        crop="Maize",
        shap_summary=None,
        market_score=0.7,
        sustainability_data=None,
    )

    assert out["crop"] == "Maize"
    assert out["model_explanation"] == []
    assert out["sustainability_explanation"] == ""

    summary = out["summary"].lower()
    # No sustainability or shap terms should appear
    assert "economically viable" in summary
    assert "environmentally acceptable" not in summary
    assert "supported by soil and climate conditions" not in summary


def test_generate_xai_response_maps_sustainability_by_crop(monkeypatch):
    """generate_xai_response should join recommendations with sustainability results by crop name."""

    # Simplify inner explanation generation to focus on mapping logic
    def fake_generate_crop_explanation(crop, shap_summary, market_score, sustainability_data):  # noqa: ARG001
        return {
            "crop": crop,
            "has_sustainability": sustainability_data is not None,
        }

    monkeypatch.setattr(engine, "generate_crop_explanation", fake_generate_crop_explanation, raising=False)

    recommendations = [
        {"crop": "Wheat", "shap_summary": None, "market_score": 0.9},
        {"crop": "Rice", "shap_summary": None, "market_score": 0.8},
    ]

    sustainability_results = [
        {"crop": "Wheat", "sustainability_score": 0.8},
    ]

    out = engine.generate_xai_response(recommendations, sustainability_results)

    wheat = next(item for item in out if item["crop"] == "Wheat")
    rice = next(item for item in out if item["crop"] == "Rice")

    assert wheat["has_sustainability"] is True
    assert rice["has_sustainability"] is False
