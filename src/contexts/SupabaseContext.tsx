import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, setSupabase as updateGlobalSupabase } from '../lib/supabase';

interface SupabaseContextType {
  client: SupabaseClient;
  updateClient: (url: string, key: string) => SupabaseClient;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<SupabaseClient>(getSupabase());

  const updateClient = (url: string, key: string) => {
    const newClient = updateGlobalSupabase(url, key);
    setClient(newClient);
    return newClient;
  };

  return (
    <SupabaseContext.Provider value={{ client, updateClient }}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};
