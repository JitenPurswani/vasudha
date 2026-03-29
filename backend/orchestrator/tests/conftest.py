import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


# Ensure project root is on sys.path so `backend.orchestrator` can be imported
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.orchestrator.main import app


@pytest.fixture(scope="session")
def client():
    """Synchronous TestClient for orchestrator integration tests."""
    return TestClient(app)


@pytest.fixture(autouse=True)
def _patch_agent_urls(monkeypatch):
    """Patch agent URLs to dummy hosts so HTTP mocks can intercept them.

    We deliberately point to unique base URLs per agent so respx can
    register clear route patterns without colliding with real services.
    """
    monkeypatch.setenv("WEATHER_AGENT_URL", "http://weather-agent.test")
    monkeypatch.setenv("SOIL_AGENT_URL", "http://soil-agent.test")
    monkeypatch.setenv("RECOMMENDATION_AGENT_URL", "http://recommendation-agent.test")
    monkeypatch.setenv("MARKET_AGENT_URL", "http://market-agent.test")
    monkeypatch.setenv("SUSTAINABILITY_AGENT_URL", "http://sustainability-agent.test")
    monkeypatch.setenv("XAI_AGENT_URL", "http://xai-agent.test")
    monkeypatch.setenv("FERTILIZER_AGENT_URL", "http://fertilizer-agent.test")

    # Also patch module-level constants if already imported
    import importlib
    orchestrator_main = importlib.import_module("backend.orchestrator.main")
    orchestrator_main.WEATHER_AGENT_URL = os.getenv("WEATHER_AGENT_URL")
    orchestrator_main.SOIL_AGENT_URL = os.getenv("SOIL_AGENT_URL")
    orchestrator_main.RECOMMENDATION_AGENT_URL = os.getenv("RECOMMENDATION_AGENT_URL")
    orchestrator_main.MARKET_AGENT_URL = os.getenv("MARKET_AGENT_URL")
    orchestrator_main.SUSTAINABILITY_AGENT_URL = os.getenv("SUSTAINABILITY_AGENT_URL")
    orchestrator_main.XAI_AGENT_URL = os.getenv("XAI_AGENT_URL")
    orchestrator_main.FERTILIZER_AGENT_URL = os.getenv("FERTILIZER_AGENT_URL")

def pytest_configure(config):
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )