# Vasudha Frontend System Analysis Report

**Project:** Vasudha (Multi-Agent AI for Sustainable Crop Optimization)  
**Analysis Date:** January 24, 2026  
**Mode:** READ-ONLY Analysis

---

## 1. API CALLS

### 1.1 Current State

**NO API CALLS EXIST IN THE FRONTEND CODEBASE**

- No `fetch()` calls found
- No `axios` library usage found
- No HTTP client utilities found
- No API service files found
- All data is hardcoded/mock data

### 1.2 Expected API Integration Points (Based on Backend Analysis)

The following endpoints would need to be integrated based on backend capabilities:

#### Primary Endpoint (Orchestrator)
- **URL:** `POST /get_full_recommendation/`
- **Expected Request:**
  ```typescript
  {
    lat: number | null,
    lon: number | null,
    season: "kharif" | "rabi" | "zaid",
    mode?: "seasonal" | "all_season"  // default: "seasonal"
  }
  ```
- **Expected Response:** (See Section 2.1 for full structure)

#### Secondary Endpoints (Not Currently Used)
- `GET /market/forecast` - Price forecasts (not used by orchestrator)
- `POST /climate/adapt` - Climate risk detection (not used by orchestrator)

---

## 2. DATA MODELS / STATE

### 2.1 Crop Recommendation Data Model

**Expected from Backend (`POST /get_full_recommendation/`):**

```typescript
{
  status: "OK",
  location: {
    district: string,
    state: string
  },
  recommendations: {
    ranking_logic: string,
    top_n: number,
    predictions: Array<{
      crop: string,                    // e.g., "rice", "wheat"
      final_score: number,              // 0.0-1.0
      agronomic_score: number,          // 0.0-1.0
      market_score: number | null,      // 0.0-1.0 or null
      raw_probability: number,          // 0.0-1.0
      shap_summary: {
        top_positive_features: string[],
        top_negative_features: string[],
        neutral_features: string[]
      } | null
    }>
  },
  sustainability: {
    agent: string,
    scope: string,
    note: string,
    results: Array<{
      crop: string,
      sustainability_score: number,     // 0.0-1.0
      dimensions: {...},
      score_breakdown: {...},
      explanation: {
        summary: string,
        details: string[]
      },
      disclaimer: string
    }>
  } | null,
  xai_data: {
    agent: string,
    scope: string,
    explanations: Array<{
      crop: string,
      model_explanation: Array<{
        feature: string,
        effect: "positive" | "negative" | "neutral",
        reason: string
      }>,
      market_explanation: string | null,
      sustainability_explanation: string | null,
      summary: string
    }>
  } | null
}
```

### 2.2 Current Hardcoded Data Structures

#### Crop Screen (`crop.tsx`)

**Data Structure:**
```typescript
{
  id: string,              // e.g., "rice", "tomato"
  title: string,           // e.g., "Rice", "Tomato"
  percent: string,         // e.g., "60%"
  percentNum: number,      // e.g., 60
  headerBg: string,        // Color hex code
  why: string[]            // Array of explanation strings
}
```

**Current Hardcoded Values:**
- `DATA` array with 3 crops: rice (60%), tomato (30%), maize (20%)
- `SEASONAL_DATA` subset: rice, tomato
- `why` arrays contain hardcoded strings like:
  - "Soil pH (7.2) is ideal for rice cultivation"
  - "Rainfall is adequate for supporting rice cultivation"
  - "High market demand in your region"

**Fields Used in UI:**
- `item.title` - Displayed as crop name (translated via i18n)
- `item.percent` - Displayed as percentage score
- `item.headerBg` - Background color for card header
- `item.why` - Array mapped to bullet points
- `isTop` - Boolean flag for first item (shows trophy icon)

#### Home Screen (`home.tsx`)

**Weather Stats Structure:**
```typescript
{
  id: string,
  label: string,           // Translated label
  value: string,           // e.g., "80%", "10 km/h"
  Icon: React.Component
}
```

**Current Hardcoded Values:**
- Precipitation: "80%"
- Humidity: "10%"
- Wind Speed: "10 km/h"
- Temperature: "22°C" (hardcoded in JSX)
- Location: Uses translation key `locations.default_region`

**Market Data Structure:**
```typescript
{
  id: string,
  location: string,        // e.g., "Kalyan APMC"
  price: string,          // e.g., "2500"
  trend: string,         // e.g., "+6%", "-10%"
  isUp: boolean         // true for positive trend
}
```

**Current Hardcoded Values:**
- Kalyan APMC: ₹2500, +6%
- Thane APMC: ₹1500, -10%

