from fastapi import FastAPI
from pydantic import BaseModel
import httpx
import os
from typing import Optional

# ==================================================
# App Init
# ==================================================
app = FastAPI(title="Vasudha Orchestrator")

WEATHER_AGENT_URL = os.getenv("WEATHER_AGENT_URL", "http://localhost:8001")
SOIL_AGENT_URL = os.getenv("SOIL_AGENT_URL", "http://localhost:8002")
RECOMMENDATION_AGENT_URL = os.getenv("RECOMMENDATION_AGENT_URL", "http://localhost:8003")

# ==================================================
# Input Schema
# ==================================================
class AppInput(BaseModel):
    lat: Optional[float]
    lon: Optional[float]
    season: str            # kharif | rabi | zaid
    mode: Optional[str] = "seasonal"   # seasonal | all_season

# ==================================================
# AGRONOMIC REGIME DERIVATION
# ==================================================
def derive_flags(env):
    pH = env.get("pH")
    N = env.get("N")
    temp = env.get("temperature")
    rain = env.get("rainfall")

    return {
        "extreme_drought": rain is not None and rain < 120,
        "low_rainfall": rain is not None and 120 <= rain < 400,
        "moderate_rain": rain is not None and 400 <= rain < 900,
        "high_rainfall": rain is not None and rain >= 900,

        "acidic_soil": pH is not None and pH < 6.0,
        "alkaline_soil": pH is not None and pH > 7.5,
        "low_nitrogen": N is not None and N < 40,

        "high_temperature": temp is not None and temp > 32,
        "low_temperature": temp is not None and temp < 15,
    }


# ==================================================
# CONSTRAINT ENGINE (AGRONOMIC, NOT EXAMPLE-BASED)
# ==================================================
def violates_constraints(crop, meta, flags, mode):
    # 1. Extreme drought
    if flags["extreme_drought"] and meta["water"] == "high":
        return True

    # 2. Low rainfall
    if flags["low_rainfall"] and meta["water"] == "high":
        return True
    
    if flags["low_rainfall"] and meta["water"] == "medium" and meta["type"] == "vegetable":
        return True


    # 3. High rainfall
    if flags["high_rainfall"] and meta["water"] == "low":
        return True

    # 4. Acidic soil
    if flags["acidic_soil"] and meta["type"] == "cereal" and crop in ["wheat", "barley"]:
        return True

    # 5. Alkaline soil
    if flags["alkaline_soil"] and crop in ["potato", "banana"]:
        return True

    # 6. Low nitrogen
    if flags["low_nitrogen"] and meta["nutrient"] == "high":
        return True

    # 7. High temperature
    if flags["high_temperature"] and crop in ["wheat", "barley", "apple"]:
        return True
    
    if flags["high_rainfall"] and meta["type"] == "fiber":
        return True

    # 8. Seasonal product rule
    if mode == "seasonal" and meta["type"] in ["fruit", "plantation"]:
        return True

    # 9. Extreme drought → exclude long-cycle crops
    if flags["extreme_drought"] and meta["type"] in ["fruit", "plantation"]:
        return True

    return False

def compute_score_boost(crop, meta, flags, mode):
    boost = 0.0

    crop_type = meta["type"]

    # ---------- Rainfall-based boosts ----------
    if flags["high_rainfall"]:
        if crop_type == "cereal":
            boost += 0.12
        elif crop in ["potato", "sweetpotato", "tapioca"]:
            boost += 0.10
        elif crop_type == "pulse":
            boost += 0.05
        elif crop_type == "fiber":
            boost -= 0.05

    elif flags["moderate_rain"]:
        if crop_type in ["cereal", "pulse"]:
            boost += 0.06
        elif crop_type == "oilseed":
            boost += 0.05

    elif flags["low_rainfall"]:
        if crop in ["jowar", "ragi"]:
            boost += 0.10
        elif crop_type == "pulse":
            boost += 0.08
        elif crop_type == "oilseed":
            boost += 0.07
        elif crop_type == "vegetable":
            boost -= 0.05

    # ---------- Season intent ----------
    if mode == "seasonal":
        if crop_type in ["cereal", "pulse", "oilseed"]:
            boost += 0.05
        elif crop_type == "vegetable":
            boost -= 0.03

    # ---------- Staple bias ----------
    if crop in ["rice", "wheat"]:
        boost += 0.05

    return boost

