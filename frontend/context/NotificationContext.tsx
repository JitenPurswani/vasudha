import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { AppState, AppStateStatus } from 'react-native';
import { ToastData, ToastContainer, ToastType } from '@/components/Toast';
import { 
  NotificationData, 
  fetchClimateAlerts, 
  fetchMarketAlerts, 
  generateTestNotifications 
} from '@/services/notificationApi';
import cropProfiles from '@/constants/cropProfiles.json';

// Stage-specific tips for different risk types
const STAGE_RISK_TIPS: Record<string, Record<string, string>> = {
  germination: {
    heat_stress: 'Seedlings are very sensitive to heat. Provide shade if possible and water in early morning/evening.',
    cold_stress: 'Young seedlings may die from cold exposure. Use mulch or row covers for protection.',
    frost_risk: 'Frost can kill germinating seeds. Cover soil with straw or plastic sheets.',
    waterlogging: 'Waterlogging at germination causes seed rot. Ensure proper drainage immediately.',
    dry_spell: 'Seeds need consistent moisture for germination. Light frequent irrigation recommended.',
    high_humidity: 'High humidity may cause damping-off disease. Avoid overwatering.',
  },
  seedling: {
    heat_stress: 'Transplant shock is worsened by heat. Consider temporary shade nets.',
    cold_stress: 'Protect seedlings from cold with mulch. Avoid night-time irrigation.',
    frost_risk: 'Cover seedlings with plastic tunnels or cloches overnight.',
    waterlogging: 'Seedling roots are shallow and can drown easily. Improve drainage.',
    dry_spell: 'Water stress stunts seedling growth. Maintain soil moisture.',
    high_humidity: 'Watch for fungal diseases. Ensure good air circulation between plants.',
  },
  vegetative: {
    heat_stress: 'Increase irrigation frequency. Plants transpire more in heat.',
    cold_stress: 'Slow growth is normal in cold. Do not over-fertilize during cold spells.',
    frost_risk: 'Vegetative growth can recover from light frost. Protect growing tips.',
    waterlogging: 'Saturated soil reduces nutrient uptake. Apply foliar nutrition if needed.',
    dry_spell: 'Critical period for leaf development. Deep watering every few days is better than light daily watering.',
    high_humidity: 'Perfect conditions for foliar diseases. Consider preventive fungicide spray.',
  },
  flowering: {
    heat_stress: 'CRITICAL: Heat during flowering causes flower drop and poor fruit set. Irrigate frequently, consider shade nets.',
    cold_stress: 'Cold reduces pollinator activity. Hand pollination may help.',
    frost_risk: 'Frost kills flowers and young fruits. Protection is essential!',
    waterlogging: 'Excess water during flowering causes flower drop. Maintain light moisture only.',
    dry_spell: 'Water stress during flowering drastically reduces yield. Do not skip irrigation!',
    high_humidity: 'May affect pollen viability and promote flower diseases.',
  },
  fruiting: {
    heat_stress: 'Heat can cause fruit sunburn. Maintain leaf cover over fruits.',
    cold_stress: 'Fruit development slows in cold. Extend harvest estimate accordingly.',
    frost_risk: 'Frost damages developing fruits. Harvest early if frost is imminent.',
    waterlogging: 'Can cause fruit cracking and rot. Ensure drainage.',
    dry_spell: 'Fruit size is determined now. Consistent watering is critical.',
    high_humidity: 'Watch for fruit rot diseases. Good ventilation helps.',
  },
  maturity: {
    heat_stress: 'Hot weather speeds up maturity. Prepare for earlier harvest.',
    cold_stress: 'May delay maturity. Monitor crop readiness carefully.',
    frost_risk: 'Harvest before frost if possible to avoid crop damage.',
    waterlogging: 'Stop irrigation before harvest for better quality.',
    dry_spell: 'Dry conditions at maturity are often beneficial. Reduces disease risk.',
    high_humidity: 'High humidity delays drying. May need post-harvest drying assistance.',
  },
};

