import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { Avatar } from './Avatar';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={user?.full_name || user?.username} url={user?.avatar_url} size="md" />
          <div>
            <h1 className="font-bold text-slate-900">
              {user?.role === 'super_observer' ? (
                <span className="text-[#D4AF37]">מנהל העמותה</span>
              ) : (
                user?.role === 'candidate' ? 'משודך' : 'מנהל'
              )}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {user?.role === 'super_observer' ? 'מנהל העמותה' : user?.full_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user?.role === 'super_observer' && (
            <button
              onClick={() => window.location.href = '/identity-selector'}
              className="px-4 py-2 bg-purple-600 text-white rounded-full font-bold text-sm hover:bg-purple-700 transition-colors"
            >
              החלף זהות
            </button>
          )}
          <button
            onClick={() => logout()}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};
