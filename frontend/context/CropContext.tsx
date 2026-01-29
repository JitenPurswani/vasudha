import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';

// Generate user-specific storage keys
const getUserStorageKey = (userId: string | null, baseKey: string): string => {
  if (!userId) return baseKey;
  return `${baseKey}_${userId}`;
};

const BASE_CROP_STORAGE_KEY = 'vasudha_selected_crop';
const BASE_PLANTING_DATE_KEY = 'vasudha_planting_date';

interface CropContextType {
  selectedCrop: string | null;
  plantingDate: Date | null;
  setSelectedCrop: (crop: string) => void;
  setPlantingDate: (date: Date) => void;
  clearCrop: () => void;
  isLoading: boolean;
}

const CropContext = createContext<CropContextType | null>(null);

export const CropProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedCrop, setSelectedCropState] = useState<string | null>(null);
  const [plantingDate, setPlantingDateState] = useState<Date | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get current user ID from token
  const getCurrentUserId = async (): Promise<string | null> => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        const decoded: any = jwtDecode(token);
        return decoded.sub || decoded.username || null;
      }
    } catch (error) {
      console.error('[CropContext] Error getting user ID:', error);
    }
    return null;
  };

  // Load persisted data on mount AND when user changes
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        setIsLoading(true);
        const currentUserId = await getCurrentUserId();
        setUserId(currentUserId);
        
        if (!currentUserId) {
          // No user logged in, clear state
          setSelectedCropState(null);
          setPlantingDateState(null);
          setIsLoading(false);
          return;
        }

        // Use user-specific keys
        const cropKey = getUserStorageKey(currentUserId, BASE_CROP_STORAGE_KEY);
        const dateKey = getUserStorageKey(currentUserId, BASE_PLANTING_DATE_KEY);
        
        const storedCrop = await AsyncStorage.getItem(cropKey);
        const storedDate = await AsyncStorage.getItem(dateKey);
        
        console.log(`[CropContext] Loading for user ${currentUserId}: crop=${storedCrop}, date=${storedDate}`);
        
        if (storedCrop) {
          setSelectedCropState(storedCrop);
        } else {
          setSelectedCropState(null);
        }
        
        if (storedDate) {
          setPlantingDateState(new Date(storedDate));
        } else {
          setPlantingDateState(null);
        }
      } catch (error) {
        console.error('[CropContext] Failed to load persisted data:', error);
        setSelectedCropState(null);
        setPlantingDateState(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadPersistedData();
  }, []);

  // Re-load when userId might have changed (after login/logout)
  const reloadUserData = useCallback(async () => {
    const currentUserId = await getCurrentUserId();
    if (currentUserId !== userId) {
      setUserId(currentUserId);
      
      if (!currentUserId) {
        setSelectedCropState(null);
        setPlantingDateState(null);
        return;
      }

      const cropKey = getUserStorageKey(currentUserId, BASE_CROP_STORAGE_KEY);
      const dateKey = getUserStorageKey(currentUserId, BASE_PLANTING_DATE_KEY);
      
      const storedCrop = await AsyncStorage.getItem(cropKey);
      const storedDate = await AsyncStorage.getItem(dateKey);
      
      setSelectedCropState(storedCrop);
      setPlantingDateState(storedDate ? new Date(storedDate) : null);
    }
  }, [userId]);

  const setSelectedCrop = useCallback(async (crop: string) => {
    setSelectedCropState(crop);
    try {
      const currentUserId = await getCurrentUserId();
      const cropKey = getUserStorageKey(currentUserId, BASE_CROP_STORAGE_KEY);
      await AsyncStorage.setItem(cropKey, crop);
      
      // Also save to legacy key for backward compatibility
      await AsyncStorage.setItem(BASE_CROP_STORAGE_KEY, crop);
      
      console.log(`[CropContext] Saved crop for user ${currentUserId}: ${crop}`);
    } catch (error) {
      console.error('[CropContext] Failed to persist crop:', error);
    }
  }, []);

  const setPlantingDate = useCallback(async (date: Date) => {
    setPlantingDateState(date);
    try {
      const currentUserId = await getCurrentUserId();
      const dateKey = getUserStorageKey(currentUserId, BASE_PLANTING_DATE_KEY);
      await AsyncStorage.setItem(dateKey, date.toISOString());
      
      // Also save to legacy key for backward compatibility
      await AsyncStorage.setItem(BASE_PLANTING_DATE_KEY, date.toISOString());
      
      console.log(`[CropContext] Saved planting date for user ${currentUserId}: ${date.toISOString()}`);
    } catch (error) {
      console.error('[CropContext] Failed to persist planting date:', error);
    }
  }, []);

  const clearCrop = useCallback(async () => {
    setSelectedCropState(null);
    setPlantingDateState(null);
    try {
      const currentUserId = await getCurrentUserId();
      const cropKey = getUserStorageKey(currentUserId, BASE_CROP_STORAGE_KEY);
      const dateKey = getUserStorageKey(currentUserId, BASE_PLANTING_DATE_KEY);
      
      await AsyncStorage.multiRemove([cropKey, dateKey, BASE_CROP_STORAGE_KEY, BASE_PLANTING_DATE_KEY]);
      console.log(`[CropContext] Cleared crop data for user ${currentUserId}`);
    } catch (error) {
      console.error('[CropContext] Failed to clear persisted data:', error);
    }
  }, []);

  return (
    <CropContext.Provider
      value={{
        selectedCrop,
        plantingDate,
        setSelectedCrop,
        setPlantingDate,
        clearCrop,
        isLoading,
      }}
    >
      {children}
    </CropContext.Provider>
  );
};

export const useCrop = () => {
  const context = useContext(CropContext);
  if (!context) {
    throw new Error('useCrop must be used within CropProvider');
  }
  return context;
};
