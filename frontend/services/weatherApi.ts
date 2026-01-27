/**
 * Weather API service
 * Fetches real-time weather data from Weather Agent
 * 
 * Endpoint: GET /get_combined_weather?lat=X&lon=Y&season=kharif
 */

import { TimeoutError, NetworkError, APIError } from "./types";

const WEATHER_API_BASE_URL = process.env.EXPO_PUBLIC_WEATHER_API_URL || "http://localhost:8001";
const WEATHER_REQUEST_TIMEOUT = 15000; // 15 seconds

export interface WeatherResponse {
  state: string | null;
  district: string | null;
  temperature_celsius: number | null;
  humidity_percent: number | null;
  avg_seasonal_rainfall_mm: number | null;
  wind_speed_kmh: number | null;
  status: string;
}

/**
 * Fetches real-time weather data for given coordinates
 * 
 * @param latitude - User's latitude
 * @param longitude - User's longitude
 * @param season - Current season (kharif, rabi, or zaid)
 * @returns Weather data including temperature, humidity, and rainfall
 * @throws NetworkError for network failures
 * @throws TimeoutError for request timeouts
 * @throws APIError for API errors
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
  season: string = "kharif"
): Promise<WeatherResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`[Weather API] Request timeout after ${WEATHER_REQUEST_TIMEOUT}ms`);
    controller.abort();
  }, WEATHER_REQUEST_TIMEOUT);

  try {
    const url = new URL("/get_combined_weather/", WEATHER_API_BASE_URL);
    url.searchParams.append("lat", String(latitude));
    url.searchParams.append("lon", String(longitude));
    url.searchParams.append("season", season);

    console.log(`[Weather API] Fetching weather: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    console.log(`[Weather API] Response status: ${response.status}`);

    if (!response.ok) {
      let errorDetail = "Unknown error";
      try {
        const errorData = await response.json();
        errorDetail = errorData?.detail || `HTTP ${response.status}`;
        console.error(`[Weather API] Error response:`, errorData);
      } catch (parseError) {
        console.error(`[Weather API] Could not parse error response:`, parseError);
        errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new APIError(
        `Failed to fetch weather: ${errorDetail}`,
        response.status,
        {}
      );
    }

    let data;
    try {
      data = await response.json();
      console.log(`[Weather API] Response data:`, data);
    } catch (parseError) {
      console.error(`[Weather API] Failed to parse response JSON:`, parseError);
      throw new NetworkError("Failed to parse weather response");
    }

    return data as WeatherResponse;
  } catch (error: any) {
    console.error(`[Weather API] Fetch error:`, error);

    // Handle abort/timeout
    if (error instanceof Error && error.name === "AbortError") {
      const timeoutMsg = `Weather request timed out (${WEATHER_REQUEST_TIMEOUT}ms)`;
      console.error(`[Weather API] ${timeoutMsg}`);
      throw new TimeoutError(timeoutMsg);
    }

    // Handle network errors
    if (error instanceof TypeError) {
      const networkMsg = `Network error: ${error.message}. Check if Weather Agent (${WEATHER_API_BASE_URL}) is running on port 8001`;
      console.error(`[Weather API] ${networkMsg}`);
      throw new NetworkError(networkMsg);
    }

    // Re-throw our custom errors
    if (error instanceof APIError || error instanceof NetworkError || error instanceof TimeoutError) {
      throw error;
    }

    // Generic fallback
    const fallbackMsg = `Could not fetch weather: ${error.message || String(error)}`;
    console.error(`[Weather API] ${fallbackMsg}`);
    throw new NetworkError(fallbackMsg);
  } finally {
    clearTimeout(timeoutId);
  }
}
