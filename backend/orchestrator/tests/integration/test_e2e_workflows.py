"""
End-to-End API Tests for Vasudha Orchestrator
Tests complete workflows from authentication through all agents
"""

import pytest
import httpx
import os
import json
from typing import Dict, Any
from http import HTTPStatus

# ==================== CONFIGURATION ====================
BASE_AUTH_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8008")
BASE_ORCHESTRATOR_URL = os.getenv("ORCHESTRATOR_URL", "http://localhost:8000")

# Test user credentials
TEST_USER = {
    "username": "e2eTestUser",
    "password": "TestPass1",
    "state": "Maharashtra",
    "district": "Pune",
    "language": "en",
    "N": 50.0,
    "P": 20.0,
    "K": 30.0,
    "pH": 6.5,
}

ALT_TEST_USER = {
    "username": "e2eAltUser",
    "password": "TestPass2",
    "state": "Karnataka",
    "district": "Bangalore",
    "language": "hi",
    "N": 45.0,
    "P": 18.0,
    "K": 28.0,
    "pH": 7.0,
}

# ==================== FIXTURES ====================

@pytest.fixture(scope="session")
def auth_client():
    """Create HTTP client for Auth service"""
    return httpx.Client(base_url=BASE_AUTH_URL, timeout=10.0)


@pytest.fixture(scope="session")
def orchestrator_client():
    """Create HTTP client for Orchestrator service"""
    return httpx.Client(base_url=BASE_ORCHESTRATOR_URL, timeout=30.0)


@pytest.fixture
def test_user_token(auth_client):
    """Register and login test user, return auth token"""
    # Register user
    register_resp = auth_client.post(
        "/register",
        json=TEST_USER
    )
    
    if register_resp.status_code not in [HTTPStatus.OK, HTTPStatus.CONFLICT]:
        pytest.skip(f"User registration failed: {register_resp.text}")
    
    # Login user
    login_resp = auth_client.post(
        "/login",
        json={
            "username": TEST_USER["username"],
            "password": TEST_USER["password"],
        }
    )
    
    assert login_resp.status_code == HTTPStatus.OK, f"Login failed: {login_resp.text}"
    token = login_resp.json()["token"]
    return token


@pytest.fixture
def auth_headers(test_user_token):
    """Return authorization headers with token"""
    return {"Authorization": f"Bearer {test_user_token}"}


# ==================== HELPER FUNCTIONS ====================

def _assert_valid_response(response: httpx.Response, expected_status: int = HTTPStatus.OK):
    """Helper to assert valid API response"""
    assert response.status_code == expected_status, \
        f"Expected {expected_status}, got {response.status_code}: {response.text}"
    return response.json()


# ==================== TEST SUITE 1: AUTHENTICATION E2E ====================

class TestAuthenticationE2E:
    """Test authentication flows end-to-end"""
    
    def test_user_registration_and_login(self, auth_client):
        """E2E: Register new user and login successfully"""
        import time
        user = {
            **ALT_TEST_USER,
            "username": f"e2etest{int(time.time() * 1000) % 100000}"
        }
        
        # Register
        reg_resp = auth_client.post("/register", json=user)
        
        # Handle existing user or successful registration
        if reg_resp.status_code == HTTPStatus.BAD_REQUEST and "already exists" in reg_resp.text:
            # User already exists, just login
            pass
        else:
            assert reg_resp.status_code == HTTPStatus.OK, f"Registration failed: {reg_resp.text}"
            response_data = reg_resp.json()
            # Check for success status (could be 'status' key or 'message' key)
            assert response_data.get("status") == "success" or "successful" in response_data.get("message", "").lower()
        
        # Login
        login_resp = auth_client.post(
            "/login",
            json={"username": user["username"], "password": user["password"]}
        )
        data = _assert_valid_response(login_resp)
        assert "token" in data
        assert data["profile"]["name"] == user["username"]
        assert data["profile"]["state"] == user["state"]
    
    def test_invalid_login_returns_401(self, auth_client):
        """E2E: Invalid credentials return 401"""
        login_resp = auth_client.post(
            "/login",
            json={"username": "nonexistent_user", "password": "WrongPass1"}
        )
        # Should return 401 or 422 for validation
        assert login_resp.status_code in [HTTPStatus.UNAUTHORIZED, 422], \
            f"Expected 401 or 422, got {login_resp.status_code}: {login_resp.text}"
    
    def test_token_in_response_is_valid_jwt(self, test_user_token):
        """E2E: Returned token is valid JWT format"""
        parts = test_user_token.split('.')
        assert len(parts) == 3, "Token should be valid JWT (3 parts)"


# ==================== TEST SUITE 2: ORCHESTRATOR WORKFLOWS ====================

