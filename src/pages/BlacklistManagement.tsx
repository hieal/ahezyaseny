import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { dataService } from '../services/dataService';
import { Blacklist } from '../types';
import { toast } from 'react-hot-toast';
import { Trash2, Plus } from 'lucide-react';

const BlacklistManagement = () => {
  const [blacklist, setBlacklist] = useState<Blacklist[]>([]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const fetchBlacklist = async () => {
    const { data, error } = await supabase.from('blacklist').select('*');
    if (error) toast.error('שגיאה בטעינת הרשימה השחורה');
    else setBlacklist(data || []);
  };

  const removeFromBlacklist = async (id: string) => {
    const { error } = await supabase.from('blacklist').delete().eq('id', id);
    if (error) toast.error('שגיאה במחיקה');
    else {
      toast.success('נמחק בהצלחה');
      fetchBlacklist();
    }
  };

  const addToBlacklist = async () => {
    if (!email && !phone && !fullName) return;
    try {
      await dataService.addToBlacklist({ email, phone, full_name: fullName, reason, notes, created_by: '' });
      toast.success('נוסף בהצלחה');
      setEmail('');
      setPhone('');
      setFullName('');
      setReason('');
      setNotes('');
      fetchBlacklist();
    } catch (error) {
      toast.error('שגיאה בהוספה לרשימה');
    }
  };

  const updateNotes = async (id: string, newNotes: string) => {
    const { error } = await supabase.from('blacklist').update({ notes: newNotes }).eq('id', id);
    if (error) toast.error('שגיאה בעדכון הערה');
    else {
      toast.success('הערה עודכנה');
      fetchBlacklist();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">ניהול רשימה שחורה</h1>
      <div className="flex gap-4 mb-6 flex-wrap">
        <input className="border p-2 rounded" placeholder="אימייל" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="border p-2 rounded" placeholder="טלפון" value={phone} onChange={e => setPhone(e.target.value)} />
        <input className="border p-2 rounded" placeholder="שם מלא" value={fullName} onChange={e => setFullName(e.target.value)} />
        <input className="border p-2 rounded" placeholder="סיבה" value={reason} onChange={e => setReason(e.target.value)} />
        <input className="border p-2 rounded" placeholder="הערות" value={notes} onChange={e => setNotes(e.target.value)} />
        <button onClick={addToBlacklist} className="bg-red-500 text-white p-2 rounded flex items-center gap-2"><Plus size={16}/> הוסף</button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-100">
            <th className="p-2 border">אימייל</th>
            <th className="p-2 border">טלפון</th>
            <th className="p-2 border">שם מלא</th>
            <th className="p-2 border">סיבה</th>
            <th className="p-2 border">הערות</th>
            <th className="p-2 border">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {blacklist.map(item => (
            <tr key={item.id}>
              <td className="p-2 border">{item.email}</td>
              <td className="p-2 border">{item.phone}</td>
              <td className="p-2 border">{item.full_name}</td>
              <td className="p-2 border">{item.reason}</td>
              <td className="p-2 border">
                <input className="border p-1 rounded" defaultValue={item.notes} onBlur={e => updateNotes(item.id, e.target.value)} />
              </td>
              <td className="p-2 border"><button onClick={() => removeFromBlacklist(item.id)} className="text-red-500"><Trash2 size={16}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BlacklistManagement;
