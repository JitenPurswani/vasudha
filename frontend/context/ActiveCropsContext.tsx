import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import cropProfiles from '@/constants/cropProfiles.json';

const BASE_ACTIVE_CROPS_KEY = 'vasudha_active_crops';

// Generate user-specific storage key
const getUserStorageKey = (userId: string | null): string => {
  if (!userId) return BASE_ACTIVE_CROPS_KEY;
  return `${BASE_ACTIVE_CROPS_KEY}_${userId}`;
};

// Type for crop profile from JSON
export interface CropStage {
  name: string;
  startDay: number;
  endDay: number;
  description: string;
}

export interface CropProfile {
  displayName: string;
  category: string;
  growthDurationDays: number;
  marketNames: string[];
  seasons: string[];
  stages: CropStage[];
}

// Type for an active crop being tracked
export interface ActiveCrop {
  id: string;                    // Unique identifier
  cropKey: string;               // Key in cropProfiles.json (e.g., "rice", "wheat")
  displayName: string;           // Human readable name
  plantingDate: string;          // ISO date string
  expectedHarvestDate: string;   // Calculated ISO date string
  latitude: number;
  longitude: number;
  location: {                    // For display purposes
    state?: string;
    district?: string;
  };
  status: 'active' | 'harvested' | 'failed';
  createdAt: string;
}

// Calculated current state
export interface CropGrowthState {
  currentStage: CropStage | null;
  daysSincePlanting: number;
  daysRemaining: number;
  progressPercent: number;
  nextStage: CropStage | null;
  daysToNextStage: number;
}

interface ActiveCropsContextType {
  activeCrops: ActiveCrop[];
  isLoading: boolean;
  
  // CRUD operations
  addCrop: (params: {
    cropKey: string;
    plantingDate: Date;
    latitude: number;
    longitude: number;
    location?: { state?: string; district?: string };
  }) => Promise<ActiveCrop>;
  
  removeCrop: (id: string) => Promise<void>;
  updateCropStatus: (id: string, status: 'active' | 'harvested' | 'failed') => Promise<void>;
  
  // Query operations
  getCropProfile: (cropKey: string) => CropProfile | null;
  getCropGrowthState: (crop: ActiveCrop) => CropGrowthState;
  getActiveCropsByLocation: (state: string) => ActiveCrop[];
  
  // Market name mapping
  getMarketNameForCrop: (cropKey: string) => string;
  getCropKeyFromMarketName: (marketName: string) => string | null;
  
  // Primary crop (for backward compatibility with single crop selection)
  primaryCrop: ActiveCrop | null;
  setPrimaryCrop: (id: string) => void;
  
  // Refresh data (for use after login)
  refreshUserData: () => Promise<void>;
}

const ActiveCropsContext = createContext<ActiveCropsContextType | null>(null);

// Cast the imported JSON to proper type
const profiles = cropProfiles as Record<string, CropProfile>;

// Get current user ID from token
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
      const decoded: any = jwtDecode(token);
      return decoded.sub || decoded.username || null;
    }
  } catch (error) {
    console.error('[ActiveCropsContext] Error getting user ID:', error);
  }
  return null;
};

