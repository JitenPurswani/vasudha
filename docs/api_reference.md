# API Reference

## System Architecture

```
Orchestrator (Port 8000)
├── Weather Agent (Port 8001)
├── Soil Agent (Port 8002)
├── Recommendation Agent (Port 8003)
├── Market Agent (Port 8004)
├── XAI Agent (Port 8005)
├── Sustainability Agent (Port 8006)
└── Climate Adaptation Agent (Port 8007)
```

---

## Orchestrator API

### Main Recommendation Endpoint

#### `POST /get_full_recommendation/`

Generate comprehensive crop recommendations with all contextual data.

**Request:**
```json
{
  "lat": 27.1767,
  "lon": 78.0081,
  "season": "kharif",
  "mode": "seasonal"
}
```

**Parameters:**
- `lat` (float): Latitude (-90 to 90)
- `lon` (float): Longitude (-180 to 180)
- `season` (string): `kharif` | `rabi` | `zaid`
- `mode` (string): `seasonal` | `all_season` (optional, default: `seasonal`)

**Response (200 OK):**
```json
{
  "status": "OK",
  "location": {
    "district": "Agra",
    "state": "Uttar Pradesh"
  },
  "recommendations": {
    "ranking_logic": "0.55 * market + 0.45 * agronomic",
    "top_n": 5,
    "predictions": [
      {
        "crop": "rice",
        "final_score": 0.88,
        "agronomic_score": 0.82,
        "market_score": 0.92,
        "raw_probability": 0.78,
        "shap_summary": {
          "top_positive_features": ["phosphorus", "potassium"],
          "top_negative_features": ["rainfall"],
          "neutral_features": ["pH", "nitrogen", "temperature"]
        }
      }
    ]
  },
  "sustainability": {
    "agent": "sustainability_scoring",
    "scope": "crop_level",
    "note": "Sustainability score is advisory and does not affect final crop ranking.",
    "results": [
      {
        "crop": "rice",
        "sustainability_score": 0.72,
        "dimensions": {...},
        "explanation": {...}
      }
    ]
  },
  "xai_data": {
    "agent": "xai_agent",
    "scope": "crop_level",
    "explanations": [
      {
        "crop": "rice",
        "model_explanation": [...],
        "market_explanation": "...",
        "sustainability_explanation": "...",
        "summary": "..."
      }
    ]
  }
}
```

**Error Responses:**

```json
{
  "detail": "Weather data unavailable for given coordinates"
}
```

---

## Recommendation Agent API

### Crop Prediction Endpoint

#### `POST /predict_top_crops/`

Get ML predictions with SHAP feature importance.

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
- `top_n` (integer): Number of crops to return (1–10, default: 5)

**Response (200 OK):**
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

**Error Responses:**

```json
{
  "detail": "Prediction failed: Model artifacts not loaded correctly."
}
```

---

## Weather Agent API

#### `GET /get_combined_weather/`

Get aggregated weather data for a location.

**Query Parameters:**
- `lat` (float): Latitude
- `lon` (float): Longitude
- `season` (string): `kharif` | `rabi` | `zaid`

**Response (200 OK):**
```json
{
  "status": "OK",
  "district": "Agra",
  "state": "Uttar Pradesh",
  "avg_seasonal_rainfall_mm": 850,
  "temperature_celsius": 25.5,
  "season": "kharif"
}
```

---

## Soil Agent API

#### `GET /get_soil_data_by_district/`

Get district-level soil chemistry data.

**Query Parameters:**
- `district` (string): District name
- `state` (string): State name

**Response (200 OK):**
```json
{
  "status": "OK",
  "district": "Agra",
  "state": "Uttar Pradesh",
  "soil_data": {
    "N": 65,
    "P": 45,
    "K": 58,
    "pH": 7.2
  }
}
```

---

## Recommendation Agent API (Continued)

#### `GET /` (Health Check)

**Response (200 OK):**
```json
{
  "status": "Recommendation Agent is running"
}
```

---

## Market Agent API

#### `GET /market/evaluate`

Evaluate economic viability of a crop in a state.

**Query Parameters:**
- `crop` (string): Crop name (from canonical mapping)
- `state` (string): State name

