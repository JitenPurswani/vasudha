#!/usr/bin/env python3
"""
MARKET AGENT - DAILY DATA UPDATE SCRIPT
=======================================
This script automatically downloads the latest market data from Kaggle
and performs incremental updates to keep the database current.

Features:
- Downloads only the latest data files (not the entire 71M record dataset)
- Incremental insertion (skips existing records)
- Rebuilds persistence tables for accurate forecasting
- Logs all operations with timestamps

Usage:
    cd backend/agents/market_agent
    python update_market_db.py
    
    # or with options:
    python update_market_db.py --dry-run     # Preview what would be updated
    python update_market_db.py --force       # Force update even if data seems current

Prerequisites:
- Kaggle API setup (kaggle.json in ~/.kaggle/)
- Virtual environment activated
- pip install kaggle (already done)

Scheduling:
- Windows Task Scheduler: daily at 6 PM
- See scheduler/daily_update_task.xml for Task Scheduler import
"""

import os
import sys
import time
import sqlite3
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
import subprocess
import tempfile
import shutil
import logging
from typing import Optional, Tuple

# Setup paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parents[2]
DB_PATH = PROJECT_ROOT / "data" / "market" / "sqlite" / "market.db"
TEMP_DIR = PROJECT_ROOT / "data" / "market" / "temp"
LOG_DIR = BASE_DIR / "logs"

# Kaggle dataset info
DATASET_ID = "khandelwalmanas/daily-commodity-prices-india"
CURRENT_YEAR = 2026

def setup_logging():
    """Setup logging to both file and console"""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOG_DIR / f"market_update_{datetime.now().strftime('%Y%m%d')}.log"
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)

def get_connection(timeout: int = 60) -> sqlite3.Connection:
    """Get database connection with optimized settings"""
    conn = sqlite3.connect(str(DB_PATH), timeout=timeout, isolation_level=None)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA cache_size = 50000")
    return conn

def get_latest_db_date() -> Optional[str]:
    """Get the most recent date in our database"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        result = cursor.execute(
            "SELECT MAX(arrival_date) FROM state_daily_prices"
        ).fetchone()
        conn.close()
        return result[0] if result and result[0] else None
    except Exception as e:
        logging.error(f"Error getting latest DB date: {e}")
        return None

def check_kaggle_dataset_updated() -> Tuple[bool, str]:
    """Check if Kaggle dataset has been updated since our last sync"""
    try:
        # Get dataset metadata
        result = subprocess.run(
            ["kaggle", "datasets", "show", DATASET_ID, "-m"],
            capture_output=True, text=True, check=True
        )
        
        # Parse the metadata for last updated time
        for line in result.stdout.split('\n'):
            if 'lastUpdated' in line:
                # Extract the timestamp
                timestamp_str = line.split(': ')[1].strip()
                return True, timestamp_str
        
        return False, "Could not parse dataset metadata"
    
    except subprocess.CalledProcessError as e:
        logging.error(f"Error checking Kaggle dataset: {e}")
        return False, str(e)

def download_latest_data() -> Optional[Path]:
    """Download ONLY the current year's data from Kaggle (not the entire 6GB dataset)"""
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    
    try:
        logging.info(f"Downloading ONLY {CURRENT_YEAR}.csv from {DATASET_ID}...")
        
        # Download only the specific file we need (not the entire dataset)
        # This saves ~5.5GB by downloading only csv/2026.csv (~20MB) instead of all years
        result = subprocess.run([
            "kaggle", "datasets", "download", 
            DATASET_ID, 
            "-f", f"csv/{CURRENT_YEAR}.csv",  # Files are in csv/ subdirectory
            "-p", str(TEMP_DIR),
            "--unzip"
        ], check=True, capture_output=True, text=True)
        
        logging.info(f"Download completed: {CURRENT_YEAR}.csv only")
        
        # Look for the specific file (could be in csv/ subdirectory)
        target_file = TEMP_DIR / f"{CURRENT_YEAR}.csv"
        csv_subdir_file = TEMP_DIR / "csv" / f"{CURRENT_YEAR}.csv"
        
        if target_file.exists():
            logging.info(f"Found target file: {target_file.name} ({target_file.stat().st_size / 1024 / 1024:.1f} MB)")
            return target_file
        elif csv_subdir_file.exists():
            logging.info(f"Found target file in subdirectory: csv/{csv_subdir_file.name} ({csv_subdir_file.stat().st_size / 1024 / 1024:.1f} MB)")
            return csv_subdir_file
        else:
            # Fallback: look for any CSV files in case the filename is different
            csv_files = list(TEMP_DIR.glob("*.csv"))
            csv_files = [f for f in csv_files if f.name.startswith('20')]
            csv_files.sort(reverse=True)  # Most recent first
            
            if csv_files:
                latest_csv = csv_files[0]
                logging.info(f"Fallback: Found data file: {latest_csv.name}")
                return latest_csv
            else:
                logging.error("No suitable CSV files found in download")
                return None
            
    except subprocess.CalledProcessError as e:
        logging.error(f"Kaggle download failed: {e}")
        logging.error(f"Command output: {e.stdout}")
        logging.error(f"Command error: {e.stderr}")
        
        # If specific file download fails, try downloading the full dataset as fallback
        logging.info("Attempting full dataset download as fallback...")
        try:
            result = subprocess.run([
                "kaggle", "datasets", "download", 
                DATASET_ID, 
                "-p", str(TEMP_DIR),
                "--unzip"
            ], check=True, capture_output=True, text=True)
            
            # Find the current year's CSV file
            target_file = TEMP_DIR / f"{CURRENT_YEAR}.csv"
            if target_file.exists():
                logging.info(f"Fallback successful: found {target_file.name}")
                return target_file
        except:
            pass
            
        return None

