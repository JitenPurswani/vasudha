from pathlib import Path
import sqlite3
import sys

import pytest
from fastapi.testclient import TestClient


# Ensure the weather_agent service directory (one level up from tests/) is on sys.path
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import main  # noqa: E402  (after sys.path tweak)


@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient bound to the weather agent app."""
    return TestClient(main.app)


@pytest.fixture(scope="session")
def temp_rainfall_db(tmp_path_factory):
    """Create a temporary SQLite DB with a minimal seasonal_rainfall table for tests."""
    db_path = tmp_path_factory.mktemp("rainfall_db") / "rainfall_test.sqlite"

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE seasonal_rainfall (
            District TEXT PRIMARY KEY,
            Avg_Rainfall_Kharif_mm REAL,
            Avg_Rainfall_Rabi_mm REAL,
            Avg_Rainfall_Zaid_mm REAL
        )
        """
    )
    # Insert one known district row
    cursor.execute(
        """
        INSERT INTO seasonal_rainfall
            (District, Avg_Rainfall_Kharif_mm, Avg_Rainfall_Rabi_mm, Avg_Rainfall_Zaid_mm)
        VALUES (?, ?, ?, ?)
        """,
        ("Pune", 800.0, 150.0, 50.0),
    )
    conn.commit()
    conn.close()

    return db_path


@pytest.fixture(autouse=True)
def patch_rainfall_db(monkeypatch, temp_rainfall_db):
    """Point the weather agent at the temporary rainfall DB for each test.

    Uses function-scoped monkeypatch to avoid scope mismatch errors.
    """
    monkeypatch.setattr(main, "DB_PATH", str(temp_rainfall_db), raising=False)
    monkeypatch.setattr(main, "TABLE_NAME", "seasonal_rainfall", raising=False)


@pytest.fixture
def clean_rainfall_table(temp_rainfall_db):
    """(Optional) Example fixture if you need to reset rainfall data per-test later."""
    # For now we keep a fixed single-row dataset; this is a placeholder
    yield
