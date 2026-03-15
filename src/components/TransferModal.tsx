import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, UserCheck, UserPlus, Search, Check, AlertCircle, ArrowLeftRight, Clock, User, UserCog } from 'lucide-react';
import { dataService } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { Match, User as UserType } from '../types';
import { toast } from 'react-hot-toast';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [allAdmins, setAllAdmins] = useState<UserType[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [sentTransfers, setSentTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Send state
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [selectedReceiverId, setSelectedReceiverId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [adminSearchTerm, setAdminSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      loadData();
    }
  }, [isOpen, user, activeTab]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (activeTab === 'send') {
        const [matchesRaw, adminsRaw, sentRaw] = await Promise.all([
          dataService.getMatches(undefined, user),
          dataService.getUsers(),
          dataService.getSentTransfersByMe(user.id)
        ]);
        
        const matches = matchesRaw || [];
        const admins = adminsRaw || [];
        const sent = sentRaw || [];

        // Filter matches to only show those created by me (or assigned to me) and have a name
        setMyMatches(matches.filter(m => m && m.name && m.created_by === user.id));
        // Filter admins to exclude self and ensure they have a name
        setAllAdmins(admins.filter(a => a && a.name && a.id !== user.id));
        setSentTransfers(sent);
      } else {
        const pending = await dataService.getPendingTransfersForMe(user.id);
        setPendingTransfers(pending || []);
      }
    } catch (err) {
      console.error('Failed to load transfer data:', err);
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTransfer = async () => {
    if (!selectedMatchId || !selectedReceiverId || !user) {
      toast.error('אנא בחר משודך ומנהל יעד');
      return;
    }

    try {
      await dataService.createTransferRequest(selectedMatchId, user.id, selectedReceiverId);
      toast.success('בקשת העברה נשלחה בהצלחה');
      setSelectedMatchId('');
      setSelectedReceiverId('');
      loadData();
    } catch (err) {
      toast.error('שגיאה בשליחת הבקשה');
    }
  };

  const handleApprove = async (transferId: string) => {
    try {
      await dataService.approveTransfer(transferId);
      toast.success('העברה אושרה בהצלחה');
      loadData();
    } catch (err) {
      toast.error('שגיאה באישור ההעברה');
    }
  };

  const handleReject = async (transferId: string) => {
    try {
      await dataService.rejectTransfer(transferId);
      toast.success('העברה נדחתה');
      loadData();
    } catch (err) {
      toast.error('שגיאה בדחיית ההעברה');
    }
  };

  const filteredMatches = (myMatches || []).filter(m => 
    m && m.name && (m.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const filteredAdmins = (allAdmins || []).filter(a => 
    a && a.name && (
      (a.name || '').toLowerCase().includes((adminSearchTerm || '').toLowerCase()) ||
      (a.username || '').toLowerCase().includes((adminSearchTerm || '').toLowerCase())
    )
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-luxury-blue/10 text-luxury-blue flex items-center justify-center">
              <ArrowLeftRight size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">ניהול העברות משודכים</h2>
              <p className="text-slate-500 font-medium text-sm">העברת כרטיסי משודכים בין מנהלים</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 bg-slate-50/50">
          <button 
            onClick={() => setActiveTab('send')}
            className={`px-6 py-4 font-bold text-sm transition-all relative ${
              activeTab === 'send' ? 'text-luxury-blue' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <Send size={18} />
              <span>שלח משודך</span>
            </div>
            {activeTab === 'send' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-luxury-blue rounded-t-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('receive')}
            className={`px-6 py-4 font-bold text-sm transition-all relative ${
              activeTab === 'receive' ? 'text-luxury-blue' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserCheck size={18} />
              <span>בקשות קבלה</span>
              {pendingTransfers.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
                  {pendingTransfers.length}
                </span>
              )}
            </div>
            {activeTab === 'receive' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-luxury-blue rounded-t-full" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'send' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Step 1: Select Candidate */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center">1</span>
                    בחר משודך להעברה
                  </h3>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text"
                      placeholder="חיפוש משודך..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10 pl-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-luxury-blue w-48"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredMatches.length > 0 ? (
                    filteredMatches.map(match => (
                      <button
                        key={match.id}
                        onClick={() => setSelectedMatchId(match.id)}
                        className={`p-3 rounded-2xl border-2 transition-all text-right flex items-center gap-3 ${
                          selectedMatchId === match.id 
                            ? 'border-luxury-blue bg-blue-50 shadow-md' 
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                          {match.image_url ? (
                            <img src={match.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <User size={20} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate">{match.name}</p>
                          <p className="text-xs text-slate-500">{match.type === 'male' ? 'בחור' : 'בחורה'} • {match.age} • {match.city}</p>
                        </div>
                        {selectedMatchId === match.id && (
                          <div className="w-6 h-6 rounded-full bg-luxury-blue text-white flex items-center justify-center">
                            <Check size={14} />
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 font-medium">לא נמצאו משודכים</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Select Receiver */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center">2</span>
                      בחר מנהל יעד
                    </h3>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text"
                        placeholder="חיפוש מנהל..."
                        value={adminSearchTerm}
                        onChange={(e) => setAdminSearchTerm(e.target.value)}
                        className="pr-10 pl-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-luxury-blue w-48"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredAdmins.map(admin => (
                      <button
                        key={admin.id}
                        onClick={() => setSelectedReceiverId(admin.id)}
                        className={`p-3 rounded-2xl border-2 transition-all text-right flex items-center gap-3 ${
                          selectedReceiverId === admin.id 
                            ? 'border-luxury-blue bg-blue-50 shadow-md' 
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                          <UserCog size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate">{admin.name}</p>
                          <p className="text-xs text-slate-500">{admin.role === 'super_admin' ? 'מנהל על' : admin.role === 'team_leader' ? 'ראש צוות' : 'מנהל'}</p>
                        </div>
                        {selectedReceiverId === admin.id && (
                          <div className="w-6 h-6 rounded-full bg-luxury-blue text-white flex items-center justify-center">
                            <Check size={14} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                  <div className="flex items-start gap-3 text-amber-600">
                    <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                    <p className="text-xs font-medium leading-relaxed">
                      העברת משודך דורשת אישור של המנהל המקבל. עד שההעברה תאושר, המשודך יישאר תחת אחריותך.
                    </p>
                  </div>
                  <button
                    onClick={handleSendTransfer}
                    disabled={!selectedMatchId || !selectedReceiverId || loading}
                    className="w-full py-4 bg-luxury-blue text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    <Send size={20} />
                    <span>שלח בקשת העברה</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900">בקשות העברה שהתקבלו</h3>
                <div className="px-4 py-1.5 bg-blue-50 text-luxury-blue rounded-full text-xs font-bold">
                  {pendingTransfers.length} בקשות ממתינות
                </div>
              </div>

              {pendingTransfers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingTransfers.map(transfer => (
                    <div key={transfer.id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden">
                          {transfer.candidate?.image_url ? (
                            <img src={transfer.candidate.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <User size={32} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">משודך להעברה</p>
                          <h4 className="text-lg font-black text-slate-900 truncate">{transfer.candidate?.name}</h4>
                          <p className="text-sm text-slate-500 font-medium">נשלח על ידי: <span className="text-luxury-blue">{transfer.sender?.name}</span></p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => handleApprove(transfer.id)}
                          className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                        >
                          <Check size={18} />
                          <span>אשר קבלה</span>
                        </button>
                        <button 
                          onClick={() => handleReject(transfer.id)}
                          className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                          <X size={18} />
                          <span>דחה</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 space-y-4">
                  <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto text-slate-300">
                    <UserCheck size={40} />
                  </div>
                  <div>
                    <p className="text-slate-500 font-bold text-lg">אין בקשות ממתינות</p>
                    <p className="text-slate-400 font-medium">כאשר מנהלים אחרים ישלחו אליך משודכים, הם יופיעו כאן.</p>
                  </div>
                </div>
              )}

              {/* Sent History (Optional but good) */}
              {sentTransfers.length > 0 && (
                <div className="pt-8 space-y-4">
                  <h3 className="text-lg font-black text-slate-800">היסטוריית בקשות ששלחת</h3>
                  <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">משודך</th>
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">נשלח אל</th>
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">תאריך</th>
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">סטטוס</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {sentTransfers.map(transfer => (
                          <tr key={transfer.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden">
                                  {transfer.candidate?.image_url && (
                                    <img 
                                      src={transfer.candidate.image_url} 
                                      alt="" 
                                      className="w-full h-full object-cover" 
                                      referrerPolicy="no-referrer" 
                                    />
                                  )}
                                </div>
                                <span className="font-bold text-slate-700">{transfer.candidate?.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-600">{transfer.receiver?.name}</td>
                            <td className="px-6 py-4 text-slate-400 text-sm">{new Date(transfer.created_at).toLocaleDateString('he-IL')}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                transfer.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                                transfer.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                'bg-amber-100 text-amber-600'
                              }`}>
                                {transfer.status === 'approved' ? 'אושר' : transfer.status === 'rejected' ? 'נדחה' : 'ממתין'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
