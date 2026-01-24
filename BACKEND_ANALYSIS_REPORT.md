# Vasudha Backend System Analysis Report

**Project:** Vasudha (Multi-Agent AI for Sustainable Crop Optimization)  
**Analysis Date:** January 24, 2026  
**Mode:** READ-ONLY Analysis

---

## 1. PROJECT STRUCTURE

### 1.1 Major Folders

```
backend/
├── orchestrator/          # Main FastAPI orchestrator service
├── agents/                 # Individual agent microservices
│   ├── weather_agent/      # Weather data aggregation
│   ├── soil_agent/         # Soil chemistry data retrieval
│   ├── recommendation_agent/  # ML-based crop prediction
│   ├── market_agent/        # Economic viability scoring
│   ├── climate-adaptation_agent/  # Climate risk detection
│   ├── sustainability_agent/      # Environmental sustainability scoring
│   └── xai_agent/         # Explainable AI explanations
└── shared/
    └── models/            # Shared ML model artifacts
```

### 1.2 Agent Identification

| Agent | Port (Default) | Purpose | Entry Point |
|-------|---------------|---------|-------------|
| **Orchestrator** | 8000 | Main API gateway, coordinates all agents | `backend/orchestrator/main.py` |
| **Weather Agent** | 8001 | Reverse geocoding, live weather, historical rainfall | `backend/agents/weather_agent/main.py` |
| **Soil Agent** | 8002 | District-level soil chemistry (N, P, K, pH) | `backend/agents/soil_agent/main.py` |
| **Recommendation Agent** | 8003 | ML model predictions with SHAP explanations | `backend/agents/recommendation_agent/main.py` |
| **Market Agent** | 8004 | Economic scoring based on historical prices | `backend/agents/market_agent/main.py` |
| **XAI Agent** | 8005 | Human-readable explanations for recommendations | `backend/agents/xai_agent/main.py` |
| **Sustainability Agent** | 8006 | Environmental sustainability scoring | `backend/agents/sustainability_agent/main.py` |
| **Climate Adaptation Agent** | 8007 | Climate risk detection with preventive actions | `backend/agents/climate-adaptation_agent/main.py` |

### 1.3 Entry Points

- **Main Orchestrator:** `backend/orchestrator/main.py` - FastAPI app on port 8000
- **All Agents:** Each agent has its own `main.py` with FastAPI app instance
- **No centralized startup script** - Each service runs independently

---

## 2. API SURFACE

### 2.1 Orchestrator API

#### `POST /get_full_recommendation/`

**Purpose:** Main endpoint that orchestrates all agents to provide comprehensive crop recommendations.

**HTTP Method:** POST

**Route:** `/get_full_recommendation/`

**Request Body Schema:**
```json
{
  "lat": float | null,        // Optional: Latitude (-90 to 90)
  "lon": float | null,        // Optional: Longitude (-180 to 180)
  "season": string,           // Required: "kharif" | "rabi" | "zaid"
  "mode": string              // Optional: "seasonal" | "all_season" (default: "seasonal")
}
```

**Query Parameters:** None

**Response JSON Structure (200 OK):**
```json
{
  "status": "OK",
  "location": {
    "district": string,
    "state": string
  },
  "recommendations": {
    "ranking_logic": "0.55 * market + 0.45 * agronomic",
    "top_n": integer,
    "predictions": [
      {
        "crop": string,
        "final_score": float,           // 0.0-1.0, rounded to 4 decimals
        "agronomic_score": float,       // 0.0-1.0, rounded to 4 decimals
        "market_score": float | null,   // 0.0-1.0, rounded to 3 decimals, or null
        "raw_probability": float,       // 0.0-1.0, rounded to 4 decimals
        "shap_summary": {
          "top_positive_features": [string],
          "top_negative_features": [string],
          "neutral_features": [string]
        } | null
      }
    ]
  },
  "sustainability": {
    "agent": "sustainability_scoring",
    "scope": "crop_level",
    "note": string,
    "results": [
      {
        "crop": string,
        "sustainability_score": float,
        "dimensions": {...},
        "score_breakdown": {...},
        "explanation": {...},
        "disclaimer": string
      }
    ]
  } | null,
  "xai_data": {
    "agent": "xai_agent",
    "scope": "crop_level",
    "explanations": [
      {
        "crop": string,
        "model_explanation": [
          {
            "feature": string,
            "effect": "positive" | "negative" | "neutral",
            "reason": string
          }
        ],
        "market_explanation": string | null,
        "sustainability_explanation": string | null,
        "summary": string
      }
    ]
  } | null
}
```

**Error Responses:**
- **404:** District not found for given coordinates (from weather agent)
- **500:** Internal server errors from any agent (propagated)

**Notes:**
- Returns top 5 crops by default (filtered from top 10 ML predictions)
- Market score can be null if market agent fails or crop not in mapping
- Sustainability and XAI data can be null if agents fail (non-blocking)

