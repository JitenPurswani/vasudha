/**
 * Notification API Service
 * Fetches alerts from Climate Adaptation Agent and Market Agent
 */

import * as SecureStore from 'expo-secure-store';
import i18n from '@/i18n';
import { translateClimateRisk, getClimateActions } from './i18nHelpers';

const CLIMATE_AGENT_URL = process.env.EXPO_PUBLIC_CLIMATE_AGENT_URL || "http://localhost:8007";
const MARKET_AGENT_URL = process.env.EXPO_PUBLIC_MARKET_API_URL || "http://localhost:8004";

// Market alert thresholds (hardcoded)
const MARKET_THRESHOLDS = {
  PRICE_SPIKE_PERCENT: 15,      // Alert if price > 15% above average
  PRICE_DROP_PERCENT: 10,       // Alert if price < 10% below average
  LOW_STABILITY_THRESHOLD: 0.3, // Alert if stability < 0.3
};

export interface ClimateRisk {
  risk: string;        // e.g., "Heat Stress", "Cold Stress"
  severity: string;    // e.g., "High", "Medium"
  trigger: string;     // Explanation of why this risk was detected
  preventive_actions?: string[];
}

export interface ClimateAlertResponse {
  status: string;
  risks: ClimateRisk[];
  explanation: string | null;
  debug: any;
}

export interface MarketEvaluateResponse {
  crop: string;
  state: string;
  avg_price: number;
  stability: number;
  trend: string;
  demand: string;
  score: number;
}

export interface NotificationData {
  id: string;
  type: 'climate' | 'market' | 'test';
  severity: 'warning' | 'critical' | 'info';
  title: string;
  description: string;
  crop?: string;
  timestamp: number;
  read: boolean;
  source: {
    agent: string;
    riskType?: string;
    data?: any;
  };
}

/**
 * Fetch climate alerts from Climate Adaptation Agent
 */
export async function fetchClimateAlerts(
  crop: string,
  lat: number,
  lon: number,
  season: string
): Promise<NotificationData[]> {
  const notifications: NotificationData[] = [];
  
  try {
    const token = await SecureStore.getItemAsync('userToken');
    const url = `${CLIMATE_AGENT_URL}/climate/adapt`;
    
    // Climate agent expects lowercase crop names
    const normalizedCrop = crop.toLowerCase();
    
    console.log('[NotificationAPI] Fetching climate alerts for', { crop: normalizedCrop, lat, lon, season });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        crop: normalizedCrop,
        lat,
        lon,
        season,
        explain: false, // Skip LLM explanation for notifications
      }),
    });

    if (!response.ok) {
      console.warn('[NotificationAPI] Climate agent returned:', response.status);
      return notifications;
    }

    const data: ClimateAlertResponse = await response.json();
    
    console.log('[NotificationAPI] Climate response:', JSON.stringify(data, null, 2));
    
    // Only create notifications if there are actual risks
    if (data.risks && data.risks.length > 0) {
      data.risks.forEach((risk, index) => {
        const severity = mapRiskSeverity(risk.severity);
        const riskName = risk.risk || 'unknown';
        const riskKey = riskName.toLowerCase().replace(/\s+/g, '_');
        
        // Translate risk name
        const translatedRiskName = translateClimateRisk(riskName);
        
        // Get translated climate actions based on severity
        const severityKey = risk.severity?.toLowerCase() as 'high' | 'medium' | 'low' || 'high';
        const translatedActions = getClimateActions(riskKey, severityKey);
        
        // Use translated actions if available, otherwise fall back to backend actions
        const description = translatedActions.length > 0 
          ? translatedActions[0] 
          : (risk.trigger || risk.preventive_actions?.[0] || i18n.t('errors.no_data'));
        
        // Use index + random to ensure unique keys
        const uniqueId = `climate_${riskKey}_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`;
        
        notifications.push({
          id: uniqueId,
          type: 'climate',
          severity,
          title: translatedRiskName,
          description,
          crop,
          timestamp: Date.now(),
          read: false,
          source: {
            agent: 'climate-adaptation',
            riskType: riskKey,
            data: risk,
            translatedActions, // Include all actions for detail view
          },
        });
      });
    }
    
    console.log('[NotificationAPI] Climate alerts generated:', notifications.length);
  } catch (error) {
    console.error('[NotificationAPI] Climate fetch error:', error);
  }
  
  return notifications;
}

/**
 * Fetch market alerts from Market Agent
 */