**Alerts Data Structure:**
```typescript
{
  id: string,
  title: string,
  description: string,
  icon: React.Component
}
```

**Current Hardcoded Values:**
- "Strong winds expected" - "Avoid spraying and protect saplings"
- "Heavy Rainfall Expected in next 24 hours" - "Prepare for proper drainage"

**Crop Card Structure:**
```typescript
{
  cropName: string,       // Hardcoded: "Tomato"
  days: number           // Hardcoded: 7
}
```

#### Market Screen (`market.tsx`)

**Market Data Structure:**
```typescript
{
  id: string,
  location: string,
  price: string,
  trend: string,
  isUp: boolean,
  type: "current" | "nearby"
}
```

**Current Hardcoded Values:**
- Current: Kalyan APMC (₹2500, +6%), Thane APMC (₹1500, -10%)
- Nearby: Panvel APMC (₹1800, +3%)

**Chart Data:**
```typescript
{
  prices: number[],       // [2100, 2300, 2200, 2600, 2400, 2800]
  labels: string[]       // ["1", "5", "10", "15", "20", "25"]
}
```

**Crop Selection:**
- Hardcoded crops: ['Rice', 'Wheat', 'Maize', 'Cotton']
- Default selected: 'Rice'

#### Disease Screen (`disease.tsx`)

**Diagnosis Data Structure:**
```typescript
{
  diseaseName: string,           // Hardcoded: "Powdery Mildew"
  treatmentSuggestions: string[]  // Hardcoded array of strings
}
```

**Current Hardcoded Values:**
- Disease: "Powdery Mildew"
- Treatments:
  - "Apply Tricyclazole 75 WP at 0.6 g/L"
  - "Reduce Nitrogen fertilizer till infection subsides"
  - "Prune infected leaves using sterilized tools"

#### Profile Screen (`profile.tsx`)

**Profile Data Structure:**
```typescript
{
  username: string,      // Hardcoded: "abc_xyz"
  language: string,     // Hardcoded: "English"
  location: string      // Hardcoded: "Kalyan, Maharashtra"
}
```

**Soil Parameters (Hardcoded):**
```typescript
{
  N: "120 kg/ha",
  P: "180 kg/ha",
  K: "200 kg/ha",
  pH: "6.5"
}
```

#### Notifications Screen (`notifications.tsx`)

**Notification Data Structure:**
```typescript
{
  id: string,
  title: string,
  description: string,
  icon: React.Component,
  time: string          // e.g., "10 min ago", "3 hrs ago"
}
```

**Current Hardcoded Values:**
- "Strong winds expected" - "10 min ago"
- "Heavy Rainfall Expected" - "3 hrs ago"
- "Market Alert" - "3 hrs ago"

### 2.3 Default Values Assumed by UI

**Crop Screen:**
- `DATA` array always has at least 1 item (no empty state handling)
- `item.why` array always has items (no null check before `.map()`)
- `item.percent` always present (no null check)
- `item.headerBg` always present (no null check)

**Home Screen:**
- `weatherStats` array always has 3 items
- `marketData` array always has items (no empty state)
- `alertsData` array always has items (no empty state)
- Temperature always "22°C" (hardcoded)
- Location uses translation key (no null handling)

**Market Screen:**
- `marketData` array always has items
- `prices` array always has 6 values
- `labels` array always has 6 values
- `selectedCrop` always has a value

**Disease Screen:**
- Diagnosis card always rendered (no conditional rendering)
- Treatment suggestions always present (hardcoded array)

**Profile Screen:**
- All profile fields always present (no null checks)
- Soil parameters always present (hardcoded)

### 2.4 Fields Assumed to be ALWAYS Present

**Crop Recommendations:**
- `crop` (string) - Used in translation keys, card titles
- `final_score` or `percentNum` - Used for percentage display
- `why` array - Used in `.map()` without null check
- `headerBg` - Used directly in style

**Weather Data:**
- `temperature_celsius` - Currently hardcoded, would need null handling
- `humidity_percent` - Currently hardcoded
- `avg_seasonal_rainfall_mm` - Not currently displayed but would need null handling

**Market Data:**
- `price` - Used directly in display
- `trend` - Used directly in display
- `isUp` - Used for conditional styling

**Location:**
- `district` - Used in display (currently uses translation key)
- `state` - Used in display (currently uses translation key)

---

## 3. SCREENS THAT DEPEND ON BACKEND DATA

### 3.1 Crop Screen (`app/(main)/(tabs)/crop.tsx`)

