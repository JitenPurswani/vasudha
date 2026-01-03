# Vasudha – Limitations & Future Work

This document outlines known limitations of the current Vasudha system and planned enhancements.

---

## 1. Known Limitations

### 1.1 ML Recall for Staple Crops

- In some high-rainfall numeric profiles, staple cereals (e.g., rice) may not appear in the ML model’s top-N outputs.
- This is due to dataset distribution and numeric feature overlap with vegetables and tubers.

**Design Decision:**  
Rice is **not force-injected** by the orchestrator to preserve ML integrity and generalization.

---

### 1.2 Absence of Market-Based Ranking

- Current recommendations are agronomy-focused.
- Market price, demand, and profitability are not yet incorporated.

---

### 1.3 Explainability Layer Not Yet Exposed

- While the system internally reasons via regimes and boosts, explanations are not yet surfaced to end users.

---

## 2. Future Work

### 2.1 Market Agent Integration
- Incorporate mandi-level price trends
- Rank agronomically valid crops by profitability

### 2.2 Explainable AI (XAI)
- Human-readable explanations:
  - “Recommended due to high rainfall”
  - “Avoided due to low nitrogen”
- Improves farmer trust and adoption

### 2.3 Scenario Simulation
- What-if analysis for rainfall, temperature, or soil changes

### 2.4 Frontend Application
- Mobile-first interface
- Multilingual and voice-enabled support

---

## 3. Long-Term Vision

Evolve Vasudha from a recommendation engine into a **planning assistant** capable of:
- Risk estimation
- Sustainability scoring
- Policy-aligned crop guidance

---

*This document ensures transparency and guides future development.*