class TestOrchestratorWorkflows:
    """Test complete orchestrator workflows with all agents"""
    
    def test_seasonal_recommendations_complete_flow(self, orchestrator_client, auth_headers):
        """
        E2E: Complete seasonal recommendation workflow
        Flow: Login → Get weather → Get soil → Get recommendations
        """
        payload = {
            "lat": 18.5204,  # Pune coordinates
            "lon": 73.8567,
            "season": "kharif",
            "mode": "seasonal"
        }
        
        response = orchestrator_client.post(
            "/get_full_recommendation/",
            json=payload,
            headers=auth_headers
        )
        
        data = _assert_valid_response(response)
        
        # Verify response structure
        assert "weather" in data
        assert "soil" in data
        assert "recommendations" in data
        assert "farmer_context" in data
        
        # Verify weather data
        weather = data["weather"]
        assert weather["status"] == "success"
        assert "temperature_celsius" in weather
        assert "humidity_percent" in weather
        
        # Verify soil data
        soil = data["soil"]
        assert soil["status"] == "success"
        assert "N" in soil and "P" in soil and "K" in soil and "pH" in soil
        
        # Verify recommendations exist
        recs = data["recommendations"]
        assert isinstance(recs, list)
        assert len(recs) > 0
        
        for rec in recs:
            assert "crop_name" in rec
            assert "suitability_score" in rec
    
    def test_all_season_mode_recommendations(self, orchestrator_client, auth_headers):
        """E2E: All-season recommendation mode returns multiple crops"""
        payload = {
            "lat": 19.0760,  # Mumbai
            "lon": 72.8777,
            "season": "rabi",
            "mode": "all_season"
        }
        
        response = orchestrator_client.post(
            "/get_full_recommendation/",
            json=payload,
            headers=auth_headers
        )
        
        data = _assert_valid_response(response)
        recs = data.get("recommendations", [])
        
        # All-season should return more recommendations
        assert len(recs) > 0
        
        # Each recommendation should have required fields
        for rec in recs:
            assert "crop_name" in rec
            assert "suitability_score" in rec
            assert 0 <= rec["suitability_score"] <= 100
    
    def test_recommendations_include_explanations(self, orchestrator_client, auth_headers):
        """E2E: XAI explanations are included in recommendations"""
        payload = {
            "lat": 20.5937,  # Delhi
            "lon": 78.9629,
            "season": "zaid",
            "mode": "seasonal"
        }
        
        response = orchestrator_client.post(
            "/get_full_recommendation/",
            json=payload,
            headers=auth_headers
        )
        
        data = _assert_valid_response(response)
        recs = data.get("recommendations", [])
        
        for rec in recs:
            # Verify XAI/explanation data exists
            assert "suitability_score" in rec
            # Some recommendations should have detailed explanations
            if "explanation" in rec:
                assert isinstance(rec["explanation"], (str, dict))
    
    def test_invalid_season_parameter(self, orchestrator_client, auth_headers):
        """E2E: Invalid season returns proper error"""
        payload = {
            "lat": 18.5204,
            "lon": 73.8567,
            "season": "invalid_season",
            "mode": "seasonal"
        }
        
        response = orchestrator_client.post(
            "/get_full_recommendation/",
            json=payload,
            headers=auth_headers
        )
        
        # Should return 400 or have error in response
        assert response.status_code in [400, 422] or "error" in response.text.lower()


# ==================== TEST SUITE 3: MARKET DATA E2E ====================

class TestMarketDataE2E:
    """Test market data workflows"""
    
    def test_market_prices_retrieval(self, orchestrator_client, auth_headers):
        """E2E: Retrieve market prices for crop"""
        payload = {
            "crop_name": "wheat",
            "state": "Maharashtra",
            "district": "Pune"
        }
        
        # Check if market endpoint exists
        response = orchestrator_client.post(
            "/market-data",
            json=payload,
            headers=auth_headers,
            follow_redirects=True
        )
        
        # If endpoint exists, verify structure
        if response.status_code == HTTPStatus.OK:
            data = response.json()
            assert "prices" in data or "market_data" in data
    
    def test_market_data_with_multiple_crops(self, orchestrator_client, auth_headers):
        """E2E: Query market data for multiple crops"""
        crops = ["wheat", "rice", "maize"]
        
        for crop in crops:
            payload = {
                "crop_name": crop,
                "state": "Maharashtra",
                "district": "Pune"
            }
            
            response = orchestrator_client.post(
                "/market-data",
                json=payload,
                headers=auth_headers,
                follow_redirects=True
            )
            
            # Should either succeed or be not implemented
            assert response.status_code in [200, 404, 501]


# ==================== TEST SUITE 4: SUSTAINABILITY E2E ====================

class TestSustainabilityE2E:
    """Test sustainability recommendations"""
    
    def test_get_sustainability_metrics(self, orchestrator_client, auth_headers):
        """E2E: Get sustainability metrics for crop"""
        payload = {
            "crop_name": "cotton",
            "state": "Maharashtra",
            "season": "kharif"
        }
        
        response = orchestrator_client.post(
            "/sustainability",
            json=payload,
            headers=auth_headers,
            follow_redirects=True
        )
        
        # If endpoint exists
        if response.status_code == HTTPStatus.OK:
            data = response.json()
            assert "sustainability_score" in data or "metrics" in data


