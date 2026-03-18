import React, { useEffect, useState } from 'react';
import { dataService } from '../services/dataService';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const ActiveManagersWidget: React.FC = () => {
  const { user } = useAuth();
  const [activeManagers, setActiveManagers] = useState<User[]>([]);

  useEffect(() => {
    const fetchActive = async () => {
      const managers = await dataService.getActiveManagers();
      setActiveManagers(managers);
    };
    fetchActive();
    const interval = setInterval(fetchActive, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (!user || (user.role !== 'super_admin' && user.role !== 'super_observer')) {
    return null;
  }

  const isMalachi = user.username === 'god';

  return (
    <div className="mt-6 p-4 bg-slate-900 rounded-2xl border border-slate-800">
      <h3 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
        מנהלים בפעילות כעת
      </h3>
      <div className="space-y-3">
        {activeManagers.map(manager => (
          <div key={manager.id} className="flex items-center justify-between text-slate-300 text-xs">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              </div>
              <span>{manager.full_name}</span>
            </div>
            {isMalachi && (
              <button 
                onClick={() => toast.success(`התראה נשלחה ל-${manager.full_name}`)}
                className="p-1 hover:bg-slate-700 rounded-md transition-colors"
                title="שלח התראה"
              >
                <Send size={12} className="text-[#D4AF37]" />
              </button>
            )}
          </div>
        ))}
        {activeManagers.length === 0 && (
          <p className="text-slate-500 text-xs text-center italic">אין מנהלים פעילים כעת</p>
        )}
      </div>
    </div>
  );
};
