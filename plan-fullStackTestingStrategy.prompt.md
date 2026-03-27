## Plan: Full-Stack Testing Strategy for Vasudha

TL;DR: Introduce a multi-layer automated test stack for the FastAPI microservices backend and Expo React Native frontend, covering unit, integration, end-to-end, non-functional (performance, reliability), and localization testing. Leverage `pytest` + FastAPI TestClient/HTTPX for backend, Jest + React Native Testing Library for frontend, Detox/Appium for mobile E2E, and Postman/Newman or k6 for API/performance suites. Start with core contract tests around orchestrator and agents, then expand to UI and non-functional aspects.

**Steps**
1. **Foundations & Tooling Setup**
   1.1. Backend: Add `pytest`, `pytest-asyncio`, `httpx`, `pytest-cov`, and `pytest-mock` to a shared backend `requirements-dev.txt`, plus `requests-mock` or `respx` for external API mocking.
   1.2. Backend: Create `tests/` root under `backend/` with subfolders: `tests/auth`, `tests/orchestrator`, `tests/agents/{weather,soil,market,recommendation,sustainability,climate_adaptation,xai,fertilizer}` and `tests/shared` for fixtures.
   1.3. Frontend: Add Jest, React Native Testing Library, `@testing-library/jest-native`, and `msw` (Mock Service Worker) or `nock` for HTTP mocking to `frontend/package.json` devDependencies; configure Jest preset for Expo (using `jest-expo`).
   1.4. Frontend: Create `__tests__/` at `frontend/__tests__/` with subfolders: `components`, `screens`, `services`, `context`, `navigation`, and `i18n`.
   1.5. Cross-cutting: Define a `tests.env` or `.env.test` for backend and a `.env.test` for frontend to isolate test URLs/keys; wire them into startup logic.
   1.6. CI: Plan for a CI workflow (e.g., GitHub Actions) with separate jobs: `backend-tests`, `frontend-tests`, optional `api-contract-tests`, and `e2e-tests` (can be added later once suites are stable).

2. **Backend Unit Testing (Service-Level)**
   2.1. **Auth Service** (backend/auth)
       - Test suites:
         - `test_registration.py`: happy path, duplicate email, invalid password, DB constraint errors.
         - `test_login.py`: valid credentials, invalid credentials, locked/disabled account (if applicable), malformed payload.
         - `test_tokens.py`: JWT creation/verification, expiry handling, tampered token, missing `Authorization` header.
       - Use in-memory SQLite or a dedicated test DB file; provide a fixture that creates/drops schema per test module.
   2.2. **Weather Agent** (backend/agents/weather_agent)
       - Test suites:
         - `test_reverse_geocoding.py`: Nominatim success, ambiguous location, not found, rate limit (mocked responses).
         - `test_weather_fetch.py`: OpenWeatherMap success for various coordinate ranges, API key missing, API failure.
         - `test_rainfall_service.py`: DB lookup with existing/non-existing district/state combos, default fallbacks.
       - Mock external HTTP calls with `respx` or similar, assert correct transformation into internal models.
   2.3. **Soil Agent** (backend/agents/soil_agent)
       - Test suites:
         - `test_soil_lookup.py`: known district/state pairs, unknown district, malformed input (e.g., extra spaces, case differences).
         - `test_soil_validation.py`: bounds checking on N/P/K/pH values, data normalization logic if any.
       - Use a small in-memory test dataset or a seeded SQLite test DB.
   2.4. **Recommendation Agent** (backend/agents/recommendation_agent)
       - Test suites:
         - `test_feature_preprocessing.py`: mapping from orchestrator input (weather + soil + meta) to model feature vector; edge combinations (extreme rainfall, temperature).
         - `test_model_prediction.py`: stable outputs for fixed synthetic inputs using a small test model or snapshotting probabilities (within tolerance).
         - `test_caching.py`: repeated calls within TTL use cache; post-TTL triggers recomputation; cache invalidation on input change.
         - `test_shap_explanations.py`: SHAP value shapes, missing feature names, handling for model errors.
   2.5. **Market Agent** (backend/agents/market_agent)
       - Test suites:
         - `test_market_logic.py`: single commodity forecast, multiple commodities, edge dates, missing history; fallback behavior when data is sparse.
         - `test_market_caching.py`: same-date/location reuse, changing query invalidates cache, TTL behavior.
         - `test_db_access.py`: correct SQL queries, handling of missing tables/columns, connection errors.
   2.6. **Sustainability Agent** (backend/agents/sustainability_agent)
       - Test suites:
         - `test_sustainability_engine.py`: scoring for high-input vs low-input crops, water-scarce vs water-abundant scenarios, soil degradation edge cases.
         - `test_sustainability_endpoint.py`: response schema, validation errors, unexpected inputs.
   2.7. **Climate-Adaptation Agent** (backend/agents/climate-adaptation_agent)
       - Test suites:
         - `test_climate_risk_engine.py`: risk scoring for extreme rain/heat, drought conditions, normal conditions; thresholds from `crop_climate_profiles.json`.
         - `test_preventive_action_mapper.py`: correct mapping from risk flags to preventive actions JSON.
         - `test_weather_context_builder.py`: building context objects from raw weather + crop inputs, handling missing fields.
         - Mock Groq LLM calls to ensure deterministic tests.
   2.8. **XAI Agent** (backend/agents/xai_agent)
       - Test suites:
         - `test_reasoning_engine.py`: explanation text coherence for given SHAP + sustainability inputs; handling of incomplete data.
         - `test_xai_endpoint.py`: validation of request structure, error responses for invalid payloads.
   2.9. **Fertilizer Agent** (backend/agents/fertilizer_agent)
       - Test suites:
         - `test_fertilizer_pipeline.py`: deficit calculation, organic vs synthetic selection rules, rainfall-adjusted dosage.
         - `test_recommendation_logic.py`: different soil fertility scenarios, high rainfall vs low rainfall regimes, special crops.
   2.10. **Shared & Utility Modules**
       - Test suites under `tests/shared`:
         - Config loaders (env parsing, defaults, missing values).
         - Any pure helper functions across agents.

