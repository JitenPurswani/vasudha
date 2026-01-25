import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[4]  
DB_PATH = BASE_DIR / "data" / "market" / "sqlite" / "market.db"


def get_connection():
    """
    Returns a SQLite connection with row access by column name.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """
    Sanity check to ensure DB is reachable.
    Tables are created via schema.sql, not here.
    """
    try:
        conn = get_connection()
        conn.execute("SELECT 1")
        conn.close()
    except Exception as e:
        raise RuntimeError(f"Database initialization failed: {e}")
