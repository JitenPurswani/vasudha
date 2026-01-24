/**
 * Type definitions for backend API responses and frontend data structures
 * Based on POST /get_full_recommendation/ endpoint
 */

// ============================================
// BACKEND RESPONSE TYPES (Exact structure)
// ============================================

export interface BackendLocation {
  district: string;
  state: string;
}

export interface BackendSHAPSummary {
  top_positive_features: string[];
  top_negative_features: string[];
  neutral_features: string[];
}

export interface BackendRecommendationPrediction {
  crop: string; // lowercase, e.g., "rice", "sweetpotato"
  final_score: number; // range: -1.0 to 1.0
  agronomic_score: number; // range: 0.0-1.0
  market_score: number | null; // range: 0.0-1.0 or null
  raw_probability: number; // range: 0.0-1.0
  shap_summary: BackendSHAPSummary | null;
}

export interface BackendRecommendations {
  ranking_logic: string;
  top_n: number;
  predictions: BackendRecommendationPrediction[];
}

export interface BackendSustainabilityResult {
  crop: string;
  sustainability_score: number;
  dimensions: {
    water_intensity: {
      category: string;
      factor: number;
      weight: number;
      impact: string;
    };
    soil_impact: {
      category: string;
      factor: number;
      weight: number;
      impact: string;
    };
    cultivation_intensity: {
      category: string;
      factor: number;
      weight: number;
      impact: string;
    };
  };
  score_breakdown: {
    water_contribution: number;
    soil_contribution: number;
    cultivation_contribution: number;
  };
  explanation: {
    summary: string;
    details: string[];
  };
  disclaimer: string;
}

export interface BackendSustainability {
  agent: string;
  scope: string;
  note: string;
  results: BackendSustainabilityResult[];
}

export interface BackendFeatureExplanation {
  feature: string;
  effect: "positive" | "negative" | "neutral";
  reason: string;
}

export interface BackendXAIExplanation {
  crop: string; // lowercase, must match prediction.crop
  model_explanation: BackendFeatureExplanation[];
  market_explanation: string | null;
  sustainability_explanation: string | null;
  summary: string;
}

export interface BackendXAIData {
  agent: string;
  scope: string;
  explanations: BackendXAIExplanation[];
}

export interface BackendRecommendationResponse {
  status: string;
  location: BackendLocation;
  recommendations: BackendRecommendations;
  sustainability: BackendSustainability | null;
  xai_data: BackendXAIData | null;
}

// ============================================
// API REQUEST TYPES
// ============================================

export interface RecommendationRequest {
  lat: number | null;
  lon: number | null;
  season: "kharif" | "rabi" | "zaid";
  mode: "seasonal" | "all_season"; // Note: frontend uses 'all', must map to 'all_season'
}

// ============================================
// UI-SAFE TYPES (Adapter output)
// ============================================

/**
 * UI-safe crop card data structure
 * Guarantees:
 * - All fields are non-null
 * - All arrays are non-null (empty if no data)
 * - why[] always has at least 1 item
 */
export interface CropCard {
  id: string; // lowercase crop name, e.g., "rice"
  title: string; // capitalized for display, e.g., "Rice"
  percent: string; // formatted percentage, e.g., "65%"
  headerBg: string; // hex color code, e.g., "#95C0D2"
  why: string[]; // array of explanation strings, always has at least 1 item
}

export interface AdaptedRecommendationResponse {
  location: {
    district: string;
    state: string;
  };
  crops: CropCard[]; // always an array (empty if no predictions)
}

// ============================================
// API ERROR TYPES
// ============================================

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = "APIError";
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}
