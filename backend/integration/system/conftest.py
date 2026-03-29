import os
import time
from typing import Generator

import pytest
import httpx


ORCHESTRATOR_URL = os.getenv("ORCHESTRATOR_URL", "http://localhost:8000")
FERTILIZER_AGENT_URL = os.getenv("FERTILIZER_AGENT_URL", "http://localhost:8009")


@pytest.fixture(scope="session")
def base_urls() -> dict:
    """Base URLs for orchestrator and agents under test.

    These default to localhost ports used by the VS Code tasks (Start All Services).
    Override via ORCHESTRATOR_URL / FERTILIZER_AGENT_URL env vars in CI if needed.
    """
    return {
        "orchestrator": ORCHESTRATOR_URL.rstrip("/"),
        "fertilizer_agent": FERTILIZER_AGENT_URL.rstrip("/"),
    }


@pytest.fixture(scope="session")
def http_client() -> Generator[httpx.Client, None, None]:
    """Shared HTTP client for system tests.

    Uses a small timeout because downstream services are expected to be local
    and already running (e.g., via `Start All Services`).
    """
    with httpx.Client(timeout=30.0) as client:
        yield client


@pytest.fixture(scope="session", autouse=True)
def wait_for_services(base_urls: dict) -> None:
    """Basic readiness check so tests fail fast if services are down.

    We only ping the orchestrator root endpoint; if it is not reachable,
    system tests will be skipped with a clear message.
    """
    url = f"{base_urls['orchestrator']}/"
    max_attempts = 5
    last_exc: Exception | None = None

    for _ in range(max_attempts):
        try:
            resp = httpx.get(url, timeout=5.0)
            if resp.status_code == 200:
                return
        except Exception as exc:  # pragma: no cover - only runs when services are down
            last_exc = exc
        time.sleep(1)

    pytest.skip(f"Orchestrator not reachable at {url}: {last_exc}")


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "system: mark test as an system-level integration test"
    )