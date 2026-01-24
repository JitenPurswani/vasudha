# Vasudha Frontend-Backend Integration Plan

**Project:** Vasudha (Multi-Agent AI for Sustainable Crop Optimization)  
**Created:** January 24, 2026  
**Purpose:** Step-by-step integration plan connecting existing frontend to existing backend

---

## 1. SYSTEM ALIGNMENT SUMMARY

The Vasudha frontend is a React Native/Expo mobile application that currently displays hardcoded mock data for crop recommendations, weather information, market prices, and user profiles. The backend is a microservices architecture with a single orchestrator endpoint (`POST /get_full_recommendation/`) that coordinates multiple specialized agents (Weather, Soil, Recommendation, Market, Sustainability, XAI) to provide comprehensive crop recommendations based on location, season, and mode. The frontend should connect exclusively to the orchestrator endpoint at `http://localhost:8000/get_full_recommendation/` (or configured base URL), which returns a unified response containing location data, ranked crop predictions with scores, sustainability metrics, and explainable AI narratives. The frontend must NOT call individual agent endpoints directly (Weather Agent, Soil Agent, Market Agent, etc.) as these are internal microservices. The orchestrator endpoint is the single source of truth for all recommendation data, and the frontend should treat all other backend endpoints as out of scope for this integration.

---

## 2. FRONTEND → BACKEND DATA GAP ANALYSIS

### 2.1 Crop Screen Data Mismatches

#### Field Name Mismatches

| Frontend Expects | Backend Provides | Mismatch Type | Critical? |
|-----------------|------------------|---------------|-----------|
| `id` | `crop` | Different field name | **CRITICAL** - Frontend uses `id` for keys and lookups |
| `title` | `crop` | Different field name + format | **CRITICAL** - Frontend expects capitalized display name |
| `percent` | `final_score` | Different field name + type | **CRITICAL** - Frontend expects string "60%", backend provides number 0.0-1.0 |
| `percentNum` | `final_score` | Different field name | **NON-CRITICAL** - Not directly used in UI |
| `headerBg` | (none) | Missing field | **CRITICAL** - Frontend uses for card header background color |
| `why` | `shap_summary` + `xai_data` | Different structure | **CRITICAL** - Frontend expects array of strings, backend provides nested objects |

#### Data Type Mismatches

| Field | Frontend Type | Backend Type | Conversion Required | Critical? |
|-------|--------------|--------------|---------------------|-----------|
| `percent` | `string` ("60%") | `number` (0.0-1.0) | Multiply by 100, round, append "%" | **CRITICAL** |
| `final_score` | Not used | `number` (0.0-1.0) | Convert to percentage string | **CRITICAL** |
| `crop` | `string` (capitalized) | `string` (lowercase) | Capitalize first letter | **CRITICAL** |
| `why` | `string[]` | `object` (nested) | Transform SHAP/XAI data to string array | **CRITICAL** |

#### Nullability Mismatches

| Field | Frontend Assumes | Backend Provides | Risk Level |
|-------|-----------------|------------------|------------|
| `why` array | Always present | `shap_summary` can be null | **HIGH** - Will crash on `.map()` |
| `predictions` array | Always has items | Can be empty (0-5 items) | **HIGH** - No empty state handling |
| `market_score` | Not used | Can be null | **MEDIUM** - Not currently displayed |
| `xai_data` | Not used | Can be null | **MEDIUM** - Not currently displayed |
| `sustainability` | Not used | Can be null | **MEDIUM** - Not currently displayed |

#### Array Size Mismatches

| Array | Frontend Expects | Backend Provides | Risk |
|-------|----------------|------------------|------|
| `DATA` (crop recommendations) | 3 items (hardcoded) | 0-5 items (dynamic) | **HIGH** - Frontend assumes non-empty |
| `item.why` | 3 items (hardcoded) | Variable (0-6 items from XAI) | **HIGH** - No empty check before `.map()` |
| `SEASONAL_DATA` | 2 items (hardcoded) | Variable (filtered by mode) | **MEDIUM** - Mode filtering exists |

### 2.2 Home Screen Data Mismatches

#### Field Name Mismatches

| Frontend Expects | Backend Provides | Mismatch Type | Critical? |
|-----------------|------------------|---------------|-----------|
| `temperature_celsius` | `temperature_celsius` | Same name, but hardcoded | **CRITICAL** - Currently hardcoded "22°C" |
| `humidity_percent` | `humidity_percent` | Same name, but hardcoded | **CRITICAL** - Currently hardcoded "10%" |
| `avg_seasonal_rainfall_mm` | `avg_seasonal_rainfall_mm` | Not displayed | **NON-CRITICAL** - Not in UI |
| `location.district` | `location.district` | Uses translation key | **MEDIUM** - Should use actual value |
| `location.state` | `location.state` | Uses translation key | **MEDIUM** - Should use actual value |
| Market data | `market_score` (in recommendations) | Different structure | **NON-CRITICAL** - Market screen uses different data |

#### Data Type Mismatches

| Field | Frontend Type | Backend Type | Conversion Required | Critical? |
|-------|--------------|--------------|---------------------|-----------|
| `temperature_celsius` | `string` ("22°C") | `number | null` | Format as string with "°C", handle null | **CRITICAL** |
| `humidity_percent` | `string` ("10%") | `number | null` | Format as string with "%", handle null | **CRITICAL** |
| `avg_seasonal_rainfall_mm` | Not displayed | `number | null` | N/A | **NON-CRITICAL** |

#### Nullability Mismatches

| Field | Frontend Assumes | Backend Provides | Risk Level |
|-------|-----------------|------------------|------------|
| `temperature_celsius` | Always present | Can be null | **HIGH** - Would display "null°C" |
| `humidity_percent` | Always present | Can be null | **HIGH** - Would display "null%" |
| `location.district` | Uses translation | Can be null | **MEDIUM** - Translation key safe |
| `location.state` | Uses translation | Can be null | **MEDIUM** - Translation key safe |

### 2.3 Market Screen Data Mismatches

#### Field Name Mismatches