**Component Name:** `Crop`

**Expected Data:**
- Array of crop recommendations with:
  - `crop` (string) - Crop name
  - `final_score` (number) - For percentage display
  - `agronomic_score` (number) - Not currently displayed
  - `market_score` (number | null) - Not currently displayed
  - `shap_summary` - For "why" explanations (currently hardcoded)

**Current Behavior:**
- Renders hardcoded `DATA` array
- No API call
- No loading state
- No error handling
- No empty state handling

**Rendering Logic:**
- Filters by `mode` ('seasonal' vs 'all')
- Maps over array to render `CropCard` components
- First item gets `isTop={true}` prop (shows trophy icon)

**Would Block Rendering If:**
- Array is empty (would render nothing, no error)
- `item.why` is null/undefined (would crash on `.map()`)
- `item.percent` is null (would display "null%")

### 3.2 Home Screen (`app/(main)/(tabs)/home.tsx`)

**Component Name:** `Home`

**Expected Data:**
- Weather data:
  - `temperature_celsius` (number | null)
  - `humidity_percent` (number | null)
  - `avg_seasonal_rainfall_mm` (number | null)
- Market data (array)
- Alerts data (array)
- Current crop info

**Current Behavior:**
- All data hardcoded
- No API calls
- No loading states
- No error handling

**Rendering Logic:**
- Weather stats mapped from hardcoded array
- Market data mapped from hardcoded array
- Alerts mapped from hardcoded array
- Temperature hardcoded in JSX

**Would Block Rendering If:**
- Arrays are empty (would render empty sections)
- Temperature is null (would display "null°C")
- Location data missing (uses translation key, so safe)

### 3.3 Market Screen (`app/(main)/(tabs)/market.tsx`)

**Component Name:** `Market`

**Expected Data:**
- Market prices (array)
- Historical price data for chart
- Crop selection list

**Current Behavior:**
- All data hardcoded
- No API calls
- No loading states
- No error handling
- Crop dropdown uses hardcoded list

**Rendering Logic:**
- Filters market data by `type` ('current' vs 'nearby')
- Renders chart with hardcoded price array
- Time filter buttons (30D, 60D, 90D) - no functionality

**Would Block Rendering If:**
- `marketData` array empty (would render empty sections)
- `prices` array empty (chart would break)
- `selectedCrop` null (would crash on translation)

### 3.4 Disease Screen (`app/(main)/(tabs)/disease.tsx`)

**Component Name:** `Disease`

**Expected Data:**
- Image URI (from camera/upload)
- Diagnosis result:
  - `diseaseName` (string)
  - `treatmentSuggestions` (string[])

**Current Behavior:**
- Diagnosis data hardcoded
- No API call for image analysis
- Image picker functional (camera/upload)
- No loading state for diagnosis
- No error handling

**Rendering Logic:**
- Diagnosis card always rendered (not conditional)
- Treatment suggestions always displayed (hardcoded)

**Would Block Rendering If:**
- `diseaseName` is null (would display empty)
- `treatmentSuggestions` is null (would crash on `.map()`)

### 3.5 Profile Screen (`app/(main)/profile.tsx`)

**Component Name:** `Profile`

**Expected Data:**
- User profile:
  - `username` (string)
  - `language` (string)
  - `location` (string)
- Soil parameters:
  - `N`, `P`, `K`, `pH` (all strings with units)

**Current Behavior:**
- All data hardcoded
- No API calls
- Edit functionality updates local state only
- No persistence (no API save)

**Rendering Logic:**
- Profile fields always rendered
- Soil parameters always rendered (hardcoded grid)

**Would Block Rendering If:**
- Profile fields null (would display empty strings)
- Soil parameters null (would display empty)

### 3.6 Notifications Screen (`app/(main)/notifications.tsx`)

**Component Name:** `Notifications`

**Expected Data:**
- Array of notifications with:
  - `title` (string)
  - `description` (string)
  - `time` (string)
  - `icon` (React component)

**Current Behavior:**
- All data hardcoded
- No API calls
- No loading states
- No error handling

**Rendering Logic:**
- Maps over hardcoded array
- Renders `Alert` components

**Would Block Rendering If:**
- Array empty (would render empty list, no error)
- `title` or `description` null (would display empty)

---

## 4. ERROR & LOADING HANDLING

### 4.1 Loading States

**Current State: NO LOADING STATES IMPLEMENTED**

- No loading spinners
- No skeleton screens
- No loading indicators
- All screens render immediately with hardcoded data

### 4.2 Error Handling

**Current State: NO ERROR HANDLING IMPLEMENTED**

