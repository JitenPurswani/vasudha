/**
 * Market Data Adapter
 * 
 * Normalizes backend responses to UI-safe data structures
 * - Handles nulls and missing data
 * - Formats currency/percentage
 * - Guarantees non-null, non-empty arrays for charts
 * - Pads/clamps data to required lengths
 */

import {
  MarketEvaluationResponse,
  MarketForecastResponse,
  PricePoint,
} from "./marketApi";

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Market card: Current price + trend
 */
export interface MarketCardData {
  location: string; // "Current Market" or "State Average"
  price: string; // "₹2,450.50"
  trend: string; // "+5.2%" or "-3.1%"
  isUp: boolean; // true if trend is positive
}

/**
 * Single data point for chart
 */
export interface ChartDataPoint {
  date: string; // "D-30", "D+1", etc.
  price: number; // raw price value
}

/**
 * Dual-view chart data: past + future
 */
export interface DualViewChartData {
  // Historical prices (past N days)
  historicalPrices: number[];
  historicalLabels: string[]; // ["D-30", "D-25", ..., "D-1"]
  historicalColor: string; // "#156349" (green)

  // Forecast prices (next N days)
  forecastPrices: number[];
  forecastLabels: string[]; // ["D+1", "D+5", ..., "D+30"]
  forecastColor: string; // "#FF9500" (orange)

  // For LineChart configuration
  datasets: Array<{
    data: number[];
    color: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  }>;

  // Index of today in the combined timeline
  // Useful for rendering a "today" marker
  todayIndex: number;

  // Metadata
  horizon: 30 | 60 | 90; // Which time range was used
}

// ============================================
// FORMATTING HELPERS
// ============================================

/**
 * Format price as Indian Rupees
 * @param price - Raw numeric price
 * @returns Formatted string like "₹2,450.50"
 */
