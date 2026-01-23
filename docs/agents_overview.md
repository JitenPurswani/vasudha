# Agents Overview & Directory

## System Agents

Vasudha consists of **7 independent microservices** (agents) that work together through the Orchestrator to provide comprehensive crop recommendations.

---

## 1️⃣ Weather Agent (Port 8001)

**Purpose:** Aggregate historical weather data for a location

**Inputs:**
- Latitude, Longitude (geocoordinates)
- Season (kharif | rabi | zaid)

**Outputs:**
- District name
- State name
- Average seasonal rainfall (mm)
- Average temperature (°C)

**Data Source:**
- District-level historical rainfall database
- OpenWeatherMap API (future enhancement)

**Dependencies:**
- None (data pre-loaded)

**Key Files:**
- `main.py` - FastAPI endpoint
- `create_db.py` - Database initialization script
- `district_seasonal_rainfall.csv` - Historical rainfall data

**Setup Time:** <1 minute  
**External Setup:** None required

---

## 2️⃣ Soil Agent (Port 8002)

**Purpose:** Retrieve district-level soil chemistry data

**Inputs:**
- District name
- State name

**Outputs:**
- N (Nitrogen) content
- P (Phosphorus) content
- K (Potassium) content
- pH value

**Data Source:**
- Pre-processed district soil database
- Based on agricultural surveys

**Dependencies:**
- None (data pre-loaded)

**Key Files:**
- `main.py` - FastAPI endpoint
- `district_soil_database_ready.csv` - Soil data

**Setup Time:** <1 minute  
**External Setup:** None required

---

## 3️⃣ Recommendation Agent (Port 8003)

**Purpose:** Generate ML-based crop predictions with feature importance

**Inputs:**
- N, P, K, pH, rainfall, temperature (numeric features only)
- top_n (number of crops to return)

**Outputs:**
- Top N crops with probabilities
- SHAP feature importance (categorized as positive/negative/neutral)

**ML Model:**
- XGBoost Classifier (53 crops)
- Trained on Indian agricultural data
- Numeric-only features (avoids shortcut learning)

**Dependencies:**
- XGBoost model (pre-trained)
- Label encoder (53 crops)
- SHAP library

**Key Files:**
- `main.py` - FastAPI + SHAP computation
- `model_loader.py` - Model loading & validation
- Shared model artifacts in `backend/shared/models/`

**Setup Time:** ~2 minutes  
**External Setup:** None required (models provided)

**Special Features:**
- ✅ Multiclass SHAP handling
- ✅ Feature categorization (not raw SHAP values)
- ✅ Comprehensive error logging

---

## 4️⃣ Market Agent (Port 8004)

**Purpose:** Evaluate economic viability of crops using historical price data

**Inputs:**
- Crop name (from canonical mapping)
- State name

**Outputs:**
- Market score (0–100)
- Price trend analysis
- Volatility measure
- Confidence level

**Data Source:**
- Daily Commodity Prices – India (Kaggle dataset)
- ~71.7 million records (2001–2026)
- ~18 GB SQLite database

**Dependencies:**
- SQLite database with ingested market data
- Commodity mapping in Orchestrator

**Key Files:**
- `main.py` - FastAPI endpoint
- `market_logic.py` - Scoring algorithm
- `db/database.py` - DB connection
- `ingest/ingest_prices.py` - Data ingestion script

**Setup Time:** 
- Quick: ~5 minutes (without data)
- Full: 2–4 hours (with data ingestion)

**External Setup:** 
- Download dataset from Kaggle (~7 GB)
- Run data ingestion script

**Special Features:**
- ✅ Deterministic scoring (no ML)
- ✅ Large-scale data handling
- ✅ Query optimization with indexes

---

## 5️⃣ Sustainability Agent (Port 8006)

**Purpose:** Evaluate environmental sustainability of recommended crops

**Inputs:**
- List of crop names

**Outputs:**
- Sustainability score (0–1)
- Dimension breakdown (water, soil, cultivation)
- Human-readable explanations
- Explicit disclaimer

**Evaluation Dimensions:**
- Water Intensity (50% weight)
- Soil Impact (30% weight)
- Cultivation Intensity (20% weight)

**Dependencies:**
- None (data is JSON file)

**Key Files:**
- `main.py` - FastAPI endpoint
- `sustainability_engine.py` - Scoring algorithm
- `crop_sustainability_data.json` - Crop metadata

**Setup Time:** <1 minute  
**External Setup:** None required

**Special Features:**
- ✅ Deterministic scoring (no ML)
- ✅ Policy-adjustable weights
- ✅ Advisory-only (never blocks crops)

---

## 6️⃣ XAI Agent (Port 8005)

**Purpose:** Generate human-understandable explanations for recommendations

**Inputs:**
- Location metadata (district, state)
- Crop recommendations with SHAP summaries
- Market scores (optional)
- Sustainability data (optional)

**Outputs:**
- Per-crop explanations across 3 dimensions:
  - Model explanation (feature-level SHAP)
  - Market explanation (economic context)
  - Sustainability explanation (environmental context)
- Summary narrative combining all dimensions

**Dependencies:**
- SHAP summaries from Recommendation Agent
- Optional outputs from Market & Sustainability agents

**Key Files:**
- `main.py` - FastAPI endpoint
- `reasoning_engine.py` - Main explanation logic
- `shap_rules.py` - SHAP-to-text mapping
- `market_rules.py` - Market score interpretation
- `sustainability_rules.py` - Sustainability interpretation
- `schemas.py` - Pydantic models

**Setup Time:** <1 minute  
**External Setup:** None required

