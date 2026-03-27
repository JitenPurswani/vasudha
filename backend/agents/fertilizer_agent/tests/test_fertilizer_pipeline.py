import fertilizer_pipeline as pipeline


def test_run_pipeline_deficit_error_short_circuits(monkeypatch):
    """If Stage 1 returns an error, pipeline should stop and surface it."""

    def fake_get_weekly_rainfall(lat, lon):  # noqa: ARG001
        return {"weekly_rainfall_mm": 20.0}

    def fake_calculate_deficit(*args, **kwargs):  # noqa: ARG001
        return {"error": "Deficit calculation failed"}

    monkeypatch.setattr(pipeline, "get_weekly_rainfall", fake_get_weekly_rainfall, raising=False)
    monkeypatch.setattr(pipeline, "calculate_deficit", fake_calculate_deficit, raising=False)

    out = pipeline.run_pipeline(
        crop="wheat",
        lat=18.5,
        lon=73.9,
        crop_age_days=30,
        current_n=50,
        current_p=30,
        current_k=40,
        current_ph=6.5,
    )

    assert out["stage_failed"] == "deficit_calculator"
    assert out["error"] == "Deficit calculation failed"
    assert "rainfall" in out


def test_run_pipeline_selector_error_short_circuits(monkeypatch):
    """If Stage 2 returns an error, pipeline should stop and surface it with deficit + rainfall context."""

    def fake_get_weekly_rainfall(lat, lon):  # noqa: ARG001
        return {"weekly_rainfall_mm": 35.0}

    fake_deficit = {"deficit": True}

    def fake_calculate_deficit(*args, **kwargs):  # noqa: ARG001
        return fake_deficit

    def fake_select_fertilizers(deficit_result):  # noqa: ARG001
        return {"error": "Selection failed"}

    def fake_adjust_for_rainfall(selection_result, weekly_rainfall_mm):  # noqa: ARG001
        raise AssertionError("Should not be called when selector fails")

    monkeypatch.setattr(pipeline, "get_weekly_rainfall", fake_get_weekly_rainfall, raising=False)
    monkeypatch.setattr(pipeline, "calculate_deficit", fake_calculate_deficit, raising=False)
    monkeypatch.setattr(pipeline, "select_fertilizers", fake_select_fertilizers, raising=False)
    monkeypatch.setattr(pipeline, "adjust_for_rainfall", fake_adjust_for_rainfall, raising=False)

    out = pipeline.run_pipeline(
        crop="wheat",
        lat=18.5,
        lon=73.9,
        crop_age_days=30,
        current_n=50,
        current_p=30,
        current_k=40,
        current_ph=6.5,
    )

    assert out["stage_failed"] == "fertilizer_selector"
    assert out["error"] == "Selection failed"
    assert out["deficit"] == fake_deficit
    assert "rainfall" in out


def test_run_pipeline_happy_path_with_rainfall_adjustment(monkeypatch):
    """Full pipeline success path: stages 1-4 compose into final response with rainfall-adjusted dosage."""

    def fake_get_weekly_rainfall(lat, lon):  # noqa: ARG001
        return {"weekly_rainfall_mm": 25.0}

    fake_deficit = {"deficit": True}
    fake_selection = {"selection": True}
    fake_adjusted = {"recommendations": {"organic": [{"id": "org1"}]}}

    def fake_calculate_deficit(*args, **kwargs):  # noqa: ARG001
        return fake_deficit

    def fake_select_fertilizers(deficit_result):  # noqa: ARG001
        assert deficit_result is fake_deficit
        return fake_selection

    def fake_adjust_for_rainfall(selection_result, weekly_rainfall_mm):  # noqa: ARG001
        assert selection_result is fake_selection
        return fake_adjusted

    def fake_match_tools(adjusted_result):  # noqa: ARG001
        out = dict(adjusted_result)
        out["tools_matched"] = True
        return out

    monkeypatch.setattr(pipeline, "get_weekly_rainfall", fake_get_weekly_rainfall, raising=False)
    monkeypatch.setattr(pipeline, "calculate_deficit", fake_calculate_deficit, raising=False)
    monkeypatch.setattr(pipeline, "select_fertilizers", fake_select_fertilizers, raising=False)
    monkeypatch.setattr(pipeline, "adjust_for_rainfall", fake_adjust_for_rainfall, raising=False)
    monkeypatch.setattr(pipeline, "match_tools", fake_match_tools, raising=False)

    out = pipeline.run_pipeline(
        crop="wheat",
        lat=18.5,
        lon=73.9,
        crop_age_days=30,
        current_n=50,
        current_p=30,
        current_k=40,
        current_ph=6.5,
    )

    assert out["tools_matched"] is True
    assert out["rainfall_data"]["weekly_rainfall_mm"] == 25.0
    assert out["input"]["crop"] == "wheat"
