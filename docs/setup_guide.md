# Complete Setup Guide

## System Requirements

- **Python:** 3.11+
- **OS:** Windows 10+, macOS, or Linux
- **RAM:** 8 GB minimum (16 GB recommended for full market data)
- **Disk Space:** 20 GB minimum (market SQLite DB ~18 GB)
- **Network:** Internet access for weather APIs and package installation

## Quick Start (All Agents)

### Prerequisites

1. **Clone the repository:**
   ```bash
   git clone https://github.com/JitenPurswani/vasudha.git
   cd vasudha-project
   ```

2. **Ensure Python 3.11+ is installed:**
   ```bash
   python --version
   ```

### Setup All Agents (Automated)

Create a setup script that initializes all agents sequentially:

**Windows PowerShell (setup_all.ps1):**
```powershell
# Create and activate venv for each agent
$agents = @(
    "weather_agent",
    "soil_agent",
    "recommendation_agent",
    "market_agent",
    "sustainability_agent",
    "xai_agent",
    "climate-adaptation_agent"
)

$ports = @{
    "weather_agent" = "8001"
    "soil_agent" = "8002"
    "recommendation_agent" = "8003"
    "market_agent" = "8004"
    "xai_agent" = "8005"
    "sustainability_agent" = "8006"
    "climate-adaptation_agent" = "8007"
}

foreach ($agent in $agents) {
    Write-Host "Setting up $agent..." -ForegroundColor Cyan
    cd "backend/agents/$agent"
    
    if (-not (Test-Path "venv")) {
        python -m venv venv
    }
    
    venv\Scripts\Activate.ps1
    pip install -r requirements.txt -q
    cd ../../../
    
    Write-Host "$agent setup complete" -ForegroundColor Green
}
```

---

## Individual Agent Setup

### 1. Weather Agent (Port 8001)

```bash
cd backend/agents/weather_agent

# Create virtual environment
python -m venv venv

# Activate
# Windows:
venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure (optional)
# Add .env file if using custom weather API
# OPENWEATHERMAP_API_KEY=<your_key>

# Run
uvicorn main:app --reload --port 8001
```

**Test:**
```bash
curl -X GET "http://localhost:8001/get_combined_weather/?lat=27.1767&lon=78.0081&season=kharif"
```

---

### 2. Soil Agent (Port 8002)

```bash
cd backend/agents/soil_agent

# Create virtual environment
python -m venv venv

# Activate
source venv/bin/activate  # or venv\Scripts\Activate.ps1 on Windows

# Install dependencies
pip install -r requirements.txt

# The agent uses district_soil_database_ready.csv (pre-loaded)

# Run
uvicorn main:app --reload --port 8002
```

**Test:**
```bash
curl -X GET "http://localhost:8002/get_soil_data_by_district/?district=Agra&state=Uttar%20Pradesh"
```

---

### 3. Recommendation Agent (Port 8003)

```bash
cd backend/agents/recommendation_agent

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Model files should be in: backend/shared/models/
# Verify:
# - model.pkl (XGBoost model)
# - label_encoder.pkl (crop label encoder)
# - feature_names.json (feature schema)

# Run
uvicorn main:app --reload --port 8003
```

**Test:**
```bash
curl -X POST http://localhost:8003/predict_top_crops/?top_n=5 \
  -H "Content-Type: application/json" \
  -d '{"N": 65, "P": 45, "K": 58, "pH": 7.2, "rainfall": 850, "temperature": 25.5}'
```

---

### 4. Market Agent (Port 8004)

**⚠️ This agent requires significant data ingestion (~2–4 hours)**

#### Step 1: Download Dataset

Download from Kaggle:
```
https://www.kaggle.com/datasets/khandelwalmanas/daily-commodity-prices-india
```

Extract to: `data/market/raw/`

#### Step 2: Setup

```bash
cd backend/agents/market_agent

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Step 3: Initialize Database

```bash
# Create SQLite database
sqlite3 ../../../data/market/sqlite/market.db ".read db/schema.sql"

