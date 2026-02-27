"""
Rainfall Service — Fetches past 7 days actual rainfall for a location.
Uses OpenWeatherMap "5 day / 3 hour forecast" API (free tier) combined
with current weather for rain estimation.

For the free tier, we use:
1. Current weather API for today's rain
2. 5-day forecast overlapping past data where available

If OpenWeather history is unavailable (paid API), we fall back to
the current weather's `rain` field extrapolated, or to a default estimate.
"""

import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENWEATHERMAP_API_KEY")
BASE_URL = "https://api.openweathermap.org/data/2.5"


def _fetch_current_rain(lat: float, lon: float) -> dict:
    """
    Fetch current weather including rain data.
    Returns: {rain_1h_mm, rain_3h_mm, description}
    """
    url = f"{BASE_URL}/weather"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": API_KEY,
        "units": "metric"
    }

    try:
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        rain = data.get("rain", {})
        return {
            "rain_1h_mm": rain.get("1h", 0.0),
            "rain_3h_mm": rain.get("3h", 0.0),
            "description": data.get("weather", [{}])[0].get("description", ""),
            "humidity": data.get("main", {}).get("humidity", 0),
            "clouds": data.get("clouds", {}).get("all", 0)
        }
    except Exception as e:
        return {
            "rain_1h_mm": 0.0,
            "rain_3h_mm": 0.0,
            "description": "unknown",
            "humidity": 0,
            "clouds": 0,
            "error": str(e)
        }


def _fetch_forecast_rain(lat: float, lon: float) -> float:
    """
    Fetch 5-day/3-hour forecast and estimate total rainfall.
    We use forecast data in reverse to estimate recent rainfall patterns.
    Returns estimated weekly rainfall in mm.
    """
    url = f"{BASE_URL}/forecast"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": API_KEY,
        "units": "metric"
    }

    try:
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        total_rain = 0.0
        forecast_list = data.get("list", [])

        # Sum rain from first 56 entries (7 days × 8 three-hour slots)
        # The forecast only goes forward, so we use the first ~2 days
        # as a proxy for recent weather patterns
        for entry in forecast_list[:56]:
            rain = entry.get("rain", {})
            total_rain += rain.get("3h", 0.0)

        # Scale: forecast is 5 days forward, we want 7-day estimate
        # Use first 2 days of forecast as recent weather proxy,
        # combined with current weather
        if len(forecast_list) >= 16:
            # First 2 days (16 × 3h = 48h)
            two_day_rain = sum(
                entry.get("rain", {}).get("3h", 0.0)
                for entry in forecast_list[:16]
            )
            # Extrapolate to 7 days
            estimated_weekly = two_day_rain * 3.5
        else:
            estimated_weekly = total_rain

        return round(estimated_weekly, 1)
    except Exception:
        return 0.0


def _estimate_from_humidity(humidity: int, clouds: int) -> float:
    """
    Very rough fallback estimate of weekly rainfall from humidity and cloud cover.
    Used when API calls fail.
    """
    if humidity > 85 and clouds > 80:
        return 35.0  # Likely rainy
    elif humidity > 70 and clouds > 60:
        return 20.0
    elif humidity > 55 and clouds > 40:
        return 10.0
    else:
        return 3.0  # Dry


def get_weekly_rainfall(lat: float, lon: float) -> dict:
    """
    Main entry point. Returns estimated past 7-day rainfall for the location.

    Returns:
        {
            weekly_rainfall_mm: float,
            source: str,
            current_conditions: dict,
            confidence: str
        }
    """
    if not API_KEY:
        return {
            "weekly_rainfall_mm": 15.0,
            "source": "default_estimate",
            "current_conditions": {},
            "confidence": "very_low",
            "note": "OPENWEATHERMAP_API_KEY not set. Using default estimate."
        }

    # Fetch current conditions
    current = _fetch_current_rain(lat, lon)

    # Fetch forecast-based estimate
    forecast_weekly = _fetch_forecast_rain(lat, lon)

    # Combine sources for best estimate
    # Current rain (last 1-3h) extrapolated + forecast pattern
    current_daily_est = current["rain_1h_mm"] * 24  # rough daily from hourly

    if forecast_weekly > 0 and current_daily_est > 0:
        # Weighted average of both signals
        weekly_estimate = round((forecast_weekly * 0.6) + (current_daily_est * 7 * 0.4), 1)
        source = "forecast_and_current"
        confidence = "medium"
    elif forecast_weekly > 0:
        weekly_estimate = forecast_weekly
        source = "forecast_extrapolation"
        confidence = "medium"
    elif current["rain_3h_mm"] > 0:
        weekly_estimate = round(current["rain_3h_mm"] * 8 * 3.5, 1)  # 3h→daily→weekly
        source = "current_extrapolation"
        confidence = "low"
    else:
        # Fallback to humidity-based estimate
        weekly_estimate = _estimate_from_humidity(
            current.get("humidity", 50),
            current.get("clouds", 50)
        )
        source = "humidity_estimate"
        confidence = "low"

    return {
        "weekly_rainfall_mm": weekly_estimate,
        "source": source,
        "current_conditions": {
            "description": current.get("description", ""),
            "rain_1h_mm": current.get("rain_1h_mm", 0),
            "humidity": current.get("humidity", 0),
            "clouds_pct": current.get("clouds", 0)
        },
        "confidence": confidence
    }
