import React from 'react';
import { Trash2, Edit2, MessageSquare, Sparkles } from 'lucide-react';
import { Match } from '../types';

interface MatchCardActionRowProps {
  match: Match;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onChat: (match: Match) => void;
  onSuggest: (match: Match) => void;
}

export const MatchCardActionRow: React.FC<MatchCardActionRowProps> = ({ match, onDelete, onEdit, onChat, onSuggest }) => {
  return (
    <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
      <button onClick={() => onDelete(match.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="מחק">
        <Trash2 size={18} />
      </button>
      <button onClick={() => onEdit(match.id)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="ערוך">
        <Edit2 size={18} />
      </button>
      <button onClick={() => onChat(match)} className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="צ'אט">
        <MessageSquare size={18} />
      </button>
      <button onClick={() => onSuggest(match)} className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors" title="הצע שידוך">
        <Sparkles size={18} />
      </button>
    </div>
  );
};
