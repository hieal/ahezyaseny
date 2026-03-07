import React from 'react';
import { Match } from '../types';
import { User, MapPin, Calendar, Heart, Send, Edit, Trash2, Briefcase, GraduationCap, Info, Eye, Sparkles, Database, AlertTriangle, History as HistoryIcon, MessageSquare, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

interface MatchCardProps {
   match: Match;
   onPublish?: (match: Match) => void;
   onView?: (match: Match) => void;
   onEdit?: (id: number) => void;
   onDelete?: (id: number) => void;
   onHistory?: (match: Match) => void;
   onImageClick?: (match: Match) => void;
   onQuickUpdate?: (id: number, updates: Partial<Match>) => void;
   onSuggest?: (match: Match) => void;
   showCreator?: boolean;
   minimal?: boolean;
   selected?: boolean;
   onSelect?: (id: number, selected: boolean) => void;
 }

export default function MatchCard({ match, onPublish, onView, onEdit, onDelete, onHistory, onImageClick, onQuickUpdate, onSuggest, showCreator, minimal, selected, onSelect }: MatchCardProps) {
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';
  const [isEditingGender, setIsEditingGender] = React.useState(false);
  const [isEditingPhone, setIsEditingPhone] = React.useState(false);
  const [tempPhone, setTempPhone] = React.useState(match.phone || '');

  const getMissingFields = (m: Match) => {
    const missing = [];
    if (!m.about || m.about.length < 5) missing.push('על עצמי');
    if (!m.looking_for || m.looking_for.length < 5) missing.push('מה מחפש');
    if (!m.religious_level) missing.push('מגזר');
    if (!m.occupation) missing.push('עיסוק');
    if (!m.phone) missing.push('טלפון');
    if (!m.image_url) missing.push('תמונה');
    return missing;
  };

  const missingFields = getMissingFields(match);
  const isCsvMissing = match.creation_source === 'csv' && missingFields.length > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card flex flex-col h-full hover:shadow-md transition-all group border-slate-100 relative ${selected ? 'ring-2 ring-luxury-blue bg-blue-50/30' : ''} ${isCsvMissing ? 'border-red-200' : ''}`}
    >
      {isCsvMissing && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-[10px] font-bold py-1 px-3 flex items-center justify-center gap-2 z-20 animate-pulse">
          <AlertTriangle size={12} />
          <span>חסרים פרטים: {missingFields.join(', ')}</span>
        </div>
      )}
      {onSelect && (
        <div className="absolute top-4 right-4 z-10">
          <input 
            type="checkbox" 
            checked={selected} 
            onChange={(e) => onSelect(match.id, e.target.checked)}
            className="w-6 h-6 rounded-lg border-2 border-slate-300 text-luxury-blue focus:ring-luxury-blue cursor-pointer transition-all"
          />
        </div>
      )}
      {match.image_url && !minimal && (
        <div 
          className="relative h-48 w-full overflow-hidden cursor-pointer"
          onClick={() => onImageClick?.(match)}
        >
          <img 
            src={match.image_url} 
            alt={match.name} 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform group-hover:scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
             <Edit className="text-white" size={24} />
          </div>
        </div>
      )}
      {!match.image_url && !minimal && (
        <div 
          className={`relative h-48 w-full overflow-hidden cursor-pointer flex items-center justify-center ${
            match.type === 'male' ? 'bg-blue-50' : 'bg-pink-50'
          }`}
          onClick={() => onImageClick?.(match)}
        >
          <div className="text-center space-y-2">
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
              match.type === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
            }`}>
              {match.type === 'male' ? <User size={32} /> : <Heart size={32} fill="currentColor" />}
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">לחץ להוספת תמונה</p>
          </div>
          <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors" />
        </div>
      )}
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {showCreator && match.creator_name && (
              <div className="absolute top-2 left-2 bg-luxury-blue/90 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg z-30 border border-white/20">
                מנהל: {match.creator_name}
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-text-main group-hover:text-luxury-blue transition-colors">{match.name}</h3>
            <div className="flex items-center gap-2 text-xs font-semibold mt-1">
              <div className="relative">
                <button 
                  onClick={() => !isViewer && setIsEditingGender(!isEditingGender)}
                  disabled={isViewer}
                  className={`px-2 py-0.5 rounded-full transition-all ${!isViewer ? 'hover:ring-2 hover:ring-luxury-blue/30' : 'cursor-default'} ${
                    match.type === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                  }`}
                >
                  {match.type === 'male' ? 'משודך' : 'משודכת'}
                </button>
                <AnimatePresence>
                  {isEditingGender && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute top-full right-0 mt-1 bg-white border border-slate-100 shadow-xl rounded-xl p-2 z-50 flex flex-col gap-1 min-w-[100px]"
                    >
                      <button 
                        onClick={() => {
                          onQuickUpdate?.(match.id, { type: 'male' });
                          setIsEditingGender(false);
                        }}
                        className="text-right px-3 py-1.5 hover:bg-blue-50 text-blue-700 rounded-lg text-xs font-bold"
                      >
                        משודך (זכר)
                      </button>
                      <button 
                        onClick={() => {
                          onQuickUpdate?.(match.id, { type: 'female' });
                          setIsEditingGender(false);
                        }}
                        className="text-right px-3 py-1.5 hover:bg-pink-50 text-pink-700 rounded-lg text-xs font-bold"
                      >
                        משודכת (נקבה)
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <span className="text-text-secondary">{match.age} שנים</span>
              {match.creation_source && (
                <span className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  match.creation_source === 'manual' ? 'bg-slate-100 text-slate-600' :
                  match.creation_source === 'ai' ? 'bg-purple-100 text-purple-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {match.creation_source === 'manual' ? <User size={10} /> : 
                   match.creation_source === 'ai' ? <Sparkles size={10} /> : 
                   <Database size={10} />}
                  {match.creation_source === 'manual' ? 'הקלדה ידנית' : 
                   match.creation_source === 'ai' ? 'אוטומטי' : 
                   'העלאת קובץ'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(match.id);
                }} 
                disabled={isViewer}
                className="p-2 text-slate-400 hover:text-luxury-blue hover:bg-slate-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="ערוך כרטיס"
              >
                <Edit size={18} />
              </button>
            )}
            {onDelete && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(match.id);
                }} 
                disabled={isViewer}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="מחק כרטיס"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-6 flex-1">
        <InfoItem icon={<MapPin size={14} />} label="עיר" value={match.city} isMissing={match.creation_source === 'csv' && !match.city} />
        {!minimal && (
          <>
            <InfoItem icon={<GraduationCap size={14} />} label="מגזר" value={match.religious_level} isMissing={match.creation_source === 'csv' && !match.religious_level} />
            <InfoItem icon={<Briefcase size={14} />} label="עיסוק" value={match.occupation} isMissing={match.creation_source === 'csv' && !match.occupation} />
            <InfoItem icon={<Calendar size={14} />} label="פרסום" value={match.last_published_at ? new Date(match.last_published_at).toLocaleDateString('he-IL') : 'טרם'} />
          </>
        )}
      </div>

      {(!minimal && (match.about || match.creation_source === 'csv')) && (
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary mb-1.5">
            <Info size={12} />
            <span>קצת עליי</span>
          </div>
          <p className={`text-sm text-text-main line-clamp-2 leading-relaxed p-3 rounded-xl border ${
            match.creation_source === 'csv' && (!match.about || match.about.length < 5) 
              ? 'bg-red-50 border-red-200 text-red-700' 
              : 'bg-slate-50 border-slate-100'
          }`}>
            {match.about || 'חסר תיאור...'}
          </p>
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-slate-50 flex items-center gap-2">
        {onView && (
          <div className="flex gap-1 flex-1">
            <button 
              onClick={() => onView(match)}
              className="btn-secondary flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2"
              title="צפה בפרטים מלאים"
            >
              <Eye size={16} />
            </button>
            {onHistory && (
              <button 
                onClick={() => onHistory(match)}
                className="btn-secondary px-3 py-2.5 text-sm font-bold flex items-center justify-center"
                title="היסטוריית פרסומים"
              >
                <HistoryIcon size={16} />
              </button>
            )}
          </div>
        )}
        {onPublish && (
          <div className="flex flex-[2] gap-1 items-center">
            <button 
              onClick={() => onPublish(match)}
              disabled={isViewer}
              className="btn-whatsapp flex-1 py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              פרסם
            </button>
            {onSuggest && (
              <button 
                onClick={() => onSuggest(match)}
                disabled={isViewer}
                className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all flex items-center justify-center disabled:opacity-50"
                title="הצע בצ'אט למנהל אחר"
              >
                <Paperclip size={18} />
              </button>
            )}
            {match.phone && (
              <a 
                href={`https://wa.me/${match.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all flex items-center justify-center"
                title="וואטסאפ של המשודך"
              >
                <MessageSquare size={18} />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  </motion.div>
  );
}

function InfoItem({ icon, label, value, isMissing }: { icon: React.ReactNode, label: string, value: string | number | null, isMissing?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${isMissing ? 'text-red-500' : 'text-text-secondary'}`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-sm font-bold truncate ${isMissing ? 'text-red-600 italic' : 'text-text-main'}`}>
        {value || (isMissing ? 'חסר' : '---')}
      </div>
    </div>
  );
}