| Frontend Expects | Backend Provides | Mismatch Type | Critical? |
|-----------------|------------------|---------------|-----------|
| Market price data | `market_score` (in recommendations) | Completely different structure | **CRITICAL** - Market screen expects APMC locations, prices, trends |
| `location` (APMC name) | Not provided | Missing field | **CRITICAL** - Frontend displays APMC names |
| `price` (formatted) | `market_score` (0.0-1.0) | Different format | **CRITICAL** - Frontend expects ₹ price strings |
| `trend` (percentage) | Not provided | Missing field | **CRITICAL** - Frontend displays trend percentages |
| Historical prices | Not provided | Missing field | **CRITICAL** - Chart requires price array |

#### Data Type Mismatches

| Field | Frontend Type | Backend Type | Conversion Required | Critical? |
|-------|--------------|--------------|---------------------|-----------|
| `price` | `string` ("2500") | `number` (0.0-1.0) or null | Cannot convert - different data | **CRITICAL** |
| `trend` | `string` ("+6%") | Not provided | Cannot convert - missing data | **CRITICAL** |
| Historical prices | `number[]` | Not provided | Cannot convert - missing data | **CRITICAL** |

#### Nullability Mismatches

| Field | Frontend Assumes | Backend Provides | Risk Level |
|-------|-----------------|------------------|------------|
| Market data array | Always has items | Not provided by orchestrator | **HIGH** - Market screen cannot be integrated with current backend |
| Price array | Always has 6 values | Not provided | **HIGH** - Chart will break |

**IMPORTANT:** Market screen requires data that the orchestrator endpoint does NOT provide. Market screen integration is **NOT POSSIBLE** with current backend without calling separate Market Agent endpoint (which is out of scope).

### 2.4 Disease Screen Data Mismatches

#### Field Name Mismatches

| Frontend Expects | Backend Provides | Mismatch Type | Critical? |
|-----------------|------------------|---------------|-----------|
| `diseaseName` | Not provided | Missing field | **CRITICAL** - Disease detection not in orchestrator |
| `treatmentSuggestions` | Not provided | Missing field | **CRITICAL** - Treatment data not in orchestrator |

**IMPORTANT:** Disease screen requires image upload and disease detection API that does NOT exist in the orchestrator endpoint. Disease screen integration is **NOT POSSIBLE** with current backend.

### 2.5 Profile Screen Data Mismatches

#### Field Name Mismatches

| Frontend Expects | Backend Provides | Mismatch Type | Critical? |
|-----------------|------------------|---------------|-----------|
| `username` | Not provided | Missing field | **NON-CRITICAL** - User data not in backend |
| `language` | Not provided | Missing field | **NON-CRITICAL** - User preference |
| `location` | `location.district + state` | Different format | **MEDIUM** - Can be derived from backend |
| Soil parameters | Not in orchestrator response | Missing fields | **CRITICAL** - Soil data exists in Soil Agent but not in orchestrator response |

#### Data Type Mismatches

| Field | Frontend Type | Backend Type | Conversion Required | Critical? |
|-------|--------------|--------------|---------------------|-----------|
| Soil N, P, K | `string` ("120 kg/ha") | Not provided | Cannot convert - missing data | **CRITICAL** |
| Soil pH | `string` ("6.5") | Not provided | Cannot convert - missing data | **CRITICAL** |

**IMPORTANT:** Profile screen soil parameters are NOT provided by the orchestrator endpoint. Soil data exists in the backend but is not included in the orchestrator response structure.

### 2.6 Notifications Screen Data Mismatches

#### Field Name Mismatches

| Frontend Expects | Backend Provides | Mismatch Type | Critical? |
|-----------------|------------------|---------------|-----------|
| Notification array | Not provided | Missing field | **CRITICAL** - Notifications not in orchestrator |
| `title`, `description`, `time` | Not provided | Missing fields | **CRITICAL** - Alert system not in backend |

**IMPORTANT:** Notifications screen requires alert/notification data that does NOT exist in the orchestrator endpoint. Notifications screen integration is **NOT POSSIBLE** with current backend.

### 2.7 Summary of Critical Mismatches

**CRITICAL (Must Fix):**
1. Crop Screen: `final_score` (number) → `percent` (string) conversion
2. Crop Screen: `crop` (lowercase) → `title` (capitalized) conversion
3. Crop Screen: `shap_summary` + `xai_data` → `why` (string array) transformation
4. Crop Screen: `headerBg` color assignment (missing field)
5. Crop Screen: Empty `predictions` array handling
6. Crop Screen: Null `shap_summary` handling
7. Home Screen: `temperature_celsius` null handling
8. Home Screen: `humidity_percent` null handling
9. Home Screen: `location.district/state` usage (currently uses translation)

**NON-CRITICAL (Can Defer):**
1. `market_score` display (not currently shown)
2. `sustainability` display (not currently shown)
3. `xai_data` direct usage (will be used via `why` transformation)
4. `agronomic_score` display (not currently shown)

**IMPOSSIBLE (Cannot Integrate):**
1. Market Screen - Requires APMC price data not in orchestrator
2. Disease Screen - Requires disease detection API not in backend
3. Notifications Screen - Requires alert system not in backend
4. Profile Screen Soil Data - Not in orchestrator response (exists in Soil Agent but not exposed)

---

## 3. REQUIRED INTEGRATION LAYER

### 3.1 Purpose and Location

**Layer Name:** Data Adapter / Mapper Layer

**Location:** `frontend/services/` or `frontend/utils/`

**Recommended File Structure:**
```
frontend/
├── services/
│   ├── api.ts              # API client (fetch wrapper)
│   ├── adapter.ts          # Backend response → Frontend data shape
│   └── types.ts            # TypeScript type definitions
```

**Responsibility:**
The adapter layer must transform the backend orchestrator response into the exact data shapes expected by the frontend UI components, ensuring:
- All null/undefined values are converted to UI-safe defaults
- All data type conversions are performed (numbers → strings, nested objects → arrays)
- All missing fields are provided with fallback values
- All array operations are safe (empty arrays handled, null checks before mapping)

### 3.2 Required Transformations

