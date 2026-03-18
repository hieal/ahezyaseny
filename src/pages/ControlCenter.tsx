import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { User } from '../types';
import { Users, UserX, UserCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ControlCenter() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const usersData = await dataService.getUsers();
        setUsers(usersData);
      } catch (err) {
        toast.error('שגיאה בטעינת נתונים');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const boysCount = users.filter(u => u.gender === 'male').length;
  const girlsCount = users.filter(u => u.gender === 'female').length;
  const noContactUsers = users.filter(u => u.status === 'inactive');
  const onlineAdmins = users.filter(u => u.is_online);

  if (loading) return <div className="p-8 text-center">טוען נתונים...</div>;

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-black text-slate-900 mb-8">מרכז שליטה - מנהל העמותה</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-slate-500 font-bold mb-2">בנים / בנות</h3>
          <p className="text-4xl font-black text-slate-900">{boysCount} / {girlsCount}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-slate-500 font-bold mb-2">ללא יצירת קשר</h3>
          <p className="text-4xl font-black text-red-500">{noContactUsers.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-slate-500 font-bold mb-2">מנהלים מחוברים</h3>
          <p className="text-4xl font-black text-green-500">{onlineAdmins.length}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold mb-4">רשימת "ללא יצירת קשר"</h2>
        <div className="space-y-2">
          {noContactUsers.map(u => (
            <div key={u.id} className="p-4 border border-slate-100 rounded-xl flex items-center justify-between">
              <span className="font-bold">{u.full_name}</span>
              <span className="text-sm text-slate-500">{u.phone}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
