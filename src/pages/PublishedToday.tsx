import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';
import { Match, WhatsAppGroup } from '../types';
import { motion } from 'motion/react';
import MatchCard from '../components/MatchCard';
import { 
  Sparkles, Calendar, User, MessageSquare, 
  ChevronLeft, Info, MapPin, Heart, Users
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PublishedToday() {
  const { user } = useAuth();
  const [publishedMatches, setPublishedMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allGroups, setAllGroups] = useState<WhatsAppGroup[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [logs, groups] = await Promise.all([
          dataService.getPublishedToday(),
          dataService.getWhatsAppGroups()
        ]);
        
        // Filter matches based on candidate's groups or viewer status
        // "של הקבוצות שבהם הוא שייך או מסומן בתוך צופה"
        const filtered = logs.filter(log => {
          if (!user) return false;
          
          // If candidate belongs to the group where it was published
          const isOwnGroup = user.assigned_group_id === log.group_id;
          
          // If candidate is a viewer in this match's groups
          let isViewer = false;
          if (log.match?.viewer_group_ids) {
            try {
              const viewerIds = JSON.parse(log.match.viewer_group_ids);
              isViewer = viewerIds.includes(user.assigned_group_id);
            } catch (e) {}
          }
          
          // For now, let's show all published today if they match the candidate's category/gender interest
          // But the user specifically asked for "groups they belong to or marked as viewer"
          return isOwnGroup || isViewer || user.role === 'super_admin' || user.role === 'association_manager'; // super_admin sees all
        });

        setPublishedMatches(filtered);
        setAllGroups(groups);
      } catch (err) {
        console.error('Error fetching published today:', err);
        toast.error('שגיאה בטעינת הנתונים');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <header className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">משודכים שפורסמו היום</h1>
            <p className="text-sm text-slate-500 font-medium">ההצעות הכי חמות מהשטח</p>
          </div>
        </header>

        {publishedMatches.length === 0 ? (
          <div className="bg-white p-12 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold text-lg">עדיין לא פורסמו משודכים היום בקבוצות שלך.</p>
            <p className="text-slate-400 text-sm mt-2">חזור מאוחר יותר להתעדכן!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {publishedMatches.map((log, index) => (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col h-full"
              >
                <div className="flex-1">
                  <MatchCard 
                    match={log.match} 
                    viewMode="designed"
                    isViewer={true}
                    minimal={true}
                  />
                </div>
                
                <div className="mt-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">המנהל המפרסם</p>
                        <h4 className="text-sm font-black text-slate-900">{log.user_name}</h4>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black">
                      {log.group_name}
                    </div>
                  </div>

                  {log.admin?.phone && (
                    <a 
                      href={`https://wa.me/${log.admin.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`שלום ${log.user_name}, ראיתי את הכרטיס של ${log.match?.full_name} שפורסם היום בקבוצת ${log.group_name} ואשמח לשמוע פרטים נוספים.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 bg-[#25D366] text-white rounded-xl font-black hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100 text-sm"
                    >
                      <MessageSquare size={18} />
                      שלח וואטזאפ למנהל
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
