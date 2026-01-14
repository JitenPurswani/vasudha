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

## Climate Adaptation Agent 🌦️🌱

The Climate Adaptation Agent is a rule-based decision-support module within Vasudha that focuses on post-planting climate risk detection and preventive advisory.

While the Recommendation Agent answers *what crops are suitable to grow*, the Climate Adaptation Agent answers:

> **"Given a crop already planted and current climatic conditions, is the crop under climate stress, and what preventive actions should be taken?"**

This agent is **advisory in nature** and does not prescribe pesticides, fertilizers, or yield estimates.

### Design Motivation

In real agricultural settings, crop failure often occurs after planting due to climate stress rather than incorrect crop selection alone. The Climate Adaptation Agent was introduced to:

- **Detect short-term and seasonal climate risks**  
- **Provide actionable, preventive guidance**  
- **Complement crop recommendation and market intelligence layers**  

### Key Design Principles

- **Rule-Based Decision Logic**  
  No machine learning is used for risk detection. All decisions are deterministic and explainable.

- **Seasonal Context Awareness**  
  Dry spell and waterlogging detection rely on seasonal rainfall context to avoid misleading conclusions from short-term weather data alone.

- **False-Positive Avoidance**  
  Crop-specific tolerances (e.g., rice and waterlogging) are respected to prevent unnecessary alerts.

- **Separation of Concerns**  
  Weather ingestion, rainfall context, risk logic, and advisory are modular and independently testable.

- **LLM for Explanation Only**  
  Groq (LLaMA 3.3 70B) is used strictly for natural-language explanation; LLMs do not influence decisions.

### Supported Climate Risks

The agent detects the following climate risks, each with severity (Low / Medium / High), trigger conditions, and preventive agronomic actions where applicable:

- **Heat Stress**  
- **Cold Stress**  
- **Frost Risk**  
- **Dry Spell Risk**  
- **Waterlogging / Excess Rainfall Risk**  
- **High Humidity Risk** (warning-level only)  

### Crop Climate Knowledge Base

The agent uses a structured, agronomically validated crop climate knowledge base defining:

- Temperature tolerance ranges  
- Heat and cold stress thresholds  
- Seasonal rainfall requirements  
- Waterlogging tolerance  
- Humidity and frost sensitivity  

This knowledge base is static and shared across all evaluations.

### Data Sources

- **Live Weather & Forecast**  
  OpenWeatherMap API (current conditions and short-term forecast)

- **Seasonal Rainfall Context**  
  District-level historical rainfall database (read-only). Seasonal rainfall represents historical seasonal averages and is required to detect prolonged dry spells or excess moisture conditions that cannot be inferred from short-term weather data alone.

### Validation & Testing

The agent was tested across multiple synthetic and real-world scenarios:

- Heat stress under high forecast temperatures  
- Dry spell detection under low seasonal rainfall  
- Flood-tolerant crop behavior under extreme rainfall  
- Normal climatic conditions producing no false alerts  

Final validation confirmed correct behavior where no climate stress was detected for rice grown in Mumbai during the kharif season under moderate temperatures and high rainfall.

### Agent-Level Structure

The Climate Adaptation Agent is implemented as an independent FastAPI service.

```
backend/agents/climate-adaptation_agent/
│
├── main.py
├── climate_risk_engine.py
├── climate_adaptation_pipeline.py
├── preventive_action_mapper.py
├── weather_service.py
├── rainfall_service.py
├── crop_climate_profiles.json
├── climate_preventive_actions.json
├── requirements.txt
├── data/
│   └── district_rainfall_db.sqlite (read-only, not committed)
```

### Local Setup (Climate Adaptation Agent)

1. **Navigate to the agent directory:**
   ```bash
   cd backend/agents/climate-adaptation_agent
   ```

