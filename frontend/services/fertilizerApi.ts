/**
 * Fertilizer Agent API Service
 * Calls POST /fertilizer on the orchestrator (port 8000)
 * which proxies to the fertilizer agent (port 8009).
 */

import * as SecureStore from 'expo-secure-store';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 30000; // 30 seconds

// ─── Request / Response Types ────────────────────────────────────

export interface FertilizerRequest {
  crop: string;
  lat: number;
  lon: number;
  crop_age_days: number;
  current_n: number;
  current_p: number;
  current_k: number;
  current_ph: number;
  season: string;
}

export interface PurchaseLinks {
  amazon_in: string;
  flipkart: string;
  indiamart: string;
}

export interface ToolInfo {
  id: string;
  name: string;
  description: string;
  image_url: string;
  video_url: string;
  purchase_links: PurchaseLinks;
}

export interface ApplicationMethod {
  method_id: string;
  display_name: string;
  description: string;
  when_to_use: string;
  tools: ToolInfo[];
}

export interface FertilizerRecommendation {
  fertilizer_id: string;
  display_name: string;
  type: 'organic' | 'chemical' | 'ph_amendment';
  quantity_kg_ha: number;
  nutrient_supplied_kg_ha: Record<string, number>;
  release_speed: string;
  benefits: string[];
  notes: string;
  original_quantity_kg_ha: number;
  rainfall_adjustment: number;
  application_methods: ApplicationMethod[];
}

export interface RainfallContext {
  weekly_rainfall_mm: number;
  optimal_weekly_mm: number[];
  classification: string;
  multiplier_applied: number;
  reason: string;
  timing_advice: string;
}

export interface RainfallData {
  weekly_rainfall_mm: number;
  source: string;
  current_conditions: {
    description: string;
    rain_1h_mm: number;
    humidity: number;
    clouds_pct: number;
  };
  confidence: string;
}

export interface FertilizerStage {
  name: string;
  start_day: number;
  end_day: number;
}

export interface FertilizerResponseData {
  crop: string;
  stage: FertilizerStage;
  deficit_kg_ha: Record<string, number>;
  severity: Record<string, string>;
  ph_assessment?: {
    status: string;
    direction: string;
    gap: number;
  };
  recommendations: {
    organic: FertilizerRecommendation[];
    chemical_supplements: FertilizerRecommendation[];
    ph_amendments: FertilizerRecommendation[];
  };
  priority: string;
  organic_first: boolean;
  summary: string;
  rainfall_context: RainfallContext;
  tools_summary: {
    total_unique_tools: number;
    tool_ids: string[];
  };
  input: {
    crop: string;
    lat: number;
    lon: number;
    crop_age_days: number;
    current_soil: Record<string, number>;
    season: string;
  };
  rainfall_data: RainfallData;
}

export interface FertilizerResponse {
  status: string;
  data: FertilizerResponseData | null;
  error: string | null;
}

// ─── API Call ────────────────────────────────────────────────────

export async function fetchFertilizerRecommendation(
  request: FertilizerRequest
): Promise<FertilizerResponse> {
  const baseUrl = API_BASE_URL.endsWith('/')
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const url = `${baseUrl}/fertilizer`;

  console.log('[FertilizerAPI] POST to:', url);
  console.log('[FertilizerAPI] Request:', JSON.stringify(request, null, 2));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const token = await SecureStore.getItemAsync('userToken');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('[FertilizerAPI] Response status:', response.status);

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errData = await response.json();
        errorMsg = errData.detail || errData.error || errorMsg;
      } catch {}
      throw new Error(`Fertilizer API error: ${errorMsg}`);
    }

    const data: FertilizerResponse = await response.json();
    console.log('[FertilizerAPI] Response status field:', data.status);
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(
        `Fertilizer request timed out after ${REQUEST_TIMEOUT / 1000}s`
      );
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        'Network error: Unable to connect to server. Ensure the backend is running.'
      );
    }

    throw error;
  }
}
