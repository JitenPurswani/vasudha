import sys
from pathlib import Path
import pandas as pd
import sqlite3

# Fix import path
BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BASE_DIR))

from db.database import get_connection

BASE_PROJECT_DIR = Path(__file__).resolve().parents[4]
RAW_DATA_DIR = BASE_PROJECT_DIR / "data" / "market" / "raw"

CHUNK_SIZE = 50_000  # safe for SQLite


REQUIRED_COLUMNS = {
    "State", "District", "Market", "Commodity", "Variety", "Grade",
    "Arrival_Date", "Min_Price", "Max_Price", "Modal_Price", "Commodity_Code"
}


def ingest_csv(csv_path: Path):
    print(f"\nIngesting {csv_path.name} ...")

    conn = get_connection()
    cur = conn.cursor()

    sql = """
    INSERT OR IGNORE INTO market_prices (
        state, district, market,
        commodity, variety, grade,
        arrival_date, min_price, max_price,
        modal_price, commodity_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    total_inserted = 0
    total_rows = 0

    for chunk in pd.read_csv(csv_path, chunksize=CHUNK_SIZE):
        missing = REQUIRED_COLUMNS - set(chunk.columns)
        if missing:
            raise ValueError(f"Missing columns in {csv_path.name}: {missing}")

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

        rows = chunk[[
            "state", "district", "market",
            "commodity", "variety", "grade",
            "arrival_date", "min_price", "max_price",
            "modal_price", "commodity_code"
        ]].to_records(index=False)

        before = conn.total_changes
        cur.executemany(sql, rows)
        conn.commit()
        after = conn.total_changes

        inserted = after - before
        total_inserted += inserted
        total_rows += len(rows)

        print(f"  chunk processed | rows={len(rows)} | inserted={inserted}")

    conn.close()

    print(
        f"Finished {csv_path.name} | total_rows={total_rows} | inserted={total_inserted}"
    )


def ingest_all():
    for csv in sorted(RAW_DATA_DIR.glob("*.csv")):
        ingest_csv(csv)


if __name__ == "__main__":
    ingest_all()
