import json
from typing import List, Dict


def load_action_map(filepath: str) -> Dict:
    with open(filepath, "r") as f:
        return json.load(f)


def attach_preventive_actions(
    risks: List[Dict],
    action_map: Dict
) -> List[Dict]:
    """
    Attach preventive actions to detected climate risks.
    """
    enriched_risks = []

    for risk in risks:
        risk_type = risk["risk"]
        severity = risk["severity"]

        actions = (
            action_map
            .get(risk_type, {})
            .get(severity, [])
        )

        enriched = {
            **risk,
            "preventive_actions": actions
        }

        enriched_risks.append(enriched)

    return enriched_risks

if __name__ == "__main__":
    sample_risks = [
        {"risk": "Heat Stress", "severity": "High"},
        {"risk": "Dry Spell Risk", "severity": "High"}
    ]

    action_map = load_action_map("climate_preventive_actions.json")
    final_output = attach_preventive_actions(sample_risks, action_map)

    for item in final_output:
        print(item)
