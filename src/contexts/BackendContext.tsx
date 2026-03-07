import React, { createContext, useContext, useState, useEffect } from 'react';
import { BackendMode, dataService } from '../services/dataService';

interface BackendContextType {
  mode: BackendMode | null;
  setMode: (mode: BackendMode) => void;
}

const BackendContext = createContext<BackendContextType | undefined>(undefined);

export const BackendProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<BackendMode | null>(null);

  useEffect(() => {
    const savedMode = localStorage.getItem('backend_mode') as BackendMode;
    if (savedMode) {
      setModeState(savedMode);
      dataService.setMode(savedMode);
    }
  }, []);

  const setMode = (newMode: BackendMode) => {
    setModeState(newMode);
    dataService.setMode(newMode);
  };

  return (
    <BackendContext.Provider value={{ mode, setMode }}>
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
