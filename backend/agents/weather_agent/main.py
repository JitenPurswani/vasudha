# main.py (Refined Weather Agent)
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import requests
import os
import sqlite3
from dotenv import load_dotenv
import re

# --- 1. Load Environment Variables ---
load_dotenv()
API_KEY = os.getenv("OPENWEATHERMAP_API_KEY")

# --- 2. Initialize FastAPI app ---
app = FastAPI(title="Weather Agent")

# --- 3. Database Setup ---
DB_NAME = 'district_rainfall_db.sqlite'
DB_PATH = os.path.join(os.path.dirname(__file__), DB_NAME)
TABLE_NAME = 'seasonal_rainfall'

def get_db_connection():
    if not os.path.exists(DB_PATH):
        print(f"❌ RAINFALL DB FILE NOT FOUND AT: {DB_PATH}")
        return None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        print(f"❌ DB connection error: {e}")
        return None

# --- 4. Define Output Data Model ---
class WeatherDataOutput(BaseModel):
    state: str | None
    district: str | None
    temperature_celsius: float | None
    humidity_percent: float | None
    avg_seasonal_rainfall_mm: float | None
    status: str

# --- 5. Reverse Geocoding ---
def get_district_from_coordinates(lat: float, lon: float) -> tuple[str | None, str | None]:
    """
    Uses OpenStreetMap's Nominatim API to get district and state from coordinates.
    """
    try:
        url = f"https://nominatim.openstreetmap.org/reverse"
        params = {
            "lat": lat,
            "lon": lon,
            "format": "json",
            "zoom": 10,
            "addressdetails": 1
        }
        headers = {"User-Agent": "WeatherAgent/1.0"}
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        address = data.get("address", {})
        district = address.get("state_district") or address.get("county") or address.get("region")
        state = address.get("state")

        if district:
            district = re.sub(r" District$", "", district.strip().title())

        return district, state

    except requests.exceptions.RequestException as e:
        print(f"❌ Reverse Geocoding Error: {e}")
        return None, None

# --- 6. Get Live Weather ---
def get_live_weather(lat: float, lon: float) -> dict:
    if not API_KEY:
        return {"temp": None, "humidity": None, "status": "APIKeyMissing"}

    base_url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"lat": lat, "lon": lon, "appid": API_KEY, "units": "metric"}

    try:
        response = requests.get(base_url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        return {
            "temp": data.get("main", {}).get("temp"),
            "humidity": data.get("main", {}).get("humidity"),
            "status": "OK"
        }
    except requests.exceptions.RequestException as e:
        print(f"❌ API Request Error: {e}")
        return {"temp": None, "humidity": None, "status": "APIError"}

# --- 7. Get Seasonal Rainfall ---
def get_seasonal_rainfall(district: str, season: str) -> float | None:
    conn = get_db_connection()
    if conn is None:
        return None
    cursor = conn.cursor()

    district_query = district.strip().title()

    if season.lower() == 'kharif':
        rainfall_col = 'Avg_Rainfall_Kharif_mm'
    elif season.lower() == 'rabi':
        rainfall_col = 'Avg_Rainfall_Rabi_mm'
    elif season.lower() == 'zaid':
        rainfall_col = 'Avg_Rainfall_Zaid_mm'
    else:
        print(f"Invalid season provided: {season}")
        return None

    try:
        query = f"SELECT {rainfall_col} FROM {TABLE_NAME} WHERE UPPER(District) = UPPER(?)"
        cursor.execute(query, (district_query,))
        result = cursor.fetchone()
        conn.close()

        if result:
            return result[rainfall_col]
        else:
            print(f"Rainfall data not found for District: '{district_query}'")
            return None
    except sqlite3.Error as e:
        print(f"Rainfall DB query error: {e}")
        conn.close()
        return None

# --- 8. API Endpoint ---
@app.get("/get_combined_weather/", response_model=WeatherDataOutput)
async def get_combined_weather_data(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    season: str = Query(..., description="Current season (kharif, rabi, or zaid)")
):
    """
    Fetches district automatically using reverse geocoding,
    then retrieves live weather + historical rainfall.
    """
    district, state = get_district_from_coordinates(lat, lon)
    if not district:
        raise HTTPException(status_code=404, detail="District not found for given coordinates")

    weather_data = get_live_weather(lat, lon)
    rainfall_data = get_seasonal_rainfall(district, season)

    status = "OK"
    if weather_data["status"] != "OK":
        status = weather_data["status"]
    elif rainfall_data is None:
        status = "RainfallDataNotFound"

    return WeatherDataOutput(
        state=state,
        district=district,
        temperature_celsius=weather_data["temp"],
        humidity_percent=weather_data["humidity"],
        avg_seasonal_rainfall_mm=rainfall_data,
        status=status
    )

# --- 9. Root ---
@app.get("/")
def read_root():
    return {"status": "Weather Agent is running"}
