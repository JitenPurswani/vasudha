/**
 * API client for backend integration
 * Handles POST /get_full_recommendation/ endpoint
 */

import {
  RecommendationRequest,
  BackendRecommendationResponse,
  APIError,
  NetworkError,
  TimeoutError,
} from "./types";

import * as SecureStore from 'expo-secure-store';

// API base URL - can be configured via environment variable
// IMPORTANT: For mobile devices/emulators, localhost won't work!
// - Android Emulator: Use "http://10.0.2.2:8000"
// - iOS Simulator: Use "http://localhost:8000" (works)
// - Physical device: Use your computer's IP, e.g., "http://192.168.1.100:8000"
// Set EXPO_PUBLIC_API_URL environment variable to override
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
const AUTH_URL = process.env.EXPO_PUBLIC_AUTH_URL || "http://192.168.198.191:8008";
// Request timeout in milliseconds (90 seconds)
// Orchestrator calls multiple agents (weather, soil, recommendation, market, sustainability, XAI)
// Each agent may take time, especially on first run
const REQUEST_TIMEOUT = 90000;

/**
 * Maps frontend mode value to backend mode value
 * Frontend uses 'all', backend expects 'all_season'
 */
function mapModeToBackend(
  mode: "seasonal" | "all"
): "seasonal" | "all_season" {
  return mode === "all" ? "all_season" : "seasonal";
}

/**
 * Fetches crop recommendations from backend orchestrator
 * 
 * @param request - Request parameters (lat, lon, season, mode)
 * @returns Parsed JSON response
 * @throws APIError for HTTP errors
 * @throws NetworkError for network failures
 * @throws TimeoutError for request timeouts
 */
export async function fetchRecommendations(
  request: Omit<RecommendationRequest, "mode"> & {
    mode: "seasonal" | "all"; // Frontend mode type
  }
): Promise<BackendRecommendationResponse> {
  // Map frontend mode to backend mode
  const backendMode = mapModeToBackend(request.mode);

  const requestBody: RecommendationRequest = {
    lat: request.lat,
    lon: request.lon,
    season: request.season,
    mode: backendMode,
  };

  // Ensure URL is correctly formed with port
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const url = `${baseUrl}/get_full_recommendation/`;
  console.log("[API] Using base URL:", baseUrl);

  const token = await SecureStore.getItemAsync('userToken');
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT);

  try {
    console.log("[API] Fetching from:", url);
    console.log("[API] Request body:", JSON.stringify(requestBody, null, 2));
    console.log("[API] Timeout set to:", REQUEST_TIMEOUT / 1000, "seconds");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    console.log("[API] Response status:", response.status);

    clearTimeout(timeoutId);

    // Handle HTTP errors
    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}`;
      let errorData: any = null;

      try {
        errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      throw new APIError(errorMessage, response.status, errorData);
    }

    // Parse JSON response
    const data: BackendRecommendationResponse = await response.json();

    // Validate response structure (basic check)
    if (!data.recommendations || !Array.isArray(data.recommendations.predictions)) {
      throw new APIError(
        "Invalid response structure: missing recommendations.predictions",
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle AbortError (timeout)
    if (error instanceof Error && error.name === "AbortError") {
      throw new TimeoutError(
        `Request timed out after ${REQUEST_TIMEOUT / 1000} seconds`
      );
    }

    // Re-throw APIError (already handled)
    if (error instanceof APIError) {
      throw error;
    }

    // Handle network errors
    if (
      error instanceof TypeError ||
      (error instanceof Error && (
        error.message.includes("fetch") ||
        error.message.includes("Network") ||
        error.message.includes("network") ||
        error.message.includes("Failed to connect") ||
        error.message.includes("ECONNREFUSED")
      ))
    ) {
      console.error("[API] Network error:", error);
      throw new NetworkError(
        "Network error: Unable to connect to server. Please check your internet connection and ensure the backend is running."
      );
    }

    // Handle other errors
    console.error("[API] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unexpected error during API request: ${errorMessage}`
    );
  }
}
const api = {
  post: async (endpoint: string, body: any) => {
    const isAuth = endpoint.includes('login') || endpoint.includes('register');
    const baseUrl = isAuth ? AUTH_URL : API_BASE_URL;
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${base}${path}`;

    console.log("[API] POST to:", url);
    if (!endpoint.includes('login') && !endpoint.includes('register')) {
      console.log(`[API] Request to ${endpoint}:`, body);
    } else {
      console.log(`[API] Secure request to ${endpoint} (body hidden)`);
    }
    const token = await SecureStore.getItemAsync('userToken');
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    console.log("[API] Response status:", response.status);
    const responseText = await response.text();
    console.log("[API] Response text:", responseText.substring(0, 200));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("[API] JSON parse error:", parseError);
      console.error("[API] Response was:", responseText);
      throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}`);
    }

    if (!response.ok) {
      throw {
        response: {
          status: response.status,
          data: data
        }
      };
    }

    return {
      status: response.status,
      data: data,
    };
  }
};

export default api;