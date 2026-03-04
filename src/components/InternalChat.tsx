import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Smile, Paperclip, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';

const socket = io();

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  text: string;
  match_id?: number;
  sender_name: string;
  created_at: string;
}

interface InternalChatProps {
  otherUser: { id: number, name: string };
  onClose: () => void;
}

export const InternalChat: React.FC<InternalChatProps> = ({ otherUser, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/internal-messages/${otherUser.id}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    const handleNewMessage = (msg: Message) => {
      if (msg.sender_id === otherUser.id || msg.receiver_id === otherUser.id) {
        setMessages(prev => [...prev, msg]);
      }
    };

    socket.on('new_internal_message', handleNewMessage);
    socket.on('internal_message_sent', handleNewMessage);

    return () => {
      socket.off('new_internal_message', handleNewMessage);
      socket.off('internal_message_sent', handleNewMessage);
    };
  }, [otherUser.id]);

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !user) return;

    socket.emit('send_internal_message', {
      senderId: user.id,
      receiverId: otherUser.id,
      text: newMessage
    });

    setNewMessage('');
  };

  const suggestMatch = () => {
    // This would ideally open a match picker
    toast.info('בחר משודך להצעה (בקרוב)');
  };

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-4 left-4 w-80 h-96 bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col z-[110]"
    >
      <div className="p-4 border-b border-slate-50 bg-luxury-blue text-white rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <User size={16} />
          </div>
          <div>
            <p className="text-sm font-bold">{otherUser.name}</p>
            <p className="text-[10px] opacity-70">צ'אט פנימי</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-all">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-luxury-blue border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.sender_id === user?.id ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                msg.sender_id === user?.id 
                  ? 'bg-luxury-blue text-white rounded-br-none' 
                  : 'bg-white text-slate-900 rounded-bl-none border border-slate-100'
              }`}>
                {msg.text}
              </div>
              <span className="text-[9px] text-slate-400 mt-1 px-1">
                {new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white rounded-b-2xl">
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={suggestMatch}
            className="p-2 text-luxury-blue hover:bg-blue-50 rounded-xl transition-all"
            title="הצע משודך"
          >
            <Paperclip size={18} />
          </button>
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="הקלד הודעה..."
            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-luxury-blue outline-none"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2 bg-luxury-blue text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </motion.div>
  );
};
