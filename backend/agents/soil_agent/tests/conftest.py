from pathlib import Path
import sqlite3
import sys

import pytest
from fastapi.testclient import TestClient


# Ensure the soil_agent service directory (one level up from tests/) is on sys.path
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import main  # noqa: E402  (after sys.path tweak)


@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient bound to the soil agent app."""
    return TestClient(main.app)


@pytest.fixture(scope="session")
def temp_soil_db(tmp_path_factory):
    """Create a temporary SQLite DB with a minimal soil_data table for tests."""
    db_path = tmp_path_factory.mktemp("soil_db") / "soil_test.sqlite"

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE soil_data (
            District TEXT,
            Region TEXT,
            N_avg REAL,
            P_avg REAL,
            K_avg REAL,
            pH_avg REAL
        )
        """
    )
    # Insert one known district/state row with reasonable values
    cursor.execute(
        """
        INSERT INTO soil_data (District, Region, N_avg, P_avg, K_avg, pH_avg)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        ("Pune", "Maharashtra", 120.0, 40.0, 80.0, 6.8),
    )
    conn.commit()
    conn.close()

    return db_path


@pytest.fixture(autouse=True)
def patch_soil_db(monkeypatch, temp_soil_db):
    """Point the soil agent at the temporary soil DB for each test."""
    monkeypatch.setattr(main, "DB_PATH", str(temp_soil_db), raising=False)
    monkeypatch.setattr(main, "TABLE_NAME", "soil_data", raising=False)


@pytest.fixture
def clean_soil_table(temp_soil_db):
    """Example hook to extend per-test soil DB seeding if needed later."""
    # Currently we maintain a fixed single-row dataset
    yield
