from fastapi import FastAPI, HTTPException, Query
from market_logic import evaluate_market_logic
from datetime import datetime, timedelta
from typing import List, Optional
import sqlite3
import logging
from db.database import get_connection
from functools import lru_cache
import time

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Vasudha Market Agent",
    description="Economic intelligence based on historical mandi prices",
    version="1.0"
)
DB_PATH = "../../../data/market/sqlite/market.db"

# Simple in-memory cache with TTL
_cache = {}
_cache_ttl = 300  # 5 minutes

def get_cached(key: str):
    """Get value from cache if not expired"""
    if key in _cache:
        value, timestamp = _cache[key]
        if time.time() - timestamp < _cache_ttl:
            return value
        del _cache[key]
    return None

def set_cached(key: str, value):
    """Set value in cache with current timestamp"""
    _cache[key] = (value, time.time())

@app.get("/market/evaluate")
@app.get("/market/evaluate/")
def evaluate_market(crop: str, state: str):
    logger.info(f"[Market Evaluate] crop={crop}, state={state}")
    
    # Check cache first
    cache_key = f"eval:{crop.lower()}:{state.lower()}"
    cached = get_cached(cache_key)
    if cached is not None:
        logger.info(f"[Market Evaluate] Cache hit for {cache_key}")
        return cached
    
    try:
        result = evaluate_market_logic(crop, state)

        if result is None:
            logger.warning(f"[Market Evaluate] No data found for crop={crop}, state={state}")
            raise HTTPException(status_code=404, detail="No market data found")

        logger.info(f"[Market Evaluate] Success: {result}")
        set_cached(cache_key, result)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Market Evaluate] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Evaluation error: {str(e)}")


@app.get("/market/evaluate/batch")
@app.get("/market/evaluate/batch/")
def evaluate_market_batch(
    crops: List[str] = Query(..., description="List of crop names"),
    state: str = Query(..., description="State name")
):
    """Batch evaluate multiple crops for a single state - much faster than individual calls"""
    logger.info(f"[Market Batch] crops={crops}, state={state}")
    
    results = {}
    for crop in crops:
        cache_key = f"eval:{crop.lower()}:{state.lower()}"
        cached = get_cached(cache_key)
        
        if cached is not None:
            results[crop] = cached
        else:
            try:
                result = evaluate_market_logic(crop, state)
                if result:
                    set_cached(cache_key, result)
                    results[crop] = result
                else:
                    results[crop] = None
            except Exception as e:
                logger.error(f"[Market Batch] Error for {crop}: {str(e)}")
                results[crop] = None
    
    return {"state": state, "results": results}

@app.get("/market/debug")
@app.get("/market/debug/")
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
@app.get("/market/forecast/")
def market_forecast(crop: str, state: str):
    logger.info(f"[Market Forecast] crop={crop}, state={state}")
    
    # Check cache first
    cache_key = f"forecast:{crop.lower()}:{state.lower()}"
    cached = get_cached(cache_key)
    if cached is not None:
        logger.info(f"[Market Forecast] Cache hit for {cache_key}")
        return cached
    
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

    result = {
        "crop": crop,
        "state": state,
        "trend_percent": round(base_trend_pct * 100, 2),
        "confidence": confidence,
        **forecasts
    }
    
    # Cache the result
    set_cached(cache_key, result)
    
    return result


