from weather_service import fetch_current_weather, fetch_forecast_weather


def build_weather_context(lat: float, lon: float, seasonal_rainfall: float) -> dict:
    """
    Builds unified weather_context required by the risk engine
    """

    current = fetch_current_weather(lat, lon)
    forecast = fetch_forecast_weather(lat, lon)

    return {
        "temp_current": current["temp_current"],
        "humidity": current["humidity"],
        "temp_forecast_max": forecast["temp_forecast_max"],
        "temp_forecast_min": forecast["temp_forecast_min"],
        "seasonal_rainfall": seasonal_rainfall
    }