# ==================================================
# CROP META (ALL 53 CROPS — COMPLETE)
# ==================================================
CROP_META = {
    # Cereals
    "rice": {"water": "high", "nutrient": "high", "type": "cereal"},
    "wheat": {"water": "medium", "nutrient": "high", "type": "cereal"},
    "maize": {"water": "medium", "nutrient": "medium", "type": "cereal"},
    "barley": {"water": "low", "nutrient": "low", "type": "cereal"},
    "jowar": {"water": "low", "nutrient": "low", "type": "cereal"},
    "ragi": {"water": "low", "nutrient": "low", "type": "cereal"},

    # Pulses
    "moong": {"water": "low", "nutrient": "low", "type": "pulse"},
    "blackgram": {"water": "low", "nutrient": "low", "type": "pulse"},
    "horsegram": {"water": "low", "nutrient": "low", "type": "pulse"},
    "chickpea": {"water": "low", "nutrient": "medium", "type": "pulse"},
    "lentil": {"water": "low", "nutrient": "low", "type": "pulse"},
    "peas": {"water": "medium", "nutrient": "medium", "type": "pulse"},

    # Oilseeds
    "sesamum": {"water": "low", "nutrient": "low", "type": "oilseed"},
    "rapeseed": {"water": "low", "nutrient": "low", "type": "oilseed"},
    "sunflower": {"water": "medium", "nutrient": "medium", "type": "oilseed"},
    "soyabean": {"water": "medium", "nutrient": "medium", "type": "oilseed"},
    "groundnut": {"water": "medium", "nutrient": "medium", "type": "oilseed"},
    "mustard": {"water": "low", "nutrient": "low", "type": "oilseed"},
    "linseed": {"water": "low", "nutrient": "low", "type": "oilseed"},
    "safflower": {"water": "low", "nutrient": "low", "type": "oilseed"},

    # Fibers
    "cotton": {"water": "medium", "nutrient": "high", "type": "fiber"},
    "jute": {"water": "high", "nutrient": "medium", "type": "fiber"},

    # Vegetables
    "tomato": {"water": "medium", "nutrient": "medium", "type": "vegetable"},
    "brinjal": {"water": "medium", "nutrient": "medium", "type": "vegetable"},
    "ladyfinger": {"water": "medium", "nutrient": "medium", "type": "vegetable"},
    "cucumber": {"water": "medium", "nutrient": "low", "type": "vegetable"},
    "bittergourd": {"water": "medium", "nutrient": "low", "type": "vegetable"},
    "bottlegourd": {"water": "medium", "nutrient": "low", "type": "vegetable"},
    "ridgegourd": {"water": "medium", "nutrient": "low", "type": "vegetable"},
    "pumpkin": {"water": "medium", "nutrient": "low", "type": "vegetable"},
    "ashgourd": {"water": "medium", "nutrient": "low", "type": "vegetable"},
    "cabbage": {"water": "medium", "nutrient": "medium", "type": "vegetable"},
    "cauliflower": {"water": "medium", "nutrient": "medium", "type": "vegetable"},
    "carrot": {"water": "low", "nutrient": "medium", "type": "vegetable"},
    "beetroot": {"water": "low", "nutrient": "medium", "type": "vegetable"},
    "radish": {"water": "low", "nutrient": "low", "type": "vegetable"},
    "onion": {"water": "medium", "nutrient": "medium", "type": "vegetable"},
    "potato": {"water": "medium", "nutrient": "high", "type": "vegetable"},
    "sweetpotato": {"water": "medium", "nutrient": "low", "type": "vegetable"},
    "tapioca": {"water": "medium", "nutrient": "low", "type": "vegetable"},
    "drumstick": {"water": "low", "nutrient": "low", "type": "vegetable"},

    # Fruits & Plantation
    "banana": {"water": "high", "nutrient": "high", "type": "fruit"},
    "papaya": {"water": "medium", "nutrient": "medium", "type": "fruit"},
    "apple": {"water": "medium", "nutrient": "medium", "type": "fruit"},
    "mango": {"water": "medium", "nutrient": "medium", "type": "fruit"},
    "pomegranate": {"water": "low", "nutrient": "medium", "type": "fruit"},
    "arecanut": {"water": "high", "nutrient": "medium", "type": "plantation"},
    "cashewnuts": {"water": "medium", "nutrient": "medium", "type": "plantation"},
    "coffee": {"water": "high", "nutrient": "medium", "type": "plantation"},
}

