#!/usr/bin/env python3
"""
MARKET AGENT - COMPLETE DATABASE SETUP SCRIPT
=============================================
This script handles the complete setup of the Market Agent database:
1. Creates the base schema (market_prices table)
2. Ingests all CSV data from data/market/raw/
3. Creates state_daily_prices aggregation table
4. Creates all required indexes for performance
5. Creates market_metadata table
6. Creates persistence tables for forecasting (state_30d_avg, state_30d_trends, crop_trend_persistence)

Usage:
    cd backend/agents/market_agent
    python setup_market_db.py

Prerequisites:
    - Download Kaggle dataset: https://www.kaggle.com/datasets/khandelwalmanas/daily-commodity-prices-india
    - Extract all CSV files to: data/market/raw/

Estimated Time: 2-4 hours for full ingestion (71M+ records)
"""

import sys
import os
import time
import sqlite3
from pathlib import Path
from datetime import datetime

# Add parent directories to path for imports
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# Paths
PROJECT_ROOT = BASE_DIR.parents[2]  # vasudha-project/
DB_DIR = PROJECT_ROOT / "data" / "market" / "sqlite"
DB_PATH = DB_DIR / "market.db"
RAW_DATA_DIR = PROJECT_ROOT / "data" / "market" / "raw"
SCHEMA_PATH = BASE_DIR / "db" / "schema.sql"

# Import pandas only when needed (for ingestion)
try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False


def print_header(title: str):
    """Print a formatted header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_step(step_num: int, total: int, description: str):
    """Print a step indicator"""
    print(f"\n[{step_num}/{total}] {description}")
    print("-" * 50)


def get_connection(timeout: int = 300) -> sqlite3.Connection:
    """Get database connection with optimized settings"""
    conn = sqlite3.connect(str(DB_PATH), timeout=timeout, isolation_level=None)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA cache_size = 100000")
    conn.execute("PRAGMA temp_store = MEMORY")
    return conn


def step1_create_directories():
    """Create required directories if they don't exist"""
    print_step(1, 7, "Creating directories")
    
    DB_DIR.mkdir(parents=True, exist_ok=True)
    print(f"✅ Database directory: {DB_DIR}")
    
    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
    print(f"✅ Raw data directory: {RAW_DATA_DIR}")


def step2_create_base_schema():
    """Create base tables from schema.sql"""
    print_step(2, 7, "Creating base schema")
    
    if not SCHEMA_PATH.exists():
        print(f"⚠️  Schema file not found at {SCHEMA_PATH}")
        print("   Creating tables manually...")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Create market_prices table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS market_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            state TEXT NOT NULL,
            district TEXT NOT NULL,
            market TEXT NOT NULL,
            commodity TEXT NOT NULL,
            variety TEXT,
            grade TEXT,
            arrival_date DATE NOT NULL,
            min_price REAL,
            max_price REAL,
            modal_price REAL,
            commodity_code INTEGER,
            source TEXT DEFAULT 'kaggle',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (state, district, market, commodity, arrival_date)
        )
    """)
    print("✅ Created table: market_prices")
    
    # Create state_daily_prices table (for aggregated data)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS state_daily_prices (
            state TEXT NOT NULL,
            commodity TEXT NOT NULL,
            arrival_date DATE NOT NULL,
            avg_modal_price REAL,
            PRIMARY KEY (state, commodity, arrival_date)
        )
    """)
    print("✅ Created table: state_daily_prices")
    
    # Create market_aggregates table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS market_aggregates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            state TEXT NOT NULL,
            district TEXT NOT NULL,
            commodity TEXT NOT NULL,
            avg_modal_price_7d REAL,
            avg_modal_price_30d REAL,
            price_volatility_30d REAL,
            min_price_30d REAL,
            max_price_30d REAL,
            last_updated DATE NOT NULL
        )
    """)
    print("✅ Created table: market_aggregates")
    
    # Create market_forecasts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS market_forecasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            state TEXT NOT NULL,
            commodity TEXT NOT NULL,
            horizon_days INTEGER NOT NULL,
            forecast_mean_price REAL,
            forecast_lower_price REAL,
            forecast_upper_price REAL,
            trend TEXT CHECK (trend IN ('up', 'down', 'stable')),
            confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),
            model_version TEXT,
            trained_on DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (state, commodity, horizon_days)
        )
    """)
    print("✅ Created table: market_forecasts")
    
    # Create metadata table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS metadata (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    print("✅ Created table: metadata")
    
    conn.commit()
    conn.close()


