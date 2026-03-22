import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, X, User, ArrowLeftRight } from 'lucide-react';
import { dataService } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { Match } from '../types';
import { toast } from 'react-hot-toast';

import { getGenderedText } from '../utils/gender';

const PendingTransfersPage: React.FC = () => {
  const { user } = useAuth();
  const activeUser = user;
  const [pending, setPending] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeUser) {
      loadPending();
    }
  }, [activeUser]);

  const loadPending = async () => {
    if (!activeUser) return;
    try {
      const data = await dataService.getPendingTransfersForMe(activeUser.id);
      setPending(data);
    } catch (err) {
      console.error('Failed to load pending transfers:', err);
      toast.error('שגיאה בטעינת בקשות');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await dataService.approveTransfer([id]);
      toast.success('העברה אושרה בהצלחה');
      loadPending();
    } catch (err) {
      toast.error('שגיאה באישור ההעברה');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await dataService.rejectTransfer([id]);
      toast.success('העברה נדחתה');
      loadPending();
    } catch (err) {
      toast.error('שגיאה בדחיית ההעברה');
    }
  };

  if (loading) return <div className="p-8 text-center">טוען...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-right" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-luxury-blue/10 text-luxury-blue flex items-center justify-center">
          <ArrowLeftRight size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {getGenderedText(activeUser?.gender, 'בקשות העברה חדשות', 'בקשות העברה חדשות')}
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            {getGenderedText(activeUser?.gender, 'משודכים שהועברו אליך וממתינים לאישורך', 'משודכות שהועברו אלייך וממתינות לאישורך')}
          </p>
        </div>
      </div>

      {pending.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pending.map(match => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={match.id} 
              className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden">
                  {match.image_url ? (
                    <img src={match.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <User size={32} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-black text-slate-900 truncate">{match.full_name}</h4>
                  <p className="text-sm text-slate-500 font-medium">
                    {getGenderedText(match.type as any, 'משודך', 'משודכת')} • {match.age} • {match.city}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => handleApprove(match.id)}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  <span>אשר קבלה</span>
                </button>
                <button 
                  onClick={() => handleReject(match.id)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  <span>דחה</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <p className="text-slate-500 font-bold text-lg">אין בקשות ממתינות</p>
        </div>
      )}
    </div>
  );
};


export default PendingTransfersPage;
