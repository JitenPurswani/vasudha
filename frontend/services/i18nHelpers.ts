/**
 * i18n Helper Utilities
 * Provides translation helpers for crops, states, stages, and dynamic content
 */

import i18n from '@/i18n';

/**
 * Translates a crop key to the user's current language
 * Falls back to English or the original key if translation not found
 */
export function translateCrop(cropKey: string): string {
  if (!cropKey) return '';
  
  // Normalize the key (lowercase, remove spaces)
  const normalizedKey = cropKey.toLowerCase().replace(/\s+/g, '');
  const translationKey = `crops.${normalizedKey}`;
  const translated = i18n.t(translationKey);
  
  // If translation returns the key itself, return the original crop name
  if (translated === translationKey) {
    // Try title case of original
    return cropKey.charAt(0).toUpperCase() + cropKey.slice(1).toLowerCase();
  }
  
  return translated;
}

/**
 * Translates a state key to the user's current language
 * Handles both key format (e.g., "maharashtra") and display format (e.g., "Maharashtra")
 */
export function translateState(stateKey: string): string {
  if (!stateKey) return '';
  
  // Normalize the key (lowercase, replace spaces with underscores)
  const normalizedKey = stateKey.toLowerCase().replace(/\s+/g, '_');
  const translationKey = `locations.states.${normalizedKey}`;
  const translated = i18n.t(translationKey);
  
  // If translation returns the key itself, return the original state name
  if (translated === translationKey) {
    // Try to format the original nicely
    return stateKey
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  return translated;
}

/**
 * Translates a district key to the user's current language
 * Currently only Maharashtra districts are translated
 */
export function translateDistrict(districtKey: string, stateKey?: string): string {
  if (!districtKey) return '';
  
  // Only Maharashtra districts are translated
  if (stateKey && stateKey.toLowerCase() !== 'maharashtra') {
    return districtKey
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  const normalizedKey = districtKey.toLowerCase().replace(/\s+/g, '_');
  const translationKey = `locations.districts.${normalizedKey}`;
  const translated = i18n.t(translationKey);
  
  if (translated === translationKey) {
    return districtKey
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  return translated;
}

/**
 * Translates a growth stage name
 */
export function translateStage(stageKey: string): string {
  if (!stageKey) return '';
  
  const normalizedKey = stageKey.toLowerCase().replace(/\s+/g, '_');
  const translationKey = `stages.${normalizedKey}`;
  const translated = i18n.t(translationKey);
  
  if (translated === translationKey) {
    return stageKey.charAt(0).toUpperCase() + stageKey.slice(1).toLowerCase();
  }
  
  return translated;
}

/**
 * Translates a climate risk type
 */
export function translateClimateRisk(riskKey: string): string {
  if (!riskKey) return '';
  
  const normalizedKey = riskKey.toLowerCase().replace(/\s+/g, '_');
  const translationKey = `climate_risks.${normalizedKey}`;
  const translated = i18n.t(translationKey);
  
  if (translated === translationKey) {
    return riskKey
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  return translated;
}

/**
 * Gets a stage-specific climate tip
 */
export function getClimateTip(stage: string, riskType: string): string | null {
  if (!stage || !riskType) return null;
  
  const normalizedStage = stage.toLowerCase().replace(/\s+/g, '_');
  const normalizedRisk = riskType.toLowerCase().replace(/\s+/g, '_');
  const tipKey = `climate_tips.${normalizedStage}.${normalizedRisk}`;
  const translated = i18n.t(tipKey);
  
  // Return null if translation not found
  if (translated === tipKey) return null;
  
  return translated;
}

/**
 * Translates sustainability level labels
 */
export function translateSustainabilityLevel(level: string): string {
  if (!level) return '';
  
  const keyMap: Record<string, string> = {
    'highly_sustainable': 'sustainability.highly_sustainable',
    'highly sustainable': 'sustainability.highly_sustainable',
    'moderately_sustainable': 'sustainability.moderately_sustainable',
    'moderately sustainable': 'sustainability.moderately_sustainable',
    'marginally_sustainable': 'sustainability.marginally_sustainable',
    'marginally sustainable': 'sustainability.marginally_sustainable',
    'low_sustainability': 'sustainability.low_sustainability',
    'low sustainability': 'sustainability.low_sustainability',
    'very_high': 'sustainability.very_high',
    'very high': 'sustainability.very_high',
    'high': 'sustainability.high',
    'medium': 'sustainability.medium',
    'low': 'sustainability.low',
    'positive': 'sustainability.positive',
    'neutral': 'sustainability.neutral',
    'negative': 'sustainability.negative',
  };
  
  const normalizedLevel = level.toLowerCase();
  const translationKey = keyMap[normalizedLevel];
  
  if (translationKey) {
    const translated = i18n.t(translationKey);
    if (translated !== translationKey) return translated;
  }
  
  return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
}

/**
 * Creates a market alert message with translated interpolations
 */
export function createMarketAlertMessage(
  alertType: 'volatility' | 'rising' | 'falling' | 'low_demand' | 'high_demand',
  crop: string,
  state: string,
  additionalData?: { price?: number }
): { title: string; description: string } {
  const translatedCrop = translateCrop(crop);
  const translatedState = translateState(state);
  
  const keyMap: Record<string, { title: string; desc: string }> = {
    volatility: { title: 'market_alerts.price_volatility_title', desc: 'market_alerts.price_volatility_desc' },
    rising: { title: 'market_alerts.price_rising_title', desc: 'market_alerts.price_rising_desc' },
    falling: { title: 'market_alerts.price_falling_title', desc: 'market_alerts.price_falling_desc' },
    low_demand: { title: 'market_alerts.low_demand_title', desc: 'market_alerts.low_demand_desc' },
    high_demand: { title: 'market_alerts.high_demand_title', desc: 'market_alerts.high_demand_desc' },
  };
  
  const keys = keyMap[alertType] || keyMap.volatility;
  
  return {
    title: i18n.t(keys.title),
    description: i18n.t(keys.desc, { 
      crop: translatedCrop, 
      state: translatedState,
      price: additionalData?.price || 0,
    }),
  };
}

/**
 * Batch translate multiple crops
 */
export function translateCrops(cropKeys: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  cropKeys.forEach(key => {
    result[key] = translateCrop(key);
  });
  return result;
}

/**
 * Get all translated crop names as an array of { key, label } for dropdowns
 */
export function getCropOptions(): Array<{ key: string; label: string }> {
  const cropKeys = [
    'rice', 'wheat', 'maize', 'barley', 'jowar', 'ragi',
    'moong', 'blackgram', 'horsegram', 'chickpea', 'lentil', 'peas',
    'sesamum', 'rapeseed', 'sunflower', 'soyabean', 'groundnut', 'mustard', 'linseed', 'safflower',
    'cotton', 'jute',
    'tomato', 'brinjal', 'ladyfinger', 'cucumber', 'bittergourd', 'bottlegourd', 
    'ridgegourd', 'pumpkin', 'ashgourd', 'cabbage', 'cauliflower', 'carrot', 
    'beetroot', 'radish', 'onion', 'potato', 'sweetpotato', 'tapioca', 'drumstick',
    'banana', 'papaya', 'apple', 'mango', 'pomegranate', 'arecanut', 'cashewnuts'
  ];
  
  return cropKeys.map(key => ({
    key,
    label: translateCrop(key),
  }));
}

/**
 * Get all translated state names as an array of { key, label } for dropdowns
 */
export function getStateOptions(): Array<{ key: string; label: string }> {
  const stateKeys = [
    'andhra_pradesh', 'arunachal_pradesh', 'assam', 'bihar', 'chhattisgarh',
    'goa', 'gujarat', 'haryana', 'himachal_pradesh', 'jharkhand',
    'karnataka', 'kerala', 'madhya_pradesh', 'maharashtra', 'manipur',
    'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab',
    'rajasthan', 'sikkim', 'tamil_nadu', 'telangana', 'tripura',
    'uttar_pradesh', 'uttarakhand', 'west_bengal',
    'andaman_and_nicobar_islands', 'chandigarh', 'dadra_and_nagar_haveli',
    'daman_and_diu', 'delhi', 'jammu_and_kashmir', 'ladakh',
    'lakshadweep', 'puducherry'
  ];
  
  return stateKeys.map(key => ({
    key,
    label: translateState(key),
  }));
}