#### Transformation 1: Score to Percentage String
- **Input:** `final_score: number` (0.0-1.0)
- **Output:** `percent: string` (e.g., "60%")
- **Logic:** `Math.round(final_score * 100) + "%"`
- **Null Handling:** Default to "0%" if null/undefined

#### Transformation 2: Crop Name Capitalization
- **Input:** `crop: string` (lowercase, e.g., "rice")
- **Output:** `title: string` (capitalized, e.g., "Rice")
- **Logic:** Capitalize first letter
- **Null Handling:** Default to "Unknown Crop" if null/undefined

#### Transformation 3: SHAP/XAI to Why Array
- **Input:** 
  - `shap_summary: { top_positive_features: string[], top_negative_features: string[], neutral_features: string[] } | null`
  - `xai_data.explanations[].model_explanation: Array<{ feature: string, effect: string, reason: string }> | null`
  - `xai_data.explanations[].summary: string | null`
- **Output:** `why: string[]` (array of explanation strings)
- **Logic:** 
  - If `xai_data` exists and has explanations for this crop, use `model_explanation[].reason` strings
  - Else if `shap_summary` exists, convert feature names to explanation strings using mapping
  - Else use generic fallback explanations
- **Null Handling:** Default to empty array `[]` if all sources are null

#### Transformation 4: Header Background Color Assignment
- **Input:** `final_score: number` (0.0-1.0)
- **Output:** `headerBg: string` (hex color code)
- **Logic:** 
  - Score >= 0.7: `"#95C0D2"` (darker blue for high scores)
  - Score >= 0.4: `"#BDDBE8"` (lighter blue for medium scores)
  - Score < 0.4: `"#BDDBE8"` (light blue for low scores)
- **Null Handling:** Default to `"#BDDBE8"` if null

#### Transformation 5: Crop ID Assignment
- **Input:** `crop: string` (lowercase)
- **Output:** `id: string` (lowercase, same as input)
- **Logic:** Use `crop` value directly as `id`
- **Null Handling:** Default to "unknown" if null

#### Transformation 6: Temperature Formatting
- **Input:** `temperature_celsius: number | null`
- **Output:** `value: string` (e.g., "22°C")
- **Logic:** `temperature_celsius !== null ? Math.round(temperature_celsius) + "°C" : "-"`
- **Null Handling:** Display "-" if null

#### Transformation 7: Humidity Formatting
- **Input:** `humidity_percent: number | null`
- **Output:** `value: string` (e.g., "80%")
- **Logic:** `humidity_percent !== null ? Math.round(humidity_percent) + "%" : "-"`
- **Null Handling:** Display "-" if null

#### Transformation 8: Location String Formatting
- **Input:** `location: { district: string | null, state: string | null }`
- **Output:** `locationString: string` (e.g., "Kalyan, Maharashtra")
- **Logic:** 
  - If both present: `district + ", " + state`
  - If only district: `district`
  - If only state: `state`
  - If neither: Use translation key fallback
- **Null Handling:** Use translation key if both null

### 3.3 Adapter Function Signature

**Main Adapter Function:**
```typescript
// Pseudo-signature (NOT actual code)
function adaptBackendResponse(backendResponse: BackendResponse): FrontendData {
  // Returns:
  // - Crop recommendations array (transformed)
  // - Weather data (formatted)
  // - Location data (formatted)
  // - All with null-safe defaults
}
```

**Guarantees:**
1. All arrays are never null (empty array `[]` if no data)
2. All strings are never null (empty string `""` or fallback if no data)
3. All numbers are never null (0 if no data)
4. All required fields for UI are always present
5. All nested object access is safe (no crashes on null)

---

## 4. SCREEN-BY-SCREEN TASK BREAKDOWN

### 4.1 Crop Screen (`app/(main)/(tabs)/crop.tsx`)

**Integration Status:** **MUST BE INTEGRATED** (Phase 1)

**Backend Data Mapping:**
- `recommendations.predictions[]` → Crop cards array
- `recommendations.predictions[].crop` → `item.id` and `item.title`
- `recommendations.predictions[].final_score` → `item.percent` and `item.percentNum`
- `recommendations.predictions[].shap_summary` + `xai_data.explanations[]` → `item.why[]`
- `recommendations.predictions[].final_score` → `item.headerBg` (via color mapping)
- `mode` state → Maps to backend `mode` parameter ("seasonal" vs "all_season")

**Required Changes:**
1. Replace hardcoded `DATA` array with API call result
2. Add API call in `useEffect` hook (or similar data fetching mechanism)
3. Apply adapter transformations to backend response
4. Add loading state (show spinner/skeleton while fetching)
5. Add error state (show error message if API fails)
6. Add empty state (show message if `predictions` array is empty)
7. Ensure `item.why` array is never null before `.map()` call

**Risks if Left Untouched:**
- Screen will continue showing hardcoded data
- No real-time recommendations
- User cannot get location-based crop suggestions
- **CRITICAL** - This is the primary feature of the app

**Null Safety Requirements:**
- `predictions` array: Default to empty array `[]`
- `item.why` array: Default to empty array `[]` (or generic fallback messages)
- `item.percent`: Default to "0%"
- `item.headerBg`: Default to `"#BDDBE8"`

### 4.2 Home Screen (`app/(main)/(tabs)/home.tsx`)

**Integration Status:** **SHOULD BE INTEGRATED** (Phase 1, Partial)

**Backend Data Mapping:**
- `location.district` + `location.state` → Location display (currently uses translation key)
- Weather data NOT directly available in orchestrator response (would need separate Weather Agent call, which is out of scope)
- Market data NOT available in orchestrator response
- Alerts data NOT available in orchestrator response
- Crop card data NOT available in orchestrator response

**Required Changes:**
1. Replace hardcoded location with `location.district + ", " + location.state` from orchestrator response
2. Weather stats remain hardcoded (cannot integrate without calling Weather Agent directly)
3. Market data remains hardcoded (cannot integrate - see Market Screen)
4. Alerts remain hardcoded (cannot integrate - alerts not in backend)
5. Crop card remains hardcoded (different data structure than recommendations)