2. **Create and activate a virtual environment:**
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

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   OPENWEATHERMAP_API_KEY=<your_key>
   GROQ_API_KEY=<your_key>
   ```

5. **Run the agent:**
   ```bash
   uvicorn main:app --reload
   ```

### Current Status

- **Climate Adaptation Agent:** ✅ Completed and locked  
- **Integrated with live weather APIs and seasonal rainfall database**  
- **Fully explainable, transparent, and demo-ready**
---

## Project Structure

```
vasudha-project/
│
├── backend/                        # Contains all server-side code and models
│   ├── agents/                     # Individual microservices for each agent (FastAPI)
│   │   ├── climate-adaptation_agent/      # Climate risk detection & preventive advisory
│   │   │   ├── main.py
│   │   │   ├── climate_risk_engine.py
│   │   │   ├── climate_adaptation_pipeline.py
│   │   │   ├── preventive_action_mapper.py
│   │   │   ├── weather_service.py
│   │   │   ├── rainfall_service.py
│   │   │   ├── crop_climate_profiles.json
│   │   │   ├── climate_preventive_actions.json
│   │   │   └── requirements.txt
│   │   ├── recommendation_agent/   # Core ML prediction engine
│   │   │   ├── main.py
│   │   │   ├── model_loader.py
│   │   │   └── requirements.txt
│   │   ├── weather_agent/          # Historical rainfall & temperature aggregation
│   │   │   ├── main.py
│   │   │   ├── create_db.py
│   │   │   ├── district_seasonal_rainfall.csv
│   │   │   └── requirements.txt
│   │   ├── soil_agent/             # District-level soil chemistry data
│   │   │   ├── main.py
│   │   │   ├── create_db.py
│   │   │   ├── district_soil_database_ready.csv
│   │   │   └── requirements.txt
│   │   ├── market_agent/           # Economic intelligence & price forecasting
│   │   │   ├── main.py
│   │   │   ├── requirements.txt
│   │   │   ├── db/
│   │   │   │   ├── database.py
│   │   │   │   └── schema.sql
│   │   │   └── ingest/
│   │   │       └── ingest_prices.py
│   │   └── xai_agent/              # Explainable AI output layer
│   ├── orchestrator/               # Manages workflow & decision logic between agents
│   │   ├── main.py
│   │   └── requirements.txt
│   ├── api_gateway/                # API gateway (planned)
│   └── shared/                     # Shared resources (ML models, utilities)
│       ├── models/
│       │   └── feature_names.json
│       └── utils/
│
├── frontend/                       # React Native mobile application code (planned)
│
├── notebooks/                      # Jupyter notebooks for data analysis and model training
│   ├── VASUDHA_data_analysis.ipynb
│   └── Crop_production.csv
│
├── data/
│   └── market/                     # Market agent data storage
│       ├── metadata.json
│       ├── raw/                    # Historical commodity price CSV files (2001-2026)
│       └── sqlite/
│           └── market.db           # SQLite database for ingested market data
│
├── docs/                           # Project documentation and reports
│   ├── architecture/               # Architecture & design documents
│   ├── evaluation/                 # Test case analysis & validation reports
│   ├── progress_report/            # Development progress tracking
│   └── README.md
│
├── .gitignore                      # Specifies intentionally untracked files
└── README.md                       # This file
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

### Market Agent – Data Ingestion (Kaggle Commodity Prices)

The Market Agent ingests historical and daily-updated Indian commodity price data sourced from Kaggle:

https://www.kaggle.com/datasets/khandelwalmanas/daily-commodity-prices-india

The dataset spans ~26 years and contains daily mandi-level prices published via data.gov.in.

#### Ingestion Design
- Chunk-based CSV ingestion to handle large files (~7GB total)
- Idempotent inserts using UNIQUE constraints
- Safe to interrupt and re-run
- Supports partial and incremental ingestion

#### Directory Layout
- Raw CSV files:  
  data/market/raw/  
  (e.g., 2001.csv, 2002.csv, …)

- SQLite database:  
  data/market/sqlite/market.db

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

#### Ingestion Steps

1. Place all yearly CSV files into:
```bash
   data/market/raw/
```

2. Activate the Market Agent virtual environment:
```bash   
   cd backend/agents/market_agent  
```
```bash
   venv\Scripts\Activate.ps1   (Windows)  
```  
```bash
   source venv/bin/activate   (Linux/macOS)
```
3. Run the ingestion script:
```bash   
   python ingest/ingest_prices.py
```
4. The script will:
   - Read CSVs in chunks
   - Insert new rows
   - Skip duplicates automatically
   - Print progress per chunk and per file

#### Verification (Optional)

Open SQLite CLI:
```bash
sqlite3 ../../../data/market/sqlite/market.db
```
Run:
```bash
SELECT COUNT(*) FROM market_prices;
```

This confirms successful ingestion.

## NOTE:- This Ingestion process takes upto 2-4 hours to complete so have "patience"!!

## Roadmap

*(Link to or embed the project roadmap image/details here)*

---
*Developed as a Major Project for Computer Engineering.*
