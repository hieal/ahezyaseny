import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
  airtableSyncEnabled: boolean;
  setAirtableSyncEnabled: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [airtableSyncEnabled, setAirtableSyncEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('airtable_sync_enabled');
    return saved === 'true'; // Default to false (Disabled)
  });

  useEffect(() => {
    localStorage.setItem('airtable_sync_enabled', airtableSyncEnabled.toString());
  }, [airtableSyncEnabled]);

  return (
    <SettingsContext.Provider value={{ airtableSyncEnabled, setAirtableSyncEnabled }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