- No try-catch blocks
- No error boundaries
- No error state UI
- No network error handling
- No API error handling

### 4.3 Timeout Handling

**Current State: NO TIMEOUT HANDLING**

- No timeout configuration
- No timeout error handling
- No retry logic

### 4.4 Empty State Handling

**Current State: NO EMPTY STATE HANDLING**

- No empty state UI for:
  - Empty crop recommendations array
  - Empty market data
  - Empty alerts/notifications
  - Missing weather data
- Arrays are assumed to always have items

### 4.5 Null/Undefined Handling

**Partial Handling Found:**

**Home Screen (`home.tsx`):**
```typescript
const displayValue = value && String(value).trim() !== "" ? value : "-";
```
- `WeatherStatItem` component handles null/empty values
- Displays "-" as fallback
- Only used for weather stats, not applied elsewhere

**No Other Null Handling:**
- Crop screen: No null checks before `.map()` on `item.why`
- Market screen: No null checks on arrays
- Disease screen: No null checks on treatment array
- Profile screen: No null checks on fields

---

## 5. INTEGRATION RISK POINTS

### 5.1 Fields That Could Break UI If Null

#### Crop Screen (`crop.tsx`)

**HIGH RISK:**
- `item.why` - Used in `.map()` without null check
  - **Location:** Line 87-89
  - **Impact:** Would crash if `why` is null/undefined
  - **Fix Required:** `item.why?.map()` or conditional rendering

- `item.percent` - Used directly in display
  - **Location:** Line 79
  - **Impact:** Would display "null%" or "undefined%"
  - **Fix Required:** Null check with fallback

- `item.headerBg` - Used in style
  - **Location:** Line 65
  - **Impact:** Would break styling if null
  - **Fix Required:** Default color fallback

**MEDIUM RISK:**
- `item.title` - Used in translation key
  - **Location:** Line 69
  - **Impact:** Would display translation key if null
  - **Fix Required:** Null check or default crop name

#### Home Screen (`home.tsx`)

**HIGH RISK:**
- `temperature_celsius` - Currently hardcoded, but if from API:
  - **Location:** Line 98
  - **Impact:** Would display "null°C"
  - **Fix Required:** Null check with fallback

**MEDIUM RISK:**
- `marketData` array - Used in `.map()` without empty check
  - **Location:** Line 140-159
  - **Impact:** Would render nothing if empty (no error, but poor UX)
  - **Fix Required:** Empty state UI

- `alertsData` array - Used in `.map()` without empty check
  - **Location:** Line 115-122
  - **Impact:** Would render nothing if empty
  - **Fix Required:** Empty state UI

#### Market Screen (`market.tsx`)

**HIGH RISK:**
- `prices` array - Used in chart without empty check
  - **Location:** Line 197-220
  - **Impact:** Chart would break if empty
  - **Fix Required:** Empty state or chart validation

- `selectedCrop` - Used in translation key
  - **Location:** Line 56
  - **Impact:** Would crash if null
  - **Fix Required:** Default crop value

**MEDIUM RISK:**
- `marketData` array - Used in `.filter().map()` without empty check
  - **Location:** Lines 93-120, 128-155
  - **Impact:** Would render empty sections
  - **Fix Required:** Empty state UI

#### Disease Screen (`disease.tsx`)

**HIGH RISK:**
- `treatmentSuggestions` array - Hardcoded but if from API:
  - **Location:** Lines 110-112
  - **Impact:** Would crash on `.map()` if null
  - **Fix Required:** Null check before mapping

**MEDIUM RISK:**
- `diseaseName` - Hardcoded but if from API:
  - **Location:** Line 106
  - **Impact:** Would display empty if null
  - **Fix Required:** Null check with fallback

#### Profile Screen (`profile.tsx`)

**MEDIUM RISK:**
- Profile fields (`username`, `language`, `location`) - Used directly
  - **Location:** Lines 63-65
  - **Impact:** Would display empty strings if null
  - **Fix Required:** Null checks with fallbacks

- Soil parameters - Used directly in display
  - **Location:** Lines 74-77
  - **Impact:** Would display empty if null
  - **Fix Required:** Null checks with fallbacks

### 5.2 Arrays Assumed to be Non-Empty

**Crop Screen:**
- `DATA` array - Assumed to have items
- `item.why` array - Assumed to have items (no empty check)

**Home Screen:**
- `weatherStats` array - Assumed to have 3 items
- `marketData` array - Assumed to have items
- `alertsData` array - Assumed to have items

