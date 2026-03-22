import React from 'react';
import { Match, WhatsAppGroup, ImagePosition } from '../types';
import { User, MapPin, Calendar, Heart, Send, Edit, Trash2, Briefcase, GraduationCap, Info, Eye, Sparkles, Database, AlertTriangle, History as HistoryIcon, MessageSquare, Paperclip, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Save, CheckCircle, Check, X, Users, Image as ImageIcon, Move, TrendingUp, Shield, RotateCcw, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useActionDisabled } from '../hooks/useActionDisabled';
import { dataService } from '../services/dataService';
import { toast } from 'react-hot-toast';
import { MatchCardActionRow } from './MatchCardActionRow';

interface MatchCardProps {
   match: Match;
   allGroups?: WhatsAppGroup[];
   onPublish?: (match: Match) => void;
   onView?: (match: Match) => void;
   onEdit?: (id: string) => void;
   onDelete?: (id: string) => void;
   onHistory?: (match: Match) => void;
   onImageClick?: (match: Match) => void;
   onQuickUpdate?: (id: string, updates: Partial<Match>) => void;
   onSuggest?: (match: Match) => void;
   onChat?: (match: Match) => void;
   onNotes?: (match: Match) => void;
   onDesignedCard?: (match: Match) => void;
   onNext?: () => void;
   onPrev?: () => void;
   showCreator?: boolean;
   minimal?: boolean;
   selected?: boolean;
   onSelect?: (id: string, selected: boolean) => void;
   isViewer?: boolean;
   size?: 'small' | 'medium' | 'large';
   viewMode?: 'standard' | 'whatsapp' | 'designed';
 }

