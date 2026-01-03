# Vasudha: Multi-Agent AI for Sustainable Crop Optimization 🌱

**Vasudha** is a decision-support system designed to assist farmers and planners in India by providing **context-aware, agronomically valid crop recommendations**. The system combines a numeric-only machine learning model with rule-based agronomic reasoning to move from *crop feasibility* to *crop suitability*.

Rather than relying purely on ML predictions, Vasudha explicitly models **seasonal intent, environmental regimes, and agronomic constraints** to ensure realistic and explainable recommendations across diverse Indian regions.

---

## Project Status (January 2026)

- **Phase 1 & 2 (Research, Data Engineering, Modeling):** ✅ Completed  
- **Core ML Model:** XGBoost classifier trained on Indian crop data using numeric features only  
  *(N, P, K, pH, rainfall, temperature)*  
- **Current Focus:** Backend orchestrator logic, agronomic validation, and ranking  
- **Frontend & Market Agent:** Planned  

---

## Project Goal

The goal of Vasudha is to support informed agricultural decision-making by answering:

> **“What crops are suitable to grow here, under current conditions and farmer intent?”**

To achieve this, Vasudha combines:
- **Machine Learning** for feasibility estimation  
- **Agronomic constraints** for validity  
- **Context-aware ranking** for preference  

This layered approach avoids shortcut learning, improves generalization, and keeps the system transparent and defensible.

---

## Key Features (Current)

- **Numeric-Only ML Model**
  - Avoids shortcut learning using location or crop categories
  - Generalizes across districts and unseen regions

- **Multi-Agent Backend Architecture**
  - Weather Agent (historical rainfall & temperature aggregation)
  - Soil Agent (district-level soil chemistry)
  - Recommendation Agent (ML inference)
  - Orchestrator (decision logic & ranking)

- **Agronomic Constraint Engine**
  - Regime-based reasoning (drought, low rainfall, high rainfall, soil stress)
  - Explicit season semantics (kharif / rabi / zaid)
  - Product-level filtering (seasonal vs plantation crops)

- **Seasonal vs All-Season Modes**
  - `seasonal`: short-cycle, sowable crops only
  - `all_season`: allows long-cycle and plantation crops where agronomically valid

- **Score-Based Crop Ranking**
  - Soft preference boosts based on rainfall regime, crop family, and seasonal intent
  - Ensures staples and field crops are not overshadowed by short-cycle vegetables

- **Robust Error Handling**
  - Explicit handling of missing or incomplete weather data
  - No silent fallbacks or misleading recommendations

---

## Orchestrator Logic (v2)

The orchestrator is the **core decision-making layer** of Vasudha.  
It converts raw ML predictions into actionable recommendations through:

1. **Agronomic Regime Derivation**
   - Converts raw environment values into interpretable regimes  
     *(e.g., low rainfall, high rainfall, acidic soil)*

2. **Hard Constraints (Validity)**
   - Removes crops that are agronomically invalid under current conditions

3. **Season Semantics**
   - Enforces correct seasonal behavior across all modes

4. **Soft Preference Scoring**
   - Re-ranks valid crops using small, explainable boosts
   - Reflects agronomic preference rather than statistical dominance

This separation ensures:
- District-agnostic behavior
- High explainability
- Stable behavior on unseen inputs

---

## Known Limitations

- The ML model may under-represent staple cereals (e.g., rice) in certain **high-rainfall numeric profiles** due to dataset bias.
- The orchestrator mitigates this using **soft score boosting**, but does **not force crops** that are absent from ML outputs.
- Market-based profitability ranking is **planned**, not yet implemented.
- Explainable AI (XAI) output is planned as a future layer.

These limitations are explicitly documented to preserve transparency and academic integrity.

---

## Market Agent (In Progress)

The Market Agent is designed as an **independent economic intelligence layer**, intentionally decoupled from agronomic scoring.

### Design Principles
- Does not consume agronomic or ML scores
- Acts as the sole market-based ranker
- Can be used independently or via orchestrator integration

### Data Source
- Daily Commodity Prices – India (Kaggle)  
  https://www.kaggle.com/datasets/khandelwalmanas/daily-commodity-prices-india  
- ~26 years of historical data
- Daily updates sourced from data.gov.in

