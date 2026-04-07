#!/usr/bin/env python3
"""
MARKET AGENT - REBUILD INDEXES SCRIPT
======================================
This script adds missing/optimized indexes to the existing market database.
Useful after code updates to ensure database has all required performance indexes.

Usage:
    cd backend/agents/market_agent
    python rebuild_indexes.py

This script:
1. Connects to the existing market.db
2. Adds any missing indexes for state_daily_prices
3. Does NOT re-ingest data (fast operation, ~1-2 minutes)
"""

import sqlite3
import sys
from pathlib import Path
import time

# Paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parents[2]  # vasudha-project/
DB_PATH = PROJECT_ROOT / "data" / "market" / "sqlite" / "market.db"


def get_connection(timeout: int = 300) -> sqlite3.Connection:
    """Get database connection with optimized settings"""
    conn = sqlite3.connect(str(DB_PATH), timeout=timeout)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    return conn


def rebuild_indexes():
    """Rebuild indexes for optimal performance"""
    print("\n" + "=" * 60)
    print("  MARKET AGENT - REBUILD INDEXES")
    print("=" * 60)
    
    if not DB_PATH.exists():
        print(f"\n❌ Database not found at {DB_PATH}")
        print("   Run setup_market_db.py first to create the database.")
        return False
    
    print(f"\n📊 Database: {DB_PATH}")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Check if state_daily_prices exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='state_daily_prices'")
        if not cursor.fetchone():
            print("\n❌ state_daily_prices table not found!")
            print("   Run setup_market_db.py first to create the database.")
            return False
        
        # Check table row count
        count = cursor.execute("SELECT COUNT(*) FROM state_daily_prices").fetchone()[0]
        print(f"\n📈 state_daily_prices rows: {count:,}")
        
        if count == 0:
            print("⚠️  Table is empty. Skipping index creation.")
            return True
        
        # List of critical indexes for market_logic.py
        indexes = [
            ("idx_state_daily_lower", "state_daily_prices", "(LOWER(state), LOWER(commodity), arrival_date DESC)"),
            ("idx_state_daily_lower_commodity_date", "state_daily_prices", "(LOWER(commodity), LOWER(state), arrival_date)"),
            ("idx_state_daily_main", "state_daily_prices", "(state, commodity, arrival_date)"),
            ("idx_state_daily_date", "state_daily_prices", "(arrival_date)"),
        ]
        
        print("\n🔧 Creating/verifying indexes...")
        print("-" * 50)
        
        start_time = time.time()
        for idx_name, table, columns in indexes:
            try:
                # Check if index exists
                cursor.execute(
                    f"SELECT name FROM sqlite_master WHERE type='index' AND name='{idx_name}'"
                )
                exists = cursor.fetchone() is not None
                
                if exists:
                    print(f"✅ Index exists: {idx_name}")
                else:
                    sql = f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table}{columns}"
                    cursor.execute(sql)
                    print(f"✨ Created index: {idx_name}")
            except Exception as e:
                print(f"⚠️  Error with {idx_name}: {e}")
        
        conn.commit()
        elapsed = time.time() - start_time
        
        print("-" * 50)
        print(f"\n⏱️  Index operation completed in {elapsed:.1f}s")
        
        # Verify indexes
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='state_daily_prices'"
        )
        indexes_found = cursor.fetchall()
        print(f"\n📋 Total indexes on state_daily_prices: {len(indexes_found)}")
        for (idx,) in indexes_found:
            print(f"   • {idx}")
        
        print("\n✅ Index rebuild complete!")
        print("\n💡 Next: Restart the market agent service for changes to take effect.")
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    success = rebuild_indexes()
    sys.exit(0 if success else 1)
