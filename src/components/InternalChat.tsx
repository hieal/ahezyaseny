import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Smile, Paperclip, User, Trash2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  match_id?: string;
  match_name?: string;
  match_type?: 'male' | 'female';
  match_age?: number;
  match_city?: string;
  sender_name: string;
  created_at: string;
}

interface InternalChatProps {
  otherUser: { id: string, name: string };
  onClose: () => void;
}

export const InternalChat: React.FC<InternalChatProps> = ({ otherUser, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [otherUserDetails, setOtherUserDetails] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOtherUser = async () => {
      try {
        const data = await dataService.getUserById(otherUser.id);
        setOtherUserDetails(data);
      } catch (err) {
        console.error('Failed to fetch other user details:', err);
      }
    };
    fetchOtherUser();
  }, [otherUser.id]);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const data = await dataService.getMatches();
        setMatches(data);
      } catch (e) {
        console.error('Failed to fetch matches for chat:', e);
      }
    };
    fetchMatches();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await dataService.getInternalMessages(otherUser.id);
        setMessages(data);
        await dataService.markMessagesAsRead(otherUser.id);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel('internal_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internal_messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Check if the message belongs to this conversation
          const isFromOther = newMsg.sender_id === otherUser.id && newMsg.receiver_id === user?.id;
          const isFromMe = newMsg.sender_id === user?.id && newMsg.receiver_id === otherUser.id;
          
          if (isFromOther || isFromMe) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            
            if (isFromOther) {
              dataService.markMessagesAsRead(otherUser.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [otherUser.id, user?.id]);

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e?: React.FormEvent, matchId?: string) => {
    e?.preventDefault();
    if (!newMessage.trim() && !matchId) return;

    let matchDetails = {};
    if (matchId) {
      const match = matches.find(m => m.id === matchId);
      if (match) {
        matchDetails = {
          match_id: match.id,
          match_name: match.name,
          match_type: match.type,
          match_age: match.age,
          match_city: match.city
        };
      }
    }

    const newMsg = {
      sender_id: user?.id,
      receiver_id: otherUser.id,
      text: newMessage || 'שלחתי לך הצעה למשודך',
      sender_name: user?.name || '',
      ...matchDetails
    };
    
    try {
      if (!newMsg.sender_id) throw new Error('Missing sender ID');
      const savedMsg = await dataService.sendInternalMessage(newMsg);
      // Real-time listener will add it, but we can add it optimistically or wait for listener
      // setMessages(prev => [...prev, savedMsg]); 
      setNewMessage('');
      setShowPicker(false);
    } catch (err: any) {
      console.error('Error in handleSend:', err);
      toast.error(err.message || 'שגיאה בשליחת ההודעה');
    }
  };

  const suggestMatch = () => {
    // This would ideally open a match picker
    toast('בחר משודך להצעה (בקרוב)', { icon: 'ℹ️' });
  };

  const [showEmojis, setShowEmojis] = useState(false);

  const emojis = ['😊', '😂', '❤️', '👍', '🙌', '🔥', '✨', '🙏', '🌹', '💍', '🏠', '📍', '😍', '😎', '🤔', '😢', '🎉', '🎁', '🎈', '⭐', '✅', '❌', '📞', '💌'];

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojis(false);
  };

  const isFemale = otherUserDetails?.gender === 'female';
  const themeColor = isFemale ? 'from-pink-600 to-pink-800' : 'from-luxury-blue to-blue-800';
  const bubbleColor = isFemale ? 'bg-pink-600' : 'bg-luxury-blue';
  const lightBg = isFemale ? 'bg-pink-50' : 'bg-blue-50';
  const textColor = isFemale ? 'text-pink-600' : 'text-luxury-blue';
  const ringColor = isFemale ? 'focus:ring-pink-500' : 'focus:ring-luxury-blue';

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-4 left-4 w-85 h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col z-[110] overflow-hidden"
    >
      <div className={`p-4 bg-gradient-to-r ${themeColor} text-white flex items-center justify-between shadow-lg`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30 overflow-hidden relative">
              {otherUserDetails?.avatar_url ? (
                <>
                  <img src={dataService.getPublicImageUrl(otherUserDetails.avatar_url)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  {otherUserDetails.avatar_url.includes('supabase.co') && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white p-0.5 rounded-full border border-white shadow-sm" title="תמונה מסונכרנת">
                      <CheckCircle size={8} />
                    </div>
                  )}
                </>
              ) : (
                <User size={20} />
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <p className="text-sm font-black leading-tight">{otherUser.name}</p>
            <p className="text-[10px] opacity-80 font-bold">שיחה בין המנהל/ת <span className="underline">{user?.name}</span> למנהל/ת <span className="underline">{otherUser.name}</span></p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className={`w-8 h-8 border-3 ${textColor} border-t-transparent rounded-full animate-spin`}></div>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.sender_id === user?.id ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm transition-all relative group ${
                msg.sender_id === user?.id 
                  ? `${bubbleColor} text-white rounded-br-none` 
                  : 'bg-white text-slate-900 rounded-bl-none border border-slate-100'
              }`}>
                <div className="font-bold text-[10px] mb-1 opacity-70">
                  {msg.sender_name}
                </div>
                {msg.match_id ? (
                  <div className="space-y-2">
                    <p className="font-black text-xs opacity-80 mb-1">הצעה למשודך:</p>
                    <div className={`p-3 rounded-xl border ${msg.sender_id === user?.id ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${msg.match_type === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-black">{msg.match_name}</p>
                          <p className="text-[10px] opacity-70 font-bold">{msg.match_age} שנים • {msg.match_city}</p>
                        </div>
                      </div>
                    </div>
                    <p className="font-medium">{msg.text}</p>
                  </div>
                ) : (
                  <p className="font-medium">{msg.text}</p>
                )}
                {msg.sender_id === user?.id && (
                  <button 
                    onClick={async () => {
                      if (!window.confirm('למחוק הודעה זו?')) return;
                      try {
                        setMessages(prev => prev.filter(m => m.id !== msg.id));
                        toast.success('הודעה נמחקה');
                      } catch (e) {
                        toast.error('שגיאה במחיקה');
                      }
                    }}
                    className="absolute -right-8 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1 px-1">
                <span className="text-[9px] text-slate-400 font-bold">
                  {new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.sender_id === user?.id && (
                  <span className="text-[9px] text-slate-300 font-black">נשלח</span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative">
        <AnimatePresence>
          {showEmojis && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="absolute bottom-full left-4 mb-2 bg-white border border-slate-100 shadow-2xl rounded-2xl p-3 grid grid-cols-6 gap-2 z-20"
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

        <AnimatePresence>
          {showPicker && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 z-20 max-h-64 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">בחר משודך להצעה</p>
                <button onClick={() => setShowPicker(false)}><X size={14} /></button>
              </div>
              <div className="space-y-2">
                {matches.filter(m => m.created_by === user?.id).map(m => (
                  <button 
                    key={m.id}
                    onClick={() => handleSend(undefined, m.id)}
                    className="w-full text-right p-2 hover:bg-slate-50 rounded-xl flex items-center gap-3 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${m.type === 'male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                      {m.name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-black">{m.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{m.age} שנים • {m.city}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button 
                type="button"
                onClick={() => setShowEmojis(!showEmojis)}
                className={`p-2 rounded-xl transition-all ${showEmojis ? `${lightBg} ${textColor}` : 'text-slate-400 hover:bg-slate-50'}`}
              >
                <Smile size={20} />
              </button>
              <button 
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className={`p-2 rounded-xl transition-all ${showPicker ? `${lightBg} ${textColor}` : 'text-slate-400 hover:bg-slate-50'}`}
                title="הצע משודך"
              >
                <Paperclip size={20} />
              </button>
            </div>
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="הקלד הודעה..."
              className={`flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold focus:ring-2 ${ringColor} outline-none transition-all`}
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className={`p-2.5 ${bubbleColor} text-white rounded-2xl hover:opacity-90 transition-all disabled:opacity-50 shadow-md active:scale-95`}
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