// Simplified stage names for matching
function getSimplifiedStage(stageName: string): string {
  const stageLower = stageName.toLowerCase();
  if (stageLower.includes('germin') || stageLower.includes('emergence')) return 'germination';
  if (stageLower.includes('seedling') || stageLower.includes('establishment')) return 'seedling';
  if (stageLower.includes('vegetat') || stageLower.includes('tillering') || stageLower.includes('growth')) return 'vegetative';
  if (stageLower.includes('flower') || stageLower.includes('bloom') || stageLower.includes('silking') || stageLower.includes('anthesis')) return 'flowering';
  if (stageLower.includes('fruit') || stageLower.includes('grain') || stageLower.includes('pod') || stageLower.includes('tuber')) return 'fruiting';
  if (stageLower.includes('matur') || stageLower.includes('ripen') || stageLower.includes('harvest')) return 'maturity';
  return 'vegetative'; // default
}

const STORAGE_KEY = 'vasudha_notifications';
const LAST_FETCH_KEY = 'vasudha_last_notification_fetch';
const POLL_INTERVAL_CLIMATE = 45 * 60 * 1000; // 45 minutes
const POLL_INTERVAL_MARKET = 60 * 60 * 1000;  // 60 minutes
const MIN_FETCH_INTERVAL = 30 * 60 * 1000;    // 30 minutes minimum between fetches

interface NotificationContextType {
  notifications: NotificationData[];
  unreadCount: number;
  isLoading: boolean;
  lastFetched: number | null;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  addTestNotifications: () => void;
  
  // Toast functions
  showToast: (toast: Omit<ToastData, 'id'>) => void;
  dismissToast: (id: string) => void;
}

interface UserData {
  crop?: string;
  lat?: number;
  lon?: number;
  state?: string;
  season?: string;
  currentStage?: string;      // e.g., "flowering", "vegetative"
  daysSincePlanting?: number;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  
  const climateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const marketIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const previousNotificationIds = useRef<Set<string>>(new Set());

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Load notifications from storage on mount
  useEffect(() => {
    loadNotificationsFromStorage();
    loadLastFetchTime();
  }, []);

