import json
from climate_risk_engine import assess_climate_risks
from preventive_action_mapper import load_action_map, attach_preventive_actions


def run_climate_adaptation(
    weather_context: dict,
    crop_profile: dict,
    action_map_path: str = "climate_preventive_actions.json"
):
    """
    Full Climate Adaptation Agent pipeline:
    Weather → Climate Risks → Preventive Actions
    """

    # Step 1: Detect climate risks
    risks = assess_climate_risks(weather_context, crop_profile)

    if not risks:
        return {
            "status": "OK",
            "message": "No significant climate risks detected",
            "risks": []
        }

    # Step 2: Attach preventive actions
    action_map = load_action_map(action_map_path)
    enriched_risks = attach_preventive_actions(risks, action_map)

    return {
        "status": "ALERT",
        "risks": enriched_risks
    }


# -----------------------
# LOCAL TEST
# -----------------------
if __name__ == "__main__":

    weather_context = {
        "temp_current": 36,
        "temp_forecast_max": 40,
        "temp_forecast_min": 22,
        "humidity": 88,
        "seasonal_rainfall": 500
    }

    rice_profile = {
        "temperature": {
            "min_safe": 15,
            "max_safe": 35,
            "heat_stress": 38,
            "cold_stress": 12
        },
        "rainfall": {
            "seasonal_low": 800,
            "seasonal_high": 2500,
            "waterlogging_sensitive": False
        },
        "humidity": {
            "high_risk": 90
        },
        "frost_sensitive": True
    }

    result = run_climate_adaptation(weather_context, rice_profile)
    print(json.dumps(result, indent=2))
