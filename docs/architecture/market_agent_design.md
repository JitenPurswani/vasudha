# Vasudha – Market Agent Design & Decision Documentation

**Module:** Market Agent  
**Project:** Vasudha – Multi-Agent AI for Sustainable Crop Optimization  
**Status:** Design Finalized (Ready for Implementation)

---

## 1. Introduction

After stabilizing the **Recommendation Agent**, which focuses exclusively on agronomic feasibility, the next critical requirement in Vasudha was the introduction of a **Market Agent**.

The Market Agent is responsible for answering a fundamentally different question:

> **“Among agronomically valid crops, which ones make economic sense to grow right now?”**

This document records the complete design process, key decisions, rejected alternatives, and the final architecture of the Market Agent.

---

## 2. Motivation for a Separate Market Agent

Early discussions identified a major architectural risk common in agri-tech systems:  
**mixing agronomic suitability with market dynamics into a single scoring system**.

This approach was intentionally avoided.

### Key reasons for separation:
- Agronomic scores may be transformed, boosted, or even become negative
- Market logic should remain **purely economic**
- Independent agents improve explainability, modularity, and long-term extensibility

### Final decision:
- The Market Agent **does not consume agronomic scores**
- It receives only:
  - crop names
  - location context
  - time horizon

---

## 3. Core Design Principles

The Market Agent design is governed by the following principles:

1. **Strict Separation of Concerns**  
   - No agronomic logic or scoring inside the Market Agent

2. **Market as the Sole Ranker**  
   - All ranking is based only on market signals

3. **Daily-Updated, Not Hypothetical Real-Time**  
   - Agricultural markets update daily
   - Daily refresh is realistic, stable, and defensible

4. **Forecasting as a First-Class Capability**  
   - Forecasting is mandatory from day one
   - No deferred “version 2” for core functionality

---

## 4. Data Source Evaluation

Two approaches were evaluated for market price data ingestion.

### Option A: Kaggle Dataset (Selected)

**Dataset:** Daily Commodity Prices – India  
**Link:**  
https://www.kaggle.com/datasets/khandelwalmanas/daily-commodity-prices-india

**Properties:**
- Daily updated using official **data.gov.in** sources
- ~26 years of historical data
- Uniform schema across all years
- Clean and structured for analytics and modeling

**Decision:**  
✅ Selected as the primary and authoritative data source.

---

### Option B: Direct data.gov.in API (Deferred)

- Authentication and rate-limit complexity
- Higher operational overhead
- Not required for initial system objectives

**Decision:** Deferred for potential future enhancement.

---

## 5. Dataset Schema (Unmodified)

The Market Agent relies on the following fixed schema:

| Column | Description |
|------|------------|
| State | Indian state of the market |
| District | District of the market |
| Market | APMC / mandi name |
| Commodity | Crop name |
| Variety | Crop variety |
| Grade | Quality grade |
| Arrival_Date | Date (YYYY-MM-DD) |
| Min_Price | Minimum price (INR/quintal) |
| Max_Price | Maximum price (INR/quintal) |
| Modal_Price | Most frequent price (INR/quintal) |
| Commodity_Code | Unique identifier |

This schema is preserved to maintain data integrity and traceability.

---

## 6. Data Update Strategy (Local & Deployable)

The Market Agent uses a **daily ingestion pipeline** that operates identically in:

- local development
- hosted environments
- scheduled workflows (cron / n8n)

### Daily update process:
1. Detect new daily records
2. Append only unseen dates
3. Update analytical aggregates
4. Retrain forecasting models (scheduled)

This ensures the system remains **fresh, reproducible, and future-proof**.

---

## 7. Granularity Decisions (Critical)

### 7.1 District-Level Analytics

District and APMC-level granularity is used for:
- market comparison
- best mandi selection
- localized price visibility

This directly supports farmer-facing use cases.

---

### 7.2 State-Level Forecasting

Forecasting is performed at **Commodity + State** level.

**Rationale:**
- District-level time series are often sparse
- State-level aggregation produces stable seasonal signals
- Prevents misleading or unstable forecasts

District-level insights are derived through analytics, not forecasting.

---

## 8. Forecasting Design

### 8.1 Model Selection

**Chosen Model:** Prophet

**Reasons:**
- Handles long-term seasonality
- Robust to missing dates
- Minimal tuning requirements
- Interpretable trend components
- Suitable for agricultural price series

---

### 8.2 Forecasting Horizon