#### `GET /`

**Purpose:** Health check endpoint

**Response:**
```json
{
  "status": "Orchestrator is running"
}
```

---

### 2.2 Weather Agent API

#### `GET /get_combined_weather/`

**Purpose:** Fetches district via reverse geocoding, then retrieves live weather + historical rainfall.

**HTTP Method:** GET

**Route:** `/get_combined_weather/`

**Query Parameters:**
- `lat` (float, required): Latitude
- `lon` (float, required): Longitude
- `season` (string, required): "kharif" | "rabi" | "zaid"

**Request Body:** None

**Response JSON Structure (200 OK):**
```json
{
  "state": string | null,
  "district": string | null,
  "temperature_celsius": float | null,
  "humidity_percent": float | null,
  "avg_seasonal_rainfall_mm": float | null,
  "status": "OK" | "APIKeyMissing" | "APIError" | "RainfallDataNotFound"
}
```

**Error Responses:**
- **404:** District not found for given coordinates

**Notes:**
- Uses OpenStreetMap Nominatim API for reverse geocoding
- Uses OpenWeatherMap API for live weather (requires API key)
- Reads from SQLite database for historical rainfall

#### `GET /`

**Purpose:** Health check

**Response:**
```json
{
  "status": "Weather Agent is running"
}
```

---

### 2.3 Soil Agent API

#### `GET /get_soil_data_by_district/`

**Purpose:** Retrieves district-level soil chemistry data from SQLite database.

**HTTP Method:** GET

**Route:** `/get_soil_data_by_district/`

**Query Parameters:**
- `district` (string, required): District name (e.g., "Ludhiana", "Nashik")
- `state` (string, required): State name (e.g., "Punjab", "Maharashtra")

**Request Body:** None

**Response JSON Structure (200 OK):**
```json
{
  "district": string,
  "state": string,
  "soil_data": {
    "N": float | null,      // Nitrogen (kg/ha)
    "P": float | null,      // Phosphorus (kg/ha)
    "K": float | null,      // Potassium (kg/ha)
    "pH": float | null      // pH value
  },
  "status": "OK" | "DistrictOrStateNotFoundInDB"
}
```

**Error Responses:**
- None (always returns 200, but status field indicates data availability)

**Notes:**
- Performs case-insensitive district matching
- Cleans district names (removes "District", "Tehsil", etc. suffixes)
- Returns null values if data not found (does not raise HTTP errors)

#### `GET /`

**Purpose:** Health check

**Response:**
```json
{
  "status": "Soil Agent is running"
}
```

---

### 2.4 Recommendation Agent API

#### `POST /predict_top_crops/`

**Purpose:** Uses ML model (XGBoost) to predict top N crops with SHAP explanations.

**HTTP Method:** POST

**Route:** `/predict_top_crops/`

**Query Parameters:**
- `top_n` (int, optional): Number of top crops to return (default: 5, min: 1, max: 10)

**Request Body Schema:**
```json
{
  "N": float,           // Nitrogen (kg/ha)
  "P": float,           // Phosphorus (kg/ha)
  "K": float,           // Potassium (kg/ha)
  "pH": float,          // pH value
  "rainfall": float,    // Rainfall (mm)
  "temperature": float  // Temperature (°C)
}
```

**Response JSON Structure (200 OK):**
```json
{
  "status": "OK",
  "top_n": integer,
  "predictions": [
    {
      "crop": string,
      "probability": float,    // 0.0-1.0, rounded to 4 decimals
      "shap_summary": {
        "top_positive_features": [string],
        "top_negative_features": [string],
        "neutral_features": [string]
      } | null
    }
  ]
}
```

**Error Responses:**
- **500:** Model artifacts not loaded correctly
- **500:** Prediction failed (with error detail message)

**Notes:**
- Uses XGBoost pipeline loaded from `backend/shared/models/xgboost_pipeline.pkl`
- SHAP explainer initialized at startup (TreeExplainer)
- Feature order enforced: ["N", "P", "K", "pH", "rainfall", "temperature"]

#### `GET /`

**Purpose:** Health check

**Response:**
```json
{
  "status": "Recommendation Agent is running"
}
```

---

### 2.5 Market Agent API

#### `GET /market/evaluate`

**Purpose:** Evaluates economic viability of a crop in a state based on historical prices.

**HTTP Method:** GET

**Route:** `/market/evaluate`

**Query Parameters:**
- `crop` (string, required): Crop name (must match MARKET_CROP_MAP in orchestrator)
- `state` (string, required): State name

**Request Body:** None

**Response JSON Structure (200 OK):**
```json
{
  "crop": string,
  "state": string,
  "price": float,              // Average price (Rs/quintal), rounded to 2 decimals
  "price_norm": float,         // Normalized price (0.0-1.0), rounded to 3 decimals
  "stability": float,          // Price stability (0.0-1.0), rounded to 3 decimals
  "trend_percent": float,      // Price trend percentage, rounded to 2 decimals
  "market_score": float,       // Final score (0-100), rounded to 2 decimals
  "confidence": float          // Confidence level (0.0-1.0), currently hardcoded to 0.9
}
```