**Response (200 OK):**
```json
{
  "agent": "market_agent",
  "crop": "rice",
  "state": "Maharashtra",
  "market_score": 78,
  "recent_trend": "stable",
  "price_volatility": "low",
  "confidence_level": 0.95,
  "metadata": {
    "long_term_avg": 2450,
    "recent_30d_avg": 2480,
    "previous_150d_avg": 2420,
    "data_points": 245
  }
}
```

**Error Responses:**

```json
{
  "detail": "Market data not found for crop 'xyz' in state 'ABC'"
}
```

---

## Sustainability Agent API

#### `GET /sustainability/evaluate`

Evaluate intrinsic sustainability of crops.

**Query Parameters:**
- `crops` (array of string): Crop names

**Response (200 OK):**
```json
{
  "agent": "sustainability_scoring",
  "scope": "crop_level",
  "note": "Sustainability score is advisory and does not affect final crop ranking.",
  "results": [
    {
      "crop": "rice",
      "sustainability_score": 0.72,
      "dimensions": {
        "water_intensity": {
          "category": "high",
          "factor": 0.40,
          "weight": 0.50,
          "impact": "negative"
        },
        "soil_impact": {
          "category": "neutral",
          "factor": 0.65,
          "weight": 0.30,
          "impact": "positive"
        },
        "cultivation_intensity": {
          "category": "medium",
          "factor": 0.65,
          "weight": 0.20,
          "impact": "moderate"
        }
      },
      "score_breakdown": {
        "water_contribution": 0.20,
        "soil_contribution": 0.195,
        "cultivation_contribution": 0.13
      },
      "explanation": {
        "summary": "High water requirement is the primary sustainability concern.",
        "details": "This crop requires high water intensity and medium cultivation effort..."
      }
    }
  ]
}
```

---

## XAI Agent API

#### `POST /xai/explain`

Generate explanations for crop recommendations.

**Request:**
```json
{
  "location": {
    "district": "Agra",
    "state": "Uttar Pradesh"
  },
  "recommendations": [
    {
      "crop": "rice",
      "final_score": 0.88,
      "agronomic_score": 0.82,
      "market_score": 0.92,
      "raw_probability": 0.78,
      "shap_summary": {
        "top_positive_features": ["phosphorus", "potassium"],
        "top_negative_features": ["rainfall"],
        "neutral_features": ["pH", "nitrogen", "temperature"]
      }
    }
  ],
  "sustainability": [
    {
      "crop": "rice",
      "sustainability_score": 0.72,
      "explanation": {...}
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "agent": "xai_agent",
  "scope": "crop_level",
  "explanations": [
    {
      "crop": "rice",
      "model_explanation": [
        {
          "feature": "phosphorus",
          "effect": "positive",
          "reason": "Phosphorus supports strong root development..."
        }
      ],
      "market_explanation": "This crop shows strong market stability...",
      "sustainability_explanation": "This crop has moderate sustainability...",
      "summary": "Economically viable, environmentally acceptable, supported by soil and climate conditions."
    }
  ]
}
```

---

## Climate Adaptation Agent API

#### `POST /climate_risk/assess`

Assess climate risks for a planted crop.

**Request:**
```json
{
  "crop": "rice",
  "district": "Agra",
  "state": "Uttar Pradesh",
  "season": "kharif"
}
```

**Response (200 OK):**
```json
{
  "agent": "climate_adaptation_agent",
  "crop": "rice",
  "location": "Agra, Uttar Pradesh",
  "season": "kharif",
  "assessment_date": "2026-01-23",
  "risks_detected": [
    {
      "risk_type": "waterlogging",
      "severity": "medium",
      "trigger_condition": "Excessive rainfall expected",
      "preventive_actions": [
        "Ensure adequate drainage",
        "Monitor soil moisture levels"
      ]
    }
  ],
  "overall_risk_level": "moderate",
  "recommendations": "Monitor weather forecasts and drainage systems..."
}
```

---

## Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 404 | Resource Not Found |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## Rate Limiting

No rate limiting currently implemented. Production deployment should include:
- IP-based rate limiting (100 requests/minute)
- User-based rate limiting (1000 requests/day)

## Authentication

No authentication currently implemented. Production deployment should include:
- API key authentication
- JWT token-based auth
- Request signing

---

*Last updated: January 2026*
