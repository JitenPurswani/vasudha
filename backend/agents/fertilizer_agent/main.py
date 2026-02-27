"""
Fertilizer Recommendation Agent — FastAPI Entry Point
Port: 8009

Accepts soil nutrient data, crop info, and location.
Returns organic-first fertilizer recommendations with application tools
and purchase links, adjusted for recent rainfall.
"""

import json
import os
import traceback
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from fertilizer_pipeline import run_pipeline

# ───────────────────────────────────────────────────────────────────
# ENV & CONFIG
# ───────────────────────────────────────────────────────────────────
load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load crop profiles for validation
with open(os.path.join(BASE_DIR, "crop_nutrient_profiles.json"), "r") as f:
    _raw = json.load(f)
    SUPPORTED_CROPS = [k for k in _raw.keys() if not k.startswith("_")]

# ───────────────────────────────────────────────────────────────────
# APP
# ───────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Fertilizer Recommendation Agent",
    version="1.0.0",
    description=(
        "Organic-first fertilizer recommendation engine. "
        "4-stage pipeline: deficit calculation → fertilizer selection → "
        "rainfall adjustment → tool matching with purchase links."
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ───────────────────────────────────────────────────────────────────
# REQUEST / RESPONSE MODELS
# ───────────────────────────────────────────────────────────────────
class FertilizerRequest(BaseModel):
    crop: str = Field(..., description="Crop name (lowercase), e.g. 'rice', 'wheat', 'tomato'")
    lat: float = Field(..., description="Latitude of the farm")
    lon: float = Field(..., description="Longitude of the farm")
    crop_age_days: int = Field(..., ge=0, description="Age of the crop in days since sowing/planting")
    current_n: float = Field(..., ge=0, description="Current soil Nitrogen level (from soil agent)")
    current_p: float = Field(..., ge=0, description="Current soil Phosphorus level (from soil agent)")
    current_k: float = Field(..., ge=0, description="Current soil Potassium level (from soil agent)")
    current_ph: float = Field(..., ge=0, le=14, description="Current soil pH")
    season: str = Field(default="kharif", description="Growing season: kharif / rabi / zaid")


class FertilizerResponse(BaseModel):
    status: str
    data: dict | None = None
    error: str | None = None


# ───────────────────────────────────────────────────────────────────
# ENDPOINTS
# ───────────────────────────────────────────────────────────────────
@app.get("/")
def health_check():
    return {
        "agent": "fertilizer_recommendation",
        "status": "running",
        "version": "1.0.0",
        "supported_crops": len(SUPPORTED_CROPS)
    }


@app.get("/crops")
def list_supported_crops():
    """Return all supported crop names."""
    return {"crops": SUPPORTED_CROPS, "count": len(SUPPORTED_CROPS)}


@app.post("/fertilizer/recommend", response_model=FertilizerResponse)
def recommend_fertilizer(req: FertilizerRequest):
    """
    Main endpoint — runs the full 4-stage fertilizer recommendation pipeline.

    Accepts:
        - crop, lat, lon, crop_age_days
        - current_n, current_p, current_k, current_ph
        - season

    Returns:
        - Organic-first fertilizer recommendations
        - Chemical supplements (if organic insufficient)
        - pH amendments
        - Application tools with purchase links
        - Rainfall-adjusted quantities
    """
    crop = req.crop.lower().strip()

    # Validate crop
    if crop not in SUPPORTED_CROPS:
        raise HTTPException(
            status_code=400,
            detail={
                "error": f"Crop '{crop}' is not supported.",
                "supported_crops": SUPPORTED_CROPS
            }
        )

    try:
        result = run_pipeline(
            crop=crop,
            lat=req.lat,
            lon=req.lon,
            crop_age_days=req.crop_age_days,
            current_n=req.current_n,
            current_p=req.current_p,
            current_k=req.current_k,
            current_ph=req.current_ph,
            season=req.season
        )

        if "error" in result:
            return FertilizerResponse(
                status="error",
                error=result["error"],
                data=result
            )

        return FertilizerResponse(
            status="success",
            data=result
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline failed: {str(e)}"
        )


# ───────────────────────────────────────────────────────────────────
# DEV ENTRY POINT
# ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8009, reload=True)
