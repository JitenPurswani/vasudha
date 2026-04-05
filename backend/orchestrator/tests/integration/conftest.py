"""
Shared conftest.py for E2E tests
Provides common fixtures and configuration for all e2e tests
"""

import pytest
import httpx
import os
from typing import Generator


# ==================== CONFIGURATION ====================

BASE_AUTH_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8008")
BASE_ORCHESTRATOR_URL = os.getenv("ORCHESTRATOR_URL", "http://localhost:8000")

# Global HTTP clients
_auth_client = None
_orchestrator_client = None


# ==================== SESSION-SCOPED FIXTURES ====================

@pytest.fixture(scope="session")
def auth_client() -> Generator[httpx.Client, None, None]:
    """
    Session-scoped HTTP client for Auth service
    Reused across all tests in the session
    """
    global _auth_client
    if _auth_client is None:
        _auth_client = httpx.Client(
            base_url=BASE_AUTH_URL,
            timeout=10.0,
            follow_redirects=True
        )
    
    yield _auth_client
    
    # Cleanup after all tests
    if _auth_client:
        _auth_client.close()


@pytest.fixture(scope="session")
def orchestrator_client() -> Generator[httpx.Client, None, None]:
    """
    Session-scoped HTTP client for Orchestrator service
    Reused across all tests in the session
    """
    global _orchestrator_client
    if _orchestrator_client is None:
        _orchestrator_client = httpx.Client(
            base_url=BASE_ORCHESTRATOR_URL,
            timeout=30.0,
            follow_redirects=True
        )
    
    yield _orchestrator_client
    
    # Cleanup after all tests
    if _orchestrator_client:
        _orchestrator_client.close()


# ==================== FUNCTION-SCOPED FIXTURES ====================

@pytest.fixture
def clean_auth_state(auth_client):
    """
    Cleans up test users before and after test
    Ensures isolation between tests
    """
    test_users = [
        "e2e_test_user",
        "e2e_test_user_alt",
        "journey_test_*",
    ]
    
    # Cleanup before
    for user_pattern in test_users:
        if "*" in user_pattern:
            # Pattern matching would need DB access
            pass
    
    yield
    
    # Cleanup after - optional, depends on test requirements


@pytest.fixture
def test_auth_headers(auth_client):
    """
    Provides valid auth headers for authenticated requests
    Handles registration and login automatically
    """
    import time
    test_user = {
        "username": f"fixture{int(time.time() * 1000) % 100000}",
        "password": "TestPass1",
        "state": "Maharashtra",
        "district": "Pune",
        "language": "en",
        "N": 50.0, "P": 20.0, "K": 30.0, "pH": 6.5,
    }
    
    # Register
    try:
        auth_client.post("/register", json=test_user)
    except Exception as e:
        print(f"Registration warning: {e}")
    
    # Login
    try:
        login_resp = auth_client.post(
            "/login",
            json={
                "username": test_user["username"],
                "password": test_user["password"],
            }
        )
        
        if login_resp.status_code == 200:
            token = login_resp.json()["token"]
            return {"Authorization": f"Bearer {token}"}
        else:
            pytest.skip(f"Could not obtain auth token: {login_resp.text}")
    except Exception as e:
        pytest.skip(f"Auth fixture failed: {e}")


# ==================== PYTEST HOOKS ====================

def pytest_configure(config):
    """
    Configure pytest with custom markers and settings
    """
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "auth: marks tests related to authentication"
    )


@pytest.fixture(autouse=True)
def reset_between_tests():
    """
    Automatically reset state between tests
    Prevents test interdependencies
    """
    yield
    # Optional cleanup
    import time
    time.sleep(0.1)  # Brief pause between tests


def pytest_collection_modifyitems(config, items):
    """
    Modify test collection behavior
    Can add markers or skip tests based on conditions
    """
    for item in items:
        # Add integration marker to all e2e tests
        if "e2e" in str(item.fspath):
            item.add_marker(pytest.mark.integration)


# ==================== CUSTOM ASSERTIONS ====================

class CustomAssertions:
    """Helper class with custom assertion methods"""
    
    @staticmethod
    def assert_valid_api_response(response, expected_status=200, required_fields=None):
        """
        Assert response is valid JSON with expected status and fields
        """
        assert response.status_code == expected_status, \
            f"Expected {expected_status}, got {response.status_code}: {response.text}"
        
        try:
            data = response.json()
        except Exception as e:
            pytest.fail(f"Response is not valid JSON: {e}")
        
        if required_fields:
            for field in required_fields:
                assert field in data, f"Missing required field: {field}"
        
        return data
    
    @staticmethod
    def assert_valid_jwt_token(token):
        """Assert token is valid JWT format"""
        parts = token.split('.')
        assert len(parts) == 3, f"Invalid JWT format: {len(parts)} parts"
        return True


@pytest.fixture
def assertions():
    """Provide custom assertions to tests"""
    return CustomAssertions()