def step3_ingest_csv_data():
    """Ingest all CSV files from raw data directory"""
    print_step(3, 7, "Ingesting CSV data (this may take 2-4 hours)")
    
    if not HAS_PANDAS:
        print("❌ pandas is required for ingestion. Install with: pip install pandas")
        print("   Skipping ingestion step...")
        return False
    
    csv_files = list(RAW_DATA_DIR.glob("*.csv"))
    if not csv_files:
        print(f"⚠️  No CSV files found in {RAW_DATA_DIR}")
        print("   Download from: https://www.kaggle.com/datasets/khandelwalmanas/daily-commodity-prices-india")
        print("   Skipping ingestion step...")
        return False
    
    print(f"📁 Found {len(csv_files)} CSV files to ingest")
    
    CHUNK_SIZE = 50_000
    REQUIRED_COLUMNS = {
        "State", "District", "Market", "Commodity", "Variety", "Grade",
        "Arrival_Date", "Min_Price", "Max_Price", "Modal_Price", "Commodity_Code"
    }
    
    conn = get_connection()
    cursor = conn.cursor()
    
    sql_market = """
        INSERT OR IGNORE INTO market_prices (
            state, district, market,
            commodity, variety, grade,
            arrival_date, min_price, max_price,
            modal_price, commodity_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    
    sql_agg = """
        INSERT OR REPLACE INTO state_daily_prices (state, commodity, arrival_date, avg_modal_price)
        VALUES (?, ?, ?, ?)
    """
    
    total_inserted = 0
    start_time = time.time()
    
    for csv_idx, csv_path in enumerate(sorted(csv_files), 1):
        print(f"\n📄 [{csv_idx}/{len(csv_files)}] Processing: {csv_path.name}")
        file_start = time.time()
        file_rows = 0
        
        for chunk in pd.read_csv(csv_path, chunksize=CHUNK_SIZE):
            missing = REQUIRED_COLUMNS - set(chunk.columns)
            if missing:
                print(f"   ⚠️  Missing columns: {missing}")
                continue
            
            chunk = chunk.rename(columns={
                "State": "state",
                "District": "district",
                "Market": "market",
                "Commodity": "commodity",
                "Variety": "variety",
                "Grade": "grade",
                "Arrival_Date": "arrival_date",
                "Min_Price": "min_price",
                "Max_Price": "max_price",
                "Modal_Price": "modal_price",
                "Commodity_Code": "commodity_code",
            })
            
            chunk["arrival_date"] = pd.to_datetime(chunk["arrival_date"]).dt.date
            
            # Insert into market_prices
            rows_market = chunk[[
                "state", "district", "market",
                "commodity", "variety", "grade",
                "arrival_date", "min_price", "max_price",
                "modal_price", "commodity_code"
            ]].to_records(index=False)
            
            before = conn.total_changes
            cursor.executemany(sql_market, rows_market)
            conn.commit()
            after = conn.total_changes
            
            inserted = after - before
            total_inserted += inserted
            file_rows += len(rows_market)
            
            # Aggregate and insert into state_daily_prices
            agg_data = chunk.groupby(['state', 'commodity', 'arrival_date'])['modal_price'].mean().reset_index()
            agg_data.columns = ['state', 'commodity', 'arrival_date', 'avg_modal_price']
            
            rows_agg = agg_data[['state', 'commodity', 'arrival_date', 'avg_modal_price']].to_records(index=False)
            cursor.executemany(sql_agg, rows_agg)
            conn.commit()
            
            print(f"   Chunk: {len(rows_market):,} rows | Inserted: {inserted:,} | Aggregated: {len(rows_agg):,}")
        
        file_elapsed = time.time() - file_start
        print(f"   ✅ Completed {csv_path.name}: {file_rows:,} rows in {file_elapsed:.1f}s")
    
    conn.close()
    
    total_elapsed = time.time() - start_time
    print(f"\n✅ Ingestion complete!")
    print(f"   Total records inserted: {total_inserted:,}")
    print(f"   Total time: {total_elapsed/60:.1f} minutes")
    
    return True


def step4_create_indexes():
    """Create all required indexes for optimal query performance"""
    print_step(4, 7, "Creating indexes")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    indexes = [
        # market_prices indexes
        ("idx_prices_crop_date", "market_prices", "(commodity, arrival_date)"),
        ("idx_prices_location", "market_prices", "(state, district, market)"),
        ("idx_state_commodity_date", "market_prices", "(state, commodity, arrival_date)"),
        ("idx_state_district_market", "market_prices", "(state, district, market)"),
        ("idx_arrival_date", "market_prices", "(arrival_date)"),
        
        # state_daily_prices indexes
        ("idx_state_daily_main", "state_daily_prices", "(state, commodity, arrival_date)"),
        ("idx_state_daily_date", "state_daily_prices", "(arrival_date)"),
        ("idx_state_daily_lower", "state_daily_prices", "(LOWER(state), LOWER(commodity), arrival_date DESC)"),
        
        # market_aggregates indexes
        ("idx_aggregates_lookup", "market_aggregates", "(state, district, commodity)"),
        
        # market_forecasts indexes
        ("idx_forecasts_lookup", "market_forecasts", "(state, commodity, horizon_days)"),
    ]
    
    for idx_name, table, columns in indexes:
        try:
            sql = f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table}{columns}"
            cursor.execute(sql)
            print(f"✅ Created index: {idx_name} on {table}")
        except Exception as e:
            print(f"⚠️  Index {idx_name}: {e}")
    
    conn.commit()
    conn.close()


def step5_create_market_metadata():
    """Create and populate market_metadata table"""
    print_step(5, 7, "Creating market_metadata table")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Create table
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
    print("✅ Created table: market_metadata")
    
    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_metadata_state ON market_metadata(state)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_metadata_market ON market_metadata(market)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_metadata_commodity ON market_metadata(commodity)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_metadata_state_market ON market_metadata(state, market)")
    print("✅ Created indexes for market_metadata")
    
    # Check if market_prices has data
    count = cursor.execute("SELECT COUNT(*) FROM market_prices").fetchone()[0]
    if count == 0:
        print("⚠️  market_prices is empty. Skipping metadata population.")
        conn.close()
        return
    
    # Populate from market_prices
    print("⏳ Populating metadata from market_prices...")
    start = time.time()
    
    cursor.execute("""
        INSERT OR IGNORE INTO market_metadata (state, market, commodity)
        SELECT DISTINCT state, market, commodity FROM market_prices
    """)
    conn.commit()
    
    elapsed = time.time() - start
    
    # Get stats
    total = cursor.execute("SELECT COUNT(*) FROM market_metadata").fetchone()[0]
    states = cursor.execute("SELECT COUNT(DISTINCT state) FROM market_metadata").fetchone()[0]
    markets = cursor.execute("SELECT COUNT(DISTINCT market) FROM market_metadata").fetchone()[0]
    commodities = cursor.execute("SELECT COUNT(DISTINCT commodity) FROM market_metadata").fetchone()[0]
    
    print(f"✅ Populated in {elapsed:.1f}s")
    print(f"   • Total combinations: {total:,}")
    print(f"   • Unique states: {states}")
    print(f"   • Unique markets: {markets:,}")
    print(f"   • Unique commodities: {commodities}")
    
    conn.close()


def step6_create_persistence_tables():
    """Create persistence tables for forecasting algorithm"""
    print_step(6, 7, "Creating persistence tables for forecasting")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if state_daily_prices has data
    count = cursor.execute("SELECT COUNT(*) FROM state_daily_prices").fetchone()[0]
    if count == 0:
        print("⚠️  state_daily_prices is empty. Cannot create persistence tables.")
        print("   Run data ingestion first (step 3).")
        conn.close()
        return
    
    print(f"📊 Found {count:,} records in state_daily_prices")
    
    # Step 6.1: Create state_30d_avg (rolling 30-day averages)
    print("\n⏳ Creating state_30d_avg (rolling 30-day averages)...")
    print("   This may take several minutes...")
    start = time.time()
    
    cursor.execute("DROP TABLE IF EXISTS state_30d_avg")
    cursor.execute("""
        CREATE TABLE state_30d_avg AS
        SELECT
            State,
            Commodity,
            Arrival_Date,
            AVG(avg_modal_price) OVER (
                PARTITION BY State, Commodity
                ORDER BY Arrival_Date
                ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
            ) AS avg_30
        FROM state_daily_prices
    """)
    conn.commit()
    
    elapsed = time.time() - start
    count_30d = cursor.execute("SELECT COUNT(*) FROM state_30d_avg").fetchone()[0]
    print(f"✅ Created state_30d_avg: {count_30d:,} records in {elapsed:.1f}s")
    
    # Step 6.2: Create state_30d_trends (trend continuation tracking)
    print("\n⏳ Creating state_30d_trends (trend continuation)...")
    start = time.time()
    
    cursor.execute("DROP TABLE IF EXISTS state_30d_trends")
    cursor.execute("""
        CREATE TABLE state_30d_trends AS
        SELECT
            a.State,
            a.Commodity,
            a.Arrival_Date AS start_date,
            a.avg_30 AS avg_30_start,
            b.avg_30 AS avg_30_next,
            CASE
                WHEN b.avg_30 > a.avg_30 THEN 1
                ELSE 0
            END AS continued_up
        FROM state_30d_avg a
        JOIN state_30d_avg b
          ON a.State = b.State
         AND a.Commodity = b.Commodity
         AND b.Arrival_Date = DATE(a.Arrival_Date, '+30 day')
        WHERE a.avg_30 IS NOT NULL
          AND b.avg_30 IS NOT NULL
    """)
    conn.commit()
    
    elapsed = time.time() - start
    count_trends = cursor.execute("SELECT COUNT(*) FROM state_30d_trends").fetchone()[0]
    print(f"✅ Created state_30d_trends: {count_trends:,} records in {elapsed:.1f}s")
    
    # Step 6.3: Create crop_trend_persistence (persistence scores)
    print("\n⏳ Creating crop_trend_persistence (persistence scores)...")
    start = time.time()
    
    cursor.execute("DROP TABLE IF EXISTS crop_trend_persistence")
    cursor.execute("""
        CREATE TABLE crop_trend_persistence AS
        SELECT
            State,
            Commodity,
            AVG(continued_up * 1.0) AS persistence_score,
            COUNT(*) AS sample_size
        FROM state_30d_trends
        GROUP BY State, Commodity
    """)
    conn.commit()
    
    elapsed = time.time() - start
    count_persist = cursor.execute("SELECT COUNT(*) FROM crop_trend_persistence").fetchone()[0]
    print(f"✅ Created crop_trend_persistence: {count_persist:,} records in {elapsed:.1f}s")
    
    # Step 6.4: Apply safe defaults for small samples
    print("\n⏳ Applying safe defaults for small sample sizes...")
    cursor.execute("""
        UPDATE crop_trend_persistence
        SET persistence_score = 0.5
        WHERE persistence_score IS NULL
           OR sample_size < 20
    """)
    conn.commit()
    
    updated = conn.total_changes
    print(f"✅ Applied defaults to {updated:,} records with sample_size < 20")
    
    conn.close()


def step7_verify_setup():
    """Verify the complete database setup"""
    print_step(7, 7, "Verifying database setup")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    print("\n📊 TABLE SUMMARY:")
    print("-" * 50)
    
    tables = [
        "market_prices",
        "state_daily_prices", 
        "market_metadata",
        "state_30d_avg",
        "state_30d_trends",
        "crop_trend_persistence",
        "market_aggregates",
        "market_forecasts"
    ]
    
    for table in tables:
        try:
            count = cursor.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            status = "✅" if count > 0 else "⚠️ (empty)"
            print(f"   {table}: {count:,} records {status}")
        except:
            print(f"   {table}: ❌ (not found)")
    
    print("\n📇 INDEX SUMMARY:")
    print("-" * 50)
    
    indexes = cursor.execute("""
        SELECT name, tbl_name 
        FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
        ORDER BY tbl_name, name
    """).fetchall()
    
    current_table = None
    for idx_name, table in indexes:
        if table != current_table:
            print(f"\n   {table}:")
            current_table = table
        print(f"      • {idx_name}")
    
    # Verify persistence tables have valid data
    print("\n🔍 PERSISTENCE TABLE VERIFICATION:")
    print("-" * 50)
    
    try:
        sample = cursor.execute("""
            SELECT State, Commodity, persistence_score, sample_size
            FROM crop_trend_persistence
            WHERE Commodity = 'Soyabean'
            LIMIT 5
        """).fetchall()
        
        if sample:
            print("   Sample from crop_trend_persistence (Soyabean):")
            for row in sample:
                print(f"      {row[0]}: score={row[2]:.3f}, samples={row[3]}")
            print("   ✅ Persistence scores look good!")
        else:
            print("   ⚠️  No Soyabean data found in crop_trend_persistence")
    except Exception as e:
        print(f"   ❌ Error verifying persistence: {e}")
    
    # Get date range
    try:
        date_range = cursor.execute("""
            SELECT MIN(arrival_date), MAX(arrival_date)
            FROM state_daily_prices
        """).fetchone()
        if date_range[0]:
            print(f"\n📅 DATA RANGE: {date_range[0]} to {date_range[1]}")
    except:
        pass
    
    conn.close()
    
    print("\n" + "=" * 60)
    print("  SETUP COMPLETE!")
    print("=" * 60)
    print("""
