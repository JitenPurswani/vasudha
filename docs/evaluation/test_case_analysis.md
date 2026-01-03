# Vasudha – Test Case Analysis & Validation Report

**Module:** Backend Orchestrator  
**Purpose:** Validate agronomic correctness, seasonal semantics, and system robustness  
**Scope:** Multi-region testing across India  

---

## 1. Objective

This document presents a structured evaluation of Vasudha’s orchestrator logic using **realistic geographic, seasonal, and climatic scenarios**.  
The goal is to verify that:

- Crop recommendations are agronomically valid
- Seasonal behavior is enforced correctly
- Failures are explicit and explainable
- Incorrect outputs are classified as bugs vs known limitations

---

## 2. Evaluation Methodology

Each test case includes:
- Latitude & Longitude
- Season (kharif / rabi / zaid)
- Mode (seasonal / all_season)
- Derived weather & soil context
- Top-N crop recommendations

Each case is labeled as:
- **PASS** – Behavior matches agronomic expectation
- **PARTIAL** – Output is acceptable but suboptimal
- **FAIL** – Agronomically incorrect behavior

---

## 3. Test Case Summary Table

| ID | Location | Season | Mode | Key Conditions | Top Output(s) | Verdict | Notes |
|----|----------|--------|------|---------------|---------------|---------|-------|
| TC-1 | Mumbai, MH | Kharif | Seasonal | Very high rainfall | Cucumber, Sweetpotato | PASS | Seasonal vegetables valid |
| TC-2 | Mumbai, MH | Kharif | All-season | Same as above | Arecanut, Cucumber | PASS | Plantation allowed correctly |
| TC-3 | Jodhpur, RJ | Kharif | Seasonal | Semi-arid | Ragi, Pulses | PASS | Semi-arid fix effective |
| TC-4 | Hisar, HR | Kharif | Seasonal | Low N, low rainfall | Moong, Sesamum | PASS | Low-input crops prioritized |
| TC-5 | Coimbatore, TN | Kharif | Seasonal | High rainfall | Vegetables dominant | PARTIAL | Field crops under-ranked |
| TC-6 | Coimbatore, TN | Kharif | All-season | Same | Arecanut, Vegetables | PASS | Plantation dominance valid |
| TC-7 | Indore, MP | Kharif | Seasonal | Moderate-high rainfall | Vegetables | PARTIAL | Resolved after score boosting |
| TC-8 | Indore, MP | Rabi | Seasonal | Low rainfall, cool | Wheat | PASS | Canonical rabi behavior |
| TC-9 | Indore, MP | Zaid | Seasonal | Very low rainfall | Cucumber, Gourds | PASS | Short-cycle crops valid |
| TC-10 | Assam | Kharif | Seasonal | High rainfall, acidic soil | Tubers, Vegetables | PARTIAL | Rice missing (ML limitation) |
| TC-11 | Assam | Kharif | All-season | Same | Arecanut | PASS | Long-cycle crop valid |
| TC-12 | Raichur, KA | Kharif | Seasonal | Borderline semi-arid | Vegetables | PARTIAL | Threshold tuning acceptable |
| TC-13 | Raichur, KA | Rabi | Seasonal | Low rainfall | Wheat | PASS | Correct cereal selection |
| TC-14 | W. Bengal | Kharif | Seasonal | Rainfall missing | ERROR | PASS | Explicit failure returned |

---

## 4. Failure & Partial Case Analysis

### 4.1 Rice Missing in High-Rainfall Assam

- **Observed:** Rice absent from top-N in kharif seasonal mode
- **Cause:** Rice not emitted by ML model for certain numeric profiles
- **Classification:** Model recall limitation
- **Decision:** Accepted and documented; not force-injected

---

### 4.2 Vegetable Dominance in Moderate Rainfall Zones

- **Observed:** Vegetables ranked above field crops
- **Cause:** ML feasibility bias
- **Resolution:** Score-based ranking layer introduced
- **Status:** Resolved

---

## 5. Conclusion

The orchestrator demonstrates **consistent, explainable behavior across diverse regions**.  
Remaining partial cases are clearly attributed to **model-level limitations**, not logic defects.

---

*Note: This document serves as evidence of systematic testing and validation.*
