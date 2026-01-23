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
MARKET_AGENT_URL = os.getenv("MARKET_AGENT_URL", "http://localhost:8004")
SUSTAINABILITY_AGENT_URL = os.getenv("SUSTAINABILITY_AGENT_URL","http://localhost:8006")
XAI_AGENT_URL = os.getenv("XAI_AGENT_URL", "http://localhost:8005")

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

MARKET_CROP_MAP = {
    # Cereals & Millets
    "rice": "Rice",
    "maize": "Maize",
    "wheat": "Wheat",
    "jowar": "Jowar (Sorghum)",
    "barley": "Barley (Jau)",
    "ragi": "Ragi (Finger Millet)",

    # Pulses
    "moong": "Green Gram (Moong)(Whole)",
    "blackgram": "Black Gram (Urd Beans)(Whole)",
    "horsegram": "Kulthi (Horse Gram)",

    # Oilseeds
    "sesamum": "Sesamum (Sesame,Gingelly,Til)",
    "soyabean": "Soyabean",
    "sunflower": "Sunflower",
    "rapeseed": "Indian Colza (Sarson)",

    # Fibre
    "cotton": "Cotton",
    "jute": "Jute",

    # Roots & Tubers
    "potato": "Potato",
    "sweetpotato": "Sweet Potato",
    "tapioca": "Tapioca",

    # Spices
    "turmeric": "Turmeric",
    "ginger": "Ginger (Green)",
    "garlic": "Garlic",
    "coriander": "Corriander seed",
    "blackpepper": "Black pepper",
    "cardamom": "Cardamoms",

    # Plantation / Commercial
    "arecanut": "Arecanut (Betelnut/Supari)",
    "cashewnuts": "Cashewnuts",
    "coffee": "Coffee",

    # Vegetables
    "tomato": "Tomato",
    "brinjal": "Brinjal",
    "ladyfinger": "Bhindi (Ladies Finger)",
    "onion": "Onion",
    "cabbage": "Cabbage",
    "cauliflower": "Cauliflower",
    "cucumber": "Cucumbar (Kheera)",
    "bittergourd": "Bitter gourd",
    "bottlegourd": "Bottle gourd",
    "ridgegourd": "Ridgeguard (Tori)",
    "pumpkin": "Pumpkin",
    "ashgourd": "Ashgourd",
    "carrot": "Carrot",
    "radish": "Raddish",
    "beetroot": "Beetroot",
    "drumstick": "Drumstick",

    # Fruits
    "banana": "Banana",
    "mango": "Mango",
    "papaya": "Papaya",
    "orange": "Orange",
    "pineapple": "Pineapple",
    "grapes": "Grapes",
    "jackfruit": "Jack Fruit",
    "watermelon": "Water Melon",
    "pomegranate": "Pomegranate",
    "apple": "Apple"
}