export async function fetchMarketAlerts(
  crop: string,
  state: string
): Promise<NotificationData[]> {
  const notifications: NotificationData[] = [];
  
  try {
    const token = await SecureStore.getItemAsync('userToken');
    const url = `${MARKET_AGENT_URL}/market/evaluate?crop=${encodeURIComponent(crop)}&state=${encodeURIComponent(state)}`;
    
    console.log('[NotificationAPI] Fetching market alerts for', { crop, state });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      console.warn('[NotificationAPI] Market agent returned:', response.status);
      return notifications;
    }

    const data: MarketEvaluateResponse = await response.json();
    
    // Check for price anomalies based on thresholds
    
    // Low stability alert
    if (data.stability < MARKET_THRESHOLDS.LOW_STABILITY_THRESHOLD) {
      notifications.push({
        id: `market_volatility_${Date.now()}`,
        type: 'market',
        severity: 'warning',
        title: i18n.t('market_alerts.price_volatility_title'),
        description: i18n.t('market_alerts.price_volatility_desc', { crop, state }),
        crop,
        timestamp: Date.now(),
        read: false,
        source: {
          agent: 'market',
          riskType: 'volatility',
          data: { stability: data.stability, threshold: MARKET_THRESHOLDS.LOW_STABILITY_THRESHOLD },
        },
      });
    }
    
    // Trend-based alerts
    if (data.trend === 'rising' && data.score > 0.7) {
      notifications.push({
        id: `market_rising_${Date.now()}`,
        type: 'market',
        severity: 'info',
        title: i18n.t('market_alerts.price_rising_title'),
        description: i18n.t('market_alerts.price_rising_desc', { crop, state }),
        crop,
        timestamp: Date.now(),
        read: false,
        source: {
          agent: 'market',
          riskType: 'price_rise',
          data,
        },
      });
    } else if (data.trend === 'falling' && data.score < 0.4) {
      notifications.push({
        id: `market_falling_${Date.now()}`,
        type: 'market',
        severity: 'warning',
        title: i18n.t('market_alerts.price_falling_title'),
        description: i18n.t('market_alerts.price_falling_desc', { crop, state }),
        crop,
        timestamp: Date.now(),
        read: false,
        source: {
          agent: 'market',
          riskType: 'price_drop',
          data,
        },
      });
    }
    
    // High demand alert
    if (data.demand === 'high' && data.avg_price > 0) {
      notifications.push({
        id: `market_demand_${Date.now()}`,
        type: 'market',
        severity: 'info',
        title: i18n.t('market_alerts.high_demand_title', { defaultValue: 'High Market Demand' }),
        description: i18n.t('market_alerts.high_demand_desc', { 
          crop, 
          state, 
          price: Math.round(data.avg_price),
          defaultValue: `Strong demand for ${crop} in ${state}. Average price: ₹${Math.round(data.avg_price)}/quintal` 
        }),
        crop,
        timestamp: Date.now(),
        read: false,
        source: {
          agent: 'market',
          riskType: 'high_demand',
          data,
        },
      });
    }
    
    console.log('[NotificationAPI] Market alerts generated:', notifications.length);
  } catch (error) {
    console.error('[NotificationAPI] Market fetch error:', error);
  }
  
  return notifications;
}

/**
 * Generate test notifications for debug mode
 */
export function generateTestNotifications(): NotificationData[] {
  const now = Date.now();
  return [
    {
      id: `test_climate_${now}`,
      type: 'test',
      severity: 'critical',
      title: '[TEST] Extreme Heat Warning',
      description: 'Test notification: Temperature expected to exceed 42°C. Increase irrigation frequency.',
      crop: 'Rice',
      timestamp: now - 600000, // 10 min ago
      read: false,
      source: { agent: 'test', riskType: 'extreme_heat' },
    },
    {
      id: `test_market_${now}`,
      type: 'test',
      severity: 'info',
      title: '[TEST] Market Price Alert',
      description: 'Test notification: Wheat prices crossed ₹2500/quintal in your region.',
      crop: 'Wheat',
      timestamp: now - 3600000, // 1 hour ago
      read: false,
      source: { agent: 'test', riskType: 'price_alert' },
    },
    {
      id: `test_weather_${now}`,
      type: 'test',
      severity: 'warning',
      title: '[TEST] Heavy Rainfall Expected',
      description: 'Test notification: 50mm rainfall expected in next 24 hours. Ensure proper drainage.',
      timestamp: now - 7200000, // 2 hours ago
      read: false,
      source: { agent: 'test', riskType: 'heavy_rainfall' },
    },
  ];
}

// Helper functions
function mapRiskSeverity(severity: string): 'warning' | 'critical' | 'info' {
  const severityLower = severity?.toLowerCase() || '';
  if (severityLower.includes('critical') || severityLower.includes('extreme') || severityLower.includes('high')) {
    return 'critical';
  } else if (severityLower.includes('moderate') || severityLower.includes('warning')) {
    return 'warning';
  }
  return 'info';
}

function formatRiskTitle(riskType: string | undefined): string {
  if (!riskType) return 'Climate Alert';
  
  const titles: Record<string, string> = {
    'extreme_heat': 'Extreme Heat Warning',
    'extreme_cold': 'Cold Wave Alert',
    'heavy_rainfall': 'Heavy Rainfall Expected',
    'drought': 'Drought Conditions',
    'high_humidity': 'High Humidity Alert',
    'strong_winds': 'Strong Winds Expected',
    'frost': 'Frost Warning',
    'heatwave': 'Heatwave Alert',
  };
  
  return titles[riskType] || riskType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
