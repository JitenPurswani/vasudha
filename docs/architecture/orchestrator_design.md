# Orchestrator Design Document

## Overview

The Orchestrator is the **central decision-making layer** of Vasudha. It converts raw ML predictions into actionable, agronomically valid crop recommendations through a multi-stage decision pipeline.

## Architecture

```
Input (Location + Season)
     ↓
Weather Agent → Get climate & rainfall data
     ↓
Soil Agent → Get district soil chemistry
     ↓
Recommendation Agent → Get ML predictions + SHAP
     ↓
Agronomic Engine (Orchestrator):
  1. Derive climate regimes
  2. Apply hard constraints
  3. Apply season filters
  4. Compute soft preference scores
     ↓
Market Agent → Get economic scores (optional)
     ↓
Sustainability Agent → Get environmental scores (advisory)
     ↓
XAI Agent → Generate explanations
     ↓
Output (Ranked recommendations with context)
```

## Decision Pipeline

### Stage 1: Data Collection

**Inputs:**
- `lat`, `lon`: Geographic coordinates
- `season`: kharif | rabi | zaid
- `mode`: seasonal | all_season

**Outputs:**
- Weather data (rainfall, temperature)
- Soil data (N, P, K, pH)
- Top 10 ML predictions with SHAP

### Stage 2: Agronomic Regime Derivation

Raw environmental values are converted to interpretable regimes:

```python
regimes = {
    "extreme_drought": rainfall < 120,
    "low_rainfall": 120 ≤ rainfall < 400,
    "moderate_rain": 400 ≤ rainfall < 900,
    "high_rainfall": rainfall ≥ 900,
    
    "acidic_soil": pH < 6.0,
    "alkaline_soil": pH > 7.5,
    "low_nitrogen": N < 40,
    
    "high_temperature": temp > 32,
    "low_temperature": temp < 15,
}
```

### Stage 3: Hard Constraints (Validity)

Crops that violate agronomic constraints are **removed**:

| Constraint | Logic |
|-----------|-------|
| **Extreme drought** | Exclude high-water crops |
| **Low rainfall** | Exclude high/medium-water vegetables |
| **High rainfall** | Exclude low-water crops |
| **Acidic soil** | Exclude wheat, barley |
| **Alkaline soil** | Exclude potato, banana |
| **Low nitrogen** | Exclude high-nutrient crops |
| **High temperature** | Exclude cold-season crops |
| **Seasonal mode** | Exclude fruits & plantation crops |
| **Extreme drought** | Exclude long-cycle crops |

### Stage 4: Soft Preference Scoring

Valid crops are re-ranked using explainable boosts:

```
agronomic_score = base_probability + preference_boost
```

**Boost Logic:**

- **High rainfall → cereals/pulses:** +0.12 to +0.06
- **Low rainfall → millets/pulses:** +0.10 to +0.08
- **Seasonal mode → field crops:** +0.05
- **Staple bias → rice/wheat:** +0.05

### Stage 5: Market Integration (Optional)

```
final_score = 0.55 × market_score + 0.45 × agronomic_score
```

If market data unavailable:
```
final_score = 0.85 × agronomic_score  (mild penalty)
```

### Stage 6: Ranking & Output

Top 5 crops are sorted and returned with:
- Final score
- Agronomic score
- Market score
- Raw ML probability
- SHAP summary

## Design Principles

### 1. **District-Agnostic**
Decisions depend only on environmental variables, not hardcoded location data.

### 2. **Regime-Based Reasoning**
Regimes are interpretable and auditable.

### 3. **Explicit Constraints**
No silent filtering — all constraints are documented.

### 4. **Soft Boosts, Not Overrides**
Preferences are small (+0.05 to +0.12) and explainable, not forceful.

### 5. **Multi-Modal Output**
- Recommendation scores
- Market context (if available)
- Sustainability advisory (if available)
- XAI explanations

## Seasonal Semantics

### Kharif (Monsoon Season)
- Occurs: Jun–Oct
- Mode: `seasonal` → short-cycle crops only
- Regime: High rainfall expected

### Rabi (Post-Monsoon/Winter)
- Occurs: Oct–Mar
- Mode: `seasonal` → short-cycle crops only
- Regime: Low rainfall, moderate temperature

### Zaid (Summer)
- Occurs: Mar–Jun
- Mode: `seasonal` → short-cycle crops only
- Regime: High temperature, low rainfall

### All-Season Mode
- All modes combined
- Allows fruits & plantation crops where agronomically valid
- Used for strategic planning

## API Endpoint

### POST `/get_full_recommendation/`

**Request:**
```json
{
  "lat": 27.1767,
  "lon": 78.0081,
  "season": "kharif",
  "mode": "seasonal"
}
```

**Response:**
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
        "shap_summary": {...}
      }
    ]
  },
  "sustainability": {...},
  "xai_data": {...}
}
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Missing weather data | Return error with descriptive message |
| Missing soil data | Return error with descriptive message |
| No crops pass constraints | Return empty recommendations (not misleading fallback) |
| Market agent timeout | Continue with agronomic score (mild penalty) |
| Sustainability agent timeout | Continue without sustainability context |
| XAI agent timeout | Continue without explanations |

## Testing Strategy

- Test across diverse geographic regions (coastal, rainfed, irrigated)
- Test across all three seasons
- Validate constraint logic (no false positives, no silent failures)
- Validate ranking stability (same input → same output)

---

*Last updated: January 2026*
