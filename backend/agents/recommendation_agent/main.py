from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
from model_loader import pipeline, label_encoder # Import loaded objects

# --- 1. Initialize FastAPI app ---
app = FastAPI(title="Recommendation Agent")

# --- 2. Define Input Data Model using Pydantic ---
# This ensures the incoming data has the correct structure and types
class InputFeatures(BaseModel):
    N: float
    P: float
    K: float
    pH: float
    rainfall: float
    temperature: float
    Crop_Type: str # Season (e.g., 'kharif', 'rabi')

# --- 3. Define Prediction Endpoint ---
@app.post("/predict_top_crops/")
async def predict_crops(features: InputFeatures, top_n: int = 5):
    """
    Receives input features, makes predictions using the loaded model,
    and returns the top N recommended crops with confidence scores.
    """
    if pipeline is None or label_encoder is None:
        raise HTTPException(status_code=500, detail="Model artifacts not loaded correctly.")

    try:
        # Convert input data into a DataFrame (required by the pipeline)
        input_df = pd.DataFrame([features.model_dump()]) # Use model_dump() for Pydantic v2+

        # --- PREDICTION LOGIC GOES HERE ---
        # (We will add this in the next step)
        # 1. Use pipeline.predict_proba(input_df) to get probabilities
        # 2. Get top N indices
        # 3. Decode indices to crop names using label_encoder
        # 4. Format the results

        # Placeholder response for now
        probabilities = pipeline.predict_proba(input_df)
        top_n_indices = np.argsort(probabilities[0])[-top_n:][::-1]
        top_n_crops = label_encoder.classes_[top_n_indices]
        top_n_probs = probabilities[0][top_n_indices]

        results = {crop: f"{prob*100:.2f}%" for crop, prob in zip(top_n_crops, top_n_probs)}

        return {"top_recommendations": results}

    except Exception as e:
        print(f"Error during prediction: {e}") # Log the error
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")

# --- 4. (Optional) Root endpoint for health check ---
@app.get("/")
def read_root():
    return {"status": "Recommendation Agent is running"}