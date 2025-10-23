# Vasudha: Multi-Agent AI for Sustainable Crop Optimization 🌿💰🌍

**Vasudha** is a mobile-based decision support system designed to empower small and marginal farmers in India by providing personalized, real-time, and explainable crop recommendations. It integrates agronomic, climatic, and economic data to help farmers maximize profitability and adopt sustainable practices.

## Project Status (October 2025)

* **Phase 1 & 2 (Research, Design, Data Engineering, Modeling):** ✅ Completed.
* **Core Model:** XGBoost Classifier trained on a custom dataset, achieving **94.28%** accuracy.
* **Current Focus:** Backend development of individual agent microservices.

## Project Goal

The primary goal of Vasudha is to bridge the information gap faced by farmers, transforming agricultural decision-making from reactive to proactive. By leveraging a multi-agent AI architecture, the system provides holistic recommendations that consider:
* **Agronomic Suitability:** Based on farm-specific soil data and climate patterns.
* **Economic Viability:** Based on real-time local market prices and trends.
* **Sustainability:** Incorporating environmental impact considerations.

## Key Features

* **Multi-Agent Architecture:** Specialized agents collaborate for weather, soil, market, recommendation, and explanation tasks.
* **Data-Driven Recommendations:** Utilizes an XGBoost model trained on extensive real-world Indian agricultural data.
* **Profitability Focus:** Integrates market analysis to rank agronomically suitable crops by economic potential.
* **Scenario Simulator:** Allows farmers to perform "what-if" analysis for risk assessment.
* **Explainable AI (XAI):** Provides clear, data-driven justifications for recommendations in simple language.
* **Accessibility:** Features a multilingual, voice-enabled interface via a mobile app.

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
│   │   └── models/     # Saved pipeline & encoder
│   └── docker-compose.yml # For running the backend services
│
├── frontend/           # React Native mobile application code
│
├── notebooks/          # Jupyter notebooks for data analysis and model training
│   └── VASUDHA_data_analysis.ipynb
│
├── data/               # Raw datasets used (optional, if not ignored by .gitignore)
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

## Roadmap

*(Link to or embed the project roadmap image/details here)*

---
*Developed as a Major Project for Computer Engineering.*