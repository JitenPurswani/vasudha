import preventive_action_mapper as mapper


def test_attach_preventive_actions_maps_by_risk_and_severity():
    risks = [
        {"risk": "Heat Stress", "severity": "High"},
        {"risk": "Dry Spell Risk", "severity": "Medium"},
        {"risk": "Unknown Risk", "severity": "Low"},
    ]

    action_map = {
        "Heat Stress": {
            "High": ["Provide shade", "Increase irrigation scheduling"],
        },
        "Dry Spell Risk": {
            "Medium": ["Apply mulching", "Adjust sowing date"],
        },
    }

    enriched = mapper.attach_preventive_actions(risks, action_map)

    # Correct actions attached for known risk/severity pairs
    heat = next(r for r in enriched if r["risk"] == "Heat Stress")
    dry = next(r for r in enriched if r["risk"] == "Dry Spell Risk")
    unknown = next(r for r in enriched if r["risk"] == "Unknown Risk")

    assert heat["preventive_actions"] == ["Provide shade", "Increase irrigation scheduling"]
    assert dry["preventive_actions"] == ["Apply mulching", "Adjust sowing date"]

    # Unknown risk or unmapped severity should yield an empty list
    assert unknown["preventive_actions"] == []


def test_load_action_map_reads_json(tmp_path):
    sample = {
        "Heat Stress": {"High": ["Action 1"]},
    }

    json_path = tmp_path / "actions.json"
    json_path.write_text('{"Heat Stress": {"High": ["Action 1"]}}')

    loaded = mapper.load_action_map(str(json_path))
    assert loaded == sample
