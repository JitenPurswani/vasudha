# System Integration Guide

## Overview

Vasudha is a **distributed multi-agent system** where each agent operates independently but coordinates through the Orchestrator. This guide explains how agents interact, what assumptions they make, and how to extend the system.

## Agent Interaction Flow

```
┌─────────────┐
│ Orchestrator│ (Port 8000)
│  (Main API) │
└──────┬──────┘
       │
       ├──→ Weather Agent (8001) ────┐
       │                             │
       ├──→ Soil Agent (8002) ──────┤ Sequential
       │                             ├──→ Fetch environmental data
       │                             │
       ├──→ Recommendation Agent ───┤ (with error recovery)
       │     (8003)                 │
       │    ├─ Load ML Model        │
       │    ├─ Get probabilities    │
       │    └─ Compute SHAP         │
       │                             │
       ├──→ Market Agent (8004) ────┤ Parallel
       │                             │
       ├──→ XAI Agent (8005) ───────┤ (post-processing)
       │                             │
       ├──→ Sustainability (8006) ──┤
       │                             │
       └──→ Climate Adaptation ─────┘
            (8007 - Optional)
```

## Data Flow Architecture

### Phase 1: Environmental Data Collection

```
Input: lat, lon, season
  ↓
Weather Agent
  • Reverse geocode to district
  • Fetch seasonal rainfall
  • Get temperature
  ↓
Returns: district, state, rainfall, temperature

Soil Agent
  • Query district-level soil data
  ↓
Returns: N, P, K, pH
```

