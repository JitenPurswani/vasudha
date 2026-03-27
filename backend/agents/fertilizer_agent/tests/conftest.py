import os
import sys

import pytest
from fastapi.testclient import TestClient

# Ensure the fertilizer_agent package is importable when tests run from the tests/ folder
CURRENT_DIR = os.path.dirname(__file__)
AGENT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if AGENT_ROOT not in sys.path:
    sys.path.insert(0, AGENT_ROOT)

import main  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    """FastAPI test client for the Fertilizer agent."""

    return TestClient(main.app)