3. **Backend Integration & Contract Testing**
   3.1. **Single-Service Integration Tests**
       - Use FastAPI `TestClient`/`httpx.AsyncClient` to hit each service’s live app instance (without network) and validate OpenAPI contracts.
       - Test suites (per service): `test_endpoints_integration.py` focusing on:
         - Correct HTTP status codes for valid/invalid payloads.
         - Response shapes (keys, types) vs. documented schema.
         - Authentication requirements (e.g., endpoints that should reject missing/invalid JWTs).
   3.2. **Orchestrator + Agents Integration Tests**
       - Strategy A (preferred initially): Spin up only the orchestrator app in tests and mock downstream agent HTTP calls (weather, soil, market, etc.) using `respx`; assert combined responses.
       - Strategy B (later): Start multiple FastAPI apps in-process (or via docker-compose) and send actual HTTP requests across services.
       - Test suites:
         - `test_predict_happy_paths.py`: representative scenarios from `docs/evaluation/test_case_analysis.md` (e.g., Mumbai, Jodhpur, Assam) encoded as automated tests; assert ranking includes/omits expected crops.
         - `test_predict_edge_cases.py`: extreme weather, missing soil data, partial market data.
         - `test_predict_error_paths.py`: downstream timeouts, agent returning 5xx, malformed responses.
       - Reuse the documented curl-based scenarios as ground truth for expected status codes and key fields, not precise ranking (to keep tests robust).
   3.3. **Auth + Orchestrator Contract**
       - Tests that a valid JWT from Auth service is accepted by orchestrator endpoints and invalid/expired tokens are rejected.
       - Use fixtures to generate tokens via auth service functions rather than hardcoding.

4. **Backend API Regression & Black-Box Suites**
   4.1. **Postman/Newman Collection**
       - Export curl-based manual tests into a Postman collection grouped by service:
         - Auth, Orchestrator, Weather, Soil, Market, Recommendation, Sustainability, Climate-Adaptation, XAI, Fertilizer.
       - Parameterize common variables: base URLs, tokens, coordinates, season, crop names.
       - Use Newman in CI to run smoke tests against a deployed or dockerized stack.
   4.2. **k6 or Locust Performance Tests**
       - Scenarios: sustained load on `/predict`, `/market/evaluate`, `/climate/assess`, and `/fertilizer/recommend`.
       - Metrics: response time distribution, error rate, saturation behavior of orchestrator and agents.
       - Use simplified fixtures for inputs to avoid complex ML logic in the performance layer.

