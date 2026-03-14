import React from 'react';
import { Match, WhatsAppGroup } from '../types';
import { dataService } from '../services/dataService';
import { toast } from 'react-hot-toast';
import { Send, Edit, Trash2, History as HistoryIcon, MessageSquare, Paperclip, ImageIcon, FileText } from 'lucide-react';

interface MatchActionsProps {
  match: Match;
  whatsappGroups: WhatsAppGroup[];
  onPublish: (match: Match) => void;
  onNotes: (match: Match) => void;
  onHistory: (match: Match) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDesignedCard: (match: Match) => void;
}

export const MatchActions: React.FC<MatchActionsProps> = ({ match, whatsappGroups, onPublish, onNotes, onHistory, onEdit, onDelete, onDesignedCard }) => {
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
      toast.success('ההודעה נשלחה לוואטסאפ');
    } catch (err) {
      console.error('Error sending WhatsApp message:', err);
      toast.error('שגיאה בשליחת ההודעה לוואטסאפ');
    }
  };

  const sendMessageToInternalChat = async (match: Match) => {
    const chatId = '120363210658789236@g.us';
    const surveyMessage = `סקר חדש עבור: ${match.name}`;

    try {
      await dataService.sendInternalMessage({
        sender_id: '00000000-0000-0000-0000-000000000000',
        receiver_id: chatId,
        text: surveyMessage,
        match_id: match.id,
        match_name: match.name,
        match_type: match.type,
        match_age: match.age,
        match_city: match.city,
        sender_name: 'המערכת'
      });
      toast.success('הסקר נשלח לצ\'אט הפנימי');
    } catch (err) {
      console.error('Error sending internal message:', err);
      toast.error('שגיאה בשליחת הסקר לצ\'אט הפנימי');
    }
  };

  return (
    <div className="flex flex-col gap-1 mt-2">
      <div className="grid grid-cols-6 gap-1">
        <button onClick={() => sendWhatsAppToGroup(match)} className="bg-green-600 text-white p-2 rounded-lg flex items-center justify-center" title="פרסם לוואטסאפ"><Send size={16} /></button>
        <button onClick={() => sendMessageToInternalChat(match)} className="bg-green-500 text-white p-2 rounded-lg flex items-center justify-center" title="פרסם לצ'אט פנימי"><MessageSquare size={16} /></button>
        <button onClick={() => onNotes(match)} className="bg-slate-200 text-slate-700 p-2 rounded-lg flex items-center justify-center" title="הערות"><FileText size={16} /></button>
        <button onClick={() => onHistory(match)} className="bg-slate-200 text-slate-700 p-2 rounded-lg flex items-center justify-center" title="היסטוריה"><HistoryIcon size={16} /></button>
        <button onClick={() => onEdit(match.id)} className="bg-slate-200 text-slate-700 p-2 rounded-lg flex items-center justify-center" title="ערוך"><Edit size={16} /></button>
        <button onClick={() => onDelete(match.id)} className="bg-red-200 text-red-700 p-2 rounded-lg flex items-center justify-center" title="מחק"><Trash2 size={16} /></button>
        <button onClick={() => onDesignedCard(match)} className="bg-purple-200 text-purple-700 p-2 rounded-lg flex items-center justify-center" title="כרטיס מעוצב"><ImageIcon size={16} /></button>
      </div>
      <div className="grid grid-cols-4 gap-1">
        <button onClick={clearInternalMessages} className="bg-orange-200 text-orange-700 p-2 rounded-lg flex items-center justify-center text-[10px] font-bold" title="ניקוי הודעות">ניקוי הודעות</button>
        <button onClick={clearActivityLogs} className="bg-orange-200 text-orange-700 p-2 rounded-lg flex items-center justify-center text-[10px] font-bold" title="ניקוי פעולות">ניקוי פעולות</button>
        <button onClick={clearPublishLogs} className="bg-orange-200 text-orange-700 p-2 rounded-lg flex items-center justify-center text-[10px] font-bold" title="ניקוי פרסומים">ניקוי פרסומים</button>
        <button onClick={clearWhatsAppGroups} className="bg-orange-200 text-orange-700 p-2 rounded-lg flex items-center justify-center text-[10px] font-bold" title="ניקוי קבוצות">ניקוי קבוצות</button>
      </div>
    </div>
  );
};