# ==================================================
# MAIN ENDPOINT
# ==================================================
@app.post("/get_full_recommendation/")
async def get_full_recommendation(input: AppInput):

    async with httpx.AsyncClient(timeout=15.0) as client:

        # ---------- Weather ----------
        weather_data = (await client.get(
            f"{WEATHER_AGENT_URL}/get_combined_weather/",
            params={"lat": input.lat, "lon": input.lon, "season": input.season}
        )).json()

        # ---------- Soil ----------
        soil_data = (await client.get(
            f"{SOIL_AGENT_URL}/get_soil_data_by_district/",
            params={
                "district": weather_data["district"],
                "state": weather_data["state"]
            }
        )).json()

        env = {
            "N": soil_data["soil_data"]["N"],
            "P": soil_data["soil_data"]["P"],
            "K": soil_data["soil_data"]["K"],
            "pH": soil_data["soil_data"]["pH"],
            "rainfall": weather_data["avg_seasonal_rainfall_mm"],
            "temperature": weather_data["temperature_celsius"]
        }

        flags = derive_flags(env)

        # ---------- Recommendation Agent ----------
        rec_data = (await client.post(
            f"{RECOMMENDATION_AGENT_URL}/predict_top_crops/",
            json=env,
            params={"top_n": 10}
        )).json()

        filtered = []

        for item in rec_data.get("predictions", []):
            crop = item["crop"]
            prob = item["probability"]
            shap_summary = item.get("shap_summary")

            # 1️⃣ Season filter
            seasons = CROP_SEASONALITY.get(crop)
            if not seasons or input.season not in seasons:
                continue

            # 2️⃣ Meta + constraints
            meta = CROP_META.get(crop)
            if not meta:
                continue

            if violates_constraints(crop, meta, flags, input.mode):
                continue

            # 3️⃣ Agronomic score
            boost = compute_score_boost(crop, meta, flags, input.mode)
            agro_score = prob + boost

            # 4️⃣ Market agent (via mapping)
            market_score = None
            market_crop = MARKET_CROP_MAP.get(crop)

            if market_crop:
                try:
                    market_resp = await client.get(
                        f"{MARKET_AGENT_URL}/market/evaluate",
                        params={
                            "crop": market_crop,
                            "state": weather_data["state"]
                        }
                    )
                    if market_resp.status_code == 200:
                        market_score = market_resp.json()["market_score"] / 100.0
                except Exception:
                    market_score = None

            # 5️⃣ Final rank score (55 / 45)
            if market_score is not None:
                final_rank_score = 0.55 * market_score + 0.45 * agro_score
            else:
                # mild penalty if market unknown
                final_rank_score = 0.85 * agro_score

            filtered.append({
                "crop": crop,
                "final_score": round(final_rank_score, 4),
                "agronomic_score": round(agro_score, 4),
                "market_score": round(market_score, 3) if market_score is not None else None,
                "raw_probability": round(prob, 4),
                "shap_summary": shap_summary
            })

        filtered.sort(key=lambda x: x["final_score"], reverse=True)
        # ---------- Sustainability Scoring (Advisory Only) ----------
        top_crops = [item["crop"] for item in filtered[:5]]
        sustainability_data = None
        try:
            sustain_resp = await client.get(
                f"{SUSTAINABILITY_AGENT_URL}/sustainability/evaluate",
                params=[("crops", crop) for crop in top_crops]
            )
            if sustain_resp.status_code == 200:
                sustainability_data = sustain_resp.json()
        except Exception:
            sustainability_data = None
        

        xai_data = None
        try:
            print(f"[XAI_DEBUG] Building XAI payload")
            print(f"[XAI_DEBUG] XAI_AGENT_URL: {XAI_AGENT_URL}")
            print(f"[XAI_DEBUG] Number of recommendations: {len(filtered[:5])}")
            
            if filtered and len(filtered) > 0:
                print(f"[XAI_DEBUG] First recommendation: {filtered[0]}")
                print(f"[XAI_DEBUG] SHAP summary structure: {filtered[0].get('shap_summary')}")
            
            # Build sustainability list if available
            sustainability_list = None
            if sustainability_data and "results" in sustainability_data:
                sustainability_list = sustainability_data["results"]
                print(f"[XAI_DEBUG] Sustainability data found with {len(sustainability_list)} items")
            else:
                print(f"[XAI_DEBUG] No sustainability data or missing 'results' key")
            
            xai_payload = {
                "location": {
                    "district": weather_data["district"],
                    "state": weather_data["state"]
                },
                "recommendations": filtered[:5],
                "sustainability": sustainability_list
            }
            
            print(f"[XAI_DEBUG] Sending POST request to {XAI_AGENT_URL}/xai/explain")
            xai_resp = await client.post(
                f"{XAI_AGENT_URL}/xai/explain",
                json=xai_payload
            )
            print(f"[XAI_DEBUG] XAI response status: {xai_resp.status_code}")
            
            if xai_resp.status_code == 200:
                xai_data = xai_resp.json()
                print(f"[XAI_DEBUG] XAI response received: {type(xai_data)}")
            else:
                print(f"[XAI_DEBUG] XAI error status {xai_resp.status_code}: {xai_resp.text}")
                xai_data = None
        except Exception as e:
            print(f"❌ XAI agent error: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            xai_data = None
        
        return {
            "status": "OK",
            "location": {
                "district": weather_data["district"],
                "state": weather_data["state"]
            },
            "recommendations": {
                "ranking_logic": "0.55 * market + 0.45 * agronomic",
                "top_n": len(filtered),
                "predictions": filtered[:5]
            },
            "sustainability": sustainability_data,
            "xai_data": xai_data
        }


@app.get("/")
def root():
    return {"status": "Orchestrator is running"}
