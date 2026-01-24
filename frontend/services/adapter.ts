/**
 * Adapter layer: Transforms backend response to UI-safe format
 * 
 * Guarantees:
 * - All arrays are never null (empty array if no data)
 * - All strings are never null (empty string or fallback if no data)
 * - All numbers are never null (0 if no data)
 * - why[] always has at least 1 item (generic fallback if empty)
 */

import {
  BackendRecommendationResponse,
  BackendRecommendationPrediction,
  BackendXAIExplanation,
  BackendSHAPSummary,
  CropCard,
  AdaptedRecommendationResponse,
} from "./types";

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Capitalizes first letter of a string
 * Example: "rice" → "Rice", "sweetpotato" → "Sweetpotato"
 */
function capitalize(str: string): string {
  if (!str || str.length === 0) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts final_score to percentage string
 * Clamps negative values to 0
 * Example: 0.6543 → "65%", -0.2 → "0%", 1.0 → "100%"
 */
function scoreToPercent(score: number): string {
  // Clamp negative values to 0
  const clampedScore = Math.max(0, score);
  // Multiply by 100, round to integer, append "%"
  const percent = Math.round(clampedScore * 100);
  return `${percent}%`;
}

/**
 * Derives header background color from final_score
 * Score buckets:
 * - >= 0.7: High score (darker blue)
 * - >= 0.4: Medium score (lighter blue)
 * - < 0.4 or negative: Low score (light blue)
 */
function scoreToHeaderBg(score: number): string {
  if (score >= 0.7) {
    return "#95C0D2"; // Darker blue for high scores
  }
  // Medium and low scores (including negative) use lighter blue
  return "#BDDBE8"; // Light blue for medium/low scores
}

/**
 * Feature name to explanation string mapping
 * Used as fallback when XAI data is not available
 */
const FEATURE_EXPLANATION_MAP: Record<string, string> = {
  nitrogen: "Adequate nitrogen levels support healthy crop growth",
  phosphorus: "Phosphorus supports strong root development",
  potassium: "Potassium improves stress tolerance and crop resilience",
  ph: "Soil pH is well suited for nutrient uptake",
  rainfall: "Rainfall levels align well with crop water requirements",
  temperature: "Temperature conditions are favorable for crop growth",
};

/**
 * Converts SHAP feature names to explanation strings
 * Falls back to generic message if feature not in map
 */
function shapFeaturesToExplanations(
  shapSummary: BackendSHAPSummary | null
): string[] {
  if (!shapSummary) {
    return [];
  }

  const explanations: string[] = [];

  // Add positive features
  for (const feature of shapSummary.top_positive_features || []) {
    const explanation =
      FEATURE_EXPLANATION_MAP[feature.toLowerCase()] ||
      `${capitalize(feature)} contributes positively to this recommendation`;
    explanations.push(explanation);
  }

  // Add negative features (with different wording)
  for (const feature of shapSummary.top_negative_features || []) {
    const explanation =
      FEATURE_EXPLANATION_MAP[feature.toLowerCase()] ||
      `${capitalize(feature)} may limit suitability but other factors compensate`;
    explanations.push(explanation);
  }

  return explanations;
}

/**
 * Extracts explanation strings from XAI model_explanation
 * Returns array of reason strings
 */
function extractXAIExplanations(
  xaiExplanation: BackendXAIExplanation | null
): string[] {
  if (!xaiExplanation || !xaiExplanation.model_explanation) {
    return [];
  }

  return xaiExplanation.model_explanation
    .map((expl) => expl.reason)
    .filter((reason) => reason && reason.trim().length > 0);
}

/**
 * Finds matching XAI explanation for a crop by name
 * Returns null if no match found
 */
function findXAIExplanationForCrop(
  cropName: string,
  xaiData: { explanations: BackendXAIExplanation[] } | null
): BackendXAIExplanation | null {
  if (!xaiData || !xaiData.explanations || xaiData.explanations.length === 0) {
    return null;
  }

  // Match by exact crop name (case-sensitive)
  return (
    xaiData.explanations.find((expl) => expl.crop === cropName) || null
  );
}

/**
 * Builds why[] array for a crop prediction
 * Priority order:
 * 1. XAI model_explanation[].reason (if matching explanation exists)
 * 2. SHAP feature names converted to explanations
 * 3. Generic fallback
 * 
 * Guarantees: Always returns array with at least 1 item
 */
function buildWhyArray(
  prediction: BackendRecommendationPrediction,
  xaiData: { explanations: BackendXAIExplanation[] } | null
): string[] {
  // Priority 1: Try XAI explanation
  const xaiExplanation = findXAIExplanationForCrop(prediction.crop, xaiData);
  if (xaiExplanation) {
    const xaiReasons = extractXAIExplanations(xaiExplanation);
    if (xaiReasons.length > 0) {
      return xaiReasons;
    }
  }

  // Priority 2: Try SHAP summary
  if (prediction.shap_summary) {
    const shapExplanations = shapFeaturesToExplanations(prediction.shap_summary);
    if (shapExplanations.length > 0) {
      return shapExplanations;
    }
  }

  // Priority 3: Generic fallback (guarantees at least 1 item)
  return ["Recommendation based on soil and climate conditions for your location"];
}

// ============================================
// MAIN ADAPTER FUNCTION
// ============================================

/**
 * Transforms a single backend prediction to UI-safe CropCard
 */
function adaptPrediction(
  prediction: BackendRecommendationPrediction,
  xaiData: { explanations: BackendXAIExplanation[] } | null
): CropCard {
  return {
    id: prediction.crop || "unknown", // lowercase crop name
    title: capitalize(prediction.crop || "unknown"), // capitalized for display
    percent: scoreToPercent(prediction.final_score ?? 0), // clamped and formatted
    headerBg: scoreToHeaderBg(prediction.final_score ?? 0), // color from score
    why: buildWhyArray(prediction, xaiData), // always has at least 1 item
  };
}

/**
 * Main adapter function: Transforms backend response to UI-safe format
 * 
 * @param backendResponse - Raw backend API response
 * @returns UI-safe adapted response with guaranteed non-null fields
 */
export function adaptBackendResponse(
  backendResponse: BackendRecommendationResponse
): AdaptedRecommendationResponse {
  // Extract predictions array (guarantee it's an array)
  const predictions =
    backendResponse.recommendations?.predictions || [];

  // Transform each prediction to CropCard
  const crops: CropCard[] = predictions.map((prediction) =>
    adaptPrediction(prediction, backendResponse.xai_data)
  );

  // Extract location (guarantee non-null strings)
  const location = {
    district: backendResponse.location?.district || "",
    state: backendResponse.location?.state || "",
  };

  return {
    location,
    crops, // always an array (empty if no predictions)
  };
}