Next steps:
1. Start the Market Agent:
   cd backend/agents/market_agent
   uvicorn main:app --host 0.0.0.0 --port 8004

2. Test the API:
   curl "http://127.0.0.1:8004/market/evaluate?crop=Cotton&state=Maharashtra"
   curl "http://127.0.0.1:8004/market/forecast?crop=Cotton&state=Maharashtra"
    """)


def main():
    """Main entry point"""
    print_header("MARKET AGENT DATABASE SETUP")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Database: {DB_PATH}")
    print(f"Raw data: {RAW_DATA_DIR}")
    
    # Check if user wants to skip certain steps
    skip_ingestion = "--skip-ingest" in sys.argv
    only_persistence = "--persistence-only" in sys.argv
    only_indexes = "--indexes-only" in sys.argv
    only_verify = "--verify-only" in sys.argv
    
    if only_verify:
        print("\n🔍 Running verification only (no changes will be made)...")
        step7_verify_setup()
        return
    
    if only_persistence:
        print("\n⚡ Running persistence tables creation only...")
        step6_create_persistence_tables()
        step7_verify_setup()
        return
    
    if only_indexes:
        print("\n⚡ Running index creation only...")
        step4_create_indexes()
        step7_verify_setup()
        return
    
    # Full setup
    step1_create_directories()
    step2_create_base_schema()
    
    if not skip_ingestion:
        step3_ingest_csv_data()
    else:
        print("\n⏭️  Skipping data ingestion (--skip-ingest flag)")
    
    step4_create_indexes()
    step5_create_market_metadata()
    step6_create_persistence_tables()
    step7_verify_setup()


if __name__ == "__main__":
    print("""
+==============================================================+
|        MARKET AGENT - DATABASE SETUP SCRIPT                  |
+==============================================================+
|  Options:                                                    |
|    python setup_market_db.py              Full setup         |
|    python setup_market_db.py --skip-ingest  Skip CSV ingest  |
|    python setup_market_db.py --persistence-only  Just tables |
|    python setup_market_db.py --indexes-only  Just indexes    |
|    python setup_market_db.py --verify-only  Just verify      |
+==============================================================+
    """)
    main()
