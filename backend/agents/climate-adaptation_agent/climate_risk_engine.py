"""
Climate Adaptation Agent – Phase 3
Rule-Based Climate Risk Engine

- Deterministic
- Explainable
- No ML
- No LLM
"""

from typing import Dict, List


def assess_climate_risks(
    weather: Dict[str, float],
    crop: Dict
) -> List[Dict[str, str]]:
    """
    Assess climate risks for a given crop using rule-based logic.

    Parameters
    ----------
    weather : dict
        {
            "temp_current": float,
            "temp_forecast_max": float,
            "temp_forecast_min": float,
            "humidity": float,
            "seasonal_rainfall": float
        }

    crop : dict
        Crop profile loaded from crop_climate_profiles.json

    Returns
    -------
    List[dict]
        [
            {
                "risk": str,
                "severity": str,
                "trigger": str
            }
        ]
    """

    risks: List[Dict[str, str]] = []

    # -------------------------------
    # 1. HEAT STRESS
    # -------------------------------
    if weather["temp_forecast_max"] >= crop["temperature"]["heat_stress"]:
        risks.append({
            "risk": "Heat Stress",
            "severity": "High",
            "trigger": "Forecast maximum temperature exceeds crop heat stress threshold"
        })
    elif weather["temp_current"] > crop["temperature"]["max_safe"]:
        risks.append({
            "risk": "Heat Stress",
            "severity": "Medium",
            "trigger": "Current temperature above safe maximum range"
        })

    # -------------------------------
    # 2. COLD STRESS
    # -------------------------------
    if weather["temp_current"] <= crop["temperature"]["cold_stress"]:
        risks.append({
            "risk": "Cold Stress",
            "severity": "High",
            "trigger": "Current temperature below cold stress threshold"
        })
    elif weather["temp_current"] < crop["temperature"]["min_safe"]:
        risks.append({
            "risk": "Cold Stress",
            "severity": "Medium",
            "trigger": "Current temperature below safe minimum range"
        })

    # -------------------------------
    # 3. FROST RISK
    # -------------------------------
    if crop["frost_sensitive"] and weather["temp_forecast_min"] <= 2:
        risks.append({
            "risk": "Frost Risk",
            "severity": "High",
            "trigger": "Forecast minimum temperature indicates frost conditions"
        })

    # -------------------------------
    # 4. DRY SPELL RISK
    # -------------------------------
    if weather["seasonal_rainfall"] < crop["rainfall"]["seasonal_low"]:
        severity = (
            "High"
            if weather["seasonal_rainfall"] <
               0.7 * crop["rainfall"]["seasonal_low"]
            else "Medium"
        )

        risks.append({
            "risk": "Dry Spell Risk",
            "severity": severity,
            "trigger": "Seasonal rainfall below crop minimum requirement"
        })

    # -------------------------------
    # 5. WATERLOGGING / EXCESS RAINFALL
    # -------------------------------
    if (
        weather["seasonal_rainfall"] > crop["rainfall"]["seasonal_high"]
        and crop["rainfall"]["waterlogging_sensitive"]
    ):
        risks.append({
            "risk": "Waterlogging Risk",
            "severity": "High",
            "trigger": "Seasonal rainfall exceeds tolerance for waterlogging-sensitive crop"
        })

    # -------------------------------
    # 6. HIGH HUMIDITY (WARNING ONLY)
    # -------------------------------
    if weather["humidity"] >= crop["humidity"]["high_risk"]:
        risks.append({
            "risk": "High Humidity Risk",
            "severity": "Low",
            "trigger": "High humidity may increase crop stress and secondary risks"
        })

    return risks


# -------------------------------------------------
# LOCAL TEST (Run this file directly to test logic)
# -------------------------------------------------
if __name__ == "__main__":

    # Example weather scenario
    weather_context = {
        "temp_current": 36.0,
        "temp_forecast_max": 40.0,
        "temp_forecast_min": 22.0,
        "humidity": 88.0,
        "seasonal_rainfall": 500.0
    }

    # Example crop profile (Rice)
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

    detected_risks = assess_climate_risks(weather_context, rice_profile)

    print("Detected Climate Risks:\n")
    for risk in detected_risks:
        print(risk)