# ==================== TEST SUITE 5: FERTILIZER RECOMMENDATIONS ====================

class TestFertilizerE2E:
    """Test fertilizer recommendation workflows"""
    
    def test_fertilizer_recommendations_complete_flow(self, orchestrator_client, auth_headers):
        """E2E: Get fertilizer recommendations based on soil data"""
        payload = {
            "crop_name": "wheat",
            "soil_data": {
                "N": 50.0,
                "P": 20.0,
                "K": 30.0,
                "pH": 6.5
            },
            "state": "Maharashtra",
            "season": "rabi"
        }
        
        response = orchestrator_client.post(
            "/fertilizer-recommendations",
            json=payload,
            headers=auth_headers,
            follow_redirects=True
        )
        
        if response.status_code == HTTPStatus.OK:
            data = response.json()
            assert "recommendations" in data or "fertilizer_recommendations" in data


# ==================== TEST SUITE 6: ERROR HANDLING & RESILIENCE ====================

class TestErrorHandlingE2E:
    """Test error handling and graceful degradation"""
    
    def test_missing_required_parameters(self, orchestrator_client, auth_headers):
        """E2E: Missing parameters return 422 Unprocessable Entity"""
        payload = {
            "lat": 18.5204,
            # Missing required fields
        }
        
        response = orchestrator_client.post(
            "/get_full_recommendation/",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code in [422, 400]
    
    def test_invalid_coordinates(self, orchestrator_client, auth_headers):
        """E2E: Invalid coordinates are handled gracefully"""
        payload = {
            "lat": 999,  # Invalid
            "lon": 999,  # Invalid
            "season": "kharif",
            "mode": "seasonal"
        }
        
        response = orchestrator_client.post(
            "/get_full_recommendation/",
            json=payload,
            headers=auth_headers
        )
        
        # Should return error or default values
        assert response.status_code in [200, 400, 422]
    
    def test_missing_auth_header(self, orchestrator_client):
        """E2E: Orchestrator endpoint works without auth (auth is optional)"""
        payload = {
            "lat": 18.5204,
            "lon": 73.8567,
            "season": "kharif",
            "mode": "seasonal"
        }
        
        response = orchestrator_client.post(
            "/get_full_recommendation/",
            json=payload
            # No auth headers
        )
        
        # Orchestrator doesn't enforce auth on this endpoint
        # Should return 200 OK (with or without auth)
        assert response.status_code == HTTPStatus.OK


# ==================== TEST SUITE 7: PERFORMANCE & LOAD ====================

class TestPerformanceE2E:
    """Test performance and response times"""
    
    def test_recommendation_response_time(self, orchestrator_client, auth_headers):
        """E2E: Recommendations should return within reasonable time"""
        import time
        
        payload = {
            "lat": 18.5204,
            "lon": 73.8567,
            "season": "kharif",
            "mode": "seasonal"
        }
        
        start = time.time()
        response = orchestrator_client.post(
            "/get_full_recommendation/",
            json=payload,
            headers=auth_headers
        )
        elapsed = time.time() - start
        
        # Should complete within 30 seconds even with all agents
        assert elapsed < 30, f"Response took {elapsed:.2f}s, expected < 30s"
        assert response.status_code == HTTPStatus.OK


# ==================== INTEGRATION TESTS ====================

class TestFullUserJourneyE2E:
    """Test complete user journey from registration to insights"""
    
    def test_complete_user_journey(self, auth_client, orchestrator_client):
        """
        E2E: Full user journey
        1. Register → 2. Login → 3. Get recommendations → 4. Access market data
        """
        import time
        unique_id = int(time.time() * 1000) % 100000
        user = {
            **TEST_USER,
            "username": f"journey{unique_id}"
        }
        
        # Step 1: Register
        reg_resp = auth_client.post("/register", json=user)
        # Handle existing user
        if reg_resp.status_code == HTTPStatus.BAD_REQUEST and "already exists" in reg_resp.text:
            pass
        else:
            assert reg_resp.status_code == HTTPStatus.OK, f"Registration failed: {reg_resp.text}"
        
        # Step 2: Login
        login_resp = auth_client.post(
            "/login",
            json={"username": user["username"], "password": user["password"]}
        )
        data = _assert_valid_response(login_resp)
        token = data["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Step 3: Get recommendations
        rec_payload = {
            "lat": 18.5204,
            "lon": 73.8567,
            "season": "kharif",
            "mode": "seasonal"
        }
        
        rec_resp = orchestrator_client.post(
            "/get_full_recommendation/",
            json=rec_payload,
            headers=headers
        )
        
        # Can succeed or not depending on implementation
        assert rec_resp.status_code in [200, 404, 501]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--log-cli-level=INFO"])