**Error Responses:**
- **404:** No market data found for crop/state combination

**Notes:**
- Market score formula: `0.35 * price_norm + 0.30 * stability + 0.25 * trend_norm + 0.10 * confidence`
- Uses SQLite database at `data/market/sqlite/market.db`
- Analyzes last 365 days for volatility, last 30 days vs previous 150 days for trend

#### `GET /market/forecast`

**Purpose:** Generates price forecasts for 30, 60, and 90 day horizons.

**HTTP Method:** GET

**Route:** `/market/forecast`

**Query Parameters:**
- `crop` (string, required): Crop name
- `state` (string, required): State name

**Request Body:** None

**Response JSON Structure (200 OK):**
```json
{
  "crop": string,
  "state": string,
  "trend_percent": float,
  "persistence": float,
  "confidence": float,
  "forecast_30": [
    {
      "date": "YYYY-MM-DD",
      "price": float
    }
  ],
  "forecast_60": [...],
  "forecast_90": [...]
}
```

**Error Responses:**
- **404:** Insufficient market history (requires at least 40 days of data)

**Notes:**
- Decay factors: 30 days = 1.0, 60 days = 0.6, 90 days = 0.35
- Uses trend persistence from `crop_trend_persistence` table

---

### 2.6 Sustainability Agent API

#### `GET /sustainability/evaluate`

**Purpose:** Evaluates intrinsic crop sustainability based on water, soil, and cultivation intensity.

**HTTP Method:** GET

**Route:** `/sustainability/evaluate`

**Query Parameters:**
- `crops` (string | List[string], required): Crop name(s) - can be single string or multiple via query params

**Request Body:** None

**Response JSON Structure (200 OK):**
```json
{
  "agent": "sustainability_scoring",
  "scope": "crop_level",
  "note": "Sustainability score is advisory and does not affect final crop ranking.",
  "results": [
    {
      "crop": string,
      "sustainability_score": float,    // 0.0-1.0, rounded to 3 decimals
      "dimensions": {
        "water_intensity": {
          "category": "very_high" | "high" | "medium" | "low",
          "factor": float,
          "weight": 0.50,
          "impact": "negative" | "positive"
        },
        "soil_impact": {
          "category": "negative" | "neutral" | "positive",
          "factor": float,
          "weight": 0.30,
          "impact": "positive" | "neutral"
        },
        "cultivation_intensity": {
          "category": "high" | "medium" | "low",
          "factor": float,
          "weight": 0.20,
          "impact": "negative" | "moderate"
        }
      },
      "score_breakdown": {
        "water_contribution": float,
        "soil_contribution": float,
        "cultivation_contribution": float
      },
      "explanation": {
        "summary": string,
        "details": [string]
      },
      "disclaimer": string
    }
  ]
}
```

**Error Responses:**
- **404:** No sustainability data found for given crops

**Notes:**
- Score weights: water (50%), soil (30%), cultivation (20%)
- Data loaded from `crop_sustainability_data.json`
- Purely advisory - does not affect crop ranking

#### `GET /`

**Purpose:** Health check

**Response:**
```json
{
  "status": "Sustainability Scoring Agent is running"
}
```

---

### 2.7 XAI Agent API

#### `POST /xai/explain`

**Purpose:** Generates human-readable explanations for crop recommendations.

**HTTP Method:** POST

**Route:** `/xai/explain`

**Query Parameters:** None

**Request Body Schema:**
```json
{
  "location": {
    "district": string,
    "state": string
  },
  "recommendations": [
    {
      "crop": string,
      "final_score": float,
      "agronomic_score": float,
      "market_score": float | null,
      "raw_probability": float,
      "shap_summary": {
        "top_positive_features": [string],
        "top_negative_features": [string],
        "neutral_features": [string]
      } | null
    }
  ],
  "sustainability": [
    {
      "crop": string,
      "sustainability_score": float,
      "explanation": {
        "summary": string,
        "details": [string]
      }
    }
  ] | null
}
```

**Response JSON Structure (200 OK):**
```json
{
  "agent": "xai_agent",
  "scope": "crop_level",
  "explanations": [
    {
      "crop": string,
      "model_explanation": [
        {
          "feature": string,
          "effect": "positive" | "negative" | "neutral",
          "reason": string
        }
      ],
      "market_explanation": string | null,
      "sustainability_explanation": string | null,
      "summary": string
    }
  ]
}
```

**Error Responses:**
- **500:** XAI explanation failed (with error detail)

**Notes:**
- Rule-based explanations (no ML/LLM)
- Combines SHAP, market, and sustainability data into narrative
- Deterministic output

#### `GET /`

**Purpose:** Health check