**Risks if Left Untouched:**
- Location will show generic translation instead of actual user location
- Weather, market, alerts remain static
- **MEDIUM** - Location integration improves UX but other sections cannot be integrated

**Null Safety Requirements:**
- `location.district`: Use translation key if null
- `location.state`: Use translation key if null

### 4.3 Market Screen (`app/(main)/(tabs)/market.tsx`)

**Integration Status:** **CANNOT BE INTEGRATED** (Out of Scope)

**Backend Data Mapping:**
- **NO MAPPING POSSIBLE** - Orchestrator does not provide:
  - APMC location names
  - Current market prices (₹ values)
  - Price trends (percentage changes)
  - Historical price arrays for charts

**Required Changes:**
- **NONE** - Screen must remain with hardcoded data
- **ALTERNATIVE:** Would require calling Market Agent endpoint directly (`GET /market/evaluate` and `GET /market/forecast`), which is explicitly out of scope

**Risks if Left Untouched:**
- Screen will continue showing mock data
- **LOW** - Market screen is secondary feature, can remain mocked

**Future Enhancement:**
- If Market Agent endpoints are exposed to frontend in future, integration would require:
  - Calling `GET /market/evaluate?crop={crop}&state={state}` for each crop
  - Calling `GET /market/forecast?crop={crop}&state={state}` for historical data
  - Transforming response to match frontend data structure

### 4.4 Disease Screen (`app/(main)/(tabs)/disease.tsx`)

**Integration Status:** **CANNOT BE INTEGRATED** (Out of Scope)

**Backend Data Mapping:**
- **NO MAPPING POSSIBLE** - Backend does not have:
  - Disease detection API
  - Image analysis endpoint
  - Treatment suggestion system

**Required Changes:**
- **NONE** - Screen must remain with hardcoded data
- **ALTERNATIVE:** Would require new backend endpoint for image-based disease detection, which is out of scope

**Risks if Left Untouched:**
- Screen will continue showing mock diagnosis
- **LOW** - Disease detection is separate feature, can remain mocked

### 4.5 Profile Screen (`app/(main)/profile.tsx`)

**Integration Status:** **PARTIAL INTEGRATION POSSIBLE** (Phase 2, Optional)

**Backend Data Mapping:**
- `location.district` + `location.state` → `location` field (can be formatted)
- Soil parameters NOT available in orchestrator response (exists in Soil Agent but not exposed)

**Required Changes:**
1. Replace hardcoded location with formatted location from orchestrator response
2. Soil parameters remain hardcoded (cannot integrate without calling Soil Agent directly, which is out of scope)
3. Username and language remain hardcoded (user preferences, not in backend)

**Risks if Left Untouched:**
- Location will remain hardcoded
- Soil parameters will remain hardcoded
- **LOW** - Profile screen is informational, partial integration acceptable

**Null Safety Requirements:**
- `location`: Use hardcoded fallback if null

### 4.6 Notifications Screen (`app/(main)/notifications.tsx`)

**Integration Status:** **CANNOT BE INTEGRATED** (Out of Scope)

**Backend Data Mapping:**
- **NO MAPPING POSSIBLE** - Backend does not have:
  - Notification/alert system
  - Real-time alert generation
  - Alert history

**Required Changes:**
- **NONE** - Screen must remain with hardcoded data
- **ALTERNATIVE:** Would require new backend notification system, which is out of scope

**Risks if Left Untouched:**
- Screen will continue showing mock notifications
- **LOW** - Notifications are separate feature, can remain mocked

---

## 5. SAFE INTEGRATION ORDER

### Phase 1: Must-Do (Critical Path)

**Order Rationale:** Start with the core feature (Crop Screen) which is the primary value proposition. This screen has the most complex data transformations and highest risk of breaking. Complete it first to validate the adapter layer and API client. Then integrate location data in Home and Profile screens as they are simple string formatting tasks with low risk.

#### Step 1.1: Create Integration Infrastructure
- **Task:** Create API client, adapter layer, and type definitions
- **Risk:** Low - No UI changes, only new files
- **Dependencies:** None
- **Validation:** Adapter unit tests (if applicable) or manual testing with mock backend response

#### Step 1.2: Integrate Crop Screen (Primary Feature)
- **Task:** Replace hardcoded crop data with API call
- **Risk:** High - Complex transformations, multiple null checks required
- **Dependencies:** Step 1.1 complete
- **Validation:** 
  - Verify crop cards render with real data
  - Verify empty state shows when no recommendations
  - Verify error state shows when API fails
  - Verify loading state shows during fetch
  - Verify "why" explanations display correctly
  - Verify percentage scores display correctly
  - Verify mode toggle filters correctly

#### Step 1.3: Integrate Location Data (Home Screen)
- **Task:** Replace translation key location with actual district/state
- **Risk:** Low - Simple string formatting
- **Dependencies:** Step 1.1 complete (can reuse API client)
- **Validation:** Verify location displays correctly in home screen header

#### Step 1.4: Integrate Location Data (Profile Screen)
- **Task:** Replace hardcoded location with actual district/state
- **Risk:** Low - Simple string formatting
- **Dependencies:** Step 1.1 complete (can reuse API client)
- **Validation:** Verify location displays correctly in profile screen

**Phase 1 Completion Criteria:**
- Crop Screen fully functional with real backend data
- Location data displayed correctly in Home and Profile screens
- All null/error cases handled gracefully
- No UI crashes on empty or partial responses

### Phase 2: Optional (Low Priority)

**Order Rationale:** These are nice-to-have improvements that enhance UX but are not critical for core functionality.

#### Step 2.1: Add Loading States (All Integrated Screens)
- **Task:** Add skeleton screens or spinners during API calls
- **Risk:** Low - UI enhancement only
- **Dependencies:** Phase 1 complete
- **Validation:** Verify loading indicators show and hide correctly

#### Step 2.2: Add Error Retry Logic
- **Task:** Add retry button or automatic retry on API failures
- **Risk:** Low - Error handling enhancement
- **Dependencies:** Phase 1 complete
- **Validation:** Verify retry functionality works

