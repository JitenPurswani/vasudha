# Vasudha Backend Testing Guide

## Overview
This guide covers running the backend API E2E tests for the Vasudha orchestrator and microservices architecture.

---

## Prerequisites

### Required Services
- **Auth Service** (port 8008): User registration/login
- **Orchestrator** (port 8000): Main API
- **Agent Services**: Weather, Soil, Recommendation, Market, XAI, Sustainability, Fertilizer, Climate Adaptation
- **All on their respective ports** (8001-8009)

### Python Environment
```powershell
cd c:\vasudha-project\backend\orchestrator
pip install -r requirements.txt
pip install pytest-asyncio httpx
```

---

## Quick Start

### 1. Start All Backend Services

**Option A: Using VS Code Task**
```
Press Ctrl+Shift+B (or use VS Code Task menu)
Select "Start All Services"
Wait for "Server started" messages on each service
```

**Option B: Manual Start**
```powershell
# Terminal 1: Auth Service
cd c:\vasudha-project\backend\auth
.\venv\Scripts\Activate.ps1
uvicorn main:app --port 8008 --host 0.0.0.0

# Terminal 2: Orchestrator
cd c:\vasudha-project\backend\orchestrator
.\venv\Scripts\Activate.ps1
uvicorn main:app --port 8000 --host 0.0.0.0

# Terminal 3+: Start all agents (weather, soil, recommendation, etc.)
# Follow same pattern for each agent service
```

### 2. Run Backend Tests

```powershell
cd c:\vasudha-project\backend\orchestrator

# Run all tests
pytest tests/integration/test_e2e_workflows.py -v --log-cli-level=INFO

# Run specific test suite
pytest tests/integration/test_e2e_workflows.py::TestAuthenticationE2E -v

# Run with detailed output
pytest tests/integration/test_e2e_workflows.py -v -s --log-cli-level=DEBUG
```

---

## Test Suites

### TestAuthenticationE2E
Tests user registration, login, and JWT token validation.

**Run:**
```powershell
pytest tests/integration/test_e2e_workflows.py::TestAuthenticationE2E -v
```

**Tests:**
- `test_user_registration_and_login` - User can register and login
- `test_invalid_login_returns_401` - Invalid credentials return 401
- `test_token_in_response_is_valid_jwt` - Response contains valid JWT token

### TestOrchestratorWorkflows
Tests orchestrator recommendation workflows with different seasonal modes.

**Run:**
```powershell
pytest tests/integration/test_e2e_workflows.py::TestOrchestratorWorkflows -v
```

**Tests:**
- `test_seasonal_recommendations_complete_flow` - Seasonal mode recommendations
- `test_all_season_mode_recommendations` - All-season recommendations
- `test_recommendations_include_explanations` - XAI explanations included

### TestErrorHandlingE2E
Tests error handling for invalid inputs and missing parameters.

**Run:**
```powershell
pytest tests/integration/test_e2e_workflows.py::TestErrorHandlingE2E -v
```

**Tests:**
- Missing required parameters (coordinates, language, etc.)
- Invalid coordinates
- Missing authentication header

### TestFullUserJourneyE2E
Complete workflow: register → login → get recommendations

**Run:**
```powershell
pytest tests/integration/test_e2e_workflows.py::TestFullUserJourneyE2E -v
```

---

## Running Specific Tests

```powershell
# Single test
pytest tests/integration/test_e2e_workflows.py::TestAuthenticationE2E::test_user_registration_and_login -v

# Multiple tests by pattern
pytest tests/integration/test_e2e_workflows.py -k "authentication" -v

# Show print statements
pytest tests/integration/test_e2e_workflows.py -v -s

# Generate HTML report
pytest tests/integration/test_e2e_workflows.py --html=report.html --self-contained-html
```

---

## Test Data

### Default Test User
```python
username = f"e2e_test{int(time.time() * 1000) % 100000}"
password = "TestPass1"  # Alphanumeric only (no special chars)
state = "Maharashtra"
district = "Pune"
language = "en"
N, P, K = 50.0, 20.0, 30.0
pH = 6.5
```

### Test Coordinates
```python
# Pune, India
latitude = 18.5204
longitude = 73.8567
```

---

## Troubleshooting

