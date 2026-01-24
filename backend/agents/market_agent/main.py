from fastapi import FastAPI, HTTPException
from market_logic import evaluate_market_logic
from datetime import datetime, timedelta
import sqlite3

app = FastAPI(
    title="Vasudha Market Agent",
    description="Economic intelligence based on historical mandi prices",
    version="1.0"
)
DB_PATH = "../../../data/market/sqlite/market.db"

@app.get("/market/evaluate")
def evaluate_market(crop: str, state: str):
    result = evaluate_market_logic(crop, state)

    if result is None:
        raise HTTPException(status_code=404, detail="No market data found")

    return result

DECAY_FACTORS = {
    30: 1.0,
    60: 0.6,
    90: 0.35
}

@app.get("/market/forecast")
def market_forecast(crop: str, state: str):

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # -------------------------------
    # 1. Get last 60 days prices
    # -------------------------------
    cur.execute("""
        SELECT Arrival_Date, avg_modal_price
        FROM state_daily_prices
        WHERE State = ?
          AND Commodity = ?
        ORDER BY Arrival_Date DESC
        LIMIT 60
    """, (state, crop))

    rows = cur.fetchall()
    if len(rows) < 40:
        raise HTTPException(status_code=404, detail="Insufficient market history")

    prices = sorted(rows, key=lambda r: r["Arrival_Date"])

    last_30 = prices[-30:]
    prev_30 = prices[-60:-30]

    avg_last_30 = sum(r["avg_modal_price"] for r in last_30) / 30
    avg_prev_30 = sum(r["avg_modal_price"] for r in prev_30) / 30

    base_trend_pct = (avg_last_30 - avg_prev_30) / avg_prev_30
    last_price = prices[-1]["avg_modal_price"]
    last_date = datetime.strptime(prices[-1]["Arrival_Date"], "%Y-%m-%d")

    # -------------------------------
    # 2. Fetch persistence
    # -------------------------------
    cur.execute("""
        SELECT persistence_score
        FROM crop_trend_persistence
        WHERE State = ?
          AND Commodity = ?
    """, (state, crop))

    row = cur.fetchone()
    persistence = row["persistence_score"] if row else 0.5

    conn.close()

    # -------------------------------
    # 3. Generate forecasts
    # -------------------------------
    forecasts = {}

    for horizon in [30, 60, 90]:
        decay = DECAY_FACTORS[horizon]
        effective_trend = base_trend_pct * persistence * decay
        daily_slope = (last_price * effective_trend) / horizon

        series = []
        for i in range(1, horizon + 1):
            price = last_price + daily_slope * i
            date = last_date + timedelta(days=i)
            series.append({
                "date": date.strftime("%Y-%m-%d"),
                "price": round(price, 2)
            })

        forecasts[f"forecast_{horizon}"] = series

    # -------------------------------
    # 4. Response
    # -------------------------------
    return {
        "crop": crop,
        "state": state,
        "trend_percent": round(base_trend_pct * 100, 2),
        "persistence": round(persistence, 2),
        "confidence": round(min(0.95, 0.6 + persistence * 0.4), 2),
        **forecasts
    }
