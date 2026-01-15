import sqlite3

DB_PATH = "../../../data/market/sqlite/market.db"


def query_one(query: str, params=()):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(query, params)
    row = cur.fetchone()
    conn.close()
    return row[0] if row else None


def evaluate_market_logic(crop: str, state: str) -> dict:
    # 1️⃣ Long-term average price
    price_raw = query_one(
        """
        SELECT AVG(avg_modal_price)
        FROM state_daily_prices
        WHERE Commodity = ? AND State = ?
        """,
        (crop, state)
    )

    if price_raw is None:
        return None

    # 2️⃣ Normalize price across states
    min_price, max_price = sqlite3.connect(DB_PATH).execute(
        """
        SELECT MIN(p), MAX(p) FROM (
            SELECT AVG(avg_modal_price) AS p
            FROM state_daily_prices
            WHERE Commodity = ?
            GROUP BY State
        )
        """,
        (crop,)
    ).fetchone()

    price_norm = (
        (price_raw - min_price) / (max_price - min_price)
        if max_price != min_price else 0.5
    )

    # 3️⃣ Volatility (variance)
    variance = query_one(
        """
        SELECT (
            AVG(avg_modal_price * avg_modal_price)
            - AVG(avg_modal_price) * AVG(avg_modal_price)
        )
        FROM state_daily_prices
        WHERE Commodity = ? AND State = ?
          AND Arrival_Date >= DATE('now', '-365 day')
        """,
        (crop, state)
    )

    max_variance = query_one(
        """
        SELECT MAX(v) FROM (
            SELECT (
                AVG(avg_modal_price * avg_modal_price)
                - AVG(avg_modal_price) * AVG(avg_modal_price)
            ) AS v
            FROM state_daily_prices
            WHERE Commodity = ?
              AND Arrival_Date >= DATE('now', '-365 day')
            GROUP BY State
        )
        """,
        (crop,)
    )

    vol_norm = (variance / max_variance) if max_variance else 0
    stability = 1 - vol_norm

    # 4️⃣ Trend
    recent_30 = query_one(
        """
        SELECT AVG(avg_modal_price)
        FROM state_daily_prices
        WHERE Commodity = ? AND State = ?
          AND Arrival_Date >= DATE('now', '-30 day')
        """,
        (crop, state)
    )

    prev_150 = query_one(
        """
        SELECT AVG(avg_modal_price)
        FROM state_daily_prices
        WHERE Commodity = ? AND State = ?
          AND Arrival_Date < DATE('now', '-30 day')
          AND Arrival_Date >= DATE('now', '-180 day')
        """,
        (crop, state)
    )

    trend_raw = ((recent_30 - prev_150) / prev_150) if prev_150 else 0
    trend_cap = 0.2
    trend_norm = (max(-trend_cap, min(trend_raw, trend_cap)) + trend_cap) / (2 * trend_cap)

    # 5️⃣ Final score
    confidence = 0.9
    market_score = round(100 * (
        0.35 * price_norm +
        0.30 * stability +
        0.25 * trend_norm +
        0.10 * confidence
    ), 2)

    return {
        "crop": crop,
        "state": state,
        "price": round(price_raw, 2),
        "price_norm": round(price_norm, 3),
        "stability": round(stability, 3),
        "trend_percent": round(trend_raw * 100, 2),
        "market_score": market_score,
        "confidence": confidence
    }
