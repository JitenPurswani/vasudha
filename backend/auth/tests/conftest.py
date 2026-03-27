from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient


# Ensure the auth service directory (one level up from tests/) is on sys.path
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from config import Config
from database import init_db
from main import app


@pytest.fixture(scope="session")
def test_db_path(tmp_path_factory):
    """Create a temporary SQLite database file path for tests."""
    db_file = tmp_path_factory.mktemp("auth_db") / "users_test.db"
    return db_file


@pytest.fixture(autouse=True, scope="session")
def _configure_test_database(test_db_path):
    """Point Config.DATABASE_PATH at the temp DB and initialize schema once."""
    # Monkeypatch the Config class attribute so all connections use the temp DB
    Config.DATABASE_PATH = str(test_db_path)
    # Ensure directory exists
    Path(Config.DATABASE_PATH).parent.mkdir(parents=True, exist_ok=True)
    # Initialize schema in the temp DB
    init_db()


@pytest.fixture
def client():
    """FastAPI TestClient bound to the auth app.

    Uses the temporary database configured at session start.
    Each test can freely insert/delete users without affecting production DB.
    """
    return TestClient(app)


@pytest.fixture
def clean_users_table():
    """Ensure the users table is empty before each test that needs a clean slate."""
    from database import get_connection

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users")
    conn.commit()
    conn.close()
    yield
    # Optional: clean again after test in case test inserted rows
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users")
    conn.commit()
    conn.close()
