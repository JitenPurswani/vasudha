import pandas as pd
from pathlib import Path
import sqlite3

from db.database import get_connection

# Adjust if your raw CSVs live elsewhere
BASE_DIR = Path(__file__).resolve().parents[4]
RAW_DATA_DIR = BASE_DIR / "data" / "market" / "raw"


REQUIRED_COLUMNS = {
    "State", "District", "Market", "Commodity", "Variety", "Grade",
    "Arrival_Date", "Min_Price", "Max_Price", "Modal_Price", "Commodity_Code"
}


def ingest_csv(csv_path: Path) -> dict:
    df = pd.read_csv(csv_path)

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns in {csv_path.name}: {missing}")

    # Normalize column names to DB schema
    df = df.rename(columns={
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

    # Clean types
    df["arrival_date"] = pd.to_datetime(df["arrival_date"]).dt.date

    rows = df[[
        "state", "district", "market",
        "commodity", "variety", "grade",
        "arrival_date", "min_price", "max_price",
        "modal_price", "commodity_code"
    ]].to_records(index=False)

    inserted = 0
    skipped = 0

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

    before = conn.total_changes
    cur.executemany(sql, rows)
    conn.commit()
    after = conn.total_changes

    inserted = after - before
    skipped = len(rows) - inserted

    conn.close()

    return {
        "file": csv_path.name,
        "rows_total": len(rows),
        "inserted": inserted,
        "skipped_duplicates": skipped,
    }


def ingest_all():
    results = []
    for csv in RAW_DATA_DIR.glob("*.csv"):
        results.append(ingest_csv(csv))
    return results


if __name__ == "__main__":
    res = ingest_all()
    for r in res:
        print(r)
