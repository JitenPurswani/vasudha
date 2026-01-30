#!/usr/bin/env python3
"""
Create market_metadata table from market_prices
This extracts distinct state/market/commodity combinations into a fast lookup table
"""
import sqlite3
import time
from pathlib import Path
import os

DB_PATH = Path("data/market/sqlite/market.db")

def create_metadata_table():
    """Create and populate market_metadata table"""
    print("⏳ Waiting for database to be accessible...")
    time.sleep(3)
    
    # Increase timeout to 60 seconds for initial lock
    conn = sqlite3.connect(str(DB_PATH), timeout=60, isolation_level=None)
    cursor = conn.cursor()
    
    # Disable synchronous for faster writes during this operation
    cursor.execute("PRAGMA synchronous = OFF")
    cursor.execute("PRAGMA cache_size = 100000")
    
    print("📊 Creating market_metadata table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS market_metadata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            state TEXT NOT NULL,
            market TEXT NOT NULL,
            commodity TEXT NOT NULL,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(state, market, commodity)
        )
    """)
    
    print("🔍 Creating indexes...")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_metadata_state ON market_metadata(state)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_metadata_market ON market_metadata(market)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_metadata_commodity ON market_metadata(commodity)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_metadata_state_market ON market_metadata(state, market)")
    
    print("⏳ Populating metadata table from market_prices (71.8M rows)...")
    start = time.time()
    
    # Insert distinct combinations
    cursor.execute("""
        INSERT OR IGNORE INTO market_metadata (state, market, commodity)
        SELECT DISTINCT state, market, commodity FROM market_prices
    """)
    
    elapsed = time.time() - start
    print(f"✅ Populated in {elapsed:.2f}s")
    
    # Verify
    cursor.execute("SELECT COUNT(*) FROM market_metadata")
    total = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT state) FROM market_metadata")
    states = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT market) FROM market_metadata")
    markets = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT commodity) FROM market_metadata")
    commodities = cursor.fetchone()[0]
    
    print(f"""
📈 Metadata Table Stats:
   • Total combinations: {total:,}
   • Unique states: {states}
   • Unique markets: {markets:,}
   • Unique commodities: {commodities:,}
    """)
    
    conn.commit()
    conn.close()
    
    print("✨ Market metadata table created successfully!")

if __name__ == "__main__":
    create_metadata_table()
