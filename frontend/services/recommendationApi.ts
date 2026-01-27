/**
 * Recommendation API service
 * Fetches crop recommendations and sustainability data
 * 
 * Endpoint: POST /get_full_recommendation/
 * Returns: Recommendations + Sustainability scores + XAI data
 */

import { TimeoutError, NetworkError, APIError } from "./types";
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
const REQUEST_TIMEOUT = 90000; // 90 seconds (orchestrator calls multiple agents)

export interface RecommendationRequest {
  lat: number;
  lon: number;
  season: "kharif" | "rabi" | "zaid";
  mode: "seasonal" | "all_season";
}

export interface SustainabilityDimension {
  category: string;
  factor: number;
  weight: number;
  impact: string;
}

export interface FeatureExplanation {
  feature: string;
  effect: "positive" | "negative" | "neutral";
  reason: string;
}

export interface SustainabilityResult {
  crop: string;
  sustainability_score: number; // 0.0-1.0
  dimensions: {
    water_intensity: SustainabilityDimension;
    soil_impact: SustainabilityDimension;
    cultivation_intensity: SustainabilityDimension;
  };
  explanation: {
    summary: string;
    details: string[];
  };
}

export interface CropRecommendation {
  crop: string;
  final_score: number;
  agronomic_score: number;
  market_score: number | null;
  raw_probability: number;
  sustainability?: SustainabilityResult;
  xai_explanations?: FeatureExplanation[]; // XAI feature explanations
}

export interface RecommendationResponse {
  status: string;
  location: {
    district: string;
    state: string;
  };
  recommendations: {
    ranking_logic: string;
    top_n: number;
    predictions: CropRecommendation[];
  };
  sustainability: {
    results: SustainabilityResult[];
  } | null;
}

/**
 * Fetches crop recommendations with sustainability data
 * 
 * @param lat - Latitude coordinate
 * @param lon - Longitude coordinate
 * @param season - Current season (kharif, rabi, or zaid)
 * @param mode - Recommendation mode (seasonal or all_season)
 * @returns Recommendations with sustainability scores
 * @throws NetworkError for network failures
 * @throws TimeoutError for request timeouts
 * @throws APIError for API errors
 */
export async function fetchRecommendationsWithSustainability(
  lat: number,
  lon: number,
  season: "kharif" | "rabi" | "zaid" = "kharif",
  mode: "seasonal" | "all_season" = "seasonal"
): Promise<RecommendationResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`[Recommendation API] Request timeout after ${REQUEST_TIMEOUT}ms`);
    controller.abort();
  }, REQUEST_TIMEOUT);

  try {
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const url = `${baseUrl}/get_full_recommendation/`;
    
    const token = await SecureStore.getItemAsync('userToken');
    const requestBody: RecommendationRequest = {
      lat,
      lon,
      season,
      mode,
    };

    console.log(`[Recommendation API] Fetching: ${url}`);
    console.log(`[Recommendation API] Params: lat=${lat}, lon=${lon}, season=${season}, mode=${mode}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(requestBody),
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
      console.error(`[Recommendation API] Error: ${errorMessage}`);
      throw new APIError(errorMessage, response.status);
    }

    const data: RecommendationResponse = await response.json();
    
    // Merge sustainability data and XAI explanations with recommendations
    if (data.recommendations.predictions) {
      const sustainabilityMap = data.sustainability ? 
        new Map(data.sustainability.results.map(s => [s.crop.toLowerCase(), s])) :
        new Map();
      
      // Build XAI explanations map from backend response
      const xaiMap = (data as any).xai_data?.explanations ?
        new Map((data as any).xai_data.explanations.map((xai: any) => [
          xai.crop.toLowerCase(), 
          xai.model_explanation || []
        ])) :
        new Map();
      
      data.recommendations.predictions = data.recommendations.predictions.map(pred => ({
        ...pred,
        sustainability: sustainabilityMap.get(pred.crop.toLowerCase()),
        xai_explanations: xaiMap.get(pred.crop.toLowerCase()),
      }));
    }

    console.log(`[Recommendation API] Success: ${data.recommendations.predictions.length} crops returned`);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      console.error(`[Recommendation API] Timeout after ${REQUEST_TIMEOUT}ms`);
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
      console.error(`[Recommendation API] Network error: ${error.message}`);
      throw new NetworkError(
        `Network error: ${error.message}\n\nEnsure backend is running on port 8000 and using correct IP`
      );
    }

    throw error;
  }
}
