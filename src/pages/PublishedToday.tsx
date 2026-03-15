import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';
import { Match, WhatsAppGroup } from '../types';
import { motion } from 'motion/react';
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
          return isOwnGroup || isViewer || user.role === 'super_admin'; // super_admin sees all
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
          <div className="space-y-8">
            {publishedMatches.map((log, index) => (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100"
              >
                {/* Designed Card Image */}
                <div className="relative aspect-[4/3] md:aspect-video">
                  <img 
                    src={log.match?.image_url || 'https://picsum.photos/seed/match/800/600'} 
                    alt={log.match?.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-6 right-6 left-6 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        פורסם היום
                      </span>
                      <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {new Date(log.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 className="text-3xl font-black mb-1">{log.match?.name}, {log.match?.age}</h3>
                    <p className="text-sm font-medium opacity-90 flex items-center gap-2">
                      <MapPin size={14} />
                      {log.match?.city} • {log.match?.religious_level}
                    </p>
                  </div>
                </div>

                <div className="p-8 space-y-6">
                  {/* Match Text */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
                      <Info size={16} />
                      <span>קצת עליי</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {log.match?.about}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
                      <Heart size={16} />
                      <span>מה אני מחפש/ת</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {log.match?.looking_for}
                    </p>
                  </div>

                  {/* Admin Info */}
                  <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <User size={28} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-black uppercase tracking-wider">המנהל המפרסם</p>
                        <h4 className="text-lg font-black text-slate-900">{log.user_name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black">
                            <Users size={10} />
                            <span>{log.group_name}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {log.admin?.phone && (
                        <a 
                          href={`https://wa.me/${log.admin.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`שלום ${log.user_name}, ראיתי את הכרטיס של ${log.match?.name} שפורסם היום בקבוצת ${log.group_name} ואשמח לשמוע פרטים נוספים.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 md:flex-none px-6 py-3 bg-[#25D366] text-white rounded-2xl font-black hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                        >
                          <MessageSquare size={20} />
                          שלח וואטזאפ למנהל
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