5. **Frontend Unit & Integration Testing**
   5.1. **Component Tests** (React Native Testing Library)
       - Alert.tsx: renders correct title/message for each severity, dismiss behavior.
       - Toast.tsx: queuing, auto-dismiss timing, multi-toast rendering.
       - AppText.tsx: typography variants, locale-specific font selection, theming.
       - Use snapshot tests sparingly for stable UI pieces.
   5.2. **Screen-Level Tests**
       - Auth screens: [login.tsx], onboarding.
         - Valid/invalid input, error messages, loading state, navigation on success.
       - Main tab screens: home, crop, market, fertilizer.
         - Ensure correct components render based on context state; test key flows (e.g., selecting a crop, viewing recommendations, viewing fertilizer suggestions).
       - Use `msw` or jest mocks to replace API modules (api.ts, weatherApi.ts, etc.) with predictable responses.
   5.3. **Context & State Tests**
       - AuthContext: login/logout, token persistence to SecureStore, initial loading state, handling of token expiry.
       - CropContext & ActiveCropsContext: adding/removing crops, persistence via AsyncStorage, rehydration on app start.
       - NotificationContext: polling logic (if factored to a helper), transformation of backend notifications into in-app objects, queuing and dismissal behavior.
       - Test using React Testing Library’s `render` with context providers and jest mocks for storage APIs.
   5.4. **Service & Adapter Tests**
       - Services (api.ts, recommendationApi.ts, weatherApi.ts, etc.):
         - Correct URLs, query parameters, headers (especially Authorization), timeouts.
         - Error handling for network failure, non-200 status codes, malformed payloads.
       - Adapters (adapter.ts, marketAdapter.ts, soilAdapter.ts):
         - Transform backend shape → frontend types (services/types.ts), including optional/missing fields and edge cases.
         - Regression tests ensuring that adding new fields doesn’t break existing mapping.

6. **Frontend Navigation & E2E Testing**
   6.1. **Navigation Tests**
       - Use `@testing-library/react-native` + `expo-router` utilities to simulate navigation:
         - Auth guard behavior (unauthenticated user redirected to login; authenticated user lands on main tabs).
         - Tab switching; back stack behavior, deep links (if configured).
       - Validate that route parameters are passed to screens correctly (e.g., crop details).
   6.2. **Mobile E2E Tests** (Detox or Appium)
       - Choose **Detox** for React Native (if staying within JS) or **Appium** if preferring cross-tech tooling.
       - Scenarios:
         - Happy path: login → select location/crop → view recommendations → open fertilizer → view recommendations.
         - Error path: simulate network offline → ensure error banners, retry options, and meaningful messages.
         - Localization path: change device/app language → validate key screens show correct localized text.
       - Run against an instrumented build of the Expo app (using EAS build or expo prebuild as needed).

