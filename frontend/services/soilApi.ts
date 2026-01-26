// services/soilApi.ts
// Soil agent API utility

const SOIL_AGENT_URL = process.env.EXPO_PUBLIC_SOIL_AGENT_URL || "http://localhost:8002";

export interface SoilParams {
  N: string;
  P: string;
  K: string;
  pH: string;
}

export async function getSoilParams(district: string, state: string): Promise<SoilParams> {
  if (!district || !state) throw new Error("District and state are required");
  const url = `${SOIL_AGENT_URL}/get_soil_data_by_district/?district=${encodeURIComponent(district)}&state=${encodeURIComponent(state)}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.detail || "Failed to fetch soil parameters");
    }
    // Normalize response: convert all values to strings
    const soilData = data.soil_data || {};
    return {
      N: soilData.N !== null && soilData.N !== undefined ? String(soilData.N) : '',
      P: soilData.P !== null && soilData.P !== undefined ? String(soilData.P) : '',
      K: soilData.K !== null && soilData.K !== undefined ? String(soilData.K) : '',
      pH: soilData.pH !== null && soilData.pH !== undefined ? String(soilData.pH) : '',
    };
  } catch (e: any) {
    throw new Error(e.message || "Could not fetch soil parameters");
  }
}
