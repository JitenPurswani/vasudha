import os
import sqlite3

import pytest

import main
import market_logic


def test_market_logic_uses_configured_db_path(temp_market_db):  # noqa: ARG001
    """market_logic should be wired to the patched DB_PATH used in tests."""

    assert os.path.exists(market_logic.DB_PATH)
    result = market_logic.evaluate_market_logic("Wheat", "Maharashtra")
    assert result is not None


def test_debug_info_endpoint_handles_missing_table(monkeypatch, tmp_path):
    """/market/debug should raise a clear error if the expected table is missing.

    This verifies that our DB access code fails in a controlled way when the
    schema is not present.
    """

    # Create an empty DB without the expected table
    db_path = tmp_path / "empty.sqlite"
    conn = sqlite3.connect(db_path)
    conn.commit()
    conn.close()

    monkeypatch.setattr(main, "DB_PATH", str(db_path), raising=False)

    from fastapi.testclient import TestClient

    client = TestClient(main.app)

    # The endpoint will likely raise an exception due to missing table; we assert 500.
    resp = client.get("/market/debug")
    assert resp.status_code == 500 or resp.status_code == 400


def test_get_market_data_uses_metadata_table(monkeypatch, tmp_path):
    """get_market_data should query the market_metadata table for dropdown values."""

    # Build a minimal DB with just market_metadata
    db_dir = tmp_path
    db_path = db_dir / "metadata.sqlite"

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE market_metadata (
            state TEXT,
            market TEXT,
            commodity TEXT
        )
        """
    )
    cur.executemany(
        """
        INSERT INTO market_metadata (state, market, commodity)
        VALUES (?, ?, ?)
        """,
        [
            ("Maharashtra", "Pune", "Wheat"),
            ("Maharashtra", "Pune", "Rice"),
            ("Karnataka", "Bengaluru", "Wheat"),
        ],
    )
    conn.commit()
    conn.close()

    # Patch get_connection used inside main.get_market_data to use this DB
    def fake_get_connection():
        return sqlite3.connect(db_path)

    monkeypatch.setattr(main, "get_connection", fake_get_connection, raising=False)

    from fastapi.testclient import TestClient

    client = TestClient(main.app)

    resp = client.get("/market/data")
    assert resp.status_code == 200
    data = resp.json()

    assert "Maharashtra" in data["states"]
    assert "Karnataka" in data["states"]
    assert "Pune" in data["apmcs_by_state"]["Maharashtra"]
    assert "Bengaluru" in data["apmcs_by_state"]["Karnataka"]
    assert "Wheat" in data["commodities_by_apmc"]["Pune"]