**Response:**
```json
{
  "status": "XAI Agent is running"
}
```

---

### 2.8 Climate Adaptation Agent API

#### `POST /climate/adapt`

**Purpose:** Detects climate risks for a specific crop and provides preventive actions.

**HTTP Method:** POST

**Route:** `/climate/adapt`

**Query Parameters:** None

**Request Body Schema:**
```json
{
  "crop": string,           // Crop name (must exist in crop_climate_profiles.json)
  "lat": float,             // Latitude
  "lon": float,             // Longitude
  "season": string,         // "kharif" | "rabi" | "zaid"
  "explain": boolean        // Optional: Enable LLM explanation (default: true)
}
```

**Response JSON Structure (200 OK):**
```json
{
  "status": "OK" | "ALERT",
  "risks": [
    {
      "risk": string,                    // e.g., "Heat Stress", "Dry Spell Risk"
      "severity": "High" | "Medium" | "Low",
      "trigger": string,
      "preventive_actions": [string]     // Array of action strings
    }
  ],
  "explanation": string | null,          // LLM-generated explanation (if explain=true)
  "debug": {
    "location": {
      "lat": float,
      "lon": float,
      "district": string
    },
    "crop_used": string,
    "weather_context_used": {
      "temp_current": float,
      "humidity": float,
      "temp_forecast_max": float,
      "temp_forecast_min": float,
      "seasonal_rainfall": float
    },
    "weather_sources": {...},
    "crop_profile_used": {...}
  }
}
```

**Error Responses:**
- **400:** Unsupported crop
- **400:** District not found via reverse geocoding
- **500:** Weather API error

**Notes:**
- Uses Groq API (LLM) for explanations if `explain=true` and risks detected
- Rule-based risk detection (no ML)
- Preventive actions loaded from `climate_preventive_actions.json`

#### `GET /`

**Purpose:** Health check

**Response:**
```json
{
  "status": "Climate Adaptation Agent running"
}
```

---

## 3. ORCHESTRATION FLOW

### 3.1 Main Orchestrator Endpoint Flow

**Endpoint:** `POST /get_full_recommendation/`

**Execution Order:**

1. **Weather Agent Call** (`GET /get_combined_weather/`)
   - Input: `lat`, `lon`, `season`
   - Output: `district`, `state`, `temperature_celsius`, `avg_seasonal_rainfall_mm`
   - Purpose: Get location and weather context

2. **Soil Agent Call** (`GET /get_soil_data_by_district/`)
   - Input: `district`, `state` (from weather agent)
   - Output: `N`, `P`, `K`, `pH`
   - Purpose: Get soil chemistry data

3. **Environment Construction**
   - Combines weather + soil data into `env` dict:
     ```python
     {
       "N": float,
       "P": float,
       "K": float,
       "pH": float,
       "rainfall": float,      # from weather agent
       "temperature": float    # from weather agent
     }
     ```

4. **Agronomic Regime Derivation**
   - Calls `derive_flags(env)` to compute environmental flags:
     - `extreme_drought`, `low_rainfall`, `moderate_rain`, `high_rainfall`
     - `acidic_soil`, `alkaline_soil`, `low_nitrogen`
     - `high_temperature`, `low_temperature`

5. **Recommendation Agent Call** (`POST /predict_top_crops/`)
   - Input: `env` dict, `top_n=10`
   - Output: Top 10 crops with probabilities and SHAP summaries
   - Purpose: ML-based crop predictions

6. **Filtering & Ranking Loop** (for each crop in top 10):
   - **Season Filter:** Check if crop is suitable for requested season (using `CROP_SEASONALITY`)
   - **Constraint Check:** Call `violates_constraints()` to filter out agronomically invalid crops
   - **Score Boost:** Call `compute_score_boost()` to adjust agronomic score
   - **Market Score:** Call Market Agent (`GET /market/evaluate`) if crop in `MARKET_CROP_MAP`
   - **Final Score:** `0.55 * market_score + 0.45 * agronomic_score` (or `0.85 * agronomic_score` if market unavailable)

7. **Sorting**
   - Sort filtered crops by `final_score` (descending)

8. **Sustainability Agent Call** (`GET /sustainability/evaluate`)
   - Input: Top 5 crops (non-blocking)
   - Output: Sustainability scores for each crop
   - Purpose: Advisory data only

9. **XAI Agent Call** (`POST /xai/explain`)
   - Input: Top 5 crops with SHAP summaries + sustainability data
   - Output: Human-readable explanations
   - Purpose: Explainability layer

10. **Response Assembly**
    - Combines all data into final JSON response

### 3.2 Agent Call Dependencies

```
Orchestrator
  ├─> Weather Agent (no dependencies)
  ├─> Soil Agent (depends on Weather Agent output)
  ├─> Recommendation Agent (depends on Weather + Soil output)
  ├─> Market Agent (depends on Weather output + crop name)
  ├─> Sustainability Agent (depends on top 5 crops)
  └─> XAI Agent (depends on recommendations + sustainability)
```