#### Step 2.3: Add Offline Handling
- **Task:** Cache last successful response and show when offline
- **Risk:** Medium - Requires storage implementation
- **Dependencies:** Phase 1 complete
- **Validation:** Verify cached data displays when network unavailable

### Phase 3: Future Enhancements (Out of Scope)

**These require backend changes or new endpoints:**
- Market Screen integration (requires Market Agent endpoint exposure)
- Disease Screen integration (requires new disease detection API)
- Notifications Screen integration (requires new notification system)
- Profile Soil Data integration (requires orchestrator to include soil data in response)
- Weather data integration in Home Screen (requires Weather Agent endpoint exposure)

**Why This Order Minimizes Risk:**
1. **Infrastructure First:** Establishes patterns and reusable code before UI changes
2. **Core Feature First:** Validates entire integration approach with most critical screen
3. **Simple Tasks Last:** Location integration is low-risk and can be done quickly after core feature works
4. **Optional Enhancements Deferred:** Loading/error improvements can be added incrementally without blocking core functionality

---

## 6. NULL, ERROR & LATENCY STRATEGY

### 6.1 Backend Fields That May Be Null or Missing

#### From Orchestrator Response (`POST /get_full_recommendation/`)

**Top-Level Nullable Fields:**
- `sustainability` - Can be null if Sustainability Agent fails
- `xai_data` - Can be null if XAI Agent fails
- `location.district` - Can be null if reverse geocoding fails
- `location.state` - Can be null if reverse geocoding fails

**Recommendations Array Nullable Fields:**
- `recommendations.predictions[]` - Can be empty array (0 items) if no crops pass filters
- `recommendations.predictions[].market_score` - Can be null if Market Agent fails or crop not in mapping
- `recommendations.predictions[].shap_summary` - Can be null if SHAP computation fails
- `recommendations.predictions[].shap_summary.top_positive_features` - Can be empty array
- `recommendations.predictions[].shap_summary.top_negative_features` - Can be empty array
- `recommendations.predictions[].shap_summary.neutral_features` - Can be empty array

**XAI Data Nullable Fields (if xai_data exists):**
- `xai_data.explanations[]` - Can be empty array
- `xai_data.explanations[].model_explanation[]` - Can be empty array
- `xai_data.explanations[].market_explanation` - Can be null
- `xai_data.explanations[].sustainability_explanation` - Can be null
- `xai_data.explanations[].summary` - Should always be present if explanation exists

### 6.2 Frontend-Safe Handling Strategy

#### Strategy 1: Adapter Layer Defaults (Primary Defense)

**Location:** `frontend/services/adapter.ts`

**Approach:** All null/undefined values are converted to UI-safe defaults in the adapter layer BEFORE data reaches UI components. UI components never receive null values.

**Default Values:**
- Empty arrays: `[]` (never null)
- Empty strings: `""` (never null)
- Default numbers: `0` (never null)
- Default booleans: `false` (never null)
- Fallback strings: `"Unknown"`, `"-"`, `"N/A"` for display fields

**Example Transformations:**
- `predictions` null/undefined → `[]`
- `shap_summary` null → `{ top_positive_features: [], top_negative_features: [], neutral_features: [] }`
- `why` array empty/null → `["Data not available"]` (generic fallback)
- `market_score` null → Not displayed (field not currently used in UI)
- `location.district` null → Use translation key fallback

#### Strategy 2: Component-Level Safety Checks (Secondary Defense)

**Location:** Individual screen components

**Approach:** Even though adapter guarantees non-null, add defensive checks in components as backup.

**Required Checks:**
- Before `.map()` on arrays: `array?.length > 0 ? array.map(...) : <EmptyState />`
- Before accessing nested properties: `object?.nested?.property ?? defaultValue`
- Before displaying strings: `string ?? "N/A"`

**Exception:** Adapter layer should handle all nulls, so component checks are defensive only.

#### Strategy 3: Error Boundaries (Tertiary Defense)

**Location:** App-level error boundary component

**Approach:** Catch any unexpected errors that slip through adapter and component checks.

**Implementation:** React Error Boundary wrapper around main app content.

### 6.3 Loading, Error, and Fallback Logic Location

#### Loading State Logic

**Location:** Individual screen components (e.g., `crop.tsx`)

**Implementation:**
- Add `loading: boolean` state variable
- Set `loading = true` before API call
- Set `loading = false` after API call completes (success or error)
- Render loading UI (spinner/skeleton) when `loading === true`

**UI Pattern:**
```
if (loading) return <LoadingSpinner />
if (error) return <ErrorMessage />
if (data.length === 0) return <EmptyState />
return <NormalContent />
```

#### Error State Logic

**Location:** Individual screen components

**Implementation:**
- Add `error: string | null` state variable
- Set `error = errorMessage` when API call fails
- Set `error = null` when API call succeeds
- Render error UI when `error !== null`

**Error Types to Handle:**
- Network errors (no internet, timeout)
- HTTP errors (404, 500, etc.)
- JSON parsing errors
- Unexpected response structure

#### Fallback Logic

**Location:** Adapter layer (`frontend/services/adapter.ts`)

**Implementation:**
- All transformations include fallback values
- Empty arrays default to `[]`
- Missing strings default to `""` or generic messages
- Missing numbers default to `0`
- Missing booleans default to `false`

### 6.4 Failure Handling Strategy

#### Block Rendering (Critical Failures)

**Scenarios:**
- API call fails with network error (no internet)
- API call fails with 500 error (server error)
- Response structure is completely invalid (not JSON, missing required fields)

**Behavior:**
- Show error message to user
- Display retry button
- Do NOT show partial/broken data
- Do NOT crash the app

**Implementation:**
- Error state in component
- Error UI component
- Retry functionality

#### Degrade Gracefully (Partial Failures)

**Scenarios:**
- `sustainability` is null (non-critical data)
- `xai_data` is null (can use `shap_summary` as fallback)
- `market_score` is null (not currently displayed anyway)
- `shap_summary` is null (use generic explanations)

**Behavior:**
- Show available data
- Hide or disable features that depend on missing data
- Show generic fallback content where appropriate
- Do NOT show error messages for non-critical missing data