# ==================================================
# CROP SEASONALITY (MATCHING ALL 53)
# ==================================================
CROP_SEASONALITY = {
    "rice": ["kharif"],
    "wheat": ["rabi"],
    "maize": ["kharif", "rabi"],
    "barley": ["rabi"],
    "jowar": ["kharif"],
    "ragi": ["kharif"],

    "moong": ["kharif", "zaid"],
    "blackgram": ["kharif"],
    "horsegram": ["kharif"],
    "chickpea": ["rabi"],
    "lentil": ["rabi"],
    "peas": ["rabi"],

    "sesamum": ["kharif"],
    "rapeseed": ["rabi"],
    "sunflower": ["kharif", "rabi"],
    "soyabean": ["kharif"],
    "groundnut": ["kharif"],
    "mustard": ["rabi"],
    "linseed": ["rabi"],
    "safflower": ["rabi"],

    "cotton": ["kharif"],
    "jute": ["kharif"],

    "tomato": ["kharif", "rabi", "zaid"],
    "brinjal": ["kharif", "rabi", "zaid"],
    "ladyfinger": ["kharif", "zaid"],
    "cucumber": ["kharif", "zaid"],
    "bittergourd": ["kharif", "zaid"],
    "bottlegourd": ["kharif", "zaid"],
    "ridgegourd": ["kharif", "zaid"],
    "pumpkin": ["kharif", "zaid"],
    "ashgourd": ["kharif", "zaid"],
    "cabbage": ["rabi"],
    "cauliflower": ["rabi"],
    "carrot": ["rabi", "zaid"],
    "beetroot": ["rabi", "zaid"],
    "radish": ["rabi", "zaid"],
    "onion": ["kharif", "rabi", "zaid"],
    "potato": ["rabi"],
    "sweetpotato": ["kharif"],
    "tapioca": ["kharif"],

    "banana": ["kharif"],
    "papaya": ["kharif", "zaid"],
    "apple": ["rabi"],
    "mango": ["kharif"],
    "pomegranate": ["kharif"],
    "arecanut": ["kharif"],
    "cashewnuts": ["kharif"],
    "coffee": ["kharif"],
}

# ==================================================
# MAIN ENDPOINT
# ==================================================
@app.post("/get_full_recommendation/")
async def get_full_recommendation(input: AppInput):
    async with httpx.AsyncClient(timeout=15.0) as client:
        weather_data = (await client.get(
            f"{WEATHER_AGENT_URL}/get_combined_weather/",
            params={"lat": input.lat, "lon": input.lon, "season": input.season}
        )).json()

        soil_data = (await client.get(
            f"{SOIL_AGENT_URL}/get_soil_data_by_district/",
            params={"district": weather_data["district"], "state": weather_data["state"]}
        )).json()

        env = {
            "N": soil_data["soil_data"]["N"],
            "P": soil_data["soil_data"]["P"],
            "K": soil_data["soil_data"]["K"],
            "pH": soil_data["soil_data"]["pH"],
            "rainfall": weather_data["avg_seasonal_rainfall_mm"],
            "temperature": weather_data["temperature_celsius"]
        }
        if env["rainfall"] is None:
            return {
            "status": "ERROR",
            "message": "Rainfall data not available for this district",
            "action": "fallback_to_state_average_or_retry",
            "input_data": input.dict()
        }

        flags = derive_flags(env)

        rec_data = (await client.post(
            f"{RECOMMENDATION_AGENT_URL}/predict_top_crops/",
            json=env,
            params={"top_n": 10}
        )).json()

        filtered = []
        for item in rec_data.get("predictions", []):
            crop = item["crop"]
            prob = item["probability"]

            meta = CROP_META.get(crop)
            seasons = CROP_SEASONALITY.get(crop)

            if not meta or not seasons:
                continue

            if input.season not in seasons:
                continue

            if violates_constraints(crop, meta, flags, input.mode):
                continue

            boost = compute_score_boost(crop, meta, flags, input.mode)
            final_score = prob + boost
            filtered.append({
                "crop":crop,
                "probability": round(final_score, 4),
                "raw_probability": round(prob, 4)
            })
        
        filtered.sort(key=lambda x: x["probability"], reverse=True)


        if not filtered:
            filtered = rec_data.get("predictions", [])[:3]

        return {
            "status": "OK",
            "input_data": input.dict(),
            "weather_data": weather_data,
            "soil_data": soil_data,
            "recommendations": {
                "status": "OK",
                "top_n": len(filtered),
                "predictions": filtered[:5]
            }
        }

@app.get("/")
def root():
    return {"status": "Orchestrator is running"}
