import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { Avatar } from './Avatar';
import { getGenderedText } from '../utils/gender';

export const Navbar: React.FC = () => {
  const { user, logout, activeRole, setActiveRole } = useAuth();

  const isDualRole = user?.role === 'admin' && user?.is_team_leader;

  return (
    <>
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={user?.full_name || user?.username} url={user?.avatar_url} size="md" />
            <div>
              <h1 className="font-bold text-slate-900">
                {getGenderedText(user?.gender, 'ברוך הבא', 'ברוכה הבאה')} {user?.full_name}
              </h1>
              {isDualRole && (
                <div className="flex gap-1 mt-1">
                  <button 
                    onClick={() => setActiveRole('admin')}
                    className={`px-2 py-0.5 text-[10px] rounded ${activeRole === 'admin' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    מנהל
                  </button>
                  <button 
                    onClick={() => setActiveRole('team_leader')}
                    className={`px-2 py-0.5 text-[10px] rounded ${activeRole === 'team_leader' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    ראש צוות
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => logout()}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
