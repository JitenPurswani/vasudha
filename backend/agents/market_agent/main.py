from fastapi import FastAPI, HTTPException
from market_logic import evaluate_market_logic
from datetime import datetime, timedelta
import sqlite3
import logging

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Vasudha Market Agent",
    description="Economic intelligence based on historical mandi prices",
    version="1.0"
)
DB_PATH = "../../../data/market/sqlite/market.db"

@app.get("/market/evaluate")
def evaluate_market(crop: str, state: str):
    logger.info(f"[Market Evaluate] crop={crop}, state={state}")
    result = evaluate_market_logic(crop, state)

    if result is None:
        logger.warning(f"[Market Evaluate] No data found for crop={crop}, state={state}")
        raise HTTPException(status_code=404, detail="No market data found")

    logger.info(f"[Market Evaluate] Success: {result}")
    return result

@app.get("/market/debug")
def debug_info():
    """Debug endpoint to see available crops and states"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    cur.execute("SELECT DISTINCT commodity FROM state_daily_prices ORDER BY commodity")
    commodities = [row[0] for row in cur.fetchall()]
    
    cur.execute("SELECT DISTINCT state FROM state_daily_prices ORDER BY state")
    states = [row[0] for row in cur.fetchall()]
    
    cur.execute("SELECT COUNT(*) as total FROM state_daily_prices")
    total_records = cur.fetchone()[0]
    
    conn.close()
    
    return {
        "total_records": total_records,
        "commodities": commodities[:20],  # Limit to first 20
        "states": states,
        "instructions": "Use exact crop and state names from the lists above for queries"
    }



@app.get("/market/forecast")
def market_forecast(crop: str, state: str):
    logger.info(f"[Market Forecast] crop={crop}, state={state}")
    
    # Normalize inputs
    crop = crop.strip()
    state = state.strip()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Get last 60 days of data
    cur.execute("""
        SELECT arrival_date, avg_modal_price
        FROM state_daily_prices
        WHERE LOWER(state) = LOWER(?)
          AND LOWER(commodity) = LOWER(?)
        ORDER BY arrival_date DESC
        LIMIT 60
    """, (state, crop))

    rows = cur.fetchall()
    logger.info(f"[Market Forecast] Found {len(rows)} price rows for crop={crop}, state={state}")
    
    if len(rows) < 40:
        logger.warning(f"[Market Forecast] Insufficient data: only {len(rows)} rows")
        raise HTTPException(status_code=404, detail=f"Insufficient market history (found {len(rows)} rows, need 40+)")

    prices = sorted(rows, key=lambda r: r["arrival_date"])

    # Get the last 30 days of actual prices
    last_30 = prices[-30:]
    
    # CRITICAL: Use actual prices for trend calculation (NOT averages)
    price_d_minus_30 = last_30[0]["avg_modal_price"]  # Price at D-30
    price_d_minus_1 = last_30[-1]["avg_modal_price"]   # Price at D-1 (yesterday)
    last_date = datetime.strptime(last_30[-1]["arrival_date"], "%Y-%m-%d")
    
    # Compute daily delta from actual price movement over 29 days (D-30 to D-1)
    daily_delta = (price_d_minus_1 - price_d_minus_30) / 29
    
    # Apply damping to avoid aggressive growth (0.4 factor)
    effective_delta = daily_delta * 0.4
    
    # Calculate trend percent for display
    base_trend_pct = (price_d_minus_1 - price_d_minus_30) / price_d_minus_30 if price_d_minus_30 != 0 else 0

    conn.close()

    # Generate forecasts iteratively starting from last real price
    forecasts = {}
    for horizon in [30, 60, 90]:
        series = []
        current_price = price_d_minus_1  # Start from D-1 (last real price)
        
        for i in range(1, horizon + 1):
            # Iterative: each day builds on previous day
            current_price = current_price + effective_delta
            date = last_date + timedelta(days=i)
            series.append({
                "date": date.strftime("%Y-%m-%d"),
                "price": round(max(1, current_price), 2)  # Floor at 1 to avoid negatives
            })
        forecasts[f"forecast_{horizon}"] = series

    confidence = 0.8

    return {
        "crop": crop,
        "state": state,
        "trend_percent": round(base_trend_pct * 100, 2),
        "confidence": confidence,
        **forecasts
    }