export default function MatchCard({ match, allGroups: allGroupsProp, onPublish, onView, onEdit, onDelete, onHistory, onImageClick, onQuickUpdate, onSuggest, onChat, onNotes, onDesignedCard, onNext, onPrev, showCreator, minimal, selected, onSelect, isViewer: isViewerProp, size = 'medium', viewMode: viewModeProp = 'standard' }: MatchCardProps) {
  const { user } = useAuth();
  const isActionDisabled = useActionDisabled();
  const isViewer = isViewerProp !== undefined ? isViewerProp : user?.role === 'viewer';
  const [viewMode, setViewMode] = React.useState<'standard' | 'whatsapp' | 'designed'>(viewModeProp);
  const [isEditingGender, setIsEditingGender] = React.useState(false);
  const [isEditingPhone, setIsEditingPhone] = React.useState(false);
  const [tempPhone, setTempPhone] = React.useState(match.phone || '');
  const [isAdjusting, setIsAdjusting] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isFreeMoving, setIsFreeMoving] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [hasChanges, setHasChanges] = React.useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = React.useState(false);
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);
  const [initialCropConfig, setInitialCropConfig] = React.useState<ImagePosition | null>(null);
  const [showViewerSelector, setShowViewerSelector] = React.useState(false);
  const [allGroups, setAllGroups] = React.useState<WhatsAppGroup[]>(allGroupsProp || []);

  React.useEffect(() => {
    if (!allGroupsProp) {
      dataService.getWhatsAppGroups().then(setAllGroups);
    } else {
      setAllGroups(allGroupsProp);
    }
  }, [allGroupsProp]);

  const [localCropConfig, setLocalCropConfig] = React.useState<ImagePosition>(() => {
    const pos = typeof match.image_position === 'string' ? JSON.parse(match.image_position) : match.image_position;
    return (pos || match.crop_config || { x: 50, y: 50, zoom: 1 }) as ImagePosition;
  });

  React.useEffect(() => {
    if (!isAdjusting) {
      const pos = typeof match.image_position === 'string' ? JSON.parse(match.image_position) : match.image_position;
      setLocalCropConfig(pos || match.crop_config || { x: 50, y: 50, zoom: 1 } as ImagePosition);
    }
  }, [match.image_position, match.crop_config, isAdjusting]);

  const handleAdjust = (e: React.MouseEvent, updates: Partial<ImagePosition>) => {
    if (isViewer) return;
    e.stopPropagation();
    setIsAdjusting(true);
    setHasChanges(true);
    setLocalCropConfig(prev => {
      const next = { ...prev, ...updates };
      // Ensure x and y stay within 0-100
      if (next.x !== undefined) next.x = Math.max(0, Math.min(100, next.x));
      if (next.y !== undefined) next.y = Math.max(0, Math.min(100, next.y));
      // Allow more zoom out (down to 0.1)
      if (next.zoom !== undefined) next.zoom = Math.max(0.1, Math.min(5, next.zoom));
      return next;
    });
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging || !isAdjusting) return;
    
    setDragStart(prevStart => {
      const dx = e.clientX - prevStart.x;
      const dy = e.clientY - prevStart.y;
      
      // Sensitivity: how many pixels move 1% of the image
      // Higher zoom means smaller movements in pixels should result in smaller changes in %
      const sensitivity = 0.25 / (localCropConfig.zoom || 1);
      
      setLocalCropConfig(prevConfig => ({
        ...prevConfig,
        x: Math.max(0, Math.min(100, prevConfig.x - dx * sensitivity)),
        y: Math.max(0, Math.min(100, prevConfig.y - dy * sensitivity))
      }));
      
      return { x: e.clientX, y: e.clientY };
    });
  }, [isDragging, isAdjusting, localCropConfig.zoom]);

  const handleMouseUp = React.useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setIsFreeMoving(false);
      setShowConfirmCancel(true);
    }
  }, [isDragging]);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isViewer || !isAdjusting) return;
    
    // Don't start dragging if clicking on a button
    if ((e.target as HTMLElement).closest('button')) return;

    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setHasChanges(true);
    setInitialCropConfig({ ...localCropConfig });
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
  };

  const saveAdjustment = async (e: React.MouseEvent) => {
    if (isViewer) return;
    e.stopPropagation();
    try {
      if (onQuickUpdate) {
        const updates: Partial<Match> = { 
          image_position: localCropConfig,
          crop_config: localCropConfig
        };
        await onQuickUpdate(match.id, updates);
      }
      setIsAdjusting(false);
      setHasChanges(false);
      setShowConfirmCancel(false);
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
    } catch (err) {
      toast.error('שגיאה בשמירה');
    }
  };

  const cancelAdjustment = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (initialCropConfig) {
      setLocalCropConfig(initialCropConfig);
    } else {
      const pos = typeof match.image_position === 'string' ? JSON.parse(match.image_position) : match.image_position;
      setLocalCropConfig(pos || match.crop_config || { x: 50, y: 50, zoom: 1 } as ImagePosition);
    }
    setIsDragging(false);
    setIsFreeMoving(false);
    setShowConfirmCancel(false);
    setHasChanges(false);
  };

    const confirmFreeMove = async (e: React.MouseEvent) => {
      e.stopPropagation();
      await saveAdjustment(e);
      setIsFreeMoving(false);
    };

  const [showManualPublishModal, setShowManualPublishModal] = React.useState(false);
  const [manualPublishDate, setManualPublishDate] = React.useState(new Date().toISOString().split('T')[0]);

  const handleManualPublish = async () => {
    if (isViewer) return;
    if (match.is_available === false) {
      toast.error('כרטיס זה סומן כלא פנוי לפירסום יש לשנות את זה בהערות על מנת לפרסם');
      return;
    }
    try {
      await onQuickUpdate?.(match.id, { 
        manual_published_at: new Date(manualPublishDate).toISOString(),
        last_published_at: new Date(manualPublishDate).toISOString()
      });
      setShowManualPublishModal(false);
      toast.success('הפרסום הידני עודכן בהצלחה');
    } catch (err) {
      toast.error('שגיאה בעדכון הפרסום');
    }
  };

  const getMissingFields = (m: Match) => {
    const missing = [];
    if (!m.about || m.about.length < 5) missing.push('על עצמי');
    if (!m.looking_for || m.looking_for.length < 5) missing.push('מה מחפש');
    if (!m.religious_level) missing.push('מגזר');
    if (!m.occupation) missing.push('עיסוק');
    if (!m.phone) missing.push('טלפון');
    if (!m.image_url) missing.push('תמונה');
    if (!m.negiah) missing.push('שומר נגיעה');
    if (!m.smoking) missing.push('מעשן');
    if (!m.age_range) missing.push('טווח גילאים');
    if (!m.service) missing.push('שירות');
    return missing;
  };

  const missingFields = getMissingFields(match);
  const hasMissingFields = missingFields.length > 0;
  const isCsvMissing = match.creation_source === 'csv' && hasMissingFields;

  const isRecentlyPublished = match.last_published_at 
    ? new Date(match.last_published_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    : false;
    
  const isNotAvailable = match.is_available === false;

  const naturalCategory = dataService.getCategoryByAge(match.age);
  const naturalGroup = allGroups.find(g => g.category === naturalCategory && g.type === match.type);
  
  const viewerGroupIds = React.useMemo(() => {
    if (!match.viewer_group_ids) return [];
    try {
      return JSON.parse(match.viewer_group_ids) as string[];
    } catch (e) {
      return [];
    }
  }, [match.viewer_group_ids]);

  const viewerGroups = allGroups.filter(g => viewerGroupIds.includes(g.id));

  const toggleViewerGroup = async (groupId: string) => {
    if (isViewer) return;
    const newIds = viewerGroupIds.includes(groupId) 
      ? viewerGroupIds.filter(id => id !== groupId)
      : [...viewerGroupIds, groupId];
    
    try {
      await onQuickUpdate?.(match.id, { viewer_group_ids: JSON.stringify(newIds) });
      toast.success('הגדרות צפייה עודכנו');
    } catch (err) {
      toast.error('שגיאה בעדכון');
    }
  };

  const images = React.useMemo(() => {
    try {
      const additional = JSON.parse(match.additional_images || '[]');
      return [match.image_url, ...additional].filter(Boolean);
    } catch (e) {
      return [match.image_url].filter(Boolean);
    }
  }, [match.image_url, match.additional_images]);

  const mainImage = images[match.main_image_index || 0] || match.image_url;

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isAdjusting && !(e.target as HTMLElement).closest('.match-card-container')) {
        setIsAdjusting(false);
        setIsFreeMoving(false);
        setShowConfirmCancel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAdjusting]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`match-card-container card flex flex-col h-full hover:shadow-md transition-all group relative ${
        size === 'small' ? 'max-w-xs' : size === 'medium' ? 'max-w-sm' : 'max-w-md'
      } ${
        isNotAvailable ? 'ring-2 ring-black ring-inset' : 
        isRecentlyPublished ? 'ring-2 ring-orange-500 ring-inset' : 
        ''
      } ${selected ? 'ring-2 ring-luxury-blue bg-blue-50/30' : ''} ${isCsvMissing ? 'border-red-200' : ''}`}
    >
      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="bg-white/95 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-emerald-100 flex flex-col items-center gap-4 pointer-events-auto ring-1 ring-black/5"
            >
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 animate-bounce">
                <Check className="text-white" size={40} strokeWidth={3} />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">עודכן בהצלחה!</h3>
                <p className="text-slate-500 font-bold">השינוי בוצע ונשמר במערכת</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {hasMissingFields && (
        <div className="bg-red-50 border-b border-red-100 py-2 px-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 z-20">
          <div className="flex items-center gap-1.5 text-red-600 font-black text-[11px]">
            <AlertTriangle size={14} />
            <span>חסר:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missingFields.map((field, idx) => (
              <span key={idx} className="text-red-500 text-[11px] font-bold bg-red-100/50 px-2 py-0.5 rounded-md">
                {field}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Status Badges */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 items-end">
        {isNotAvailable && (
          <span className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
            לא פנוי לפרסום
          </span>
        )}
        {isRecentlyPublished && !isNotAvailable && (
          <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
            פורסם לאחרונה
          </span>
        )}
      </div>

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
          className={`relative h-64 w-full overflow-hidden bg-slate-100 ${!isViewer ? (isAdjusting ? 'cursor-move' : 'cursor-pointer') : 'cursor-default'} ${isDragging ? 'cursor-grabbing' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            !isViewer && !isAdjusting && onImageClick?.(match);
          }}
          onMouseDown={handleMouseDown}
        >
          {onNext && (
            <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/50 backdrop-blur-sm rounded-full hover:bg-white/80" title="הבא">
              <ChevronLeft size={20} />
            </button>
          )}
          {onPrev && (
            <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/50 backdrop-blur-sm rounded-full hover:bg-white/80" title="הקודם">
              <ChevronRight size={20} />
            </button>
          )}
          <img 
            src={dataService.getPublicImageUrl(mainImage)} 
            alt={match.full_name} 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-all pointer-events-none select-none" 
            style={{
              objectPosition: `${localCropConfig.x}% ${localCropConfig.y}%`,
              transform: `scale(${localCropConfig.zoom})`
            }}
            onError={(e) => {
              e.currentTarget.src = 'https://picsum.photos/seed/person/400/400';
            }}
          />
          
          {/* Synced Indicator */}
          {(user?.role === 'super_admin' || user?.role === 'association_manager') && match.image_url?.includes('supabase.co') && (
            <div className="absolute top-2 right-2 z-20 bg-green-500/90 backdrop-blur-sm text-white p-1 rounded-full shadow-lg border border-white/20" title="תמונה מסונכרנת ומאובטחת">
              <CheckCircle size={14} />
            </div>
          )}

          {/* Manager Label - Bottom Right */}
          {showCreator && match.creator_name && (
            <div className={`absolute bottom-2 right-2 z-30 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-xl border border-white/20 flex items-center gap-2 ${
              match.creator_gender === 'female' ? 'bg-pink-500/80' : 'bg-blue-500/80'
            }`}>
              <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
              <span>{match.creator_gender === 'female' ? 'מנהלת' : 'מנהל'}: {match.creator_name}</span>
            </div>
          )}
          
          {/* Adjustment Controls Overlay */}
          {!isViewer && (
            <div 
              className={`absolute inset-0 transition-all flex flex-col items-center justify-center ${
                isAdjusting ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover:opacity-100 pointer-events-none'
              } ${isDragging || isFreeMoving ? 'bg-transparent' : 'bg-black/5'}`}
              onClick={e => isAdjusting && e.stopPropagation()}
            >
              {/* Free Move Confirmation Screen */}
              {showConfirmCancel && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-white/95 backdrop-blur-2xl p-6 rounded-3xl shadow-2xl border border-white/60 flex flex-col items-center gap-6 z-50 ring-1 ring-black/5"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-1">
                      <ImageIcon className="text-emerald-600" size={24} />
                    </div>
                    <p className="text-slate-900 font-black text-lg tracking-tight">לשמור את המיקום?</p>
                  </div>
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={confirmFreeMove}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl hover:from-emerald-600 hover:to-emerald-800 transition-all shadow-lg shadow-emerald-500/30 font-black text-sm active:scale-95"
                    >
                      <Check size={20} strokeWidth={3} />
                      <span>אישור</span>
                    </button>
                    <button 
                      onClick={cancelAdjustment}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-rose-500 to-rose-700 text-white rounded-2xl hover:from-rose-600 hover:to-rose-800 transition-all shadow-lg shadow-rose-500/30 font-black text-sm active:scale-95"
                    >
                      <X size={20} strokeWidth={3} />
                      <span>ביטול</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Main Adjustment Panel */}
              {!isDragging && !showConfirmCancel && !isFreeMoving && (
                <div 
                  className={`flex flex-col items-center gap-2 bg-black/60 backdrop-blur-md p-3 rounded-3xl border border-white/20 w-[160px] transition-all pointer-events-auto shadow-2xl ${
                    isAdjusting ? 'scale-90' : 'scale-75 opacity-0 group-hover:opacity-100 group-hover:scale-90'
                  }`} 
                  onClick={e => e.stopPropagation()}
                >
                  <div className="text-center">
                    <div className="text-[12px] font-black text-white drop-shadow-md">
                      {isAdjusting ? 'כוונון תמונה' : 'שיפור מיקום'}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2 w-full">
                    <button 
                      onClick={(e) => handleAdjust(e, { y: localCropConfig.y + 5 })} 
                      className="p-1.5 bg-white/90 hover:bg-white rounded-full text-slate-900 shadow-md transition-all active:scale-75"
                    >
                      <ChevronUp size={18} strokeWidth={3} />
                    </button>
                    
                    <div className="flex items-center justify-between w-full gap-2">
                      <button 
                        onClick={(e) => handleAdjust(e, { x: localCropConfig.x - 5 })} 
                        className="p-1.5 bg-white/90 hover:bg-white rounded-full text-slate-900 shadow-md transition-all active:scale-75"
                      >
                        <ChevronRight size={18} strokeWidth={3} />
                      </button>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                          <button onClick={(e) => handleAdjust(e, { zoom: (localCropConfig.zoom || 1) + 0.1 })} className="p-1.5 bg-white hover:bg-slate-50 rounded-lg text-luxury-blue shadow-md transition-all active:scale-90" title="הגדל"><ZoomIn size={14} strokeWidth={2.5} /></button>
                          <button onClick={(e) => handleAdjust(e, { zoom: (localCropConfig.zoom || 1) - 0.1 })} className="p-1.5 bg-white hover:bg-slate-50 rounded-lg text-luxury-blue shadow-md transition-all active:scale-90" title="הקטן"><ZoomOut size={14} strokeWidth={2.5} /></button>
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAdjusting(true);
                            setIsFreeMoving(true);
                            setInitialCropConfig({ ...localCropConfig });
                            toast.success('כעת ניתן להזיז את התמונה בחופשיות');
                          }} 
                          className={`flex flex-col items-center justify-center gap-1 p-2 rounded-2xl transition-all shadow-md ${isFreeMoving ? 'bg-gradient-to-br from-luxury-blue to-blue-900 text-white scale-105 ring-1 ring-white/30' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                          title="הזזה חופשית"
                        >
                          <Move size={18} strokeWidth={2.5} />
                          <span className="text-[7px] font-black uppercase tracking-tighter">הזזה חופשית</span>
                        </button>
                      </div>

                      <button 
                        onClick={(e) => handleAdjust(e, { x: localCropConfig.x + 5 })} 
                        className="p-1.5 bg-white/90 hover:bg-white rounded-full text-slate-900 shadow-md transition-all active:scale-75"
                      >
                        <ChevronLeft size={18} strokeWidth={3} />
                      </button>
                    </div>
                    
                    <button 
                      onClick={(e) => handleAdjust(e, { y: localCropConfig.y - 5 })} 
                      className="p-1.5 bg-white/90 hover:bg-white rounded-full text-slate-900 shadow-md transition-all active:scale-75"
                    >
                      <ChevronDown size={18} strokeWidth={3} />
                    </button>
                  </div>

                  {/* Reset and Original View Buttons */}
                  <div className="flex gap-1.5 w-full">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocalCropConfig({ x: 50, y: 50, zoom: 1 });
                        setHasChanges(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-[9px] font-bold border border-white/10"
                      title="איפוס"
                    >
                      <RotateCcw size={12} />
                      <span>איפוס</span>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(dataService.getPublicImageUrl(mainImage), '_blank');
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-[9px] font-bold border border-white/10"
                      title="תמונה מקורית"
                    >
                      <ExternalLink size={12} />
                      <span>מקור</span>
                    </button>
                  </div>
                  
                  {isAdjusting && hasChanges && (
                    <div className="flex gap-2 mt-1 pt-2 border-t border-white/10 w-full justify-center">
                      <button 
                        onClick={saveAdjustment}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-800 transition-all shadow-lg shadow-emerald-500/30 font-black text-xs w-full justify-center active:scale-95"
                      >
                        <Check size={14} strokeWidth={3} />
                        <span>שמור</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="absolute top-2 left-2 pointer-events-none">
             <div className="bg-black/40 backdrop-blur-sm text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit size={14} />
             </div>
          </div>
        </div>
      )}
      {!match.image_url && !minimal && (
        <div 
          className={`relative h-64 w-full overflow-hidden flex items-center justify-center ${
            match.type === 'male' ? 'bg-blue-50' : 'bg-pink-50'
          } ${!isViewer ? 'cursor-pointer' : 'cursor-default'}`}
          onClick={() => !isViewer && onImageClick?.(match)}
        >
          <div className="text-center space-y-2">
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
              match.type === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
            }`}>
              {match.type === 'male' ? <User size={32} /> : <Heart size={32} fill="currentColor" />}
            </div>
            {!isViewer && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">לחץ להוספת תמונה</p>}
          </div>
          {!isViewer && <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors" />}
        </div>
      )}
      
      {/* Additional Images */}
      {!minimal && match.additional_images && (() => {
        try {
          const extras = JSON.parse(match.additional_images);
          if (extras.length > 0) {
            return (
              <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-slate-50 bg-slate-50/50">
                {extras.map((img: string, i: number) => (
                  <a 
                    key={i} 
                    href={img} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="block w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0 hover:border-luxury-blue transition-colors relative group/thumb"
                    title="לחץ לפתיחה"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/10 transition-colors" />
                  </a>
                ))}
              </div>
            );
          }
        } catch (e) { return null; }
      })()}

      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex flex-col items-start gap-2">
                <h3 className="text-xl font-bold text-text-main group-hover:text-luxury-blue transition-colors">{match.full_name}</h3>
                <div className="flex bg-slate-100 p-0.5 rounded-lg scale-75 origin-right">
                  <button 
                    onClick={() => setViewMode('standard')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${viewMode === 'standard' ? 'bg-white text-luxury-blue shadow-sm' : 'text-slate-500'}`}
                  >
                    רגיל
                  </button>
                  <button 
                    onClick={() => setViewMode('whatsapp')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${viewMode === 'whatsapp' ? 'bg-white text-luxury-blue shadow-sm' : 'text-slate-500'}`}
                  >
                    וואטסאפ
                  </button>
                </div>
              </div>
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
              {naturalGroup && (
                <div className={`px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-bold ${
                  match.type === 'male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'
                }`} title={`משויך לקבוצת ${naturalGroup.name} (${naturalGroup.whapi_id || 'ללא ID'})`}>
                  <Users size={10} />
                  <span>{naturalGroup.name}</span>
                  {naturalGroup.whapi_id && <span className="opacity-50 text-[8px]">#{naturalGroup.whapi_id.slice(-4)}</span>}
                </div>
              )}
              {viewerGroups.length > 0 && (
                <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                  {viewerGroups.map(vg => (
                    <div key={vg.id} className="px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 whitespace-nowrap" title={`צופה בקבוצת ${vg.name} (${vg.whapi_id || 'ללא ID'})`}>
                      <Eye size={10} />
                      <span>{vg.name}</span>
                      {vg.whapi_id && <span className="opacity-50 text-[8px]">#{vg.whapi_id.slice(-4)}</span>}
                    </div>
                  ))}
                </div>
              )}
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
        </div>
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && !isViewer && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(match.id);
                }} 
                disabled={isActionDisabled}
                className="p-2 text-slate-400 hover:text-luxury-blue hover:bg-slate-50 rounded-lg transition-all disabled:opacity-50"
                title="ערוך כרטיס"
              >
                <Edit size={18} />
              </button>
            )}
            {onDelete && !isViewer && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(match.id);
                }} 
                disabled={isActionDisabled}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                title="מחק כרטיס"
              >
                <Trash2 size={18} />
              </button>
            )}
            {onDesignedCard && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDesignedCard(match);
                }}
                className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                title="צפה בכרטיס מעוצב"
              >
                <ImageIcon size={18} />
              </button>
            )}
            {!isViewer && (
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowViewerSelector(!showViewerSelector);
                  }}
                  className={`p-2 rounded-lg transition-all ${showViewerSelector ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}
                  title="הגדר כצופה בקבוצות נוספות"
                >
                  <Eye size={18} />
                </button>
                <AnimatePresence>
                  {showViewerSelector && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 z-50 space-y-3"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                        <h4 className="text-xs font-black text-slate-900">הגדר כצופה בקבוצות</h4>
                        <button onClick={() => setShowViewerSelector(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {allGroups.map(g => (
                          <button 
                            key={g.id}
                            onClick={() => toggleViewerGroup(g.id)}
                            className={`w-full flex items-center justify-between p-2 rounded-lg text-[10px] font-bold transition-all ${
                              viewerGroupIds.includes(g.id) ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${g.type === 'male' ? 'bg-blue-400' : 'bg-pink-400'}`}></div>
                              {g.name}
                            </div>
                            {viewerGroupIds.includes(g.id) && <Check size={12} />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

      <div className="flex-1 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar mb-4">
        {viewMode === 'standard' ? (
          <>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-6">
              <InfoItem icon={<MapPin size={14} />} label="עיר" value={match.city} isMissing={!match.city} />
              {!minimal && (
                <>
                  <InfoItem icon={<GraduationCap size={14} />} label="מגזר" value={match.religious_level} isMissing={!match.religious_level} />
                  <InfoItem icon={<Briefcase size={14} />} label="עיסוק" value={match.occupation} isMissing={!match.occupation} />
                  <InfoItem icon={<MapPin size={14} />} label="גובה" value={match.height} isMissing={!match.height} />
                  <InfoItem icon={<User size={14} />} label="עדה" value={match.ethnicity} isMissing={!match.ethnicity} />
                  <InfoItem icon={<Heart size={14} />} label="מצב משפחתי" value={match.marital_status} isMissing={!match.marital_status} />
                  <InfoItem icon={<CheckCircle size={14} />} label="שירות" value={match.service} isMissing={!match.service} />
                  <InfoItem icon={<AlertTriangle size={14} />} label="מעשן/ת" value={match.smoking} isMissing={!match.smoking} />
                  <InfoItem icon={<Check size={14} />} label="שומר/ת נגיעה" value={match.negiah} isMissing={!match.negiah} />
                  <InfoItem icon={<Calendar size={14} />} label="טווח גילאים" value={match.age_range} isMissing={!match.age_range} />
                  <InfoItem icon={<HistoryIcon size={14} />} label="פרסום אוטומטי" value={match.last_published_at ? new Date(match.last_published_at).toLocaleDateString('he-IL') : 'טרם'} />
                  <InfoItem icon={<CheckCircle size={14} />} label="פרסום ידני" value={match.manual_published_at ? new Date(match.manual_published_at).toLocaleDateString('he-IL') : 'טרם'} />
                </>
              )}
            </div>

            {(!minimal && (match.about || match.creation_source === 'csv')) && (
              <div className="mb-6">
                <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary mb-1.5">
                  <Info size={12} />
                  <span>קצת עליי</span>
                </div>
                <p className={`text-sm text-text-main leading-relaxed p-3 rounded-xl border ${
                  match.creation_source === 'csv' && (!match.about || match.about.length < 5) 
                    ? 'bg-red-50 border-red-200 text-red-700' 
                    : 'bg-slate-50 border-slate-100'
                }`}>
                  {match.about || 'חסר תיאור...'}
                </p>
              </div>
            )}
          </>
        ) : viewMode === 'whatsapp' ? (
          <div className="bg-[#E7F3EF] p-4 rounded-2xl border border-emerald-100 space-y-2 font-medium text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
            <p>✨ *כרטיס משודך חדש* ✨</p>
            <p>👤 *שם:* {match.full_name}</p>
            <p>🎂 *גיל:* {match.age}</p>
            <p>📍 *עיר:* {match.city}</p>
            <p>📏 *גובה:* {match.height}</p>
            <p>💍 *מצב משפחתי:* {match.marital_status}</p>
            <p>🕍 *מגזר:* {match.religious_level}</p>
            <p>💼 *עיסוק:* {match.occupation}</p>
            <p>✡️ *עדה:* {match.ethnicity}</p>
            <p>🎖️ *שירות:* {match.service}</p>
            <p>🚬 *מעשן:* {match.smoking}</p>
            <p>👐 *שומר נגיעה:* {match.negiah}</p>
            <p>📝 *קצת עלי:* {match.about || 'לא צוין'}</p>
            <p>🎯 *מה מחפש:* {match.looking_for || 'לא צוין'}</p>
            <p className="mt-4 text-[10px] opacity-60">פורסם באמצעות פורטל יוחאי</p>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const text = `✨ *כרטיס משודך חדש* ✨\n👤 *שם:* ${match.full_name}\n🎂 *גיל:* ${match.age}\n📍 *עיר:* ${match.city}\n📏 *גובה:* ${match.height}\n💍 *מצב משפחתי:* ${match.marital_status}\n🕍 *מגזר:* ${match.religious_level}\n💼 *עיסוק:* ${match.occupation}\n✡️ *עדה:* ${match.ethnicity}\n🎖️ *שירות:* ${match.service}\n🚬 *מעשן:* ${match.smoking}\n👐 *שומר נגיעה:* ${match.negiah}\n📝 *קצת עלי:* ${match.about || 'לא צוין'}\n🎯 *מה מחפש:* ${match.looking_for || 'לא צוין'}\n\nפורסם באמצעות פורטל יוחאי`;
                navigator.clipboard.writeText(text);
                toast.success('הטקסט הועתק!');
              }}
              className="mt-4 w-full py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare size={14} />
              העתק טקסט לוואטסאפ
            </button>
          </div>
        ) : (
          <div 
            className={`p-0 rounded-[2rem] text-white shadow-xl relative overflow-hidden aspect-[9/16] w-full border-4 ${
              match.type === 'female' 
                ? 'bg-gradient-to-b from-[#831843] via-[#db2777] to-[#f472b6] border-pink-400' 
                : 'bg-gradient-to-b from-[#0f172a] via-[#1e3a8a] to-[#fbbf24] border-white/20'
            }`}
          >
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/40 to-transparent z-10" />
            <div className="relative z-20 h-full flex flex-col p-4">
              <div className="mt-4 px-2">
                <div className="aspect-square rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg relative bg-slate-800">
                  <img 
                    src={match.image_url || 'https://picsum.photos/seed/profile/600/600'} 
                    alt="" 
                    style={{ 
                      transform: `translate(${match.image_position?.x || 0}px, ${match.image_position?.y || 0}px) scale(${match.image_position?.zoom || 1})` 
                    }}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="flex-1 pt-4 space-y-3 overflow-y-auto custom-scrollbar pr-1">
                <div className="text-center">
                  <h3 className="text-xl font-black mb-0.5 drop-shadow-md">{match.full_name}</h3>
                  <div className="flex items-center justify-center gap-1 text-xs font-bold opacity-90">
                    <MapPin size={12} />
                    {match.age} • {match.city}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
                    <TrendingUp size={14} />
                    <span className="text-[10px] font-bold">{match.height}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
                    <Heart size={14} />
                    <span className="text-[10px] font-bold">{match.marital_status}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10 col-span-2">
                    <Shield size={14} />
                    <span className="text-[10px] font-bold">{match.religious_level}</span>
                  </div>
                </div>

                {match.about && (
                  <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
                    <p className="text-[8px] font-black uppercase opacity-60 mb-0.5">קצת עליי</p>
                    <p className="text-[10px] leading-tight line-clamp-2">{match.about}</p>
                  </div>
                )}
                
                {match.looking_for && (
                  <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
                    <p className="text-[8px] font-black uppercase opacity-60 mb-0.5">מחפש/ת</p>
                    <p className="text-[10px] leading-tight line-clamp-2">{match.looking_for}</p>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-2 flex justify-between items-center opacity-60">
                <div className="flex items-center gap-1.5">
                  <Heart size={12} className="fill-white" />
                  <span className="text-[8px] font-black uppercase tracking-tighter">פורטל יוחאי</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
              onClick={() => {
                if (isNotAvailable) {
                  toast.error('כרטיס זה סומן כלא פנוי לפירסום יש לשנות את זה בהערות על מנת לפרסם');
                  return;
                }
                onPublish(match);
              }}
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
            {onNotes && (
              <button 
                onClick={() => onNotes(match)}
                className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center"
                title="הערות"
              >
                <Paperclip size={18} />
              </button>
            )}
            {!isViewer && (
              <button 
                onClick={() => setShowManualPublishModal(true)}
                className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${match.manual_published_at ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                title="סימון כפורסם ידנית"
              >
                <CheckCircle size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Manual Publish Modal */}
      {onDelete && onEdit && onChat && onSuggest && (
        <MatchCardActionRow match={match} onDelete={onDelete} onEdit={onEdit} onChat={onChat} onSuggest={onSuggest} />
      )}
      <AnimatePresence>
        {showManualPublishModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-green-600">
                  <CheckCircle size={24} />
                  <h2 className="text-xl font-bold">סימון כפורסם ידנית</h2>
                </div>
                <button onClick={() => setShowManualPublishModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-500 font-bold">סמן מתי המשודך פורסם לאחרונה באופן ידני:</p>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">תאריך פרסום</label>
                  <input 
                    type="date" 
                    value={manualPublishDate}
                    onChange={(e) => setManualPublishDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={handleManualPublish}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg active:scale-95"
                >
                  עדכן פרסום
                </button>
                <button 
                  onClick={() => setShowManualPublishModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                >
                  ביטול
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
      <div className={`text-sm font-bold break-words ${isMissing ? 'text-red-600 italic' : 'text-text-main'}`}>
        {value || (isMissing ? 'חסר' : '---')}
      </div>
    </div>
  );
}
