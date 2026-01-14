import os
import requests
from dotenv import load_dotenv

load_dotenv()

OPENWEATHER_API_KEY = os.getenv("OPENWEATHERMAP_API_KEY")


def fetch_current_weather(lat: float, lon: float) -> dict:
    """
    Fetch current temperature and humidity
    """
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric"
    }

    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()

    return {
        "temp_current": data["main"]["temp"],
        "humidity": data["main"]["humidity"]
    }


def fetch_forecast_weather(lat: float, lon: float) -> dict:
    """
    Fetch forecasted min & max temperature (next 5 days)
    """
    url = "https://api.openweathermap.org/data/2.5/forecast"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric"
    }

    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()

    temps = [item["main"]["temp"] for item in data["list"]]

    return {
        "temp_forecast_max": max(temps),
        "temp_forecast_min": min(temps)
    }