### ❌ Connection Refused (localhost:8000, 8008, etc.)
**Solution:** Verify all services are running
```powershell
# Check if ports are listening
netstat -ano | grep LISTEN | grep "8000\|8008\|8001\|8002"

# Or use netstat directly
netstat -an | grep "LISTENING"
```

### ❌ 422 Unprocessable Entity
**Solution:** Password contained special characters
- Use: `TestPass1` (alphanumeric only)
- Not: `TestPass123!` (contains special char)

### ❌ Test database locked or corrupted
**Solution:** Clear test database
```powershell
cd c:\vasudha-project\backend\auth
rm users.db  # or use Remove-Item users.db
# Restart auth service
```

### ❌ "User already exists"
**Solution:** Test uses unique usernames with timestamps, but if error persists:
```powershell
# Clear the database and retry
cd c:\vasudha-project\backend\auth
Remove-Item users.db -ErrorAction SilentlyContinue
# Restart auth service
```

### ❌ Timeout errors (>30 seconds)
**Possible causes:**
- One or more agents not responding
- External API rate limiting (weather, market data)
- Network connectivity issues

**Solution:**
1. Check individual agent logs
2. Verify internet connection
3. Check external API credentials (weather, market APIs)
4. Increase timeout in test file if needed

### ❌ "404 Not Found" on /recommendations
**Solution:** Endpoint is `/get_full_recommendation/`
- Tests already use correct path
- If error persists, check orchestrator main.py routes

---

## Common Issues & Fixes

### Issue: Tests skip (showing "skipped" count)
**Reason:** Test user already exists from previous run
**Fix:** 
```powershell
# Clear auth database
cd c:\vasudha-project\backend\auth
Remove-Item users.db -ErrorAction SilentlyContinue
# Restart services
```

### Issue: JSON decode errors
**Reason:** Service returned non-JSON response (likely HTML error)
**Fix:**
1. Check service logs for errors
2. Verify service is actually running on correct port
3. Check if required dependency service is missing

### Issue: Weather agent not responding
**Reason:** OpenWeatherMap API key missing or rate limited
**Fix:**
1. Check `backend/agents/weather_agent/config.py` for API key
2. Verify API key is valid
3. Wait a moment and retry (rate limit)

---

## Performance Baseline

**Expected test execution times:**
- TestAuthenticationE2E: 5-10 seconds
- TestOrchestratorWorkflows: 15-30 seconds
- TestErrorHandlingE2E: 10-15 seconds
- TestFullUserJourneyE2E: 20-30 seconds

**Total:** ~60-90 seconds for all tests

If tests run significantly slower, check:
- System CPU/Memory usage
- Network latency
- External API response times

---

## Test Coverage

### Current Coverage
```
authentication: 3 tests
orchestrator workflows: 3+ tests
error handling: 3+ tests
full user journey: 1 test
```

### Recommended Additional Tests
- Market data API integration
- Sustainability recommendations
- Fertilizer recommendations
- Climate adaptation workflows
- Multi-language support
- Concurrent requests handling

---

## Continuous Integration

### GitHub Actions Example
```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      
      - name: Install dependencies
        run: |
          cd backend/orchestrator
          pip install -r requirements.txt
          pip install pytest-asyncio httpx
      
      - name: Start services (background)
        run: |
          cd backend/auth
          python -m uvicorn main:app --port 8008 &
          cd ../orchestrator
          python -m uvicorn main:app --port 8000 &
          sleep 3
      
      - name: Run tests
        run: |
          cd backend/orchestrator
          pytest tests/integration/test_e2e_workflows.py -v --tb=short
```

---

## Next Steps

1. ✅ Run all tests and verify they pass
2. ✅ Add tests for remaining microservices
3. ✅ Set up CI/CD pipeline
4. ✅ Monitor test execution times
5. ✅ Document any service-specific quirks
6. ✅ Set up alerts for test failures

---

## Support

**Test file location:** `backend/orchestrator/tests/integration/test_e2e_workflows.py`

**To debug a failing test:**
```powershell
# Run with maximum verbosity
pytest tests/integration/test_e2e_workflows.py::TestName -vvv -s

# Capture print output
pytest tests/integration/test_e2e_workflows.py -s

# Show full exception details
pytest tests/integration/test_e2e_workflows.py --tb=long
```

**For questions about specific tests:**
- Check test file docstrings
- Review test code comments
- Check service logs when tests fail