export const ActiveCropsProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeCrops, setActiveCrops] = useState<ActiveCrop[]>([]);
  const [primaryCropId, setPrimaryCropId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load from storage on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Save to storage whenever crops change (only if we have a user and not loading)
  useEffect(() => {
    if (!isLoading && currentUserId) {
      saveToStorage();
    }
  }, [activeCrops, primaryCropId, isLoading, currentUserId]);

  const loadFromStorage = async () => {
    try {
      setIsLoading(true);
      const userId = await getCurrentUserId();
      setCurrentUserId(userId);
      
      if (!userId) {
        // No user logged in, clear state
        console.log('[ActiveCropsContext] No user logged in, clearing crops');
        setActiveCrops([]);
        setPrimaryCropId(null);
        setIsLoading(false);
        return;
      }

      const storageKey = getUserStorageKey(userId);
      const stored = await AsyncStorage.getItem(storageKey);
      
      console.log(`[ActiveCropsContext] Loading for user ${userId}, key=${storageKey}`);
      
      if (stored) {
        const data = JSON.parse(stored);
        setActiveCrops(data.crops || []);
        setPrimaryCropId(data.primaryCropId || null);
        console.log(`[ActiveCropsContext] Loaded ${data.crops?.length || 0} crops for user ${userId}`);
      } else {
        // No data for this user - start fresh
        console.log(`[ActiveCropsContext] No crop data found for user ${userId}`);
        setActiveCrops([]);
        setPrimaryCropId(null);
      }
      
      // Don't migrate old data - that was causing the issue
      // Each user should only see their own crops
    } catch (error) {
      console.error('[ActiveCropsContext] Load error:', error);
      setActiveCrops([]);
      setPrimaryCropId(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh user data - call this after login
  const refreshUserData = useCallback(async () => {
    console.log('[ActiveCropsContext] Refreshing user data...');
    await loadFromStorage();
  }, []);

  const saveToStorage = async () => {
    try {
      if (!currentUserId) {
        console.log('[ActiveCropsContext] No user ID, skipping save');
        return;
      }
      
      const storageKey = getUserStorageKey(currentUserId);
      await AsyncStorage.setItem(storageKey, JSON.stringify({
        crops: activeCrops,
        primaryCropId,
      }));
      console.log(`[ActiveCropsContext] Saved ${activeCrops.length} crops for user ${currentUserId}`);
    } catch (error) {
      console.error('[ActiveCropsContext] Save error:', error);
    }
  };

  const calculateHarvestDate = (plantingDate: Date, durationDays: number): string => {
    const harvest = new Date(plantingDate);
    harvest.setDate(harvest.getDate() + durationDays);
    return harvest.toISOString();
  };

  const addCrop = useCallback(async (params: {
    cropKey: string;
    plantingDate: Date;
    latitude: number;
    longitude: number;
    location?: { state?: string; district?: string };
  }): Promise<ActiveCrop> => {
    const { cropKey, plantingDate, latitude, longitude, location } = params;
    const profile = profiles[cropKey.toLowerCase()];
    
    if (!profile) {
      throw new Error(`Unknown crop: ${cropKey}`);
    }
    
    const newCrop: ActiveCrop = {
      id: `${cropKey.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      cropKey: cropKey.toLowerCase(),
      displayName: profile.displayName,
      plantingDate: plantingDate.toISOString(),
      expectedHarvestDate: calculateHarvestDate(plantingDate, profile.growthDurationDays),
      latitude,
      longitude,
      location: location || {},
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    
    setActiveCrops(prev => [...prev, newCrop]);
    
    // Set as primary if it's the first crop
    if (activeCrops.length === 0) {
      setPrimaryCropId(newCrop.id);
    }
    
    console.log('[ActiveCropsContext] Added crop:', newCrop);
    return newCrop;
  }, [activeCrops.length]);

  const removeCrop = useCallback(async (id: string): Promise<void> => {
    setActiveCrops(prev => prev.filter(c => c.id !== id));
    
    if (primaryCropId === id) {
      const remaining = activeCrops.filter(c => c.id !== id);
      setPrimaryCropId(remaining.length > 0 ? remaining[0].id : null);
    }
  }, [activeCrops, primaryCropId]);

  const updateCropStatus = useCallback(async (
    id: string, 
    status: 'active' | 'harvested' | 'failed'
  ): Promise<void> => {
    setActiveCrops(prev => 
      prev.map(c => c.id === id ? { ...c, status } : c)
    );
  }, []);

  const getCropProfile = useCallback((cropKey: string): CropProfile | null => {
    return profiles[cropKey.toLowerCase()] || null;
  }, []);

  const getCropGrowthState = useCallback((crop: ActiveCrop): CropGrowthState => {
    const profile = profiles[crop.cropKey];
    if (!profile) {
      return {
        currentStage: null,
        daysSincePlanting: 0,
        daysRemaining: 0,
        progressPercent: 0,
        nextStage: null,
        daysToNextStage: 0,
      };
    }

    const plantingDate = new Date(crop.plantingDate);
    const now = new Date();
    const daysSincePlanting = Math.floor(
      (now.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const daysRemaining = Math.max(0, profile.growthDurationDays - daysSincePlanting);
    const progressPercent = Math.min(100, (daysSincePlanting / profile.growthDurationDays) * 100);
    
    // Find current stage
    let currentStage: CropStage | null = null;
    let nextStage: CropStage | null = null;
    let daysToNextStage = 0;
    
    for (let i = 0; i < profile.stages.length; i++) {
      const stage = profile.stages[i];
      if (daysSincePlanting >= stage.startDay && daysSincePlanting <= stage.endDay) {
        currentStage = stage;
        if (i < profile.stages.length - 1) {
          nextStage = profile.stages[i + 1];
          daysToNextStage = nextStage.startDay - daysSincePlanting;
        }
        break;
      }
    }
    
    // If past all stages, we're at maturity
    if (!currentStage && daysSincePlanting > 0) {
      currentStage = profile.stages[profile.stages.length - 1];
    }

    return {
      currentStage,
      daysSincePlanting,
      daysRemaining,
      progressPercent,
      nextStage,
      daysToNextStage,
    };
  }, []);

  const getActiveCropsByLocation = useCallback((state: string): ActiveCrop[] => {
    return activeCrops.filter(
      c => c.status === 'active' && 
           c.location?.state?.toLowerCase() === state.toLowerCase()
    );
  }, [activeCrops]);

  const getMarketNameForCrop = useCallback((cropKey: string): string => {
    const profile = profiles[cropKey.toLowerCase()];
    if (profile && profile.marketNames.length > 0) {
      return profile.marketNames[0]; // Return primary market name
    }
    return cropKey; // Fallback to cropKey
  }, []);

  const getCropKeyFromMarketName = useCallback((marketName: string): string | null => {
    const normalized = marketName.toLowerCase();
    
    for (const [key, profile] of Object.entries(profiles)) {
      if (profile.marketNames.some(name => name.toLowerCase() === normalized)) {
        return key;
      }
    }
    return null;
  }, []);

  const setPrimaryCrop = useCallback((id: string) => {
    if (activeCrops.find(c => c.id === id)) {
      setPrimaryCropId(id);
    }
  }, [activeCrops]);

  const primaryCrop = activeCrops.find(c => c.id === primaryCropId) || activeCrops[0] || null;

  return (
    <ActiveCropsContext.Provider
      value={{
        activeCrops,
        isLoading,
        addCrop,
        removeCrop,
        updateCropStatus,
        getCropProfile,
        getCropGrowthState,
        getActiveCropsByLocation,
        getMarketNameForCrop,
        getCropKeyFromMarketName,
        primaryCrop,
        setPrimaryCrop,
        refreshUserData,
      }}
    >
      {children}
    </ActiveCropsContext.Provider>
  );
};

export const useActiveCrops = () => {
  const context = useContext(ActiveCropsContext);
  if (!context) {
    throw new Error('useActiveCrops must be used within ActiveCropsProvider');
  }
  return context;
};

// Utility function to get all available crops
export const getAllCropKeys = (): string[] => Object.keys(profiles);
export const getAllCropProfiles = (): Record<string, CropProfile> => profiles;
