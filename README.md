# Vasudha: Multi-Agent AI for Sustainable Crop Optimization 🌿💰🌍

**Vasudha** is a mobile-based decision support system designed to empower small and marginal farmers in India by providing personalized, real-time, and explainable crop recommendations. It integrates agronomic, climatic, and economic data to help farmers maximize profitability and adopt sustainable practices.

## Project Goal

The primary goal of Vasudha is to bridge the information gap faced by farmers, transforming agricultural decision-making from reactive to proactive. By leveraging a multi-agent AI architecture, the system provides holistic recommendations that consider:
* **Agronomic Suitability:** Based on farm-specific soil data and climate patterns.
* **Economic Viability:** Based on real-time local market prices and trends.
* **Sustainability:** Incorporating environmental impact considerations.

## Key Features

* **Multi-Agent Architecture:** Specialized agents collaborate for weather, soil, market, recommendation, and explanation tasks.
* **Data-Driven Recommendations:** Utilizes machine learning (XGBoost) trained on extensive real-world Indian agricultural data.
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
│   ├── orchestrator/   # Manages workflow between agents (Node.js/FastAPI)
│   ├── shared/         # Shared resources (ML models, utils)
│   └── docker-compose.yml # For running the backend services
│
├── frontend/           # React Native mobile application code
│
├── notebooks/          # Jupyter notebooks for data analysis and model training
│   └── VASUDHA_data_analysis.ipynb
│
├── data/               # Raw datasets used (optional, if not ignored)
│
├── docs/               # Project documentation, diagrams, reports
│
├── .gitignore          # Specifies intentionally untracked files
└── README.md           # This file
```

## Technology Stack

* **Backend Agents:** Python, FastAPI
* **Orchestrator:** Node.js, Express (or Python/FastAPI)
* **Machine Learning:** Scikit-learn, XGBoost, Pandas, NumPy
* **Frontend:** React Native
* **Deployment:** Docker

## Getting Started

*(This section will be filled later with instructions on how to set up and run the project)*

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/JitenPurswani/vasudha.git](https://github.com/JitenPurswani/vasudha.git)
    cd vasudha-project
    ```
2.  **Set up backend:** *(Detailed instructions TBD)*
3.  **Set up frontend:** *(Detailed instructions TBD)*

## Roadmap

*(Link to or embed the project roadmap image/details here)*

## Contribution

*(Details on how others can contribute, if applicable)*

---
*Developed as a Major Project for Computer Engineering.*