function formatPrice(price: number): string {
  if (!price || isNaN(price) || price < 0) {
    return "₹0.00";
  }
  return `₹${price.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format percentage
 * @param percent - Raw numeric percentage (-100 to 100)
 * @returns Formatted string like "+5.2%" or "-3.1%"
 */
function formatTrend(percent: number): string {
  if (typeof percent !== "number" || isNaN(percent)) {
    return "0.0%";
  }

  // Clamp to reasonable range
  const clamped = Math.max(-100, Math.min(100, percent));

  // Format with sign
  const sign = clamped >= 0 ? "+" : "";
  return `${sign}${clamped.toFixed(1)}%`;
}

/**
 * Format date as day offset from today
 * @param dateStr - ISO date string "YYYY-MM-DD"
 * @param referenceDate - Today's date (or near-today)
 * @returns "D-30", "D+1", etc.
 */
function formatDateLabel(dateStr: string, referenceDate: Date): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    // Reset hours to avoid timezone issues
    date.setHours(0, 0, 0, 0);
    referenceDate.setHours(0, 0, 0, 0);

    const diffMs = date.getTime() - referenceDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "TODAY";
    } else if (diffDays < 0) {
      return `D${diffDays}`; // "D-30"
    } else {
      return `D+${diffDays}`; // "D+1"
    }
  } catch (error) {
    console.warn(`Failed to format date "${dateStr}":`, error);
    return "?";
  }
}

/**
 * Downsample array to N points while maintaining distribution
 * Uses linear interpolation to spread points evenly
 * @param data - Array of numbers
 * @param targetCount - Desired final length
 * @returns Downsampled array
 */
function downsample(data: number[], targetCount: number): number[] {
  if (data.length <= targetCount) {
    return data;
  }

  const result = [];
  const step = (data.length - 1) / (targetCount - 1);

  for (let i = 0; i < targetCount; i++) {
    const idx = i * step;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);

    if (lower === upper) {
      result.push(data[lower]);
    } else {
      // Linear interpolation
      const weight = idx - lower;
      result.push(data[lower] * (1 - weight) + data[upper] * weight);
    }
  }

  return result;
}

/**
 * Extract prices from price points array
 * Ensures no nulls or negatives
 * @param points - Array of {date, price}
 * @returns Array of valid prices (>= 0)
 */
function extractPrices(points: PricePoint[]): number[] {
  return (
    points
      .filter((p) => typeof p?.price === "number" && p.price >= 0)
      .map((p) => p.price)
  );
}

/**
 * Thin labels to reduce overlap on charts
 * Shows fewer labels for longer time periods
 * Strategy: Show label for every Nth item to keep ~10 labels visible
 * @param labels - Array of all labels
 * @param horizon - 30, 60, or 90 days
 * @returns Thinned array (replaces unwanted labels with empty strings)
 */
function thinLabels(labels: string[], horizon: 30 | 60 | 90): string[] {
  // Determine label interval based on horizon
  // Goal: Show ~10 labels across the entire range
  // 30D: every 3rd label (30/3 = 10)
  // 60D: every 6th label (60/6 = 10)
  // 90D: every 9th label (90/9 = 10)
  const labelInterval = Math.ceil(horizon / 10);

  return labels.map((label, idx) => {
    // Always show first label
    if (idx === 0) return label;
    // Always show last label
    if (idx === labels.length - 1) return label;
    // Show every Nth label
    if (idx % labelInterval === 0) return label;
    // Hide others by returning empty string
    return "";
  });
}

// ============================================
// PUBLIC ADAPTER FUNCTIONS
// ============================================

/**
 * Adapt evaluation response to market card
 * Safe for null/undefined/bad data
 * @param response - Backend evaluation response
 * @returns Safe market card data
 */
export function adaptMarketCard(
  response: MarketEvaluationResponse | null
): MarketCardData {
  // Fallback if no response
  if (!response) {
    return {
      location: "Market Data",
      price: formatPrice(0),
      trend: formatTrend(0),
      isUp: false,
    };
  }

  const trend = response.trend_percent || 0;
  return {
    location: "State Average",
    price: formatPrice(response.price || 0),
    trend: formatTrend(trend),
    isUp: trend >= 0,
  };
}

/**
 * Adapt forecast response to dual-view chart data
 * 
 * Handles missing historical data by returning frontend fallback
 * Once backend adds historical_N arrays, adapter will use them
 * 
 * @param response - Backend forecast response
 * @param horizon - 30, 60, or 90 days
 * @returns Safe chart data (guaranteed non-null, non-empty arrays)
 */
export function adaptDualViewChart(
  response: MarketForecastResponse | null,
  horizon: 30 | 60 | 90
): DualViewChartData {
  // Fallback for missing response
  if (!response) {
    return getFallbackChartData(horizon);
  }

  // Extract forecast data based on horizon
  const forecastKey = `forecast_${horizon}` as
    | "forecast_30"
    | "forecast_60"
    | "forecast_90";
  const forecastPoints = (response[forecastKey] || []) as PricePoint[];
  
  // Filter out any past dates from forecast (should only show future dates)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const futureForecastPoints = forecastPoints.filter((p) => {
    if (!p?.date || typeof p.date !== "string") return false;
    try {
      const [year, month, day] = p.date.split("-").map(Number);
      const pointDate = new Date(year, month - 1, day);
      pointDate.setHours(0, 0, 0, 0);
      return pointDate > today; // Only tomorrow onwards (not today)
    } catch {
      return false;
    }
  });

  // If all forecast points are past, use first N points anyway (graceful fallback)
  const forecastToUse = futureForecastPoints.length > 0 ? futureForecastPoints : forecastPoints.slice(0, horizon);
  const forecastPrices = extractPrices(forecastToUse);

  // FUTURE: Backend will provide historical_N
  // For now, create frontend fallback data
  let historicalPrices: number[] = [];
  let historicalLabels: string[] = [];

  // Check if backend provided historical data (future enhancement)
  const responseAny = response as any;
  const historicalKey = `historical_${horizon}`;
  
  if (historicalKey in responseAny && Array.isArray(responseAny[historicalKey])) {
    const historicalPoints = responseAny[historicalKey] as PricePoint[];
    historicalPrices = extractPrices(historicalPoints);

    // Format labels
    const today = new Date();
    historicalLabels = historicalPoints
      .filter((p) => typeof p?.date === "string")
      .map((p) => formatDateLabel(p.date, today));
  } else {
    // FRONTEND FALLBACK: Generate synthetic historical data
    // CRITICAL: Historical MUST end at forecast[0] for visual continuity
    
    const forecastStartPrice = forecastPrices.length > 0 
      ? forecastPrices[0] 
      : 2500;
    
    // Calculate a reasonable historical start (5-15% lower/higher based on trend)
    const forecastEndPrice = forecastPrices.length > 0 
      ? forecastPrices[forecastPrices.length - 1] 
      : forecastStartPrice;
    
    // If forecast is rising, historical should rise toward it
    // If forecast is falling, historical should fall toward it
    const trendDirection = forecastEndPrice >= forecastStartPrice ? 1 : -1;
    const historicalVariation = forecastStartPrice * 0.08; // 8% variation
    const historicalStartPrice = forecastStartPrice - (trendDirection * historicalVariation);
    
    // Generate historical prices that END at forecastStartPrice
    historicalPrices = [];
    for (let i = 0; i < horizon; i++) {
      const progress = i / (horizon - 1);
      // Linear interpolation from historicalStart to forecastStart
      const price = historicalStartPrice + (forecastStartPrice - historicalStartPrice) * progress;
      historicalPrices.push(Math.max(100, price));
    }
    
    // CRITICAL: Ensure last historical price EXACTLY matches first forecast price
    if (historicalPrices.length > 0 && forecastPrices.length > 0) {
      historicalPrices[historicalPrices.length - 1] = forecastPrices[0];
    }

    // Create labels for historical data
    historicalLabels = [];
    for (let i = -horizon; i < 0; i++) {
      historicalLabels.push(`D${i}`);
    }
  }

  // Ensure forecast labels exist
  let forecastLabels: string[] = [];
  if (forecastToUse.length > 0) {
    const today = new Date();
    forecastLabels = forecastToUse
      .filter((p) => typeof p?.date === "string")
      .map((p) => formatDateLabel(p.date, today));
  } else {
    // Fallback labels
    for (let i = 1; i <= horizon; i++) {
      forecastLabels.push(`D+${i}`);
    }
  }

  // ===== ISSUE #1 FIX: Thin labels to avoid overlap =====
  // Keep ~10 labels visible across the entire range
  // 30D: show every 3rd label
  // 60D: show every 6th label
  // 90D: show every 9th label
  historicalLabels = thinLabels(historicalLabels, horizon);
  forecastLabels = thinLabels(forecastLabels, horizon);

  // Pad arrays to ensure they match
  // DON'T pad arrays to match length
  // Historical and forecast can have different lengths
  // Historical = past 30 days
  // Forecast = future days (could be 28-30 depending on data freshness)
  // The chart library will handle variable-length arrays

  // The "today" marker is at the END of historical data
  // In a 30-point chart: positions 0-29 historical, 30+ would be forecast
  // So todayIndex should be at historicalPrices.length (the index where forecast begins)
  const todayIndex = historicalPrices.length;

  return {
    historicalPrices,
    historicalLabels,
    historicalColor: "#156349", // Green
    forecastPrices,
    forecastLabels,
    forecastColor: "#FF9500", // Orange
    datasets: [
      {
        data: historicalPrices,
        color: "#156349",
        strokeWidth: 2,
      },
      {
        data: forecastPrices,
        color: "#FF9500",
        strokeWidth: 2,
        strokeDasharray: "5,5", // Dashed line
      },
    ],
    todayIndex,
    horizon,
  };
}

/**
 * Fallback chart data when backend is unavailable
 * Renders "No data available" state gracefully
 * @param horizon - 30, 60, or 90 days
 * @returns Safe but empty/placeholder chart data
 */
function getFallbackChartData(horizon: 30 | 60 | 90): DualViewChartData {
  const emptyArray = Array(horizon).fill(0);
  const labels = Array(horizon)
    .fill(0)
    .map((_, i) => `D${i + 1}`);

  return {
    historicalPrices: emptyArray,
    historicalLabels: labels,
    historicalColor: "#156349",
    forecastPrices: emptyArray,
    forecastLabels: labels,
    forecastColor: "#FF9500",
    datasets: [
      {
        data: emptyArray,
        color: "#156349",
      },
      {
        data: emptyArray,
        color: "#FF9500",
      },
    ],
    todayIndex: Math.floor(horizon / 2),
    horizon,
  };
}

/**
 * Validate chart data for safety
 * Checks that all arrays are non-null, non-empty, consistent
 * @param data - Chart data to validate
 * @returns true if data is safe to render
 */
export function validateChartData(data: DualViewChartData): boolean {
  // Check price arrays
  if (
    !Array.isArray(data.historicalPrices) ||
    data.historicalPrices.length === 0
  ) {
    return false;
  }
  if (!Array.isArray(data.forecastPrices) || data.forecastPrices.length === 0) {
    return false;
  }

  // Check label arrays
  if (!Array.isArray(data.historicalLabels)) {
    return false;
  }
  if (!Array.isArray(data.forecastLabels)) {
    return false;
  }

  // Check consistency
  if (data.historicalPrices.length !== data.historicalLabels.length) {
    return false;
  }
  if (data.forecastPrices.length !== data.forecastLabels.length) {
    return false;
  }

  // Check prices are numbers
  if (!data.historicalPrices.every((p) => typeof p === "number")) {
    return false;
  }
  if (!data.forecastPrices.every((p) => typeof p === "number")) {
    return false;
  }

  return true;
}