### Market Agent Capabilities
- District & APMC-level price analytics
- State-level price forecasting
- 30-day and 60-day forecasting horizon
- Volatility-aware market scoring
- Crop ranking based purely on economic outlook

---

## Project Structure

```
vasudha-project/
│
├── backend/            # Contains all server-side code and models
│   ├── agents/         # Individual microservices for each agent (FastAPI)
│   │   ├── recommendation_agent/ # Core prediction engine
│   │   └── ...         # Weather, Soil, Market agents TBD
│   ├── orchestrator/   # Manages workflow between agents (Node.js/FastAPI)
│   ├── shared/         # Shared resources (ML models, utils)
│       └── models/     # Saved pipeline & encoder
│ 
│
├── frontend/           # React Native mobile application code
│
├── notebooks/          # Jupyter notebooks for data analysis and model training
│   └── VASUDHA_data_analysis.ipynb
│
├── data/
│   └── market/
│       ├── raw/
│       └── sqlite/
│           └── market.db  # Raw datasets used (optional, if not ignored by .gitignore)
│
├── docs/               # Project documentation, diagrams, reports
│
├── .gitignore          # Specifies intentionally untracked files
└── README.md           # This file
```

## Technology Stack

* **Backend Agents:** Python, FastAPI
* **Orchestrator:** Node.js, Express (or Python/FastAPI)
* **Machine Learning:** Scikit-learn, XGBoost, Pandas, NumPy, Joblib
* **Frontend:** React Native
* **Deployment:** Docker

## Getting Started

These instructions will guide you through setting up and running the backend services locally.

### Prerequisites

* Python 3.11+ installed (Recommended: Use the version matching the Colab notebook, e.g., 3.11.x)
* Git installed
* An IDE like VSCode

### Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/JitenPurswani/vasudha.git](https://github.com/JitenPurswani/vasudha.git)
    cd vasudha-project
    ```

2.  **Set up Backend Services (Example: Recommendation Agent):**
    Each agent runs in its own isolated environment. Navigate to the agent's directory:
    ```bash
    cd backend/agents/recommendation_agent/
    ```
    Create and activate a virtual environment using the **correct Python version**:
    ```bash
    # Example: C:\Path\To\Python311\python.exe -m venv venv
    # Or on Linux/macOS: python3.11 -m venv venv

    # Activate (macOS/Linux)
    source venv/bin/activate
    # OR Activate (Windows Command Prompt)
    # venv\Scripts\activate.bat
    # OR Activate (Windows PowerShell)
    # venv\Scripts\Activate.ps1
    ```
    Install the required dependencies within the active environment:
    ```bash
    pip install -r requirements.txt
    ```
    *(Repeat this virtual environment setup for each Python-based agent in the `backend/agents/` directory as you develop them.)*

3.  **Set up Orchestrator:** *(Instructions TBD)*

4.  **Set up Frontend:** *(Instructions TBD)*

### Running the Services

```bash
# Example for running the Recommendation Agent:
cd backend/agents/recommendation_agent/
source venv/bin/activate # Activate environment if not already active
uvicorn main:app --reload
```
Navigate to `http://127.0.0.1:8000/docs` in your browser to test the API.

## Market Agent – Local Setup & Initialization

### 1. Create Virtual Environment

Navigate to the Market Agent directory:
```bash
backend/agents/market_agent
```
Create and activate a virtual environment:
```bash
python -m venv venv
```
Windows PowerShell:
```bash
venv\Scripts\Activate.ps1
```
Linux / macOS:
```bash
source venv/bin/activate
```
---

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```
---

### 3. Initialize Market Database

Create required directories if not present:

data/market/sqlite

Run schema initialization:
```bash
sqlite3 ../../../data/market/sqlite/market.db ".read db/schema.sql"
```
Verify tables:
```bash
sqlite3 ../../../data/market/sqlite/market.db ".tables"
```
Expected tables:
- market_prices
- market_aggregates
- market_forecasts
- metadata

---

### 4. Database Sanity Check (Python)
```bash
python
```
```bash
from db.database import get_connection

conn = get_connection()
tables = conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table';"
).fetchall()

print([t["name"] for t in tables])
conn.close()
```
---
## Roadmap

*(Link to or embed the project roadmap image/details here)*

---
*Developed as a Major Project for Computer Engineering.*
