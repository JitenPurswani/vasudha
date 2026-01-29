from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import pandas as pd
import numpy as np
import shap
import traceback
import hashlib
import time

# ✅ Import EVERYTHING needed from model_loader
from model_loader import pipeline, label_encoder, FEATURE_COLUMNS, model_classifier, model_preprocessor

# --------------------------------------------------
# Simple Cache for predictions (avoids repeated SHAP computation)
# --------------------------------------------------
_prediction_cache = {}
_cache_ttl = 600  # 10 minutes - longer since model inputs change less frequently

def get_cache_key(features_dict: dict, top_n: int) -> str:
    """Generate cache key from input features"""
    # Round features to reduce cache misses from minor float differences
    rounded = {k: round(v, 1) for k, v in features_dict.items()}
    key_str = f"{sorted(rounded.items())}:{top_n}"
    return hashlib.md5(key_str.encode()).hexdigest()

def get_cached_prediction(key: str):
    """Get prediction from cache if not expired"""
    if key in _prediction_cache:
        value, timestamp = _prediction_cache[key]
        if time.time() - timestamp < _cache_ttl:
            print(f"[CACHE] Hit for key {key[:8]}...")
            return value
        del _prediction_cache[key]
    return None

def set_cached_prediction(key: str, value):
    """Cache prediction result"""
    _prediction_cache[key] = (value, time.time())
    # Limit cache size
    if len(_prediction_cache) > 100:
        oldest_key = min(_prediction_cache, key=lambda k: _prediction_cache[k][1])
        del _prediction_cache[oldest_key]

# --------------------------------------------------
# SHAP Explainer (initialized once)
# --------------------------------------------------
shap_explainer = None

if model_classifier is None:
    print("❌ [SHAP_INIT] Classifier is None - cannot initialize SHAP explainer")
else:
    try:
        print(f"[SHAP_INIT] Classifier type: {type(model_classifier)}")
        print(f"[SHAP_INIT] Initializing TreeExplainer with {type(model_classifier).__name__}")
        
        shap_explainer = shap.TreeExplainer(model_classifier)
        print(f"✅ [SHAP_INIT] TreeExplainer initialized successfully")
        
    except Exception as e:
        print(f"❌ [SHAP_INIT] SHAP initialization failed: {type(e).__name__}: {e}")
        traceback.print_exc()
        shap_explainer = None


