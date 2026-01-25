import sqlite3
from config import Config

def get_connection():
    conn = sqlite3.connect(Config.DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row 
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            state_key TEXT,
            district_key TEXT,
            language TEXT,
            n_val REAL,
            p_val REAL,
            k_val REAL,
            ph_val REAL,
            created_at DATETIME DEFAULT (datetime('now', 'utc'))
        )
    """)
    conn.commit()
    conn.close()