### 3.3 Ranking Logic

**Final Score Formula:**
- If market score available: `final_score = 0.55 * market_score + 0.45 * agronomic_score`
- If market score unavailable: `final_score = 0.85 * agronomic_score` (mild penalty)

**Agronomic Score:**
- Base: ML model probability
- Boost: `compute_score_boost()` adds 0.0-0.15 based on:
  - Rainfall regime (high/moderate/low)
  - Season intent (seasonal mode bias)
  - Staple crop bias (rice, wheat get +0.05)

**Market Score:**
- Range: 0-100 (normalized to 0.0-1.0 in orchestrator)
- Components: price (35%), stability (30%), trend (25%), confidence (10%)

### 3.4 Filtering Logic

**Constraint Violations** (crops are excluded if):
1. Extreme drought + high water requirement
2. Low rainfall + high/medium water requirement
3. Low rainfall + medium water + vegetable type
4. High rainfall + low water requirement
5. Acidic soil + cereal type + (wheat OR barley)
6. Alkaline soil + (potato OR banana)
7. Low nitrogen + high nutrient requirement
8. High temperature + (wheat OR barley OR apple)
9. High rainfall + fiber type
10. Seasonal mode + (fruit OR plantation type)
11. Extreme drought + (fruit OR plantation type)

**Season Filtering:**
- Only crops matching requested season (`kharif`/`rabi`/`zaid`) are included
- Uses `CROP_SEASONALITY` mapping (53 crops defined)

---

## 4. CONFIGURATION & ENVIRONMENT

### 4.1 Required Environment Variables

| Variable | Agent | Purpose | Default |
|----------|-------|---------|---------|
| `WEATHER_AGENT_URL` | Orchestrator | Weather agent base URL | `http://localhost:8001` |
| `SOIL_AGENT_URL` | Orchestrator | Soil agent base URL | `http://localhost:8002` |
| `RECOMMENDATION_AGENT_URL` | Orchestrator | Recommendation agent base URL | `http://localhost:8003` |
| `MARKET_AGENT_URL` | Orchestrator | Market agent base URL | `http://localhost:8004` |
| `XAI_AGENT_URL` | Orchestrator | XAI agent base URL | `http://localhost:8005` |
| `SUSTAINABILITY_AGENT_URL` | Orchestrator | Sustainability agent base URL | `http://localhost:8006` |
| `OPENWEATHERMAP_API_KEY` | Weather Agent, Climate Adaptation Agent | OpenWeatherMap API key | None (required) |
| `GROQ_API_KEY` | Climate Adaptation Agent | Groq LLM API key | None (optional, for explanations) |

**Location of .env files:**
- `backend/agents/weather_agent/.env`
- `backend/agents/climate-adaptation_agent/.env`

### 4.2 External APIs Used

| API | Agent | Endpoint | Purpose |
|-----|-------|----------|---------|
| **OpenWeatherMap** | Weather Agent, Climate Adaptation Agent | `https://api.openweathermap.org/data/2.5/weather` | Current weather (temp, humidity) |
| **OpenWeatherMap** | Climate Adaptation Agent | `https://api.openweathermap.org/data/2.5/forecast` | Weather forecast (temp min/max) |
| **OpenStreetMap Nominatim** | Weather Agent, Climate Adaptation Agent | `https://nominatim.openstreetmap.org/reverse` | Reverse geocoding (lat/lon → district/state) |
| **Groq API** | Climate Adaptation Agent | `https://api.groq.com/openai/v1/chat/completions` | LLM explanations for climate risks |

### 4.3 Database Files

| Database | Path | Agent | Read/Write | Purpose |
|----------|------|-------|------------|---------|
| **District Rainfall DB** | `backend/agents/weather_agent/district_rainfall_db.sqlite` | Weather Agent | Read-only | Historical seasonal rainfall by district |
| **District Rainfall DB** | `backend/agents/climate-adaptation_agent/data/district_rainfall_db.sqlite` | Climate Adaptation Agent | Read-only | Historical seasonal rainfall by district |
| **District Soil DB** | `backend/agents/soil_agent/district_soil_db.sqlite` | Soil Agent | Read-only | Soil chemistry (N, P, K, pH) by district/state |
| **Market DB** | `data/market/sqlite/market.db` | Market Agent | Read-only | Historical mandi prices, trends, persistence |

**Database Schemas:**

**Weather Agent - `seasonal_rainfall` table:**
- `District` (TEXT)
- `Avg_Rainfall_Kharif_mm` (REAL)
- `Avg_Rainfall_Rabi_mm` (REAL)
- `Avg_Rainfall_Zaid_mm` (REAL)

**Soil Agent - `soil_data` table:**
- `District` (TEXT)
- `Region` (TEXT) - State name
- `N_avg` (REAL) - Nitrogen average
- `P_avg` (REAL) - Phosphorus average
- `K_avg` (REAL) - Potassium average
- `pH_avg` (REAL) - pH average

