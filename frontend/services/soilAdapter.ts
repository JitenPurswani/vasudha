// services/soilAdapter.ts
// Adapter to normalize soil agent API responses

export function adaptSoilParamsResponse(data: any) {
  // Ensure the response has N, P, K, pH as strings
  return {
    N: data && data.N !== undefined ? String(data.N) : '',
    P: data && data.P !== undefined ? String(data.P) : '',
    K: data && data.K !== undefined ? String(data.K) : '',
    pH: data && data.pH !== undefined ? String(data.pH) : '',
  };
}
