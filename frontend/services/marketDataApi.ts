/**
 * Market Data API service
 * Fetches available commodities, states, APMCs, and current market prices
 */

import { TimeoutError, NetworkError, APIError } from "./types";
import * as SecureStore from 'expo-secure-store';

const MARKET_API_BASE_URL = process.env.EXPO_PUBLIC_MARKET_API_URL || "http://localhost:8003";
const REQUEST_TIMEOUT = 90000; // 90 seconds // 60 seconds

export interface MarketCommodity {
  name: string;
  code?: number;
}

export interface MarketAPMC {
  name: string;
  district: string;
  state: string;
}

export interface CurrentMarketPrice {
  apmc: string;
  state: string;
  commodity: string;
  current_price: number;
  avg_price_10d: number;
  price_change_percent: number;
  date: string;
}

export interface MarketDataResponse {
  states: string[];
  apmcs_by_state: Record<string, string[]>;
  commodities_by_apmc: Record<string, string[]>;
  all_commodities: string[];
}

/**
 * Get available states, APMCs, and commodities
 */
export async function fetchMarketData(): Promise<MarketDataResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`[Market Data API] Request timeout after ${REQUEST_TIMEOUT}ms`);
    controller.abort();
  }, REQUEST_TIMEOUT);

  try {
    const baseUrl = MARKET_API_BASE_URL.endsWith('/') ? 
      MARKET_API_BASE_URL.slice(0, -1) : MARKET_API_BASE_URL;
    const url = `${baseUrl}/market/data/`;

    const token = await SecureStore.getItemAsync('userToken');

    console.log(`[Market Data API] Fetching: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      console.error(`[Market Data API] Error: ${errorMessage}`);
      throw new APIError(errorMessage, response.status);
    }

    const data: MarketDataResponse = await response.json();
    console.log(`[Market Data API] Success`);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      console.error(`[Market Data API] Timeout after ${REQUEST_TIMEOUT}ms`);
      throw new TimeoutError(`Request timed out after ${REQUEST_TIMEOUT / 1000} seconds`);
    }

    if (error instanceof APIError) {
      throw error;
    }

    if (error instanceof TypeError || (error instanceof Error && (
      error.message.includes("fetch") ||
      error.message.includes("Network") ||
      error.message.includes("Failed to connect")
    ))) {
      console.error(`[Market Data API] Network error: ${error.message}`);
      throw new NetworkError(
        `Network error: ${error.message}\n\nEnsure backend is running on port 8003`
      );
    }

    throw error;
  }
}

/**
 * Get current market prices for specific APMCs near user location
 */
export async function fetchCurrentMarketPrices(
  state: string,
  commodity?: string
): Promise<CurrentMarketPrice[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const baseUrl = MARKET_API_BASE_URL.endsWith('/') ? 
      MARKET_API_BASE_URL.slice(0, -1) : MARKET_API_BASE_URL;
    const url = new URL(`${baseUrl}/market/current-prices/`);
    url.searchParams.append("state", state);
    if (commodity) {
      url.searchParams.append("commodity", commodity);
    }

    const token = await SecureStore.getItemAsync('userToken');

    console.log(`[Market Current Prices API] Fetching: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new APIError(errorMessage, response.status);
    }

    const data = await response.json();
    const prices: CurrentMarketPrice[] = data.prices || [];
    console.log(`[Market Current Prices API] Success: ${prices.length} prices returned`);
    return prices;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new TimeoutError(`Request timed out after ${REQUEST_TIMEOUT / 1000} seconds`);
    }

    if (error instanceof APIError) {
      throw error;
    }

    if (error instanceof TypeError || (error instanceof Error && (
      error.message.includes("fetch") ||
      error.message.includes("Network")
    ))) {
      throw new NetworkError(`Network error: ${error.message}`);
    }

    throw error;
  }
}
