import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';

interface PresenceData {
  user_id: string;
  full_name: string;
  role: string;
}

interface PresenceContextType {
  presenceState: Record<string, PresenceData>;
  activeAdminsCount: number;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export const PresenceProvider: React.FC<{ children: React.ReactNode, user: User | null }> = ({ children, user }) => {
  const [presenceState, setPresenceState] = useState<Record<string, PresenceData>>({});
  const [activeAdminsCount, setActiveAdminsCount] = useState(0);

  useEffect(() => {
    const fetchActiveAdmins = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'super_observer', 'team_leader']);
      
      if (!error && data) {
        setActiveAdminsCount(data.length);
      }
    };

    fetchActiveAdmins();
    const interval = setInterval(fetchActiveAdmins, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('room1');

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const newPresenceState: Record<string, PresenceData> = {};
        
        Object.values(newState).forEach((value: any) => {
          const presence = value[0];
          newPresenceState[presence.user_id] = presence;
        });
        
        setPresenceState(newPresenceState);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            full_name: user.full_name,
            role: user.role,
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  return (
    <PresenceContext.Provider value={{ presenceState, activeAdminsCount }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
};