**Error Handling:**
- If weather agent fails: Return error (no fallback)
- If soil agent fails: Return error (can't proceed without soil data)

### Phase 2: ML Inference

```
Input: N, P, K, pH, rainfall, temperature
  ↓
Recommendation Agent
  • Load XGBoost model
  • Predict top 10 crops
  • Compute SHAP for each
  ↓
Returns: crops, probabilities, SHAP summaries
```

**Error Handling:**
- If model not loaded: Return 500 error
- If SHAP fails: Return predictions without SHAP
- If top_n invalid: Return 400 error

### Phase 3: Agronomic Filtering & Ranking

```
Input: ML predictions, environmental data, season, mode
  ↓
Orchestrator (Agronomic Engine)
  • Derive climate regimes
  • Apply hard constraints (remove invalid crops)
  • Apply season filters
  • Compute soft preference boosts
  • Sort by final score
  ↓
Returns: Top 5 valid crops with rankings
```

**Error Handling:**
- If no crops pass constraints: Return empty list (don't force recommendations)

### Phase 4: Market Integration (Optional)

```
Input: Top 5 crops, state
  ↓
Market Agent
  • Query each crop in database
  • Compute market score (0–100)
  ↓
Returns: market scores or null

Orchestrator
  • Combine: 0.55 * market + 0.45 * agronomic
  • If market unavailable: 0.85 * agronomic (mild penalty)
```

**Error Handling:**
- If market agent timeout: Continue without market scores
- If commodity not in database: Skip that crop in market query

### Phase 5: Advisory Layers (Optional)

```
Parallel Requests to:

Sustainability Agent
  • Evaluate top 5 crops
  • Return sustainability scores + explanations
  • No impact on ranking

Climate Adaptation Agent
  • (Optional) Assess climate risks
  • Return risk advisory

Both return: Status 200 or timeout gracefully
```

**Error Handling:**
- If sustainability times out: Continue without sustainability data
- If climate agent times out: Continue without climate advisory

### Phase 6: Explanations (Post-Processing)

```
Input: All computed outputs
  ↓
XAI Agent
  • Extract SHAP summaries from recommendations
  • Generate feature-level explanations
  • Attach market explanations
  • Attach sustainability explanations
  • Generate per-crop summaries
  ↓
Returns: Full explanations for top crops
```

**Error Handling:**
- If XAI agent timeout: Return recommendations without explanations
- If explanation generation fails: Return minimal explanations

## Agent Dependencies & Assumptions

### Orchestrator

**Depends on:**
- All agents responding within 15s timeout
- Weather/Soil agents for environmental data
- Recommendation agent for ML predictions

**Assumes:**
- Coordinates are valid (lat/lon)
- Season is one of: kharif, rabi, zaid
- Top 10 ML predictions are diverse

**Output Contract:**
- Always returns location metadata
- Top 5 crops minimum (or empty if no valid crops)
- SHAP summaries included when available

### Recommendation Agent

**Depends on:**
- XGBoost model file at shared path
- Label encoder for 53 crops
- Feature schema JSON

**Assumes:**
- Input features are numeric and in range
- Model is compatible with scikit-learn version
- SHAP library is installed

**Output Contract:**
- Always returns top_n crops with probabilities
- SHAP summaries in categorical format
- Probabilities sum to 1.0

### Market Agent

**Depends on:**
- SQLite database with ingested price data
- Commodity mapping in Orchestrator

**Assumes:**
- Database indexed on (state, commodity, date)
- Price data covers past 30/150 days
- Commodity names are consistent

**Output Contract:**
- market_score 0–100 or null
- Includes confidence level
- Includes trend metadata

### Sustainability Agent

**Depends on:**
- crop_sustainability_data.json mapping

**Assumes:**
- All 53 crops have entries in JSON
- Categories are consistent across crops
- Weights sum to 1.0

**Output Contract:**
- sustainability_score 0–1
- Dimension breakdown included
- Explanation text provided
- Disclaimer always included

### XAI Agent

**Depends on:**
- SHAP summaries from Recommendation Agent
- Market/Sustainability outputs (optional)
- Rule mappings in shap_rules.py

**Assumes:**
- SHAP features match predefined set (N, P, K, pH, rainfall, temperature)
- Market/Sustainability scores are valid
- Explanations are deterministic

**Output Contract:**
- Per-crop explanations with model/market/sustainability sections
- Summary text combining all dimensions
- No modifications to input scores

### Climate Adaptation Agent

**Depends on:**
- Weather API (OpenWeatherMap)
- Seasonal rainfall database
- Crop climate profiles JSON

**Assumes:**
- Crop name is valid (one of 53 crops)
- Weather API responds within timeout
- Rainfall database is up-to-date

**Output Contract:**
- List of detected risks
- Severity levels (Low/Medium/High)
- Preventive actions (text only, no prescriptions)

## Extension Points

### Adding a New Agent

1. **Register in Orchestrator:**
   ```python
   NEW_AGENT_URL = os.getenv("NEW_AGENT_URL", "http://localhost:8008")
   ```

2. **Add call in orchestrator main flow:**
   ```python
   new_resp = await client.get(f"{NEW_AGENT_URL}/endpoint/")
   if new_resp.status_code == 200:
       new_data = new_resp.json()
   ```

3. **Add error handling:**
   ```python
   except Exception as e:
       print(f"❌ New agent error: {e}")
       new_data = None
   ```

4. **Include in response:**
   ```python
   return {
       ...
       "new_data": new_data
   }
   ```

### Adding a New Explanation Dimension

1. **Create rule set in XAI Agent:**
   ```python
   # new_rules.py
   def explain_new_dimension(value):
       if value > 0.75:
           return "..."
       else:
           return "..."
   ```

2. **Update XAI endpoint:**
   ```python
   new_explanation = explain_new_dimension(payload.new_field)
   return {
       ...
       "new_explanation": new_explanation
   }
   ```

3. **Update Orchestrator payload:**
   ```python
   xai_payload = {
       ...
       "new_data": new_data
   }
   ```

### Adding a New Constraint

1. **Add regime derivation (Orchestrator):**
   ```python
   flags = {
       ...
       "new_condition": value > threshold
   }
   ```

2. **Add constraint logic:**
   ```python
   if flags["new_condition"] and some_crop_property:
       continue  # Skip crop
   ```

3. **Document in Orchestrator design doc**

## Testing Integration

### Unit Testing Individual Agents

```bash
# Recommendation Agent
curl -X POST http://localhost:8003/predict_top_crops/ \
  -H "Content-Type: application/json" \
  -d '{"N": 65, "P": 45, "K": 58, "pH": 7.2, "rainfall": 850, "temperature": 25.5}'

# Sustainability Agent
curl -X GET "http://localhost:8006/sustainability/evaluate?crops=rice&crops=wheat"

# Market Agent
curl -X GET "http://localhost:8004/market/evaluate?crop=rice&state=Maharashtra"
```

### Integration Testing (Full Pipeline)

```bash
# Full orchestrator test
curl -X POST http://localhost:8000/get_full_recommendation/ \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 27.1767,
    "lon": 78.0081,
    "season": "kharif",
    "mode": "seasonal"
  }'
```

### Error Testing

**Missing Weather Data:**
```bash
curl -X POST http://localhost:8000/get_full_recommendation/ \
  -d '{"lat": 99, "lon": 99, "season": "kharif"}' # Invalid coordinates
```

**Market Data Not Available:**
```bash
# Request a crop with minimal market coverage
# Orchestrator should continue without market scores
```

**Timeout Handling:**
```bash
# Stop Sustainability Agent
# Call orchestrator → should return recommendations without sustainability
```

## Configuration & Environment Variables

Each agent has optional environment configuration:

```bash
# Weather Agent
OPENWEATHERMAP_API_KEY=<key>

# Climate Adaptation Agent
OPENWEATHERMAP_API_KEY=<key>
GROQ_API_KEY=<key>

# Market Agent (paths optional if using defaults)
MARKET_DB_PATH=data/market/sqlite/market.db

# Orchestrator (ports)
WEATHER_AGENT_URL=http://localhost:8001
SOIL_AGENT_URL=http://localhost:8002
RECOMMENDATION_AGENT_URL=http://localhost:8003
MARKET_AGENT_URL=http://localhost:8004
XAI_AGENT_URL=http://localhost:8005
SUSTAINABILITY_AGENT_URL=http://localhost:8006
CLIMATE_ADAPTATION_AGENT_URL=http://localhost:8007
```

## Performance & Scaling

### Latency by Agent

| Agent | Latency | Bottleneck |
|-------|---------|-----------|
| Weather | ~200ms | Geocoding API |
| Soil | ~50ms | DB lookup |
| Recommendation | ~250ms | SHAP computation |
| Market | ~100ms | DB query |
| Sustainability | ~50ms | JSON lookup |
| XAI | ~100ms | Rule mapping |
| **Total (sequential)** | **~750ms** | Recommendation + Weather |
| **Total (optimized)** | **~350ms** | Parallel market/sustainability |

### Scaling Considerations

- **Vertical:** Increase worker processes (uvicorn workers)
- **Horizontal:** Deploy multiple instances with load balancer
- **Caching:** Cache weather/soil data by district
- **Async:** Already using async/await for concurrency

---

*Last updated: January 2026*