  // Setup app state listener for background/foreground transitions
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [lastFetched]);

  // Setup polling intervals
  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, []);

  const loadNotificationsFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filter out notifications older than 7 days AND with invalid IDs
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const filtered = parsed.filter((n: NotificationData) => {
          // Remove old notifications
          if (n.timestamp < weekAgo) return false;
          // Remove notifications with undefined in their ID (old format bug)
          if (n.id && n.id.includes('undefined')) return false;
          return true;
        });
        setNotifications(filtered);
        
        // Track existing IDs to detect new notifications
        previousNotificationIds.current = new Set(filtered.map((n: NotificationData) => n.id));
        
        // Save the cleaned list back
        if (filtered.length !== parsed.length) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        }
      }
    } catch (error) {
      console.error('[NotificationContext] Load error:', error);
    }
  };

  const saveNotificationsToStorage = async (notifs: NotificationData[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
    } catch (error) {
      console.error('[NotificationContext] Save error:', error);
    }
  };

  const loadLastFetchTime = async () => {
    try {
      const stored = await AsyncStorage.getItem(LAST_FETCH_KEY);
      if (stored) {
        setLastFetched(parseInt(stored, 10));
      }
    } catch (error) {
      console.error('[NotificationContext] Load last fetch error:', error);
    }
  };

  const saveLastFetchTime = async (time: number) => {
    try {
      await AsyncStorage.setItem(LAST_FETCH_KEY, time.toString());
      setLastFetched(time);
    } catch (error) {
      console.error('[NotificationContext] Save last fetch error:', error);
    }
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    // When app comes to foreground, check if we need to fetch
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      const timeSinceLastFetch = lastFetched ? Date.now() - lastFetched : Infinity;
      if (timeSinceLastFetch > MIN_FETCH_INTERVAL) {
        console.log('[NotificationContext] App resumed, fetching notifications...');
        await refreshNotifications();
      }
    }
    appState.current = nextAppState;
  };

  const startPolling = () => {
    // Initial fetch after a short delay
    setTimeout(() => {
      refreshNotifications();
    }, 5000);

    // Climate polling
    climateIntervalRef.current = setInterval(() => {
      fetchClimateNotifications();
    }, POLL_INTERVAL_CLIMATE);

    // Market polling
    marketIntervalRef.current = setInterval(() => {
      fetchMarketNotifications();
    }, POLL_INTERVAL_MARKET);
  };

  const stopPolling = () => {
    if (climateIntervalRef.current) clearInterval(climateIntervalRef.current);
    if (marketIntervalRef.current) clearInterval(marketIntervalRef.current);
  };

  // Toast functions
  const showToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const newToast: ToastData = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    setToasts(prev => [newToast, ...prev].slice(0, 5)); // Keep max 5 toasts
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Show toast for new notifications
  const showToastsForNewNotifications = useCallback((newNotifs: NotificationData[]) => {
    const trulyNew = newNotifs.filter(n => !previousNotificationIds.current.has(n.id));
    
    // Show toasts for up to 3 new notifications
    trulyNew.slice(0, 3).forEach((notif, index) => {
      setTimeout(() => {
        let toastType: ToastType = 'info';
        if (notif.type === 'climate') toastType = 'climate';
        else if (notif.type === 'market') toastType = 'market';
        
        showToast({
          type: toastType,
          title: notif.title,
          message: notif.description,
          severity: notif.severity,
        });
      }, index * 500); // Stagger toasts
    });
    
    // Update tracked IDs
    newNotifs.forEach(n => previousNotificationIds.current.add(n.id));
  }, [showToast]);

  const getUserData = async (): Promise<UserData> => {
    try {
      // Get userId from JWT token
      const token = await SecureStore.getItemAsync('userToken');
      console.log(`[NotificationContext] Token found: ${!!token}`);
      let userId: string | null = null;
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          userId = decoded.sub || null;
          console.log(`[NotificationContext] Decoded userId: ${userId}`);
        } catch (e) {
          console.warn('[NotificationContext] Failed to decode token:', e);
        }
      }

      // Get active crops - use user-specific key if userId available
      const activeCropsKey = userId ? `vasudha_active_crops_${userId}` : 'vasudha_active_crops';
      const activeCropsStr = await AsyncStorage.getItem(activeCropsKey);
      console.log(`[NotificationContext] Loading crops from key: ${activeCropsKey}, found: ${!!activeCropsStr}`);
      
      // Get selected crop - use user-specific key if userId available
      const selectedCropKey = userId ? `vasudha_selected_crop_${userId}` : 'vasudha_selected_crop';
      const selectedCrop = await AsyncStorage.getItem(selectedCropKey);
      
      // Get profile data
      const profileStr = await AsyncStorage.getItem('userProfile');
      
      // Get location coordinates (stored separately during onboarding)
      const latStr = await AsyncStorage.getItem('userLatitude');
      const lonStr = await AsyncStorage.getItem('userLongitude');
      
      // Get current season based on month
      const month = new Date().getMonth();
      let season = 'kharif';
      if (month >= 10 || month <= 2) season = 'rabi';
      else if (month >= 3 && month <= 5) season = 'zaid';
      
      let state = '';
      let crop = '';
      let lat: number | undefined;
      let lon: number | undefined;
      let currentStage: string | undefined;
      let daysSincePlanting: number | undefined;
      
      // Try to get data from active crops first
      if (activeCropsStr) {
        try {
          const activeCropsData = JSON.parse(activeCropsStr);
          const activeCrops = activeCropsData.crops || [];
          const primaryCropId = activeCropsData.primaryCropId;
          
          // Find primary crop or use first active crop
          const primaryCrop = activeCrops.find((c: any) => c.id === primaryCropId && c.status === 'active')
            || activeCrops.find((c: any) => c.status === 'active');
          
          if (primaryCrop) {
            crop = primaryCrop.cropKey;
            lat = primaryCrop.latitude;
            lon = primaryCrop.longitude;
            state = primaryCrop.location?.state || '';
            
            // Calculate current growth stage
            const plantingDate = new Date(primaryCrop.plantingDate);
            const now = new Date();
            daysSincePlanting = Math.floor((now.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24));
            
            // Get crop profile to determine current stage
            const profiles = cropProfiles as Record<string, any>;
            const profile = profiles[crop.toLowerCase()];
            
            if (profile && profile.stages) {
              for (const stage of profile.stages) {
                if (daysSincePlanting >= stage.startDay && daysSincePlanting <= stage.endDay) {
                  currentStage = getSimplifiedStage(stage.name);
                  break;
                }
              }
              // If past all stages, use maturity
              if (!currentStage && daysSincePlanting > 0) {
                currentStage = 'maturity';
              }
            }
          }
        } catch (e) {
          console.warn('[NotificationContext] Failed to parse active crops:', e);
        }
      }
      
      // Fallback to old storage format
      if (!crop && selectedCrop) {
        crop = selectedCrop;
      }
      
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (!state) {
          state = profile.state || profile.state_key || '';
        }
        // Also check if crop is stored in profile
        if (!crop) {
          crop = profile.selectedCrop || profile.crop || '';
        }
      }
      
      if (!lat && latStr) lat = parseFloat(latStr);
      if (!lon && lonStr) lon = parseFloat(lonStr);
      
      console.log('[NotificationContext] User data:', { crop, state, lat, lon, season, currentStage, daysSincePlanting });
      
      return {
        crop,
        state,
        lat,
        lon,
        season,
        currentStage,
        daysSincePlanting,
      };
    } catch (error) {
      console.error('[NotificationContext] getUserData error:', error);
    }
    return {};
  };

  const fetchClimateNotifications = async () => {
    const userData = await getUserData();
    if (!userData.crop || !userData.lat || !userData.lon) {
      console.log('[NotificationContext] Missing user data for climate fetch');
      return [];
    }

    const alerts = await fetchClimateAlerts(
      userData.crop,
      userData.lat,
      userData.lon,
      userData.season || 'kharif'
    );
    
    // Add stage-specific tips to each alert
    if (userData.currentStage && alerts.length > 0) {
      alerts.forEach(alert => {
        const riskType = alert.source?.riskType || '';
        const stageTips = STAGE_RISK_TIPS[userData.currentStage!];
        
        if (stageTips && stageTips[riskType]) {
          // Append stage-specific tip to description
          const stageTip = stageTips[riskType];
          alert.description = `${alert.description}\n\n📌 Stage tip (${userData.currentStage}): ${stageTip}`;
          
          // Also store stage info in source
          alert.source.data = {
            ...alert.source.data,
            currentStage: userData.currentStage,
            daysSincePlanting: userData.daysSincePlanting,
            stageTip,
          };
        }
      });
    }
    
    return alerts;
  };

  const fetchMarketNotifications = async () => {
    const userData = await getUserData();
    if (!userData.crop || !userData.state) {
      console.log('[NotificationContext] Missing user data for market fetch');
      return [];
    }

    const alerts = await fetchMarketAlerts(userData.crop, userData.state);
    return alerts;
  };

  const refreshNotifications = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    console.log('[NotificationContext] Refreshing notifications...');
    
    try {
      const [climateAlerts, marketAlerts] = await Promise.all([
        fetchClimateNotifications(),
        fetchMarketNotifications(),
      ]);

      const newAlerts = [...climateAlerts, ...marketAlerts];
      
      if (newAlerts.length > 0) {
        // Show toasts for new alerts
        showToastsForNewNotifications(newAlerts);
        
        setNotifications(prev => {
          // Deduplicate based on risk type and timestamp (within 1 hour)
          const merged = [...newAlerts];
          const oneHourAgo = Date.now() - 60 * 60 * 1000;
          
          for (const existing of prev) {
            const isDuplicate = newAlerts.some(
              n => n.source.riskType === existing.source.riskType && 
                   existing.timestamp > oneHourAgo
            );
            if (!isDuplicate) {
              merged.push(existing);
            }
          }
          
          // Sort by timestamp descending
          merged.sort((a, b) => b.timestamp - a.timestamp);
          
          // Keep only last 50 notifications
          const limited = merged.slice(0, 50);
          
          saveNotificationsToStorage(limited);
          return limited;
        });
      }
      
      await saveLastFetchTime(Date.now());
    } catch (error) {
      console.error('[NotificationContext] Refresh error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, showToastsForNewNotifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      );
      saveNotificationsToStorage(updated);
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotificationsToStorage(updated);
      return updated;
    });
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      saveNotificationsToStorage(updated);
      return updated;
    });
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    saveNotificationsToStorage([]);
  }, []);

  const addTestNotifications = useCallback(() => {
    const testNotifs = generateTestNotifications();
    
    // Show toasts for test notifications
    testNotifs.slice(0, 2).forEach((notif, index) => {
      setTimeout(() => {
        showToast({
          type: notif.type as ToastType,
          title: notif.title,
          message: notif.description,
          severity: notif.severity,
        });
      }, index * 600);
    });
    
    setNotifications(prev => {
      // Remove any existing test notifications first
      const filtered = prev.filter(n => n.type !== 'test');
      const merged = [...testNotifs, ...filtered];
      saveNotificationsToStorage(merged);
      return merged;
    });
  }, [showToast]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        lastFetched,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
        addTestNotifications,
        showToast,
        dismissToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