def get_new_records_count(csv_path: Path, latest_db_date: str) -> int:
    """Count how many new records are in the CSV file"""
    try:
        # Read just the date column to count new records
        df = pd.read_csv(csv_path, usecols=['Arrival_Date'])
        df['Arrival_Date'] = pd.to_datetime(df['Arrival_Date']).dt.date
        
        if latest_db_date:
            latest_date = pd.to_datetime(latest_db_date).date()
            new_records = df[df['Arrival_Date'] > latest_date]
            return len(new_records)
        else:
            return len(df)
    except Exception as e:
        logging.error(f"Error counting new records: {e}")
        return 0

def ingest_incremental_data(csv_path: Path, latest_db_date: str) -> int:
    """Insert only new records from the CSV file"""
    logging.info(f"Processing incremental data from {csv_path.name}...")
    
    CHUNK_SIZE = 10000
    conn = get_connection()
    cursor = conn.cursor()
    
    sql_market = """
        INSERT OR IGNORE INTO market_prices (
            state, district, market, commodity, variety, grade,
            arrival_date, min_price, max_price, modal_price, commodity_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    
    sql_agg = """
        INSERT OR REPLACE INTO state_daily_prices (state, commodity, arrival_date, avg_modal_price)
        VALUES (?, ?, ?, ?)
    """
    
    total_processed = 0
    total_inserted = 0
    
    # Parse the cutoff date
    cutoff_date = pd.to_datetime(latest_db_date).date() if latest_db_date else None
    
    for chunk in pd.read_csv(csv_path, chunksize=CHUNK_SIZE):
        # Standardize column names
        chunk.columns = [col.strip() for col in chunk.columns]
        required_cols = ['State', 'District', 'Market', 'Commodity', 'Variety', 'Grade',
                        'Arrival_Date', 'Min_Price', 'Max_Price', 'Modal_Price', 'Commodity_Code']
        
        if not all(col in chunk.columns for col in required_cols):
            logging.warning(f"Missing required columns in chunk. Available: {list(chunk.columns)}")
            continue
        
        # Clean and prepare data
        chunk = chunk.rename(columns={
            'State': 'state', 'District': 'district', 'Market': 'market',
            'Commodity': 'commodity', 'Variety': 'variety', 'Grade': 'grade',
            'Arrival_Date': 'arrival_date', 'Min_Price': 'min_price',
            'Max_Price': 'max_price', 'Modal_Price': 'modal_price',
            'Commodity_Code': 'commodity_code'
        })
        
        chunk['arrival_date'] = pd.to_datetime(chunk['arrival_date']).dt.date
        
        # Filter to only new records
        if cutoff_date:
            chunk = chunk[chunk['arrival_date'] > cutoff_date]
        
        if len(chunk) == 0:
            continue
        
        # Insert into market_prices
        rows_market = chunk[[
            'state', 'district', 'market', 'commodity', 'variety', 'grade',
            'arrival_date', 'min_price', 'max_price', 'modal_price', 'commodity_code'
        ]].to_records(index=False)
        
        before_count = conn.total_changes
        cursor.executemany(sql_market, rows_market)
        conn.commit()
        after_count = conn.total_changes
        
        chunk_inserted = after_count - before_count
        total_inserted += chunk_inserted
        total_processed += len(rows_market)
        
        # Create aggregated data for state_daily_prices
        agg_data = chunk.groupby(['state', 'commodity', 'arrival_date'])['modal_price'].mean().reset_index()
        agg_data.columns = ['state', 'commodity', 'arrival_date', 'avg_modal_price']
        
        rows_agg = agg_data.to_records(index=False)
        cursor.executemany(sql_agg, rows_agg)
        conn.commit()
        
        logging.info(f"Processed chunk: {len(rows_market):,} rows, inserted: {chunk_inserted:,}")
    
    conn.close()
    logging.info(f"Incremental ingestion complete: {total_processed:,} processed, {total_inserted:,} new records inserted")
    return total_inserted

def rebuild_persistence_tables():
    """Rebuild the persistence tables for forecasting (Option A - full rebuild)"""
    logging.info("Rebuilding persistence tables for forecasting...")
    
    conn = get_connection(timeout=300)  # 5 minute timeout
    cursor = conn.cursor()
    
    try:
        # Step 1: Create state_30d_avg (rolling 30-day averages)
        logging.info("Creating state_30d_avg...")
        start_time = time.time()
        
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
        
        count = cursor.execute("SELECT COUNT(*) FROM state_30d_avg").fetchone()[0]
        elapsed = time.time() - start_time
        logging.info(f"✅ state_30d_avg created: {count:,} records in {elapsed:.1f}s")
        
        # Step 2: Create state_30d_trends
        logging.info("Creating state_30d_trends...")
        start_time = time.time()
        
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
        
        count = cursor.execute("SELECT COUNT(*) FROM state_30d_trends").fetchone()[0]
        elapsed = time.time() - start_time
        logging.info(f"✅ state_30d_trends created: {count:,} records in {elapsed:.1f}s")
        
        # Step 3: Create crop_trend_persistence
        logging.info("Creating crop_trend_persistence...")
        start_time = time.time()
        
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
        
        # Apply safe defaults
        cursor.execute("""
            UPDATE crop_trend_persistence
            SET persistence_score = 0.5
            WHERE persistence_score IS NULL
               OR sample_size < 20
        """)
        conn.commit()
        
        count = cursor.execute("SELECT COUNT(*) FROM crop_trend_persistence").fetchone()[0]
        updated = conn.total_changes
        elapsed = time.time() - start_time
        logging.info(f" [OK] crop_trend_persistence created: {count:,} records, {updated:,} defaults applied in {elapsed:.1f}s")
        
        logging.info(" [OK] All persistence tables rebuilt successfully!")
        
    except Exception as e:
        logging.error(f"Error rebuilding persistence tables: {e}")
        raise
    finally:
        conn.close()

def cleanup_temp_files():
    """Clean up temporary downloaded files"""
    if TEMP_DIR.exists():
        try:
            shutil.rmtree(TEMP_DIR)
            logging.info("Temporary files cleaned up")
        except Exception as e:
            logging.warning(f"Could not clean up temp files: {e}")

def record_update_metadata(records_added: int):
    """Record metadata about this update"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Create metadata table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS update_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                update_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                records_added INTEGER,
                latest_data_date DATE,
                notes TEXT
            )
        """)
        
        # Get latest data date
        latest_date = cursor.execute("SELECT MAX(arrival_date) FROM state_daily_prices").fetchone()[0]
        
        # Insert update record
        cursor.execute("""
            INSERT INTO update_log (records_added, latest_data_date, notes)
            VALUES (?, ?, ?)
        """, (records_added, latest_date, f"Automated daily update"))
        
        conn.commit()
        conn.close()
        logging.info(f"Update metadata recorded: {records_added:,} records added, latest date: {latest_date}")
        
    except Exception as e:
        logging.error(f"Error recording update metadata: {e}")

def main():
    """Main update process"""
    logger = setup_logging()
    logger.info("="*60)
    logger.info("MARKET DATA DAILY UPDATE STARTED")
    logger.info("="*60)
    
    start_time = time.time()
    dry_run = "--dry-run" in sys.argv
    force_update = "--force" in sys.argv
    
    try:
        # Step 1: Check current database state
        latest_db_date = get_latest_db_date()
        logger.info(f"Latest data in DB: {latest_db_date}")
        
        # Step 2: Check if Kaggle dataset has updates
        dataset_updated, update_info = check_kaggle_dataset_updated()
        logger.info(f"Kaggle dataset status: {update_info}")
        
        if not force_update and latest_db_date:
            # Check if we need to update (simple date comparison)
            latest_db = pd.to_datetime(latest_db_date).date()
            yesterday = (datetime.now() - timedelta(days=1)).date()
            
            if latest_db >= yesterday:
                logger.info(f"Database is current (latest: {latest_db}). No update needed.")
                logger.info("Use --force to override this check.")
                return
        
        # Step 3: Download latest data
        logger.info("Downloading latest market data from Kaggle...")
        csv_path = download_latest_data()
        
        if not csv_path:
            logger.error("Failed to download data. Exiting.")
            return
        
        # Step 4: Count new records
        new_records_count = get_new_records_count(csv_path, latest_db_date)
        logger.info(f"New records available: {new_records_count:,}")
        
        if new_records_count == 0:
            logger.info("No new records to process.")
            cleanup_temp_files()
            return
        
        if dry_run:
            logger.info("DRY RUN: Would process {new_records_count:,} new records")
            cleanup_temp_files()
            return
        
        # Step 5: Ingest new data
        logger.info(f"Starting incremental ingestion of {new_records_count:,} new records...")
        records_inserted = ingest_incremental_data(csv_path, latest_db_date)
        
        # Step 6: Rebuild persistence tables
        if records_inserted > 0:
            logger.info("New data inserted. Rebuilding persistence tables...")
            rebuild_persistence_tables()
            
            # Step 7: Record update metadata
            record_update_metadata(records_inserted)
        
        # Step 8: Cleanup
        cleanup_temp_files()
        
        total_time = time.time() - start_time
        logger.info("="*60)
        logger.info("UPDATE COMPLETED SUCCESSFULLY!")
        logger.info(f"Records processed: {records_inserted:,}")
        logger.info(f"Total time: {total_time/60:.1f} minutes")
        logger.info("="*60)
        
    except Exception as e:
        logger.error(f"Update failed with error: {e}")
        logger.exception("Full traceback:")
        cleanup_temp_files()
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ["-h", "--help"]:
        print(__doc__)
        sys.exit(0)
    
    main()