# Verify tables created
sqlite3 ../../../data/market/sqlite/market.db ".tables"
```

#### Step 4: Ingest Data (Long Running)

```bash
# Start ingestion (takes 2–4 hours)
python ingest/ingest_prices.py

# Safe to interrupt with Ctrl+C and resume
# Script uses INSERT OR IGNORE to avoid duplicates
```

#### Step 5: Create Indexes

```bash
sqlite3 ../../../data/market/sqlite/market.db << EOF
CREATE INDEX IF NOT EXISTS idx_state_commodity_date
ON market_prices(State, Commodity, Arrival_Date);

CREATE INDEX IF NOT EXISTS idx_state_district_market
ON market_prices(State, District, Market);

CREATE INDEX IF NOT EXISTS idx_arrival_date
ON market_prices(Arrival_Date);
EOF
```

#### Step 6: Verify Ingestion

```bash
python -c "
from db.database import get_connection
conn = get_connection()
count = conn.execute('SELECT COUNT(*) FROM market_prices;').fetchone()
print(f'Total records: {count[0]}')
conn.close()
"
```

Expected: ~71.7 million records

#### Step 7: Run Agent

```bash
uvicorn main:app --reload --port 8004
```

**Test:**
```bash
curl -X GET "http://localhost:8004/market/evaluate?crop=Rice&state=Maharashtra"
```

---

### 5. Sustainability Agent (Port 8006)

```bash
cd backend/agents/sustainability_agent

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# No external setup needed (uses crop_sustainability_data.json)

# Run
uvicorn main:app --reload --port 8006
```

**Test:**
```bash
curl -X GET "http://localhost:8006/sustainability/evaluate?crops=rice&crops=wheat&crops=cotton"
```

---

### 6. XAI Agent (Port 8005)

```bash
cd backend/agents/xai_agent

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# No external setup needed

# Run
uvicorn main:app --reload --port 8005
```

**Test:** (After Orchestrator is running)
```bash
# XAI Agent expects input from Orchestrator
# See integration guide for payload structure
```

---

### 7. Climate Adaptation Agent (Port 8007 - Optional)

```bash
cd backend/agents/climate-adaptation_agent

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Create .env file or set:
export OPENWEATHERMAP_API_KEY=<your_key>
export GROQ_API_KEY=<your_key>

# Run
uvicorn main:app --reload --port 8007
```

**Test:**
```bash
curl -X POST http://localhost:8007/climate_risk/assess \
  -H "Content-Type: application/json" \
  -d '{"crop": "rice", "district": "Agra", "state": "Uttar Pradesh", "season": "kharif"}'
```

---

## 8. Orchestrator Setup (Port 8000)

```bash
cd backend/orchestrator

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Ensure all agents are running on expected ports
# (See integration guide for port mapping)

# Run
uvicorn main:app --reload --port 8000
```

**Test (Full Pipeline):**
```bash
curl -X POST http://localhost:8000/get_full_recommendation/ \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 27.1767,
    "lon": 78.0081,
    "season": "kharif",
    "mode": "seasonal"
  }'
```

---

## Running All Services (Recommended Setup)

### Option 1: Separate Terminals (Manual)

Open 8 terminals and run each command:

```bash
# Terminal 1
cd backend/agents/weather_agent && source venv/bin/activate && uvicorn main:app --port 8001

# Terminal 2
cd backend/agents/soil_agent && source venv/bin/activate && uvicorn main:app --port 8002

# Terminal 3
cd backend/agents/recommendation_agent && source venv/bin/activate && uvicorn main:app --port 8003

# Terminal 4
cd backend/agents/market_agent && source venv/bin/activate && uvicorn main:app --port 8004

# Terminal 5
cd backend/agents/xai_agent && source venv/bin/activate && uvicorn main:app --port 8005

# Terminal 6
cd backend/agents/sustainability_agent && source venv/bin/activate && uvicorn main:app --port 8006

# Terminal 7 (Optional)
cd backend/agents/climate-adaptation_agent && source venv/bin/activate && uvicorn main:app --port 8007

