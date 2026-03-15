import React from 'react';
import { Match, WhatsAppGroup } from '../types';
import { dataService } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Send, Edit, Trash2, History as HistoryIcon, MessageSquare, Paperclip, ImageIcon, FileText, MessageCircle } from 'lucide-react';

interface MatchActionsProps {
  match: Match;
  whatsappGroups: WhatsAppGroup[];
  onPublish: (match: Match) => void;
  onNotes: (match: Match) => void;
  onHistory: (match: Match) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDesignedCard: (match: Match) => void;
  onOpenChat: (userId: string, initialMessage?: string) => void;
  isViewer?: boolean;
}

export const MatchActions: React.FC<MatchActionsProps> = ({ match, whatsappGroups, onPublish, onNotes, onHistory, onEdit, onDelete, onDesignedCard, onOpenChat, isViewer }) => {
  const { user } = useAuth();
  
  const handleViewerClick = (e: React.MouseEvent) => {
    if (isViewer) {
      e.preventDefault();
      e.stopPropagation();
      toast.error('לא ניתן לבצע שינויים, את/ה במצב צפייה בכרטיסים של מנהלים אחרים', {
        position: 'top-center',
        duration: 4000,
        style: {
          background: '#fee2e2',
          color: '#991b1b',
          fontWeight: 'bold',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #f87171'
        }
      });
      return true;
    }
    return false;
  };

  const clearInternalMessages = async () => {
    if (!window.confirm('האם למחוק את כל הודעות הצ\'אט הפנימיות?')) return;
    await dataService.clearInternalMessages();
    toast.success('הודעות צ\'אט פנימיות נוקו');
  };

  const clearActivityLogs = async () => {
    if (!window.confirm('האם למחוק את כל מעקב הפעולות?')) return;
    await dataService.clearActivityLogs();
    toast.success('מעקב פעולות נוקה');
  };

  const clearPublishLogs = async () => {
    if (!window.confirm('האם למחוק את כל היסטוריית הפרסומים?')) return;
    await dataService.clearPublishLogs();
    toast.success('היסטוריית פרסומים נוקתה');
  };

  const clearWhatsAppGroups = async () => {
    if (!window.confirm('האם למחוק את כל קבוצות הוואטסאפ?')) return;
    await dataService.clearWhatsAppGroups();
    toast.success('קבוצות וואטסאפ נוקו');
  };

  const sendWhatsAppToGroup = async (match: Match) => {
    const group = whatsappGroups.find(g => g.category === match.creator_category);
    if (!group || !group.whapi_id) {
      toast.error('לא הוגדר WHAPI ID לקבוצה זו');
      return;
    }

    const message = `סקר חדש עבור: ${match.name}`;

    try {
      await dataService.sendWhatsAppMessage(group.whapi_id, message);
      
      // Record publish
      if (user) {
        await dataService.recordPublish(
          match.id,
          group.name,
          user.id,
          user.full_name || 'מנהל',
          group.id
        );
      }
      
      toast.success('ההודעה נשלחה לוואטסאפ');
    } catch (err) {
      console.error('Error sending WhatsApp message:', err);
      toast.error('שגיאה בשליחת ההודעה לוואטסאפ');
    }
  };

  const sendMessageToInternalChat = async (match: Match) => {
    const chatId = '120363210658789236@g.us';
    const surveyMessage = `סקר חדש עבור: ${match.name} (סוג: ${match.type}, גיל: ${match.age}, עיר: ${match.city})`;

    try {
      await dataService.sendInternalMessage({
        receiver_id: chatId,
        content: surveyMessage,
        sender_id: 'system',
        sender_name: 'מערכת'
      });
      toast.success('הסקר נשלח לצ\'אט הפנימי');
    } catch (err) {
      console.error('Error sending internal message:', err);
      toast.error('שגיאה בשליחת הסקר לצ\'אט הפנימי');
    }
  };

  const sendMessageToManager = async (match: Match) => {
    if (!match.created_by) {
      toast.error('לא נמצא מנהל לכרטיס זה');
      return;
    }

    const message = `אני פונה אליך בקשר לכרטיס של ${match.name}`;

    try {
      await dataService.sendInternalMessage({
        receiver_id: match.created_by,
        content: message,
        sender_id: user?.id || 'unknown',
        sender_name: user?.name || 'מנהל'
      });
      toast.success('ההודעה נשלחה למנהל');
      onOpenChat(match.created_by, message);
    } catch (err) {
      console.error('Error sending internal message to manager:', err);
      toast.error('שגיאה בשליחת ההודעה למנהל');
    }
  };

  return (
    <div className="flex flex-col gap-1 mt-2">
      <div className="grid grid-cols-8 gap-1">
        <button onClick={(e) => {
          if (handleViewerClick(e)) return;
          if (match.is_available === false) {
            toast.error('כרטיס זה סומן כלא פנוי לפירסום יש לשנות את זה בהערות על מנת לפרסם');
            return;
          }
          onPublish(match);
        }} className="bg-green-600 text-white p-2 rounded-lg flex items-center justify-center" title="פרסם לוואטסאפ"><Send size={16} /></button>
        <button onClick={(e) => {
          if (handleViewerClick(e)) return;
          sendMessageToInternalChat(match);
        }} className="bg-green-500 text-white p-2 rounded-lg flex items-center justify-center" title="פרסם לצ'אט פנימי"><MessageSquare size={16} /></button>
        <button onClick={(e) => {
          if (handleViewerClick(e)) return;
          onNotes(match);
        }} className="bg-slate-200 text-slate-700 p-2 rounded-lg flex items-center justify-center" title="הערות"><FileText size={16} /></button>
        <button onClick={(e) => {
          if (handleViewerClick(e)) return;
          onHistory(match);
        }} className="bg-slate-200 text-slate-700 p-2 rounded-lg flex items-center justify-center" title="היסטוריה"><HistoryIcon size={16} /></button>
        <button onClick={(e) => {
          if (handleViewerClick(e)) return;
          onEdit(match.id);
        }} className="bg-slate-200 text-slate-700 p-2 rounded-lg flex items-center justify-center" title="ערוך"><Edit size={16} /></button>
        <button onClick={(e) => {
          if (handleViewerClick(e)) return;
          onDelete(match.id);
        }} className="bg-red-200 text-red-700 p-2 rounded-lg flex items-center justify-center" title="מחק"><Trash2 size={16} /></button>
        <button onClick={() => onDesignedCard(match)} className="bg-purple-200 text-purple-700 p-2 rounded-lg flex items-center justify-center" title="כרטיס מעוצב"><ImageIcon size={16} /></button>
        <button onClick={(e) => {
          sendMessageToManager(match);
        }} className="bg-blue-500 text-white p-2 rounded-lg flex items-center justify-center" title="שליחת הודעה למנהל"><MessageCircle size={16} /></button>
      </div>
      {!isViewer && (
        <div className="grid grid-cols-4 gap-1">
          <button onClick={clearInternalMessages} className="bg-orange-200 text-orange-700 p-2 rounded-lg flex items-center justify-center text-[10px] font-bold" title="ניקוי הודעות">ניקוי הודעות</button>
          <button onClick={clearActivityLogs} className="bg-orange-200 text-orange-700 p-2 rounded-lg flex items-center justify-center text-[10px] font-bold" title="ניקוי פעולות">ניקוי פעולות</button>
          <button onClick={clearPublishLogs} className="bg-orange-200 text-orange-700 p-2 rounded-lg flex items-center justify-center text-[10px] font-bold" title="ניקוי פרסומים">ניקוי פרסומים</button>
          <button onClick={clearWhatsAppGroups} className="bg-orange-200 text-orange-700 p-2 rounded-lg flex items-center justify-center text-[10px] font-bold" title="ניקוי קבוצות">ניקוי קבוצות</button>
        </div>
      )}
    </div>
  );
};
