/**
 * Market API client
 * Direct integration with Backend Market Agent (port 8004)
 * 
 * Endpoints:
 * - GET /market/evaluate?crop=X&state=Y
 * - GET /market/forecast?crop=X&state=Y
 */

import { APIError, NetworkError, TimeoutError } from "./types";

// Market Agent base URL
// Market Agent runs independently on port 8004
// IMPORTANT: For mobile devices/emulators, localhost won't work!
// - Android Emulator: Use "http://10.0.2.2:8004"
// - iOS Simulator: Use "http://localhost:8004"
// - Physical device: Use your computer's IP, e.g., "http://192.168.1.100:8004"
// Set EXPO_PUBLIC_MARKET_API_URL environment variable to override
const MARKET_API_BASE_URL =
  process.env.EXPO_PUBLIC_MARKET_API_URL || "http://localhost:8004";

// Request timeout in milliseconds (30 seconds)
// Market Agent is fast; should respond within seconds
const MARKET_REQUEST_TIMEOUT = 90000; // 90 seconds for evaluation queries // 60 seconds for evaluation/forecast

/**
 * Market evaluation response from backend
 * Returned by GET /market/evaluate
 */
export interface MarketEvaluationResponse {
  crop: string;
  state: string;
  price: number;
  price_norm: number; // 0-1 normalized
  stability: number; // 0-1
  trend_percent: number; // -100 to 100
  market_score: number; // 0-100
  confidence: number; // 0-1
}

/**
 * Single forecast price point
 */
export interface PricePoint {
  date: string; // ISO format: "YYYY-MM-DD"
  price: number;
}

/**
 * Market forecast response from backend
 * Returned by GET /market/forecast
 */
export interface MarketForecastResponse {
  crop: string;
  state: string;
  trend_percent: number;
  persistence: number;
  confidence: number;
  forecast_30: PricePoint[];
  forecast_60: PricePoint[];
  forecast_90: PricePoint[];
}

/**
 * Fetches market evaluation for a crop in a state
 * 
 * Uses AbortController to prevent hanging requests
 * 
 * @param crop - Crop name (e.g., "Rice", "Wheat")
 * @param state - State name (e.g., "Maharashtra")
 * @returns Market evaluation data
 * @throws APIError for HTTP errors (404, 500, etc.)
 * @throws NetworkError for network failures
 * @throws TimeoutError for request timeouts
 */
export async function fetchMarketEvaluation(
  crop: string,
  state: string
): Promise<MarketEvaluationResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MARKET_REQUEST_TIMEOUT);

  try {
    const url = new URL("/market/evaluate", MARKET_API_BASE_URL);
    url.searchParams.append("crop", crop);
    url.searchParams.append("state", state);

    console.log(`[Market API] Fetching evaluation: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    console.log(`[Market API] Evaluation response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[Market API] Evaluation error:`, errorData);
      throw new APIError(
        `Failed to fetch market evaluation: ${errorData.detail || response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    console.log(`[Market API] Evaluation data:`, data);
    return data as MarketEvaluationResponse;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new NetworkError(
        `Network error fetching market evaluation: ${error.message}`
      );
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new TimeoutError(
        `Market evaluation request timed out after ${MARKET_REQUEST_TIMEOUT}ms`
      );
    }

    throw new NetworkError(
      `Unexpected error fetching market evaluation: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches market forecast for a crop in a state
 * 
 * Returns forecast data for 30, 60, and 90 day horizons
 * Uses AbortController to prevent hanging requests
 * 
 * @param crop - Crop name (e.g., "Rice", "Wheat")
 * @param state - State name (e.g., "Maharashtra")
 * @returns Market forecast data with 3 horizons
 * @throws APIError for HTTP errors (404, 500, etc.)
 * @throws NetworkError for network failures
 * @throws TimeoutError for request timeouts
 */
export async function fetchMarketForecast(
  crop: string,
  state: string
): Promise<MarketForecastResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MARKET_REQUEST_TIMEOUT);

  try {
    const url = new URL("/market/forecast", MARKET_API_BASE_URL);
    url.searchParams.append("crop", crop);
    url.searchParams.append("state", state);

    console.log(`[Market API] Fetching forecast: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    console.log(`[Market API] Forecast response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[Market API] Forecast error:`, errorData);
      throw new APIError(
        `Failed to fetch market forecast: ${errorData.detail || response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    console.log(`[Market API] Forecast data:`, data);
    return data as MarketForecastResponse;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new NetworkError(
        `Network error fetching market forecast: ${error.message}`
      );
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new TimeoutError(
        `Market forecast request timed out after ${MARKET_REQUEST_TIMEOUT}ms`
      );
    }

    throw new NetworkError(
      `Unexpected error fetching market forecast: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Nearby market price data for home screen
 */
export interface NearbyMarketPrice {
  state: string;
  apmc: string;
  commodity: string;
  current_price: number;
  avg_price_10d: number | null;
  price_change_percent: number;
  date: string;
}

/**
 * Fetches nearby market prices for a commodity in a state
 * 
 * Uses the /market/current-prices endpoint to get latest prices
 * with 10-day average and price change percentage
 * 
 * @param state - State name (e.g., "Maharashtra")
 * @param commodity - Commodity name (e.g., "Rice", "Wheat")
 * @param limit - Number of markets to return (default: 3)
 * @returns Array of nearby market prices
 * @throws APIError for HTTP errors
 * @throws NetworkError for network failures
 * @throws TimeoutError for request timeouts
 */
export async function fetchNearbyMarketPrices(
  state: string,
  commodity: string,
  limit: number = 3
): Promise<NearbyMarketPrice[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MARKET_REQUEST_TIMEOUT);

  try {
    const url = new URL("/market/current-prices", MARKET_API_BASE_URL);
    url.searchParams.append("state", state);
    url.searchParams.append("commodity", commodity);
    url.searchParams.append("limit", String(limit));

    console.log(`[Market API] Fetching nearby prices: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    console.log(`[Market API] Nearby prices response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[Market API] Nearby prices error:`, errorData);
      throw new APIError(
        `Failed to fetch nearby prices: ${errorData.detail || response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    console.log(`[Market API] Nearby prices data:`, data);
    
    // Return the prices array, limited to requested number
    const prices = data.prices || [];
    return prices.slice(0, limit) as NearbyMarketPrice[];
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new NetworkError(
        `Network error fetching nearby prices: ${error.message}`
      );
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new TimeoutError(
        `Nearby prices request timed out after ${MARKET_REQUEST_TIMEOUT}ms`
      );
    }

    throw new NetworkError(
      `Unexpected error fetching nearby prices: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
