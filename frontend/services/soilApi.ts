// services/soilApi.ts
// Soil agent API utility

const SOIL_AGENT_URL = process.env.EXPO_PUBLIC_SOIL_AGENT_URL || "http://localhost:8002";
const SOIL_REQUEST_TIMEOUT = 15000; // 15 seconds

export interface SoilParams {
  N: string;
  P: string;
  K: string;
  pH: string;
}

export async function getSoilParams(district: string, state: string): Promise<SoilParams> {
  if (!district || !state) {
    const errMsg = "District and state are required";
    console.error(`[Soil API] ${errMsg}`);
    throw new Error(errMsg);
  }

  const url = `${SOIL_AGENT_URL}/get_soil_data_by_district/?district=${encodeURIComponent(district)}&state=${encodeURIComponent(state)}`;
  
  console.log(`[Soil API] Fetching soil params from: ${url}`);
  console.log(`[Soil API] SOIL_AGENT_URL env: ${process.env.EXPO_PUBLIC_SOIL_AGENT_URL}`);
  console.log(`[Soil API] Full URL: ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`[Soil API] Request timeout after ${SOIL_REQUEST_TIMEOUT}ms`);
    controller.abort();
  }, SOIL_REQUEST_TIMEOUT);

  try {
    console.log(`[Soil API] Starting fetch request...`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    console.log(`[Soil API] Response status: ${response.status}`);
    console.log(`[Soil API] Response ok: ${response.ok}`);

    if (!response.ok) {
      let errorDetail = "Unknown error";
      try {
        const errorData = await response.json();
        errorDetail = errorData?.detail || `HTTP ${response.status}`;
        console.error(`[Soil API] Error response data:`, errorData);
      } catch (parseError) {
        console.error(`[Soil API] Could not parse error response:`, parseError);
        errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(`Soil API error: ${errorDetail}`);
    }

    let data;
    try {
      data = await response.json();
      console.log(`[Soil API] Response data:`, data);
    } catch (parseError) {
      console.error(`[Soil API] Failed to parse response JSON:`, parseError);
      throw new Error("Failed to parse soil parameters response");
    }

    // Normalize response: convert all values to strings
    const soilData = data.soil_data || {};
    console.log(`[Soil API] Soil data extracted:`, soilData);

    const result = {
      N: soilData.N !== null && soilData.N !== undefined ? String(soilData.N) : '',
      P: soilData.P !== null && soilData.P !== undefined ? String(soilData.P) : '',
      K: soilData.K !== null && soilData.K !== undefined ? String(soilData.K) : '',
      pH: soilData.pH !== null && soilData.pH !== undefined ? String(soilData.pH) : '',
    };
    console.log(`[Soil API] Final normalized result:`, result);
    return result;
  } catch (error: any) {
    console.error(`[Soil API] Fetch error:`, error);

    // Handle abort/timeout
    if (error instanceof Error && error.name === "AbortError") {
      const timeoutMsg = `Soil parameters request timed out (${SOIL_REQUEST_TIMEOUT}ms)`;
      console.error(`[Soil API] ${timeoutMsg}`);
      throw new Error(timeoutMsg);
    }

    // Handle network errors
    if (error instanceof TypeError) {
      const networkMsg = `Network error: ${error.message}. Check if Soil Agent (${SOIL_AGENT_URL}) is running on port 8002`;
      console.error(`[Soil API] ${networkMsg}`);
      throw new Error(networkMsg);
    }

    // Re-throw our custom errors
    if (error.message.startsWith("Soil API error:") || error.message.startsWith("Failed to parse")) {
      throw error;
    }

    // Generic fallback
    const fallbackMsg = `Could not fetch soil parameters: ${error.message || String(error)}`;
    console.error(`[Soil API] ${fallbackMsg}`);
    throw new Error(fallbackMsg);
  } finally {
    clearTimeout(timeoutId);
  }
}
