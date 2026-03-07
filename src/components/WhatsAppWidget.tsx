import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Image as ImageIcon, MessageSquare, Check, Clock, User, Share2, MoreVertical, Phone, Plus, Edit, Trash2, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import { Match } from '../types';

interface Message {
  id: number | string;
  text: string;
  sender: string;
  timestamp: string;
  type: 'user' | 'system' | 'me' | 'other';
  image?: string;
}

interface WhatsAppWidgetProps {
  groupId?: string;
  groupName?: string;
  groupIdNum?: number;
  groupLink?: string;
  currentMatch?: Match | null;
  matchMessage?: string;
  matchImage?: string | null;
  openingMessage?: string;
  isOpeningSent?: boolean;
  initialSentMethod?: 'auto' | 'manual' | null;
  lastInitialSent?: string;
  senderName?: string;
  mode?: 'full' | 'chat-only';
  onClose?: () => void;
  onUpdateOpening?: (newTemplate: string) => void;
  onRefreshStatus?: () => void;
}

export function WhatsAppWidget({ 
  groupId = "120363210658789236@g.us", 
  groupName = "קבוצה כללית",
  groupIdNum,
  groupLink,
  currentMatch, 
  matchMessage,
  matchImage,
  openingMessage,
  isOpeningSent,
  initialSentMethod,
  lastInitialSent,
  senderName,
  mode = 'full',
  onClose,
  onUpdateOpening,
  onRefreshStatus
}: WhatsAppWidgetProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [includeText, setIncludeText] = useState(true);
  const [includeImage, setIncludeImage] = useState(true);
  const [includeOpening, setIncludeOpening] = useState(!isOpeningSent);
  const [showPreview, setShowPreview] = useState(true);
  const [activeTab, setActiveTab] = useState<'status' | 'content' | 'chat'>(mode === 'chat-only' ? 'chat' : 'status');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const quickReplies = [
    "ההזמנה מוכנה",
    "נציג יחזור אליך",
    "בוקר טוב לכולם!",
    "כרטיס חדש במערכת",
    "המשך יום נעים"
  ];

  const fetchMessages = async () => {
    if (!groupId || groupId === "ניהול כללי") {
      setMessages([]);
      return;
    }
    
    setIsChatLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/messages/${encodeURIComponent(groupId)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    
    if (!groupId || groupId === "ניהול כללי") return;

    const socket = io();
    
    socket.emit("join_group", groupId);

    socket.on("new_message", (msg) => {
      if (msg.chatId === groupId || msg.chatId.split('@')[0] === groupId.split('@')[0]) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [groupId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string, matchId?: number, options?: { isOpeningOnly?: boolean }) => {
    if (!text.trim() && !matchId) return;
    
    setLoading(true);
    try {
      const payload = {
        groupId,
        text,
        matchId,
        includeImage: options?.isOpeningOnly ? false : includeImage,
        matchImage: options?.isOpeningOnly ? null : matchImage,
        includeOpening: options?.isOpeningOnly ? false : includeOpening,
        senderName // Pass the custom sender name if provided
      };

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success('ההודעה נשלחה בהצלחה');
        setInputText('');
        fetchMessages();
      } else {
        toast.error('שגיאה בשליחת ההודעה');
      }
    } catch (err) {
      toast.error('שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  const sendOpeningOnly = async () => {
    if (!openingMessage) {
      toast.error('לא הוגדרה הודעת פתיחה');
      return;
    }

    if (isOpeningSent) {
      const lastTime = lastInitialSent ? new Date(lastInitialSent).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '';
      const confirm = window.confirm(`הודעה זו נשלחה כבר היום בקבוצה בשעה ${lastTime}. האם לשלוח שוב?`);
      if (!confirm) return;
    }

    setActiveTab('chat');
    await handleSend(openingMessage, undefined, { isOpeningOnly: true });
    if (!isOpeningSent) {
      markAsSentManually();
    }
  };

  const handleDeleteMessage = async (messageId: string | number) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את ההודעה?')) return;

    try {
      const res = await fetch(`/api/whatsapp/messages/${messageId}?groupId=${groupId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        toast.success('ההודעה נמחקה');
      } else {
        toast.error('שגיאה במחיקת ההודעה');
      }
    } catch (err) {
      toast.error('שגיאה בתקשורת עם השרת');
    }
  };

  const markAsSentManually = async () => {
    if (!groupIdNum) return;
    try {
      const res = await fetch('/api/whatsapp/initial-sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: groupIdNum })
      });
      if (res.ok) {
        toast.success('הסטטוס עודכן ידנית');
        onRefreshStatus?.();
      }
    } catch (err) {
      toast.error('שגיאה בעדכון הסטטוס');
    }
  };

  const publishMatch = async () => {
    if (!currentMatch) {
      toast.error('לא נבחר משודך לפרסום');
      return;
    }
    
    // Duplicate confirmation inside widget
    if (currentMatch.last_published_at) {
      const lastDate = new Date(currentMatch.last_published_at).toLocaleDateString('he-IL');
      const lastTime = new Date(currentMatch.last_published_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      
      const confirm = window.confirm(`משודך זה פורסם בתאריך ${lastDate} בשעה ${lastTime}. האם לפרסם שוב?`);
      if (!confirm) return;
    }

    const text = includeText ? (matchMessage || `*כרטיס חדש במערכת:*
שם: ${currentMatch.name}
גיל: ${currentMatch.age}
עיר: ${currentMatch.city}
על עצמי: ${currentMatch.about}`) : "";
    
    if (!text && !includeImage) {
      toast.error('יש לבחור לפחות תוכן אחד לפרסום (טקסט או תמונה)');
      return;
    }

    setActiveTab('chat');
    await handleSend(text, currentMatch.id);
    
    // Refresh parent status
    onRefreshStatus?.();
    
    // Don't close automatically, stay in chat as requested
    toast.success('הפרסום נשלח לצ\'אט החי');
  };

  const emojis = ['😊', '😂', '❤️', '👍', '🙌', '🔥', '✨', '🙏', '🌹', '💍', '🏠', '📍', '😍', '😎', '🤔', '😢', '🎉', '🎁', '🎈', '⭐', '✅', '❌', '📞', '💌'];

  const addEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojis(false);
  };

  const [showEmojis, setShowEmojis] = useState(false);

  return (
    <div className="flex flex-col h-full bg-[#E5DDD5] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 relative">
      {/* Header */}
      <div className="bg-[#075E54] p-4 flex items-center justify-between text-white z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Share2 size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm">{groupName}</h3>
            <p className="text-[10px] opacity-80">מחובר כעת • {groupId ? 'API פעיל' : 'מזהה קבוצה חסר'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchMessages} className="p-1 hover:bg-white/10 rounded-lg opacity-80">
            <Clock size={18} />
          </button>
          <Phone size={18} className="opacity-80" />
          <MoreVertical size={18} className="opacity-80" />
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
              <Check size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Main View controlled by buttons */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
        {/* Navigation Buttons */}
        {mode === 'full' && (
          <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-center gap-2">
            <button 
              onClick={() => setActiveTab('status')}
              className={`flex-1 max-w-[150px] py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'status' ? 'bg-[#075E54] text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Clock size={16} />
              הודעות פתיחה
            </button>
            <button 
              onClick={() => setActiveTab('content')}
              className={`flex-1 max-w-[150px] py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'content' ? 'bg-[#075E54] text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <MessageSquare size={16} />
              בחירת תוכן
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 max-w-[150px] py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'chat' ? 'bg-[#075E54] text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Send size={16} />
              צ'אט חי
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#E5DDD5]">
          {activeTab === 'status' && (
            <div className="p-6 space-y-6 bg-white min-h-full">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-[#075E54] uppercase tracking-wider flex items-center gap-2">
                  <Clock size={16} />
                  הודעת פתיחה וסטטוס
                </h4>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500">הודעה יומית</p>
                  {isOpeningSent ? (
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Check size={10} /> פורסם
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                      טרם פורסם
                    </span>
                  )}
                </div>

                {isOpeningSent && lastInitialSent && (
                  <p className="text-[10px] text-slate-500">
                    שלחת היום הודעה בשעה {new Date(lastInitialSent).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} לקבוצה {groupName}
                  </p>
                )}
                {!isOpeningSent && (
                  <p className="text-[10px] text-slate-500">
                    ההודעה תשלח לקבוצה {groupName}
                  </p>
                )}

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                  <textarea 
                    className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-600 italic leading-relaxed resize-none"
                    rows={6}
                    value={openingMessage || ""}
                    onChange={(e) => onUpdateOpening?.(e.target.value)}
                    placeholder="לא הוגדרה הודעת פתיחה"
                  />
                  <div className="absolute bottom-2 left-2">
                    <button 
                      onClick={sendOpeningOnly}
                      disabled={loading}
                      className={`text-[10px] px-4 py-1.5 rounded-full font-bold transition-all flex items-center gap-1 shadow-sm ${
                        !openingMessage ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-amber-600 text-white hover:bg-amber-700'
                      }`}
                    >
                      <Send size={12} /> שלח עכשיו
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-[#075E54] transition-all">
                    <div>
                      <p className="text-sm font-bold text-slate-800">סימון ידני</p>
                      <p className="text-[10px] text-slate-500">{isOpeningSent ? 'פורסם ידנית' : 'לא פורסם ידנית'}</p>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={isOpeningSent}
                        onChange={(e) => {
                          if (e.target.checked) {
                            markAsSentManually();
                          } else {
                            // If they uncheck, we might need a way to unmark it, but for now just show toast
                            toast.error('לא ניתן לבטל סימון ידני כרגע');
                          }
                        }}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#075E54]"></div>
                    </div>
                  </label>
                  
                  {lastInitialSent && (
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                      <Clock size={16} className="text-blue-500" />
                      <div>
                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">פרסום אחרון</p>
                        <p className="text-xs text-blue-900">{new Date(lastInitialSent).toLocaleDateString('he-IL')} בשעה {new Date(lastInitialSent).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="p-6 space-y-6 bg-white min-h-full">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-[#075E54] uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare size={16} />
                  בחירת תוכן לפרסום
                </h4>
                {currentMatch?.last_published_at && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                    <Clock size={12} />
                    <span className="text-[10px] font-bold">פורסם: {new Date(currentMatch.last_published_at).toLocaleDateString('he-IL')}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500">טקסט הכרטיס</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={includeText} 
                      onChange={(e) => setIncludeText(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#075E54] focus:ring-[#075E54]" 
                    />
                    <span className="text-[10px] font-bold text-slate-600">כלול</span>
                  </label>
                </div>
                <div className={`p-4 rounded-2xl shadow-sm border transition-all ${includeText ? 'bg-[#DCF8C6] border-[#c5e1af]' : 'bg-slate-50 border-slate-200 opacity-50'}`}>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {matchMessage}
                  </p>
                </div>
              </div>

              {matchImage && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500">תמונה מעוצבת</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={includeImage} 
                        onChange={(e) => setIncludeImage(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#25D366] focus:ring-[#25D366]" 
                      />
                      <span className="text-[10px] font-bold text-slate-600">כלול</span>
                    </label>
                  </div>
                  <div className="rounded-2xl overflow-hidden border-4 border-white shadow-lg relative group max-w-sm mx-auto">
                    <img src={matchImage} alt="Designed Card" className="w-full h-auto" />
                    {currentMatch && (
                      <button 
                        onClick={() => navigate(`/matches/edit/${currentMatch.id}`)}
                        className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md text-[#075E54] hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Edit size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-6">
                <button 
                  onClick={publishMatch}
                  disabled={loading}
                  className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#128C7E] transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95"
                >
                  {loading ? <Clock className="animate-spin" /> : <Send size={24} />}
                  אשר ופרסם לקבוצה
                </button>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="h-full flex flex-col relative">
              {isChatLoading && messages.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00A884]"></div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {messages.length === 0 && !isChatLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                    <MessageSquare size={40} className="opacity-20" />
                    <p className="text-xs font-medium">אין הודעות להצגה בקבוצה זו</p>
                    <p className="text-[10px] opacity-60">הודעות חדשות יופיעו כאן בזמן אמת</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.type === 'me' ? 'justify-end' : 'justify-start'} group/msg`}>
                    <div className={`max-w-[85%] p-2 rounded-lg text-xs shadow-sm relative ${
                      msg.type === 'me' ? 'bg-[#DCF8C6] rounded-tr-none' : 
                      msg.type === 'system' ? 'bg-blue-50 text-blue-800 mx-auto text-center text-[10px]' :
                      'bg-white rounded-tl-none'
                    }`}>
                      {msg.sender && msg.type !== 'system' && (
                        <p className="font-bold text-[10px] text-[#075E54] mb-0.5">{msg.sender}</p>
                      )}
                      
                      {msg.type === 'me' && (
                        <button 
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="absolute -right-8 top-0 p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover/msg:opacity-100 transition-opacity"
                          title="מחק הודעה"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      {msg.image && (
                        <img src={msg.image} className="rounded-lg mb-1 max-w-full h-auto" />
                      )}
                      <p className="whitespace-pre-wrap leading-tight">{msg.text}</p>
                      <p className="text-[8px] text-slate-400 text-left mt-0.5">
                        {new Date(msg.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 bg-[#F0F2F5] flex gap-2 relative">
                <AnimatePresence>
                  {showEmojis && (
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      className="absolute bottom-full right-4 mb-2 bg-white border border-slate-100 shadow-2xl rounded-2xl p-3 grid grid-cols-6 gap-2 z-20"
                    >
                      {emojis.map(e => (
                        <button 
                          key={e} 
                          onClick={() => addEmoji(e)}
                          className="text-xl hover:scale-125 transition-transform p-1"
                        >
                          {e}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <button 
                  type="button"
                  onClick={() => setShowEmojis(!showEmojis)}
                  className={`p-2 rounded-full transition-all ${showEmojis ? 'bg-[#00A884] text-white' : 'text-slate-500 hover:bg-white'}`}
                >
                  <Smile size={20} />
                </button>
                <input 
                  type="text" 
                  className="flex-1 bg-white rounded-full px-4 py-2 text-sm border-none focus:ring-0" 
                  placeholder="הקלד הודעה..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend(inputText)}
                />
                <button 
                  onClick={() => handleSend(inputText)}
                  disabled={loading || !inputText.trim()}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transition-all ${
                    inputText.trim() ? 'bg-[#00A884] scale-100' : 'bg-slate-300 scale-90'
                  }`}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
