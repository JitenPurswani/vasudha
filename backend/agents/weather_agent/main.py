# main.py (Weather Agent)
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv

# --- 1. Load Environment Variables (API Key) ---
load_dotenv() # Load variables from .env file
API_KEY = os.getenv("OPENWEATHERMAP_API_KEY")

if not API_KEY:
    print("❌ Error: OpenWeatherMap API Key not found. Make sure it's in the .env file.")
    # You might want to raise an error or exit if the key is essential
    # raise ValueError("API Key not configured")

# --- 2. Initialize FastAPI app ---
app = FastAPI(title="Weather Agent")

# --- 3. Define Input/Output Data Models ---
class LocationInput(BaseModel):
    latitude: float
    longitude: float

class WeatherDataOutput(BaseModel):
    temperature_celsius: float | None
    humidity_percent: float | None
    rainfall_last_1h_mm: float | None # Note: OWM provides rain in the last 1h or 3h
    description: str | None
    city_name: str | None

class WeatherResponse(BaseModel):
    weather_data: WeatherDataOutput
    status: str # e.g., "OK", "APIError", "DataNotFound"

# --- 4. API Call Function ---
def get_weather_from_api(lat: float, lon: float) -> dict | None:
    """Calls OpenWeatherMap API to get current weather data."""
    if not API_KEY:
        return None # Cannot proceed without API key

    base_url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": API_KEY,
        "units": "metric" # Get temperature in Celsius
    }
    try:
        response = requests.get(base_url, params=params, timeout=10)
        response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ API Request Error: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error during API call: {e}")
        return None

# --- 5. API Endpoint ---
@app.post("/get_current_weather/", response_model=WeatherResponse)
async def get_current_weather(location: LocationInput):
    """
    Takes latitude/longitude, calls OpenWeatherMap API,
    and returns current weather conditions.
    """
    api_result = get_weather_from_api(location.latitude, location.longitude)

    if not api_result:
        return WeatherResponse(
            weather_data=WeatherDataOutput(temperature_celsius=None, humidity_percent=None, rainfall_last_1h_mm=None, description=None, city_name=None),
            status="APIErrorOrKeyMissing"
        )

    # --- Extract relevant data ---
    try:
        temp = api_result.get("main", {}).get("temp")
        humidity = api_result.get("main", {}).get("humidity")
        # Rainfall data might be nested under 'rain' and '1h' or '3h'
        rainfall = api_result.get("rain", {}).get("1h") # Check for rain in the last 1 hour
        if rainfall is None:
             rainfall = api_result.get("rain", {}).get("3h", 0.0) / 3 # Approx hourly if only 3h available, default 0
        else:
             rainfall = float(rainfall)

        description = api_result.get("weather", [{}])[0].get("description", "N/A")
        city_name = api_result.get("name", "N/A")

        return WeatherResponse(
            weather_data=WeatherDataOutput(
                temperature_celsius=temp,
                humidity_percent=humidity,
                rainfall_last_1h_mm=rainfall,
                description=description,
                city_name=city_name
            ),
            status="OK"
        )
    except Exception as e:
        print(f"❌ Error parsing API response: {e}")
        return WeatherResponse(
            weather_data=WeatherDataOutput(temperature_celsius=None, humidity_percent=None, rainfall_last_1h_mm=None, description=None, city_name=None),
            status="ParsingError"
        )


# --- 6. Root endpoint ---
@app.get("/")
def read_root():
    return {"status": "Weather Agent is running"}