**Market Agent - Multiple tables:**
- `state_daily_prices`: Daily price data by state/commodity
- `crop_trend_persistence`: Trend persistence scores
- `market_prices`: Raw price data (from schema.sql)
- `market_aggregates`: Precomputed aggregates
- `market_forecasts`: Forecast data

### 4.4 Model Artifacts

| Artifact | Path | Purpose |
|----------|------|---------|
| **XGBoost Pipeline** | `backend/shared/models/xgboost_pipeline.pkl` | ML model for crop prediction |
| **Label Encoder** | `backend/shared/models/label_encoder.pkl` | Maps crop indices to names |
| **Feature Names** | `backend/shared/models/feature_names.json` | Feature order: ["N", "P", "K", "pH", "rainfall", "temperature"] |

### 4.5 JSON Data Files

| File | Path | Purpose |
|------|------|---------|
| **Crop Climate Profiles** | `backend/agents/climate-adaptation_agent/crop_climate_profiles.json` | Temperature/rainfall thresholds per crop |
| **Climate Preventive Actions** | `backend/agents/climate-adaptation_agent/climate_preventive_actions.json` | Risk → preventive actions mapping |
| **Crop Sustainability Data** | `backend/agents/sustainability_agent/crop_sustainability_data.json` | Water/soil/cultivation intensity per crop |

---

## 5. DATA CONTRACTS

### 5.1 Environment Dictionary (Between Agents)

**Structure:**
```python
{
  "N": float,              # Nitrogen (kg/ha) - from soil agent
  "P": float,              # Phosphorus (kg/ha) - from soil agent
  "K": float,              # Potassium (kg/ha) - from soil agent
  "pH": float,             # pH value - from soil agent
  "rainfall": float,       # Seasonal rainfall (mm) - from weather agent
  "temperature": float     # Temperature (°C) - from weather agent
}
```

**Units:**
- N, P, K: kg/ha
- pH: dimensionless (typically 4.0-9.0)
- Rainfall: mm (millimeters)
- Temperature: °C (Celsius)

**Ranges:**
- No explicit validation in code, but typical ranges:
  - N: 0-200 kg/ha
  - P: 0-100 kg/ha
  - K: 0-300 kg/ha
  - pH: 4.0-9.0
  - Rainfall: 0-5000 mm
  - Temperature: -10 to 50 °C

### 5.2 Season Values

**Valid Values:**
- `"kharif"` - Monsoon season (Jun-Oct)
- `"rabi"` - Winter season (Nov-Mar)
- `"zaid"` - Summer season (Mar-Jun)

**Case Sensitivity:** Lowercase expected (code uses `.lower()`)

### 5.3 Mode Values

**Valid Values:**
- `"seasonal"` - Only seasonal crops (excludes fruits/plantation)
- `"all_season"` - All crops where agronomically valid

**Default:** `"seasonal"`

### 5.4 Crop Names

**Canonical Format:** Lowercase (e.g., `"rice"`, `"wheat"`, `"potato"`)

**Total Crops Supported:** 53 crops defined in `CROP_META` and `CROP_SEASONALITY`

**Categories:**
- Cereals: rice, wheat, maize, barley, jowar, ragi
- Pulses: moong, blackgram, horsegram, chickpea, lentil, peas
- Oilseeds: sesamum, rapeseed, sunflower, soyabean, groundnut, mustard, linseed, safflower
- Fibers: cotton, jute
- Vegetables: tomato, brinjal, ladyfinger, cucumber, bittergourd, bottlegourd, ridgegourd, pumpkin, ashgourd, cabbage, cauliflower, carrot, beetroot, radish, onion, potato, sweetpotato, tapioca, drumstick
- Fruits: banana, papaya, apple, mango, pomegranate
- Plantation: arecanut, cashewnuts, coffee

### 5.5 SHAP Summary Structure

```python
{
  "top_positive_features": [string],    # Top 2 features (by absolute SHAP value)
  "top_negative_features": [string],     # Bottom 1 feature
  "neutral_features": [string]            # Remaining 3 features
}
```

**Feature Name Mapping:**
- `"N"` → `"nitrogen"`
- `"P"` → `"phosphorus"`
- `"K"` → `"potassium"`
- `"pH"` → `"ph"`
- `"rainfall"` → `"rainfall"`
- `"temperature"` → `"temperature"`

### 5.6 Market Crop Mapping

**Purpose:** Maps internal crop names to market database commodity names

**Example:**
- `"rice"` → `"Rice"`
- `"moong"` → `"Green Gram (Moong)(Whole)"`
- `"jowar"` → `"Jowar (Sorghum)"`

**Note:** Not all crops have market mappings. If mapping missing, market score is null.

### 5.7 Mandatory vs Optional Fields