**Special Features:**
- ✅ Rule-based (deterministic, no hallucinations)
- ✅ Model-agnostic (doesn't call ML)
- ✅ Translation-friendly output
- ✅ Feature-level explanation granularity

---

## 7️⃣ Climate Adaptation Agent (Port 8007)

**Purpose:** Detect post-planting climate risks and provide preventive guidance

**Inputs:**
- Crop name
- District, State
- Season (kharif | rabi | zaid)

**Outputs:**
- List of detected climate risks
- Severity levels (Low/Medium/High)
- Preventive agronomic actions
- Risk summary narrative

**Risk Types:**
- Heat Stress
- Cold Stress
- Frost Risk
- Dry Spell Risk
- Waterlogging / Excess Rainfall
- High Humidity (warning-level)

**Dependencies:**
- OpenWeatherMap API (live weather & forecast)
- Seasonal rainfall database (historical context)
- Crop climate profiles (JSON)

**Key Files:**
- `main.py` - FastAPI endpoint
- `climate_risk_engine.py` - Risk detection logic
- `climate_adaptation_pipeline.py` - Pipeline orchestration
- `preventive_action_mapper.py` - Action recommendations
- `weather_service.py` - Weather API integration
- `rainfall_service.py` - Seasonal rainfall lookup
- `crop_climate_profiles.json` - Crop tolerances

**Setup Time:** ~5 minutes  
**External Setup:** 
- OpenWeatherMap API key required
- Groq API key (for LLM-based explanations)

**Special Features:**
- ✅ Seasonal context awareness
- ✅ Rule-based risk detection (no ML)
- ✅ Crop-specific tolerances
- ✅ LLM used for explanation only (not decision-making)

---

## 8️⃣ Orchestrator (Port 8000)

**Purpose:** Central coordinator that manages all agent interactions

**Inputs:**
- Location (latitude, longitude)
- Season (kharif | rabi | zaid)
- Mode (seasonal | all_season)

**Outputs:**
- Ranked crop recommendations (top 5)
- Economic context (market scores)
- Environmental context (sustainability)
- Explanations (feature-level XAI)

**Decision Pipeline:**
1. Fetch environmental data (Weather + Soil agents)
2. Get ML predictions (Recommendation agent)
3. Apply agronomic constraints & ranking (in-process)
4. Get market scores (Market agent)
5. Get sustainability scores (Sustainability agent)
6. Generate explanations (XAI agent)
7. Aggregate and return full recommendation

**Dependencies:**
- All 7 agents must be running
- Agents respond within 15s timeout (configurable)

**Key Files:**
- `main.py` - FastAPI + orchestration logic
- Hardcoded:
  - Agronomic constraints
  - Scoring boosts
  - Crop metadata (53 crops)
  - Market commodity mapping

**Setup Time:** <1 minute  
**External Setup:** None (depends on other agents)

**Special Features:**
- ✅ Graceful degradation (continues if optional agents fail)
- ✅ Agronomic regime-based reasoning
- ✅ Explicit constraint documentation
- ✅ Soft scoring (no hard overrides)

---

## Agent Communication

### Call Graph

```
Orchestrator (8000)
├── Weather Agent (8001) [HTTP GET]
├── Soil Agent (8002) [HTTP GET]
├── Recommendation Agent (8003) [HTTP POST]
├── Market Agent (8004) [HTTP GET]
├── Sustainability Agent (8006) [HTTP GET]
├── XAI Agent (8005) [HTTP POST]
└── Climate Adaptation Agent (8007) [HTTP POST] - Optional
```

### Timing

- **Sequential (required):** Weather + Soil → Recommendation (~450ms)
- **Parallel (optional):** Market + Sustainability (~100ms)
- **Post-processing:** XAI (~100ms)
- **Total:** ~650ms

---

## Dependency Tree

```
Orchestrator (8000)
├── Required (Hard Dependencies)
│   ├── Weather Agent (8001)
│   │   └── Historical rainfall DB
│   ├── Soil Agent (8002)
│   │   └── Soil chemistry DB
│   └── Recommendation Agent (8003)
│       ├── XGBoost model
│       └── SHAP library
│
├── Optional (Graceful Degradation)
│   ├── Market Agent (8004)
│   │   ├── SQLite database (71.7M records)
│   │   └── Commodity price data
│   ├── Sustainability Agent (8006)
│   │   └── Crop metadata JSON
│   ├── XAI Agent (8005)
│   │   └── Rule mappings
│   └── Climate Adaptation Agent (8007)
│       ├── OpenWeatherMap API
│       ├── Groq API (optional)
│       └── Seasonal rainfall DB
```

---

## Quick Reference

| Agent | Port | Setup Time | Data | Status |
|-------|------|-----------|------|--------|
| Weather | 8001 | <1m | Pre-loaded | ✅ |
| Soil | 8002 | <1m | Pre-loaded | ✅ |
| Recommendation | 8003 | ~2m | Pre-loaded | ✅ |
| Market | 8004 | 2–4h | Kaggle DL | ✅ |
| Sustainability | 8006 | <1m | JSON | ✅ |
| XAI | 8005 | <1m | Rules | ✅ |
| Climate Adaptation | 8007 | ~5m | APIs | ✅ |
| Orchestrator | 8000 | <1m | Config | ✅ |

---

## For More Details

- **Setup Instructions:** [Setup Guide](../setup_guide.md)
- **Integration Details:** [Integration Guide](../integration_guide.md)
- **API Specifications:** [API Reference](../api_reference.md)
- **Design Documents:** See [Architecture](/) folder

---

*Last updated: January 2026*