**Implementation:**
- Adapter provides fallback values
- UI conditionally renders sections based on data availability
- No error states for optional data

#### Silently Ignore (Non-Critical Missing Data)

**Scenarios:**
- `market_score` is null (not displayed in current UI)
- `sustainability` is null (not displayed in current UI)
- Individual explanation fields are null (other explanations available)

**Behavior:**
- Simply omit the data
- No user-visible indication of missing data
- App continues to function normally

**Implementation:**
- Adapter omits fields or provides empty values
- UI does not render sections for missing optional data

### 6.5 Latency Handling

#### Expected Latency

**Backend Response Time:** 2-5 seconds (typical), up to 15 seconds (timeout)

**Sources of Latency:**
- Weather Agent API calls (OpenWeatherMap, Nominatim)
- Multiple agent coordination
- Database queries
- ML model inference

#### Frontend Handling

**Loading Indicators:**
- Show spinner/skeleton immediately when API call starts
- Keep loading state visible until response received
- For long waits (>5 seconds), consider showing "This may take a moment" message

**Timeout Handling:**
- Set client-side timeout (e.g., 20 seconds)
- If timeout occurs, show error message with retry option
- Do NOT let request hang indefinitely

**Optimistic Updates:**
- NOT recommended for this use case (data is dynamic and location-dependent)
- Always wait for backend response before updating UI

---

## 7. FILE-LEVEL TASK CHECKLIST

### Infrastructure Tasks

- [ ] Create `frontend/services/` directory
- [ ] Create `frontend/services/api.ts` - API client function with fetch wrapper, error handling, timeout
- [ ] Create `frontend/services/adapter.ts` - Backend response adapter with all transformations
- [ ] Create `frontend/services/types.ts` - TypeScript type definitions for backend response and frontend data shapes
- [ ] Create `frontend/config/api.ts` - API base URL configuration (or use environment variable)

### Crop Screen Integration Tasks

- [ ] Add `useState` for loading state in `app/(main)/(tabs)/crop.tsx`
- [ ] Add `useState` for error state in `app/(main)/(tabs)/crop.tsx`
- [ ] Add `useState` for crop data in `app/(main)/(tabs)/crop.tsx`
- [ ] Add `useEffect` hook to fetch data on component mount in `app/(main)/(tabs)/crop.tsx`
- [ ] Add `useEffect` hook to refetch data when `mode` changes in `app/(main)/(tabs)/crop.tsx`
- [ ] Replace hardcoded `DATA` array with state variable in `app/(main)/(tabs)/crop.tsx`
- [ ] Add loading UI (spinner/skeleton) in `app/(main)/(tabs)/crop.tsx`
- [ ] Add error UI (error message + retry button) in `app/(main)/(tabs)/crop.tsx`
- [ ] Add empty state UI (message when no recommendations) in `app/(main)/(tabs)/crop.tsx`
- [ ] Add null check before `.map()` on `item.why` array in `CropCard` component
- [ ] Verify adapter transforms `final_score` to `percent` string correctly
- [ ] Verify adapter transforms `crop` to `title` with capitalization
- [ ] Verify adapter transforms `shap_summary`/`xai_data` to `why` array
- [ ] Verify adapter assigns `headerBg` color based on score
- [ ] Verify adapter handles null `shap_summary` gracefully
- [ ] Verify adapter handles empty `predictions` array gracefully

### Home Screen Integration Tasks

- [ ] Add API call to fetch location data in `app/(main)/(tabs)/home.tsx` (can reuse from Crop Screen)
- [ ] Replace translation key location with actual `location.district + ", " + location.state` in `app/(main)/(tabs)/home.tsx`
- [ ] Add null check for location data (fallback to translation key if null) in `app/(main)/(tabs)/home.tsx`
- [ ] Verify location displays correctly in home screen header

### Profile Screen Integration Tasks

- [ ] Add API call to fetch location data in `app/(main)/profile.tsx` (can reuse from Crop Screen)
- [ ] Replace hardcoded location with actual `location.district + ", " + location.state` in `app/(main)/profile.tsx`
- [ ] Add null check for location data (fallback to hardcoded value if null) in `app/(main)/profile.tsx`
- [ ] Verify location displays correctly in profile screen

### Testing Tasks

- [ ] Smoke test with successful backend response (all fields present)
- [ ] Smoke test with empty `predictions` array (no recommendations)
- [ ] Smoke test with null `shap_summary` (fallback explanations)
- [ ] Smoke test with null `xai_data` (use `shap_summary` only)
- [ ] Smoke test with null `sustainability` (should not break)
- [ ] Smoke test with null `location.district` (fallback to translation)
- [ ] Smoke test with null `location.state` (fallback to translation)
- [ ] Smoke test with network error (error state displays)
- [ ] Smoke test with timeout (error state displays with retry)
- [ ] Smoke test with invalid JSON response (error handling)
- [ ] Verify percentage scores display correctly (0-100% range)
- [ ] Verify crop names are capitalized correctly
- [ ] Verify "why" explanations display correctly (array of strings)
- [ ] Verify mode toggle filters correctly ("seasonal" vs "all_season")
- [ ] Verify loading state shows and hides correctly
- [ ] Verify error retry functionality works

### Translation Key Verification Tasks

- [ ] Verify all crop names in backend response have corresponding translation keys in `i18n/*.json` files
- [ ] Verify translation keys follow pattern: `crops.{lowercase_crop_name}` (e.g., `crops.rice`, `crops.wheat`)
- [ ] Add missing translation keys for any crops not in i18n files
- [ ] Test translation keys with actual backend crop names

### Percentage and Score Display Verification Tasks

- [ ] Verify `final_score` (0.0-1.0) converts to percentage string correctly
- [ ] Verify percentage displays in format "XX%" (e.g., "60%", "85%")
- [ ] Verify percentage rounds correctly (0.6543 → "65%", not "65.43%")
- [ ] Verify percentage handles edge cases (0.0 → "0%", 1.0 → "100%")
- [ ] Verify percentage handles null/undefined (defaults to "0%")

---

## 8. COMMON INTEGRATION PITFALLS (PROJECT-SPECIFIC)