**Orchestrator Request:**
- Required: `season`
- Optional: `lat`, `lon`, `mode`

**Weather Agent Response:**
- All fields can be `null` if data unavailable
- `status` field indicates data availability

**Soil Agent Response:**
- All soil data fields can be `null` if district/state not found
- `status` field indicates data availability

**Recommendation Agent Request:**
- All 6 features required (N, P, K, pH, rainfall, temperature)

**Market Agent Response:**
- Returns 404 if no data found (not null values)

**Sustainability Agent Response:**
- Returns 404 if no data found for crops

**XAI Agent Request:**
- `location`: Required
- `recommendations`: Required (list, can be empty)
- `sustainability`: Optional (can be null)

---

## 6. SIDE EFFECTS & STATE

### 6.1 Persistent State (Disk)

**SQLite Databases (Read-Only):**
- All databases are read-only from agent perspective
- No writes performed by agents during normal operation
- Databases must be pre-populated with data

**Model Artifacts (Read-Only):**
- ML models loaded into memory at startup
- No model updates during runtime

**JSON Configuration Files (Read-Only):**
- Crop profiles, preventive actions, sustainability data loaded at startup
- No runtime modifications

### 6.2 In-Memory State

**Recommendation Agent:**
- `pipeline`: Loaded at import time (global)
- `label_encoder`: Loaded at import time (global)
- `shap_explainer`: Initialized at import time (global, TreeExplainer)
- `FEATURE_COLUMNS`: Loaded at import time (global)

**Climate Adaptation Agent:**
- `CROP_PROFILES`: Loaded at import time from JSON (global)

**Sustainability Agent:**
- `CROP_DATA`: Loaded at import time from JSON (global)

**Orchestrator:**
- `CROP_META`: Hardcoded dictionary (53 crops)
- `CROP_SEASONALITY`: Hardcoded dictionary (53 crops)
- `MARKET_CROP_MAP`: Hardcoded dictionary (crop name mappings)

### 6.3 Caching

**No explicit caching implemented:**
- Each request triggers fresh database queries
- Each request triggers fresh API calls to external services
- No in-memory cache for weather/soil/market data

### 6.4 Idempotency

**All endpoints are idempotent:**
- No state changes on repeated calls
- Same input → same output (deterministic)
- No side effects from multiple calls

**Exception:** External API rate limits may apply (OpenWeatherMap, Nominatim, Groq)

### 6.5 Concurrent Request Handling

**FastAPI default behavior:**
- Each agent runs as independent FastAPI app
- No explicit locking or synchronization
- Database connections are per-request (SQLite)
- External API calls are per-request

**Potential Issues:**
- SQLite may have concurrency limitations (read-only should be fine)
- External API rate limits may cause failures under high load

---

## 7. FRONTEND INTEGRATION NOTES

### 7.1 Primary Endpoint for Frontend

**`POST /get_full_recommendation/`** (Orchestrator)

**Intended Usage:**
- Main entry point for mobile/web frontend
- Single request returns complete recommendation with explanations
- All agent coordination handled server-side

**Request Format:**
```json
{
  "lat": 27.1767,
  "lon": 78.0081,
  "season": "kharif",
  "mode": "seasonal"
}
```

**Response Time:**
- Typical: 2-5 seconds (depends on external API latency)
- Timeout: 15 seconds (httpx.AsyncClient timeout in orchestrator)

### 7.2 User-Facing Fields

**Recommended for Display:**
- `recommendations.predictions[].crop` - Crop name
- `recommendations.predictions[].final_score` - Overall score (0-1)
- `recommendations.predictions[].agronomic_score` - Agronomic suitability
- `recommendations.predictions[].market_score` - Economic viability
- `xai_data.explanations[].summary` - Human-readable summary
- `xai_data.explanations[].model_explanation[]` - Feature-level explanations
- `sustainability.results[].sustainability_score` - Environmental score
- `location.district`, `location.state` - User's location

**Internal/Technical Fields (Not for Direct Display):**
- `recommendations.predictions[].raw_probability` - ML model output
- `recommendations.predictions[].shap_summary` - Technical SHAP data
- `xai_data.explanations[].model_explanation[].reason` - Can be displayed but technical
- `sustainability.results[].score_breakdown` - Technical breakdown
- `debug` fields in climate adaptation agent response

### 7.3 Latency Considerations

**Heavy Endpoints:**
- `POST /get_full_recommendation/` - Calls 6 agents sequentially, external APIs
- `POST /climate/adapt` - Calls OpenWeatherMap (current + forecast), Groq LLM
- `GET /market/forecast` - Complex database queries

**Lightweight Endpoints:**
- `GET /` (health checks) - Instant
- `GET /get_soil_data_by_district/` - Simple SQLite query
- `GET /sustainability/evaluate` - JSON lookup

### 7.4 Mobile Usage Considerations