**Market Screen:**
- `marketData` array - Assumed to have items
- `prices` array - Assumed to have 6 items
- `labels` array - Assumed to have 6 items
- `crops` array - Assumed to have items

**Disease Screen:**
- `treatmentSuggestions` array - Assumed to have items

**Notifications Screen:**
- `notificationsData` array - Assumed to have items

### 5.3 Numeric Fields Assumed to be Non-Null

**Crop Screen:**
- `item.percentNum` - Not directly used, but `item.percent` string is
- `final_score` - Would need conversion to percentage string

**Home Screen:**
- `temperature_celsius` - Currently hardcoded, but would need null handling
- `humidity_percent` - Currently hardcoded
- `avg_seasonal_rainfall_mm` - Not currently displayed

**Market Screen:**
- `price` values - Currently strings, but if numeric would need null handling
- Chart `prices` array - All values assumed to be numbers

**Profile Screen:**
- Soil parameter values - Currently strings with units, but numeric parts would need null handling

### 5.4 String Fields Assumed to be Non-Null

**All Screens:**
- Translation keys - Assumed to always resolve (handled by i18n library)
- Display text fields - Most used directly without null checks:
  - `crop` names
  - `title` fields
  - `description` fields
  - `location` strings
  - `username`

### 5.5 Nested Object Access Without Null Checks

**Expected from Backend (Not Currently Used):**

**High Risk Nested Paths:**
- `recommendations.predictions[].shap_summary.top_positive_features` - Would crash if `shap_summary` is null
- `xai_data.explanations[].model_explanation[].feature` - Would crash if nested arrays are null
- `sustainability.results[].explanation.summary` - Would crash if `explanation` is null
- `location.district` - Would crash if `location` is null

**Required Safe Access Patterns:**
```typescript
// Instead of:
item.shap_summary.top_positive_features

// Need:
item.shap_summary?.top_positive_features ?? []

// Instead of:
xai_data.explanations[0].model_explanation[0].feature

// Need:
xai_data?.explanations?.[0]?.model_explanation?.[0]?.feature ?? ""
```

### 5.6 Type Mismatches

**Potential Issues:**

1. **Score Display:**
   - Backend returns `final_score` as number (0.0-1.0)
   - Frontend expects `percent` as string (e.g., "60%")
   - **Risk:** Need conversion: `Math.round(final_score * 100) + "%"`

2. **Market Score:**
   - Backend returns `market_score` as number (0.0-1.0) or null
   - Frontend currently uses hardcoded strings
   - **Risk:** Need null handling and conversion

3. **Crop Names:**
   - Backend returns lowercase (e.g., "rice")
   - Frontend translation keys use lowercase
   - **Risk:** Should match, but need to verify

4. **Array Lengths:**
   - Backend returns top 5 crops
   - Frontend currently shows 3 hardcoded crops
   - **Risk:** Should handle variable array lengths

---

## APPENDIX: Component Dependencies

### A.1 Components Used

**Alert Component** (`components/Alert.tsx`):
- Props: `IconComponent`, `title`, `description`, `time?`
- Used in: Home screen, Notifications screen
- **Risk:** No null checks on props

**AppText Component** (`components/AppText.tsx`):
- Props: `variant`, `bold?`, standard Text props
- Used throughout app
- **Risk:** No null checks on children/content

### A.2 Translation Keys Used

**Crop Screen:**
- `crops.{cropName}` - e.g., `crops.rice`
- `crop.top_recommendation`
- `crop.why_this_crop`
- `crop.seasonal`
- `crop.all_season`

**Home Screen:**
- `home.greeting`
- `home.sections.weather`
- `home.sections.alerts`
- `home.sections.crop`
- `home.sections.market`
- `home.weather.temperature`
- `home.weather.precipitation`
- `home.weather.humidity`
- `home.weather.wind_speed`
- `home.crop.days_since`
- `locations.default_region`
- `common.last_updated`

**Market Screen:**
- `market.title`
- `market.subtitle`
- `market.current_market`
- `market.current_price`
- `market.nearby_markets`
- `market.historical_prices`
- `market.graph_title`
- `market.per_kg`

**Disease Screen:**
- `disease.title`
- `disease.subtitle`
- `disease.upload`
- `disease.retake`
- `disease.click_picture`
- `disease.close`
- `disease.diagnosis`

**Profile Screen:**
- `profile.title`
- `profile.subtitle`
- `profile.username`
- `profile.language`
- `profile.location`
- `profile.soil_params`
- `profile.edit`
- `profile.save`

**Notifications Screen:**
- `notifications.title`

---

**END OF REPORT**
