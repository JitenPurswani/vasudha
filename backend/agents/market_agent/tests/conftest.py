from pathlib import Path
import sqlite3
import sys

import pytest
from fastapi.testclient import TestClient


# Ensure the market_agent service directory (one level up from tests/) is on sys.path
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import main  # noqa: E402
import market_logic  # noqa: E402


@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient bound to the market agent app."""
    return TestClient(main.app)


@pytest.fixture(scope="session")
def temp_market_db(tmp_path_factory):
    """Create a temporary SQLite DB with a minimal state_daily_prices table for tests."""
    db_path = tmp_path_factory.mktemp("market_db") / "market_test.sqlite"

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Minimal schema used by market_logic and forecast/debug endpoints
    cursor.execute(
        """
        CREATE TABLE state_daily_prices (
            state TEXT,
            commodity TEXT,
            arrival_date TEXT,
            avg_modal_price REAL
        )
        """
    )

    # Insert synthetic price history for one crop/state
    # 180 days ago to yesterday with a gentle upward trend
    from datetime import datetime, timedelta

    base_date = datetime(2025, 1, 1)
    prices = []
    for i in range(180):
        date = base_date + timedelta(days=i)
        price = 100 + i * 0.2  # simple linear trend
        prices.append(("Maharashtra", "Wheat", date.strftime("%Y-%m-%d"), price))

    cursor.executemany(
        """
        INSERT INTO state_daily_prices (state, commodity, arrival_date, avg_modal_price)
        VALUES (?, ?, ?, ?)
        """,
        prices,
    )

    conn.commit()
    conn.close()

    return db_path


@pytest.fixture(autouse=True)
def patch_market_db(monkeypatch, temp_market_db):
    """Point market logic and main module DB paths at the temporary market DB."""
    monkeypatch.setattr(market_logic, "DB_PATH", str(temp_market_db), raising=False)
    monkeypatch.setattr(main, "DB_PATH", str(temp_market_db), raising=False)


@pytest.fixture(autouse=True)
def clear_market_cache():
    """Clear in-memory market caches before and after each test."""
    main._cache.clear()
    yield
    main._cache.clear()