**Recommended Approach:**
- Use orchestrator endpoint only (single request)
- Implement client-side timeout (10-15 seconds)
- Show loading state during request
- Handle null values gracefully (market_score, sustainability, xai_data can be null)

**Error Handling:**
- Network errors: Retry with exponential backoff
- 404 errors: Show user-friendly "location not found" message
- 500 errors: Show generic error, log details server-side
- Timeout: Show "request taking longer than expected" message

**Data Size:**
- Response typically 5-20 KB (JSON)
- Top 5 crops with full explanations
- Suitable for mobile networks

### 7.5 Optional Endpoints (Not Called by Orchestrator)

**Direct Agent Endpoints (for debugging/testing):**
- `GET /get_combined_weather/` - Test weather agent independently
- `GET /get_soil_data_by_district/` - Test soil agent independently
- `POST /predict_top_crops/` - Test ML model independently
- `GET /market/evaluate` - Test market scoring independently
- `GET /market/forecast` - Get price forecasts (not used by orchestrator)
- `POST /climate/adapt` - Get climate risks for specific crop (not used by orchestrator)

**Note:** Frontend should primarily use orchestrator endpoint. Direct agent endpoints are for debugging/admin use.

### 7.6 Response Structure for UI

**Recommended UI Layout:**
1. **Location Header:** `location.district`, `location.state`
2. **Top Recommendations:** `recommendations.predictions[]` (sorted by final_score)
3. **Explanation Card:** `xai_data.explanations[]` (per crop)
4. **Sustainability Badge:** `sustainability.results[].sustainability_score` (optional display)
5. **Score Breakdown:** Show agronomic_score, market_score, final_score (optional)

**Error States:**
- Missing market_score: Show "Market data unavailable" badge
- Missing sustainability: Hide sustainability section
- Missing xai_data: Show basic crop info without explanations

---

## APPENDIX: Additional Technical Details

### A.1 Crop Metadata Structure

**CROP_META fields per crop:**
- `water`: "high" | "medium" | "low"
- `nutrient`: "high" | "medium" | "low"
- `type`: "cereal" | "pulse" | "oilseed" | "fiber" | "vegetable" | "fruit" | "plantation"

### A.2 Constraint Rules (Detailed)

**Rainfall Constraints:**
- Extreme drought (< 120 mm): Excludes high water crops
- Low rainfall (120-400 mm): Excludes high water, medium water vegetables
- High rainfall (≥ 900 mm): Excludes low water crops, fiber crops

**Soil Constraints:**
- Acidic soil (pH < 6.0): Excludes wheat, barley (cereals)
- Alkaline soil (pH > 7.5): Excludes potato, banana
- Low nitrogen (< 40): Excludes high nutrient crops

**Temperature Constraints:**
- High temperature (> 32°C): Excludes wheat, barley, apple
- Low temperature (< 15°C): Flagged but no exclusion rule

**Seasonal Mode Constraints:**
- Seasonal mode: Excludes fruits, plantation crops
- Extreme drought: Excludes fruits, plantation crops (long-cycle)

### A.3 Score Boost Rules

**Rainfall Boosts:**
- High rainfall: +0.12 (cereals), +0.10 (potato/sweetpotato/tapioca), +0.05 (pulses), -0.05 (fiber)
- Moderate rain: +0.06 (cereals/pulses), +0.05 (oilseeds)
- Low rainfall: +0.10 (jowar/ragi), +0.08 (pulses), +0.07 (oilseeds), -0.05 (vegetables)

**Season Intent:**
- Seasonal mode: +0.05 (cereals/pulses/oilseeds), -0.03 (vegetables)

**Staple Bias:**
- +0.05 for rice, wheat

### A.4 Market Score Calculation

**Components:**
1. **Price Normalization (35% weight):**
   - Average price across all states for crop
   - Normalized to 0-1 range (min-max scaling)

2. **Stability (30% weight):**
   - Variance of prices over last 365 days
   - Normalized by max variance across states
   - Stability = 1 - normalized_variance

3. **Trend (25% weight):**
   - Recent 30 days vs previous 150 days
   - Capped at ±20% change
   - Normalized to 0-1 range

4. **Confidence (10% weight):**
   - Hardcoded to 0.9

**Final Score:** `100 * (0.35 * price_norm + 0.30 * stability + 0.25 * trend_norm + 0.10 * confidence)`

### A.5 SHAP Computation Details

**Model Type:** XGBoost (multiclass classification, 53 classes)

**SHAP Explainer:** TreeExplainer (initialized at startup)

**Feature Order:** ["N", "P", "K", "pH", "rainfall", "temperature"]

**Output Handling:**
- Multiclass: SHAP returns list of arrays (one per class)
- Extracts SHAP values for predicted class
- Takes absolute values for feature importance ranking
- Top 2 positive, bottom 1 negative, rest neutral

**Preprocessing:**
- If pipeline has preprocessor, transforms input before SHAP
- Otherwise uses raw input

---

**END OF REPORT**
