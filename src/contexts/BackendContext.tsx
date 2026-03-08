import React, { createContext, useContext } from 'react';
import { BackendMode, dataService } from '../services/dataService';

interface BackendContextType {
  mode: BackendMode | null;
  setMode: (mode: BackendMode) => void;
}

const BackendContext = createContext<BackendContextType | undefined>(undefined);

export const BackendProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BackendContext.Provider value={{ mode: 'production', setMode: () => {} }}>
      {children}
    </BackendContext.Provider>
  );
};

export const useBackend = () => {
  const context = useContext(BackendContext);
  if (context === undefined) {
    throw new Error('useBackend must be used within a BackendProvider');
  }
  return context;
};
