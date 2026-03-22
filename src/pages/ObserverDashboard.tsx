import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Users, UserCog, User } from 'lucide-react';

export default function ObserverDashboard() {
  const { selectRole } = useAuth();
  const navigate = useNavigate();

  const handleSelectRole = (role: 'admin' | 'team_leader' | 'observer_manager') => {
    selectRole(role);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        <button 
          onClick={() => handleSelectRole('admin')}
          className="bg-white p-8 rounded-2xl shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-4 border border-slate-100"
        >
          <Shield size={48} className="text-luxury-blue" />
          <h2 className="text-2xl font-bold">צפייה כמנהל ראשי</h2>
        </button>
        <button 
          onClick={() => handleSelectRole('team_leader')}
          className="bg-white p-8 rounded-2xl shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-4 border border-slate-100"
        >
          <Users size={48} className="text-emerald-600" />
          <h2 className="text-2xl font-bold">צפייה כראש צוות</h2>
        </button>
        <button 
          onClick={() => handleSelectRole('admin')} // Assuming 'admin' covers regular manager
          className="bg-white p-8 rounded-2xl shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-4 border border-slate-100"
        >
          <UserCog size={48} className="text-blue-600" />
          <h2 className="text-2xl font-bold">צפייה כמנהל רגיל</h2>
        </button>
        <button 
          onClick={() => handleSelectRole('observer_manager')}
          className="bg-white p-8 rounded-2xl shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-4 border border-slate-100"
        >
          <User size={48} className="text-purple-600" />
          <h2 className="text-2xl font-bold">כניסה אישית (מלאכי)</h2>
        </button>
      </div>
    </div>
  );
}
