# XAI Agent Design Document

## Overview

The XAI (Explainable AI) Agent converts raw system outputs into **human-understandable explanations** without changing any decisions. It is a pure interpretation layer, never a decision layer.

## Core Principle

**"Explain after deciding, not while deciding."**

The XAI Agent never:
- Computes scores
- Ranks crops
- Makes recommendations
- Calls ML models directly
- Modifies any outputs

## Architecture

```
Orchestrator Output
     ↓
Input Validation (Pydantic schemas)
     ↓
Three Explanation Branches:
  1. SHAP → Model Explanation
  2. Market Score → Market Explanation
  3. Sustainability Data → Sustainability Explanation
     ↓
Per-Crop Explanation Objects
     ↓
Aggregated Response
```

## Input Structure

The XAI Agent receives a fully computed recommendation:

```json
{
  "location": {
    "district": "Agra",
    "state": "Uttar Pradesh"
  },
  "recommendations": [
    {
      "crop": "wheat",
      "final_score": 0.82,
      "agronomic_score": 0.75,
      "market_score": 0.88,
      "raw_probability": 0.65,
      "shap_summary": {
        "top_positive_features": ["phosphorus", "pH"],
        "top_negative_features": ["rainfall"],
        "neutral_features": ["nitrogen", "potassium", "temperature"]
      }
    }
  ],
  "sustainability": [
    {
      "crop": "wheat",
      "sustainability_score": 0.68,
      "explanation": {...}
    }
  ]
}
```

## Explanation Dimensions

### 1. Model Explanation (SHAP-based)

**Purpose:** Explain why the ML model favored/disfavored the crop

**Process:**
- Extract SHAP summary from recommendation
- Map each feature category to explanation rules
- Generate feature-level explanations

**Output:**
```json
{
  "model_explanation": [
    {
      "feature": "phosphorus",
      "effect": "positive",
      "reason": "Phosphorus supports strong root development and early plant vigor."
    },
    {
      "feature": "rainfall",
      "effect": "negative",
      "reason": "Excess or insufficient rainfall reduces suitability for this crop."
    }
  ]
}
```

**Feature → Effect Mapping:**

| Feature | Positive Effect | Negative Effect | Neutral Effect |
|---------|----------|----------|----------|
| **nitrogen** | "Adequate nitrogen levels support healthy vegetative growth." | "Low nitrogen availability limits plant growth." | "Nitrogen levels are not a major influencing factor." |
| **phosphorus** | "Phosphorus supports strong root development and early plant vigor." | "Insufficient phosphorus may restrict root growth." | "Phosphorus levels are within tolerable range." |
| **potassium** | "Potassium improves stress tolerance and overall resilience." | "Low potassium can reduce disease resistance." | "Potassium has limited effect on this recommendation." |
| **pH** | "Soil pH is well suited for nutrient uptake." | "Soil pH may restrict nutrient availability." | "Soil pH does not strongly influence this crop." |
| **rainfall** | "Rainfall levels align well with water requirements." | "Excess or insufficient rainfall reduces suitability." | "Rainfall does not significantly affect this recommendation." |
| **temperature** | "Temperature conditions are favorable for growth cycle." | "Temperature stress may negatively impact performance." | "Temperature plays a minor role for this crop." |

### 2. Market Explanation (Optional)

**Purpose:** Explain economic attractiveness

**Process:**
- Check if market_score exists
- Generate deterministic explanation based on score ranges

**Output Examples:**
- **score > 0.75:** "This crop shows strong market stability and favorable pricing trends."
- **score 0.5–0.75:** "This crop has moderate market viability with some price volatility."
- **score < 0.5:** "Market data for this crop in this state is limited or prices are lower."

**Rule:** XAI explains market_score already computed — it doesn't recompute market logic.

### 3. Sustainability Explanation (Optional)

**Purpose:** Explain environmental impact

**Process:**
- Check if sustainability data exists
- Extract explanation text directly from Sustainability Agent
- Derive context from sustainability_score ranges

**Output Example:**
> "This crop has moderate sustainability due to balanced water usage and neutral soil impact."

## Output Structure

**Per-Crop Explanation:**
```json
{
  "crop": "wheat",
  "model_explanation": [...],
  "market_explanation": "This crop shows strong market stability...",
  "sustainability_explanation": "This crop has moderate sustainability...",
  "summary": "Economically viable, environmentally acceptable, supported by soil and climate conditions."
}
```

**Full Response:**
```json
{
  "agent": "xai_agent",
  "scope": "crop_level",
  "explanations": [...]
}
```

## Summary Generation

The summary combines all three dimensions into a single narrative:

**Components (if available):**
- "Economically viable" ← if market explanation exists
- "Environmentally acceptable" ← if sustainability explanation exists
- "Supported by soil and climate conditions" ← if SHAP explanations exist

**Example:**
> "Economically viable, environmentally acceptable, supported by soil and climate conditions."

## Rule-Based Design

**Why rule-based, not generative?**
- ✅ Deterministic (same input → same output)
- ✅ Auditable (all rules explicit)
- ✅ Safe for policy use
- ✅ Language-independent
- ✅ No hallucinations

**Alternative NOT used:** Generative LLMs
- ❌ Non-deterministic
- ❌ Black-box reasoning
- ❌ Unpredictable outputs
- ❌ Potential hallucinations

## API Endpoint

### POST `/xai/explain`

**Request:** (from Orchestrator)
```json
{
  "location": {...},
  "recommendations": [...],
  "sustainability": [...]
}
```

**Response:**
```json
{
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
```

## Frontend Integration

**Backend Responsibilities:**
- Return canonical English explanations
- Provide structured, template-friendly outputs
- Ensure JSON schema consistency

**Frontend Responsibilities:**
- Language translation (i18n)
- UI presentation
- Localization-specific formatting

**Example Frontend Extension:**
```python
# English (canonical)
"Potassium improves stress tolerance and overall crop resilience."

# Frontend translates to Hindi
"पोटेशियम तनाव सहनशीलता में सुधार करता है..."

# Frontend applies custom formatting
Bold("Potassium") + " improves " + Emphasis("stress tolerance") + "..."
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid payload | Return 400 with validation error |
| Missing recommendations | Return 400 |
| Missing SHAP summary | Generate explanations without model details |
| Missing market/sustainability | Generate explanations with available data |
| Pydantic parsing fails | Return 400 with field info |

## Testing Strategy

- Test all feature combinations (positive/negative/neutral)
- Test with/without market data
- Test with/without sustainability data
- Validate explanation consistency
- Check summary aggregation logic

## Performance

- **Per-crop explanation generation:** <10ms
- **Total latency (5 crops):** <100ms
- **Memory:** <50MB (no ML models loaded)

## Design Strengths

| Aspect | Strength |
|--------|----------|
| **Modularity** | Completely independent from decision logic |
| **Scalability** | No new agents needed for new explanation types |
| **Testability** | Pure functions, no side effects |
| **Safety** | No model dependencies, no hallucinations |
| **Transparency** | All rules explicit and auditable |

---

*Last updated: January 2026*
