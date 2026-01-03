from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import pandas as pd
import numpy as np

# ✅ Import EVERYTHING needed from model_loader
from model_loader import pipeline, label_encoder, FEATURE_COLUMNS

# --------------------------------------------------
# 1. Initialize FastAPI app
# --------------------------------------------------
app = FastAPI(title="Recommendation Agent")

# --------------------------------------------------
# 2. Input schema (numeric-only)
# --------------------------------------------------
class InputFeatures(BaseModel):
    N: float
    P: float
    K: float
    pH: float
    rainfall: float
    temperature: float

# --------------------------------------------------
# 3. Prediction endpoint
# --------------------------------------------------
@app.post("/predict_top_crops/")
async def predict_crops(
    features: InputFeatures,
    top_n: int = Query(5, ge=1, le=10)
):
    if pipeline is None or label_encoder is None:
        raise HTTPException(
            status_code=500,
            detail="Model artifacts not loaded correctly."
        )

    try:
        # Build input dataframe
        input_df = pd.DataFrame([features.model_dump()])

        # 🔒 Enforce exact feature schema & order
        input_df = input_df[FEATURE_COLUMNS]

        # Predict probabilities
        probabilities = pipeline.predict_proba(input_df)[0]

        # Top-N crops
        top_indices = np.argsort(probabilities)[::-1][:top_n]
        crops = label_encoder.inverse_transform(top_indices)
        scores = probabilities[top_indices]

        results = [
            {
                "crop": crop,
                "probability": round(float(score), 4)
            }
            for crop, score in zip(crops, scores)
        ]

        return {
            "status": "OK",
            "top_n": top_n,
            "predictions": results
        }

    except Exception as e:
        print(f"❌ Prediction error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {e}"
        )

# --------------------------------------------------
# 4. Health check
# --------------------------------------------------
@app.get("/")
def root():
    return {"status": "Recommendation Agent is running"}