# Terminal 8
cd backend/orchestrator && source venv/bin/activate && uvicorn main:app --port 8000
```

### Option 2: Docker Compose (Recommended for Production)

```yaml
# docker-compose.yml
version: '3.8'

services:
  weather_agent:
    build: ./backend/agents/weather_agent
    ports:
      - "8001:8000"
    environment:
      - OPENWEATHERMAP_API_KEY=${OPENWEATHERMAP_API_KEY}

  soil_agent:
    build: ./backend/agents/soil_agent
    ports:
      - "8002:8000"

  recommendation_agent:
    build: ./backend/agents/recommendation_agent
    ports:
      - "8003:8000"

  market_agent:
    build: ./backend/agents/market_agent
    ports:
      - "8004:8000"
    volumes:
      - ./data:/app/data

  xai_agent:
    build: ./backend/agents/xai_agent
    ports:
      - "8005:8000"

  sustainability_agent:
    build: ./backend/agents/sustainability_agent
    ports:
      - "8006:8000"

  climate_adaptation_agent:
    build: ./backend/agents/climate-adaptation_agent
    ports:
      - "8007:8000"
    environment:
      - OPENWEATHERMAP_API_KEY=${OPENWEATHERMAP_API_KEY}
      - GROQ_API_KEY=${GROQ_API_KEY}

  orchestrator:
    build: ./backend/orchestrator
    ports:
      - "8000:8000"
    depends_on:
      - weather_agent
      - soil_agent
      - recommendation_agent
      - market_agent
      - xai_agent
      - sustainability_agent
    environment:
      - WEATHER_AGENT_URL=http://weather_agent:8000
      - SOIL_AGENT_URL=http://soil_agent:8000
      - RECOMMENDATION_AGENT_URL=http://recommendation_agent:8000
      - MARKET_AGENT_URL=http://market_agent:8000
      - XAI_AGENT_URL=http://xai_agent:8000
      - SUSTAINABILITY_AGENT_URL=http://sustainability_agent:8000
      - CLIMATE_ADAPTATION_AGENT_URL=http://climate_adaptation_agent:8000
```

Run:
```bash
docker-compose up -d
```

---

## Health Checks

Verify all agents are running:

```bash
# Weather Agent
curl http://localhost:8001/ | jq

# Soil Agent
curl http://localhost:8002/ | jq

# Recommendation Agent
curl http://localhost:8003/ | jq

# Market Agent
curl http://localhost:8004/ | jq

# XAI Agent
curl http://localhost:8005/ | jq

# Sustainability Agent
curl http://localhost:8006/ | jq

# Climate Adaptation Agent
curl http://localhost:8007/ | jq

# Orchestrator
curl http://localhost:8000/ | jq
```

All should return status messages.

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 8001 (example)
lsof -i :8001  # macOS/Linux
netstat -ano | findstr :8001  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /F /PID <PID>  # Windows
```

### SHAP Initialization Errors

If seeing `TreeExplainer` initialization errors:
1. Verify model is XGBoost (not sklearn Pipeline)
2. Check XGBoost version matches training environment
3. Ensure numpy/scipy versions are compatible

### Market Database Ingestion Stalled

```bash
# Resume ingestion
python ingest/ingest_prices.py

# Check current record count
sqlite3 ../../../data/market/sqlite/market.db "SELECT COUNT(*) FROM market_prices;"

# View errors
tail -f ingestion.log  # If logging is configured
```

### Orchestrator Timeouts

Increase httpx timeout in orchestrator/main.py:
```python
async with httpx.AsyncClient(timeout=30.0) as client:  # Increase from 15.0
```

---

## Next Steps

1. **Review Integration Guide:** [docs/integration_guide.md](integration_guide.md)
2. **Test Full Pipeline:** Use curl examples in API Reference
3. **Deploy to Cloud:** Use Docker Compose for container orchestration
4. **Add Authentication:** Implement API key validation
5. **Setup Monitoring:** Add logging and performance tracking

---

*Last updated: January 2026*
