import json
import os
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from rainfall_service import get_seasonal_rainfall
from climate_adaptation_pipeline import run_climate_adaptation

# ------------------------
# ENV
# ------------------------
load_dotenv()
OPENWEATHER_API_KEY = os.getenv("OPENWEATHERMAP_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# ------------------------
# APP
# ------------------------
app = FastAPI(
    title="Climate Adaptation Agent",
    version="1.0.0",
    description="Climate risk detection with preventive advisory"
)

# ------------------------
# LOAD CROP PROFILES
# ------------------------
with open("crop_climate_profiles.json", "r") as f:
    CROP_PROFILES = json.load(f)

# ------------------------
# REQUEST / RESPONSE MODELS
# ------------------------
class ClimateRequest(BaseModel):
    crop: str
    lat: float
    lon: float
    season: str
    explain: bool = True   # LLM explanation toggle


class ClimateResponse(BaseModel):
    status: str
    risks: list
    explanation: str | None = None
    debug:dict


# ------------------------
# WEATHER FETCH
# ------------------------


def fetch_weather_context(lat: float, lon: float, district: str, season: str) -> tuple:
    current_url = "https://api.openweathermap.org/data/2.5/weather"
    forecast_url = "https://api.openweathermap.org/data/2.5/forecast"

    params = {
        "lat": lat,
        "lon": lon,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric"
    }

    current_resp = requests.get(current_url, params=params, timeout=10)
    current_resp.raise_for_status()
    current = current_resp.json()

    forecast_resp = requests.get(forecast_url, params=params, timeout=10)
    forecast_resp.raise_for_status()
    forecast = forecast_resp.json()

    temps = [item["main"]["temp"] for item in forecast["list"]]

    seasonal_rainfall = get_seasonal_rainfall(district, season)

    weather_context = {
        "temp_current": current["main"]["temp"],
        "humidity": current["main"]["humidity"],
        "temp_forecast_max": max(temps),
        "temp_forecast_min": min(temps),
        "seasonal_rainfall": seasonal_rainfall
    }

    debug_weather = {
        "current_weather": {
            "temperature_celsius": current["main"]["temp"],
            "humidity_percent": current["main"]["humidity"],
            "raw_api": "openweather /weather"
        },
        "forecast_weather": {
            "forecast_temp_max": max(temps),
            "forecast_temp_min": min(temps),
            "raw_api": "openweather /forecast"
        },
        "rainfall_db": {
            "district": district,
            "season": season,
            "seasonal_rainfall_mm": seasonal_rainfall
        }
    }

    return weather_context, debug_weather



# ------------------------
# GROQ EXPLANATION
# ------------------------
def groq_explain(crop: str, risks: list) -> str:
    if not GROQ_API_KEY or not risks:
        return None

    prompt = f"""
You are an agricultural advisory assistant.

Crop: {crop}

Detected climate risks:
{json.dumps(risks, indent=2)}

Explain:
- Why these risks occurred
- How the suggested preventive actions help
- Use simple, farmer-friendly language
- Do NOT suggest pesticides or fertilizers
"""

    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.4
        },
        timeout=20
    )

    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]

def reverse_geocode(lat: float, lon: float) -> str:
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {
        "lat": lat,
        "lon": lon,
        "format": "json",
        "zoom": 10,
        "addressdetails": 1
    }
    headers = {"User-Agent": "ClimateAdaptationAgent/1.0"}

    r = requests.get(url, params=params, headers=headers, timeout=10)
    r.raise_for_status()
    data = r.json()

    address = data.get("address", {})
    district = (
        address.get("state_district")
        or address.get("county")
        or address.get("city")
    )

    if not district:
        raise ValueError("District not found via reverse geocoding")

    return district

# ------------------------
# API ENDPOINT
# ------------------------
@app.post("/climate/adapt", response_model=ClimateResponse)
def climate_adapt(req: ClimateRequest):

    crop = req.crop.lower()
    if crop not in CROP_PROFILES:
        raise HTTPException(status_code=400, detail="Unsupported crop")

    try:
        district = reverse_geocode(req.lat, req.lon)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        weather_context, debug_weather = fetch_weather_context(
            lat=req.lat,
            lon=req.lon,
            district=district,
            season=req.season
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    crop_profile = CROP_PROFILES[crop]

    result = run_climate_adaptation(
        weather_context=weather_context,
        crop_profile=crop_profile
    )

    explanation = None
    if req.explain and result["risks"]:
        explanation = groq_explain(crop, result["risks"])

    return {
        "status": result["status"],
        "risks": result["risks"],
        "explanation": explanation,
        "debug": {
            "location": {
                "lat": req.lat,
                "lon": req.lon,
                "district": district
            },
            "crop_used": crop,
            "weather_context_used": weather_context,
            "weather_sources": debug_weather,
            "crop_profile_used": crop_profile
        }
    }

# ------------------------
# HEALTH CHECK
# ------------------------
@app.get("/")
def root():
    return {"status": "Climate Adaptation Agent running"}
