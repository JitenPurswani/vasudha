# Vasudha – Orchestrator Refinement Progress Report  
**Timeline:** January 2–3, 2026  
**Module:** Backend Orchestrator (Post-ML Decision Logic)  
**Project:** Vasudha – Multi-Agent AI for Sustainable Crop Optimization  

---

## 1. Context and Objective

Vasudha uses a **numeric-only machine learning model (XGBoost)** to predict crop feasibility based on soil and weather parameters (N, P, K, pH, rainfall, temperature). To avoid shortcut learning and improve generalization, categorical features such as season and crop type are intentionally excluded from the ML model.

The **orchestrator** is responsible for converting raw ML outputs into **agronomically valid and context-aware recommendations**.

### Objective of this refinement cycle:
- Fix incorrect crop recommendations observed during testing
- Ensure agronomic correctness across districts (not example-specific fixes)
- Stabilize seasonal behavior (kharif / rabi / zaid)
- Improve ranking quality without over-constraining the system
- Transparently document known limitations

---

## 2. Initial Issues Identified (January 2)

### 2.1 Incorrect Season Handling

**Observed Issue:**
- Rabi-only crops (e.g., wheat) appeared in kharif recommendations under `all_season` mode.

**Root Cause:**
- `all_season` was incorrectly interpreted as “ignore season”.

**Fix Implemented:**
- Redefined semantics:
  - `seasonal`: crops explicitly grown in the given season
  - `all_season`: crops that can grow in the *current* season, including long-cycle crops
- Enforced season checks in both modes.

**Result:**
- Seasonal leakage (e.g., wheat in kharif) fully eliminated.

---

### 2.2 Plantation and Fruit Crops Appearing in Seasonal Mode

**Observed Issue:**
- Plantation/fruit crops such as arecanut and papaya appeared in `seasonal` mode.

**Root Cause:**
- Lack of product-level distinction between short-cycle and long-cycle crops.

**Fix Implemented:**
- In `seasonal` mode, plantation and fruit crops are excluded via hard constraints.

**Result:**
- Seasonal recommendations now reflect realistic sowing behavior.

---

### 2.3 Semi-Arid Region Misclassification

**Observed Issue:**
- Medium-water vegetables (e.g., cucumber) appeared in semi-arid regions such as Jodhpur and Hisar.

**Root Cause:**
- Constraint logic only blocked `high` water crops under low rainfall.
- Semi-arid regimes were not explicitly modeled.

**Fix Implemented:**
- Introduced **regime-based flags** (extreme drought, low rainfall, high rainfall).
- Suppressed medium-water vegetables in low-rainfall regimes during seasonal mode.

**Result:**
- Semi-arid outputs shifted correctly toward pulses, millets, and oilseeds.

---

## 3. Shift to Regime-Based Agronomic Logic

A key architectural decision was made to **avoid district-specific or example-based fixes**.

### Design Change:
- Raw environmental values are mapped to **agronomic regimes**.
- All constraints and preferences operate on regimes, not districts.

### Benefits:
- District-agnostic behavior
- Better generalization to unseen regions
- Clear explainability

---

## 4. Issue Identified: Over-Dominance of Vegetables (January 3)

### 4.1 Symptom

In multiple regions (Indore, Coimbatore, Assam):
- Vegetables dominated top recommendations
- Staples and field crops were under-ranked or absent

### 4.2 Root Cause

This was **not a constraint failure**.

The ML model correctly identified vegetables as highly feasible because:
- They tolerate wide environmental ranges
- They are short-cycle crops
- They are well-represented in historical data

However:
- ML answers *feasibility*
- Farmers require *suitability*

---

## 5. Solution: Introducing a Score-Based Ranking Layer

### 5.1 Rationale

Adding more hard constraints would:
- Over-filter valid crops
- Reduce flexibility
- Introduce brittle logic

Instead, a **soft preference (score boosting) layer** was introduced.

---

### 5.2 Design

Final score computation:

> **“final_score = raw_ml_probability + contextual_boost”**


Boosts are:
- Small (±0.03 to ±0.15)
- Regime-based
- Non-destructive (no forced inclusion)

---

### 5.3 Boost Dimensions

- **Rainfall Regime**
  - High rainfall → cereals and tubers preferred
  - Low rainfall → millets and pulses preferred
- **Seasonal Intent**
  - Field crops preferred in `seasonal` mode
- **Staple Bias**
  - Mild preference for rice and wheat when agronomically valid

---

## 6. Test Case Evaluation Summary

| Test ID | Location | Season | Mode | Verdict | Key Notes |
|------|---------|--------|------|--------|-----------|
| TC-1 | Mumbai | Kharif | Seasonal | PASS | Correct seasonal vegetables |
| TC-2 | Mumbai | Kharif | All-season | PASS | Arecanut allowed, wheat excluded |
| TC-3 | Jodhpur | Kharif | Seasonal | PASS | Semi-arid fix effective |
| TC-4 | Hisar | Kharif | Seasonal | PASS | Pulses prioritized under low N |
| TC-5 | Indore | Kharif | Seasonal | PARTIAL | Vegetables initially dominant |
| TC-6 | Indore | Rabi | Seasonal | PASS | Wheat correctly dominant |
| TC-7 | Assam | Kharif | Seasonal | PARTIAL | Rice absent (ML recall limitation) |
| TC-8 | Assam | Kharif | All-season | PASS | Arecanut dominant, valid |
| TC-9 | West Bengal | Kharif | Seasonal | PASS | Explicit rainfall error returned |

---

## 7. Accepted Limitation

**Observed:**
- Rice may not appear in some high-rainfall kharif scenarios.

**Reason:**
- Rice is absent from ML model’s top-N predictions for certain numeric profiles.
- Score boosting cannot surface crops not emitted by ML.

**Decision:**
- This behavior is accepted as a **model limitation**, not an orchestrator bug.
- Forcing rice was intentionally avoided to preserve model integrity.

---

## 8. Error Handling Improvements

- Explicit handling of missing rainfall data
- Clear error messages with recommended actions
- No silent fallbacks or misleading outputs

---

## 9. Current System Status (End of Jan 3)

### Completed
- Season semantics finalized
- Regime-based constraints validated
- Score-based ranking integrated
- Error handling stabilized

### Pending
- Explainable AI (XAI)
- Market-based ranking
- Frontend integration

---

## 10. Conclusion

Over this refinement cycle, the Vasudha orchestrator evolved from a constraint-only filter into a **full decision-support engine**. The system now cleanly separates feasibility (ML), validity (constraints), and preference (ranking), resulting in stable, explainable, and agronomically sound recommendations.

Remaining gaps are explicitly documented as model-level limitations rather than hidden through ad-hoc logic.

---

*Documented as part of the Vasudha Major Project (Computer Engineering).*
