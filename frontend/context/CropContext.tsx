import React, { createContext, useState, useContext } from 'react';

interface CropContextType {
  selectedCrop: string | null;
  plantingDate: Date | null;
  setSelectedCrop: (crop: string) => void;
  setPlantingDate: (date: Date) => void;
  clearCrop: () => void;
}

const CropContext = createContext<CropContextType | null>(null);

export const CropProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [plantingDate, setPlantingDate] = useState<Date | null>(null);

  const clearCrop = () => {
    setSelectedCrop(null);
    setPlantingDate(null);
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