@app.get("/market/data")
@app.get("/market/data/")
def get_market_data():
    """Fetch market dropdowns: states, APMCs by state, commodities by APMC"""
    logger.info("[Market Data] Fetching market data...")
    
    try:
        import time
        start_time = time.time()
        
        logger.info("[Market Data] Opening database connection...")
        conn = get_connection()
        cur = conn.cursor()
        
        logger.info("[Market Data] Executing query on metadata table...")
        # ULTRA-OPTIMIZED: Query the small metadata table (141K rows) instead of market_prices (71.8M rows)
        cur.execute("""
            SELECT DISTINCT state, market, commodity FROM market_metadata 
            ORDER BY state, market, commodity
        """)
        
        logger.info("[Market Data] Fetching results...")
        rows = cur.fetchall()
        elapsed_query = time.time() - start_time
        logger.info(f"[Market Data] Got {len(rows)} rows from metadata table in {elapsed_query:.3f}s")
        
        states_set = set()
        apmcs_by_state = {}
        commodities_by_apmc = {}
        all_commodities_set = set()
        
        logger.info("[Market Data] Building data structures...")
        # Build all structures from single result set (single database round-trip)
        for state, market, commodity in rows:
            states_set.add(state)
            all_commodities_set.add(commodity)
            
            if state not in apmcs_by_state:
                apmcs_by_state[state] = []
            if market not in apmcs_by_state[state]:
                apmcs_by_state[state].append(market)
            
            if market not in commodities_by_apmc:
                commodities_by_apmc[market] = []
            if commodity not in commodities_by_apmc[market]:
                commodities_by_apmc[market].append(commodity)
        
        states = sorted(list(states_set))
        all_commodities = sorted(list(all_commodities_set))
        
        conn.close()
        
        elapsed = time.time() - start_time
        logger.info(f"[Market Data] SUCCESS - Found {len(states)} states, {len(commodities_by_apmc)} APMCs, {len(all_commodities)} commodities (took {elapsed:.3f}s)")
        return {
            "states": states,
            "apmcs_by_state": apmcs_by_state,
            "commodities_by_apmc": commodities_by_apmc,
            "all_commodities": all_commodities
        }
    
    except Exception as e:
        logger.error(f"[Market Data] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch market data: {str(e)}")


@app.get("/market/current-prices")
@app.get("/market/current-prices/")
def get_current_prices(state: str = None, commodity: str = None, limit: int = 3):
    """Fetch current market prices with 10-day average and price change percentage
    
    Parameters:
    - state: Filter by state (optional)
    - commodity: Filter by commodity (optional)
    - limit: Number of results per APMC (default: 3)
    """
    logger.info(f"[Market Current Prices] state={state}, commodity={commodity}")
    
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Get the latest date in database
        cur.execute("SELECT MAX(arrival_date) FROM market_prices")
        latest_date = cur.fetchone()[0]
        logger.info(f"[Market Current Prices] Latest date in DB: {latest_date}")
        
        if not latest_date:
            raise HTTPException(status_code=404, detail="No market data available")
        
        latest_datetime = datetime.strptime(latest_date, "%Y-%m-%d")
        ten_days_ago = (latest_datetime - timedelta(days=10)).strftime("%Y-%m-%d")
        
        # Build dynamic query
        query = """
            SELECT 
                state,
                market,
                commodity,
                modal_price as current_price,
                arrival_date as date,
                ROUND(
                    (
                        SELECT AVG(modal_price) 
                        FROM market_prices mp2
                        WHERE mp2.state = mp1.state
                        AND mp2.market = mp1.market
                        AND mp2.commodity = mp1.commodity
                        AND mp2.arrival_date >= ? AND mp2.arrival_date <= ?
                    ),
                    2
                ) as avg_price_10d
            FROM market_prices mp1
            WHERE arrival_date = ?
        """
        
        params = [ten_days_ago, latest_date, latest_date]
        
        # Add optional filters
        if state:
            query += " AND LOWER(state) = LOWER(?)"
            params.append(state)
        
        if commodity:
            query += " AND LOWER(commodity) = LOWER(?)"
            params.append(commodity)
        
        query += " ORDER BY state, market, commodity"
        
        cur.execute(query, params)
        rows = cur.fetchall()
        logger.info(f"[Market Current Prices] Found {len(rows)} price records")
        
        # Format results with price change percentage
        results = []
        for row in rows:
            current_price = row["current_price"]
            avg_price_10d = row["avg_price_10d"]
            
            # Calculate price change percentage
            if avg_price_10d and avg_price_10d > 0:
                price_change_pct = round(
                    ((current_price - avg_price_10d) / avg_price_10d) * 100,
                    2
                )
            else:
                price_change_pct = 0
            
            results.append({
                "state": row["state"],
                "apmc": row["market"],
                "commodity": row["commodity"],
                "current_price": round(current_price, 2) if current_price else None,
                "avg_price_10d": round(avg_price_10d, 2) if avg_price_10d else None,
                "price_change_percent": price_change_pct,
                "date": row["date"]
            })
        
        conn.close()
        
        logger.info("[Market Current Prices] Successfully fetched current prices")
        return {
            "latest_date": latest_date,
            "prices": results
        }
    
    except Exception as e:
        logger.error(f"[Market Current Prices] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch current prices: {str(e)}")

