import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import cropProfiles from '@/constants/cropProfiles.json';

const ACTIVE_CROPS_KEY = 'vasudha_active_crops';

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
}

const ActiveCropsContext = createContext<ActiveCropsContextType | null>(null);

// Cast the imported JSON to proper type
const profiles = cropProfiles as Record<string, CropProfile>;

export const ActiveCropsProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeCrops, setActiveCrops] = useState<ActiveCrop[]>([]);
  const [primaryCropId, setPrimaryCropId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from storage on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Save to storage whenever crops change
  useEffect(() => {
    if (!isLoading) {
      saveToStorage();
    }
  }, [activeCrops, primaryCropId, isLoading]);

  const loadFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(ACTIVE_CROPS_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setActiveCrops(data.crops || []);
        setPrimaryCropId(data.primaryCropId || null);
      }
      
      // Migration: Check for old single-crop format
      await migrateOldCropData();
    } catch (error) {
      console.error('[ActiveCropsContext] Load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const migrateOldCropData = async () => {
    try {
      const oldCrop = await AsyncStorage.getItem('vasudha_selected_crop');
      const oldDate = await AsyncStorage.getItem('vasudha_planting_date');
      const latStr = await AsyncStorage.getItem('userLatitude');
      const lonStr = await AsyncStorage.getItem('userLongitude');
      const profileStr = await AsyncStorage.getItem('userProfile');
      
      if (oldCrop && !activeCrops.find(c => c.cropKey === oldCrop.toLowerCase())) {
        // Get profile data for location
        let state = '';
        let district = '';
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          state = profile.state || '';
          district = profile.district || '';
        }
        
        const lat = latStr ? parseFloat(latStr) : 0;
        const lon = lonStr ? parseFloat(lonStr) : 0;
        const plantingDate = oldDate ? new Date(oldDate) : new Date();
        
        const cropKey = oldCrop.toLowerCase();
        const profile = profiles[cropKey];
        
        if (profile) {
          const newCrop: ActiveCrop = {
            id: `${cropKey}-${Date.now()}`,
            cropKey,
            displayName: profile.displayName,
            plantingDate: plantingDate.toISOString(),
            expectedHarvestDate: calculateHarvestDate(plantingDate, profile.growthDurationDays),
            latitude: lat,
            longitude: lon,
            location: { state, district },
            status: 'active',
            createdAt: new Date().toISOString(),
          };
          
          setActiveCrops(prev => [...prev, newCrop]);
          setPrimaryCropId(newCrop.id);
          
          console.log('[ActiveCropsContext] Migrated old crop data:', newCrop);
        }
      }
    } catch (error) {
      console.error('[ActiveCropsContext] Migration error:', error);
    }
  };

  const saveToStorage = async () => {
    try {
      await AsyncStorage.setItem(ACTIVE_CROPS_KEY, JSON.stringify({
        crops: activeCrops,
        primaryCropId,
      }));
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
    
    // Also update old storage keys for backward compatibility
    await AsyncStorage.setItem('vasudha_selected_crop', cropKey.toLowerCase());
    await AsyncStorage.setItem('vasudha_planting_date', plantingDate.toISOString());
    
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