7. **Localization (i18n) & Content Testing**
   7.1. **Static i18n Test Suite**
       - Node-based tests over [frontend/i18n/*.json] and [services/fertilizerI18n.ts]:
         - Ensure all keys present in `en.json` exist in each other locale file (en is reference).
         - Ensure no extra unused keys per locale (optional, but helps cleanup).
         - Validate JSON structure (no syntax errors, correct nesting types).
       - Use the existing `compare_i18n_keys.py` as a reference or wire into tests directly.
   7.2. **Runtime i18n Tests**
       - Component tests that render screens with `i18next` configured for different locales and assert strings from each translation file appear as expected (e.g., labels, button texts, headings).
       - Tests for `i18nHelpers.ts` (translateCrop, translateState, translateStage, translateClimateRisk) with representative keys.
       - Edge cases: missing translation key falls back appropriately or logs a warning.
   7.3. **Domain-Specific Content Tests**
       - Validate that crop names, units, and agronomic phrases are consistent across languages for top crops and regions.
       - Use a small corpus of critical translations (e.g., paddy, millet, water stress) and ensure their correctness.

8. **Data & Edge-Case Testing (Domain-Level)**
   8.1. **Regression Suite from test_case_analysis.md**
       - Convert the manual scenarios in [docs/evaluation/test_case_analysis.md] into automated tests at the orchestrator level.
       - For each TC, encode inputs (coords, season, configuration) and assert high-level properties, such as:
         - Certain crops are present/absent in top-N.
         - Sustainability scores remain within expected ranges.
         - No runtime errors or HTTP 5xx responses.
   8.2. **Boundary & Negative Tests**
       - Extreme weather (very high/low rainfall, temperature), extreme soil values, unusual combinations (e.g., high rainfall + sandy soil).
       - Invalid coordinates, unsupported seasons, malformed JSON payloads.
       - Missing downstream data (e.g., no market history) and verifying fallback behavior.
   8.3. **Data Quality Tests**
       - Lightweight scripts or tests that check for data anomalies in SQLite DBs used by soil, weather, and market agents (e.g., nulls in required columns, impossible values, duplicated rows).

9. **Non-Functional Testing: Performance, Resilience, Security**
   9.1. **Performance & Load**
       - Use k6 or Locust to simulate concurrent users hitting key endpoints:
         - `/predict` (orchestrator), `/market/evaluate`, `/climate/assess`, `/fertilizer/recommend`.
       - Define thresholds (95th percentile latency, error rate) and monitor results over time.
   9.2. **Resilience & Fault Injection**
       - Tests that artificially fail one or more agents (e.g., weather agent down) and assert orchestrator behavior (clear error messages, partial degradation).
       - Timeouts from external APIs (OpenWeather, Groq, Nominatim) to ensure graceful fallbacks.
   9.3. **Security Testing**
       - Automated tests for auth flow: token leakage, invalid token reuse, role or scope issues (if applicable).
       - Static scans with tools like `bandit` for Python and `eslint-plugin-security` for JS.
       - Optional: DAST tools (OWASP ZAP) against a deployed instance to catch common API vulnerabilities.

10. **Test Execution Strategy & Pathway**
    10.1. **Local Developer Loop**
         - Backend: `pytest` for fast unit tests (auth, agents), then integration tests; run with coverage for changed modules.
         - Frontend: Jest unit/integration tests; focus on components/services touched by recent changes.
    10.2. **Pre-Commit/Pre-Push Hooks**
         - Lightweight subset: backend unit tests + frontend unit tests + linting.
    10.3. **CI Pipeline**
         - Stage 1: Lint & typecheck (flake8/ruff, mypy optional; ESLint + TypeScript).
         - Stage 2: Backend unit + integration tests.
         - Stage 3: Frontend Jest tests + static i18n tests.
         - Stage 4 (optional, nightly): API regression suite (Newman) and performance tests (k6/Locust).
    10.4. **Release/Pre-Prod Validation**
         - Run full black-box API suite against a staging environment.
         - Run a minimal set of Detox/Appium E2E tests on a staging mobile build.

**Relevant files**
- `backend/orchestrator/main.py` — central orchestration and integration test focal point.
- `backend/auth/{main.py,security.py,database.py,config.py}` — auth endpoints and token logic.
- `backend/agents/*/main.py` — entrypoints for each agent; subject of unit/integration tests.
- `backend/agents/*/*_engine.py`, `*pipeline.py`, `*logic.py` — core domain logic modules for high-value unit tests.
- `docs/evaluation/test_case_analysis.md` — source of domain-level regression scenarios.
- `docs/integration_guide.md` and `README.md` — manual testing steps to convert into automated suites.
- `frontend/app/**` — screens and navigation; focus for UI tests.
- `frontend/context/*.tsx` — global state and side-effect management; critical for behavior tests.
- `frontend/services/*.ts` — API and adapter layer for contract and error-handling tests.
- `frontend/i18n/*.json` and `frontend/services/fertilizerI18n.ts` — core of localization test scope.

**Verification**
1. Backend: Run `pytest` with coverage; ensure high coverage on orchestrator, auth, and each agent’s core logic modules and endpoints; verify tests pass across environments.
2. Frontend: Run `npm test` (Jest) for components, services, contexts, and navigation; ensure snapshot and interaction tests are stable.
3. API: Execute Postman/Newman collection (or equivalent) against running services to validate end-to-end flows and contracts.
4. Localization: Run static key-diff tests across i18n JSON files and a small runtime suite rendering key screens in multiple locales.
5. Non-functional: Run k6/Locust scenarios and verify latency/error thresholds; run a small Detox/Appium suite on every major release to validate critical user journeys.

**Decisions**
- Prefer **isolated, in-process FastAPI tests** with mocked dependencies for most backend tests; reserve multi-service/docker-based integration tests for critical end-to-end flows.
- Treat orchestrator `/predict` flows and the climate/market-heavy scenarios from `test_case_analysis.md` as **regression goldens**, but assert on high-level properties (presence/order ranges) instead of brittle exact score values.
- Use **Jest + React Native Testing Library** as the primary frontend test stack; only add Detox/Appium once core unit/integration coverage is in place.

**Further Considerations**
1. Decide whether to introduce containerization (docker-compose) early to simplify multi-service integration and performance testing, or to stay with in-process app instances for now.
2. Choose the exact E2E framework (Detox vs Appium vs Playwright for native) based on your team’s familiarity and CI environment.
3. Consider adding schema validation (e.g., Pydantic models tests, TypeScript types alignment) as a future step to further harden API contracts between backend and frontend.