def compute_shap_summary(input_df, top_index, explainer, feature_names):
    """
    Safely compute SHAP summary for a single prediction.
    
    Returns: dict with keys {top_positive_features, top_negative_features, neutral_features}
             or None if computation fails
    """
    if explainer is None:
        print("[SHAP_COMPUTE] Explainer is None - skipping SHAP computation")
        return None
    
    try:
        print(f"[SHAP_COMPUTE] Input shape: {input_df.shape}")
        
        # Transform input if preprocessor exists, otherwise use as-is
        if model_preprocessor is not None:
            print(f"[SHAP_COMPUTE] Using preprocessor to transform input")
            X_transformed = model_preprocessor.transform(input_df)
        else:
            print(f"[SHAP_COMPUTE] No preprocessor - using raw input")
            X_transformed = input_df.values
        
        print(f"[SHAP_COMPUTE] Transformed shape: {X_transformed.shape}")
        print(f"[SHAP_COMPUTE] Transformed type: {type(X_transformed)}")
        
        # Get SHAP values with additivity check disabled
        # (difference between SHAP sum and model output is small and acceptable)
        print(f"[SHAP_COMPUTE] Computing SHAP values for top_index={top_index}")
        shap_values = explainer.shap_values(X_transformed, check_additivity=False)
        print(f"[SHAP_COMPUTE] SHAP values type: {type(shap_values)}")
        
        # Handle multiclass output
        if isinstance(shap_values, list):
            print(f"[SHAP_COMPUTE] SHAP returned list of {len(shap_values)} arrays (multiclass)")
            if top_index >= len(shap_values):
                print(f"❌ [SHAP_COMPUTE] top_index {top_index} >= num_classes {len(shap_values)}")
                return None
            class_shap = shap_values[top_index]
        else:
            print(f"[SHAP_COMPUTE] SHAP returned single array (binary/regression)")
            class_shap = shap_values
        
        print(f"[SHAP_COMPUTE] Class SHAP shape: {class_shap.shape}")
        print(f"[SHAP_COMPUTE] Class SHAP ndim: {class_shap.ndim}")
        
        # Handle different SHAP output shapes
        # For multiclass: shape is (samples, features, classes)
        # For binary/regression: shape is (samples, features)
        if class_shap.ndim == 3:
            # Multiclass: (1, 6, 53) → extract SHAP for predicted class
            print(f"[SHAP_COMPUTE] 3D array detected - extracting class {top_index}")
            shap_vals = np.abs(class_shap[0, :, top_index])  # (6,) for 6 features
        elif class_shap.ndim == 2:
            # Binary or regular case: (1, 6) → extract sample
            print(f"[SHAP_COMPUTE] 2D array detected - extracting first sample")
            shap_vals = np.abs(class_shap[0])  # (6,) for 6 features
        else:
            # 1D case
            print(f"[SHAP_COMPUTE] 1D array detected")
            shap_vals = np.abs(class_shap)
        
        print(f"[SHAP_COMPUTE] Final SHAP values shape: {shap_vals.shape}")
        print(f"[SHAP_COMPUTE] SHAP values: {shap_vals}")
        print(f"[SHAP_COMPUTE] SHAP values type: {type(shap_vals[0])}")
        
        # Compute feature importance - ensure shap_vals are scalars
        feature_importance = [(fname, float(sval)) for fname, sval in zip(feature_names, shap_vals)]
        feature_importance.sort(key=lambda x: x[1], reverse=True)
        
        print(f"[SHAP_COMPUTE] Feature importance (sorted): {feature_importance}")
        
        # Map feature names
        FEATURE_NAME_MAP = {
            "N": "nitrogen",
            "P": "phosphorus",
            "K": "potassium",
            "pH": "ph",
            "rainfall": "rainfall",
            "temperature": "temperature"
        }
        
        top_positive = [
            FEATURE_NAME_MAP.get(f, f)
            for f, _ in feature_importance[:2]
        ]

        top_negative = [
            FEATURE_NAME_MAP.get(f, f)
            for f, _ in feature_importance[-1:]
        ]

        neutral = [
            FEATURE_NAME_MAP.get(f, f)
            for f, _ in feature_importance[2:-1]
        ]
        
        result = {
            "top_positive_features": top_positive,
            "top_negative_features": top_negative,
            "neutral_features": neutral
        }
        print(f"✅ [SHAP_COMPUTE] SHAP summary computed: {result}")
        return result
        
    except Exception as e:
        print(f"❌ [SHAP_COMPUTE] Computation failed: {type(e).__name__}: {e}")
        traceback.print_exc()
        return None


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
    print(f"\n[PREDICT] Received request: top_n={top_n}, features={features}")
    
    # Check cache first
    cache_key = get_cache_key(features.model_dump(), top_n)
    cached = get_cached_prediction(cache_key)
    if cached is not None:
        return cached
    
    if pipeline is None or label_encoder is None:
        raise HTTPException(
            status_code=500,
            detail="Model artifacts not loaded correctly."
        )

    try:
        # Build input dataframe
        input_df = pd.DataFrame([features.model_dump()])
        print(f"[PREDICT] Input DF shape: {input_df.shape}, columns: {list(input_df.columns)}")

        # 🔒 Enforce exact feature schema & order
        input_df = input_df[FEATURE_COLUMNS]
        print(f"[PREDICT] After column reorder: {list(input_df.columns)}")

        # Predict probabilities
        probabilities = pipeline.predict_proba(input_df)[0]
        print(f"[PREDICT] Probabilities shape: {probabilities.shape}")

        # Top-N crops
        top_indices = np.argsort(probabilities)[::-1][:top_n]
        crops = label_encoder.inverse_transform(top_indices)
        scores = probabilities[top_indices]
        
        print(f"[PREDICT] Top indices: {top_indices}")
        print(f"[PREDICT] Top crops: {crops}")
        print(f"[PREDICT] Top scores: {scores}")

        results = []
        for i, (crop, score, idx) in enumerate(zip(crops, scores, top_indices)):
            print(f"\n[PREDICT] Processing result {i}: crop={crop}, score={score}, idx={idx}")
            
            # Compute SHAP for this crop
            shap_summary = compute_shap_summary(
                input_df, 
                idx, 
                shap_explainer, 
                FEATURE_COLUMNS
            )
            
            results.append({
                "crop": crop,
                "probability": round(float(score), 4),
                "shap_summary": shap_summary
            })

        response = {
            "status": "OK",
            "top_n": top_n,
            "predictions": results
        }
        
        # Cache the result
        set_cached_prediction(cache_key, response)
        
        return response

    except Exception as e:
        print(f"❌ [PREDICT] Prediction error: {type(e).__name__}: {e}")
        traceback.print_exc()
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