### Pitfall 1: Binding Backend Response Directly to UI

**Mistake:** Passing backend response object directly to UI components without transformation.

**Example:**
```typescript
// WRONG - Direct binding
const [data, setData] = useState(null);
setData(backendResponse.recommendations.predictions);
// UI tries to access item.percent but backend has final_score
```

**Why It Happens:** Backend field names (`final_score`) don't match frontend expectations (`percent`).

**How to Avoid:** Always use adapter layer. Never pass backend response directly to UI. Always transform through adapter first.

**Impact:** UI will break immediately - fields won't exist, types won't match.

### Pitfall 2: Assuming `xai_data` Always Exists

**Mistake:** Accessing `xai_data.explanations[0]` without null check.

**Example:**
```typescript
// WRONG - No null check
const explanation = backendResponse.xai_data.explanations[0].summary;
// Crashes if xai_data is null
```

**Why It Happens:** Backend documentation shows `xai_data` can be null if XAI Agent fails.

**How to Avoid:** Always check `xai_data?.explanations?.[0]?.summary` or use adapter that provides fallback.

**Impact:** App crashes when XAI Agent fails (non-critical failure should not crash app).

### Pitfall 3: Assuming `market_score` is Non-Null

**Mistake:** Using `market_score` in calculations without null check.

**Example:**
```typescript
// WRONG - No null check
const displayScore = item.market_score * 100 + "%";
// Crashes if market_score is null
```

**Why It Happens:** Backend returns `market_score: number | null` - can be null if Market Agent fails.

**How to Avoid:** Always use nullish coalescing: `item.market_score ?? 0` or check before use.

**Impact:** App crashes when Market Agent fails (non-critical failure should not crash app).

### Pitfall 4: Assuming `predictions` Array is Non-Empty

**Mistake:** Accessing `predictions[0]` without checking array length.

**Example:**
```typescript
// WRONG - No empty check
const firstCrop = backendResponse.recommendations.predictions[0].crop;
// Crashes if predictions array is empty
```

**Why It Happens:** Backend can return empty array if no crops pass filtering constraints.

**How to Avoid:** Always check `predictions.length > 0` before accessing elements, or use adapter that handles empty arrays.

**Impact:** App crashes when no crops match criteria (should show empty state instead).

### Pitfall 5: Assuming `shap_summary` is Non-Null

**Mistake:** Accessing `shap_summary.top_positive_features` without null check.

**Example:**
```typescript
// WRONG - No null check
const features = item.shap_summary.top_positive_features.map(...);
// Crashes if shap_summary is null
```

**Why It Happens:** Backend returns `shap_summary: {...} | null` - can be null if SHAP computation fails.

**How to Avoid:** Always use optional chaining: `item.shap_summary?.top_positive_features ?? []` or use adapter that provides fallback.

**Impact:** App crashes when SHAP computation fails (should use fallback explanations).

### Pitfall 6: Not Handling Empty `why` Array

**Mistake:** Calling `.map()` on `why` array without checking if it's empty.

**Example:**
```typescript
// WRONG - No empty check
{item.why.map(w => <Text>{w}</Text>)}
// Renders nothing if why is empty, but no indication to user
```

**Why It Happens:** Adapter might return empty array if all explanation sources are null.

**How to Avoid:** Check `item.why.length > 0` before mapping, or provide default explanation in adapter.

**Impact:** Poor UX - crop card shows no explanations (should show generic fallback).

### Pitfall 7: Not Converting Score to Percentage String

**Mistake:** Displaying `final_score` (0.6543) directly as number instead of percentage string.

**Example:**
```typescript
// WRONG - Wrong format
<Text>{item.final_score}</Text>
// Displays "0.6543" instead of "65%"
```

**Why It Happens:** Backend returns number (0.0-1.0), frontend expects string ("65%").

**How to Avoid:** Always convert in adapter: `Math.round(final_score * 100) + "%"`.

**Impact:** Poor UX - confusing number display instead of clear percentage.

### Pitfall 8: Not Capitalizing Crop Names

**Mistake:** Displaying lowercase crop name directly from backend.

**Example:**
```typescript
// WRONG - Lowercase
<Text>{item.crop}</Text>
// Displays "rice" instead of "Rice"
```

**Why It Happens:** Backend returns lowercase ("rice"), frontend expects capitalized ("Rice") for display.

**How to Avoid:** Always capitalize in adapter: `crop.charAt(0).toUpperCase() + crop.slice(1)`.

**Impact:** Poor UX - inconsistent capitalization in UI.

### Pitfall 9: Not Handling Mode Parameter Correctly

**Mistake:** Not passing `mode` state to backend API call.

**Example:**
```typescript
// WRONG - Missing mode parameter
fetch('/get_full_recommendation/', {
  body: JSON.stringify({ lat, lon, season: 'kharif' })
  // Missing mode parameter
});
```

**Why It Happens:** Frontend has mode toggle but doesn't connect it to API call.

**How to Avoid:** Include `mode` in request body: `{ lat, lon, season, mode: modeState }`.

**Impact:** Backend always returns "seasonal" mode results, toggle has no effect.

### Pitfall 10: Not Handling Location Null Values

**Mistake:** Concatenating `district + ", " + state` when either is null.

**Example:**
```typescript
// WRONG - Null concatenation
const location = `${district}, ${state}`;
// Results in "null, Maharashtra" or "District, null"
```

**Why It Happens:** Reverse geocoding can fail, returning null for district or state.

**How to Avoid:** Check for nulls: `district && state ? `${district}, ${state}` : district || state || fallback`.

**Impact:** Poor UX - displays "null" text in UI.

### Pitfall 11: Not Handling API Timeout

**Mistake:** Letting API call hang indefinitely without timeout.

**Example:**
```typescript
// WRONG - No timeout
fetch('/get_full_recommendation/', {...});
// Can hang forever if backend is slow
```

**Why It Happens:** Backend can take up to 15 seconds, but network issues can cause longer hangs.

**How to Avoid:** Set timeout in API client: `AbortController` with timeout, or use fetch with timeout wrapper.

**Impact:** Poor UX - loading spinner shows indefinitely, no feedback to user.

