# Recommendation Agent Design Document

## Overview

The Recommendation Agent is the **ML inference engine** of Vasudha. It loads a pre-trained XGBoost classifier and generates crop predictions with SHAP-based feature importance explanations.

## Architecture

```
Input Features (N, P, K, pH, rainfall, temperature)
     ↓
Feature Schema Validation & Reordering
     ↓
XGBoost Model Inference
     ↓
Probability Ranking (Top-N)
     ↓
SHAP TreeExplainer (per prediction)
     ↓
Feature Importance Extraction & Categorization
     ↓
Output (Crops + Probabilities + SHAP)
```

## Model Specifications

**Model Type:** XGBoost Classifier (Multiclass)
- **Classes:** 53 crops
- **Features:** 6 (N, P, K, pH, rainfall, temperature)
- **Training Data:** Indian agricultural dataset

**Feature Details:**
- **N (Nitrogen):** Soil nitrogen content (0–200)
- **P (Phosphorus):** Soil phosphorus content (0–150)
- **K (Potassium):** Soil potassium content (0–200)
- **pH:** Soil pH (3–10)
- **rainfall:** Average seasonal rainfall (0–3500 mm)
- **temperature:** Average temperature (5–45°C)

## Numeric-Only Design Philosophy

**Why numeric features only?**
- Avoids shortcut learning on location or crop names
- Generalizes across districts and unseen regions
- Focuses on agronomic conditions, not geography

**What the model learns:**
- Feasibility: "Under these soil/climate conditions, which crops are likely?"
- Not: "In this district, this crop is always grown"

## SHAP Integration (Multiclass Classification)

### Where SHAP is Computed
Inside the Recommendation Agent with the XGBoost model.

### SHAP Output Format

Instead of returning raw SHAP values, the agent returns **categorized features**:

```json
{
  "top_positive_features": ["phosphorus", "potassium"],
  "top_negative_features": ["rainfall"],
  "neutral_features": ["pH", "nitrogen", "temperature"]
}
```

**Why this format?**
- Language-independent
- Model-agnostic (XAI doesn't need raw values)
- Translation-friendly
- Prevents overprecision

### Multiclass SHAP Handling

For 53-class prediction, SHAP returns 3D array: `(samples=1, features=6, classes=53)`

**Algorithm:**
1. Get predicted class index
2. Extract class-specific SHAP values: `shap_values[class_idx][0, :, predicted_class]`
3. Take absolute values (magnitude of influence)
4. Rank features by magnitude
5. Categorize: top 2 positive, bottom 1 negative, rest neutral

### Additivity Check

SHAP computes: `sum(SHAP values) + base ≈ model_output`

For multiclass XGBoost, minor numerical drift (~2%) is acceptable. The agent disables strict additivity checking with `check_additivity=False`.

## API Endpoint

### POST `/predict_top_crops/`

**Request:**
```json
{
  "N": 65,
  "P": 45,
  "K": 58,
  "pH": 7.2,
  "rainfall": 850,
  "temperature": 25.5
}
```

**Query Parameters:**
- `top_n`: Number of crops to return (1–10, default: 5)

**Response:**
```json
{
  "status": "OK",
  "top_n": 5,
  "predictions": [
    {
      "crop": "rice",
      "probability": 0.78,
      "shap_summary": {
        "top_positive_features": ["phosphorus", "potassium"],
        "top_negative_features": ["rainfall"],
        "neutral_features": ["pH", "nitrogen", "temperature"]
      }
    }
  ]
}
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Missing feature | Return 400 with field name |
| Invalid feature type | Return 400 with type info |
| Model not loaded | Return 500 with error details |
| SHAP computation fails | Return predictions without SHAP |
| Invalid top_n | Return 400 with valid range |

## Feature Loading Pipeline

1. **Load XGBoost model** (joblib)
2. **Load label encoder** (converts class indices to crop names)
3. **Load feature schema** (ensures consistent column ordering)
4. **Validate model integrity** (model + encoder versions match)
5. **Initialize SHAP explainer** (with error logging)

## Validation & Testing

- Test across diverse soil conditions (acidic, neutral, alkaline)
- Test across rainfall regimes (drought to waterlogging)
- Test temperature extremes (frost to heat stress)
- Validate feature column reordering
- Validate SHAP output for multiclass cases

## Performance Considerations

- **Model inference:** <50ms per prediction
- **SHAP computation:** ~100–200ms per sample
- **Total latency:** ~200–250ms per request
- **Memory:** ~500MB for model + SHAP explainer

## Model Updates & Versioning

When retraining the model:
1. Ensure feature names/order remain constant
2. Update label encoder
3. Re-validate SHAP on new model
4. Update model_loader.py with new paths
5. Test end-to-end with orchestrator

---

*Last updated: January 2026*
