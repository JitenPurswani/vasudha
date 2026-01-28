import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CROP_STORAGE_KEY = 'vasudha_selected_crop';
const PLANTING_DATE_KEY = 'vasudha_planting_date';

interface CropContextType {
  selectedCrop: string | null;
  plantingDate: Date | null;
  setSelectedCrop: (crop: string) => void;
  setPlantingDate: (date: Date) => void;
  clearCrop: () => void;
}

const CropContext = createContext<CropContextType | null>(null);

export const CropProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedCrop, setSelectedCropState] = useState<string | null>(null);
  const [plantingDate, setPlantingDateState] = useState<Date | null>(null);

  // Load persisted data on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const storedCrop = await AsyncStorage.getItem(CROP_STORAGE_KEY);
        const storedDate = await AsyncStorage.getItem(PLANTING_DATE_KEY);
        
        if (storedCrop) {
          setSelectedCropState(storedCrop);
        }
        if (storedDate) {
          setPlantingDateState(new Date(storedDate));
        }
      } catch (error) {
        console.error('[CropContext] Failed to load persisted data:', error);
      }
    };
    loadPersistedData();
  }, []);

  const setSelectedCrop = async (crop: string) => {
    setSelectedCropState(crop);
    try {
      await AsyncStorage.setItem(CROP_STORAGE_KEY, crop);
    } catch (error) {
      console.error('[CropContext] Failed to persist crop:', error);
    }
  };

  const setPlantingDate = async (date: Date) => {
    setPlantingDateState(date);
    try {
      await AsyncStorage.setItem(PLANTING_DATE_KEY, date.toISOString());
    } catch (error) {
      console.error('[CropContext] Failed to persist planting date:', error);
    }
  };

  const clearCrop = async () => {
    setSelectedCropState(null);
    setPlantingDateState(null);
    try {
      await AsyncStorage.multiRemove([CROP_STORAGE_KEY, PLANTING_DATE_KEY]);
    } catch (error) {
      console.error('[CropContext] Failed to clear persisted data:', error);
    }
  };

  return (
    <CropContext.Provider
      value={{
        selectedCrop,
        plantingDate,
        setSelectedCrop,
        setPlantingDate,
        clearCrop,
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