### Pitfall 12: Not Providing Fallback for Missing Translation Keys

**Mistake:** Assuming all crop names have translation keys.

**Example:**
```typescript
// WRONG - No fallback
<Text>{t(`crops.${crop}`)}</Text>
// Displays "crops.unknowncrop" if key missing
```

**Why It Happens:** Backend might return crop name not in i18n files.

**How to Avoid:** Provide fallback: `t(`crops.${crop}`, { defaultValue: capitalize(crop) })` or check key exists.

**Impact:** Poor UX - displays translation key instead of crop name.

---

## 9. FINAL INTEGRATION DEFINITION OF DONE

### 9.1 Functional Criteria

**Crop Screen:**
- [ ] Crop recommendations display with real backend data
- [ ] Percentage scores display correctly (0-100% format)
- [ ] Crop names are capitalized and translated correctly
- [ ] "Why" explanations display as bullet points (array of strings)
- [ ] Mode toggle ("seasonal" vs "all_season") filters recommendations correctly
- [ ] Top recommendation shows trophy icon (first item in array)
- [ ] Card header background colors vary based on score (high/medium/low)
- [ ] Empty state displays when no recommendations available
- [ ] Error state displays when API call fails
- [ ] Loading state displays during API call
- [ ] Retry functionality works when error occurs

**Home Screen:**
- [ ] Location displays actual district and state from backend (not translation key)
- [ ] Location fallback to translation key if backend location is null
- [ ] Other sections (weather, market, alerts) remain functional with hardcoded data

**Profile Screen:**
- [ ] Location displays actual district and state from backend (not hardcoded)
- [ ] Location fallback to hardcoded value if backend location is null
- [ ] Other fields (username, language, soil) remain functional with hardcoded data

### 9.2 UX Criteria

**Loading Experience:**
- [ ] Loading indicator appears immediately when API call starts
- [ ] Loading indicator disappears when API call completes
- [ ] Loading state does not block user from navigating away
- [ ] Long loading times (>5 seconds) show appropriate message

**Error Experience:**
- [ ] Error messages are user-friendly (not technical error codes)
- [ ] Error messages explain what went wrong in simple language
- [ ] Retry button is clearly visible and functional
- [ ] Errors do not crash the app
- [ ] Partial failures (null optional data) do not show error messages

**Empty State Experience:**
- [ ] Empty state message is informative ("No recommendations available for your location")
- [ ] Empty state suggests actions user can take (change location, try different season)
- [ ] Empty state does not look like an error

**Data Display Experience:**
- [ ] All percentages display in consistent format ("XX%")
- [ ] All crop names are consistently capitalized
- [ ] All explanations are readable and formatted correctly
- [ ] No "null", "undefined", or technical error text visible to user
- [ ] Missing optional data does not leave blank spaces or broken layouts

### 9.3 Stability Criteria

**Null Safety:**
- [ ] No crashes when `predictions` array is empty
- [ ] No crashes when `shap_summary` is null
- [ ] No crashes when `xai_data` is null
- [ ] No crashes when `sustainability` is null
- [ ] No crashes when `market_score` is null
- [ ] No crashes when `location.district` is null
- [ ] No crashes when `location.state` is null
- [ ] No crashes when `why` array is empty
- [ ] All array operations (`.map()`, `.filter()`) are safe
- [ ] All nested object access uses optional chaining or null checks

**Error Handling:**
- [ ] Network errors are caught and handled gracefully
- [ ] HTTP errors (404, 500, etc.) are caught and handled gracefully
- [ ] JSON parsing errors are caught and handled gracefully
- [ ] Timeout errors are caught and handled gracefully
- [ ] Invalid response structure errors are caught and handled gracefully
- [ ] All errors show user-friendly messages (not technical stack traces)

**Performance:**
- [ ] API calls complete within reasonable time (<15 seconds)
- [ ] UI remains responsive during API calls (no blocking)
- [ ] Multiple rapid API calls don't cause race conditions
- [ ] Mode toggle changes don't trigger duplicate API calls
- [ ] Component re-renders don't cause unnecessary API calls

**Compatibility:**
- [ ] Works with all crop names returned by backend (translation keys exist)
- [ ] Works with all seasons ("kharif", "rabi", "zaid")
- [ ] Works with both modes ("seasonal", "all_season")
- [ ] Works with variable number of recommendations (0-5 items)
- [ ] Works with partial backend responses (some fields null)

### 9.4 Testing Criteria

**Manual Testing:**
- [ ] Tested with successful backend response (all fields present)
- [ ] Tested with empty recommendations array
- [ ] Tested with null `shap_summary`
- [ ] Tested with null `xai_data`
- [ ] Tested with null `sustainability`
- [ ] Tested with null location data
- [ ] Tested with network error (airplane mode)
- [ ] Tested with slow network (throttled)
- [ ] Tested with timeout scenario
- [ ] Tested mode toggle functionality
- [ ] Tested error retry functionality
- [ ] Tested all seasons ("kharif", "rabi", "zaid")
- [ ] Tested all modes ("seasonal", "all_season")

**Visual Testing:**
- [ ] All UI elements render correctly with real data
- [ ] No layout breaks with variable data lengths
- [ ] No text overflow or truncation issues
- [ ] Colors and styling consistent with design
- [ ] Loading/error/empty states match design system

### 9.5 Documentation Criteria

**Code Documentation:**
- [ ] Adapter transformations are commented (explain why each transformation is needed)
- [ ] API client includes JSDoc comments for function signatures
- [ ] Type definitions are clear and match backend response structure
- [ ] Complex logic (SHAP/XAI transformation) is well-documented

**Integration Documentation:**
- [ ] README updated with API endpoint configuration
- [ ] Environment variables documented (if used for API URL)
- [ ] Known limitations documented (Market, Disease, Notifications screens cannot be integrated)

**Completion Statement:**
Integration is considered **COMPLETE** when all Functional, UX, Stability, and Testing criteria are met. The app should function reliably with real backend data, handle all error cases gracefully, and provide a smooth user experience even when backend responses are partial or missing optional data.

---

**END OF INTEGRATION PLAN**
