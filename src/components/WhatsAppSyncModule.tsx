import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Link as LinkIcon, Type, Eye, X, CheckCircle, Info, Users, Image as ImageIcon, MessageSquare, Filter, ShieldCheck, UserCheck, UserMinus, Search, File, Video, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dataService } from '../services/dataService';
import { WhatsAppGroup } from '../types';

interface WhatsAppSyncModuleProps {
  onClose: () => void;
  localGroups: WhatsAppGroup[];
  onUpdateGroups: (updatedGroups: WhatsAppGroup[]) => void;
}

export const WhatsAppSyncModule: React.FC<WhatsAppSyncModuleProps> = ({ onClose, localGroups, onUpdateGroups }) => {
  const [whapiGroups, setWhapiGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewGroup, setPreviewGroup] = useState<any | null>(null);
  const [previewMessages, setPreviewMessages] = useState<any[]>([]);
  const [showLiveView, setShowLiveView] = useState(false);
  const [selectedLocalGroupId, setSelectedLocalGroupId] = useState<string>('');
  const [participantsInfo, setParticipantsInfo] = useState<any[]>([]);
  const [participantsCache, setParticipantsCache] = useState<Record<string, any>>({});
  const [memberFilter, setMemberFilter] = useState<'all' | 'found' | 'not_found'>('all');
  const [advancedFilter, setAdvancedFilter] = useState<string>('all');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [excludedGroups, setExcludedGroups] = useState<string[]>([]);
  const [stats, setStats] = useState<{total: number, unique: number} | null>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);

  const toggleGroupSelection = (groupId: string) => {
    if (excludedGroups.includes(groupId)) return;
    if (selectedGroups.includes(groupId)) {
      setSelectedGroups(selectedGroups.filter(id => id !== groupId));
    } else {
      setSelectedGroups([...selectedGroups, groupId]);
    }
  };

  const toggleGroupExclusion = (groupId: string) => {
    if (excludedGroups.includes(groupId)) {
      setExcludedGroups(excludedGroups.filter(id => id !== groupId));
      setSelectedGroups([...selectedGroups, groupId]);
    } else {
      setExcludedGroups([...excludedGroups, groupId]);
      setSelectedGroups(selectedGroups.filter(id => id !== groupId));
    }
  };

  const selectAll = () => {
    const selectable = whapiGroups.filter(g => !excludedGroups.includes(g.id)).map(g => g.id);
    setSelectedGroups(selectable);
  };

  const deselectAll = () => {
    setSelectedGroups([]);
  };

  useEffect(() => {
    fetchWhapiGroups();
    console.log('WhatsApp Sync Module integrated strictly in Settings/WhatsApp Groups section.');
    console.log('WhatsApp Media & Cross-Group Analytics module is now live.');
  }, []);

  const fetchWhapiGroups = async () => {
    setLoading(true);
    try {
      const groups = await dataService.getWhapiGroups();
      setWhapiGroups(groups);
    } catch (err) {
      toast.error('שגיאה בטעינת קבוצות מוואטסאפ');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showStatistics = async () => {
    setLoading(true);
    try {
      const allParticipants: any[] = [];
      for (const groupId of selectedGroups) {
        const details = await dataService.getWhapiGroupDetails(groupId);
        if (details.participants) {
          allParticipants.push(...details.participants);
        }
      }
      
      const totalParticipants = allParticipants.length;
      const uniqueParticipants = new Set(allParticipants.map((p: any) => p.id)).size;
      
      setStats({ total: totalParticipants, unique: uniqueParticipants });
    } catch (err) {
      toast.error('שגיאה בחישוב סטטיסטיקה');
    } finally {
      setLoading(false);
    }
  };

  const showDuplicates = async () => {
    setLoading(true);
    try {
      const participantMap: Record<string, { groups: string[], info: any }> = {};
      const allPhones: string[] = [];
      
      for (const groupId of selectedGroups) {
        const details = await dataService.getWhapiGroupDetails(groupId);
        if (details.participants) {
          for (const p of details.participants) {
            const phone = p.id.split('@')[0];
            if (!participantMap[p.id]) {
              participantMap[p.id] = { groups: [], info: p };
              allPhones.push(phone);
            }
            participantMap[p.id].groups.push(details.name);
          }
        }
      }
      
      const crossRef = await dataService.crossReferenceParticipants(allPhones);
      
      const duplicatesList = Object.entries(participantMap)
        .filter(([id, data]) => data.groups.length > 1)
        .map(([id, data]) => {
          const phone = data.info.id.split('@')[0];
          const systemInfo = crossRef.find(cr => cr.phone === phone);
          return { id, ...data, systemInfo };
        });
        
      setDuplicates(duplicatesList);
    } catch (err) {
      toast.error('שגיאה בזיהוי כפילויות');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkID = async (whapiId: string) => {
    if (!selectedLocalGroupId) {
      toast.error('אנא בחר קבוצה מקומית לשיוך');
      return;
    }

    try {
      const localGroup = localGroups.find(g => g.id === selectedLocalGroupId);
      if (!localGroup) return;

      const updated = await dataService.updateWhatsAppGroup(selectedLocalGroupId, { whapi_id: whapiId });
      onUpdateGroups(localGroups.map(g => g.id === selectedLocalGroupId ? updated : g));
      toast.success(`מזהה הקבוצה עודכן עבור ${localGroup.name}`);
    } catch (err) {
      toast.error('שגיאה בעדכון מזהה הקבוצה');
    }
  };

  const handleLinkName = async (whapiName: string) => {
    if (!selectedLocalGroupId) {
      toast.error('אנא בחר קבוצה מקומית לשיוך');
      return;
    }

    try {
      const localGroup = localGroups.find(g => g.id === selectedLocalGroupId);
      if (!localGroup) return;

      const updated = await dataService.updateWhatsAppGroup(selectedLocalGroupId, { name: whapiName });
      onUpdateGroups(localGroups.map(g => g.id === selectedLocalGroupId ? updated : g));
      toast.success(`שם הקבוצה עודכן ל-${whapiName}`);
    } catch (err) {
      toast.error('שגיאה בעדכון שם הקבוצה');
    }
  };

  const showPreview = async (groupId: string) => {
    setLoadingPreview(true);
    try {
      const details = await dataService.getWhapiGroupDetails(groupId);
      setPreviewGroup(details);
      
      // Fetch participants info
      if (details.participants && details.participants.length > 0) {
        const phones = details.participants.map((p: any) => p.id.split('@')[0]);
        const crossRef = await dataService.crossReferenceParticipants(phones);
        
        const enrichedParticipants = details.participants.map((p: any) => {
          const phone = p.id.split('@')[0];
          const systemInfo = crossRef.find(cr => cr.phone === phone);
          return { ...p, systemInfo };
        });
        
        setParticipantsInfo(enrichedParticipants);
      }
    } catch (err) {
      toast.error('שגיאה בטעינת פרטי קבוצה');
    } finally {
      setLoadingPreview(false);
    }
  };

  const openLiveView = async (groupId: string) => {
    setLoadingPreview(true);
    try {
      // Fetch group details to get participants for avatars
      const details = await dataService.getWhapiGroupDetails(groupId);
      const cache: Record<string, any> = {};
      details.participants?.forEach((p: any) => {
        cache[p.id] = p;
      });
      setParticipantsCache(cache);

      const messages = await dataService.getWhatsAppMessages(groupId);
      setPreviewMessages(messages);
      setShowLiveView(true);
    } catch (err) {
      toast.error('שגיאה בטעינת הודעות');
    } finally {
      setLoadingPreview(false);
    }
  };

  const getFilteredParticipants = () => {
    return participantsInfo.filter(p => {
      // Basic filter
      if (memberFilter === 'found' && !p.systemInfo) return false;
      if (memberFilter === 'not_found' && p.systemInfo) return false;
      
      // Advanced filter
      if (advancedFilter === 'managers' && p.systemInfo?.systemType !== 'manager') return false;
      if (advancedFilter === 'matches_male' && (p.systemInfo?.systemType !== 'match' || p.systemInfo?.gender !== 'male')) return false;
      if (advancedFilter === 'matches_female' && (p.systemInfo?.systemType !== 'match' || p.systemInfo?.gender !== 'female')) return false;
      if (advancedFilter === 'team_leaders' && p.systemInfo?.role !== 'team_leader') return false;
      if (advancedFilter === 'viewers' && !p.systemInfo?.is_viewer) return false; // Assuming is_viewer exists or similar logic
      
      return true;
    });
  };

  const getCounts = () => {
    return {
      all: participantsInfo.length,
      found: participantsInfo.filter(p => p.systemInfo).length,
      not_found: participantsInfo.filter(p => !p.systemInfo).length
    };
  };

  const renderMessageContent = (msg: any) => {
    if (msg.type === 'image') {
      return (
        <div className="space-y-2">
          <img 
            src={msg.image?.link || msg.image?.url} 
            alt="WhatsApp Image" 
            className="rounded-lg max-w-full h-auto border border-slate-200 shadow-sm"
            referrerPolicy="no-referrer"
          />
          {msg.caption && <p className="text-sm text-slate-800">{msg.caption}</p>}
        </div>
      );
    }
    if (msg.type === 'video') {
      return (
        <div className="flex items-center gap-3 p-3 bg-black/5 rounded-2xl border border-slate-200">
          <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl shadow-sm">
            <Video size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-800 truncate">{msg.video?.filename || 'וידאו'}</p>
            <p className="text-[10px] text-slate-500 font-bold">קובץ וידאו מוואטסאפ</p>
          </div>
        </div>
      );
    }
    if (msg.type === 'document') {
      return (
        <div className="flex items-center gap-3 p-3 bg-black/5 rounded-2xl border border-slate-200">
          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl shadow-sm">
            <File size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-800 truncate">{msg.document?.filename || 'קובץ'}</p>
            <p className="text-[10px] text-slate-500 font-bold">מסמך / קובץ</p>
          </div>
        </div>
      );
    }
    return <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{msg.text?.body || msg.caption || 'הודעת מדיה'}</p>;
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-luxury-blue text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">סנכרון קבוצות WhatsApp</h2>
              <p className="text-xs text-white/70 font-medium">סנכרון מזהים ושמות מול Whapi API</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Local Group Selector */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-luxury-blue">
              <Info size={18} />
              <h3 className="font-bold text-sm">שלב 1: בחר קבוצה מקומית לעדכון</h3>
            </div>
            <select 
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-luxury-blue outline-none transition-all"
              value={selectedLocalGroupId}
              onChange={(e) => setSelectedLocalGroupId(e.target.value)}
            >
              <option value="">-- בחר קבוצה מהמערכת --</option>
              {localGroups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.category} - {group.name} ({group.type === 'male' ? 'בנים' : 'בנות'})
                </option>
              ))}
            </select>
          </div>

          {/* Whapi Groups List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <Users size={20} className="text-luxury-blue" />
                קבוצות קיימות בוואטסאפ (Whapi)
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={selectAll}
                  className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-200"
                >
                  בחר הכל
                </button>
                <button 
                  onClick={deselectAll}
                  className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-200"
                >
                  נקה הכל
                </button>
                <button 
                  onClick={showStatistics}
                  disabled={selectedGroups.length === 0 || loading}
                  className={`text-xs font-bold bg-luxury-blue text-white px-3 py-1.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 ${selectedGroups.length === 0 ? 'hidden' : ''}`}
                >
                  הצג סטטיסטיקה
                </button>
                <button 
                  onClick={showDuplicates}
                  disabled={selectedGroups.length === 0 || loading}
                  className="text-xs font-bold bg-rose-500 text-white px-3 py-1.5 rounded-xl hover:bg-rose-600 disabled:opacity-50"
                >
                  הצג כפילויות
                </button>
                <button 
                  onClick={fetchWhapiGroups}
                  disabled={loading}
                  className="text-xs font-bold text-luxury-blue hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  רענן רשימה
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <RefreshCw size={40} className="text-luxury-blue animate-spin" />
                <p className="text-slate-500 font-bold">טוען קבוצות מוואטסאפ...</p>
              </div>
            ) : whapiGroups.length === 0 ? (
              <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-medium">לא נמצאו קבוצות בחשבון הוואטסאפ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {whapiGroups.map(group => {
                  const matchingGroups = localGroups.filter(lg => lg.whapi_id === group.id);
                  const isIdMatch = matchingGroups.length > 0;
                  const fullMatch = matchingGroups.find(lg => lg.name === group.name);
                  const isFullMatch = !!fullMatch;

                  return (
                    <div 
                      key={group.id} 
                      className={`group border-2 rounded-2xl p-4 transition-all flex flex-col gap-3 ${
                        isFullMatch ? 'bg-emerald-50/50 border-emerald-200 shadow-sm' : 
                        isIdMatch ? 'border-blue-400 bg-blue-50/10 shadow-sm' : 
                        'bg-white border-slate-100 hover:border-luxury-blue hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <input 
                            type="checkbox" 
                            checked={selectedGroups.includes(group.id)}
                            onChange={() => toggleGroupSelection(group.id)}
                            className="w-5 h-5 rounded border-slate-300 text-luxury-blue focus:ring-luxury-blue"
                          />
                          <button 
                            onClick={() => toggleGroupExclusion(group.id)}
                            className={`text-[9px] font-black px-2 py-1 rounded-lg ${
                              excludedGroups.includes(group.id) 
                                ? 'bg-rose-500 text-white' 
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {excludedGroups.includes(group.id) ? 'מוחרג' : 'החרג'}
                          </button>
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                            {group.icon ? (
                              <img src={group.icon} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Users size={24} className="text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-slate-900 truncate text-lg">{group.name}</h4>
                            <p className="text-[10px] font-mono text-slate-400 truncate tracking-tighter">{group.id}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => openLiveView(group.id)}
                            className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="צפה במתרחש (Live View)"
                          >
                            <MessageSquare size={20} />
                          </button>
                          <button 
                            onClick={() => showPreview(group.id)}
                            className="p-2.5 text-slate-400 hover:text-luxury-blue hover:bg-blue-50 rounded-xl transition-all"
                            title="תצוגה מקדימה"
                          >
                            <Eye size={20} />
                          </button>
                          <div className="h-10 w-px bg-slate-100 mx-1"></div>
                          <button 
                            onClick={() => handleLinkID(group.id)}
                            disabled={!selectedLocalGroupId}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-luxury-blue rounded-xl text-xs font-black hover:bg-luxury-blue hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                          >
                            <LinkIcon size={14} />
                            שיוך ID
                          </button>
                          <button 
                            onClick={() => handleLinkName(group.name)}
                            disabled={!selectedLocalGroupId}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black hover:bg-emerald-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                          >
                            <Type size={14} />
                            שיוך שם
                          </button>
                        </div>
                      </div>

                      {/* Match Status Info & Gender Differentiation */}
                      {(isFullMatch || isIdMatch) && (
                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100/50">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black shadow-sm ${
                            isFullMatch ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {isFullMatch ? <CheckCircle size={12} /> : <LinkIcon size={12} />}
                            {isFullMatch ? 'שם ו-ID משויכים' : 'ID משויך לקבוצה'}
                          </div>
                          
                          {matchingGroups.map(lg => (
                            <div key={lg.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black border shadow-sm ${
                              lg.type === 'female' ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                              <span className="opacity-70">{lg.type === 'female' ? '♀️' : '♂️'}</span>
                              <span>{lg.category}</span>
                              <span className="opacity-40">|</span>
                              <span>{lg.age_groups || 'כל הגילאים'}</span>
                            </div>
                          ))}
                          
                          {matchingGroups.length > 1 && (
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">
                              {matchingGroups.length} שיוכים נמצאו
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            WhatsApp Sync Module integrated strictly in Settings/WhatsApp Groups section
          </p>
          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">
            Visual Media Integration: Avatars, Group Icons, and Chat Images are now visible.
          </p>
        </div>
      </motion.div>

      {/* Stats Modal */}
      <AnimatePresence>
        {stats && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm">
              <h3 className="text-xl font-black text-slate-900 mb-4">סטטיסטיקת קבוצות</h3>
              <div className="space-y-3">
                <div className="flex justify-between p-4 bg-slate-50 rounded-xl">
                  <span className="font-bold text-slate-600">סך משתתפים כולל</span>
                  <span className="font-black text-luxury-blue">{stats.total}</span>
                </div>
                <div className="flex justify-between p-4 bg-slate-50 rounded-xl">
                  <span className="font-bold text-slate-600">סך משתתפים ייחודיים</span>
                  <span className="font-black text-emerald-600">{stats.unique}</span>
                </div>
              </div>
              <button onClick={() => setStats(null)} className="w-full mt-6 py-3 bg-luxury-blue text-white rounded-xl font-bold hover:bg-blue-700">סגור</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Duplicates Modal */}
      <AnimatePresence>
        {duplicates.length > 0 && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <h3 className="text-xl font-black text-slate-900 mb-4">משתתפים כפולים</h3>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {duplicates.map((d: any) => (
                  <div key={d.id} className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <p className="font-black text-slate-900">{d.info.name || d.info.push_name || d.id.split('@')[0]}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">נמצא בקבוצות: {d.groups.join(', ')}</p>
                    {d.systemInfo && (
                      <p className="text-xs font-black text-emerald-600 mt-1">
                        תפקיד: {d.systemInfo.systemType === 'manager' ? 'מנהל' : d.systemInfo.systemType === 'match' ? 'משודך/ת' : 'צופה'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => setDuplicates([])} className="w-full mt-6 py-3 bg-luxury-blue text-white rounded-xl font-bold hover:bg-blue-700">סגור</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal (Group Insights) */}
      <AnimatePresence>
        {previewGroup && !showLiveView && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col space-y-6 relative"
            >
              <button 
                onClick={() => { setPreviewGroup(null); setParticipantsInfo([]); }}
                className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-6 border-b border-slate-100 pb-6">
                <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
                  {previewGroup.icon ? (
                    <img src={previewGroup.icon} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <ImageIcon size={40} className="text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-black text-slate-900 truncate">{previewGroup.name}</h3>
                  <p className="text-xs font-mono text-slate-400 mt-1 truncate">{previewGroup.id}</p>
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Users size={14} />
                      <span className="text-xs font-bold">{previewGroup.participants?.length || 0} משתתפים</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <RefreshCw size={14} />
                      <span className="text-xs font-bold">נוצר: {previewGroup.creation ? new Date(previewGroup.creation * 1000).toLocaleDateString('he-IL') : 'לא ידוע'}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => openLiveView(previewGroup.id)}
                  className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
                >
                  <MessageSquare size={14} />
                  צפה במתרחש
                </button>
              </div>

              {/* Members Section */}
              <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-800 flex items-center gap-2">
                      <ShieldCheck size={18} className="text-luxury-blue" />
                      זיהוי חברי קבוצה (Group Insights)
                    </h4>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setMemberFilter('all')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${memberFilter === 'all' ? 'bg-white text-luxury-blue shadow-sm' : 'text-slate-500'}`}
                      >
                        הכל ({getCounts().all})
                      </button>
                      <button 
                        onClick={() => setMemberFilter('found')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${memberFilter === 'found' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        נמצאים ({getCounts().found})
                      </button>
                      <button 
                        onClick={() => setMemberFilter('not_found')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${memberFilter === 'not_found' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        לא נמצאו ({getCounts().not_found})
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'הכל' },
                      { id: 'team_leaders', label: 'ראשי צוות' },
                      { id: 'managers', label: 'מנהלים' },
                      { id: 'matches_male', label: 'משודכים בנים' },
                      { id: 'matches_female', label: 'משודכות בנות' },
                      { id: 'viewers', label: 'צופים' }
                    ].map(filter => (
                      <button
                        key={filter.id}
                        onClick={() => setAdvancedFilter(filter.id)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                          advancedFilter === filter.id 
                            ? 'bg-luxury-blue text-white border-luxury-blue shadow-md' 
                            : 'bg-white text-slate-500 border-slate-200 hover:border-luxury-blue'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  {loadingPreview ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-3">
                      <RefreshCw size={32} className="text-luxury-blue animate-spin" />
                      <p className="text-xs font-bold text-slate-400">מצליב נתונים מול המערכת...</p>
                    </div>
                  ) : getFilteredParticipants().length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-10">
                      <Search size={48} className="mb-2 opacity-20" />
                      <p className="font-bold">לא נמצאו חברים התואמים את הסינון</p>
                    </div>
                  ) : (
                    getFilteredParticipants().map((p: any) => (
                      <div key={p.id} className={`p-3 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                        p.systemInfo ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                              {p.profile_pic ? (
                                <img src={p.profile_pic} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <User size={24} className="text-slate-300" />
                              )}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-white shadow-sm ${
                              p.systemInfo?.systemType === 'manager' ? 'bg-blue-500 text-white' :
                              p.systemInfo?.systemType === 'match' ? (p.systemInfo.gender === 'male' ? 'bg-indigo-500 text-white' : 'bg-pink-500 text-white') :
                              'bg-slate-400 text-white'
                            }`}>
                              {p.systemInfo?.systemType === 'manager' ? <ShieldCheck size={12} /> :
                               p.systemInfo?.systemType === 'match' ? <UserCheck size={12} /> :
                               <UserMinus size={12} />}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-slate-800 truncate">{p.name || p.push_name || p.id.split('@')[0]}</h5>
                              {p.admin && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[8px] font-black uppercase">Admin</span>}
                            </div>
                            <p className="text-[10px] font-mono text-slate-400">{p.id.split('@')[0]}</p>
                          </div>
                        </div>

                        <div className="text-left flex-shrink-0">
                          {p.systemInfo ? (
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-black text-emerald-600">
                                {p.systemInfo.systemType === 'manager' ? (
                                  `מנהל משוייך לקבוצה [${p.systemInfo.affiliation_group || 'כללי'}]`
                                ) : (
                                  `${p.systemInfo.gender === 'male' ? 'משודך נמצא' : 'משודכת נמצאת'} במערכת`
                                )}
                              </p>
                              {p.systemInfo.systemType === 'match' && (
                                <p className="text-[9px] font-bold text-slate-500">
                                  שייך לקבוצה [{p.systemInfo.category || 'ללא'}]
                                  {p.systemInfo.is_viewer && ` | צופה בקבוצה [${p.systemInfo.category}]`}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-[10px] font-bold text-slate-400 italic">לא נמצא במערכת</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button 
                onClick={() => { setPreviewGroup(null); setParticipantsInfo([]); }}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                סגור תצוגה מקדימה
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Live View Modal (Chat Preview) */}
      <AnimatePresence>
        {showLiveView && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#efeae2] rounded-3xl shadow-2xl w-full max-w-lg h-[80vh] overflow-hidden flex flex-col relative"
            >
              {/* Chat Header */}
              <div className="p-4 bg-[#075e54] text-white flex items-center justify-between shadow-md z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                    {previewGroup?.icon ? (
                      <img src={previewGroup.icon} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Users size={20} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm truncate max-w-[200px]">{previewGroup?.name}</h3>
                    <p className="text-[10px] text-white/70">צפייה בלבד (ReadOnly)</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowLiveView(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                {previewMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl text-center shadow-sm">
                      <p className="text-slate-500 font-bold text-sm">אין הודעות אחרונות להצגה</p>
                    </div>
                  </div>
                ) : (
                  previewMessages.map((msg: any) => {
                    const sender = participantsCache[msg.from];
                    return (
                      <div key={msg.id} className={`flex gap-2 ${msg.from_me ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!msg.from_me && (
                          <div className="w-8 h-8 rounded-full bg-white flex-shrink-0 overflow-hidden border border-slate-200 mt-1 shadow-sm">
                            {sender?.profile_pic ? (
                              <img src={sender.profile_pic} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                <User size={16} className="text-slate-300" />
                              </div>
                            )}
                          </div>
                        )}
                        <div className={`flex flex-col ${msg.from_me ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] p-2.5 rounded-2xl shadow-sm relative ${
                            msg.from_me ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'
                          }`}>
                            {!msg.from_me && (
                              <p className="text-[10px] font-black text-emerald-600 mb-1 leading-none">{sender?.name || sender?.push_name || msg.from_name || msg.from.split('@')[0]}</p>
                            )}
                            {renderMessageContent(msg)}
                            <p className="text-[9px] text-slate-400 text-left mt-1 font-bold">
                              {new Date(msg.timestamp * 1000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Footer */}
              <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 text-center">
                <p className="text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                  <ShieldCheck size={14} />
                  מצב צפייה מאובטח - לא ניתן לשלוח הודעות
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
